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
- `/health` now reports `deepfake_mode` (`real`/`mock_fallback`), `routing_mode` (`gemini`/`keyword_fallback`), and `gemini_model` — **check this before any demo run**: if weights aren't loaded, `/classify` and `/full-analysis` still fall back to mock "mostly authentic" results (`_mock_deepfake` in `main.py`), but the degradation is now visible instead of silent.

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
- **Still heuristic dressed as ML**: predictive risk scoring (`routes/analytics.py:56-103`) is a real weighted formula but with `random.uniform` jitter added — score changes on every call for identical input. `/patterns` is fully hardcoded mock data. `app/ml/` is still an empty module.

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
