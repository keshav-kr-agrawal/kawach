# KAWACH — Full System Architecture & Pipeline Reference

> **Project:** KAWACH — AI-Driven Community Incident Reporting App (India)
> **Last Updated:** June 2026 · v2.1
> **Status:** Production-Ready ✅ — 6 AI Pipelines / Endpoints Live

---

## Table of Contents
1. [System Overview](#1-system-overview)
2. [Tech Stack at a Glance](#2-tech-stack-at-a-glance)
3. [Service Breakdown](#3-service-breakdown)
4. [Pipeline 1 — Deepfake Detection](#4-pipeline-1--deepfake-detection)
5. [Pipeline 2 — Civic Department Routing](#5-pipeline-2--civic-department-routing)
6. [Pipeline 3 — Scene Visual Issue Detection](#6-pipeline-3--scene-visual-issue-detection)
7. [Pipeline 4 — Unified Full Analysis](#7-pipeline-4--unified-full-analysis)
8. [Pipeline 5 — Predictive Hotspot Analysis ⭐ NEW](#8-pipeline-5--predictive-hotspot-analysis)
9. [Pipeline 6 — Quick Image Validate ⭐ NEW](#9-pipeline-6--quick-image-validate)
10. [Trust Score & Civic Urgency Score ⭐ KEY USP](#10-trust-score--civic-urgency-score)
11. [End-to-End Report Submission Flow](#11-end-to-end-report-submission-flow)
12. [Video Status State Machine](#12-video-status-state-machine)
13. [Database Schema Reference](#13-database-schema-reference)
14. [API Endpoint Reference](#14-api-endpoint-reference)
15. [Environment Variables Reference](#15-environment-variables-reference)
16. [Department Routing Logic](#16-department-routing-logic)
17. [Deployment Checklist](#17-deployment-checklist)

---

## 1. System Overview

KAWACH is a civic incident reporting Progressive Web App (PWA) that allows Indian citizens to:
- Record and report incidents (crime, infrastructure damage, environmental hazards, etc.)
- **[Pipeline 1]** Automatically verify the video for AI manipulation (deepfake detection)
- **[Pipeline 2]** Automatically route the report to the correct government department (Gemini + DistilBERT dual-model consensus) with sub-category precision and estimated resolution time
- **[Pipeline 3]** Visually detect civic issues in video frames with **temporal consistency tracking** (pothole, road cracks, waste/garbage)
- **[Pipeline 4]** Run all three pipelines in one unified call for maximum efficiency
- **[Pipeline 5 — NEW]** Predict civic hotspots from geographic report patterns using Gemini + statistical fusion
- **[Pipeline 6 — NEW]** Quickly validate a single image before full submission (lightweight, mobile-optimised)
- Every response now includes a **trust_score** (0–100) and **civic_urgency_score** (0–100)

The system is entirely **serverless** and built on PaaS/SaaS platforms — no dedicated backend server needed.

```
[Citizen's Phone]
      │
      ▼
[Vercel Frontend (React PWA)]
      │
      ├──► [Cloudinary] ──────────────────► (Video Storage & Delivery CDN)
      │
      ├──► [HuggingFace /classify] ────────► (Pipeline 1: EfficientNet-B7 + MTCNN deepfake)
      │
      ├──► [HuggingFace /route] ───────────► (Pipeline 2: Gemini LLM + DistilBERT priority)
      │
      ├──► [HuggingFace /analyze-scene] ──► (Pipeline 3: YOLO road damage + TrashNet waste)
      │
      ├──► [HuggingFace /full-analysis] ──► (Pipeline 4: All 3 in one call + trust scoring)
      │
      ├──► [HuggingFace /predict-hotspot]─► (Pipeline 5: Geographic pattern + Gemini trend AI)
      │
      ├──► [HuggingFace /validate-report]─► (Pipeline 6: Single-frame quick civic scan)
      │
      └──► [Supabase PostgreSQL] ──────────► (Persistent Report Storage)
```

---

## 2. Tech Stack at a Glance

| Layer               | Technology                     | Purpose                                                  |
|---------------------|--------------------------------|----------------------------------------------------------|
| Frontend            | React + Vite (JSX)             | PWA Citizen App UI                                       |
| UI Styling          | CSS-in-JS (inline styles)      | Dark-mode premium civic design                           |
| Frontend Host       | Vercel                         | Global CDN, HTTPS, CI/CD                                 |
| Video Upload        | Cloudinary                     | Secure video upload, CDN delivery                        |
| AI Microservice     | Hugging Face Spaces            | FastAPI server for 6 AI pipelines                        |
| Deepfake Model      | EfficientNet-B7 + MTCNN        | Frame-level face forensics (Pipeline 1)                  |
| LLM Dispatcher      | Google Gemini 1.5-flash        | Zero-shot civic routing + hotspot prediction (P2, P5)    |
| Priority Validator  | DistilBERT (civic fine-tuned)  | Dual-model priority consensus (Pipeline 2)               |
| Road Damage Model   | YOLO12s (RDD2022)              | Pothole & crack detection with bbox coverage (Pipeline 3)|
| Waste Classifier    | TrashNet SigLIP                | Garbage & waste detection (Pipeline 3)                   |
| Trust Engine        | Custom fusion logic            | trust_score + civic_urgency_score across all pipelines   |
| Database            | Supabase (PostgreSQL)          | Report persistence with RLS                              |
| State Management    | React useState/useEffect       | Local optimistic UI state                                |
| Router Framework    | React Router v6                | Multi-page navigation                                    |
| Animation           | Framer Motion                  | Page transitions, micro-animations                       |

---

## 3. Service Breakdown

### 3.1 Vercel — Frontend Host

**URL:** `https://kawach.vercel.app`
**Repository Root:** `user/` (Vite React project)

**Build Configuration:**
- **Framework:** Vite · **Build Command:** `npm run build` · **Output Directory:** `dist` · **Root Directory:** `user/`

### 3.2 Cloudinary — Video CDN

Handles video transcoding, adaptive bitrate, and CDN delivery for `LocalReelsFeedView`.

### 3.3 Hugging Face Spaces — AI Microservice

**Space URL:** `https://hikity-kawach-classifier.hf.space`
**Space Repo:** `https://huggingface.co/spaces/Hikity/kawach-classifier`
**Runtime:** Docker (Python 3.10-slim) · **Framework:** FastAPI + Uvicorn · **Port:** `7860`

**Classifier Directory:** `Classifier/` — separate Git repo pushed to HF Spaces

**Files:**
```
Classifier/
├── Dockerfile
├── requirements.txt
├── download_weights.py
└── app/
    ├── main.py             # FastAPI — 6 endpoints
    ├── schemas.py          # Pydantic models (all pipelines)
    ├── classifier.py       # EfficientNet-B7 ensemble deepfake prediction
    ├── face_extractor.py   # MTCNN face detection + cropping
    ├── model_loader.py     # EfficientNet-B7 weight loader
    ├── router.py           # Gemini + multi-keyword scored fallback routing
    ├── scene_analyzer.py   # YOLO + TrashNet with temporal consistency
    ├── priority_validator.py # DistilBERT priority cross-checker
    ├── trust_scorer.py     # ★ NEW: Unified trust + urgency scoring engine
    └── video_reader.py     # Frame extraction from video files
```

### 3.4 Google Gemini — LLM Dispatcher

**Model:** `gemini-2.5-flash` · **SDK:** `google-generativeai`

Used for:
1. Zero-shot civic department classification with sub-category and resolution estimate (Pipeline 2)
2. Geographic trend analysis for hotspot prediction (Pipeline 5)

**Fallback Chain (Pipeline 2):**
```
Gemini API available?
    YES → Zero-shot AI classification with sub_category + estimated_resolution_days
    NO  → Multi-keyword SCORED matching (all keyword hits counted, not just first match)
    KEYWORD MISS → Default to SANITATION/NORMAL
```

**Fallback Chain (Pipeline 5):**
```
Gemini API available AND >= 2 reports?
    YES → Deep Gemini trend analysis
    NO  → Weighted statistical scoring (priority-weighted report volume)
```

### 3.5 Supabase — Database

**Type:** PostgreSQL (managed) · **SDK:** `@supabase/supabase-js` v2

---

## 4. Pipeline 1 — Deepfake Detection

**Goal:** Verify that a submitted video is not AI-generated or digitally manipulated.

### Flow Diagram
```
[Citizen Records Video]
        │
        ▼
[SecureCameraView.jsx]
        │ POST multipart/form-data
        ▼
[HF Space: POST /classify]
        │
        ├─► [VideoReader] → Extract 32 evenly-spaced frames from video
        │
        ├─► [FaceExtractor (MTCNN)] → Detect & crop faces from each frame
        │
        └─► [Classifier (EfficientNet-B7 ensemble)]
                │
                ▼
        fake_probability: 0.0 → 1.0
        verdict: AUTHENTIC | AI_GENERATED | INCONCLUSIVE
        trust_score: 0 → 100
        civic_urgency_score: 0 → 100
```

### Verdict Logic
| fake_probability | Verdict         | Notes                                     |
|-----------------|-----------------|-------------------------------------------|
| > 0.65          | `AI_GENERATED`  | High chance of manipulation               |
| < 0.35          | `AUTHENTIC`     | Likely genuine footage                    |
| 0.35 – 0.65     | `INCONCLUSIVE`  | Borderline, needs further review          |
| (no faces)      | `INCONCLUSIVE`  | Cannot classify without facial features   |

### API Response
```json
{
  "verdict": "AUTHENTIC",
  "fake_probability": 0.12,
  "confidence_level": "HIGH",
  "faces_detected": 3,
  "frames_analyzed": 32,
  "processing_time_ms": 4520.0,
  "model_count": 2,
  "trust_score": 82.4,
  "civic_urgency_score": 52.0
}
```

---

## 5. Pipeline 2 — Civic Department Routing

**Goal:** Route the citizen report to the correct government department with sub-category precision and estimated resolution time.

### What's New in v2.1
- **`sub_category`**: Fine-grained routing (e.g., `pothole` vs `building_collapse` — both CONSTRUCTION)
- **`estimated_resolution_days`**: AI-predicted resolution SLA (1–30 days)
- **Multi-keyword scored fallback**: Counts all matching keywords per department, selects highest-scoring one — much more accurate than previous first-match
- **43 more keywords** across all 10 departments covering Indian civic context

### Flow Diagram
```
[Report Title + Description + Category]
        │
        ▼
[routeReport() in routingService.js]
        │ POST application/json
        ▼
[HF Space: POST /route]
        │
        ├──► [Gemini 1.5-flash] — zero-shot JSON classification
        │       ↓ returns: department, sub_category, priority,
        │                  escalation_required, estimated_resolution_days
        │
        ├──► [DistilBERT] — independent priority cross-check
        │       ↓ if DistilBERT priority > Gemini → upgrade final priority
        │
        └──► [trust_scorer] — compute trust_score + civic_urgency_score
                ↓
        DeptRoutingResponse with all fields merged
```

### API Response
```http
POST https://hikity-kawach-classifier.hf.space/route
```
```json
{
  "department": "WATER",
  "department_name": "Water Supply Authority",
  "sub_category": "pipe_burst",
  "routing_reason": "Report describes a burst water pipe causing street flooding.",
  "priority": "HIGH",
  "escalation_required": true,
  "confidence": "AI",
  "estimated_resolution_days": 5,
  "distilbert_priority": "HIGH",
  "priority_upgraded": false,
  "distilbert_confidence": 0.91,
  "trust_score": 79.3,
  "civic_urgency_score": 83.0
}
```

---

## 6. Pipeline 3 — Scene Visual Issue Detection

**Goal:** Visually detect civic infrastructure problems directly in video frames.

### What's New in v2.1
- **Temporal consistency score** (`temporal_consistency: 0.0–1.0`): fraction of sampled frames where detections appear. ≥ 0.5 = persistent issue, not isolated artefact → increases urgency
- **Bounding box coverage** (`coverage_pct`): detected area as % of frame size — larger = more severe
- **`dominant_class`**: most frequently detected issue class across all frames (e.g., `D40` = Pothole)
- **`top_detection_confidence`**: peak model confidence, used in trust score fusion
- **8 frames sampled** (up from 6) for better temporal coverage
- **Actionable scene summaries**: summary text updated to recommend immediate escalation for HIGH priority

### Models
| Model           | Input         | Detects                              |
|-----------------|---------------|--------------------------------------|
| YOLO12s (RDD2022) | Video frames | Potholes (D40), Alligator cracks (D20), Longitudinal/Transverse cracks (D00/D10), Repaired potholes (D44) |
| TrashNet SigLIP | Video frames  | Cardboard, Glass, Metal, Paper, Plastic, Trash/Garbage |

### API Response
```json
{
  "scene_detected": true,
  "scene_summary": "Detected 3 road damage instance(s) in video frames. Dominant issue: Pothole. Issue persists across multiple frames — consistent physical problem requiring prompt attention. Recommend immediate escalation.",
  "detected_issues": ["Pothole (87%)", "Alligator Crack (72%)"],
  "frames_sampled": 8,
  "road_detections": 3,
  "waste_detections": 0,
  "suggested_dept": "CONSTRUCTION",
  "visual_priority": "HIGH",
  "visual_severity": "HIGH",
  "temporal_consistency": 0.625,
  "dominant_class": "D40",
  "top_detection_confidence": 0.87,
  "trust_score": 74.1,
  "civic_urgency_score": 78.0
}
```

---

## 7. Pipeline 4 — Unified Full Analysis

**Goal:** Run all three AI pipelines in one HTTP call for maximum efficiency. Produces a comprehensive analysis package.

### Signal Fusion
```
Pipeline 1 (deepfake)  ──┐
Pipeline 2 (routing)   ──┼──► trust_scorer.py ──► trust_score + civic_urgency_score
Pipeline 3 (scene)     ──┘

Final priority = MAX(routing_priority, visual_priority)
```

### API Request
```http
POST /full-analysis
Content-Type: multipart/form-data

file: <video_binary>
title: "Pothole on MG Road near metro exit"
description: "Large pothole causing vehicles to swerve. No warning sign."
category: "Infrastructure"
```

### API Response (key fields)
```json
{
  "verdict": "AUTHENTIC",
  "department": "CONSTRUCTION",
  "sub_category": "pothole",
  "priority": "HIGH",
  "estimated_resolution_days": 10,
  "scene_detected": true,
  "temporal_consistency": 0.75,
  "dominant_class": "D40",
  "trust_score": 81.2,
  "civic_urgency_score": 84.0,
  "processing_time_ms": 7820.0
}
```

---

## 8. Pipeline 5 — Predictive Hotspot Analysis

> **⭐ NEW in v2.1 — Addresses "Predictive Insights" from the problem statement**

**Goal:** Predict civic infrastructure hotspots from the geographic pattern of recent reports. Enables proactive government response before issues escalate.

**Endpoint:** `POST /predict-hotspot`

### Flow Diagram
```
[lat, lng, radius_km, recent_reports[]]
        │
        ▼
[Statistical Baseline]
        ├── Priority-weighted score per department
        ├── risk_score = avg_weight × 10 + volume_contribution
        └── hotspot_likelihood: HIGH ≥ 60, MEDIUM ≥ 35, LOW < 35

        │ (if GEMINI_API_KEY and ≥ 2 reports)
        ▼
[Gemini 1.5-flash Trend Analysis]
        ├── Urban pattern identification
        ├── Predicted next emerging issue
        └── Specific department action recommendation
```

### API Request
```http
POST https://hikity-kawach-classifier.hf.space/predict-hotspot
Content-Type: application/json

{
  "lat": 12.9716,
  "lng": 77.5946,
  "radius_km": 2.0,
  "recent_reports": [
    {"department": "CONSTRUCTION", "priority": "HIGH", "routing_reason": "Road crack near school"},
    {"department": "CONSTRUCTION", "priority": "NORMAL", "routing_reason": "Pothole flooding"},
    {"department": "SANITATION", "priority": "NORMAL", "routing_reason": "Garbage dump near market"}
  ]
}
```

### API Response
```json
{
  "hotspot_likelihood": "HIGH",
  "risk_score": 72.0,
  "dominant_category": "CONSTRUCTION",
  "predicted_next_issue": "Further road deterioration as monsoon season approaches.",
  "analysis": "Recurring CONSTRUCTION issues around this corridor suggest systematic road degradation. Combined with SANITATION stress, area shows multi-department civic strain.",
  "recommended_action": "Dispatch PWD field team for area survey and initiate emergency road patching schedule.",
  "report_count": 3,
  "confidence": "AI"
}
```

### Why This Wins
- Directly addresses **"Predictive Insights"** from the problem statement
- Enables **proactive government response** instead of reactive complaint handling
- Gemini identifies **cross-issue dependencies** (e.g., drainage issues predicting road damage)
- Statistical fallback ensures it works **without API key**

---

## 9. Pipeline 6 — Quick Image Validate

> **⭐ NEW in v2.1 — Mobile-first rapid civic scan**

**Goal:** Let citizens do a fast pre-submission civic issue check from a single photo or video still. Much lighter than full video analysis.

**Endpoint:** `POST /validate-report`

### Why This Matters
- Citizens can **instantly verify** their photo shows a real civic issue before submitting
- Reduces false/irrelevant report submissions
- Works with **images** (JPG/PNG) and **videos** (extracts 1 representative frame)
- Returns `trust_score` so citizens see authenticity feedback in real-time

### API Request
```http
POST /validate-report
Content-Type: multipart/form-data

file: <image.jpg>
```

### API Response
```json
{
  "scene_detected": true,
  "detected_issues": ["Pothole (83%)", "Alligator Crack (71%)"],
  "road_detections": 2,
  "waste_detections": 0,
  "suggested_dept": "CONSTRUCTION",
  "visual_priority": "HIGH",
  "processing_time_ms": 620.0,
  "trust_score": 69.4
}
```

---

## 10. Trust Score & Civic Urgency Score

> **⭐ KEY USP — Every endpoint in KAWACH returns both scores**

Two composite AI-derived numbers summarise each report across all pipelines.

### trust_score (0–100)
**"How credible and authentic is this report?"**

| Weight | Source              | Signal                                      |
|--------|---------------------|---------------------------------------------|
| 40%    | Pipeline 1 (deepfake) | Authenticity of the video                 |
| 35%    | Pipeline 3 (scene)  | Strength of visual evidence + temporal consistency |
| 25%    | Pipeline 2 (routing) | Routing confidence (AI vs. fallback)       |

| Score Range | Interpretation                                 |
|-------------|------------------------------------------------|
| 80–100      | Highly credible — fast-track for approval      |
| 60–79       | Credible with good evidence                    |
| 40–59       | Moderate — needs community verification        |
| 0–39        | Low credibility — likely AI-generated or weak evidence |

### civic_urgency_score (0–100)
**"How urgently does this need government action?"**

| Signal               | Score Change |
|----------------------|-------------|
| CRITICAL priority    | Base: 88    |
| HIGH priority        | Base: 70    |
| NORMAL priority      | Base: 48    |
| LOW priority         | Base: 20    |
| escalation_required  | +8          |
| Visual severity HIGH | +8          |
| Visual severity MEDIUM | +4        |
| DistilBERT upgrade   | +5          |
| Persistent (temporal ≥ 0.5) | +6  |
| Authenticated witness | +4         |
| AI_GENERATED video   | **−35**     |

### Implementation
```python
# trust_scorer.py  (Classifier/app/trust_scorer.py)
trust_score = compute_trust_score(
    verdict, fake_probability, confidence_level,
    routing_confidence, scene_detected,
    top_scene_confidence, temporal_consistency
)
civic_urgency_score = compute_civic_urgency_score(
    priority, escalation_required, visual_severity,
    priority_upgraded, verdict, faces_detected,
    scene_detected, temporal_consistency
)
```

---

## 11. End-to-End Report Submission Flow

```
Step 1: Citizen records video in SecureCameraView.jsx

Step 2: [PARALLEL]
        ├── A) Upload video → Cloudinary → secure_url
        └── B) POST /classify → Pipeline 1 verdict + trust_score

Step 3: [PARALLEL after upload]
        └── POST /route → Pipeline 2 routing + sub_category + estimated_resolution_days

        OR (preferred):
        └── POST /full-analysis → Pipelines 1+2+3 in one call

Step 4: Merge all results:
        {
          id, title, description, category,
          videoUrl, lat, lng, status: "AI_CHECK_1",
          aiVerdict, fakeProb, confidence,           ← P1
          routedDepartment, subCategory,              ← P2
          routingPriority, routingReason,
          estimatedResolutionDays,
          sceneDetected, detectedIssues,              ← P3
          temporalConsistency, dominantClass,
          trustScore, civicUrgencyScore,              ← Trust Engine
          uploaderUuid, emergencyOverride
        }

Step 5: handleNewUpload(report) in App.jsx
        ├── Optimistic UI update (instant local state)
        ├── Navigate to /user/feed
        └── Supabase INSERT into citizen_reports

Step 6: simulateWorkflowProgress() async
        AI_CHECK_1 → DEPT_ROUTING → COHORT_TEST → PUBLIC_APPROVED / REJECTED

Step 7: LocalReelsFeedView.jsx re-renders with:
        - Department badge (priority-colored)
        - AI verdict badge
        - Trust score indicator
        - Civic urgency score bar
        - Sub-category tag
        - Estimated resolution SLA
        - Temporal persistence indicator
```

---

## 12. Video Status State Machine

```
              ┌──────────────┐
              │  AI_CHECK_1  │  ← Initial state
              └──────┬───────┘
                     │
              ┌──────▼───────┐
              │ DEPT_ROUTING │  ← Civic dept assignment
              └──────┬───────┘
                     │
              ┌──────▼───────┐
              │ COHORT_TEST  │  ← Verified by nearby witnesses (simulated)
              └──────┬───────┘
                  80%│    20%│
         ┌───────────┘       └──────────────┐
         ▼                                  ▼
  ┌──────────────┐                ┌─────────────────────┐
  │PUBLIC_APPROVED│               │ REPORTED_SUSPICIOUS  │
  └──────────────┘                └──────────┬──────────┘
                                             │
                                    ┌────────▼─────────┐
                                    │    AI_CHECK_2    │
                                    └────────┬─────────┘
                                         70%│    30%│
                                ┌───────────┘       └────────┐
                                ▼                            ▼
                        ┌──────────────┐            ┌──────────────┐
                        │PUBLIC_APPROVED│           │   REJECTED   │
                        └──────────────┘            └──────────────┘
```

---

## 13. Database Schema Reference

**Table:** `citizen_reports` (Supabase PostgreSQL)

### Core Columns
| Column              | Type                       | Notes                                      |
|---------------------|----------------------------|--------------------------------------------|
| `id`                | `text PRIMARY KEY`         | Client-generated UUID                      |
| `title`             | `text NOT NULL`            | Report headline                            |
| `description`       | `text`                     | Full incident description                  |
| `category`          | `text`                     | User-selected category                     |
| `uploader_uuid`     | `text`                     | Anonymous citizen identifier               |
| `status`            | `text`                     | Current pipeline state                     |
| `lat`               | `double precision NOT NULL`| GPS latitude                               |
| `lng`               | `double precision NOT NULL`| GPS longitude                              |
| `video_url`         | `text`                     | Cloudinary secure video URL                |
| `emergency_override`| `boolean DEFAULT false`    | High-priority fast-track flag              |
| `views`             | `integer DEFAULT 0`        | View count for feed ranking                |
| `timestamp`         | `timestamptz DEFAULT now()`| Submission time (UTC)                      |

### Pipeline 2 Columns (`sqlq2.sql`)
| Column                | Type      | Notes                                                |
|-----------------------|-----------|------------------------------------------------------|
| `routed_department`   | `text`    | e.g. `POLICE`, `WATER`, `FIRE`                       |
| `routing_priority`    | `text`    | `CRITICAL`, `HIGH`, `NORMAL`, `LOW`                  |
| `routing_reason`      | `text`    | AI-generated routing rationale                       |
| `escalation_required` | `boolean` | Whether report needs urgent escalation               |

### Recommended v2.1 Migration (`sqlq3.sql`)
```sql
ALTER TABLE citizen_reports
  ADD COLUMN IF NOT EXISTS sub_category TEXT,
  ADD COLUMN IF NOT EXISTS estimated_resolution_days INTEGER,
  ADD COLUMN IF NOT EXISTS trust_score FLOAT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS civic_urgency_score FLOAT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS temporal_consistency FLOAT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dominant_class TEXT;
```

---

## 14. API Endpoint Reference

**Base URL:** `https://hikity-kawach-classifier.hf.space`

| Method | Path               | Pipeline | Description                                        |
|--------|--------------------|----------|----------------------------------------------------|
| GET    | `/health`          | System   | Health check + model status                        |
| POST   | `/classify`        | 1        | Deepfake forensic video analysis                   |
| POST   | `/route`           | 2        | Civic department routing + DistilBERT validation   |
| POST   | `/analyze-scene`   | 3        | Visual scene issue detection with temporal data    |
| POST   | `/full-analysis`   | 4        | All 3 pipelines unified — recommended for reports  |
| POST   | `/predict-hotspot` | 5 ⭐     | Geographic hotspot prediction (NEW)                |
| POST   | `/validate-report` | 6 ⭐     | Quick single-frame civic image validation (NEW)    |

### GET /health (v2.1)
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

## 15. Environment Variables Reference

### Vercel (Frontend)
| Variable                         | Used In              |
|----------------------------------|----------------------|
| `VITE_SUPABASE_URL`              | `supabaseClient.js`  |
| `VITE_SUPABASE_ANON_KEY`         | `supabaseClient.js`  |
| `VITE_CLOUDINARY_CLOUD_NAME`     | `SecureCameraView.jsx`|
| `VITE_CLOUDINARY_UPLOAD_PRESET`  | `SecureCameraView.jsx`|
| `VITE_CLASSIFIER_API_URL`        | `routingService.js`  |

### Hugging Face Spaces (Secrets)
| Variable         | Purpose                                                          |
|------------------|------------------------------------------------------------------|
| `GEMINI_API_KEY` | Enables Gemini AI routing (P2) and hotspot prediction (P5). Without it, both fall back to statistical/keyword modes. |

---

## 16. Department Routing Logic

### 10 Supported Civic Departments + Sub-Categories

| Code           | Full Name                    | Priority | Escalation | Example Sub-Categories                       |
|----------------|------------------------------|----------|------------|----------------------------------------------|
| `FIRE`         | Fire & Rescue Services       | CRITICAL | ✅ Yes    | fire_in_building, gas_leak, vehicle_fire     |
| `POLICE`       | Police & Law Enforcement     | HIGH     | ✅ Yes    | theft, assault, chain_snatching, eve_teasing |
| `ELECTRICITY`  | Electricity Board            | HIGH     | ✅ Yes    | wire_down, transformer_fault, streetlight_broken |
| `HEALTH`       | Health & Medical             | HIGH     | ✅ Yes    | disease_outbreak, food_poisoning, dengue_malaria |
| `WATER`        | Water Supply Authority       | NORMAL   | ❌ No     | pipe_burst, sewage_overflow, contaminated_water |
| `TRAFFIC`      | Traffic Control & Roads      | NORMAL   | ❌ No     | road_accident, signal_broken, road_blockage  |
| `SANITATION`   | Sanitation & Municipal Waste | NORMAL   | ❌ No     | garbage_dump, drain_blocked, overflowing_bin |
| `CONSTRUCTION` | Urban Construction & PWD     | NORMAL   | ❌ No     | pothole, road_crack, building_collapse, streetlight_broken |
| `ENVIRONMENT`  | Environmental Protection     | NORMAL   | ❌ No     | air_pollution, water_body_pollution, tree_cutting |
| `REVENUE`      | Revenue & Administration     | NORMAL   | ❌ No     | land_encroachment, bribery, unauthorized_structure |

### Routing Decision Hierarchy (v2.1)
```
1. GEMINI AI (Zero-Shot)    → sub_category + estimated_resolution_days + full context analysis
2. MULTI-KEYWORD SCORING    → counts all matching keywords per dept, selects highest scorer
3. DEFAULT FALLBACK         → SANITATION / NORMAL / general_civic_issue
```

---

## 17. Deployment Checklist

### ✅ One-Time Setup (Already Done)
- [x] Vercel project created & linked to `user/` directory
- [x] Hugging Face Space created at `Hikity/kawach-classifier`
- [x] `Classifier/` directory pushed to HF Spaces git remote
- [x] Docker image built and deployed on HF
- [x] `/health` returns `{"status":"ok","models_loaded":2}`

### ⚠️ Action Required
- [ ] **Push v2.1 Classifier changes** to HF Spaces git remote
  ```bash
  cd Classifier
  git add -A
  git commit -m "feat: v2.1 — trust scoring, temporal analysis, hotspot prediction, quick validate"
  git push hf main
  ```
- [ ] **Run `sqlq2.sql`** in Supabase if not done (Pipeline 2 routing columns)
- [ ] **Run `sqlq3.sql` migration** to add trust_score, civic_urgency_score, sub_category columns
- [ ] **Set `GEMINI_API_KEY`** in HF Space Secrets for full AI routing + hotspot prediction

### What v2.1 Pushes to HF
| File                        | Change                                              |
|-----------------------------|-----------------------------------------------------|
| `app/trust_scorer.py`       | **NEW** — unified trust + urgency scoring engine    |
| `app/schemas.py`            | New fields on all responses + 3 new schema classes  |
| `app/router.py`             | Enhanced Gemini prompt, sub_category, multi-keyword |
| `app/scene_analyzer.py`     | Temporal consistency, bbox coverage, dominant class |
| `app/main.py`               | 2 new endpoints + trust scoring across all handlers |

### 🔄 Ongoing Operations
- New code to `Classifier/` → push to HF remote → auto-rebuild Docker image
- New code to `user/` → push to GitHub → Vercel auto-deploys

---

## Architecture Decision Record (ADR)

| Decision                              | Rationale                                                              |
|---------------------------------------|------------------------------------------------------------------------|
| Serverless PaaS only                  | No DevOps overhead; scales with citizen volume automatically           |
| Hugging Face for AI microservice      | Free CPU tier; Docker-based; built-in versioning                       |
| Gemini 1.5-flash for routing          | Fastest Gemini; free tier; native JSON mode; sub-category support      |
| Multi-keyword scoring fallback        | More robust than first-match; works offline without API key            |
| Temporal consistency tracking         | Per-frame detection tracking reveals persistent vs isolated issues     |
| Trust score fusion (3-pipeline)       | Single credibility number improves prioritisation at scale             |
| Civic urgency score                   | Enables automated triage queue for department dashboards               |
| /predict-hotspot endpoint             | Proactive government action — moves from reactive to predictive        |
| /validate-report endpoint             | Reduces false submissions; immediate citizen feedback loop             |
| CPU-only PyTorch on HF               | Free tier has no GPU; CPU sufficient for deepfake on short clips       |
| Client-generated video ID            | Prevents double inserts; ties Cloudinary URL to DB row atomically      |
