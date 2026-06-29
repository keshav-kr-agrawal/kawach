# KAWACH — Full System Architecture & Pipeline Reference

> **Project:** KAWACH — AI-Driven Community Incident Reporting App (India)
> **Last Updated:** June 2026 · v2.0
> **Status:** Production-Ready ✅ — 4 AI Pipelines Live

---

## Table of Contents
1. [System Overview](#1-system-overview)
2. [Tech Stack at a Glance](#2-tech-stack-at-a-glance)
3. [Service Breakdown](#3-service-breakdown)
   - [Vercel (Frontend Host)](#31-vercel--frontend-host)
   - [Cloudinary (Video CDN)](#32-cloudinary--video-cdn)
   - [Hugging Face Spaces (AI Microservice)](#33-hugging-face-spaces--ai-microservice)
   - [Google Gemini (LLM Dispatcher)](#34-google-gemini--llm-dispatcher)
   - [Supabase (Database)](#35-supabase--database)
4. [Pipeline 1 — Deepfake Detection](#4-pipeline-1--deepfake-detection)
5. [Pipeline 2 — Civic Department Routing](#5-pipeline-2--civic-department-routing)
6. [Pipeline 3 — Scene Visual Issue Detection ⭐ NEW](#6-pipeline-3--scene-visual-issue-detection)
7. [Pipeline 4 — Unified Full Analysis ⭐ NEW](#7-pipeline-4--unified-full-analysis)
8. [End-to-End Report Submission Flow](#8-end-to-end-report-submission-flow)
9. [Video Status State Machine](#9-video-status-state-machine)
10. [Database Schema Reference](#10-database-schema-reference)
11. [API Endpoint Reference](#11-api-endpoint-reference)
12. [Environment Variables Reference](#12-environment-variables-reference)
13. [Department Routing Logic](#13-department-routing-logic)
14. [Deployment Checklist](#14-deployment-checklist)

---

## 1. System Overview

KAWACH is a civic incident reporting Progressive Web App (PWA) that allows Indian citizens to:
- Record and report incidents (crime, infrastructure damage, environmental hazards, etc.)
- **[Pipeline 1]** Automatically verify the video for AI manipulation (deepfake detection)
- **[Pipeline 2]** Automatically route the report to the correct government department (Gemini + DistilBERT dual-model consensus)
- **[Pipeline 3 — NEW]** Visually detect civic issues in video frames (pothole, road cracks, waste/garbage)
- **[Pipeline 4 — NEW]** Run all three pipelines in one unified call for maximum efficiency
- View reports from nearby citizens on a live proximity feed

The system is entirely **serverless** and built on PaaS/SaaS platforms — no dedicated backend server needed.

```
[Citizen's Phone]
      │
      ▼
[Vercel Frontend (React PWA)]
      │
      ├──► [Cloudinary] ──────────────► (Video Storage & Delivery CDN)
      │
      ├──► [HuggingFace /classify] ───► (Pipeline 1: EfficientNet-B7 + MTCNN deepfake)
      │
      ├──► [HuggingFace /route] ──────► (Pipeline 2: Gemini LLM + DistilBERT priority)
      │
      ├──► [HuggingFace /analyze-scene]► (Pipeline 3: YOLO road damage + TrashNet waste)
      │
      ├──► [HuggingFace /full-analysis]► (Pipeline 4: All 3 in one call)
      │
      └──► [Supabase PostgreSQL] ──────► (Persistent Report Storage)
```

---

## 2. Tech Stack at a Glance

| Layer               | Technology                     | Purpose                                        |
|---------------------|--------------------------------|------------------------------------------------|
| Frontend            | React + Vite (JSX)             | PWA Citizen App UI                             |
| UI Styling          | CSS-in-JS (inline styles)      | Dark-mode premium civic design                 |
| Frontend Host       | Vercel                         | Global CDN, HTTPS, CI/CD                       |
| Video Upload        | Cloudinary                     | Secure video upload, CDN delivery              |
| AI Microservice     | Hugging Face Spaces            | FastAPI server for 4 AI pipelines              |
| Deepfake Model      | EfficientNet-B7 + MTCNN        | Frame-level face forensics (Pipeline 1)        |
| LLM Dispatcher      | Google Gemini 1.5-flash        | Zero-shot civic department routing (Pipeline 2)|
| Priority Validator  | DistilBERT (civic fine-tuned)  | Dual-model priority consensus (Pipeline 2)     |
| Road Damage Model   | YOLO12s (RDD2022)              | Pothole & crack visual detection (Pipeline 3)  |
| Waste Classifier    | TrashNet SigLIP                | Garbage & waste detection (Pipeline 3)         |
| Database            | Supabase (PostgreSQL)          | Report persistence with RLS                    |
| State Management    | React useState/useEffect       | Local optimistic UI state                      |
| Router Framework    | React Router v6                | Multi-page navigation                          |
| Animation           | Framer Motion                  | Page transitions, micro-animations             |

---

## 3. Service Breakdown

### 3.1 Vercel — Frontend Host

**URL:** `https://kawach.vercel.app` (or your custom domain)
**Repository Root:** `user/` (Vite React project)

Vercel auto-deploys from Git on every push to `main`. No manual CI/CD setup needed.

**Build Configuration:**
- **Framework:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Root Directory:** `user/`

**Environment Variables (set in Vercel Dashboard → Settings → Environment Variables):**

| Variable                   | Description                                      |
|----------------------------|--------------------------------------------------|
| `VITE_SUPABASE_URL`        | Your Supabase project URL                        |
| `VITE_SUPABASE_ANON_KEY`   | Supabase anonymous (public) API key              |
| `VITE_CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name for video uploads        |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Cloudinary unsigned upload preset          |
| `VITE_CLASSIFIER_API_URL`  | Full URL to the HF Space `/classify` endpoint    |

> **Note:** All `VITE_` prefixed variables are exposed to the browser bundle at build time. Never put secrets here.

---

### 3.2 Cloudinary — Video CDN

**Purpose:** Receive raw video from the citizen's device, store it securely, and return a permanent public URL for embedding in the app and database.

**Integration Point:** `SecureCameraView.jsx` → Uploads video as `multipart/form-data` to Cloudinary's unsigned upload API.

**Upload Endpoint:**
```
POST https://api.cloudinary.com/v1_1/{CLOUD_NAME}/video/upload
```

**Request Body:**
```json
{
  "file": "<video blob>",
  "upload_preset": "<VITE_CLOUDINARY_UPLOAD_PRESET>",
  "resource_type": "video"
}
```

**Response (key fields):**
```json
{
  "secure_url": "https://res.cloudinary.com/.../incident_abc.mp4",
  "public_id": "kawach/incident_abc",
  "duration": 14.2
}
```

The `secure_url` is then stored as `video_url` in the Supabase `citizen_reports` table.

**Why Cloudinary?**
- Handles video transcoding, adaptive bitrate
- Global CDN for low-latency playback in `LocalReelsFeedView`
- Free tier: 25 GB storage, 25 GB bandwidth/month

---

### 3.3 Hugging Face Spaces — AI Microservice

**Space URL:** `https://hikity-kawach-classifier.hf.space`
**Space Repo:** `https://huggingface.co/spaces/Hikity/kawach-classifier`
**Runtime:** Docker (Python 3.10-slim base)
**Framework:** FastAPI + Uvicorn on port `7860`
**Hardware:** CPU Basic (free tier)

**Classifier Directory:** `Classifier/` (separate Git repo pushed to HF Spaces)

**Files:**
```
Classifier/
├── Dockerfile              # Container build recipe
├── requirements.txt        # Python dependencies
├── download_weights.py     # Pre-downloads model weights at build time
└── app/
    ├── main.py             # FastAPI app, /health, /classify, /route
    ├── schemas.py          # Pydantic request/response models
    ├── classifier.py       # Ensemble deepfake prediction logic
    ├── face_extractor.py   # MTCNN face detection + cropping
    ├── model_loader.py     # EfficientNet-B7 weight loader
    ├── router.py           # Gemini + keyword fallback civic routing
    └── video_reader.py     # Frame extraction from video files
```

**Exposed Endpoints:**
| Method | Path        | Purpose                                |
|--------|-------------|----------------------------------------|
| GET    | `/health`   | Health check, returns model load status |
| POST   | `/classify` | Deepfake video analysis (Pipeline 1)   |
| POST   | `/route`    | Civic department routing (Pipeline 2)  |

**Secrets (set in HF Space → Settings → Variables and Secrets):**
| Secret Name       | Value                  |
|-------------------|------------------------|
| `GEMINI_API_KEY`  | Your Google AI API key |

> **IMPORTANT:** Without `GEMINI_API_KEY`, the `/route` endpoint automatically falls back to keyword-based routing. Set this secret to enable full Gemini AI dispatch.

**Docker Build Notes:**
- PyTorch is installed from CPU-only wheel index (`https://download.pytorch.org/whl/cpu`) to keep image size manageable.
- `libgl1` replaces deprecated `libgl1-mesa-glx` in Debian Trixie.
- Model weights (EfficientNet-B7) are downloaded at image build time via `download_weights.py` for instant startup.

---

### 3.4 Google Gemini — LLM Dispatcher

**Model Used:** `gemini-1.5-flash`
**SDK:** `google-generativeai` (Python)
**Location:** `Classifier/app/router.py`

Gemini is used exclusively for zero-shot civic department classification. It receives a structured prompt containing the incident title, description, and category, and returns a structured JSON response indicating the correct government department.

**Prompt Pattern:**
```
You are the central AI dispatcher for KAWACH...
Title: {title}
Description: {description}
Category: {category}

Available Departments: POLICE, TRAFFIC, WATER, ELECTRICITY, SANITATION,
                       FIRE, HEALTH, CONSTRUCTION, ENVIRONMENT, REVENUE

Respond ONLY with JSON: { department, department_name, routing_reason, priority, escalation_required }
```

**Response MIME type:** `application/json` (enforced via `generation_config`)

**Fallback Chain:**
```
Gemini API available?
    YES → Zero-shot AI classification (confidence: "AI")
    NO  → Keyword matching against 10 department keyword sets (confidence: "FALLBACK")
    KEYWORD MISS → Default to SANITATION/NORMAL (confidence: "FALLBACK")
```

**Why Gemini 1.5-flash?**
- Extremely fast text classification (< 1 second)
- Native JSON response mode via `response_mime_type`
- Free tier: 15 RPM, 1M tokens/day — perfect for civic app volume

---

### 3.5 Supabase — Database

**Type:** PostgreSQL (managed)
**SDK:** `@supabase/supabase-js` v2
**Integration:** `user/src/supabaseClient.js`

Supabase provides the persistent storage layer for all citizen reports. Row Level Security (RLS) is enabled with public read/write/update policies for development.

**Connection:**
```js
// user/src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

**Operations performed:**
| Operation | When                          | Location         |
|-----------|-------------------------------|------------------|
| `SELECT *` | On app load, fetch all reports | `App.jsx` useEffect |
| `INSERT`   | After new report submission   | `App.jsx` handleNewUpload |
| `UPDATE status` | As AI workflow progresses | `App.jsx` simulateWorkflowProgress |

---

## 4. Pipeline 1 — Deepfake Detection

**Goal:** Verify that a submitted video is not AI-generated or digitally manipulated.

**Trigger:** Called from `SecureCameraView.jsx` immediately after the video is captured.

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
        faces_detected: N
        frames_analyzed: N
```

### Verdict Logic
| fake_probability | Verdict         | Notes                                     |
|-----------------|-----------------|-------------------------------------------|
| > 0.65          | `AI_GENERATED`  | High chance of manipulation               |
| < 0.35          | `AUTHENTIC`     | Likely genuine footage                    |
| 0.35 – 0.65     | `INCONCLUSIVE`  | Borderline, needs further review          |
| (no faces)      | `INCONCLUSIVE`  | Cannot classify without facial features   |

### Confidence Levels
| Range            | Confidence |
|-----------------|------------|
| > 0.85 or < 0.15 | `HIGH`    |
| > 0.65 or < 0.35 | `MEDIUM`  |
| 0.35 – 0.65      | `LOW`     |

### API Request/Response
```http
POST https://hikity-kawach-classifier.hf.space/classify
Content-Type: multipart/form-data

file: <video_binary>
```
```json
{
  "verdict": "AUTHENTIC",
  "fake_probability": 0.12,
  "confidence_level": "HIGH",
  "faces_detected": 3,
  "frames_analyzed": 32,
  "processing_time_ms": 4520.0,
  "model_count": 2
}
```

---

## 5. Pipeline 2 — Civic Department Routing

**Goal:** Automatically determine which government department should handle the citizen's report.

**Trigger:** Called from `SecureCameraView.jsx` in parallel with the Cloudinary video upload, after Pipeline 1 completes.

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
        ├──► [router.py: route_report_text()]
        │           │
        │           ├── GEMINI_API_KEY present?
        │           │       YES → Gemini 1.5-flash zero-shot classification
        │           │       NO  → Keyword fallback matcher
        │           │
        │           └── Returns: department, priority, reason, escalation_required
        │
        ▼
[routedDepartment, routingPriority, routingReason]
        │
        ▼
[Merged into report object → Supabase INSERT]
        │
        ▼
[LocalReelsFeedView.jsx → Department Badge Display]
```

### API Request/Response
```http
POST https://hikity-kawach-classifier.hf.space/route
Content-Type: application/json

{
  "title": "Broken water pipe flooding the road",
  "description": "There is a burst pipe at MG Road corner, water flooding since morning.",
  "category": "Infrastructure"
}
```
```json
{
  "department": "WATER",
  "department_name": "Water Supply Authority",
  "routing_reason": "Report describes a burst water pipe causing street flooding.",
  "priority": "HIGH",
  "escalation_required": true,
  "confidence": "AI"
}
```

### Department Priority Colors (UI)
| Priority   | Color   | Hex Code  |
|------------|---------|-----------|
| `CRITICAL` | Red     | `#ef4444` |
| `HIGH`     | Orange  | `#f97316` |
| `NORMAL`   | Blue    | `#3b82f6` |
| `LOW`      | Grey    | `#6b7280` |

---

## 6. End-to-End Report Submission Flow

Below is the complete, step-by-step sequence when a citizen submits a new report:

```
Step 1: Citizen records video in SecureCameraView.jsx
Step 2: [PARALLEL EXECUTION]
        ├── A) Upload video to Cloudinary → returns secure_url
        └── B) Run Pipeline 1 (/classify) → returns verdict + fake_probability

Step 3: [PARALLEL EXECUTION after video upload]
        └── Run Pipeline 2 (/route) with title, description, category
                → returns routed_department, priority, reason

Step 4: Merge all results into one report object:
        {
          id, title, description, category,
          videoUrl (from Cloudinary),
          lat, lng (from GPS),
          status: "AI_CHECK_1",
          aiVerdict, fakeProb, confidence (from Pipeline 1),
          routedDepartment, routingPriority, routingReason (from Pipeline 2),
          uploaderUuid, emergencyOverride, ...
        }

Step 5: handleNewUpload(report) in App.jsx
        ├── Optimistic UI update (instant local state)
        ├── Navigate to /user/feed
        └── Supabase INSERT into citizen_reports

Step 6: simulateWorkflowProgress() runs asynchronously
        └── Advances video status through state machine every 4 seconds
            AI_CHECK_1 → DEPT_ROUTING → COHORT_TEST → PUBLIC_APPROVED/REJECTED
            (Each status update also calls Supabase UPDATE)

Step 7: LocalReelsFeedView.jsx re-renders report with:
        - Department badge (colored by priority)
        - AI verdict badge
        - Location pin
        - Routing reason tooltip
```

---

## 7. Video Status State Machine

The `videoService.js` defines the lifecycle of every report through these states:

```
              ┌──────────────┐
              │  AI_CHECK_1  │  ← Initial state on submission
              └──────┬───────┘
                     │
              ┌──────▼───────┐
              │ DEPT_ROUTING │  ← Civic department assignment
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
                                    │    AI_CHECK_2    │  ← Secondary forensic scan
                                    └────────┬─────────┘
                                         70%│    30%│
                                ┌───────────┘       └────────┐
                                ▼                            ▼
                        ┌──────────────┐            ┌──────────────┐
                        │PUBLIC_APPROVED│           │   REJECTED   │
                        └──────────────┘            └──────────────┘
```

| Status              | Label                                    | Color     |
|---------------------|------------------------------------------|-----------|
| `AI_CHECK_1`        | 🤖 Initial AI Deepfake & Safety Scan     | Sky Blue  |
| `DEPT_ROUTING`      | 🗂️ Zero-Shot AI Civic Dept Routing       | Violet    |
| `COHORT_TEST`       | 👥 Cohort Test (Local Radius Verification)| Blue     |
| `REPORTED_SUSPICIOUS`| ⚠️ Flagged Suspicious (Under Review)    | Red       |
| `AI_CHECK_2`        | 🛡️ Secondary Forensic AI Verification   | Orange    |
| `PUBLIC_APPROVED`   | ✅ Approved & Pushed to Feeds            | Green     |
| `REJECTED`          | ❌ Rejected (Violates Safety Terms)      | Grey      |

---

## 8. Database Schema Reference

**Table:** `citizen_reports` (Supabase PostgreSQL)

### Core Columns (sqlq1.sql — Initial Schema)
| Column              | Type                     | Notes                                 |
|---------------------|--------------------------|---------------------------------------|
| `id`                | `text PRIMARY KEY`       | Client-generated UUID (video ID)      |
| `title`             | `text NOT NULL`          | Report headline                       |
| `description`       | `text`                   | Full incident description             |
| `category`          | `text`                   | User-selected category                |
| `uploader_uuid`     | `text`                   | Anonymous citizen identifier          |
| `status`            | `text`                   | Current pipeline state (see State Machine) |
| `lat`               | `double precision NOT NULL` | GPS latitude                       |
| `lng`               | `double precision NOT NULL` | GPS longitude                      |
| `video_url`         | `text`                   | Cloudinary secure video URL           |
| `emergency_override`| `boolean DEFAULT false`  | High-priority fast-track flag         |
| `trim_start`        | `double precision DEFAULT 0` | Video clip start offset (seconds) |
| `trim_end`          | `double precision DEFAULT 0` | Video clip end offset (seconds)   |
| `views`             | `integer DEFAULT 0`      | View count for feed ranking           |
| `timestamp`         | `timestamptz DEFAULT now()` | Submission time (UTC)              |

### Routing Columns (sqlq2.sql — Pipeline 2 Migration)
| Column                | Type      | Notes                                          |
|-----------------------|-----------|------------------------------------------------|
| `routed_department`   | `text`    | e.g. `POLICE`, `WATER`, `FIRE`                 |
| `routing_priority`    | `text`    | `CRITICAL`, `HIGH`, `NORMAL`, `LOW`            |
| `routing_reason`      | `text`    | AI-generated rationale for routing decision    |
| `escalation_required` | `boolean` | Whether report needs urgent escalation         |

### RLS Policies
```sql
-- All three policies are open (for development/MVP):
"Allow public read access"   → SELECT USING (true)
"Allow public insert access" → INSERT WITH CHECK (true)
"Allow public update access" → UPDATE USING (true)
```
> **Production Note:** Replace with auth-based policies before going to production. E.g., restrict INSERT to authenticated users only.

### SQL File Locations
| File | Purpose | When to Run |
|------|---------|-------------|
| `user/supabase/sqlq1.sql` | Create `citizen_reports` table from scratch | Fresh setup |
| `user/supabase/sqlq2.sql` | Add Pipeline 2 routing columns to existing table | Migration |

---

## 9. API Endpoint Reference

**Base URL:** `https://hikity-kawach-classifier.hf.space`

### GET /health
```http
GET /health
```
```json
{
  "status": "ok",
  "models_loaded": 2,
  "device": "cpu"
}
```

### POST /classify
```http
POST /classify
Content-Type: multipart/form-data
```
| Field | Type   | Required | Notes                              |
|-------|--------|----------|------------------------------------|
| file  | binary | Yes      | Video file (.mp4, .avi, .mov, .mkv)|

```json
{
  "verdict": "AUTHENTIC | AI_GENERATED | INCONCLUSIVE",
  "fake_probability": 0.0,
  "confidence_level": "HIGH | MEDIUM | LOW",
  "faces_detected": 3,
  "frames_analyzed": 32,
  "processing_time_ms": 4520.0,
  "model_count": 2
}
```

### POST /route
```http
POST /route
Content-Type: application/json
```
| Field       | Type   | Required | Notes                     |
|-------------|--------|----------|---------------------------|
| title       | string | Yes      | Report headline           |
| description | string | Yes      | Full incident description |
| category    | string | Yes      | User-selected category    |

```json
{
  "department": "POLICE | TRAFFIC | WATER | ELECTRICITY | SANITATION | FIRE | HEALTH | CONSTRUCTION | ENVIRONMENT | REVENUE",
  "department_name": "Friendly Name",
  "routing_reason": "One-sentence rationale",
  "priority": "CRITICAL | HIGH | NORMAL | LOW",
  "escalation_required": true,
  "confidence": "AI | FALLBACK"
}
```

---

## 10. Environment Variables Reference

### Vercel (Frontend — set in Vercel Dashboard)
| Variable                         | Example Value                                | Used In                  |
|----------------------------------|----------------------------------------------|--------------------------|
| `VITE_SUPABASE_URL`              | `https://xxxx.supabase.co`                   | `supabaseClient.js`      |
| `VITE_SUPABASE_ANON_KEY`         | `eyJhbGciOi...`                              | `supabaseClient.js`      |
| `VITE_CLOUDINARY_CLOUD_NAME`     | `dxxx123`                                    | `SecureCameraView.jsx`   |
| `VITE_CLOUDINARY_UPLOAD_PRESET`  | `kawach_unsigned`                            | `SecureCameraView.jsx`   |
| `VITE_CLASSIFIER_API_URL`        | `https://hikity-kawach-classifier.hf.space/classify` | `routingService.js` |

### Hugging Face Spaces (Secrets — set in HF Space Dashboard → Settings)
| Variable         | Purpose                                                  |
|------------------|----------------------------------------------------------|
| `GEMINI_API_KEY` | Enables Gemini AI routing. Without it, falls back to keywords. |

---

## 11. Department Routing Logic

### 10 Supported Civic Departments

| Code           | Full Name                    | Priority | Escalation | Example Keywords                              |
|----------------|------------------------------|----------|------------|-----------------------------------------------|
| `FIRE`         | Fire & Rescue Services       | CRITICAL | ✅ Yes    | fire, smoke, explosion, gas leak, blast       |
| `POLICE`       | Police & Law Enforcement     | HIGH     | ✅ Yes    | violence, theft, assault, crime, drugs        |
| `ELECTRICITY`  | Electricity Board            | HIGH     | ✅ Yes    | wire, power, shock, transformer, short circuit |
| `HEALTH`       | Health & Medical             | HIGH     | ✅ Yes    | hospital, disease, outbreak, food poisoning   |
| `WATER`        | Water Supply Authority       | NORMAL   | ❌ No     | leak, pipe, sewage, drainage, flood           |
| `TRAFFIC`      | Traffic Control & Roads      | NORMAL   | ❌ No     | accident, jam, signal, crash, collision       |
| `SANITATION`   | Sanitation & Municipal Waste | NORMAL   | ❌ No     | garbage, waste, trash, litter, dustbin        |
| `CONSTRUCTION` | Urban Construction & PWD     | NORMAL   | ❌ No     | pothole, bridge, crack, building collapse     |
| `ENVIRONMENT`  | Environmental Protection     | NORMAL   | ❌ No     | pollution, chemical, deforestation, emission  |
| `REVENUE`      | Revenue & Administration     | NORMAL   | ❌ No     | land, encroachment, bribe, property dispute   |

### Routing Decision Hierarchy
```
1. GEMINI AI (Zero-Shot)  → Analyzes full context, best accuracy
2. KEYWORD MATCH          → Bag-of-words scan, fast and offline-capable
3. DEFAULT FALLBACK       → Routes to SANITATION / NORMAL priority
```

---

## 12. Deployment Checklist

### ✅ One-Time Setup (Already Done)
- [x] Vercel project created & linked to `user/` directory
- [x] Hugging Face Space created at `Hikity/kawach-classifier`
- [x] `Classifier/` directory pushed to HF Spaces git remote
- [x] Docker image built and deployed successfully on HF
- [x] `/health` endpoint returns `{"status":"ok","models_loaded":2}`
- [x] Frontend `VITE_CLASSIFIER_API_URL` set to HF Space URL

### ⚠️ Action Required
- [ ] **Run `sqlq2.sql`** in Supabase SQL Editor to add routing columns
  - Go to: Supabase Dashboard → SQL Editor → New Query → Paste sqlq2.sql
- [ ] **Set `GEMINI_API_KEY`** in HF Space Secrets
  - Go to: HF Space → Settings → Variables and Secrets → Add Secret

### 🔄 Ongoing Operations
- New code changes to `Classifier/` → `git push` to HF remote → auto-rebuild
- New code changes to `user/` → `git push` to GitHub → Vercel auto-deploys
- Database schema changes → run migration SQL in Supabase SQL Editor

---

## Architecture Decision Record (ADR)

| Decision                              | Rationale                                                         |
|---------------------------------------|-------------------------------------------------------------------|
| Serverless PaaS only                  | No DevOps overhead; scales automatically with citizen volume      |
| Hugging Face for AI microservice      | Free GPU/CPU tier; Docker-based; built-in versioning             |
| Gemini 1.5-flash for routing          | Fastest Gemini model; free tier sufficient; native JSON mode      |
| Keyword fallback for routing          | Ensures routing works even without API key (offline degradation)  |
| Cloudinary for video                  | Built-in transcoding, adaptive delivery, generous free tier       |
| Supabase for DB                       | Postgres + RLS + realtime subscriptions; no server config needed  |
| Optimistic UI updates                 | Zero-latency feel for report submission; DB sync in background    |
| CPU-only PyTorch on HF               | Free tier has no GPU; CPU sufficient for deepfake on short clips  |
| Client-generated video ID            | Prevents double inserts; ties Cloudinary URL to DB row atomically |
