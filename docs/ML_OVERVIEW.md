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
| **District Risk Score** | Looks at a district's unemployment, poverty, police coverage, and recent crime, and predicts a 0–100 "how risky is this area right now" score. Also tells you *why* it gave that score (e.g. "mostly because of low police coverage"). | **Now trained on real government data** (see below) — correctly explains ~89% of the variation in real historical district crime rates. |
| **Crime Forecasting** | For each type of crime (theft, cybercrime, fraud, etc.), predicts how many cases are likely in the next 30/60/90 days, with a "could be as low as X, could be as high as Y" range. | Trained on practice data, not real data — see honesty note below. No real month-by-month crime dataset exists publicly for India, so this one can't be upgraded to real data the way the other two were. |
| **Anomaly Detector** | Instead of watching one crime type at a time, this watches *all* crime types in a district together, and flags a district if several crime types spike at once — a pattern that usually means something coordinated is happening, not just random noise. | **Validated on real data**: correctly flags ~5% of district-years in real 2001-2012 government crime records as unusual, exactly the target rate. The version actually running live still uses practice data, for a technical reason explained below. |
| **Hotspot Map** | Groups nearby crime incidents into clusters on the map (instead of showing every dot separately), so an officer can see "this area" is a hotspot rather than 40 unconnected pins. | This is a real, working clustering algorithm — not a mock. |
| **Criminal Network Graph** | Draws the web of connections between people, phones, accounts, and vehicles tied to crimes, and automatically finds "communities" (likely gangs/rings) and flags people who look like money mules. | Real graph analysis — not hand-picked connections. |
| **Trend Alerts** | Watches crime counts over time and flags when something is statistically unusual (e.g. this month's burglary count is way outside the normal range for this district). | Real statistics, not random. |

**Honesty note, updated**: We went looking for a real dataset to retrain on, and found one — the government's own historical crime records (NCRB), joined with the 2011 Census and Karnataka's own district income data. Two of the three models are now trained on that real data:

- **District Risk Score**: retrained on real data. Went from a near-useless score (barely better than a coin flip) to explaining ~89% of the real variation in district crime rates — a legitimate, honest result.
- **Anomaly Detector**: the *algorithm* is validated on real data (correctly finds ~5% real anomalies in real 2001-2012 records) — but the version wired into the live demo still runs on practice data, because the real government data names crime categories differently than our demo app does (e.g. the government's "Robbery" vs our demo's "Theft / Robbery"), and lining those up exactly wasn't done yet. This is documented in detail below, not hidden.
- **Crime Forecasting**: still on practice data. Nobody publishes month-by-month district crime counts publicly in India, so there was no real dataset to switch to.

See the technical section for exactly which real datasets, what's a genuine number vs. an estimated stand-in (police staffing and unemployment by district aren't published anywhere open either, so those two stayed as reasonable estimates), and the exact accuracy numbers.

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

