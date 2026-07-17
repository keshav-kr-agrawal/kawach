---
title: KAWACH AI Classifier
emoji: 🛡️
colorFrom: red
colorTo: blue
sdk: docker
pinned: true
license: mit
---

# 🛡️ KAWACH — Community Hero AI Classifier

> **Problem Statement:** *"Build a platform that enables citizens to identify, report, validate, track, and resolve community issues through collaboration, data, and intelligent automation."*
>
> **What this microservice does:** Every civic report goes through up to **6 AI models** before a single byte reaches the database. Deepfake check → Department routing → Visual scene corroboration → Unified trust scoring → Predictive hotspot analysis → Counterfeit currency screening.

**Base URL:** `https://hikity-kawach-classifier.hf.space`

---

## 📡 Endpoints at a Glance

| Endpoint | Pipeline | What it does |
|---|---|---|
| `GET /health` | System | Model load status + version |
| `POST /classify` | 1 | Deepfake forensic scan on video |
| `POST /route` | 2 | AI civic department routing |
| `POST /analyze-scene` | 3 | Visual issue detection in video frames |
| `POST /full-analysis` | 4 | All 3 pipelines in one call (recommended) |
| `POST /predict-hotspot` | 5 ⭐ | Geographic hotspot prediction from report patterns |
| `POST /validate-report` | 6 ⭐ | Quick single-image civic scan |
| `POST /classify-currency` | 7 ⭐ | Counterfeit INR banknote screening (98.67% test accuracy) |

---

## 🎬 How a Video Gets Processed — Complete Flow

Below is exactly what happens inside the microservice from the moment a video lands until a response goes back.

