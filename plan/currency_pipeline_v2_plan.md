# Currency Detection Pipeline v2 — Design Plan (no code yet)

**Status:** DESIGN — nothing here is implemented except the fusion-veto patch (commit `ea9ddb1`).
**PS anchor (ps.txt, ET PS bullet 2):** *"identifies fake notes through microprint analysis, security thread verification, serial number pattern validation, and UV feature simulation — providing field officers and bank tellers with instant, reliable identification across all denominations."*
**PS kill metric (ps.txt Evaluation Focus):** *"false positive rate for citizen-facing tools (must be very low)"* — a real note called fake is the worst outcome, worse than a fake called inconclusive.

---

## 1. Why v2 — what testing on 2026-07-19 actually proved

| Evidence | Conclusion |
|---|---|
| `fake1.jpg` / `fake2.jpg` (real-world fakes) → CNN fake-prob 0.39 / 0.14 | The CNN's 98.67% Kaggle-test accuracy does **not** transfer to out-of-domain photos. It learned the Kaggle datasets' capture conditions, not counterfeit features. Classic domain gap — phash dedup prevented leakage but not collection bias. |
| Same two fakes → old fusion said `LIKELY_GENUINE / HIGH` while their own serial/noise checks printed red flags | Flat weighted averaging let easy-to-fake signals (thread band presence, print sharpness) outvote hard-to-fake ones. Patched (veto logic) but the deeper tiering redesign is this plan. |
| Thought experiment: white sheet of paper | `_note_region()` falls back to full frame, CNN softmax **must** emit a probability, every heuristic returns a number → system says "bad fake" when the honest answer is "that isn't a banknote." No presence gate exists. |
| Sharpness check reads blur, never *content* | A joke/prop note ("Children's Bank of India", garbled Devanagari, wrong fonts) with sharp printing passes "microprint analysis." The PS bullet is only half-covered. |
| Real note under dim/warm light or glare | Thread contrast drops, Laplacian variance drops, OCR misreads → weak proxies all degrade toward "fake-looking." Without a quality gate this manufactures **false positives on genuine notes** — the exact PS kill metric. |

## 2. Ground truth: what a camera can and cannot verify

RBI Mahatma-Gandhi-series features, by forge-resistance × visibility in a **single flat visible-light photo**:

| Feature | Forge-resistance | Flat photo sees it? |
|---|---|---|
| OVI color-shift numeral (₹500/₹2000) | Very high | ❌ needs tilt |
| Thread color-shift green↔blue | Very high | ❌ needs tilt |
| Watermark + electrotype | High | ❌ needs backlight |
| Latent image | High | ❌ needs angle |
| See-through register | High | ❌ needs backlight |
| UV glow (thread/panel/fibers) | High | ❌ needs UV lamp |
| **Serial telescopic (ascending) numbering** | High | ✅ **structural** |
| **Fixed text anchors (RBI name, guarantee clause, 15-language panel, denomination numerals)** | High vs. casual fakes | ✅ **structural** |
| Intaglio relief | Med-high | ⚠️ raking light only |
| Microprint sharpness | Medium | ⚠️ weak proxy |
| Print-noise texture | Medium | ⚠️ weak proxy |
| Dark thread *presence* (no shift check) | **Low** | ✅ but trivially faked |

**Structural conclusion:** a single flat photo can *screen* but can never *clear* a note — most strong features are angle/light-dependent **by design**. The honest ceiling: flat photo → screening verdict only; confident GENUINE requires multi-capture (tilt and/or UV). This must be encoded in the confidence policy, not left to score arithmetic.

## 3. Target pipeline (exact stage order)

