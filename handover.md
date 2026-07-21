# 🛡️ KAWACH Project Handover Document

This document serves as a comprehensive technical handover for **KAWACH** — a Unified Public Safety & Threat Intelligence Grid. It details the architecture, tech stack, AI models, and deployment instructions necessary for any developer or team to take over, maintain, and scale the project.

---

## 1. Project Overview

**KAWACH** is a multi-tenant public safety ecosystem designed to bridge the trust gap between citizens and municipal/law enforcement authorities. It allows citizens to report incidents via an encrypted PWA, which are then analyzed in real-time by multiple AI pipelines for validation, urgency, and routing before reaching the respective department dashboards.

### Core Portals
1. **Citizen Sentinel PWA:** A React-based mobile-first web app for anonymous reporting (Ghost Mode), scam verification, and interacting with the Nayak AI Legal Assistant.
2. **Police Command Console:** A dashboard for law enforcement featuring GIS spatial maps, repeat offender network graphs, and court-ready Section 65B PDF generation.
3. **Civic Departments Console:** Isolated dashboards (Fire, Health, PWD, Sanitation) to review AI-routed reports and manage service tickets.
4. **Super Admin Console:** System-wide monitoring and audit trails.

---

## 2. System Architecture

The system follows a microservices-inspired architecture, separating the citizen-facing frontend, the central police/routing backend, and the specialized AI classifier service.

### 2.1 Tech Stack Summary
*   **Frontend (Citizen PWA):** React.js (Vite), Tailwind CSS.
*   **Frontend (Dashboards):** Vanilla HTML/JS/CSS (for lightweight department portals) and React for Police.
*   **Backend (Core Services):** Python, FastAPI.
*   **Backend (AI Classifier):** Python, FastAPI, PyTorch, TensorFlow, OpenCV.
*   **Databases:**
    *   **Relational:** SQLite (Development) / PostgreSQL (Production)
    *   **Vector:** pgvector (for RAG embeddings)
    *   **Graph:** Neo4j (for offender/incident relationship networks)
    *   **Auth/Storage:** Supabase

---

## 3. AI Models & Forensic Pipelines

KAWACH relies on six core AI pipelines to process and validate incoming reports:

### Pipeline 1: Deepfake Video/Audio Forensics
*   **Function:** Detects synthetic or manipulated media.
*   **Workflow:** OpenCV extracts frames $\rightarrow$ MTCNN extracts faces $\rightarrow$ Dual **TF-EfficientNet-B7** classifier ensemble flags anomalies.

### Pipeline 2: AI Agency Router & Priority NLP
*   **Function:** Parses textual reports, routes them to the correct department, and assigns urgency.
*   **Models:** 
    *   **Gemini 1.5-Flash (Zero-shot):** Department classification (Police, Fire, Health, Sanitation, etc.).
    *   **DistilBERT (`mrigaanksh/priority-classification-distilbert`):** Validates urgency and flags high-priority incidents.

### Pipeline 3: Visual Scene Analyzer (Object Detection)
*   **Function:** Corroborates user text with image/video content.
*   **Models:**
    *   **YOLO12s:** Detects specific issues like Road Damage (D00-D44).
    *   **SigLIP:** Zero-shot classification for generalized scenes (e.g., TrashNet categories).
    *   **Temporal Consistency Engine:** Filters out noise in videos (requires $\ge 0.5$ persistence ratio across frames).

### Pipeline 4: Signal Fusion (Scoring Engine)
*   **Function:** Aggregates AI outputs into actionable metrics.
*   **Outputs:** 
    *   **Unified Trust Score (0-100):** Confidence that the report is genuine (not a deepfake or spam).
    *   **Civic Urgency Score (0-100):** Severity of the incident.

### Pipeline 5: Predictive Hotspots (GIS)
*   **Function:** Identifies emerging threat zones.
*   **Algorithm:** **DBSCAN** spatial clustering over geographic coordinates of recent high-urgency reports.

