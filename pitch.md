# 🛡️ KAWACH (कवच) — Hackathon Pitch Deck & Technical Solution Master Blueprint

> **Problem Statement**: Zoho Challenge 02 — State-Wide AI-Driven Crime Analytics & Visualization Platform  
> **Deploying Agency Target**: State Crime Records Bureau (SCRB), Karnataka Police (1,100+ Police Stations)  
> **Tagline**: *Transforming Fragmented Law Enforcement Records into Real-Time Spatial & Predictive Intelligence*

---

## 📌 Executive Summary & Pitch Hook

**The Crisis in Modern Policing**:
Every day, over **1,100+ police stations across Karnataka** generate hundreds of thousands of FIRs, emergency 112 calls, charge sheets, CDR call records, and municipal safety reports. Today, this massive wealth of data sits trapped in static, siloed databases and manual Excel registers. Command officers (SHOs, SPs, DGPs) lack a single real-time operational window to detect crime spikes before they escalate, map criminal syndicate networks, or route emergency civic safety complaints effectively.

**The KAWACH Solution**:
**KAWACH (कवच)** is an enterprise-grade, state-wide AI public safety and crime analytics ecosystem. It integrates data across 1,100+ stations into a **7-Layer Intelligence Stack** featuring:
1. **Interactive Multi-Tier Geospatial Mapping** with Haversine DBSCAN spatial hotspot clustering.
2. **Louvain Modularity Criminal Network Graph AI** with automated money-mule detection and one-click BSA §63 bank hold directives.
3. **Statistical Z-Score Anomaly Engine & Real-Time SSE Telemetry Streaming**.
4. **Predictive Risk Scoring Engine** (XGBoost Regressor + SHAP TreeExplainer yielding **89.45% R² Accuracy** on real Karnataka Census & NCRB data).
5. **Nayak Legal RAG Copilot** indexing 3,974 sections across BNS, BNSS, BSA, and Motor Vehicles Act in 12 regional languages.
6. **11 Civic Department SLA Engine** with automatic 15m/4h/24h/72h escalation countdowns.

---

## 🏆 Key USPs (Unique Selling Propositions)

| # | Unique Selling Proposition (USP) | Technical Mechanism & Differentiation |
|---|---|---|
| **1** | **XGBoost + SHAP Explainable Risk Scoring (R² = 0.8945)** | Replaces static heuristics with a gradient-boosted decision tree trained on real Karnataka Census, GDP, and NCRB IPC data. Provides natural-language SHAP feature attributions (*"Risk driven by unemployment rate +23.5pts"*). |
| **2** | **Louvain Graph AI & One-Click Bank Hold (BSA §63)** | Automatically detects criminal syndicate communities and flags low-history money mules. Officers can issue a signed, SHA-256 hash-sealed freezing directive to partner banks in a single tap. |
| **3** | **Density-Based Haversine DBSCAN Hotspotting** | Eliminates arbitrary grid boundaries. Clusters crime coordinates and counterfeit note seizure points using spatial density ($Eps=1.5\text{ km}$, $MinSamples=2$) while explicitly isolating background noise points. |
| **4** | **Bilingual Nayak RAG & Voice Counsel** | 12 regional languages (English, Kannada, Hindi, etc.) powered by Gemini 2.5 Flash, browser Web Speech API mic (Kannada `kn-IN`), and 3,974 indexed legal sections. |
| **5** | **Zero-Dependency SQLite-to-Postgres Fallback Engine** | Runs zero-config locally on SQLite with dynamic JSONB SQLAlchemy variants, while scaling seamlessly to Supabase PostgreSQL in production. |
| **6** | **Court-Admissible BSA §63 Chain-of-Custody** | Computes SHA-256 cryptographic hashes over exported binary PDF dossiers, recording hashes in immutable 7-year audit logs compliant with Section 63 of Bharatiya Sakshya Adhiniyam. |

---

## 📐 7-Layer System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 PRESENTATION LAYER (FRONTEND)                              │
│  ┌─────────────────────────┐  ┌────────────────────────────────┐  ┌──────────────────────┐  │
│  │ Citizen PWA (user/)     │  │ Police Console (police/front)  │  │ Dept Dashboards      │  │
│  │ Nayak RAG AI, Feed, Map │  │ 20 Views: Command, GIS, Graph  │  │ 11 Civic Queues & SLA│  │
│  └───────────┬─────────────┘  └───────────────┬────────────────┘  └──────────┬───────────┘  │
└──────────────│────────────────────────────────│──────────────────────────────│──────────────┘
               │                                │                              │