```
╔══════════════════════════════════════════════════════════════════════════╗
║  CITIZEN SUBMITS: video.mp4 + title + description + category            ║
╚══════════════════════════════╦═══════════════════════════════════════════╝
                               ║
          ┌────────────────────╩───────────────────────┐
          │                                            │
          ▼                                            ▼
  ┌───────────────┐                        ┌───────────────────────┐
  │   VIDEO FILE  │                        │   TEXT (title +       │
  │ (Pipeline 1   │                        │   description +       │
  │  Pipeline 3)  │                        │   category)           │
  └───────┬───────┘                        │ (Pipeline 2)          │
          │                                └──────────┬────────────┘
          │                                           │
          │                                           │
          ▼                                           ▼
╔═══════════════════════════════╗     ╔══════════════════════════════════╗
║   PIPELINE 1 — DEEPFAKE       ║     ║   PIPELINE 2 — DEPT ROUTING      ║
╠═══════════════════════════════╣     ╠══════════════════════════════════╣
║                               ║     ║                                  ║
║  ① video_reader.py            ║     ║  ① router.py — Gemini Path       ║
║  ┌─────────────────────────┐  ║     ║  ┌──────────────────────────┐   ║
║  │ VideoReader             │  ║     ║  │ gemini-2.5-flash         │   ║
║  │ cv2.VideoCapture(mp4)   │  ║     ║  │ Zero-shot JSON prompt    │   ║
║  │ np.linspace(0, N, 32)   │  ║     ║  │ → department             │   ║
║  │ → 32 evenly-spaced      │  ║     ║  │ → sub_category           │   ║
║  │   BGR frames            │  ║     ║  │ → priority               │   ║
║  └────────────┬────────────┘  ║     ║  │ → escalation_required    │   ║
║               │               ║     ║  │ → estimated_resolution   │   ║
║  ② face_extractor.py          ║     ║  └──────────────┬───────────┘   ║
║  ┌─────────────────────────┐  ║     ║                 │ (if no API key)║
║  │ FaceExtractor (MTCNN)   │  ║     ║  ② router.py — Keyword Path      ║
║  │ Frame resized to 50%    │  ║     ║  ┌──────────────────────────┐   ║
║  │ MTCNN detects face bbox │  ║     ║  │ Multi-keyword scoring    │   ║
║  │ Face crop + 33% padding │  ║     ║  │ Count ALL keyword hits   │   ║
║  │ Scale bbox back to full │  ║     ║  │ per dept (not first-match│   ║
║  │ → face image per frame  │  ║     ║  │ → select highest scorer  │   ║
║  └────────────┬────────────┘  ║     ║  └──────────────┬───────────┘   ║
║               │               ║     ║                 │               ║
║  ③ classifier.py              ║     ║  ③ priority_validator.py         ║
║  ┌─────────────────────────┐  ║     ║  ┌──────────────────────────┐   ║
║  │ predict_on_video()      │  ║     ║  │ DistilBERT               │   ║
║  │ Resize face → 380×380   │  ║     ║  │ (mrigaanksh/civic-bert)  │   ║
║  │ Center-pad to square    │  ║     ║  │ title + description →    │   ║
║  │ Normalize (ImageNet)    │  ║     ║  │ tokenize → model →       │   ║
║  │                         │  ║     ║  │ softmax → [LOW/MED/HIGH] │   ║
║  │ EfficientNet-B7 x2:     │  ║     ║  │                          │   ║
║  │ model_0 → sigmoid → p0  │  ║     ║  │ If DistilBERT priority   │   ║
║  │ model_1 → sigmoid → p1  │  ║     ║  │ > Gemini priority        │   ║
║  │ mean([p0, p1])          │  ║     ║  │ → UPGRADE final priority │   ║
║  │                         │  ║     ║  │ (priority_upgraded=True) │   ║
║  │ confident_strategy():   │  ║     ║  └──────────────┬───────────┘   ║
║  │ >40% frames > 0.8 AND   │  ║     ║                 │               ║
║  │ >11 fake frames →       │  ║     ║  OUTPUT:        ▼               ║
║  │   mean of fake frames   │  ║     ║  department, sub_category,      ║
║  │ >90% frames < 0.2 →     │  ║     ║  priority, routing_reason,      ║
║  │   mean of clean frames  │  ║     ║  escalation_required,           ║
║  │ else → overall mean     │  ║     ║  estimated_resolution_days,     ║
║  └────────────┬────────────┘  ║     ║  distilbert_confidence          ║
║               │               ║     ╚════════════════════════════════╝
║  fake_probability: 0.0–1.0    ║
║                               ║
║  Verdict:                     ║
║  > 0.65 → AI_GENERATED        ║
║  < 0.35 → AUTHENTIC           ║
║  else   → INCONCLUSIVE        ║
║  no face→ INCONCLUSIVE        ║
╚═══════════════════════════════╝

          ▼ (same video, parallel path)

╔═══════════════════════════════════════════════════════════════╗
║   PIPELINE 3 — SCENE VISUAL DETECTION                         ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ① scene_analyzer.py — Frame Extraction                       ║
║  ┌──────────────────────────────────────────────────────┐    ║
║  │ _extract_sample_frames(video, n_frames=8)             │    ║
║  │ cv2.VideoCapture → total_frames                       │    ║
║  │ np.linspace(0, total-1, 8) → 8 evenly-spaced indices │    ║
║  │ cap.set(POS_FRAMES, idx) → cap.read() → BGR frame     │    ║
║  └────────────┬─────────────────────────────────────────┘    ║
║               │  8 BGR frames (numpy arrays)                  ║
║               │                                               ║
║               ├──────────────────┬──────────────────────────  ║
║               ▼                  ▼                            ║
║  ┌──────────────────────┐   ┌───────────────────────────┐    ║
║  │ YOLO12s (RDD2022)    │   │ TrashNet SigLIP            │    ║
║  │ _run_yolo_on_frame() │   │ _run_trash_on_frame()      │    ║
║  │                      │   │                            │    ║
║  │ Per frame:           │   │ Per frame:                 │    ║
║  │ model.predict(frame) │   │ processor(img)→tensors     │    ║
║  │ conf threshold: 0.30 │   │ model(**inputs)→logits     │    ║
║  │                      │   │ softmax → 6 class probs    │    ║
║  │ Each detection:      │   │ threshold: conf ≥ 0.60     │    ║
║  │ • class: D00/D10/    │   │                            │    ║
║  │   D20/D40/D44        │   │ Labels:                    │    ║
║  │ • confidence (0-1)   │   │ 0=cardboard 1=glass        │    ║
║  │ • bbox_area/         │   │ 2=metal     3=paper        │    ║
║  │   frame_area         │   │ 4=plastic   5=trash        │    ║
║  │   = coverage_pct     │   │                            │    ║
║  └──────────┬───────────┘   └─────────────┬─────────────┘    ║
║             └──────────────┬──────────────┘                   ║
║                            │  detections from all 8 frames    ║
║                            ▼                                   ║
║  ┌──────────────────────────────────────────────────────────┐ ║
║  │ Temporal Consistency Engine (NEW in v2.1)                 │ ║
║  │                                                           │ ║
║  │ frames_with_hits = count(frames that had ≥1 detection)   │ ║
║  │ temporal_consistency = frames_with_hits / 8              │ ║
║  │                                                           │ ║
║  │ ≥ 0.5 → PERSISTENT issue (pothole not an artefact)       │ ║
║  │ < 0.5 → ISOLATED (may be camera glare or shadow)        │ ║
║  │                                                           │ ║
║  │ dominant_class = most frequently detected class ID       │ ║
║  │ top_detection_confidence = max confidence across frames  │ ║
║  │ visual_priority = highest priority across all detections │ ║
║  └────────────────────────────────────────────────────────--┘ ║
╚═══════════════════════════════════════════════════════════════╝

          ▼

╔════════════════════════════════════════════════════════════════╗
║   TRUST SCORER — trust_scorer.py  (runs after all pipelines)  ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  trust_score (0–100)  "How credible is this report?"          ║
║  ┌──────────────────────────────────────────────────────────┐ ║
║  │ deepfake_score (weight 40%)                               │ ║
║  │   AUTHENTIC  → (1 - fake_prob) × 100 × conf_multiplier  │ ║
║  │   AI_GENERATED → max(5, (1-fake_prob) × 28)             │ ║
║  │   INCONCLUSIVE → 38 (neutral)                            │ ║
║  │                                                           │ ║
║  │ routing_score (weight 25%)                               │ ║
║  │   confidence == "AI"       → 90                          │ ║
║  │   confidence == "FALLBACK" → 60                          │ ║
║  │                                                           │ ║
║  │ scene_score (weight 35%)                                 │ ║
║  │   scene_detected → 55 + top_conf×35 + temporal×12       │ ║
║  │   no scene      → 48 (neutral, not penalised)            │ ║
║  │                                                           │ ║
║  │ trust_score = 0.40×deepfake + 0.25×routing + 0.35×scene │ ║
║  └──────────────────────────────────────────────────────────┘ ║
║                                                                ║
║  civic_urgency_score (0–100)  "How fast must govt respond?"   ║
║  ┌──────────────────────────────────────────────────────────┐ ║
║  │ Base: CRITICAL=88  HIGH=70  NORMAL=48  LOW=20            │ ║
║  │                                                           │ ║
║  │ Bonuses:                                                  │ ║
║  │   escalation_required        → +8                        │ ║
║  │   visual_severity == HIGH    → +8                        │ ║
║  │   visual_severity == MEDIUM  → +4                        │ ║
║  │   priority_upgraded (bert)   → +5                        │ ║
║  │   temporal_consistency ≥ 0.5 → +6  (persistent issue)   │ ║
║  │   real face + AUTHENTIC      → +4  (witnessed event)     │ ║
║  │                                                           │ ║
║  │ Penalty:                                                  │ ║
║  │   AI_GENERATED verdict       → -35                       │ ║
║  └──────────────────────────────────────────────────────────┘ ║
╚════════════════════════════════════════════════════════════════╝

          ▼

╔══════════════════════════════════════════════════════════════════╗
║   FINAL RESPONSE  (Pipeline 4 /full-analysis)                    ║
╠══════════════════════════════════════════════════════════════════╣
║  verdict, fake_probability, confidence_level  ← Pipeline 1      ║
║  department, sub_category, routing_reason      ← Pipeline 2      ║
║  priority = MAX(routing_priority, visual_priority)  ← P2 + P3   ║
║  estimated_resolution_days, escalation_required                  ║
║  scene_detected, detected_issues, temporal_consistency ← P3     ║
║  dominant_class, top_detection_confidence                        ║
║  trust_score, civic_urgency_score            ← trust_scorer.py  ║
║  processing_time_ms                                              ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## 🔍 What Each File Does

| File | Role | Key function |
|---|---|---|
| `video_reader.py` | Frame extraction | `read_frames()` — cv2 linspace sampling from any video format |
| `face_extractor.py` | Face detection | MTCNN detects faces per frame, crops with padding |
| `model_loader.py` | Weight loading | Loads 2× EfficientNet-B7 `.pt` files at startup |
| `classifier.py` | Deepfake prediction | `predict_on_video()` + `confident_strategy()` ensemble aggregation |
| `router.py` | Department routing | Gemini zero-shot → DistilBERT cross-check → multi-keyword fallback |
| `priority_validator.py` | Priority upgrade | DistilBERT independently scores urgency, upgrades if higher than Gemini |
| `scene_analyzer.py` | Visual detection | YOLO + TrashNet per-frame, temporal consistency engine |
| `trust_scorer.py` | Signal fusion | Combines all pipeline outputs → trust_score + civic_urgency_score |
| `schemas.py` | API contracts | Pydantic models for all 7 endpoints |
| `main.py` | FastAPI app | Routes, lifespan model loading, pipeline orchestration |

---

## 🧠 Pipeline 5 — Predictive Hotspot Analysis

> Addresses **"Predictive Insights"** from the problem statement directly.

```
POST /predict-hotspot
{
  "lat": 12.9716, "lng": 77.5946, "radius_km": 2.0,
  "recent_reports": [
    {"department": "CONSTRUCTION", "priority": "HIGH", "routing_reason": "..."},
    {"department": "CONSTRUCTION", "priority": "NORMAL", "routing_reason": "..."},
    {"department": "SANITATION",   "priority": "NORMAL", "routing_reason": "..."}
  ]
}

