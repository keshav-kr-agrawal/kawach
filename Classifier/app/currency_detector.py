"""
Pipeline 7 — Counterfeit Currency Detection (Indian banknotes), v2.

Maps directly to the ET PS "Counterfeit Currency Identification Agent" bullet
(microprint analysis, security thread verification, serial number pattern
validation, UV feature simulation) — see ps.txt. Design doc:
plan/currency_pipeline_v2_plan.md. Research check (2026-07-17): no trustworthy
pretrained INR-counterfeit model exists on HF Hub or GitHub at production
quality, so every check here is either your own trainable CNN or a real,
documented, explainable technique. Nothing fakes a signal it can't compute.

v2 stage order (each stage can exit honestly instead of forcing a verdict):

  0. IMAGE QUALITY GATE — resolution / exposure / blur / glare. A dim or
     blurry photo of a REAL note must come back INSUFFICIENT_QUALITY with a
     retake tip, never a fake-leaning score (the PS's kill metric is false
     positives on citizen-facing tools).
  1. NOTE PRESENCE GATE — edge density, colorfulness, INR text signal,
     aspect ratio. A white sheet / random object exits NOT_A_CURRENCY_NOTE
     before the CNN ever runs (softmax would otherwise be forced to emit a
     real-vs-fake probability for something that was never a banknote).
  2. NOTE CROP + one shared OCR pass + denomination ID.
  3. EVIDENCE TIERS:
       Tier A (structural, near-veto): serial-number telescopic growth,
         text integrity vs the note's fixed wording, UV glow (when declared).
       Tier B (weak proxies, corroborate only): thread band presence,
         microprint sharpness, print-noise profile.
       Advisory: the CNN — demoted after 2026-07-19 testing showed its
         98.67% Kaggle accuracy does not transfer to out-of-domain photos
         (two real-world fakes scored 0.39/0.14). Scores in 0.30-0.70 are
         treated as "no read", and a confident CNN vote alone can flag
         SUSPECT but never conclusively clear or condemn a note.
  4. TIERED FUSION — rule-ordered, not weighted-average: a structural red
     flag caps the verdict at SUSPECT no matter how the other numbers
     average out (the flat weighted average previously let an easy-to-fake
     dark band + sharp print outvote an explicit serial-number red flag).
  5. CONFIDENCE CEILING BY EVIDENCE — a single flat visible-light photo can
     never claim HIGH-confidence GENUINE, because most RBI security features
     (OVI color-shift, thread color-shift, watermark, latent image) are
     angle/light-dependent BY DESIGN and invisible to a flat photo. HIGH
     genuine requires a passing UV capture. Flagging fake needs less
     evidence than clearing — that asymmetry is the correct direction.
"""

import difflib
import os
import re
from typing import Optional

import cv2
import numpy as np
import torch
import torch.nn as nn

_easyocr_reader = None


def _get_ocr_reader():
    """Lazy-loaded, process-wide EasyOCR reader (pure Python, no Tesseract
    binary dependency — heavy to init, so load once)."""
    global _easyocr_reader
    if _easyocr_reader is None:
        try:
            import easyocr
            _easyocr_reader = easyocr.Reader(["en"], gpu=torch.cuda.is_available(), verbose=False)
        except Exception as e:
            print(f"[CURRENCY] EasyOCR unavailable ({e}) — OCR-based checks will report not_applicable.")
            _easyocr_reader = False  # sentinel: tried and failed, don't retry every call
    return _easyocr_reader or None


def _crop_bbox_region(image: np.ndarray, panel: dict, pad: int = 6) -> Optional[np.ndarray]:
    """Re-crop a slightly padded region around a detected text panel by its
    left edge + height (EasyOCR gives us bbox height/x already)."""
    h_img, w_img = image.shape[:2]
    x = max(0, int(panel["x"]) - pad)
    # bbox gives us height + left-x only; scan the full vertical extent
    # restricted to this x-window (the panel row dominates the ink profile).
    return image[:, x: min(w_img, x + max(int(panel["height"] * 6), 40))]


def _column_ink_heights(crop: np.ndarray) -> Optional[np.ndarray]:
    """
    Proxy for per-character digit height across a number-panel crop: for each
    column, measure the vertical extent of dark ("ink") pixels against the
    panel's local background. Rising column-ink-height left-to-right is the
    signature of RBI's ascending-numeral security feature.
    """
    if crop.size == 0:
        return None
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    # Otsu threshold isolates printed ink from the note background per-column
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    ink_rows_per_col = binary.astype(bool)
    if not ink_rows_per_col.any():
        return None

    col_heights = []
    for col in range(ink_rows_per_col.shape[1]):
        rows = np.where(ink_rows_per_col[:, col])[0]
        col_heights.append(int(rows.max() - rows.min()) if rows.size else 0)

    heights = np.array(col_heights, dtype=np.float32)
    # Smooth to reduce single-column noise, drop empty (no-ink) columns
    if len(heights) >= 5:
        kernel = np.ones(5) / 5
        heights = np.convolve(heights, kernel, mode="valid")
    heights = heights[heights > 0]
    return heights if heights.size >= 6 else None


