# KAWACH — Counterfeit Currency Detection Pipeline

**Status: LIVE** — deployed on the KAWACH classifier service, reachable from the citizen app (Nayak chat + camera) and verified end-to-end against real prop-note fakes on 2026-07-19.
**Endpoint:** `POST /classify-currency` · **Acceptance suite:** `test_currency_v2.py` (9 frozen cases, all passing)

---

## Why this exists (the problem statement's own words)

The ET problem statement names counterfeit currency at every level — context, challenge, build target, and scoring:

> *"counterfeit currency remains a persistent threat: the RBI's Annual Report 2025 flagged record FICN (Fake Indian Currency Notes) seizures, with high-denomination Rs 500 fakes of sufficient quality to defeat manual detection in routine banking operations."*

> **Counterfeit Currency Identification Agent** — *"Computer vision AI deployable on mobile devices, bank counting machines, and point-of-sale terminals that identifies fake notes through **microprint analysis**, **security thread verification**, **serial number pattern validation**, and **UV feature simulation** — providing field officers and bank tellers with instant, reliable identification across all denominations."*

> Evaluation focus: *"**Counterfeit detection accuracy across denominations and print quality** … **false positive rate for citizen-facing tools (must be very low)**."*

Every stage below maps to one of those four named techniques, and the whole design is shaped around the stated kill metric: **a real note must never be called fake because of a bad photo.**

---

## In simple words

A citizen photographs a banknote in the KAWACH app. The pipeline then behaves the way a careful bank teller would:

1. **First it checks the photo, not the note.** Too dark, blurry, or full of glare? It says *"retake it like this"* — it never punishes a genuine note for bad lighting.
2. **Then it checks there's actually a note in the frame.** A white sheet or a random object is answered with *"this isn't a banknote"* — it is never forced into a real-vs-fake guess.
3. **Then it reads the note like a human would.** It OCRs the printed text and checks the wording is exactly what the Reserve Bank prints. Cheap fakes get this wrong — our real test fakes literally said **"CHILDREN BANK"** and **"MANORANJAN"** instead of "RESERVE BANK OF INDIA", and the pipeline caught both by reading them.
4. **It checks the physical print features** — the security-thread band, microprint sharpness, print-noise texture, and RBI's telescopic serial numbering (digits printed in ascending size, left to right).
5. **Our trained neural network gives a second opinion** — advisory, never the judge.
6. **Finally it fuses everything with tiered trust**: hard-to-fake evidence can veto, easy-to-fake evidence can only corroborate, and the verdict always states *why* in plain language.

And one honest rule on top: **a single normal-light photo can never earn a HIGH-confidence "genuine"** — the strongest RBI features (color-shift ink, watermark, UV glow) are invisible to a flat photo *by design*. Full confidence requires a UV-lit capture, exactly like a real bank counter.

---

## Architecture flow

```
                        citizen photo (+ capture_mode: visible | uv)
                                        │
                                        ▼
                        ┌───────────────────────────────┐
                        │ STAGE 0 · IMAGE QUALITY GATE  │
                        │ resolution · exposure · blur  │
                        │ · glare                       │
                        └───────────────┬───────────────┘
                    fail ──► INSUFFICIENT_QUALITY + retake tip
                          (bad lighting is NEVER counterfeit evidence)
                                        │ pass
                                        ▼
                        ┌───────────────────────────────┐
                        │ STAGE 1 · NOTE PRESENCE GATE  │
                        │ edge density · color family · │
                        │ INR wording signal · aspect   │
                        └───────────────┬───────────────┘
                    fail ──► NOT_A_CURRENCY_NOTE
                          (white sheet / object — CNN never runs)
                                        │ pass
                                        ▼
                        ┌───────────────────────────────┐
                        │ STAGE 2 · CROP + ONE SHARED   │
                        │ OCR PASS + DENOMINATION ID    │
                        └───────────────┬───────────────┘
                                        │
            ┌───────────────────────────┼───────────────────────────┐
            ▼                           ▼                           ▼
 ┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────────┐
 │ TIER A · STRUCTURAL │   │ TIER B · WEAK PROXY │   │ ADVISORY · CNN      │
 │ (can VETO)          │   │ (corroborate only)  │   │ EfficientNet-B0,    │
 │ • serial telescopic │   │ • thread band       │   │ our own training    │
 │   numbering (RBI)   │   │ • microprint        │   │ run; 0.30–0.70 =    │
 │ • text integrity vs │   │   sharpness         │   │ "no read" dead band │
 │   fixed RBI wording │   │ • print-noise       │   └──────────┬──────────┘
 │ • UV glow (only if  │   │   texture           │              │
 │   capture_mode=uv)  │   └──────────┬──────────┘              │
 └──────────┬──────────┘              │                         │
            └───────────────────────────┼───────────────────────┘
                                        ▼
                        ┌───────────────────────────────┐
                        │ STAGE 4 · TIERED FUSION       │
                        │ rule-ordered, not averaged:   │
                        │ structural red flag ⇒ verdict │
                        │ capped at SUSPECT no matter   │
                        │ how other scores average out  │
                        └───────────────┬───────────────┘
                                        ▼
                        ┌───────────────────────────────┐
                        │ STAGE 5 · CONFIDENCE CEILING  │
                        │ single visible photo: GENUINE │
                        │ capped at MEDIUM · HIGH needs │
                        │ a passing UV capture · fakes  │
                        │ need less proof than clearing │
                        └───────────────┬───────────────┘
                                        ▼
              verdict + per-check findings + guidance, e.g.
     LIKELY_COUNTERFEIT · "Wording matches novelty-note text
     ('CHILDREN BANK') — this is NOT genuine RBI wording."
```

