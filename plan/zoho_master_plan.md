# MASTER PLAN
## State-Wide AI-Driven Crime Analytics & Visualization Platform
### Government Deployment Blueprint (3-Phase Execution Plan)

---

# 1. Vision

Create a unified State Crime Intelligence Platform that transforms fragmented law-enforcement data into actionable intelligence through AI, geospatial analytics, criminal network analysis, real-time alerts, investigation assistance, and executive decision support.

---

# 2. Core Principles

- Human-in-the-loop decision making
- Explainable AI
- Privacy by design
- Zero-trust security
- Complete auditability
- State-wide scalability
- Role-based access control
- Legal and regulatory compliance
- No automated arrest recommendations
- No demographic profiling

---

# 3. High-Level Architecture

## Data Sources
- FIR Systems
- Crime & Criminal Tracking Systems
- Court Data
- Prison Data
- Emergency Services
- Cyber Crime Systems
- Traffic Systems
- CCTV Systems
- Census & Socioeconomic Data
- GIS Layers

## Core Layers

### Layer 1
Data Ingestion & Integration

### Layer 2
Master Data Management

### Layer 3
Entity Resolution

### Layer 4
Crime Intelligence Graph

### Layer 5
Analytics & AI Engine

### Layer 6
Alerting & Decision Support

### Layer 7
Dashboards & Investigation Workspace

---

# DUAL CHALLENGE SPECIFICATIONS & SOLUTION BLUEPRINT

## Challenge 01: Intelligent Conversational AI for KSP Crime Database
- **Repository Scope**: 1,100+ police stations across Karnataka managed by State Crime Records Bureau (SCRB).
- **Natural Language Chatbot**: Natural language query engine (English + Kannada bilingual NLP via Gemini 2.5 Flash + 12 regional language translation).
- **Voice-Enabled Interaction**: Speech-to-Text (STT) and Text-to-Speech (TTS) audio integration.
- **Context-Aware Multi-Turn Session Memory**: Tracks session history, media uploads, and user location context.
- **BNS Legal Vector RAG**: 3,974 indexed sections across Bharatiya Nyaya Sanhita (BNS), BNSS, BSA, Motor Vehicles Act, IT Act, and RBI Circulars.
- **Conversational Function Calling**: Gemini tool `propose_report` automatically recognizes incidents and draft-populates report proposals.
- **SHA-256 PDF Export**: Export of conversation history and chronologies with SHA-256 cryptographic evidence hashes for court admissibility under BSA Section 63.
- **Embedded Visualizations**: In-chat rendering of criminal network graphs and hotspot map summaries.

## Challenge 02: AI-Driven Crime Analytics & Visualization Platform (PRIMARY FOCUS)
- **Interactive Dashboards & Multi-Tier Geospatial Mapping**: State → Range → 31 Districts → 1,100+ Police Stations with station-level drilldowns, Leaflet CARTO base tiles, density heatmaps, and blue counterfeit currency seizure markers (`/api/geo/seizures`).
- **DBSCAN Crime Hotspot Detection Engine**: Haversine distance spatial metric clustering ($Eps = 1.5\text{ km}$, $MinSamples = 2$) with cluster centroid calculation, threat levels, and noise point isolation.
- **Statistical Trend Alerts & Z-Score Anomaly Detection**: 30-day Poisson variance Z-score anomaly calculations ($Z > 3.0$ Critical, $Z > 1.8$ High), 90-day growth rate vectors, and call burst anomaly triggers.
- **Criminal Network & Link Analysis Engine**: Louvain modularity community partitioning, degree & betweenness centrality calculations, and automated money mule flagging ($\text{Priors}=0 \land \text{CommunityTies}\ge 2 \land \text{Risk}\ge 70$).
- **Repeat Offender & Watchlist Tracking System**: Watchlist management, re-offense frequency scoring, and fuzzy entity resolution merge queues.
- **Socio-Economic Crime Correlation Engine**: Pearson Correlation Matrix ($r$) evaluating crime rates against census parameters (population, literacy rate, unemployment rate, per-capita income, urbanization index).
- **Predictive Risk Scoring & Patrol Allocation Engine** *(ML UPGRADE — Vignesh owns)*: **XGBoost Regressor** trained on Karnataka district features (unemployment, poverty, police_per_capita, gdp_per_capita, population_density, school/hospital density, month seasonality, festival flag, spatial lag from adjacent districts) → predicts `crime_rate_per_100k` → normalized 0–100 risk score. SHAP explainability layer generates per-district natural language rationale ("Risk driven by: unemployment +23pts, low police density +18pts"). Model delivers cross-validation R² and RMSE. Paired with recommended patrol unit routes (`Cheetah 01`, `Hoysala 14`).
- **AI/ML Pattern Detection Suite** *(ML UPGRADE — Vignesh owns)*: (1) **Facebook Prophet** time-series forecasting per (district × crime_type) trained on historical FIR monthly counts — outputs 30/60/90-day forecasts with 95% confidence intervals and trend/seasonality decomposition. (2) **Isolation Forest** unsupervised anomaly detection on multi-dimensional crime fingerprint vectors — detects districts whose simultaneous cross-crime-type pattern is an outlier vs all historical profiles (catches coordinated crime events that single-variable Z-scores miss). Both models deliver explainable audit rationale in the `/api/analytics/patterns` response. Additionally: MTCNN + EfficientNet-B7 deepfake ensemble, Currency CNN (91.9% AUC 0.964), YOLO12s + SigLIP, Digital Arrest monitor ($S \ge 70$ dispatch).