### Pipeline 6: Currency Authentication (Counterfeit Detection)
*   **Function:** Analyzes images of banknotes to detect fakes.
*   **Model:** Custom **PyTorch CNN** trained on Indian currency datasets.

---

## 4. Nayak AI Legal Assistant (RAG System)

Nayak is an intelligent chatbot designed to help citizens understand their legal rights and verify scams.
*   **Knowledge Base:** Over 3,900+ vectorized sections of Indian Law, including the Bharatiya Nyaya Sanhita (BNS), BNSS, BSA, IT Act, and RBI Circulars.
*   **Technology:** 
    *   Primary: Retrieval-Augmented Generation (RAG) using the **Gemini API**.
    *   Fallback: If the API key is missing or offline, Nayak gracefully degrades to a keyword-based retrieval system providing structured, bulleted advice and legal citations.
*   **Features:** Scam Verification (Digital Arrests, Extortion), Traffic Rights, UPI Fraud guidance.

---

## 5. Security & Compliance Features

*   **EXIF Scrubbing:** The Citizen PWA automatically strips metadata from images before upload to maintain anonymity (Ghost Mode).
*   **Section 65B Admissibility:** All media uploads generate a SHA-256 hash. The system creates PDF dossiers compliant with the Indian Evidence Act / BSA to preserve the chain of custody.
*   **Zero-Bias Guardrails:** The NLP routing pipeline is explicitly prompted and constrained to avoid demographic, caste, or religious profiling.

---

## 6. Directory Structure

```text
/
├── Classifier/             # AI Microservice (YOLO, EfficientNet, PyTorch)
│   ├── app/                # FastAPI app for model inference
│   ├── weights/            # Pre-trained model weights (.pt, .h5)
│   └── requirements.txt
├── departments/            # Civic Department HTML/JS Dashboards
├── plan/                   # Project planning docs and progress trackers
├── police/
│   └── backend/            # Main Core Backend (FastAPI, Neo4j, DB Models)
│       ├── app/
│       │   ├── routes/     # API Endpoints (Nayak, Digital Arrest, etc.)
│       │   └── scripts/    # Data ingestion and DB setup scripts
├── user/                   # Citizen Sentinel PWA (React + Vite)
│   ├── src/
│   │   ├── components/     # UI Components (ChatView, AdminView, etc.)
│   │   └── api/            # API service calls
├── info.md                 # Brief project info
└── README.md               # Quickstart guide
```

---

## 7. Environment Variables & Configuration

You will need the following environment variables configured across the services:

### Police Backend (`police/backend/.env`)
```env
DATABASE_URL=sqlite:///./test.db # Or PostgreSQL connection string
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
GEMINI_API_KEY=your_gemini_api_key # For Nayak RAG
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
```

### Citizen PWA (`user/.env`)
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## 8. Development & Deployment Guide

### Local Setup
1.  **Citizen PWA:**
    ```bash
    cd user
    npm install
    npm run dev -- --port 5175
    ```
2.  **Core Backend:**
    ```bash
    cd police/backend
    python -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    uvicorn app.main:app --port 8000 --reload
    ```
3.  **AI Classifier:**
    ```bash
    cd Classifier
    python -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    python download_weights.py
    uvicorn app.main:app --port 8001 --reload
    ```

### Known Issues & Maintenance Notes
*   **Neo4j Fallback:** If the Neo4j graph database is unavailable, the backend gracefully falls back to an in-memory mock graph to prevent API crashes.
*   **Nayak Offline Mode:** The system is thoroughly tested to function without a Gemini API key using keyword matching. (See `police/backend/app/tests/test_no_api_key.py`).
*   **Model Weights:** Ensure `download_weights.py` is run in the Classifier service to fetch YOLO and DistilBERT models before starting the server.

---
*Document created during project handover. Please refer to `plan/` directory for historical context and future roadmap items.*
