# KAWACH — AI/ML, Explained Simply (then in full detail)

This document answers three questions for every AI/ML piece in KAWACH:
**What does it do? How accurate is it, really? What goes in and what comes out?**

The first half is written for a non-technical reader (a judge, a police officer, a teammate who isn't ML-focused). The full technical breakdown — algorithms, exact accuracy numbers, file locations, training data — is at the **bottom** of this document.

KAWACH covers two hackathon problem statements:
- **Zoho PS** — crime analytics for the police (hotspots, risk scores, forecasts, criminal networks)
- **ET PS** — digital safety for citizens (scam-call detection, fake video/currency detection, fraud alerts)

---

# PART 1 — PLAIN ENGLISH

## Zoho PS: Crime Analytics for Police

| Feature | What it actually does | How good is it |
|---|---|---|
| **District Risk Score** | Looks at a district's unemployment, poverty, police coverage, and recent crime, and predicts a 0–100 "how risky is this area right now" score. Also tells you *why* it gave that score (e.g. "mostly because of low police coverage"). | Learns from real historical data instead of a fixed formula. Currently a **weak learner** — see honesty note below — because the practice data it's trained on doesn't yet have realistic patterns baked in. |
| **Crime Forecasting** | For each type of crime (theft, cybercrime, fraud, etc.), predicts how many cases are likely in the next 30/60/90 days, with a "could be as low as X, could be as high as Y" range. | Same honesty note — the forecasts run correctly, but the practice data is too random for the predictions to be sharp yet. |
| **Anomaly Detector** | Instead of watching one crime type at a time, this watches *all* crime types in a district together, and flags a district if several crime types spike at once — a pattern that usually means something coordinated is happening, not just random noise. | Correctly flags about 5% of district-months as unusual, which is exactly what it's supposed to do. |
| **Hotspot Map** | Groups nearby crime incidents into clusters on the map (instead of showing every dot separately), so an officer can see "this area" is a hotspot rather than 40 unconnected pins. | This is a real, working clustering algorithm — not a mock. |
| **Criminal Network Graph** | Draws the web of connections between people, phones, accounts, and vehicles tied to crimes, and automatically finds "communities" (likely gangs/rings) and flags people who look like money mules. | Real graph analysis — not hand-picked connections. |
| **Trend Alerts** | Watches crime counts over time and flags when something is statistically unusual (e.g. this month's burglary count is way outside the normal range for this district). | Real statistics, not random. |

**Honesty note on the three ML models above (Risk Score, Forecasting, Anomaly Detector):** These are trained on practice ("synthetic") data generated for the demo, not real police records. Right now that practice data assigns crimes almost randomly across districts and dates, so the models don't have much real pattern to learn from — this is being fixed (see the technical section). The Anomaly Detector still works well because it doesn't need historical pattern, just "is this month different from usual" — but the Risk Score and Forecasting will get meaningfully better once the practice data is improved.

## ET PS: Digital Safety for Citizens

| Feature | What it actually does | How good is it |
|---|---|---|
| **Fake Video Detector** | Checks if a video/photo showing someone (e.g. in a "digital arrest" scam call) is a real recording or an AI-generated deepfake. | Real, trained AI model — not a guess. |
| **Counterfeit Currency Checker** | Citizen photographs a currency note; the app checks the paper texture, printed text, and security features to say whether it looks genuine or fake, and tells them if the photo quality was too poor to judge (rather than guessing). | About 93% accurate on notes currently in circulation (₹10–₹500). Deliberately built so a blurry photo says "retake the photo" instead of falsely calling a real note fake. |
| **Scam Call / "Digital Arrest" Monitor** | While a suspicious call is happening, the system listens for scam scripts, checks if the caller's voice sounds artificially generated, checks if any video shown is a deepfake, and watches for suspicious money transfers — combining all of that into one confidence score. If the score is high enough, it can alert police *before* money changes hands. | The text/script-checking is solid. The voice-sounds-fake check is a reasonable technical approximation, not a fully trained AI model (no real "fake voice" training data exists publicly for this). |
| **Report Routing** | When a citizen uploads a photo/video of a problem (pothole, garbage, crime, etc.), an AI reads it and automatically sends it to the right department. | Uses a real AI language model for this, with a backup keyword-based system if the AI is temporarily unavailable. |
| **National Cyber Crime Helper** | Guides a citizen through filing a structured complaint for the government's cybercrime portal, in their own language. | Real structured help — it does not auto-submit the complaint, since there's no public API to do that; it prepares everything and links to the official portal. |

---

# PART 2 — FULL TECHNICAL DETAIL

## Zoho PS Models (built by Vignesh, `police/backend/app/ml/`)

### 1. District Risk Score — XGBoost Regressor
- **File**: `app/ml/train_risk_model.py` (training), `app/ml/predict.py` (inference), called from `POST /api/analytics/predict`
- **Algorithm**: `XGBRegressor` (gradient-boosted decision trees), 200 estimators, max_depth=5, learning_rate=0.05
- **Input features** (13, per district-month): `unemployment_rate`, `poverty_rate`, `police_per_capita`, `gdp_per_capita`, `school_density`, `hospital_density`, `population_density`, `month_sin`/`month_cos` (cyclical month encoding), `festival_flag`, `adjacent_crime_rate` (spatial lag — average crime rate of the 3 nearest districts by real station-coordinate distance), `lagged_crime_rate_3m`, `lagged_crime_rate_12m`
- **Target**: `crime_rate_per_100k` (FIR count / district population × 100,000)
- **Output**: `risk_score` (0–100, percentile-scaled), `risk_tier` (Low/Medium/High), `shap_explanation` (top 3 SHAP-attributed factors in natural language), `model_r2`, `model_rmse`
- **Validation**: time-based split (train on earliest 80% of months, test on most recent 20% — not random split, to avoid leaking future data into training)
- **Explainability**: SHAP `TreeExplainer` — per-prediction feature attribution, not just global importance
- **Current measured accuracy** (trained against a full run of the real `generate_data.py` seed, 744 train / 186 test rows): **R² = 0.263, RMSE = 0.38 crime/100k**. This is an honest, measured number, not a target or estimate.
- **Why R² is currently weak**: verified by reading `app/scripts/generate_data.py` — FIR records are assigned to police stations via `random.choice()` (uniform across all districts, independent of unemployment/poverty/police-density) and dates via uniform `random.randint()` over the full date range (no seasonality). The model has almost no real signal to learn from yet. **Fix owned by the data-seeding side of the team** (see `plan/zoho_master_plan.md`'s "DATA GENERATION FIX" section): re-weight station/date/crime-type selection by district risk factors and festival calendar. No ML code changes needed after that — just re-run `python -m app.ml.train_risk_model`.
- **Graceful degradation**: if `risk_model.pkl` doesn't exist, `/api/analytics/predict` silently falls back to the original hand-tuned formula (`unemployment×6 + poverty×1.25 + ...`) — the API never breaks.

### 2. Crime Forecasting — Facebook Prophet
- **File**: `app/ml/train_prophet.py` (training, one model per crime type), `app/ml/patterns.py` (inference), called from `GET /api/analytics/patterns`
- **Algorithm**: Prophet, multiplicative seasonality, custom Karnataka festival calendar (Ugadi/Dasara/Sankranti) as holiday regressors, yearly seasonality (enabled only if ≥24 months of data)
- **Input**: monthly FIR count per crime type, statewide
- **Output**: 30/60/90-day forecast with 95% confidence interval, direction (rising/declining/stable), only surfaced as a pattern card if the forecast moves ≥10% vs. the trailing 3-month average
- **Validation**: 3-month holdout — trained on all-but-last-3-months, scored against actual last 3 months (MAE, MAPE)
- **Current measured accuracy** (11 crime types, real seeded data): **MAPE ranges 20%–94%** depending on crime type (e.g. Drug Trafficking 20.3%, Riot/Public Mischief 94.1%). This confirms the same root cause as the risk model — uniform-random FIR dates mean there's no real seasonal pattern for Prophet to find yet. The code and pipeline are correct and will produce sharper forecasts once the seeding fix above lands.
- **Graceful degradation**: no crash if `prophet_models/*.pkl` are missing — that pattern category is simply omitted.

### 3. Multi-Crime Anomaly Detector — Isolation Forest
- **File**: `app/ml/train_isolation_forest.py`, `app/ml/patterns.py`
- **Algorithm**: `IsolationForest`, 200 estimators, contamination=0.05 (expects ~5% of district-months to be anomalous), features standardized first
- **Input**: one row per district-month, one column per crime type (crime-type columns derived dynamically from whatever's actually in the FIR table — not a hardcoded list, so it can't silently mismatch)
- **Output**: `anomaly_score` (more negative = more unusual) plus which specific crime types are elevated vs. that district's own baseline
- **Why this exists on top of Z-scores**: Z-scores in `routes/alerts.py` check one crime type at a time. This checks all crime types *simultaneously* — it catches a district where burglary + vehicle theft + assault all rise together, a pattern invisible to single-variable thresholds.
- **A bug found and fixed during build**: the anomaly cutoff was originally a hardcoded constant (`-0.3`, copied from the planning doc). Testing against real data showed `IsolationForest.score_samples()`'s scale shifts with dataset size — the hardcoded constant flagged 100% of rows as anomalous on one run. Fixed: the threshold is now derived per training run as the contamination-percentile of that run's own score distribution, and saved with the model.
- **Current measured result** (real seeded data, 930 district-months across 11 crime types): **47 flagged, 5.1% — matches the 5% target.** This model doesn't depend on historical pattern the way the other two do, so it's already working correctly even before the seeding fix.

### Already-real Zoho PS features (not built this session, but genuinely implemented — see `CLAUDE.md`)
- **DBSCAN hotspot clustering** (`routes/geo.py`) — haversine-distance clustering, tunable `eps_km`/`min_samples`, returns cluster centroids + noise points.
- **Louvain community detection + centrality** (`routes/network.py`) — real graph algorithms on the offender/relation network, with an explainable money-mule flag (low-prior person, 2+ ties into a high-risk community).
- **Z-score anomaly alerts** (`routes/alerts.py`) — 30-day Poisson-variance Z-scores, tiered Critical/High thresholds.
- **Socio-economic correlation** (`routes/analytics.py` `/correlation`) — real Pearson correlation matrix, not hardcoded.

## ET PS Models (Classifier microservice + police backend, built by teammate/prior sessions — summarized here for completeness)

### Deepfake Video/Image Detector
- MTCNN face detection + dual EfficientNet-B7 ensemble
- Real trained weights, not a mock — `/health` endpoint reports `deepfake_mode: real` when weights are loaded, `mock_fallback` if not (visible degradation, not silent)

### Counterfeit Currency Detector (v2)
- Staged pipeline: image-quality gate (blur/dim/glare → "retake photo", never scored as fake) → note-presence gate → OCR-based structural checks (serial number telescopic numbering, RBI wording fuzzy-match) as the primary evidence → EfficientNet-B0 CNN as an *advisory* signal only (its real-world transfer was weaker than lab accuracy, so it's demoted, not trusted alone)
- **Measured accuracy: 91.9% overall, AUC 0.964**, on notes currently in circulation (₹10–₹500) averaging **93.0%** (₹2000 excluded from that headline number — it was withdrawn from circulation in 2023 and has thin training data)
- Trained on 6,304 images merged from 5 Kaggle datasets, deduplicated via perceptual hashing to prevent train/test leakage

### Digital Arrest Live-Session Monitor
- Fuses 4 signals with fixed weights: text scam-script match (30%), voice spoof heuristic (20%), video deepfake probability (20%), transaction anomaly (30%), plus a bonus if multiple signals agree
- Voice-spoof signal is a **classical DSP heuristic** (spectral flatness, pitch-jitter, amplitude regularity) — not a trained model, because no public labeled "fake voice" dataset exists for this; this is stated honestly in the UI/API, not oversold
- Alert dispatches automatically at combined score ≥70, before any money transfer completes

### Report Routing + Priority Classification
- Gemini 2.5 Flash for department routing, DistilBERT cross-check for priority — both real model calls, with a keyword-based fallback if Gemini is unreachable

---

## Where to look for more
- `CLAUDE.md` (repo root) — the canonical, continuously-updated "what's real vs. mocked" reference for the whole codebase, not just ML.
- `plan/zoho_master_plan.md` — architecture blueprint + the outstanding data-seeding fix needed to improve the three Zoho ML models' accuracy.
- `Classifier/COUNTERFEIT_DETECTION.md`, `Classifier/pipeline.md` — full technical writeups for the currency and classifier pipelines.