---

# ML INTEGRATION CONTRACT
## For Team Member Reference — Leave Integration Windows Open

> **Owner**: Vignesh builds, trains, and delivers the ML artifacts.
> **Team**: Must leave the backend call-hooks below active and not re-implement the scoring logic.

## Model Artifacts (Vignesh delivers to `police/backend/app/ml/models/`)

| File | Algorithm | Purpose |
|---|---|---|
| `risk_model.pkl` | XGBoost Regressor | District risk score prediction |
| `risk_model_meta.json` | — | Feature list, training R², RMSE, training date |
| `isolation_forest.pkl` | Isolation Forest | Multi-dimensional crime anomaly detection |
| `prophet_models/<crime_type>.pkl` | Facebook Prophet | Per-crime-type 90-day count forecasting |
| `shap_explainer.pkl` | TreeExplainer (SHAP) | Per-district risk factor attribution |

## Integration Hook 1 — `/api/analytics/predict` (analytics.py)

Team member must replace the weighted-formula block in `predict_district_risk()` with:

```python
# ── ML INTEGRATION WINDOW (Vignesh) ─────────────────────────────────────────
# Do NOT delete this block. Vignesh will drop risk_model.pkl here.
import os
ML_MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "ml", "models")

def _try_ml_predict(feature_rows: list) -> list | None:
    """Attempt XGBoost prediction. Returns None if model not yet loaded."""
    try:
        import joblib, numpy as np
        model_path = os.path.join(ML_MODELS_DIR, "risk_model.pkl")
        if not os.path.exists(model_path):
            return None
        model = joblib.load(model_path)
        X = np.array([[r[f] for f in model.feature_names_in_] for r in feature_rows])
        return model.predict(X).tolist()
    except Exception as e:
        print(f"[ML] XGBoost prediction failed, falling back to formula: {e}")
        return None
# ── END ML INTEGRATION WINDOW ────────────────────────────────────────────────
```

The response schema stays identical — same JSON fields — so the frontend needs zero changes:
```json
{
  "district_id": "...",
  "district_name": "...",
  "risk_score": 78.4,
  "risk_tier": "High",
  "score_breakdown": { "unemployment": 23.1, "poverty": 18.4, "police_deficit": 12.0, "recent_crime_volume": 24.9 },
  "contributing_factors": { "unemployment": "...", ... },
  "shap_explanation": "Risk primarily driven by unemployment rate 3.2× state average (+23pts) and police density deficit (+18pts). Spatial crime spillover from adjacent Ramanagara district adds +12pts.",
  "ml_model": "xgboost",
  "model_r2": 0.84
}
```

## Integration Hook 2 — `/api/analytics/patterns` (analytics.py)

Team member must add this call at the end of `detect_crime_patterns()`, **after** the existing 3 statistical patterns:

```python
# ── ML INTEGRATION WINDOW (Vignesh) ─────────────────────────────────────────
def _try_ml_patterns(fir_data) -> list:
    """Attempt Prophet + Isolation Forest patterns. Returns [] if models not loaded."""
    try:
        from app.ml.patterns import ml_forecast_patterns, ml_anomaly_patterns
        return ml_forecast_patterns(fir_data) + ml_anomaly_patterns(fir_data)
    except Exception as e:
        print(f"[ML] Pattern ML failed, using statistical-only patterns: {e}")
        return []
patterns += _try_ml_patterns(firs)
# ── END ML INTEGRATION WINDOW ────────────────────────────────────────────────
```

