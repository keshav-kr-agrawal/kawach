# KAWACH — Project Guide for Claude

KAWACH is a public-safety platform targeting two hackathon problem statements at once:
- **Zoho PS** — AI-driven crime analytics (dashboards, hotspots, offender graphs, predictive scoring)
- **ET PS** — AI for Digital Public Safety (digital-arrest scam detection, counterfeit currency, fraud network graphs, geospatial intelligence, citizen fraud shield)

Full target-architecture spec: `plan/kawach_build_spec.md`. Interactive architecture diagram: `plan/kawach_dev_architecture.html`. Active build plan and progress tracker: `plan/kawach_master_plan.md`, `plan/progress_tracker.md`. **This file describes verified current code reality — the plan docs describe the target, and the two are not yet fully in sync. When they conflict, trust this file and the code, not the plan docs, until the plan docs are updated.**

## Services (three independently runnable, one repo)

| Service | Path | Stack | Port | Run |
|---|---|---|---|---|
| Citizen PWA (+ dept/admin dashboards) | `user/` | React 19 + Vite | 5175 | `cd user && npm install && npm run dev -- --port 5175` |
| AI Classifier microservice | `Classifier/` | FastAPI, Docker | 8001 (7860 on HF Spaces) | `cd Classifier && pip install -r requirements.txt && python -m uvicorn app.main:app --port 8001` |
| Police command console backend | `police/backend` | FastAPI + SQLAlchemy/Postgres + Neo4j | 8000 | `cd police/backend && pip install -r requirements.txt && python -m uvicorn app.main:app --port 8000` |
| Police console frontend | `police/frontend` | React + Vite | (own dev port) | `cd police/frontend && npm install && npm run dev` |
| Department dashboard | `departments/` | Plain HTML/JS, talks to Supabase directly | static, no build | open `departments/index.html` or serve statically |

`police/backend` needs Postgres reachable at the URL in `police/backend/app/config.py` (default `postgresql://keshav@localhost:5439/kawach`) and optionally Neo4j (falls back to `police/backend/app/mock_neo4j_graph.json` if unreachable).

## What's real vs. heuristic/mocked (verified by code, not docs)

Don't trust a feature name alone — check this table before describing something as "AI-powered" or "working" in a demo/deck.

