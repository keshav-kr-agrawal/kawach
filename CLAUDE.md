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
- **Caveat**: if `Classifier/weights/` fails to load, `/classify` and `/full-analysis` silently return random "mostly authentic" results (`main.py:146-149`) instead of erroring — always check `/health` reports real model-loaded state before trusting a demo run.
- **Caveat (as of this writing)**: `router.py:235` and `main.py:561` hardcode `gemini-1.5-flash`, which is fully shut down (404s on every call) — every routing/hotspot call using this silently degrades to keyword/statistical fallback until fixed.

**Citizen PWA (`user/`)**:
- Supabase (`citizen_reports` table) is real — real CRUD, with a hardcoded `SEED_REPORTS` fallback if the table is missing.
- `routingService.js` really calls the Classifier's `/route` endpoint, with a local keyword-heuristic fallback on failure — this one is honest about degrading.
- **`videoService.js` and the escalation logic in `App.jsx:840-886` are currently a client-side `setTimeout`/`Math.random()` simulation of the AI moderation pipeline** — not connected to the real Classifier. Don't describe this flow as "live AI classification" until this is fixed (tracked in the master plan).
- Auth is real Supabase email/password (`CitizenLoginView.jsx`), **not** anonymous — despite `plan/kawach_build_spec.md` describing an anonymous-session design. Don't claim "fully anonymous accounts" in a deck; the accurate claim is "reports are de-identified before reaching departments" (verify this per Phase 5 of the master plan).
- `user/src/components/*.jsx` has a stale duplicate set of every citizen component (top-level copies alongside `user/src/components/user/`, `department/`, `admin/`). Only the nested versions are imported by `App.jsx` — treat top-level dupes as dead code, not a second implementation.

**Police backend (`police/backend`)**:
- Real: offender/relation graph construction from SQL data (`routes/network.py`), RBAC-scoped queries, z-score anomaly alerts (`routes/alerts.py`), audit logging.
- **Heuristic dressed as ML**: predictive risk scoring (`routes/analytics.py:56-103`) is a real weighted formula but with `random.uniform` jitter added — score changes on every call for identical input. `/patterns` is fully hardcoded mock data.
- **Imported but unused**: `sklearn.cluster.DBSCAN` is imported in `routes/geo.py` but never called — `/hotspots` returns raw ungrouped points, not clusters.
- **Missing entirely**: real PDF evidence export (`/reports/generate` currently just logs an audit row and returns a fake `download_url` — no PDF, no hash), SLA/escalation engine (SLA only exists as string labels, no computed breach logic), `app/ml/` is an empty module (no dedicated ML code — everything "ML" is inlined heuristics in route handlers).

**Departments dashboard (`departments/`)**: genuinely functional against live Supabase — real read (filtered by `routed_department`) and real write (`resolveReport` sets `status: 'RESOLVED'`). Not a mockup, just framework-free.

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
