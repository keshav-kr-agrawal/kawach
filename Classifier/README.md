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

> **AI microservice for the KAWACH Hyperlocal Problem Solver platform**
> Solving the problem statement: *"Build a platform that enables citizens to identify, report, validate, track, and resolve community issues through collaboration, data, and intelligent automation."*

---

## ⚡ Live Endpoints

| Endpoint | Pipeline | Description |
|---|---|---|
| `GET /health` | System | Health check — all model statuses |
| `POST /classify` | Pipeline 1 | Deepfake / AI-video forensic detection |
| `POST /route` | Pipeline 2 | Civic department routing with dual-model AI |
| `POST /analyze-scene` | Pipeline 3 | Visual issue detection (pothole, waste) |
| `POST /full-analysis` | Pipeline 4 | All 3 pipelines in a single call |

---

## 🧠 AI Architecture — 3 Pipelines

### Pipeline 1 — Deepfake Forensic Detection
- **Model:** EfficientNet-B7 (Noisy Student) ensemble x2
- **Face Detector:** MTCNN from facenet-pytorch
- **Source:** [selimsef/dfdc_deepfake_challenge](https://github.com/selimsef/dfdc_deepfake_challenge)
- **Process:** Extracts 32 evenly-spaced frames → MTCNN detects faces → EfficientNet ensemble classifies each face → Confident Strategy aggregation
- **Output:** `AUTHENTIC | AI_GENERATED | INCONCLUSIVE` + fake probability + confidence level

### Pipeline 2 — Civic Department Routing (Dual-Model Consensus)
- **Primary:** Google Gemini 1.5-flash (zero-shot classification)
- **Validator:** DistilBERT fine-tuned on civic issue reports ([mrigaanksh/priority-classification-distilbert](https://huggingface.co/mrigaanksh/priority-classification-distilbert))
- **Fallback:** 10-department keyword matcher (offline, no API needed)
- **Departments:** POLICE · TRAFFIC · WATER · ELECTRICITY · SANITATION · FIRE · HEALTH · CONSTRUCTION · ENVIRONMENT · REVENUE
- **Output:** Department + routing reason + priority (validated by 2 models) + escalation flag

### Pipeline 3 — Scene Visual Issue Detection
- **Road Damage:** YOLO12s trained on RDD2022 dataset ([rezzzq/yolo12s-road-damage-rdd2022](https://huggingface.co/rezzzq/yolo12s-road-damage-rdd2022))
  - Detects: Potholes · Longitudinal cracks · Transverse cracks · Alligator cracks
- **Waste Detection:** TrashNet SigLIP ([prithivMLmods/Trash-Net](https://huggingface.co/prithivMLmods/Trash-Net))
  - Classifies: Cardboard · Glass · Metal · Paper · Plastic · General Trash
- **Process:** Samples 6 frames from video → runs both models → aggregates civic dept suggestion
- **Output:** Detected issues list + visual priority + suggested department

### Pipeline 4 — Unified Full Analysis
- Runs all 3 pipelines on a single video upload
- Cross-validates visual priority with text routing priority
- Returns comprehensive analysis JSON for the KAWACH frontend

---

## 🛡️ Key USPs (Unique Selling Points)

1. **Video Authenticity Guard:** Only civic app using deepfake detection on citizen reports — prevents misinformation
2. **Dual-Model Priority Consensus:** Gemini + DistilBERT both score priority; the higher score wins — catches underestimated incidents
3. **Visual Issue Corroboration:** YOLO confirms what the citizen described (pothole reported → pothole detected)
4. **3-Layer Fallback Architecture:** AI fails → keyword match → default category. Never crashes.
5. **Single-Call Full Analysis:** Frontend calls `/full-analysis` once and gets deepfake check + department routing + visual evidence in one response

---

## 🔧 Environment Variables (Secrets)

Set in Hugging Face Space → Settings → Variables and Secrets:

| Secret | Required | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | Recommended | Enables Gemini AI routing. Without it, falls back to keyword matching. |

---

## 📡 API Usage Examples

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
  "device": "cpu"
}
```

### Deepfake Check
```bash
curl -X POST https://hikity-kawach-classifier.hf.space/classify \
  -F "file=@incident_video.mp4"
```

### Department Routing
```bash
curl -X POST https://hikity-kawach-classifier.hf.space/route \
  -H "Content-Type: application/json" \
  -d '{"title":"Burst pipe flooding road","description":"Water gushing since morning","category":"Infrastructure"}'
```
```json
{
  "department": "WATER",
  "department_name": "Water Supply Authority",
  "routing_reason": "Report describes a burst water pipe causing street flooding.",
  "priority": "HIGH",
  "escalation_required": true,
  "confidence": "AI",
  "distilbert_priority": "HIGH",
  "priority_upgraded": false,
  "distilbert_confidence": 0.91
}
```

### Scene Analysis
```bash
curl -X POST https://hikity-kawach-classifier.hf.space/analyze-scene \
  -F "file=@road_video.mp4"
```
```json
{
  "scene_detected": true,
  "scene_summary": "Detected 3 road damage instance(s) and 0 waste instance(s) in video frames.",
  "detected_issues": ["Pothole (87%)", "Alligator Crack (72%)"],
  "frames_sampled": 6,
  "road_detections": 3,
  "waste_detections": 0,
  "suggested_dept": "CONSTRUCTION",
  "visual_priority": "HIGH",
  "visual_severity": "HIGH"
}
```

---

## 🏗️ Tech Stack

| Component | Technology |
|---|---|
| API Framework | FastAPI + Uvicorn |
| Deepfake Detection | PyTorch · EfficientNet-B7 · MTCNN |
| LLM Routing | Google Gemini 1.5-flash |
| Priority Validation | DistilBERT (Transformers) |
| Road Damage | YOLO12s (Ultralytics) |
| Waste Classification | SigLIP (Transformers) |
| Container | Docker on Python 3.10-slim |
| Host | Hugging Face Spaces (CPU) |