def _fuzzy_contains(haystack_words: list, anchor: str, threshold: float = 0.72) -> bool:
    """True when a sliding window of OCR'd words matches the anchor phrase at
    >= threshold similarity (tolerates OCR character errors, catches
    substituted wording — 'CHILDREN BANK OF INDIA' won't match 'RESERVE
    BANK OF INDIA' at 0.72)."""
    anchor_words = anchor.split()
    k = len(anchor_words)
    if not haystack_words or k == 0:
        return False
    anchor_join = " ".join(anchor_words)
    for i in range(max(1, len(haystack_words) - k + 1)):
        window = " ".join(haystack_words[i: i + k])
        if difflib.SequenceMatcher(None, window, anchor_join).ratio() >= threshold:
            return True
    return False


# Fixed wording every genuine MG-series note carries (English side — the
# EasyOCR reader here is en-only; Devanagari anchors would need the 'hi'
# model, too heavy for the free-tier host). Missing anchors are scored
# softly (could be the reverse side / an angle); GARBLED or SUBSTITUTED
# wording is the red flag.
_TEXT_ANCHORS_COMMON = [
    "RESERVE BANK OF INDIA",
    "GUARANTEED BY THE CENTRAL GOVERNMENT",
    "I PROMISE TO PAY THE BEARER",
    "GOVERNOR",
]
_DENOM_WORDS = {
    10: "TEN RUPEES", 20: "TWENTY RUPEES", 50: "FIFTY RUPEES",
    100: "ONE HUNDRED RUPEES", 200: "TWO HUNDRED RUPEES",
    500: "FIVE HUNDRED RUPEES", 2000: "TWO THOUSAND RUPEES",
}
# Known novelty/prop-note wording (churan/manoranjan notes are the classic
# Indian joke-note families) — any hit is an immediate structural red flag.
_PROP_TOKENS = ["CHILDREN BANK", "CHURAN", "MANORANJAN", "PROP NOTE", "MOVIE SHOOTING"]
_DENOM_TOKENS = {"10", "20", "50", "100", "200", "500", "2000"}


# ── CNN model slot ───────────────────────────────────────────────────────────
#
# Checkpoints are self-describing dicts — {"arch", "classes", "state_dict", ...}
# — not a bare state_dict. This lets the Colab training pipeline
# (kaggle_train_currency.ipynb) or the local train_currency_model.py save
# whichever backbone won on validation, and this loader builds the matching
# architecture automatically instead of assuming one fixed shape.

CURRENCY_CLASSES = ["fake", "real"]  # alphabetical, matches ImageFolder ordering
_INPUT_SIZE = 224
_NORM_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
_NORM_STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)

# Supported backbones: (torchvision constructor, weights_enum, classifier-swap fn)
_ARCH_REGISTRY = {}


def _register_archs():
    from torchvision.models import (
        efficientnet_b0, EfficientNet_B0_Weights,
        mobilenet_v3_small, MobileNet_V3_Small_Weights,
        mobilenet_v3_large, MobileNet_V3_Large_Weights,
    )

    def swap_efficientnet(model, n_classes):
        model.classifier[1] = nn.Linear(model.classifier[1].in_features, n_classes)
        return model

    def swap_mobilenet(model, n_classes):
        model.classifier[3] = nn.Linear(model.classifier[3].in_features, n_classes)
        return model

    _ARCH_REGISTRY.update({
        # Default: best accuracy/CPU-latency tradeoff for the free-tier
        # inference host — ~5.3M params, <200ms/image on CPU.
        "efficientnet_b0": (efficientnet_b0, EfficientNet_B0_Weights.IMAGENET1K_V1, swap_efficientnet),
        # Fastest option — use if CPU latency becomes a bottleneck alongside
        # the deepfake ensemble on the same free-tier host.
        "mobilenet_v3_small": (mobilenet_v3_small, MobileNet_V3_Small_Weights.IMAGENET1K_V1, swap_mobilenet),
        # Middle ground if efficientnet_b0 underperforms on your dataset.
        "mobilenet_v3_large": (mobilenet_v3_large, MobileNet_V3_Large_Weights.IMAGENET1K_V1, swap_mobilenet),
    })


_register_archs()
DEFAULT_ARCH = "efficientnet_b0"

_DISCLAIMER = (
    "Screening aid only — not a legal determination. Physical verification "
    "(tilt/UV/touch checks per RBI guidelines) and bank confirmation remain "
    "authoritative. Suspected counterfeits must be reported, not returned "
    "to circulation."
)