Flow:
  ① Priority-weighted scoring across all recent reports
     risk_score = avg_weight × 10 + min(report_count × 3, 60)

  ② Gemini 2.5-flash trend analysis (if API key + ≥2 reports)
     → urban pattern identification
     → predicted next emerging civic issue
     → specific department action recommendation

  ③ hotspot_likelihood = HIGH (≥60) | MEDIUM (≥35) | LOW (<35)
```

Response:
```json
{
  "hotspot_likelihood": "HIGH",
  "risk_score": 72.0,
  "dominant_category": "CONSTRUCTION",
  "predicted_next_issue": "Road deterioration as monsoon season approaches.",
  "analysis": "Recurring CONSTRUCTION issues suggest systematic road degradation.",
  "recommended_action": "Dispatch PWD field team for area survey.",
  "report_count": 3,
  "confidence": "AI"
}
```

---

## ⚡ Pipeline 6 — Quick Image Validate

> Mobile-first pre-submission check — runs in ~600ms vs ~7s for full video.

```
POST /validate-report  (image JPG/PNG or video — extracts 1 frame)

  ① scene_analyzer._extract_sample_frames(n=1) or analyze_frame_bytes()
  ② YOLO + TrashNet on single frame
  ③ trust_scorer computes lightweight trust_score
  → instant civic issue feedback to citizen before submission
