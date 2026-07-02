# 🛡️ KAWACH: National Public Safety, Crime Intelligence & Threat Analytics Platform (Nexus AI)

KAWACH is an enterprise-grade, dual-sided software platform designed to solve physical street crime analytics and digital public safety threats. Engineered for the **Karnataka State Police (KSP) Datathon** and **Economic Times AI Hackathon 2026 (Problem Statement 6)**, the platform consolidates fragmented police registries, emergency feeds, bank fraud records, and telecommunication logs into a single, high-fidelity command console while equipping citizens with a secure reporting PWA.

----

## 🏗️ System Architecture & Decoupled Stack

KAWACH uses a decoupled client-server architecture running entirely on modern PaaS, SaaS, and serverless infrastructure to scale without operational DevOps overhead.

```
                  ┌──────────────────────────────────────────────┐
                  │          KAWACH Unified Ecosystem            │
                  └──────────────────────┬───────────────────────┘
                                         │
                    ┌────────────────────┴────────────────────┐
                    ▼                                         ▼
   ┌─────────────────────────────────┐       ┌─────────────────────────────────┐
   │    Citizen App (React PWA)      │       │     Police App Dashboard        │
   │  - Light Mode Premium Theme     │       │  - Dark Mode Command UI         │
   │  - Live GPS & Proximity Maps    │       │  - Spatial Hotspots (Leaflet)   │
   │  - Secure Video Capture PWA     │       │  - Force-Directed Link Graph    │
   │  - Legal Flashcard Library      │       │  - AI Copilot & Voice Search    │
   └────────────────┬────────────────┘       └────────────────┬────────────────┘
                    │                                         │
                    ▼                                         ▼
   ┌─────────────────────────────────┐       ┌─────────────────────────────────┐
   │    Cloud Database & Storage     │       │   FastAPI Python Service API    │
   │  - Supabase (Postgres Database) │       │  - NetworkX Link Analytics      │
   │  - Cloudinary CDN (Video/Media) │       │  - Scikit-Learn DBSCAN Geo      │
   └─────────────────────────────────┘       │  - Neo4j DB (Bolt + JSON Fall)  │
                                             └─────────────────────────────────┘
                                                              │
                                                              ▼
                                             ┌─────────────────────────────────┐
                                             │     Hugging Face AI Space       │
                                             │  - FastAPI Docker Endpoint      │
                                             │  - MTCNN Face Extraction        │
                                             │  - EfficientNet-B7 Deepfake     │
                                             │  - Gemini 1.5-Flash Router      │
                                             └─────────────────────────────────┘
```

### 1. Citizen Social & Reporting PWA (`user/` directory)
- **Frontend Core**: React 19, Vite, React Router v6, and Framer Motion.
- **Styling**: Tailored design system with a clean, light-mode background (`#FAFAFA` to `#FFFFFF`) and gold/amber accents (`#FFD900`). Housed in a simulated mobile device viewport (≤ 480px width) using dynamic glassmorphism and smooth micro-animations.
- **Media Hosting**: Cloudinary CDN for serverless, secure video storage and adaptive playback.
- **Database**: Supabase PostgreSQL backend for incident data storage and real-time state synchronization.

### 2. Police command Center Console (`police/frontend/` & `police/backend/` directory)
- **Frontend Core**: React 19, Vite, Recharts, and React-Leaflet maps.
- **Styling**: Sleek dark-mode dashboard with neon accents excluded, utilizing HSL palettes to communicate administrative trust.
- **Backend API**: FastAPI running on Uvicorn ASGI server with SQLAlchemy ORM.
- **Geospatial & Network Intelligence**: NetworkX (for entity graphs), Scikit-Learn (DBSCAN coordinates clustering), and Pandas.
- **Graph Database**: Neo4j Graph Database (connected via Bolt driver) with a local JSON fallback seeder (`mock_neo4j_graph.json`) to guarantee offline reliability.