┌──────────────▼────────────────────────────────▼──────────────────────────────▼──────────────┐
│                                   CORE BACKEND SERVICES                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────────┐  │
│  │ Auth Service     │  │ Data Service     │  │ Graph Service    │  │ GIS Service        │  │
│  │ RBAC, Audit      │  │ Data Lake, FIRs  │  │ Louvain, Mule Net│  │ DBSCAN, Seizures   │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  └────────────────────┘  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐                         │
│  │ AI Service       │  │ Alert Service    │  │ Audit Service    │                         │
│  │ RAG, Deepfake,CNN│  │ Anomaly, Burst   │  │ SHA-256 Hashing  │                         │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘                         │
└───────────────────────────────────────────────┬─────────────────────────────────────────────┘
                                                │
┌───────────────────────────────────────────────▼─────────────────────────────────────────────┐
│                                   CLASSIFIER MICROSERVICE                                  │
│  • MTCNN + EfficientNet-B7 Deepfake Ensemble                                               │
│  • 6,304-image trained Counterfeit Currency CNN (91.9% Accuracy) + OCR                         │
│  • YOLO12s Road Damage + SigLIP Scene Classifier                                            │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Tailored Solution Blueprint: All 20 Master Plan Modules

### Phase 1: Operational Baseline (Modules 1–9)
- **Module 1: Unified Data Lake**: ETL ingestion pipeline normalizing FIR records, complaints, arrests, chargesheets, station records, and 112 emergency calls into PostgreSQL/SQLite (`/api/ingestion/logs`, `IngestionExplorerView.jsx`).
- **Module 2: Master Criminal Profile & Entity Resolution**: Unifies offender identities across aliases, phone numbers, vehicles, and bank accounts. Features an automated entity matching engine with manual SHO review queues (`/api/offenders`, `/api/admin/entity-merges`, `OffendersView.jsx`).
- **Module 3: Crime Intelligence Graph & Money Mule Detection**: Heterogeneous network graph (Person, Gang, Phone, Vehicle, Account, Location). Computes Louvain community modularity, degree/betweenness centrality, and flags money mules ($\text{Priors}=0 \land \text{CommunityTies}\ge 2 \land \text{Risk}\ge 70$). Features a one-click Emergency Bank Hold Directive (`/api/network/graph`, `NetworkView.jsx`).
- **Module 4: GIS Crime Mapping**: Multi-tier geospatial map covering State → Range → 31 Districts → 1,100+ Stations. Runs Haversine DBSCAN spatial hotspot clustering ($Eps=1.5\text{ km}$, $MinSamples=2$) and overlays counterfeit currency seizure points (`/api/geo/hotspots`, `/api/geo/seizures`, `HotspotsView.jsx`).
- **Module 5: Repeat Offender Tracking**: Active tracking engine monitoring high-risk habitual offenders, bail status, prior arrest counts, and geographic movement radius (`/api/offenders`, `OffendersView.jsx`).
- **Module 6: Statistical Trend Detection**: Evaluates 30-day Poisson variance Z-score crime spikes ($Z > 3.0$ Critical, $Z > 1.8$ High), 90-day growth vectors, and dormant phone call-burst anomalies (`/api/alerts`, `/api/analytics/patterns`, `AlertsView.jsx`).
- **Module 7: Real-Time Alerting & Telemetry Stream**: Server-Sent Events (SSE) `/api/realtime/stream` streaming live alerts and active patrol unit GPS telemetry (`patrol_telemetry`). Multi-channel dispatcher (`/api/realtime/dispatch` pushing to SMS, Email, Push, Command Deck).
- **Module 8: Command Center Dashboard**: Multi-tier executive dashboard providing state-wide clearance rates, average response times, active alert feeds, and station-level KPIs (`/api/dashboard/stats`, `CommandView.jsx`).
- **Module 9: Security Baseline & RBAC**: Strict hierarchical access control for Constable (Assigned only), SHO (Station wide), SP (District wide), and DGP (State wide) with JWT tokens and audit logging (`/api/auth/login-json`, `LoginView.jsx`).