---

## The stages in depth

### Stage 0 — Image quality gate (the false-positive shield)
Resolution, exposure (dark **and** washed-out), motion blur, and glare are measured before any authenticity logic runs. Failures return `INSUFFICIENT_QUALITY` with a *specific* retake tip ("too dark — move near a window", "glare — tilt away from the light"). Under moderate glare the pipeline goes further: any red reading from the glare zone is **excluded from fusion** rather than scored against the note. This is the direct implementation of the PS's "false positive rate must be very low" requirement.

### Stage 1 — Note presence gate
A weighted evidence score (color family of INR notes, edge structure, INR wording hits from OCR, aspect ratio with perspective slack) decides whether a banknote is present *at all*. A white sheet or a printed document exits as `NOT_A_CURRENCY_NOTE`. This matters because a 2-class neural network **must** emit a real-vs-fake probability for anything it's given — softmax has no "neither" option — so the gate exists to never ask it a question that has no valid answer. Scoring is combined, not single-feature, so a folded or partially covered real note (wrong aspect, right color + wording) still passes.

### Stage 2 — One shared OCR pass + denomination ID
EasyOCR runs **once** per request; its output feeds the presence gate, denomination detection, the serial-number check, and the text-integrity check. Denomination comes from OCR numerals and selects the expected wording whitelist.

### Stage 3 — Evidence, in trust tiers