```

---

## 💵 Pipeline 7 — Counterfeit Currency Detection

> ET PS "Counterfeit Currency Identification Agent" requirement — microprint, security thread, serial-number pattern, and UV feature checks, exactly as specified.

```
POST /classify-currency  (note photo JPG/PNG, optional capture_mode=uv)

  ① CNN (EfficientNet-B0, trained) — learned real/fake signal
  ② security-thread band detection (classical CV)
  ③ microprint sharpness — Laplacian variance (classical CV)
  ④ print-noise profile — inkjet/laser dot pattern (classical CV)
  ⑤ serial-number ascending-numeral check — RBI's documented telescopic-
     numbering feature, via EasyOCR + column ink-height profiling
  ⑥ UV fluorescence — only runs if capture_mode="uv" with a UV-lit photo;
     otherwise returns not_applicable (never fakes a UV verdict)
  → CNN + heuristics agree: confident verdict. Disagree: INCONCLUSIVE.
```

**Trained on 6 merged public INR datasets** (Kaggle, T4 GPU, `kaggle_train_currency.ipynb`), perceptual-hash deduplicated, held-out test set never touched during training:

| Metric | Score | | Denomination | Accuracy (n) |
|---|---|---|---|---|
| Overall accuracy | **98.67%** | | ₹10 | 99.2% (378) |
| Fake precision | 96.39% | | ₹20 / ₹50 / ₹100 / ₹200 | 100% (88–146) |
| Fake recall | 98.16% | | ₹500 | 99.1% (220) |
| AUC | 0.998 | | ₹2000 | 89.4% (47) — thinnest test sample |

Full breakdown in `Classifier/weights/currency/eval_report.json`. No trustworthy pretrained INR-counterfeit model exists publicly (checked HF Hub + GitHub) — this is a from-scratch training run, not a fine-tune of an existing model.

---

## 🏆 Key USPs

| # | USP | Why it matters |
|---|---|---|
| 1 | **Deepfake guard on civic reports** | Only civic platform running AI video forensics — blocks misinformation before it spreads |
| 2 | **Dual-model priority consensus** | Gemini + DistilBERT both score urgency independently; higher score wins — catches underestimated incidents |
| 3 | **Temporal consistency detection** | Distinguishes persistent potholes (real) from camera artefacts (false positive) — reduces noise in the system |
| 4 | **Unified trust score** | A single 0-100 number lets department dashboards auto-prioritise without reading AI outputs manually |
| 5 | **Sub-category routing** | `pothole` vs `building_collapse` — both CONSTRUCTION, but wildly different urgency. Gemini resolves this. |
| 6 | **Predictive hotspot endpoint** | Moves government response from reactive to proactive — areas with repeat reports get predicted risk scores |
| 7 | **3-layer fallback** | Gemini fails → multi-keyword scoring → default route. Never returns an error to the citizen. |

---

## 🔧 Models Used

| Model | Source | Size | Purpose |
|---|---|---|---|
| EfficientNet-B7 NS (×2) | [selimsef/dfdc_deepfake_challenge](https://github.com/selimsef/dfdc_deepfake_challenge) | ~267MB ×2 | Deepfake detection |
| MTCNN | facenet-pytorch | Built-in | Face detection |
| Gemini 2.5-flash | Google AI | API | Dept routing + hotspot (env-overridable via `GEMINI_MODEL`) |
| DistilBERT civic | [mrigaanksh/priority-classification-distilbert](https://huggingface.co/mrigaanksh/priority-classification-distilbert) | ~268MB | Priority validation |
| YOLO12s RDD2022 | [rezzzq/yolo12s-road-damage-rdd2022](https://huggingface.co/rezzzq/yolo12s-road-damage-rdd2022) | ~19MB | Road damage detection |
| TrashNet SigLIP | [prithivMLmods/Trash-Net](https://huggingface.co/prithivMLmods/Trash-Net) | ~372MB | Waste classification |
| EfficientNet-B0 (currency) | Trained in-house — `kaggle_train_currency.ipynb` | ~16MB | Counterfeit INR screening — 98.67% test accuracy (n=1,352) on 6 merged public datasets |
| EasyOCR | JaidedAI/EasyOCR | ~64MB | Serial-number ascending-numeral security check |

---

## 📋 API Examples

### Full Analysis (Recommended — all pipelines in one call)
```bash
curl -X POST https://hikity-kawach-classifier.hf.space/full-analysis \
  -F "file=@incident.mp4" \
  -F "title=Large pothole blocking half the road" \
  -F "description=3-foot pothole near MG Road metro exit, vehicles swerving into oncoming lane" \
  -F "category=Infrastructure"