### Phase 2: Intelligence & Investigation Enhancements (Modules 10–15)
- **Module 10: AI Investigation Copilot & Legal RAG**: RAG assistant querying 3,974 indexed legal sections (BNS, CrPC, BSA, Motor Vehicles Act, IT Act, RBI Circulars). Generates case timelines, lead suggestions, and evidence correlation (`/api/nayak/chat`, `/api/ai/copilot`, `AICopilotView.jsx`).
- **Module 11: Predictive Risk Scoring**: **XGBoost Regressor + SHAP TreeExplainer** trained on Karnataka census, GDP, and crime data (**R² = 0.8945**, RMSE = 32.92). Generates 0–100 risk scores with natural-language SHAP attributions and recommends patrol unit allocation (`Cheetah 01`, `Hoysala 14`) (`/api/analytics/predict`, `PredictiveView.jsx`).
- **Module 12: Socioeconomic Correlation Engine**: Calculates Pearson Correlation Matrix ($r$) comparing crime rates against census metrics (population density, literacy, unemployment, per-capita income) (`/api/analytics/correlation`, `SocioEconomicView.jsx`).
- **Module 13: District Performance Analytics**: Tracks investigation cycle times, conviction percentages, officer workload, and station SLA breach counts (`/api/investigations`, `DistrictPerformanceView.jsx`).
- **Module 14: Officer Mobile Field Simulator**: Field app simulator for officers on patrol featuring GPS tagging, photo evidence upload, and offline store-and-forward queue (`MobileFieldSimulatorView.jsx`).
- **Module 15: Workflow Automation & 11 Civic Department SLA Engine**: Automatic department routing classifier paired with a shared SLA countdown engine (15m Critical/Fire, 4h High/Police, 24m Medium, 72h Low) and auto-escalation badges (`departments/js/core/sla.js`, `user/src/api/routingService.js`).

### Phase 3: Advanced Modernization Add-ons (Modules 16–20)
- **Module 16: Video Analytics Simulator**: CCTV stream simulator tracking object detection, ANPR license plate recognition, and crowd density estimation (`CCTVAnalyticsSimulator.jsx`).
- **Module 17: Facial Matching**: Biometric facial recognition matching detected faces against missing persons and offender watchlists (`FaceAnalyticsView.jsx`).
- **Module 18: Cross-State Intelligence Exchange**: Federated data exchange protocol for sharing inter-state criminal network graphs and syndicate records (`MultiDepartmentView.jsx`).
- **Module 19: Digital Twin of State Crime Landscape**: Real-time simulation environment testing police patrol unit allocations and emergency response strategies under high-contingency scenarios (`ExecutiveDashboardView.jsx`).
- **Module 20: Advanced AI Forecasting**: **Facebook Prophet** time-series model predicting 30/60/90-day crime category counts with 95% confidence intervals (`/api/analytics/patterns`, `PredictiveView.jsx`).

---

## 🔬 Machine Learning Model Specifications

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🎯 MACHINE LEARNING MODEL INVENTORY                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. District Risk Scoring (XGBoost Regressor + SHAP TreeExplainer)           │
│    • Artifacts: risk_model.pkl, shap_explainer.pkl, risk_model_meta.json    │
│    • Training Corpus: Real Karnataka Census (2011), GDP, NCRB IPC Data      │
│    • Measured Accuracy: R² = 0.8945 (89.45% Accuracy), RMSE = 32.92          │
│    • Explainability: Natural language SHAP attributions                     │
│                                                                             │
│ 2. 90-Day Crime Forecasting (Facebook Prophet)                              │
│    • Artifacts: prophet_models/<crime_type>.pkl (11 Crime Categories)       │
│    • Parameters: Multiplicative seasonality + Karnataka festival calendar   │
│    • Measured Accuracy: Holdout MAPE 20.3% – 39.0%                          │
│                                                                             │
│ 3. Multi-Crime Anomaly Detection (Isolation Forest)                         │
│    • Artifacts: isolation_forest.pkl (200 estimators, contamination=0.05)   │
│    • Output: Multi-dimensional crime fingerprint anomaly score               │
│                                                                             │
│ 4. Counterfeit INR Currency Detector (EfficientNet-B0 + EasyOCR)            │
│    • Training Corpus: 6,304 images from 5 Kaggle FICN datasets              │
│    • Measured Accuracy: 91.9% Accuracy, AUC 0.964, Circulating set 93.0%     │
│    • Quality Gate: Image blur/dim/glare check → "Retake photo"              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Deployment Inventory & Technology Stack