**Tier A — structural (near-veto power):** the hardest features to fake casually.
- **Serial number pattern validation** *(PS technique #3)* — RBI's documented telescopic numbering: number-panel digits print in ascending size left-to-right. Verified via OCR bounding boxes + column ink-height profiling. No model needed; fully explainable.
- **Text integrity** — the OCR'd text is fuzzy-matched against the fixed wording every genuine note carries ("RESERVE BANK OF INDIA", the guarantee clause, the denomination in words) plus a list of known novelty/prop-note tokens. *Missing* text scores softly (could be the reverse side or a steep angle); *substituted* text is a red flag. **This check caught both of our real-world test fakes by literally reading their wrong wording.**
- **UV fluorescence** *(PS technique #4)* — honestly gated: it only activates when the caller declares a UV-lit capture (`capture_mode="uv"`). A normal-light photo *cannot* see fluorescence, so the pipeline says `not_applicable` instead of fabricating a UV verdict.

**Tier B — weak proxies (corroborate only, can never carry a verdict):**
- **Security thread verification** *(PS technique #2)* — dark vertical band detection in the thread window. Weak on purpose: any printed dark line fakes "presence"; the real feature (color shift on tilt) needs more than a flat photo.
- **Microprint analysis** *(PS technique #1)* — Laplacian-variance sharpness in detail zones; genuine intaglio printing keeps high-frequency detail that consumer printers lose.
- **Print-noise profile** — inkjet/laser reproductions leave periodic dot noise absent from offset/intaglio production.

**Advisory — the CNN (our own trained model, see below):** consulted, never obeyed. Scores between 0.30 and 0.70 are treated as "no read".

### Stage 4 — Tiered fusion (rule-ordered, not averaged)
A flat weighted average is exactly how our first version failed: a convincing-looking dark band plus sharp printing outvoted an explicit serial-number red flag, and a known fake scored "genuine". v2 fuses by rules: any structural red flag caps the verdict at SUSPECT regardless of the other numbers; weak proxies and the CNN can escalate a suspect to `LIKELY_COUNTERFEIT` but can never overturn structural evidence; the genuine path requires structural + majority-proxy + CNN agreement. Every verdict names which checks fired and why.

### Stage 5 — Confidence ceiling by evidence
Most of RBI's strongest anti-counterfeit features (optically-variable ink, thread color-shift, watermark, latent image, UV glow) are **angle- or light-dependent by design** — that is *why* they're hard to forge, and why a flat photo cannot see them. So: a single visible-light photo caps a GENUINE verdict at MEDIUM confidence, with guidance on what capture would raise it; HIGH-confidence GENUINE requires a passing UV shot. Flagging a fake needs less evidence than clearing a note — the correct asymmetry for a citizen-safety tool.

---

## The model (our own training run — no pretrained shortcut existed)

We checked first: **no trustworthy pretrained INR-counterfeit model exists publicly** (HF Hub + GitHub survey, 2026-07-17 — only zero-provenance weights or toy datasets with no reported accuracy). So we trained our own.

| | |
|---|---|
| Architecture | EfficientNet-B0 (chosen for free-tier CPU inference, <200 ms/image) |
| Training data | 6 public Kaggle FICN datasets merged (~14k raw images) |
| De-duplication | Perceptual-hash dedup before splitting — prevents near-duplicate train/test leakage, a common silent accuracy inflator in these datasets |
| Split | Stratified 70/15/15 — 6,304 train / 1,351 val / 1,352 held-out test (touched once) |
| Augmentation | Domain-realistic: perspective warp, motion blur, JPEG artifacts — simulating real phone photos, not generic ImageNet transforms |
| Training | Frozen-backbone warm-up → full fine-tune, early stopping on val macro-F1 (Kaggle T4; notebook: `kaggle_train_currency.ipynb`) |
| **Held-out test accuracy** | **98.67%** overall (n=1,352) · **~98% averaged across denominations** · fake-recall 0.98 · AUC 0.998 |
| Honest weak spot | ₹2000 notes: 89.4% (thin fake data for that denomination, n=47) |

**And the most important number is one we measured ourselves:** when we tested the CNN against real-world prop-note fakes it had never seen, its confidence did **not** transfer — which is precisely why the pipeline demotes it to an advisory role behind the explainable structural checks, instead of letting a single black-box score decide. The lab accuracy is real; the architecture just refuses to over-trust it.

---

## What a judge can verify live

| Input | Verdict | Why |
|---|---|---|
| Real ₹200 note | `LIKELY_GENUINE` (MEDIUM — screening honesty cap) | Structural + proxy + CNN agreement |
| Prop fake #1 | `LIKELY_COUNTERFEIT` | OCR read "MANORANJAN" wording + inkjet noise signature |
| Prop fake #2 | `LIKELY_COUNTERFEIT` | OCR read "CHILDREN BANK" + flat serial numerals (−37% growth) |
| White sheet | `NOT_A_CURRENCY_NOTE` | Presence gate — never forced into a fake score |
| Real note, dim light | `INSUFFICIENT_QUALITY` + retake tip | Bad lighting is never counterfeit evidence |
| Real note, glare / half-covered | `LIKELY_GENUINE` (MEDIUM) | Glare-zone reads excluded, not penalized |

Reproduce locally in one command: `python test_currency_v2.py` (from `Classifier/`).

## What we deliberately do NOT claim

- Not a legal determination — every response carries the RBI-guidance disclaimer (physical tilt/UV/touch checks and bank confirmation remain authoritative).
- No simulated UV or tilt verdicts from a normal photo — capability ceilings are stated, never papered over.
- No borrowed pretrained model — the CNN is our own documented training run, and its real-world limits are disclosed in this file rather than hidden behind the lab number.
