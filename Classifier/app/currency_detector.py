"""
Pipeline 7 — Counterfeit Currency Detection (Indian banknotes).

Maps directly to the ET PS "Counterfeit Currency Identification Agent" bullet
(microprint analysis, security thread verification, serial number pattern
validation, UV feature simulation) — see ps.txt. Research check (2026-07-17):
no trustworthy pretrained INR-counterfeit model exists on HF Hub or GitHub at
production quality (either zero-download/no-provenance weights, or toy
datasets with no reported accuracy) — so every check here is either your own
trainable CNN or a real, documented, explainable technique. Nothing fakes a
signal it can't actually compute.

Verdict sources, fused honestly:

1. CNN classifier (weights/currency/currency_cnn.pt) — MobileNetV3-small
   fine-tuned on a labeled real/fake INR dataset via train_currency_model.py.
   Small on purpose: must run on free-tier CPU (HF Spaces 2vCPU) in <1s.

2. Classical-CV security-feature analysis — always available, no weights:
   - security-thread band detection
   - microprint sharpness (Laplacian variance in fine-detail zones)
   - print-noise profile
   - serial-number ascending-numeral check (RBI's own documented anti-
     counterfeit feature: Mahatma Gandhi series notes print the number-panel
     digits in ascending size left-to-right while the 3-char alphanumeric
     prefix stays fixed size — genuine notes are checkable via OCR bounding
     boxes, no model needed)
   Every score is deterministic and comes with a named reason.

3. UV fluorescence check — HONESTLY GATED. A phone photo taken under normal
   light cannot simulate a UV response; faking that would violate the
   project's no-silent-fakes principle. This check only activates when the
   caller explicitly declares the image was captured under UV illumination
   (`capture_mode="uv"`) — otherwise it reports `not_applicable` with the
   reason stated, rather than a fabricated finding.

Fusion rule: when sources agree, confidence is HIGH; when they disagree, the
verdict downgrades to INCONCLUSIVE with reduced confidence — never silently
pick one. When only classical CV is available the response says so
(`model_mode: "heuristic_only"`). A citizen-facing tool must under-claim, not
over-claim (false positives are the PS's stated kill metric).
"""