### 3. AI Microservice & Pipelines (`Classifier/` directory)
- **Host**: Hugging Face Spaces (FastAPI containerized inside Docker).
- **Pipeline 1 (Deepfake Classification)**: Frame extraction via OpenCV, face cropping using MTCNN, and forensics verification via an EfficientNet-B7 model.
- **Pipeline 2 (Zero-Shot Routing)**: Google Gemini 1.5-Flash API for zero-shot department routing, with an automated 10-department keyword fallback.

---

## 🗂️ The 29-Pillar Implementation Status

| Pillar | Feature & Hackathon Requirement | Implementation Location | Operational Status | Details |
| :--- | :--- | :--- | :--- | :--- |
| **1** | Ingestion & Core Data Lake | `police/backend/app/routes/ingestion.py`<br>`police/frontend/src/components/IngestionExplorerView.jsx` | **Fully Functional** | Seeds 10,500+ incident cases, missing persons, unidentified bodies, and CDRs. Accessible via Ingestion Panel. |
| **2** | MDM / Entity Resolution | `police/backend/app/routes/admin.py`<br>`police/frontend/src/components/AdminView.jsx` | **Fully Functional** | Evaluates name similarity and phone indexes. Suspicious duplicate profiles are merged through an approval queue. |
| **3** | Criminal Intelligence Graph | `police/backend/app/routes/network.py`<br>`police/frontend/src/components/NetworkView.jsx` | **Fully Functional** | Traces communication links and transfers between Suspects, UPIs, Crypto Wallets, IMEIs, and IP Nodes. |
| **4** | Repeat Offender Watchlists | `police/backend/app/routes/offenders.py`<br>`police/frontend/src/components/OffendersView.jsx` | **Fully Functional** | Identifies recidivism risk scores and watches repeat offenders across districts. |
| **5** | Geospatial Hotspots | `police/backend/app/routes/geo.py`<br>`police/frontend/src/components/GeoMapView.jsx` | **Fully Functional** | Performs Leaflet map rendering of clusters based on coordinates database. |
| **6** | Predictive Policing | `police/backend/app/routes/analytics.py`<br>`police/frontend/src/components/PredictiveView.jsx` | **Fully Functional** | Recommends patrol routes based on location risk, time risk, and event risk without claiming individual guilt. |
| **7** | AI Anomaly Alerts | `police/backend/app/routes/alerts.py`<br>`police/frontend/src/components/AlertsView.jsx` | **Fully Functional** | Calculates statistical spikes (Poisson distribution) and triggers emergency command alerts. |
| **8** | Socio-Economic Correlation | `police/backend/app/routes/analytics.py`<br>`police/frontend/src/components/SocioEconomicView.jsx` | **Fully Functional** | Visualizes unemployment and income census variables against crime volume charts. |
| **9** | GEOINT Platform Layers | `police/frontend/src/components/GeoMapView.jsx` | **Fully Functional** | Integrates sensitive site masks, hospital routes, schools, and police station polygons. |
| **10** | Live Command Center | `police/frontend/src/components/DashboardView.jsx` | **Fully Functional** | Unified DGP/SP monitoring hub displaying active cases, response timelines, and resource deficits. |
| **11** | Dynamic Alerting | `police/frontend/src/components/AlertsView.jsx` | **Fully Functional** | Classifies alerts into CRITICAL, HIGH, NORMAL, and LOW priorities. |
| **12** | Investigation Assistant | `police/backend/app/routes/ai.py`<br>`police/frontend/src/components/AICopilotView.jsx` | **Fully Functional** | Contextual chatbot (Graph-RAG) summarizing cases, timelines, and generating legal NCRP freeze forms. |
| **13** | Video & Note Analytics | `police/frontend/src/components/CounterfeitScannerView.jsx`<br>`police/frontend/src/components/CCTVAnalyticsSimulator.jsx` | **Simulated / Interactive** | Interactive simulator testing banknotes for watermarks and displaying CCTV grid bounding boxes. |
| **14** | Face Analytics Watchlist | `police/frontend/src/components/FaceAnalyticsView.jsx` | **Simulated / Interactive** | Simulates comparison of camera inputs against missing person watchlists. |
| **15** | District Performance | `police/backend/app/routes/dashboard.py`<br>`police/frontend/src/components/DistrictPerformanceView.jsx` | **Fully Functional** | Charts response speeds, conviction rates, and resource utilization across state stations. |
| **16** | Mobile Field App | `police/frontend/src/components/MobileFieldSimulatorView.jsx` | **Simulated / Interactive** | Simulates offline SQLite database caching and synchronization animations for beat patrols. |
| **17** | State Executive Dashboard | `police/frontend/src/components/ExecutiveDashboardView.jsx` | **Fully Functional** | High-level overview for DGP/SP tracking statewide trends and district performance. |
| **18** | Data Governance (RBAC) | `police/frontend/src/App.jsx` | **Fully Functional** | Enforces strict role-based views restricting access (DGP, SP, SHO, Constable). |
| **19** | Auditability Logs | `police/backend/app/routes/audit.py`<br>`police/frontend/src/components/AdminView.jsx` | **Fully Functional** | Maintains immutable compliance logs of system actions (views, resolves, exports). |
| **20** | Ethical Guardrails | `police/frontend/src/components/PredictiveView.jsx` | **Fully Enforced** | Ensures system does not predict criminality based on demographic indicators (caste, religion). |
| **21** | Cybersecurity Layers | `police/frontend/src/App.jsx` | **Fully Functional** | Protects dashboard routes with login, passcode inputs, and mock multi-factor authentication (MFA). |
| **22** | Statewide Impact KPIs | `police/frontend/src/components/DistrictAnalyticsView.jsx` | **Fully Functional** | Computes key target indices (investigation speeds, conviction success, response metrics). |
| **23** | Citizen Fraud Shield | `police/backend/app/routes/fraud_shield.py`<br>`police/frontend/src/components/CitizenFraudShieldView.jsx` | **Fully Functional** | Interactive portal evaluating suspicious calls, spoofed international numbers, and UPI handles. |
| **24** | Explainable AI (XAI) | `police/frontend/src/components/AlertsView.jsx`<br>`police/frontend/src/components/OffendersView.jsx` | **Fully Functional** | Replaces raw scores with detailed natural language rationales (complying with Section 65B). |
| **25** | Mock Data Generation | `police/backend/app/scripts/generate_data.py` | **Fully Functional** | Script generating 10,500+ cases and 2,000 offender graph nodes. |
| **26** | Sentinel & Snap Map | `user/src/components/SnapMapView.jsx`<br>`user/src/components/UserProfileView.jsx` | **Fully Functional** | GPS-tagged anonymous report maps featuring Ghost Mode and safety scores. |
| **27** | Multilingual Copilot | `police/frontend/src/components/AICopilotView.jsx` | **Fully Functional** | Speech-to-text input (English/Kannada), active map/graph sync, and Section 65B PDF dossier exports. |
| **28** | Socio-Economic Overlays | `police/frontend/src/components/GeoMapView.jsx` | **Fully Functional** | Opacity slider overlaying census data (unemployment, streetlights) on Leaflet crime hotspots. |
| **29** | Deepfake & Fraud Shield | `user/src/components/SecureCameraView.jsx`<br>`police/frontend/src/components/CitizenFraudShieldView.jsx` | **Fully Functional** | Audio spoofing checkers, video deepfake scan pipelines, and automated scam warning generation. |

