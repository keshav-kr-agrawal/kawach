---
title: KAWACH AI Video Classifier
emoji: 🛡️
colorFrom: yellow
colorTo: blue
sdk: docker
app_port: 7860
---

# KAWACH AI Video Classifier

This microservice acts as the Deepfake and AI Video detection layer of the KAWACH Citizen Portal. It is adapted from the state-of-the-art DFDC (Deepfake Detection Challenge) winning solution by Selim Seferbekov.

## Features
- **MTCNN Face Extraction**: Extracts face crops from sampled frames using MTCNN with CUDA acceleration if available.
- **EfficientNet-B7 Backbone**: Core neural network classifying frame crops.
- **Confident Aggregation Strategy**: Special frame aggregation strategy where high-confidence frame predictions dictate the video-level verdict.
- **FastAPI Endpoints**: Fast and structured REST API with CORS support.

## Getting Started

### 1. Prerequisites
- Python 3.9 or higher
- NVIDIA GPU with CUDA support (strongly recommended for performance, but CPU mode is fully supported)

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Download Model Weights
Run the following script to download the pre-trained checkpoints (approx. 600MB):
```bash
python download_weights.py
```

### 4. Run the Service
Run the service using Uvicorn:
```bash
uvicorn app.main:app --port 8001 --reload
```

## API Documentation

### GET `/health`
Check if the microservice and its models are initialized.

**Response:**
```json
{
  "status": "ok",
  "models_loaded": 2,
  "device": "cuda"
}
```

### POST `/classify`
Submit a video file for deepfake and AI detection.

**Request Form-Data:**
- `file`: The video file (`.mp4`, `.avi`, `.mov`, etc.)

**Response:**
```json
{
  "verdict": "AI_GENERATED",
  "fake_probability": 0.914,
  "confidence_level": "HIGH",
  "faces_detected": 18,
  "frames_analyzed": 32,
  "processing_time_ms": 4200.5,
  "model_count": 2
}
```

#### Verdict Thresholds:
- `fake_probability > 0.65` -> `AI_GENERATED`
- `fake_probability < 0.35` -> `AUTHENTIC`
- `0.35 <= fake_probability <= 0.65` -> `INCONCLUSIVE` (Also `INCONCLUSIVE` if no faces are detected)

#### Confidence Levels:
- `HIGH`: probability > 0.85 or < 0.15
- `MEDIUM`: probability > 0.65 or < 0.35
- `LOW`: otherwise