ML pattern response schema (appended to existing patterns list):
```json
[
  {
    "id": "PAT-ML-001",
    "title": "Prophet Forecast: Cybercrime Rising — Bengaluru Urban",
    "description": "Prophet model predicts Cybercrime FIRs will increase 34% in the next 60 days (95% CI: 18%–51%). Seasonal component shows recurring July–September peak.",
    "confidence": 88.0,
    "category": "Forecast",
    "sample_size": 1240,
    "forecast_30d": 142,
    "forecast_90d": 391,
    "confidence_interval": { "lower_90d": 318, "upper_90d": 464 }
  },
  {
    "id": "PAT-ML-002",
    "title": "Isolation Forest: Anomalous Crime Profile — Belagavi",
    "description": "Isolation Forest detected a simultaneous multi-crime-type anomaly: Burglary + Vehicle Theft + Assault elevated together (4.2σ outlier vs all historical district profiles). Coordinated criminal activity suspected.",
    "confidence": 91.0,
    "category": "Anomaly",
    "sample_size": 3100,
    "anomaly_score": -0.42,
    "district": "Belagavi"
  }
]
```

## Graceful Degradation Rule
Both `_try_ml_predict()` and `_try_ml_patterns()` fall back silently if the `.pkl` files are missing. The system works without the models — it just uses the statistical fallback. This means the team can deploy and demo before Vignesh finishes training, and Vignesh can drop in the models anytime without a redeploy.

## Model Training Plan (Vignesh's Responsibility)

### XGBoost Risk Model
- **Training data**: `generate_data.py` seed → District table × SocioEconomicIndicator table × FIRRecord counts, grouped by (district_id, year, month)
- **Feature engineering**: Add `festival_flag` (Karnataka public holidays list), `adjacent_crime_rate` (avg of 2–3 geographic neighbors), `population_density` (population / assumed area)
- **Training**: `XGBRegressor(n_estimators=200, max_depth=5, learning_rate=0.05)`, 5-fold CV on district-year splits (NOT random split — spatial/temporal leakage risk)
- **SHAP**: `shap.TreeExplainer(model)` → `shap_values = explainer(X_test)` → serialize explainer
- **Target metric to report**: R² > 0.75 on held-out districts, RMSE < 15 crime_per_100k

### Prophet Forecasting
- **Training data**: FIRRecord grouped by `(district_name, crime_type, year_month)` → `ds` (date) + `y` (count)
- **One model per crime_type** (Cybercrime, Theft, Assault, Fraud, etc.)
- **Prophet config**: `seasonality_mode='multiplicative'`, `yearly_seasonality=True`, `weekly_seasonality=True`, custom `add_seasonality('festival', period=365.25/12, fourier_order=3)`
- **Output**: 90-day forecast dataframe → serialize with `pickle`