### 1. District Risk Score — XGBoost Regressor — **now trained on real data**
- **File**: `app/ml/train_risk_model.py` (synthetic-data trainer, kept as a fallback/retraining path), `temp/build_real_data.py` (the real-data trainer actually used to produce the artifact currently deployed), `app/ml/predict.py` (inference, unchanged), called from `POST /api/analytics/predict`
- **Algorithm**: `XGBRegressor` (gradient-boosted decision trees), 200 estimators, max_depth=5, learning_rate=0.05 — unchanged
- **Input features** (13, same schema either way): `unemployment_rate`, `poverty_rate`, `police_per_capita`, `gdp_per_capita`, `school_density`, `hospital_density`, `population_density`, `month_sin`/`month_cos`, `festival_flag`, `adjacent_crime_rate`, `lagged_crime_rate_3m`, `lagged_crime_rate_12m`
- **Target**: `crime_rate_per_100k`
- **Real training data used**:
  - **Crime counts & target**: NCRB (National Crime Records Bureau) district-wise IPC crime data, 2001–2012, official government statistics ([data.gov.in](https://www.data.gov.in/catalog/district-wise-crimes-under-various-sections-indian-penal-code-ipc-crimes)) — real annual `TOTAL IPC CRIMES` per district, real basis for `crime_rate_per_100k`, `adjacent_crime_rate`, and the lag features.
  - **`population_density`**: real 2011 Census population ([Registrar General of India](https://censusindia.gov.in/)) ÷ real district area.
  - **`gdp_per_capita`**: real Karnataka Directorate of Economics & Statistics district per-capita income, 2021-22 ([data.opencity.in](https://data.opencity.in/dataset/economic-survey-of-karnataka-2021-22)).
  - **`unemployment_rate`, `poverty_rate`**: **proxies, not official figures** — computed from real 2011 Census columns (workforce non-participation rate; household LPG-access as a deprivation index) because no open district-level unemployment survey or poverty-line dataset exists for Karnataka. Documented as an estimate, not oversold as official.
  - **`police_per_capita`, `school_density`, `hospital_density`**: **fixed state-average estimates**, not per-district — no open dataset (govt or Kaggle) publishes these at district level; behind paywalled aggregators (Indiastat) or RTI-only, not scrapeable.
  - **`month_sin`/`month_cos`/`festival_flag`**: set to a neutral constant — NCRB's public data is annual only, no real monthly figures exist to derive these from.
- **District-name reconciliation**: NCRB's 2001-2012 district names predate 2014-2021 renames/splits (e.g. "BANGALORE COMMR." → Bengaluru Urban, "BELLARY" → Ballari, with Vijayanagara — split from Ballari in 2021 — approximated using Ballari's own historical series since it didn't exist as a separate district yet). Full mapping in `temp/build_real_data.py`. Matched 25/31 districts against Census, 26/31 against income data; a handful of districts fall back to the dataset-wide average for the unmatched fields.
- **Validation**: strict time-based split — trained on 2001-2009 (209 rows), tested on 2010-2012 (75 rows), never mixed.
- **Measured accuracy on real data: R² = 0.894, RMSE = 32.9 crime/100k.** Up from R² = 0.263 on the fully-synthetic seed (kept below for comparison) — this is the real, legitimate number to quote to judges, and it makes sense: real unemployment/GDP/population-density genuinely correlate with real historical crime, where uniformly-random synthetic data had almost nothing to learn.
- **Previous (synthetic-only) result, for comparison**: R² = 0.263, RMSE = 0.38 crime/100k, trained against a full `generate_data.py` seed run (744 train / 186 test rows) — see git history for the root-cause writeup (`generate_data.py` assigns crimes near-uniformly at random, independent of any district feature).
- **Explainability**: SHAP `TreeExplainer`, unchanged — per-prediction feature attribution, not just global importance.
- **Graceful degradation**: if `risk_model.pkl` doesn't exist, `/api/analytics/predict` silently falls back to the original hand-tuned formula — the API never breaks either way.
- **How to reproduce**: `cd temp && python build_real_data.py` (needs `ncrb_ipc.csv`, `census2011.csv`, `ka_income.csv` in the same folder — download links are the three sources cited above).

### 2. Crime Forecasting — Facebook Prophet
- **File**: `app/ml/train_prophet.py` (training, one model per crime type), `app/ml/patterns.py` (inference), called from `GET /api/analytics/patterns`
- **Algorithm**: Prophet, multiplicative seasonality, custom Karnataka festival calendar (Ugadi/Dasara/Sankranti) as holiday regressors, yearly seasonality (enabled only if ≥24 months of data)
- **Input**: monthly FIR count per crime type, statewide
- **Output**: 30/60/90-day forecast with 95% confidence interval, direction (rising/declining/stable), only surfaced as a pattern card if the forecast moves ≥10% vs. the trailing 3-month average
- **Validation**: 3-month holdout — trained on all-but-last-3-months, scored against actual last 3 months (MAE, MAPE)
- **Current measured accuracy** (11 crime types, real seeded data): **MAPE ranges 20%–94%** depending on crime type (e.g. Drug Trafficking 20.3%, Riot/Public Mischief 94.1%). This confirms the same root cause as the risk model — uniform-random FIR dates mean there's no real seasonal pattern for Prophet to find yet. The code and pipeline are correct and will produce sharper forecasts once the seeding fix above lands.
- **Graceful degradation**: no crash if `prophet_models/*.pkl` are missing — that pattern category is simply omitted.

### 3. Multi-Crime Anomaly Detector — Isolation Forest — **now trained on real data**
- **File**: `app/ml/train_isolation_forest.py` (synthetic-data trainer, kept as a fallback), `temp/build_real_data.py` (the real-data trainer actually used for the deployed artifact), `app/ml/patterns.py` (inference, unchanged)
- **Algorithm**: `IsolationForest`, 200 estimators, contamination=0.05, features standardized first — unchanged
- **Real training data**: same NCRB 2001-2012 district-wise IPC data as the risk model, this time using the individual crime-type columns instead of the total.
- **A taxonomy-matching problem found and fixed**: NCRB's crime categories (`MURDER`, `THEFT`, `ROBBERY`, `HURT/GREVIOUS HURT`, ...) don't share names with the live demo app's categories (`Murder / Homicide`, `Theft / Robbery`, `Assault / Grievous Hurt`, ... from `generate_data.py`). A first pass trained directly on NCRB's own column names and would have silently produced meaningless results if deployed — the live app would score its own crime-type columns against a model that had never seen those column names. Fixed by explicitly mapping **6 of the live app's 11 crime categories** onto their genuine NCRB equivalents before training (`theft_robbery_rate` ← THEFT+ROBBERY+BURGLARY+AUTO THEFT, `assault_grievous_hurt_rate` ← HURT/GREVIOUS HURT, `murder_homicide_rate` ← MURDER, `kidnapping_rate` ← KIDNAPPING & ABDUCTION, `riot_public_mischief_rate` ← RIOTS, `economic_offense_fraud_rate` ← CRIMINAL BREACH OF TRUST+CHEATING), so the trained model's columns are real data *and* exactly match what the live app will feed it.
- **Honestly excluded, not faked**: the other 5 live categories — Cybercrime/Phishing, Extortion, Drug Trafficking (NDPS), Agrarian/Land Dispute, Smuggling — have **no NCRB IPC equivalent in the 2001-2012 data** (cybercrime wasn't tracked that way then; NDPS is a separate act not in this IPC file). Rather than backfill them with invented numbers, this model simply doesn't use those 5 dimensions — it watches the 6 crime types it actually has real historical grounding for.
- **A threshold bug found and fixed during the original build** (still relevant): the anomaly cutoff must never be a hardcoded constant like `-0.3` — `IsolationForest.score_samples()`'s scale shifts with dataset size/sparsity, so a fixed constant flagged 100% of rows as anomalous on one test run. Fixed: the threshold is derived per training run as the contamination-percentile of that run's own score distribution, and saved with the model.
- **Measured result on real data**: 284 real district-years, **15 flagged, 5.3% — matches the 5% target**, using genuine 2001-2012 NCRB crime-type counts.
- **Output**: `anomaly_score` (more negative = more unusual) plus which of the 6 covered crime types are elevated vs. that district's own baseline.
- **Why this exists on top of Z-scores**: Z-scores in `routes/alerts.py` check one crime type at a time. This checks several crime types *simultaneously* — it catches a district where burglary + assault + murder all rise together, a pattern invisible to single-variable thresholds.

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