---

## 🛠️ Detailed Operational Walkthrough: What is Working & What is Simulated

### 🔴 What is Working (Production-Ready)

#### 1. Zero-Shot Department Routing & Deepfake Scan Pipelines
- **Citizen Report Upload Flow**: When a citizen captures a video via `SecureCameraView.jsx`, the app uploads the binary payload to Cloudinary to receive a persistent CDN URL. In parallel, it triggers Pipeline 1 (`POST /classify`) on the Hugging Face space to analyze the video for face manipulation, returning a verdict (`AUTHENTIC`, `AI_GENERATED`, or `INCONCLUSIVE`) and confidence index.
- **AI Routing Engine**: Once the media upload is complete, Pipeline 2 (`POST /route`) runs on Hugging Face. The zero-shot prompt executes on Google Gemini 1.5-Flash to return a structured JSON response identifying the target department (e.g. `WATER`, `POLICE`), urgency level, and descriptive reason. If the Gemini API key is missing, keyword-matching logic acts as a fallback.
- **Supabase Synchronization**: The merged record is pushed to the `citizen_reports` PostgreSQL database. An asynchronous workflow loops through the PWA state machine (`AI_CHECK_1` ➔ `DEPT_ROUTING` ➔ `COHORT_TEST` ➔ `PUBLIC_APPROVED` / `REJECTED`), updating both local state and Supabase rows.