```
```json
{
  "verdict": "AUTHENTIC",
  "fake_probability": 0.09,
  "confidence_level": "HIGH",
  "department": "CONSTRUCTION",
  "sub_category": "pothole",
  "priority": "HIGH",
  "escalation_required": false,
  "estimated_resolution_days": 10,
  "routing_confidence": "AI",
  "distilbert_confidence": 0.88,
  "priority_upgraded": false,
  "scene_detected": true,
  "detected_issues": ["Pothole (87%)", "Alligator Crack (73%)"],
  "temporal_consistency": 0.75,
  "dominant_class": "D40",
  "visual_priority": "HIGH",
  "visual_severity": "HIGH",
  "trust_score": 81.2,
  "civic_urgency_score": 84.0,
  "processing_time_ms": 7820.0
}
```

### Department Routing Only
```bash
curl -X POST https://hikity-kawach-classifier.hf.space/route \
  -H "Content-Type: application/json" \
  -d '{"title":"Burst pipe flooding road","description":"Water gushing since morning","category":"Infrastructure"}'
```
```json
{
  "department": "WATER",
  "sub_category": "pipe_burst",
  "priority": "HIGH",
  "escalation_required": true,
  "estimated_resolution_days": 5,
  "confidence": "AI",
  "distilbert_confidence": 0.91,
  "trust_score": 79.3,
  "civic_urgency_score": 83.0
}
```

### Quick Image Validate
```bash
curl -X POST https://hikity-kawach-classifier.hf.space/validate-report \
  -F "file=@road_photo.jpg"