**Classifier microservice (`Classifier/`)** — genuinely implemented, not boilerplate:
- Real MTCNN + dual EfficientNet-B7 ensemble for deepfake detection (Pipeline 1)
- Real Gemini-based department routing + DistilBERT priority cross-check (Pipeline 2)
- Real YOLO12s (road damage) + SigLIP TrashNet scene classifier (Pipeline 3)
- Real deterministic trust/urgency score fusion (`trust_scorer.py`)
- Gemini model is `gemini-2.5-flash` (env-overridable via `GEMINI_MODEL`, defined in `router.py`) — the old shut-down `gemini-1.5-flash` references were fixed 2026-07-16.
- `/health` now reports `deepfake_mode` (`real`/`mock_fallback`), `routing_mode` (`gemini`/`keyword_fallback`), `gemini_model`, and `currency_mode` — **check this before any demo run**: if weights aren't loaded, `/classify` and `/full-analysis` still fall back to mock "mostly authentic" results (`_mock_deepfake` in `main.py`), but the degradation is now visible instead of silent.
- **Pipeline 7 added 2026-07-17 — `/classify-currency`** (`app/currency_detector.py`): counterfeit INR screening, built to match the ET PS bullet verbatim (microprint / security thread / serial-number pattern / UV feature). Sources fused: a trained CNN plus four classical-CV checks — security-thread band, microprint Laplacian sharpness, print-noise profile, and a **serial-number ascending-numeral check** (RBI's own documented telescopic-numbering anti-counterfeit feature, via EasyOCR + column ink-height profiling — no model needed). **UV fluorescence is honestly gated**: only runs when the caller passes `capture_mode="uv"` with a UV-lit photo; a normal-light photo returns `not_applicable` rather than a fabricated verdict. Disagreement between CNN/heuristics ⇒ INCONCLUSIVE, `model_mode` disclosed in every response.
- **Currency CNN TRAINED & DEPLOYED 2026-07-17** (`weights/currency/currency_cnn.pt` + `eval_report.json`, trained on Kaggle T4 via `kaggle_train_currency.ipynb`): EfficientNet-B0 on 6,304 train images merged from 5 image datasets (~14k raw, phash-deduped), held-out test n=1,352: **98.67% accuracy, fake-precision 0.964, fake-recall 0.982, AUC 0.998**. Per-denomination (quote these, not the blend): ₹10 99.2% (n=378), ₹20/₹50/₹100/₹200 100% (n=146/133/103/88), ₹500 99.1% (n=220), **₹2000 89.4% (n=47 — the honest weak spot, thin fake data for that note)**. `unknown`-denomination bucket (n=237) missed its few fakes — images whose filename/folder carries no denomination token. Verified locally: `currency_mode: "cnn+heuristic"`, fused inference ~1.1s/image on CPU (EasyOCR serial check dominates; the CNN itself is <200ms).
- **Research check (2026-07-17): no trustworthy pretrained INR-counterfeit model exists anywhere** (HF Hub API search + GitHub) — the only HF hits were a zero-download `.pth` with no model card/license/class mapping, and a weights-free README. GitHub options (e.g. BK-Modding/fake-currency-identification) report no accuracy figures and train on ~5-7 images/note. Don't cite an external pretrained model in the deck — the CNN path is your own training run, everything else is the documented classical checks above.
- **`Classifier/kaggle_train_currency.ipynb` added 2026-07-17 — the real training pipeline** (run on Colab's free T4 GPU, not locally): pulls 3 merged Kaggle FICN datasets, perceptual-hash deduplicates (prevents train/val leakage from near-duplicate Kaggle images — a common silent accuracy inflator), stratified 70/15/15 train/val/test split, EfficientNet-B0 by default with domain-realistic augmentation (perspective warp, motion blur, JPEG artifacts — simulates real phone photos, not generic ImageNet augmentation), progressive fine-tuning (frozen-backbone warmup → full unfreeze), early stopping on val macro-F1, and a held-out test set touched exactly once. Exports a checkpoint in the exact format `currency_detector.py` expects — drop into `weights/currency/currency_cnn.pt`, restart, done.
- **Checkpoint format is now self-describing** (`{"arch", "classes", "state_dict", ...}` dict, not a bare state_dict) — `CurrencyDetector` reads `arch` and builds the matching backbone automatically via an `_ARCH_REGISTRY` (`efficientnet_b0` default, `mobilenet_v3_small`/`_large` also supported). The Colab notebook's model-building cell is a byte-for-byte mirror of `_ARCH_REGISTRY`/`build_currency_model()` in `app/currency_detector.py` — if you change one, change the other, or checkpoints trained in Colab won't match what the app expects to build.
- **Windows dev note**: all startup prints are ASCII-safe (`[OK]`/`[WARN]`) — unicode `✓` crashed uvicorn under cp1252. Keep new prints ASCII or run with `PYTHONIOENCODING=utf-8`.

**Citizen PWA (`user/`)**:
- Supabase (`citizen_reports` table) is real — real CRUD, with a hardcoded `SEED_REPORTS` fallback if the table is missing.
- `routingService.js` really calls the Classifier's `/route` endpoint, with a local keyword-heuristic fallback on failure — this one is honest about degrading.
- Upload-time classification is real: `SecureCameraView.jsx` (nested `user/` version) calls `/full-analysis` at upload and stores verdict/trust fields on the report.
- **Moderation flow fixed 2026-07-16**: `videoService.js`'s staged workflow progression now derives every outcome deterministically from the report's real classifier fields (`deriveModerationVerdict` — AI_GENERATED→REJECTED, AUTHENTIC+trust≥40→APPROVED, else→SUSPICIOUS review), and the flag-escalation in `App.jsx` (`handleReportVideo`) re-runs the real `/classify` on the stored video URL (`reclassifyVideoUrl`). If the classifier is unreachable, the video stays honestly in REPORTED_SUSPICIOUS ("Under Review") — no fabricated verdict. The 4-second stage animation is UI pacing only.
- Auth is real Supabase email/password (`CitizenLoginView.jsx`), **not** anonymous — despite `plan/kawach_build_spec.md` describing an anonymous-session design. Don't claim "fully anonymous accounts" in a deck; the accurate claim is "reports are de-identified before reaching departments" (verify this per Phase 5 of the master plan).
- `user/src/components/*.jsx` has a stale duplicate set of every citizen component (top-level copies alongside `user/src/components/user/`, `department/`, `admin/`). Only the nested versions are imported by `App.jsx` — treat top-level dupes as dead code, not a second implementation.

**Police backend (`police/backend`)**:
- Real: offender/relation graph construction from SQL data (`routes/network.py`), RBAC-scoped queries, z-score anomaly alerts (`routes/alerts.py`), audit logging, FIR-level SLA breach computation from stored `sla_deadline` (`routes/investigations.py`).
- **Fixed 2026-07-16 — `/hotspots` (`routes/geo.py`) now runs real DBSCAN** (haversine metric, `eps_km`/`min_samples` query params) and returns hotspot cluster centroids with member incidents + noise points flagged `is_hotspot: false`, instead of raw ungrouped points.
- **Fixed 2026-07-16 — `/reports/generate` is a real hash-sealed evidence export**: generates an actual PDF via `reportlab` from live DB rows (repeat offenders / SLA breaches / district performance), computes SHA-256 over the final PDF bytes, records the hash in the audit log, and serves the file at `/api/reports/download/{id}`. The PDF footer states the chain-of-custody + BSA §63 admissibility intent.
- **Fixed 2026-07-16 — `/analytics/predict` is deterministic**: random jitter removed; risk score = socio-economic formula + a real recent-crime-volume component (180-day FIR count per 100k), with a per-factor `score_breakdown` in the response. Identical inputs → identical scores.
- **Fixed 2026-07-16 — `/analytics/patterns` computes from real FIR rows**: weekend-vs-weekday rate delta, fastest-growing crime type (90d vs prior 90d), strongest socio-economic Pearson correlate — each card carries its `sample_size`, and cards are omitted (not faked) when data is insufficient.
- **Fixed 2026-07-16 — `/network/graph` has real fraud-ring intelligence**: Louvain community detection + betweenness/degree centrality per node (`community_id`, centrality fields), a `communities` summary block, and an explainable money-mule flag (`mule_flag`/`mule_reason`: low-prior person with 2+ ties inside a community containing risk≥70 offenders; owned Account/UPI/Phone nodes inherit the flag).
- **Fixed 2026-07-16 — Fraud Shield behavioral fusion (`routes/fraud_shield.py`)**: `/check` now adds two real signals on top of DB matches — `call_burst_anomaly` (dormant line bursting with calls in the last 7 days vs its own 90-day baseline, computed from real `Call` rows; also fires for numbers with *no* criminal record → medium-tier warning) and `mule_network_signal` (clean-history owner tied to high-risk associates/gangs). Rationale strings state exactly which signal fired. The `'420'/'999'/ends-88` patterns remain as a labeled demo heuristic only.
- **Added 2026-07-17 — Digital Arrest Live-Session Monitor** (`routes/digital_arrest.py`, mounted at `/api/digital-arrest`): `POST /session/start` → `POST /session/{id}/signal` (modalities: text scam-script scoring against a 4-category playbook bank, voice spoof prob, video deepfake prob, transaction anomaly) → deterministic weighted fusion (text .30/voice .20/video .20/transaction .30 + multi-modal corroboration bonus) → status flips to `ALERT_DISPATCHED` at ≥70 **before transfer**, audit-logged. Reuses fraud_shield's `call_burst_anomaly`/`mule_network_signal` — do not create a second fusion implementation. Sessions are in-memory (single-worker demo scale).
- **Still heuristic, honestly**: risk scoring/patterns are deterministic statistics, not trained models; `app/ml/` is still an empty module. Say "statistical intelligence," not "trained ML," in decks.

**Departments dashboard (`departments/`)**: genuinely functional against live Supabase — real read (filtered by `routed_department`) and real write (`resolveReport` sets `status: 'RESOLVED'`). Not a mockup, just framework-free. **Added 2026-07-16**: per-report SLA countdown/breach badge (`computeSla` in `app.js` — CRITICAL 15min / HIGH 4h / NORMAL 24h / LOW 72h per build spec §6.3; breached reports pulse red).

## Non-negotiable design principles (from `plan/kawach_build_spec.md`, keep enforcing these while building)

1. **Detection and reporting are separate pipelines.** The classifier never auto-files a complaint — it always asks the citizen to confirm before anything enters a department queue.
2. **Two independent booleans per upload**: `is_public_visible` (Reels) and `complaint_id`/report link — a clip can surface publicly whether or not a complaint was filed.
3. **One dashboard shell, parameterized by `department_id`** — don't hand-build separate dashboards per department.
4. **Zero paid dependencies** — every tool in the stack has a free tier sized for hackathon-scale demo traffic (Supabase, Cloudinary, HF Spaces, Gemini free tier, Render free, Neo4j Aura free/JSON fallback, WhatsApp Cloud API free tier). Check `plan/kawach_build_spec.md` §9 before adding anything paid.
5. **Department-facing tables never carry citizen identity** — only `tracking_id`/report id, location, evidence, and classifier output should be visible past the citizen app boundary.

## Data model (Supabase `citizen_reports`, as actually used by `user/` and `departments/`)

See `plan/kawach_build_spec.md` §7 for the fuller target schema (`reports`, `departments`, `classifier_results`, `evidence_packages`, `offender_graph_refs`). The live table in use today is `citizen_reports`, queried directly by both `user/src/supabaseClient.js` and `departments/app.js` (filtered by `routed_department`).

## Working conventions for this repo

- When a task touches "AI"/"ML" functionality, verify against the real-vs-heuristic table above before describing it as done — several routes look like ML but are deterministic formulas or hardcoded mocks.
- Track active work in `plan/progress_tracker.md`, not in this file — this file is architecture reference, not a task list.
- If you fix one of the caveats listed above (Gemini model, video simulation, SLA engine, evidence export, DBSCAN activation, risk-score jitter), update this file in the same change so it stays a reliable "what's real" reference.