#### 2. Criminal Network Link Analysis Graph
- The `NetworkView.jsx` renders an interactive force-directed graph modeling relationships between suspects, gang syndicates, phones, bank accounts, and digital identities.
- Nodes support click-handlers to view complete profile overlays, phone logs, and financial transaction records (`TRANSFERRED_TO`).

#### 3. Spatial intelligence Map & Socio-Economic Correlation
- The `GeoMapView.jsx` plots active incidents on dark-theme Leaflet maps. Hotspots are computed via DBSCAN.
- Includes interactive toggles for sensitive site polygons and overlays for census indicators (Unemployment rate, Average Income, and Streetlight Coverage) using opacity sliders.

#### 4. Multilingual Investigation Copilot
- Supports speech commands using browser-native `Web SpeechRecognition` (English and Kannada).
- Features Graph-RAG context-aware chat queries and generates court-ready certified PDF dossiers using `jspdf`.

#### 5. User Roles, Governance & Audits
- Restricts navigation headers based on assigned roles (DGP, SP, SHO, Constable). DGP/SP profiles display statewide metrics, while SHO and Constable accounts focus on district reports.
- Logs every database view, PDF export, and entity resolution decision inside the `AuditLogs` table.

#### 6. Live WhatsApp Webhooks
- `webhooks.py` listens for incoming Twilio or Meta WhatsApp payloads. It runs regex checking against international spoofed prefixes and performs scam-keyword analysis, responding with automated safety warnings.

---

### 🟡 What is Simulated / Mocked (Prototype Enhancements)

While the overall platform is complete, specific hardware and database integrations are mocked to ensure reliable local runs:

1. **Neo4j DB Local Fallback**:
   - **How it works**: The connection script `neo4j_db.py` attempts to connect to a live Bolt database (`bolt://localhost:7687`). If it times out (2 seconds limit) or fails, the server falls back to an in-memory database initialized using `mock_neo4j_graph.json` containing 100+ entities (Locations, Incidents, Bank Accounts, UPI Nodes, and IP Addresses).
   - **Why**: Ensures the command center dashboards and network graphs run without requiring a live Neo4j database installation.

2. **CCTV & Face Watchlist Scanners**:
   - **How it works**: `CCTVAnalyticsSimulator.jsx` and `FaceAnalyticsView.jsx` emulate real-time analytics by looping mock frame feeds showing bounding-box detections (`Weapon Detected`, `Crowd Assembly`, and matching missing person cards).
   - **Why**: Video analytics on raw camera streams require GPU setups that are not feasible on CPU-only local environments.

3. **Counterfeit Banknote Checker**:
   - **How it works**: `CounterfeitScannerView.jsx` simulates an image processing scan when a user uploads/captures a banknote, scanning for fake indicators (watermarks, shifted threads) and providing mock confirmation results.

4. **Mobile Patrol Sync (SQLite Caching)**:
   - **How it works**: `MobileFieldSimulatorView.jsx` showcases how an offline patrolling officer's device records incidents locally to an SQLite cache and triggers database sync animations when network connectivity returns.

5. **GPS Coordinates Default**:
   - **How it works**: If a user blocks browser location permissions, the Citizen App defaults to mock coordinates mapping to Koramangala, Bengaluru (`12.9285, 77.6245`).

---