### Isolation Forest
- **Training data**: Per-district crime type vector: `[cybercrime_rate, theft_rate, assault_rate, fraud_rate, drug_rate, ...]` per month
- **Model**: `IsolationForest(n_estimators=100, contamination=0.05)` (5% of data expected anomalous)
- **Output**: `anomaly_score` per (district, month) — negative scores = anomalous
- **Label generation**: When `anomaly_score < -0.3`, identify which crime types are driving it (compare to district's own baseline per-type)

---

# PHASE 1 (MOST CRITICAL 80%)

## Objective
Deliver operational impact across the entire state.

### Module 1
Unified Data Lake

Parameters:
- FIR records
- Complaints
- Arrests
- Chargesheets
- Station records
- Emergency calls

Workflow:
Source → ETL → Validation → Standardization → Storage

Guardrails:
- Schema validation
- Duplicate detection
- Data lineage tracking

---

### Module 2
Master Criminal Profile

Parameters:
- Name
- Aliases
- Address
- Phone
- Vehicle
- Known associates

Workflow:
Records → Entity Matching → Unified Profile

Guardrails:
- Confidence scoring
- Manual merge review
- Immutable audit logs

---

### Module 3
Crime Intelligence Graph

Nodes:
- Person
- Gang
- Vehicle
- Location
- Phone
- Account

Relationships:
- Called
- Met
- Arrested With
- Owned
- Visited

Outputs:
- Network visualization
- Hidden connections
- Gang mapping

Guardrails:
- Confidence thresholds
- Relationship provenance

---

### Module 4
GIS Crime Mapping

Capabilities:
- Heatmaps
- Clustering
- District Drilldowns
- Police Station Drilldowns

Workflow:
Incident → Geocoding → Mapping → Analytics

Guardrails:
- Location precision controls
- Sensitive-site masking

---

### Module 5
Repeat Offender Tracking

Parameters:
- Prior arrests
- Convictions
- Case frequency
- Geographic spread

Outputs:
- Watchlists
- Monitoring alerts

Guardrails:
- Human review required
- No guilt inference

---

### Module 6
Trend Detection

Capabilities:
- Crime spikes
- Pattern shifts
- Emerging hotspots

Workflow:
Historical Data → Baseline → Anomaly Detection

Guardrails:
- Explainable outputs
- Confidence bands

---

### Module 7
Real-Time Alerting

Severity:
- Critical
- High
- Medium
- Low

Channels:
- Dashboard
- Mobile
- Email
- SMS

Guardrails:
- Alert deduplication
- Escalation policies

---

### Module 8
Command Center Dashboard

Views:
- State
- Zone
- District
- Station

KPIs:
- Crime rates
- Response time
- Case clearance

---

### Module 9
Security Foundation

Requirements:
- MFA
- Encryption at rest
- Encryption in transit
- RBAC
- SIEM integration

---

# PHASE 2 (ESSENTIAL)

## Objective
Enhance intelligence and investigation effectiveness.

### Module 10
AI Investigation Copilot

Capabilities:
- Case summarization
- Timeline generation
- Lead suggestions
- Evidence correlation

Guardrails:
- Explainable recommendations
- Officer approval required

---

### Module 11
Predictive Risk Scoring

Inputs:
- Historical incidents
- Temporal patterns
- Events
- Weather

Outputs:
- Area risk score
- Patrol recommendations

Guardrails:
- No individual risk scoring
- No arrest recommendations

---

### Module 12
Socioeconomic Correlation Engine

Inputs:
- Population
- Migration
- Employment
- Education

Outputs:
- Correlation insights

Guardrails:
- Correlation only
- No causal claims

---

### Module 13
District Performance Analytics

Metrics:
- Response time
- Conviction rate
- Investigation cycle time

---

### Module 14
Officer Mobile App

Capabilities:
- Incident reporting
- Evidence upload
- GPS tagging
- Offline mode

Guardrails:
- Device authentication
- Remote wipe

---

### Module 15
Workflow Automation

Automations:
- Assignment routing
- Escalation
- SLA monitoring

---

# PHASE 3 (ADVANCED ADD-ONS)

## Objective
Long-term intelligence and modernization.

### Module 16
Video Analytics

Capabilities:
- Object detection
- Vehicle tracking
- Crowd detection

Guardrails:
- Human validation
- Retention controls

---

### Module 17
Facial Matching

Use Cases:
- Missing persons
- Watchlists

Guardrails:
- Legal authorization
- Confidence thresholds
- Human verification

---

### Module 18
Cross-State Intelligence Exchange

Capabilities:
- Secure federation
- Inter-state case sharing

---

### Module 19
Digital Twin of State Crime Landscape

Capabilities:
- Scenario simulation
- Resource allocation testing

---

### Module 20
Advanced AI Forecasting

Capabilities:
- Emerging crime forecasting
- Resource planning

Guardrails:
- Explainability
- Bias monitoring

---

# DATA GOVERNANCE

## Access Levels

Constable
- Assigned incidents only

SHO
- Station-wide access

SP
- District access

DGP
- State-wide access

---

# AUDIT FRAMEWORK

Track:
- View events
- Edit events
- Exports
- Logins
- AI interactions

Retention:
- Minimum 7 years

---

# COMPLIANCE

- DPDP Act
- CERT-In Guidelines
- State Cyber Security Policy
- Criminal Procedure Requirements
- Evidence Handling Standards

---

# NON-NEGOTIABLE GUARDRAILS

System MUST NOT:

- Predict criminal guilt
- Recommend arrests
- Profile religion
- Profile caste
- Profile ethnicity
- Generate autonomous enforcement actions

System MAY:

- Recommend patrol allocation
- Detect trends
- Surface investigative leads
- Prioritize review queues

---

# SUCCESS KPIs

Operational:
- Faster investigations
- Improved response times
- Reduced manual effort

Strategic:
- Earlier hotspot detection
- Better intelligence sharing

Governance:
- Full auditability
- Transparent AI

---

# WEBSITE BUILDING REFERENCE

Primary Pages:
1. Login
2. Command Center
3. Crime Map
4. Criminal Profiles
5. Network Analysis
6. Alerts
7. Investigations
8. AI Copilot
9. Reports
10. Administration

Core Services:
- Auth Service
- Data Service
- Graph Service
- GIS Service
- AI Service
- Alert Service
- Audit Service

Recommended Stack:
Frontend: React / Next.js
Backend: Python + FastAPI
Graph DB: Neo4j
GIS: PostGIS
Warehouse: PostgreSQL
Search: Elasticsearch
Streaming: Kafka
Deployment: Kubernetes

---
**END OF MASTER PLAN**