"""
Frozen acceptance test for the v2 currency pipeline
(plan/currency_pipeline_v2_plan.md §7). Run from Classifier/:

    python test_currency_v2.py

Rules encoded (must hold for every future change):
  - the two known fakes must NEVER come back GENUINE
  - the real note must NEVER come back COUNTERFEIT/SUSPECT, and a single
    visible-light photo must never claim HIGH-confidence GENUINE
  - a white sheet / non-note document must exit NOT_A_CURRENCY_NOTE
  - degraded (dim/blur/glare/partial) photos of the REAL note must never
    come back COUNTERFEIT/SUSPECT — INSUFFICIENT_QUALITY / INCONCLUSIVE /
    GENUINE are the acceptable outcomes (false positives are the PS kill metric)
"""

import os
import sys

import cv2
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.currency_detector import CurrencyDetector  # noqa: E402

TEST_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test")
GEN_DIR = os.path.join(TEST_DIR, "generated")

REAL = os.path.join(TEST_DIR, "reaal_200rs_1.png")
FAKE1 = os.path.join(TEST_DIR, "fake1.jpg")
FAKE2 = os.path.join(TEST_DIR, "fake2.jpg")

GENUINE_VERDICTS = {"LIKELY_GENUINE", "GENUINE_FEATURES"}
FAKE_VERDICTS = {"LIKELY_COUNTERFEIT", "SUSPECT_FEATURES"}


def generate_cases():
    """Synthetic degradations derived from the real note + pure-synthetic
    non-notes. Replace with real phone captures when available — these are
    stand-ins, but they encode the failure modes we must never regress on."""
    os.makedirs(GEN_DIR, exist_ok=True)
    real = cv2.imread(REAL)
    assert real is not None, f"missing {REAL}"

    # white sheet (slight texture so it's a photo of paper, not pure #FFF)
    sheet = np.full((900, 1200, 3), 235, np.uint8)
    sheet += np.random.default_rng(7).integers(0, 8, sheet.shape, dtype=np.uint8)
    cv2.imwrite(os.path.join(GEN_DIR, "white_sheet.png"), sheet)

    # printed document: black text lines on white, A4-ish portrait
    doc = np.full((1400, 1000, 3), 245, np.uint8)
    for y in range(80, 1350, 46):
        cv2.putText(doc, "Quarterly report 200 units invoice total figure",
                    (60, y), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (20, 20, 20), 2)
    cv2.imwrite(os.path.join(GEN_DIR, "text_doc.png"), doc)

    # dim real note (gamma-darkened)
    dim = np.clip((real.astype(np.float32) / 255.0) ** 2.8 * 255.0 * 0.55, 0, 255).astype(np.uint8)
    cv2.imwrite(os.path.join(GEN_DIR, "real_dim.png"), dim)

    # blurred real note
    blur = cv2.GaussianBlur(real, (31, 31), 12)
    cv2.imwrite(os.path.join(GEN_DIR, "real_blur.png"), blur)

    # glare: blown elliptical hotspot over ~12% of the frame
    glare = real.copy()
    h, w = glare.shape[:2]
    cv2.ellipse(glare, (int(w * 0.45), int(h * 0.4)), (int(w * 0.18), int(h * 0.22)),
                0, 0, 360, (255, 255, 255), -1)
    cv2.imwrite(os.path.join(GEN_DIR, "real_glare.png"), glare)

    # partial note (left 55% — folded/half-covered)
    cv2.imwrite(os.path.join(GEN_DIR, "real_partial.png"), real[:, : int(w * 0.55)])


# (name, path, allowed_verdicts, forbidden_verdicts, forbid_high_genuine)
CASES = [
    ("real_200", REAL, None, FAKE_VERDICTS, True),
    ("fake1", FAKE1, None, GENUINE_VERDICTS, False),
    ("fake2", FAKE2, None, GENUINE_VERDICTS, False),
    ("white_sheet", os.path.join(GEN_DIR, "white_sheet.png"), {"NOT_A_CURRENCY_NOTE"}, None, False),
    ("text_doc", os.path.join(GEN_DIR, "text_doc.png"), {"NOT_A_CURRENCY_NOTE"}, None, False),
    ("real_dim", os.path.join(GEN_DIR, "real_dim.png"), None, FAKE_VERDICTS, True),
    ("real_blur", os.path.join(GEN_DIR, "real_blur.png"), None, FAKE_VERDICTS, True),
    ("real_glare", os.path.join(GEN_DIR, "real_glare.png"), None, FAKE_VERDICTS, True),
    ("real_partial", os.path.join(GEN_DIR, "real_partial.png"), None, FAKE_VERDICTS, True),
]


def main():
    generate_cases()
    det = CurrencyDetector(weights_dir=os.path.join(os.path.dirname(os.path.abspath(__file__)), "weights"))
    print(f"model_mode: {det.mode}\n")

    failures = []
    for name, path, allowed, forbidden, forbid_high_gen in CASES:
        img = cv2.imread(path)
        if img is None:
            failures.append(f"{name}: could not read {path}")
            continue
        r = det.analyze(img)
        v, c = r["verdict"], r["confidence"]
        status = "PASS"
        if allowed and v not in allowed:
            status = f"FAIL (expected one of {allowed})"
        if forbidden and v in forbidden:
            status = f"FAIL (forbidden verdict {v})"
        if forbid_high_gen and v in GENUINE_VERDICTS and c == "HIGH":
            status = "FAIL (HIGH-confidence GENUINE from a single visible photo)"
        print(f"{name:14s} -> {v:22s} {str(c):7s} fake_prob={r['fake_probability']}  [{status}]")
        if status != "PASS":
            failures.append(f"{name}: {v}/{c} — {status}")

    print()
    if failures:
        print("FAILURES:")
        for f in failures:
            print(" -", f)
        sys.exit(1)
    print("ALL CASES PASS")


if __name__ == "__main__":
    main()