## 📂 Project Directory Structure

```
kawach/
├── info.md                                      # This comprehensive project reference guide
├── pipeline.md                                  # In-depth engineering design of AI pipelines
├── style.css                                    # General global custom CSS
├── index.html                                   # General landing entrypoint
├── Classifier/                                  # Hugging Face FastAPI AI Space
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── download_weights.py
│   └── app/
│       ├── main.py                              # FastAPI routers registry (/classify, /route)
│       ├── classifier.py                        # EfficientNet-B7 deepfake analysis
│       ├── face_extractor.py                    # MTCNN face cropping
│       └── router.py                            # Gemini zero-shot routing
├── user/                                        # Citizen React PWA Application
│   ├── package.json
│   ├── tailwind.config.js                       # Tailwind configuration
│   ├── src/
│   │   ├── App.jsx                              # Shell container & PWA routes
│   │   ├── supabaseClient.js                    # Supabase backend connection setup
│   │   ├── api/
│   │   │   └── videoService.js                  # Video lifecycle state machine
│   │   └── components/                          # Citizen views (Map, Feed, Chat, Library)
└── police/                                      # Police Command Center System
    ├── ready.md                                 # Summary document mapping hackathon criteria
    ├── project.md                               # Police dashboard technical documentation
    ├── backend/                                 # FastAPI Python Backend
    │   ├── requirements.txt
    │   └── app/
    │       ├── main.py                          # Routing imports and CORS headers
    │       ├── neo4j_db.py                      # Neo4j driver with local JSON mock fallback
    │       ├── models.py                        # SQLAlchemy relational models
    │       ├── routes/                          # Feature routers (AI, geo, network, webhooks)
    │       └── scripts/
    │           └── generate_data.py             # SQLite/PostgreSQL seeder scripts
    └── frontend/                                # React Dashboard Application
        ├── src/
        │   ├── App.jsx                          # Dashboard container, MFA login check
        │   └── components/                      # Tactical modules (GIS Maps, Force graphs)
```

---

## 🚀 Step-by-Step Local Setup & Run Instructions

Ensure you have **Node.js (v18+)** and **Python (3.10+)** installed on your system.

### 1. Citizen App Setup (React PWA)
Navigate to the `user` folder, install packages, and boot the Vite server:
```bash
cd user
npm install
npm run dev -- --port 5179
```
*App will run locally at [http://localhost:5179/](http://localhost:5179/)*.

### 2. Police Dashboard Frontend Setup
Navigate to the `police/frontend` directory, install packages, and boot the command interface:
```bash
cd police/frontend
npm install
npm run dev -- --port 5173
```
*The command center console will run at [http://localhost:5173/](http://localhost:5173/)*.

### 3. Police Backend API Setup
Navigate to the `police/backend` folder, set up a virtual environment, install requirements, and run the server:
```bash
cd police/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
*API endpoints will be served at [http://localhost:8000/](http://localhost:8000/)*.

### 4. Running the Database Seeders
To seed mock records into the database files:
```bash
# To populate relational tables (SQLAlchemy / PostgreSQL)
python -m app.scripts.generate_data

# To compile nodes and relationships to mock_neo4j_graph.json
python -m app.init_neo4j
```

---

## 🔒 Configuration & Environment Keys

To enable the cloud integration services, configure the following keys:

### Frontend Environment Variables (`user/.env` or Vercel Config)
```env
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
VITE_SUPABASE_ANON_KEY="your-supabase-public-anon-key"
VITE_CLOUDINARY_CLOUD_NAME="your-cloudinary-cloud-name"
VITE_CLOUDINARY_UPLOAD_PRESET="your-unsigned-upload-preset"
VITE_CLASSIFIER_API_URL="https://hikity-kawach-classifier.hf.space"
```

### AI Space Secrets (Hugging Face Dashboard)
```env
GEMINI_API_KEY="your-google-ai-studio-gemini-api-key"
```
*(If `GEMINI_API_KEY` is not set, the AI Space falls back to local keyword parsing for civic routing).*