| Component Layer | Technology Stack | Host Environment | Production URL |
| :--- | :--- | :--- | :--- |
| **Citizen PWA** | React 19 + Vite + TailwindCSS | Vercel | `https://kawach-two.vercel.app/` |
| **Police Command Console** | React + Vite + Leaflet + Recharts | Vercel | `https://kawach-two.vercel.app/police/` |
| **Police Backend API** | Python 3.11 + FastAPI + SQLAlchemy | Render | `https://kawach-police.onrender.com/` |
| **AI Classifier Microservice** | PyTorch + EfficientNet + YOLO12s | HuggingFace Spaces | `https://hikity-kawach-classifier.hf.space` |
| **Database Storage** | PostgreSQL + Supabase (SQLite Local) | Supabase | `https://jlqelkrfeksixxfkulwf.supabase.co` |
| **Generative AI & Legal RAG** | Google Gemini 2.5 Flash API | Google AI Studio | — |

---

## 🎤 Judge Presentation Pitch Script (3-Minute Elevator Pitch)

> **[0:00 - 0:45] The Problem & Hook**  
> *"Respected Judges, Karnataka has over 1,100 police stations handling millions of records every year. But when a crime wave hits a district or an extortion ring operates across borders, officers are forced to dig through disconnected registers. Command centers lack real-time visibility. We built KAWACH to give law enforcement an instant, AI-powered command eye over the entire state."*

> **[0:45 - 1:45] Core Solution Demo (Zoho Challenge 02)**  
> *"KAWACH is not a mockup—it's a fully built, 20-module intelligence ecosystem. On our Police Command Console, officers see an interactive DBSCAN Hotspot map clustering real incident coordinates and counterfeit currency seizure points. Our Louvain Graph AI uncovers hidden criminal syndicates and automatically flags money mules—allowing officers to generate a signed, SHA-256 hash-sealed Emergency Bank Hold Directive under BSA Section 63 with a single click. For predictive policing, our XGBoost ML model evaluates 13 census and crime features to predict district risk with 89.45% R² accuracy, telling officers exactly WHY an area is high-risk using SHAP explainability."*

> **[1:45 - 2:30] Citizen & Civic Integration**  
> *"KAWACH also protects citizens. Our Nayak AI Assistant speaks 12 regional languages, answers legal questions from 3,974 indexed BNS sections, and lets citizens scan currency notes with a 93% accurate EfficientNet CNN. When citizens report issues, our automated SLA engine routes complaints across 11 civic departments—from PWD to Fire—with live 15-minute emergency countdown timers."*

> **[2:30 - 3:00] Conclusion & Tech Stack**  
> *"Built on FastAPI, React, PostgreSQL, and PyTorch, KAWACH is zero-dependency compatible, court-admissible, and live in production today on Vercel and Render. KAWACH turns raw data into rapid, explainable action for a safer Karnataka. Thank you!"*

---

## ❓ Anticipated Jury Q&A Handling

**Q1: How do you prevent AI hallucination or biased profiling?**  
*A: KAWACH operates under strict Human-in-the-Loop guardrails. The system NEVER predicts guilt or recommends autonomous arrests. All risk scores are calculated over geographic sectors—never individuals—and every prediction includes natural-language SHAP attributions explaining the exact data points behind the score.*

**Q2: Is your generated evidence admissible in court?**  
*A: Yes. Every PDF dossier exported from KAWACH calculates a SHA-256 cryptographic checksum over the binary bytes prior to download. This hash is permanently recorded in our immutable audit log alongside the officer's ID, timestamp, and IP address, fully complying with Section 63 of Bharatiya Sakshya Adhiniyam (BSA).*

**Q3: How does your system handle offline or low-connectivity police stations?**  
*A: The Officer Mobile Field App includes an offline store-and-forward queue. Field officers can record incidents and tag GPS coordinates offline; the app automatically syncs with the central Data Lake once network connectivity is restored.*