def build_currency_model(arch: str = DEFAULT_ARCH, pretrained: bool = False):
    """Build a currency-classifier model for the given backbone name.
    `pretrained=True` warm-starts from ImageNet (used at train time only —
    inference always loads a fine-tuned checkpoint's own weights)."""
    if arch not in _ARCH_REGISTRY:
        raise ValueError(f"Unknown currency model arch '{arch}'. Options: {list(_ARCH_REGISTRY)}")
    ctor, weights_enum, swap_fn = _ARCH_REGISTRY[arch]
    model = ctor(weights=weights_enum if pretrained else None)
    return swap_fn(model, len(CURRENCY_CLASSES))


class CurrencyDetector:
    def __init__(self, weights_dir: str, device: str = "cpu"):
        self.device = device
        self.model = None
        self.arch = None
        weights_path = os.path.join(weights_dir, "currency", "currency_cnn.pt")
        if os.path.exists(weights_path):
            try:
                ckpt = torch.load(weights_path, map_location=device, weights_only=False)
                if isinstance(ckpt, dict) and "state_dict" in ckpt:
                    self.arch = ckpt.get("arch", DEFAULT_ARCH)
                    state = ckpt["state_dict"]
                    if ckpt.get("classes") and ckpt["classes"] != CURRENCY_CLASSES:
                        print(f"[CURRENCY] WARNING: checkpoint class order {ckpt['classes']} "
                              f"!= expected {CURRENCY_CLASSES} — verify before trusting verdicts.")
                else:
                    # Legacy bare state_dict — assume the original default arch.
                    self.arch = "mobilenet_v3_small"
                    state = ckpt
                self.model = build_currency_model(self.arch)
                self.model.load_state_dict(state)
                self.model.to(device).eval()
                print(f"[CURRENCY] CNN loaded from {weights_path} (arch: {self.arch})")
            except Exception as e:
                print(f"[CURRENCY] Failed to load CNN: {e}")
                self.model = None
        else:
            print(f"[CURRENCY] No CNN weights at {weights_path} — heuristic-only mode. "
                  f"Train one with Classifier/kaggle_train_currency.ipynb (run on Kaggle "
                  f"with the 6 datasets attached as inputs).")

    @property
    def mode(self) -> str:
        return "cnn+heuristic" if self.model else "heuristic_only"

    # ── CNN inference ────────────────────────────────────────────────────────

    def _cnn_predict(self, bgr: np.ndarray) -> Optional[dict]:
        if self.model is None:
            return None
        rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
        rgb = cv2.resize(rgb, (_INPUT_SIZE, _INPUT_SIZE)).astype(np.float32) / 255.0
        rgb = (rgb - _NORM_MEAN) / _NORM_STD
        tensor = torch.from_numpy(rgb.transpose(2, 0, 1)).unsqueeze(0).to(self.device)
        with torch.no_grad():
            probs = torch.softmax(self.model(tensor), dim=1)[0].cpu().numpy()
        fake_prob = float(probs[CURRENCY_CLASSES.index("fake")])
        return {"fake_probability": round(fake_prob, 4)}

    # ── Stage 0: image quality gate ──────────────────────────────────────────

    @staticmethod
    def _exposure_resolution_check(bgr: np.ndarray) -> Optional[dict]:
        """Resolution + exposure. Fails return a retake tip — a bad photo of a
        real note must NEVER read as evidence of counterfeit."""
        h, w = bgr.shape[:2]
        if min(h, w) < 200:
            return {"reason": "resolution",
                    "guidance": f"Image is only {w}x{h}px — too small to inspect print detail. "
                                f"Retake closer to the note, filling the frame."}
        gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
        mean = float(gray.mean())
        if mean < 55 or float(np.percentile(gray, 95)) < 90:
            return {"reason": "underexposed",
                    "guidance": "Photo is too dark to read the note's security features. "
                                "Retake near a window or under a lamp — avoid shadows over the note."}
        # A white BACKGROUND behind the note is normal (measured: real fakes
        # photographed on white paper hit 60% blown pixels) — true washout is
        # high blown fraction WITH the tonal structure gone (low std).
        blown = float((gray >= 245).mean())
        if blown > 0.45 and float(gray.std()) < 45:
            return {"reason": "overexposed",
                    "guidance": "Photo is mostly blown-out white — flash or direct light is washing "
                                "out the note. Retake without flash, angled away from the light source."}
        return None

    @staticmethod
    def _blank_surface_check(bgr: np.ndarray) -> Optional[str]:
        """A blank/uniform surface (white sheet, wall, table) has near-zero
        edge structure and color variation. Runs BEFORE the blur check so a
        white sheet reads 'not a note' instead of 'blurry photo'."""
        gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
        target_w = 640
        scale = target_w / gray.shape[1]
        small = cv2.resize(gray, (target_w, max(1, int(gray.shape[0] * scale))))
        edge_density = float(cv2.Canny(small, 40, 120).mean() / 255.0)
        gray_std = float(small.std())
        if edge_density < 0.008 and gray_std < 30:
            return (f"Uniform surface with no print structure (edge density "
                    f"{edge_density:.4f}, tonal variation {gray_std:.0f}) — this does not "
                    f"appear to contain a banknote.")
        return None

    @staticmethod
    def _blur_check(bgr: np.ndarray) -> Optional[dict]:
        gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
        target_w = 800
        scale = target_w / gray.shape[1]
        gray = cv2.resize(gray, (target_w, max(1, int(gray.shape[0] * scale))))
        lap_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        if lap_var < 25:
            return {"reason": "blur", "lap_var": round(lap_var, 1),
                    "guidance": "Photo is too blurry to inspect print detail. Hold the phone "
                                "steady, tap to focus on the note, and retake."}
        return None

    @staticmethod
    def _glare_flag(bgr: np.ndarray) -> Optional[str]:
        """Moderate glare doesn't gate the whole photo, but marks band/print
        reads as unreliable so they get excluded instead of scored red."""
        gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
        blown = float((gray >= 248).mean())
        if 0.06 < blown <= 0.45:
            return (f"Glare/hotspot covers ~{blown*100:.0f}% of the frame — thread and "
                    f"print reads in that zone are excluded, not scored against the note.")
        return None

    # ── Stage 1/2: presence gate, crop, shared OCR, denomination ─────────────

    @staticmethod
    def _note_region(bgr: np.ndarray) -> np.ndarray:
        """Crop to the dominant rectangular region (the note) when detectable."""
        gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        edges = cv2.Canny(blurred, 40, 120)
        edges = cv2.dilate(edges, np.ones((5, 5), np.uint8))
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            return bgr
        biggest = max(contours, key=cv2.contourArea)
        if cv2.contourArea(biggest) < 0.2 * bgr.shape[0] * bgr.shape[1]:
            return bgr  # no dominant note-like region — use full frame
        x, y, w, h = cv2.boundingRect(biggest)
        return bgr[y:y + h, x:x + w]

    @staticmethod
    def _run_ocr(note: np.ndarray) -> Optional[list]:
        """ONE OCR pass per request, shared by the presence gate, denomination
        ID, serial check and text-integrity check (EasyOCR dominates latency —
        running it once instead of per-check keeps the ~1s budget)."""
        reader = _get_ocr_reader()
        if reader is None:
            return None
        try:
            results = reader.readtext(note, detail=1, paragraph=False)
        except Exception as e:
            print(f"[CURRENCY] OCR pass failed: {e}")
            return None
        items = []
        for bbox, text, conf in results:
            xs = [p[0] for p in bbox]
            ys = [p[1] for p in bbox]
            items.append({"text": text, "conf": float(conf),
                          "x": min(xs), "height": max(ys) - min(ys)})
        return items

    @staticmethod
    def _ocr_words(ocr_items: Optional[list], min_conf: float = 0.25) -> list:
        if not ocr_items:
            return []
        joined = " ".join(it["text"].upper() for it in ocr_items if it["conf"] > min_conf)
        return re.sub(r"[^A-Z0-9 ]", " ", joined).split()

    @classmethod
    def _note_presence_score(cls, note: np.ndarray, ocr_items: Optional[list]) -> dict:
        """Weighted evidence that the crop contains an INR banknote at all.
        Score-based (not single-feature hard fail) so a folded/partial real
        note — wrong aspect ratio but note-colored with RBI text — still
        passes, while a white sheet (fails everything) and a printed document
        (right edges, wrong color + no INR wording) exit honestly."""
        h, w = note.shape[:2]
        ar = max(w, h) / max(1, min(w, h))
        aspect_ok = 1.0 if 1.75 <= ar <= 2.65 else 0.0  # INR envelope + perspective slack

        hsv = cv2.cvtColor(note, cv2.COLOR_BGR2HSV)
        sat_mean = float(hsv[:, :, 1].mean())
        # Banknotes are printed in strong color families (₹200 yellow, ₹500
        # grey-green, ₹100 lavender…) — documents/blank sheets are near-grey.
        colorfulness = float(min(1.0, sat_mean / 45.0))

        gray = cv2.cvtColor(note, cv2.COLOR_BGR2GRAY)
        edge_density = float(cv2.Canny(gray, 40, 120).mean() / 255.0)
        edge_ok = 1.0 if 0.015 <= edge_density <= 0.55 else 0.0

        words = cls._ocr_words(ocr_items)
        inr_text = 0.0
        if any(tok in _DENOM_TOKENS for tok in words):
            inr_text = 1.0
        elif any(_fuzzy_contains(words, a) for a in _TEXT_ANCHORS_COMMON):
            inr_text = 1.0
        elif ocr_items is None:
            inr_text = 0.5  # OCR unavailable — don't punish, weight it neutral

        score = 0.35 * colorfulness + 0.30 * inr_text + 0.20 * aspect_ok + 0.15 * edge_ok
        return {
            "score": round(score, 3),
            "components": {
                "colorfulness": round(colorfulness, 2), "inr_text_signal": inr_text,
                "aspect_ratio": round(ar, 2), "aspect_ok": bool(aspect_ok),
                "edge_density": round(edge_density, 4), "edge_ok": bool(edge_ok),
            },
        }

    @classmethod
    def _detect_denomination(cls, ocr_items: Optional[list]) -> Optional[int]:
        counts = {}
        for tok in cls._ocr_words(ocr_items):
            stripped = tok.lstrip("₹RS").strip()
            for cand in (tok, stripped):
                if cand in _DENOM_TOKENS:
                    counts[int(cand)] = counts.get(int(cand), 0) + 1
        return max(counts, key=counts.get) if counts else None

    # ── Stage 3: classical security-feature checks ───────────────────────────

    @staticmethod
    def _security_thread_score(note: np.ndarray) -> tuple:
        """
        Genuine INR notes carry a dark windowed security thread as a vertical
        band at a roughly consistent relative position. Detect column bands
        significantly darker than the note's own baseline. WEAK PROXY: any
        printed dark line fakes "presence" — only the tilt color-shift (not
        checkable in a flat photo) is the real feature. Corroborates only.
        """
        gray = cv2.cvtColor(note, cv2.COLOR_BGR2GRAY)
        h, w = gray.shape
        col_means = gray.mean(axis=0)
        baseline = np.median(col_means)
        # Search the central 20-70% width window where the thread sits on INR notes
        lo, hi = int(w * 0.20), int(w * 0.70)
        window = col_means[lo:hi]
        darkest = window.min()
        depth = (baseline - darkest) / max(baseline, 1)

        if depth > 0.25:
            return 1.0, f"Distinct dark vertical band detected (depth {depth:.2f} vs note baseline) — consistent with a windowed security thread."
        if depth > 0.12:
            return 0.6, f"Weak vertical band (depth {depth:.2f}) — security thread present but low-contrast (wear, lighting, or reproduction)."
        return 0.15, f"No security-thread band found (max column darkness {depth:.2f}) — genuine notes show a clear thread."

    @staticmethod
    def _microprint_sharpness_score(note: np.ndarray) -> tuple:
        """
        Genuine intaglio printing has high-frequency detail that consumer
        printers/scanners lose. Laplacian variance over detail zones is a
        standard print-sharpness proxy. WEAK PROXY: good scanners keep
        sharpness — corroborates only.
        """
        gray = cv2.cvtColor(note, cv2.COLOR_BGR2GRAY)
        h, w = gray.shape
        if min(h, w) < 100:
            return 0.5, "Image too small for microprint analysis — inconclusive."
        # Normalize scale so variance is comparable across photo resolutions
        target_w = 800
        scale = target_w / w
        gray = cv2.resize(gray, (target_w, int(h * scale)))
        lap_var = cv2.Laplacian(gray, cv2.CV_64F).var()

        if lap_var > 500:
            return 1.0, f"High-frequency print detail strong (Laplacian variance {lap_var:.0f}) — consistent with intaglio printing."
        if lap_var > 150:
            return 0.6, f"Moderate print detail (Laplacian variance {lap_var:.0f}) — acceptable but not distinctive."
        return 0.2, f"Print detail is soft (Laplacian variance {lap_var:.0f}) — reproductions typically lose microprint sharpness."

    @staticmethod
    def _print_noise_score(note: np.ndarray) -> tuple:
        """
        Inkjet/laser reproductions add periodic dot noise absent from genuine
        offset/intaglio production. Hard to remove once printed — a red flag
        here blocks a confident GENUINE (reproduction signature), though it
        alone doesn't prove counterfeit (heavy JPEG can inflate it).
        """
        gray = cv2.cvtColor(note, cv2.COLOR_BGR2GRAY).astype(np.float32)
        denoised = cv2.medianBlur(gray.astype(np.uint8), 3).astype(np.float32)
        residual = np.abs(gray - denoised)
        mid_mask = (gray > 60) & (gray < 200)
        noise = residual[mid_mask].mean() if mid_mask.any() else residual.mean()

        if noise < 2.0:
            return 0.9, f"Low print-dot residual noise ({noise:.2f}) — consistent with offset/intaglio production."
        if noise < 4.5:
            return 0.5, f"Moderate residual noise ({noise:.2f}) — inconclusive."
        return 0.2, f"High periodic dot noise ({noise:.2f}) — typical of inkjet/laser reproduction."

    @staticmethod
    def _serial_number_score(note: np.ndarray, ocr_items: Optional[list]) -> tuple:
        """
        RBI's own documented anti-counterfeit feature (Mahatma Gandhi series):
        the number-panel digits print in ASCENDING size left-to-right, while
        the 3-character alphanumeric prefix stays fixed size. STRUCTURAL —
        checkable via OCR bounding-box heights, hard to fake casually.
        Source: RBI banknote security-feature guidance (telescopic/ascending
        numbering, introduced 2015-16 across all MG series notes except ₹20).
        """
        if ocr_items is None:
            return 0.5, "OCR unavailable in this environment — serial-number check skipped (not counted against the verdict)."

        # Candidate number-panel strings: short alphanumeric tokens (typical
        # INR serial format is a 2-3 letter/digit prefix + numeral block).
        candidates = []
        for it in ocr_items:
            clean = "".join(ch for ch in it["text"] if ch.isalnum())
            if 4 <= len(clean) <= 12 and it["conf"] > 0.3 and any(c.isdigit() for c in clean):
                candidates.append({"text": clean, "height": it["height"], "x": it["x"]})

        if not candidates:
            return 0.5, "No serial-number-like text panel detected — image may not show the note's numbering corner."

        # Use the longest/most digit-heavy candidate as the likely number panel.
        panel = max(candidates, key=lambda c: sum(ch.isdigit() for ch in c["text"]))

        crop = _crop_bbox_region(note, panel)
        if crop is None or crop.shape[1] < 20:
            return 0.5, f"Detected candidate panel '{panel['text']}' but too small to measure numeral progression."

        heights = _column_ink_heights(crop)
        if heights is None:
            return 0.5, f"Panel '{panel['text']}' detected but numeral-height profile could not be measured."

        first_third = heights[: len(heights) // 3]
        last_third = heights[-len(heights) // 3:]
        if not first_third.size or not last_third.size:
            return 0.5, "Panel too narrow to compare numeral progression."

        growth = (last_third.mean() - first_third.mean()) / max(first_third.mean(), 1)
        if growth > 0.15:
            return 1.0, (
                f"Serial panel '{panel['text']}' shows ascending numeral height "
                f"({growth*100:.0f}% growth left-to-right) — matches RBI's documented "
                f"telescopic numbering security feature."
            )
        if growth > -0.05:
            return 0.5, (
                f"Serial panel '{panel['text']}' shows roughly flat numeral height "
                f"({growth*100:.0f}% change) — inconclusive, may be angle/resolution."
            )
        return 0.2, (
            f"Serial panel '{panel['text']}' shows NO ascending numeral growth "
            f"({growth*100:.0f}% change) — genuine notes grow left-to-right; flat or "
            f"shrinking size is a red flag."
        )

    @classmethod
    def _text_integrity_score(cls, ocr_items: Optional[list], denomination: Optional[int]) -> tuple:
        """
        STRUCTURAL (new in v2): genuine notes carry fixed, exact wording.
        Cheap fakes and prop/novelty notes get the wording wrong — substituted
        text ('CHILDREN BANK OF INDIA'), garbled fonts, misspellings. Fuzzy-
        match the OCR'd text against the note's known anchors. MISSING anchors
        score softly (reverse side / angle / lighting is not a crime);
        SUBSTITUTED wording is the red flag.
        """
        if ocr_items is None:
            return 0.5, "OCR unavailable — text-integrity check skipped (not counted against the verdict)."

        words = cls._ocr_words(ocr_items)
        if len("".join(words)) < 12:
            return 0.5, "Too little readable text to verify wording (angle/resolution) — check skipped, not counted against the note."

        for prop in _PROP_TOKENS:
            if _fuzzy_contains(words, prop, threshold=0.8):
                return 0.05, (f"Wording matches known novelty/prop-note text ('{prop}') — "
                              f"this is NOT genuine Reserve Bank of India wording.")

        anchors = list(_TEXT_ANCHORS_COMMON)
        if denomination in _DENOM_WORDS:
            anchors.append(_DENOM_WORDS[denomination])
        found = [a for a in anchors if _fuzzy_contains(words, a)]
        core_found = "RESERVE BANK OF INDIA" in found

        if core_found and len(found) >= 2:
            return 1.0, (f"Note wording intact: {len(found)}/{len(anchors)} fixed text anchors "
                         f"verified ({', '.join(found[:3])}).")
        if core_found:
            return 0.85, "Issuer wording 'RESERVE BANK OF INDIA' verified intact; other anchors not readable at this angle/resolution."
        if found:
            return 0.6, f"Partial wording match ({', '.join(found)}) — RBI name panel not readable in this shot."

        # No anchors at all — distinguish 'wrong wording' from 'can't see the text'
        if _fuzzy_contains(words, "BANK OF INDIA", threshold=0.8):
            return 0.2, ("'BANK OF INDIA' detected but 'RESERVE' is missing or substituted — "
                         "wording mismatch is a counterfeit/novelty-note red flag.")
        return 0.4, ("Text is readable but none of the note's fixed wording anchors were found — "
                     "possibly the reverse side or a steep angle. Retake showing the front face for a wording check.")

    @staticmethod
    def _uv_fluorescence_check(bgr: np.ndarray, capture_mode: str) -> dict:
        """
        Genuine INR notes have a fluorescent security thread/number panel
        visible only under UV light. A normal-light phone photo CANNOT
        simulate this — faking a UV verdict from visible-light pixels would
        be exactly the kind of silent fake this project explicitly avoids.
        Only activates when the caller declares `capture_mode="uv"` (citizen
        used a UV torch attachment or the bank's UV lamp station).
        """
        if capture_mode != "uv":
            return {
                "feature": "uv_fluorescence", "score": None, "tier": "conditional",
                "finding": (
                    "not_applicable — UV verification requires a photo taken under UV "
                    "illumination (UV torch/lamp). A normal-light photo cannot be used "
                    "to simulate this check; pass capture_mode='uv' with a UV-lit photo "
                    "to enable it."
                ),
            }
        # Under a declared UV capture: genuine notes show a bright, narrow,
        # high-saturation glow (thread/panel) against an otherwise dark note
        # body (paper doesn't fluoresce; the security fibers/thread do).
        hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)
        v = hsv[:, :, 2].astype(np.float32)
        s = hsv[:, :, 1].astype(np.float32)
        bright_sat_mask = (v > 200) & (s > 100)
        glow_fraction = float(bright_sat_mask.mean())

        if 0.005 < glow_fraction < 0.15:
            score, finding = 1.0, (
                f"Localized bright fluorescent region ({glow_fraction*100:.1f}% of frame) "
                f"consistent with a genuine UV-reactive security thread/panel."
            )
        elif glow_fraction >= 0.15:
            score, finding = 0.3, (
                f"Broad fluorescence across {glow_fraction*100:.1f}% of the frame — "
                f"genuine notes glow only in narrow thread/panel regions, not the whole note."
            )
        else:
            score, finding = 0.2, "No fluorescent response detected under declared UV capture — expected on a genuine note."
        return {"feature": "uv_fluorescence", "score": score, "tier": "conditional", "finding": finding}

    # ── Stage 4/5: tiered fusion + confidence ceilings ───────────────────────

    def _gate_response(self, verdict: str, guidance: str, gates: dict) -> dict:
        """Honest early exit — no fake probability is fabricated for content
        that was never analyzable as a banknote."""
        return {
            "verdict": verdict,
            "confidence": "HIGH" if verdict == "NOT_A_CURRENCY_NOTE" else None,
            "fake_probability": None,
            "model_mode": self.mode,
            "security_checks": [],
            "heuristic_genuine_score": None,
            "cnn_fake_probability": None,
            "denomination": None,
            "gates": gates,
            "guidance": guidance,
            "disclaimer": _DISCLAIMER,
        }

    def analyze(self, bgr: np.ndarray, capture_mode: str = "visible") -> dict:
        gates = {}

        # Stage 0a — resolution/exposure
        q = self._exposure_resolution_check(bgr)
        if q:
            gates["quality"] = {"pass": False, "reason": q["reason"]}
            return self._gate_response("INSUFFICIENT_QUALITY", q["guidance"], gates)

        # Stage 1a — blank surface (BEFORE blur: a white sheet is 'not a
        # note', not 'a blurry photo')
        blank = self._blank_surface_check(bgr)
        if blank:
            gates["note_presence"] = {"pass": False, "reason": "blank_surface"}
            return self._gate_response("NOT_A_CURRENCY_NOTE", blank, gates)

        # Stage 0b — blur
        b = self._blur_check(bgr)
        if b:
            gates["quality"] = {"pass": False, "reason": "blur", "laplacian_variance": b["lap_var"]}
            return self._gate_response("INSUFFICIENT_QUALITY", b["guidance"], gates)

        glare = self._glare_flag(bgr)
        gates["quality"] = {"pass": True, "glare_flag": bool(glare)}

        # Stage 2 — crop + ONE shared OCR pass
        note = self._note_region(bgr)
        ocr_items = self._run_ocr(note)

        # Stage 1b — full presence gate
        presence = self._note_presence_score(note, ocr_items)
        gates["note_presence"] = {"pass": presence["score"] >= 0.5, **presence}
        if presence["score"] < 0.5:
            return self._gate_response(
                "NOT_A_CURRENCY_NOTE",
                "The image doesn't show recognizable Indian banknote features (color family, "
                "proportions, or RBI wording). If a note IS present, retake with the note "
                "filling the frame, front face up.",
                gates,
            )

        denomination = self._detect_denomination(ocr_items)

        # Stage 3 — evidence collection
        thread_s, thread_r = self._security_thread_score(note)
        micro_s, micro_r = self._microprint_sharpness_score(note)
        noise_s, noise_r = self._print_noise_score(note)
        serial_s, serial_r = self._serial_number_score(note, ocr_items)
        text_s, text_r = self._text_integrity_score(ocr_items, denomination)
        uv_check = self._uv_fluorescence_check(bgr, capture_mode)

        # Lighting exclusion rule: under flagged glare, a red band/print read
        # is 'unreadable', never counterfeit evidence.
        if glare:
            if thread_s <= 0.2:
                thread_s, thread_r = 0.5, f"Thread band unreadable — {glare}"
            if micro_s <= 0.2:
                micro_s, micro_r = 0.5, f"Print-detail read unreliable — {glare}"

        checks = [
            {"feature": "serial_number_pattern", "score": serial_s, "finding": serial_r, "tier": "structural", "weight": 0.25},
            {"feature": "text_integrity", "score": text_s, "finding": text_r, "tier": "structural", "weight": 0.20},
            {"feature": "security_thread", "score": thread_s, "finding": thread_r, "tier": "weak_proxy", "weight": 0.20},
            {"feature": "microprint_sharpness", "score": micro_s, "finding": micro_r, "tier": "weak_proxy", "weight": 0.15},
            {"feature": "print_noise_profile", "score": noise_s, "finding": noise_r, "tier": "weak_proxy", "weight": 0.20},
        ]
        weighted = sum(c["score"] * c["weight"] for c in checks)
        genuine_score = round(weighted / sum(c["weight"] for c in checks), 3)

        cnn = self._cnn_predict(bgr)

        # ── Tiered fusion ────────────────────────────────────────────────────
        tier_a = [c for c in checks if c["tier"] == "structural"]
        if uv_check["score"] is not None:
            tier_a = tier_a + [{"feature": "uv_fluorescence", "score": uv_check["score"]}]
        structural_reds = [c["feature"] for c in tier_a if c["score"] <= 0.2]
        a_positive = any(c["score"] >= 0.8 for c in tier_a)
        uv_passed = uv_check["score"] is not None and uv_check["score"] >= 0.8

        noise_red = noise_s <= 0.2  # reproduction signature — blocks confident GENUINE
        b_scores = [thread_s, micro_s, noise_s]
        b_red_majority = sum(1 for s in b_scores if s <= 0.2) >= 2
        b_pass_majority = sum(1 for s in b_scores if s >= 0.5) >= 2

        fp = cnn["fake_probability"] if cnn else None
        cnn_conf_fake = fp is not None and fp >= 0.70
        cnn_conf_real = fp is not None and fp <= 0.30
        # 0.30-0.70 = dead band: the CNN's Kaggle-domain confidence doesn't
        # transfer (measured 2026-07-19), so mid scores are 'no read'.

        guidance = None
        if structural_reds:
            # Rule 1 — structural red flag caps at SUSPECT minimum; corroboration escalates
            if cnn_conf_fake or noise_red or b_red_majority:
                verdict = "LIKELY_COUNTERFEIT"
                confidence = "HIGH" if (cnn_conf_fake and (noise_red or b_red_majority)) else "MEDIUM"
            else:
                verdict, confidence = "SUSPECT_FEATURES", "MEDIUM"
            guidance = ("Do not return this note to circulation. Have it physically verified "
                        "(tilt/UV/touch per RBI) at a bank branch, and report if confirmed.")
        elif cnn_conf_fake:
            # Rule 2 — CNN alone flags but never condemns (domain-gap humility)
            verdict, confidence = "SUSPECT_FEATURES", "MEDIUM"
            guidance = ("The learned model flags this note but the physical checks did not "
                        "corroborate — treat as suspect and verify physically at a bank.")
        elif noise_red:
            # Rule 3 — reproduction signature blocks GENUINE
            verdict, confidence = "INCONCLUSIVE", "LOW"
            guidance = ("Print-noise texture is typical of an inkjet/laser reproduction, though "
                        "other checks passed. Physical verification advised; a sharper retake "
                        "in daylight may also resolve this.")
        elif b_pass_majority and (a_positive or cnn_conf_real):
            # Rule 4 — genuine path, confidence capped by evidence mode
            verdict = "LIKELY_GENUINE" if cnn else "GENUINE_FEATURES"
            if uv_passed:
                confidence = "HIGH"
                guidance = "Visible-light and UV checks both passed — bank-teller-equivalent screening complete."
            else:
                confidence = "MEDIUM"
                guidance = ("Screening passed, but a single normal-light photo cannot verify the "
                            "strongest RBI features (color-shift ink, watermark, UV glow). Add a "
                            "UV-lit photo (capture_mode='uv') to raise confidence.")
        else:
            disagreeing = [c["feature"] for c in checks if c["score"] <= 0.2] or ["insufficient positive evidence"]
            verdict, confidence = "INCONCLUSIVE", "LOW"
            guidance = (f"Checks disagree ({', '.join(disagreeing)}) — retake in bright even daylight "
                        f"showing the full front face, or verify physically at a bank.")

        checks.append(uv_check)  # informational placement at the end, as before

        return {
            "verdict": verdict,
            "confidence": confidence,
            "fake_probability": fp if fp is not None else round(1.0 - genuine_score, 3),
            "model_mode": self.mode,
            "security_checks": checks,
            "heuristic_genuine_score": genuine_score,
            "cnn_fake_probability": fp,
            "denomination": denomination,
            "gates": gates,
            "guidance": guidance,
            "disclaimer": _DISCLAIMER,
        }