```
photo (+ declared capture_mode: visible | uv | tilt-sequence)
  │
  ▼
STAGE 0 — IMAGE QUALITY GATE            [new · classical · protects against false positives]
  blur (Laplacian on full frame), exposure (histogram: under/over),
  glare (blown-highlight blob area), resolution (min note-pixels)
  ├─ fail → INSUFFICIENT_QUALITY + specific retake tip
  │         ("too dark — move near a window", "glare — tilt away from light")
  │         NEVER counted as evidence of counterfeit.
  ▼ pass
STAGE 1 — NOTE PRESENCE GATE            [new · classical · the white-sheet fix]
  edge-density (reuse Canny), color-saturation spread vs blank/uniform,
  OCR text-hit count (a note has dozens of text regions; blank sheet ≈ 0),
  dominant-contour aspect ratio vs INR envelope (~2.13–2.35:1 incl. perspective slack)
  ├─ fail → NOT_A_CURRENCY_NOTE (honest exit; CNN never runs)
  ▼ pass
STAGE 2 — NOTE CROP + DENOMINATION ID   [upgraded]
  contour crop (existing) + denomination via OCR numerals + dominant hue
  (each INR denomination has a distinct color family: ₹500 stone-grey,
  ₹200 bright yellow, ₹100 lavender, ₹50 fluorescent blue, …)
  → denomination drives which text whitelist + thread position to expect
  ▼
STAGE 3 — EVIDENCE COLLECTION           [parallel, each emits score + reason + quality-validity flag]
  TIER A · STRUCTURAL (near-veto power)
    A1 serial_number_pattern   (existing — telescopic growth)
    A2 text_integrity          (NEW — OCR fuzzy-match vs per-denomination
                                whitelist: "RESERVE BANK OF INDIA",
                                "भारतीय रिज़र्व बैंक", guarantee clause,
                                denomination words/numerals; scored by
                                anchors-found-intact ratio)
  TIER B · WEAK PROXIES (corroborate only, can never carry a verdict)
    B1 security_thread band    (existing)
    B2 microprint_sharpness    (existing)
    B3 print_noise_profile     (existing)
  TIER C · CONDITIONAL (only when capture_mode declares it — never simulated)
    C1 uv_fluorescence         (existing, already gated)
    C2 tilt_color_shift        (NEW, later phase — 2–3 frame capture, track
                                hue change in thread/numeral region; the ONLY
                                way to check the most forge-resistant feature)
  ADVISORY
    CNN fake-probability       (existing model — demoted to tie-breaker,
                                uncertainty band 0.30–0.70 treated as "no read")
  ▼
STAGE 4 — TIERED FUSION                 [replaces weighted average]
  rule order (first match wins):
   1. any Tier-A strong red flag (score ≤0.2 on a quality-valid read)
        → ceiling = SUSPECT, regardless of everything else
   2. CNN confident-fake (≥0.70) OR Tier-A red + Tier-B majority-red
        → LIKELY_COUNTERFEIT
   3. Tier-A all pass + Tier-B majority pass + CNN not confident-fake
        → LIKELY_GENUINE (confidence ceiling from Stage 5)
   4. anything mixed → INCONCLUSIVE + name exactly which checks disagreed
  lighting rule: a check whose own quality flag says "unreadable under this
  light" is EXCLUDED (weight removed), never scored against the note.
  ▼
STAGE 5 — CONFIDENCE CEILING BY EVIDENCE MODE   [honesty layer]
  visible-only photo          → GENUINE capped at MEDIUM  ("screening only")
  visible + UV               → up to HIGH
  visible + tilt             → up to HIGH
  visible + UV + tilt        → HIGH ("bank-teller-equivalent checks passed")
  counterfeit verdicts: HIGH allowed from a single photo when Tier-A red +
  CNN agree (flagging needs less evidence than clearing — asymmetry is the
  correct direction for the PS's false-positive metric).
  Response always names: which checks ran, which were excluded and why,
  what capture would raise confidence ("add a UV-lit photo to upgrade").
```

## 4. Do we retrain the CNN? — Decision

**Short answer: not now, and never as the main fix. Optional v2 training run later if time allows.**

| Option | Verdict |
|---|---|
| **Keep current `currency_cnn.pt` as demoted advisory** | ✅ **Do this.** The pipeline redesign (gates + tiering + ceilings) fixes every observed failure without touching the model. The CNN still adds value in-domain and the 0.30–0.70 dead-band already contains its out-of-domain overconfidence. |
| Retrain same 2-class setup on same data | ❌ Pointless — reproduces the same domain gap; the 98.67% was never the problem's measure. |
| Add a 3rd "not_a_note" class | ❌ Wrong tool — needs a big negative dataset, and Stage 1 solves it classically for free, explainably. |
| **v2 fine-tune (optional, only if ≥½ day spare before demo)** | ⚠️ Worth it *only* with new signal: (a) fold in 30–80 self-captured photos — real notes + prop/photocopy fakes, phone-shot under varied lighting — as a fine-tune + calibration set; (b) crank domain augmentation harder in the existing `kaggle_train_currency.ipynb` (stronger color-temperature jitter, low-light gamma, glare synth, heavier JPEG); (c) calibrate the dead-band on the self-captured holdout. Notebook needs only augmentation-cell edits; checkpoint format/loader unchanged. |