```
```json
{
  "scene_detected": true,
  "detected_issues": ["Pothole (83%)"],
  "suggested_dept": "CONSTRUCTION",
  "visual_priority": "HIGH",
  "processing_time_ms": 618.0,
  "trust_score": 69.4
}
```

### Health Check
```bash
curl https://hikity-kawach-classifier.hf.space/health
```
```json
{
  "status": "ok",
  "models_loaded": 2,
  "scene_models_loaded": 2,
  "priority_validator_loaded": true,
  "device": "cpu",
  "pipelines_active": 6,
  "version": "2.1.0"
}
```

---

## 🔐 Environment Variables

| Secret | Required | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | Recommended | Enables Gemini AI routing (Pipeline 2) and hotspot analysis (Pipeline 5). Without it, both fall back to keyword/statistical modes. |

Set in: **HF Space → Settings → Variables and Secrets**

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| API Framework | FastAPI + Uvicorn (port 7860) |
| Container | Docker on Python 3.10-slim |
| Host | Hugging Face Spaces (CPU Basic) |
| Deepfake Detection | PyTorch · EfficientNet-B7 · MTCNN (facenet-pytorch) |
| LLM Routing + Hotspot | Google Gemini 2.5-flash |
| Priority Validation | DistilBERT (HuggingFace Transformers) |
| Road Damage | YOLO12s (Ultralytics) |
| Waste Classification | SigLIP (HuggingFace Transformers) |
| CV / Frame Extraction | OpenCV (cv2) |
| Image Processing | Pillow · NumPy · Albumentations |