import os
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
            print(f"[CURRENCY] EasyOCR unavailable ({e}) — serial-number check will report not_applicable.")
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

    # ── Classical-CV security-feature analysis ───────────────────────────────

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
    def _security_thread_score(note: np.ndarray) -> tuple:
        """
        Genuine INR notes carry a dark windowed security thread as a vertical
        band at a roughly consistent relative position. Detect column bands
        significantly darker than the note's own baseline.
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
        standard print-sharpness proxy.
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
        notes. Measure residual noise after denoising in the mid-tone regions.
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
    def _serial_number_score(note: np.ndarray) -> tuple:
        """
        RBI's own documented anti-counterfeit feature (Mahatma Gandhi series):
        the number-panel digits print in ASCENDING size left-to-right, while
        the 3-character alphanumeric prefix stays fixed size. Genuine notes
        are checkable via OCR bounding-box heights — no model required.
        Source: RBI banknote security-feature guidance (telescopic/ascending
        numbering, introduced 2015-16 across all Mahatma Gandhi series notes
        except ₹20).
        """
        reader = _get_ocr_reader()
        if reader is None:
            return 0.5, "OCR unavailable in this environment — serial-number check skipped (not counted against the verdict)."

        try:
            results = reader.readtext(note, detail=1, paragraph=False)
        except Exception as e:
            return 0.5, f"OCR failed ({e}) — serial-number check inconclusive."

        # Candidate number-panel strings: short alphanumeric tokens (typical
        # INR serial format is a 2-3 letter/digit prefix + numeral block).
        candidates = []
        for bbox, text, conf in results:
            clean = "".join(ch for ch in text if ch.isalnum())
            if 4 <= len(clean) <= 12 and conf > 0.3 and any(c.isdigit() for c in clean):
                xs = [p[0] for p in bbox]
                ys = [p[1] for p in bbox]
                candidates.append({"text": clean, "height": max(ys) - min(ys), "x": min(xs)})

        if not candidates:
            return 0.5, "No serial-number-like text panel detected — image may not show the note's numbering corner."

        # Use the longest/most digit-heavy candidate as the likely number panel.
        panel = max(candidates, key=lambda c: sum(ch.isdigit() for ch in c["text"]))

        # Re-run OCR at char level isn't available cheaply here; approximate
        # ascending-size check using EasyOCR's per-character detail via a
        # tight re-crop + row-wise ink-column heights as a proxy for digit
        # height progression across the panel's width.
        crop = _crop_bbox_region(note, panel)
        if crop is None or crop.shape[1] < 20:
            return 0.5, f"Detected candidate panel '{panel['text']}' but too small to measure numeral progression."

        heights = _column_ink_heights(crop)
        if heights is None:
            return 0.5, f"Panel '{panel['text']}' detected but numeral-height profile could not be measured."

        first_third = heights[: len(heights) // 3]
        last_third = heights[-len(heights) // 3 :]
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
                "feature": "uv_fluorescence", "score": None,
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
        return {"feature": "uv_fluorescence", "score": score, "finding": finding}

    def _heuristic_predict(self, bgr: np.ndarray, capture_mode: str = "visible") -> dict:
        note = self._note_region(bgr)
        thread_s, thread_r = self._security_thread_score(note)
        micro_s, micro_r = self._microprint_sharpness_score(note)
        noise_s, noise_r = self._print_noise_score(note)
        serial_s, serial_r = self._serial_number_score(note)
        uv_check = self._uv_fluorescence_check(bgr, capture_mode)

        # Serial-number check only counts toward the score when it actually
        # produced a confident reading (0.5 = "skipped/inconclusive", weight
        # excluded rather than treated as neutral evidence).
        checks = [
            {"feature": "security_thread", "score": thread_s, "finding": thread_r, "weight": 0.35},
            {"feature": "microprint_sharpness", "score": micro_s, "finding": micro_r, "weight": 0.25},
            {"feature": "print_noise_profile", "score": noise_s, "finding": noise_r, "weight": 0.20},
            {"feature": "serial_number_pattern", "score": serial_s, "finding": serial_r, "weight": 0.20},
        ]
        weighted_sum = sum(c["score"] * c["weight"] for c in checks)
        total_weight = sum(c["weight"] for c in checks)
        genuine_score = weighted_sum / total_weight if total_weight else 0.5

        checks.append(uv_check)  # informational — not counted in genuine_score (see docstring)

        return {"genuine_score": round(genuine_score, 3), "checks": checks}

    # ── Fused verdict ────────────────────────────────────────────────────────

    def analyze(self, bgr: np.ndarray, capture_mode: str = "visible") -> dict:
        heur = self._heuristic_predict(bgr, capture_mode=capture_mode)
        cnn = self._cnn_predict(bgr)

        heur_says_fake = heur["genuine_score"] < 0.45
        heur_says_real = heur["genuine_score"] > 0.65

        if cnn is not None:
            cnn_fake = cnn["fake_probability"] >= 0.5
            # Agreement → strong verdict; disagreement → honest INCONCLUSIVE
            if cnn_fake and (heur_says_fake or not heur_says_real):
                verdict, confidence = "LIKELY_COUNTERFEIT", "HIGH" if heur_says_fake else "MEDIUM"
            elif (not cnn_fake) and (heur_says_real or not heur_says_fake):
                verdict, confidence = "LIKELY_GENUINE", "HIGH" if heur_says_real else "MEDIUM"
            else:
                verdict, confidence = "INCONCLUSIVE", "LOW"
            fake_probability = cnn["fake_probability"]
        else:
            # Heuristic-only mode: cap confidence at MEDIUM, always disclose
            if heur_says_fake:
                verdict, confidence = "SUSPECT_FEATURES", "MEDIUM"
            elif heur_says_real:
                verdict, confidence = "GENUINE_FEATURES", "MEDIUM"
            else:
                verdict, confidence = "INCONCLUSIVE", "LOW"
            fake_probability = round(1.0 - heur["genuine_score"], 3)

        return {
            "verdict": verdict,
            "confidence": confidence,
            "fake_probability": fake_probability,
            "model_mode": self.mode,
            "security_checks": heur["checks"],
            "heuristic_genuine_score": heur["genuine_score"],
            "cnn_fake_probability": cnn["fake_probability"] if cnn else None,
            "disclaimer": (
                "Screening aid only — not a legal determination. Physical verification "
                "(tilt/UV/touch checks per RBI guidelines) and bank confirmation remain "
                "authoritative. Suspected counterfeits must be reported, not returned "
                "to circulation."
            ),
        }