Deck claim stays honest either way: "own trained CNN, advisory role, fused with explainable RBI-documented checks" — per CLAUDE.md, no external pretrained model exists to cite anyway.

## 5. Lighting & real-world robustness matrix (design-in, not patch-later)

| Condition | Failure it causes today | v2 handling |
|---|---|---|
| Dim / warm indoor light | thread contrast ↓, sharpness ↓ → fake-leaning scores on real notes | Stage 0 exposure check → retake tip; per-check quality flags exclude unreadable checks from fusion |
| Glare / flash hotspot | washes out thread + serial panel | Stage 0 glare-blob detection → "tilt away from light source" |
| Motion blur / low-res | kills microprint + OCR | Stage 0 blur gate; OCR checks self-report "skipped", excluded not penalized |
| Shadow bands | fake dark "thread" stripes | thread check validates band *position* against denomination layout (Stage 2), not just darkness |
| Perspective / angled shot | aspect-ratio + telescopic measurement distortion | Stage 1 ratio envelope has slack; Stage 3 A1 already reports "may be angle" at 0.5 instead of red |
| Worn / soiled genuine note | soft print, faint thread | Tier-B softness alone can no longer flag fake (Tier-B can't carry a verdict); Tier-A text/serial survive wear best |
| Folded / partial note | half the anchors missing | text_integrity scores on found-anchor ratio of *visible* region; verdict capped INCONCLUSIVE "show full note" |
| Screen photo (note displayed on a monitor) | passes color/edge gates | moiré/periodicity already partially caught by B3; note as future hardening, not v2 blocker |

## 6. Verdict vocabulary (citizen-facing, honest)

`NOT_A_CURRENCY_NOTE` · `INSUFFICIENT_QUALITY` (+ retake tip) · `LIKELY_GENUINE` (MEDIUM cap on single photo, "screening only") · `INCONCLUSIVE` (names the disagreeing checks + what capture would resolve it) · `SUSPECT_FEATURES` · `LIKELY_COUNTERFEIT` (+ RBI guidance: report, don't recirculate). Every response keeps `model_mode`, per-check findings, and the existing disclaimer.

## 7. Build order (each step independently shippable, ordered by risk-killed-per-hour)

1. **P1 — Stage 1 note-presence gate** (white-sheet fix; biggest embarrassment risk in a live demo; purely classical, ~no latency)
2. **P2 — Stage 0 quality gate + per-check quality flags** (kills lighting-driven false positives — the PS kill metric)
3. **P3 — text_integrity check + denomination ID** (completes the PS's "microprint analysis" bullet meaningfully; reuses the already-loaded EasyOCR reader — one extra OCR pass, note serial-check latency already ~1s, budget +0.5–1s)
4. **P4 — tiered fusion + confidence ceilings** (replaces the patched-but-still-flat averaging with the Stage 4/5 rules)
5. **P5 (optional) — tilt capture mode** (frontend: 2–3 frame capture in SecureCameraView/chat; backend: hue-shift track; the only path to checking the strongest feature — demo wow-factor but new UX surface, so last)
6. **P6 (optional) — CNN v2 fine-tune** per §4, only with self-captured data and spare time.

**Test set to freeze before building:** `Classifier/test/` grows to — the 3 current images + white sheet + non-note object (book/ID card) + real note in dim light + real note with glare + folded real note + note photographed off a screen. Every phase must keep all prior cases passing; the two known fakes must never again clear as GENUINE, and no real-note-bad-lighting case may ever come back COUNTERFEIT (INSUFFICIENT_QUALITY / INCONCLUSIVE are the acceptable outcomes).

## 8. Explicit non-goals (so scope can't creep)

- No claim of legal determination — screening aid wording stays in every response.
- No simulated UV/tilt from a normal photo — capability ceilings are stated, not papered over.
- No new model architecture, no external pretrained model (none trustworthy exists — verified 2026-07-17).
- No per-denomination CNN heads for now — denomination ID serves the text whitelist + thread-position lookup only.
