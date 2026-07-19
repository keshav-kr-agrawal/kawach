# KAWACH — Progress Tracker

*Edit this file by hand as work proceeds. Status values: `Not started` / `In progress` / `Done` / `Blocked`. Mirrors `plan/kawach_master_plan.md` — see that file for the "why" behind each task.*

Last updated: 2026-07-17 (Phases 0-3 AI-tasks done; **currency CNN trained & deployed — 98.67% test acc on n=1,352, per-denomination numbers in `Classifier/weights/currency/eval_report.json`**; Pipeline 7 fully implements the ET PS bullet; PII audit done)

---

## Phase 0 — Foundation

| # | Task | Type | Status | Notes |
|---|---|---|---|---|
| 0.1 | Write/maintain `CLAUDE.md` | AI | Done | Created 2026-07-16 |
| 0.2 | Swap `gemini-1.5-flash` → `gemini-2.5-flash` (router.py:235, main.py:561) | AI | Done | 2026-07-16 — env-overridable via `GEMINI_MODEL`; README/pipeline.md updated too |
| 0.3 | Confirm `GEMINI_API_KEY` valid for 2.5-flash | MANUAL | Not started | Check local `.env` AND the HF Space env vars |
| 0.4 | Add real-vs-mock indicator to Classifier `/health` | AI | Done | 2026-07-16 — `/health` now reports `deepfake_mode`, `routing_mode`, `gemini_model` |
| 0.5 | Confirm Postgres/Neo4j reachability, decide fallback strategy | MANUAL | Done | Verified Postgres reachability; implemented in-memory fallback for Neo4j & keyword fallback for Postgres |
| 0.6 | Delete stale duplicate components in `user/src/components/*.jsx` | AI | Done | 2026-07-16 — deleted 8 files directly under components/ that duplicated user/ |

## Phase 1 — Make the core pipeline honest

| # | Task | Type | Status | Notes |
|---|---|---|---|---|
| 1.1 | Replace `videoService.js` simulation with real `/full-analysis` call | AI | Done | 2026-07-16 — upload-time `/full-analysis` was already real; moderation verdicts now derive deterministically from its stored output (`deriveModerationVerdict`), no more `Math.random()` |
| 1.2 | Fix escalation logic in `App.jsx:840-886` | AI | Done | 2026-07-16 — flag-escalation re-runs real `/classify` on the stored video URL (`reclassifyVideoUrl`) |
| 1.3 | Label offline/degraded fallback honestly in UI | AI | Done | 2026-07-16 — classifier unreachable ⇒ video stays REPORTED_SUSPICIOUS ("Under Review"), never a fabricated verdict |
| 1.4 | Add SLA severity→minutes mapping + `is_breached` field | AI | Done | 2026-07-16 — FIR-level SLA already existed in `investigations.py`; citizen-report tiers (15m/4h/24h/72h) added client-side in `departments/app.js` (`computeSla`) since that dashboard reads Supabase directly |
| 1.5 | Render SLA breach badge in `departments/app.js` | AI | Done | 2026-07-16 — countdown badge + pulsing red breach badge |
| 1.6 | Real PDF evidence export with SHA-256 hash | AI | Done | 2026-07-16 — `reportlab` PDF from live DB rows, SHA-256 sealed + audit-logged, served at `/api/reports/download/{id}`; verified end-to-end locally |
| 1.7 | Activate DBSCAN clustering in `geo.py` `/hotspots` | AI | Done | 2026-07-16 — haversine DBSCAN, cluster centroids + noise flagging; clustering math smoke-tested |

## Phase 2 — Upgrade the intelligence layer

| # | Task | Type | Status | Notes |
|---|---|---|---|---|
| 2.1 | Remove random jitter from `predict_district_risk` | AI | Done | 2026-07-16 — deterministic; added real 180-day crime-volume component + per-factor `score_breakdown` |
| 2.2 | Compute `/patterns` from real seeded FIR data | AI | Done | 2026-07-16 — weekend delta, 90d trend shift, socio-economic Pearson correlate; cards omitted (not faked) on thin data |
| 2.3 | Add Louvain community detection + centrality to offender graph | AI | Done | 2026-07-16 — `community_id` + betweenness/degree per node, `communities` summary block; Louvain path smoke-tested |
| 2.4 | Add money-mule shared-attribute heuristic | AI | Done | 2026-07-16 — explainable `mule_flag`/`mule_reason` (low-prior + 2+ ties into risk≥70 community); owned Account/UPI/Phone nodes inherit flag |
| 2.5 | Add transaction-anomaly bonus signal to digital-arrest fusion score | AI | Done | 2026-07-16 — `call_burst_anomaly` (dormancy-burst from real Call rows, fires even for unknown numbers) + `mule_network_signal` fused into Fraud Shield `/check` |

## Phase 3 — Digital Arrest & Fraud Shield completion

| # | Task | Type | Status | Notes |
|---|---|---|---|---|
| 3.1 | Build/confirm live "simulate active call" risk-score demo flow | AI | Done | 2026-07-17 — new `routes/digital_arrest.py`: session start → per-modality signal ingestion (text/voice/video/transaction) → deterministic weighted fusion → 🚨 ALERT_DISPATCHED pre-transfer at score ≥70, audit-logged. Fusion math unit-tested (real scam script = 1.0, benign = 0.0, multi-modal escalation crosses threshold, single weak signal stays at 7.5) |
| 3.2 | Unify `fraud_shield.py` with citizen-side risk score | AI | Done | 2026-07-17 — session engine imports `call_burst_anomaly`/`mule_network_signal` from fraud_shield (one fusion vocabulary, zero duplication); suspect line pre-checked at session open |
| 3.3 | Register WhatsApp Cloud API sandbox (optional) | MANUAL | Not started | |
| 3.4 | Wire WhatsApp webhook to fusion classifier (optional) | AI | Not started | Depends on 3.3 |

## Phase 4 — Counterfeit detection hardening

**⚠ Reality check 2026-07-17: no currency model existed anywhere in the repo — the architecture docs described it but nothing was implemented. Now built as Classifier Pipeline 7.**

| # | Task | Type | Status | Notes |
|---|---|---|---|---|
| 4.0 | Build Pipeline 7 `/classify-currency` (CNN slot + classical security-feature CV + honest fusion) | AI | Done | 2026-07-17 — `app/currency_detector.py`: security-thread band, microprint sharpness (Laplacian), print-noise profile; CNN/heuristic disagreement ⇒ INCONCLUSIVE (never overclaim); `model_mode` disclosed in every response + `/health` `currency_mode` |
| 4.0b | Deep research: hunt HF/GitHub for a pretrained INR-counterfeit model | AI | Done | 2026-07-17 — **conclusion: none exist at usable quality.** HF Hub API search: only a zero-download `.pth` with no model card/license/class mapping (correctly declined to blind-load it), and a weights-free README repo. GitHub best option reports no accuracy numbers, trained on ~5-7 images/note. Your own `train_currency_model.py` is the path — no shortcut exists |
| 4.0c | Add serial-number ascending-numeral check (matches ps.txt "serial number pattern validation") | AI | Done | 2026-07-17 — real RBI-documented feature (Mahatma Gandhi series notes print number-panel digits in ascending size L-to-R since 2015-16); implemented via EasyOCR (already installed, no Tesseract binary needed) + column ink-height profiling. Unit-tested: synthetic ascending panel → score 1.0, flat panel → 0.5 neutral (not falsely accused) |
| 4.0d | Add UV feature check (matches ps.txt "UV feature simulation") | AI | Done | 2026-07-17 — **honestly gated**: only activates on `capture_mode="uv"` with a UV-lit photo; normal-light photos get `not_applicable`, never a fabricated verdict (a phone camera can't simulate UV fluorescence from visible light — faking it would break the project's no-silent-fakes rule). Unit-tested: narrow colored glow → 1.0, broad whole-note glow → 0.3 (flags a real counterfeiting tell), visible mode → honestly skipped |
| 4.1 | Gather labeled real/fake INR dataset per denomination | MANUAL | **Done** | 2026-07-17, three runs to get there: run 1 (Colab) died on the 7.7GB download → 121 images, useless. Run 2 (Kaggle) hit Kaggle's new mount layout — all 6 datasets mounted under one `datasets/` parent, and dataset slugs containing both "real" and "fake" made the labeler skip ~12.5k images as ambiguous. Fixed discovery (`find_dataset_roots` handles both layouts) + labeling (classifies on paths *inside* each dataset only). Run 3: all 6 datasets contributed — 14,203 raw images, 9,007 after dedup/cap into 6,304 train / 1,351 val / 1,352 test |
| 4.2 | Train CNN + per-denomination accuracy eval | AI+MANUAL | **Done — model deployed** | 2026-07-17 final run (Kaggle T4): EfficientNet-B0, test n=1,352 → **98.67% acc, fake-precision 0.964, fake-recall 0.982, AUC 0.998**. Per-denom: ₹10 99.2% (n=378), ₹20/50/100/200 100% (n=88–146), ₹500 99.1% (n=220), **₹2000 89.4% (n=47 — weak spot, thin fake data)**, unknown-denom bucket missed its few fakes. Deployed to `Classifier/weights/currency/` and verified locally: loads as `cnn+heuristic`, fused inference ~1.1s/img CPU. Also fixed en route: AUC orientation bug (fake=idx0), stratified-split crash, CUDA env mismatch (session restart). Deck rule: quote per-denomination, flag ₹2000 honestly |
| 4.2b | Upgrade checkpoint format to self-describing multi-arch (`{arch, classes, state_dict}`) | AI | Done | 2026-07-17 — `_ARCH_REGISTRY` in `currency_detector.py` supports `efficientnet_b0` (new default — best accuracy/CPU-latency tradeoff), `mobilenet_v3_small`, `mobilenet_v3_large`. Loader reads `arch` from the checkpoint and builds the matching model — no hardcoded architecture assumption. Round-trip tested: save → load → inference all verified |
| 4.3 | Add second-opinion heuristic layer | AI | Done | 2026-07-17 — built into Pipeline 7 from day one (three classical checks fused with the CNN) |

## Phase 5 — Trust, anonymity & UX honesty pass

| # | Task | Type | Status | Notes |
|---|---|---|---|---|
| 5.1 | Audit `citizen_reports` + queries for PII exposure | AI | Done | 2026-07-17 — **found & fixed**: `departments/app.js`, police `ExecutiveDashboardView.jsx`, `MultiDepartmentView.jsx` all used `select('*')`, leaking `uploader_uuid` (device-linked ID) across the anonymity boundary. All three now use explicit safe column lists. Note: table has no name/email/phone columns — `uploader_uuid` was the only identity-adjacent field |
| 5.2 | Adjust deck/UI copy to match verified reality | MANUAL | Not started | 5.1 verdict for deck language: "de-identified reports — departments receive only report content, location, and AI scores; no account or device identifiers" |
| 5.3 | Add lightweight anonymous/guest session mode (optional) | AI | Not started | |

## Phase 6 — End-to-end verification & submission deliverables

| # | Task | Type | Status | Notes |
|---|---|---|---|---|
| 6.1 | Full local 3-service end-to-end walkthrough, fix breakages | MANUAL+AI | Not started | Final gate — do last |
| 6.2 | Export architecture diagram to static image/PDF | AI+MANUAL | Not started | |
| 6.3 | Build presentation deck mapped to judging weights | MANUAL+AI | Not started | |
| 6.4 | Script and record demo video | MANUAL | Not started | |

---

## Citizen-Flow Completion (2026-07-17 — from the full-flow audit; see plan file "Nayak-Centred Citizen Flow")

| # | Task | Status | Notes |
|---|---|---|---|
| CF.A | Foundation: `nayakService.js` (env API base + X-User-Id), `reportService.js` (single shared insert), `mediaService.js` (real Cloudinary/Supabase upload) | Done | Kills hardcoded localhost:8000 + default-citizen-uuid; **invariant verified: `.insert` on citizen_reports exists only in reportService.js** |
| CF.B | Chat media upload made real + verdict bubbles + Nayak upload memory | Done | Was sending fabricated `uploads/<name>` path — now real bytes→URL→classifier; backend injects last-5 upload verdicts into LLM context (and fallback replies) |
| CF.C | Nayak escalation → citizen-confirmed report (missing "Path A") | Done | `propose_report` enriched (dept/severity/evidence/nearby-similar via `get_area_incidents`), returned as top-level `proposal`, rendered as confirmation card; File→`createReport(source='nayak_chat')`+`link-report` endpoint sets `NayakUserUpload.linked_report_id`; deterministic proposal also fires in no-Gemini fallback when last upload was flagged. Never auto-files |
| CF.D | 🚨 Emergency button in chat header + modal | Done | Category/description/evidence → CRITICAL dispatch; AI routing advisory-only (files even with classifier down) |
| CF.E | Feed community escalation | Done | ≥5 upvotes on approved post → AI reportability re-check → same row flagged `escalation_required` + priority≥HIGH (no second report); pills in feed + ⬆ ESCALATED badge in departments dashboard |
| CF.F | Flag → temp removal → human verification | Done | 2+ flags: hidden from feed (owner sees "under review") + map; AI reclassify now advisory-only; new AdminView "Content Moderation" tab (Supabase queue, Approve & Restore / Confirm Removal) |
| CF.G | Hardening | Done | in-flight send/attach guards (session race), history-load retry bar, geolocation in chat (Bengaluru fallback), honest audio/doc scope message. Vite build green |
| CF.manual | Supabase schema | **User** | Optional but recommended: `ALTER TABLE citizen_reports ADD COLUMN source text, ADD COLUMN nayak_session_id text;` — inserts auto-retry without these columns until added |

## Departments Restructure + Deployment Wiring (2026-07-17)

| # | Task | Status | Notes |
|---|---|---|---|
| DP.1 | `user/.env` production-ready in git | Done | Already tracked (predates gitignore rule) — Vercel builds read it; classifier URL = HF Space; `VITE_POLICE_API_URL` documented for future Render deploy |
| DP.2 | 10 per-department config files + registry (`departments/js/config/`) | Done | All spec §6.2 departments; CONSTRUCTION split Roads/Buildings by sub_category; Fire `minPriority: CRITICAL` |
| DP.3 | Shared SLA & escalation engine (`js/core/sla.js`) | Done | Single module for tiers/floors/breach math — node-tested (fire floor + breach timing verified) |
| DP.4 | One dashboard shell (`dashboard.html?dept=<id>`) | Done | Spec principle #3 — replaces per-dept hand-building; added SLA-breached KPI |
| DP.5 | Master Admin console (`admin.html`) | Done | City totals, per-dept pressure grid (breach-sorted), live escalation feed (breach+escalated) |
| DP.6 | Retire `departments/app.js` | Done | Deleted; logic split into core/config modules; all 15 modules parse-checked |
| DP.7 | Police in registry + admin aggregation | Done | 2026-07-17 — `depts/police.js` (matchCodes POLICE+DISASTER, HIGH SLA floor); admin now covers all 11; node test extended |
| DP.8 | `police/backend/Dockerfile` for HF Spaces (port 7860) + dotenv wiring (`load_dotenv` in both backends) + gitignored `.env` files with placeholders | Done | 2026-07-17 — police backend can now deploy as its OWN HF Docker Space (recommended over merging into the Classifier Space: separate deps/restarts). `python-dotenv` added to both requirements |
| DP.9 | Render-ready deploy: `render.yaml` blueprint (free tier, native Python — no Docker) + fresh-DB bootstrap in `main.py` (`create_all` at startup + `SEED_ON_START=1` one-time demo seed, guarded on empty DB) | Done | 2026-07-17 — Render free has no shell, so table creation/seeding must happen at boot; Dockerfile kept for any container host |
| DP.10 | Supabase `DATABASE_URL` resolved + verified | Done | 2026-07-17 — direct-connection host (`db.<ref>.supabase.co`) is IPv6-only, unreachable from this sandbox and from Render. Fixed by using the **Session Pooler** URI instead (`aws-1-ap-southeast-1.pooler.supabase.com`, user `postgres.<ref>`). Live-tested: connects, PG 17.6, sees existing `citizen_reports` table. Password confirmed correct. Saved in `police/backend/.env` (gitignored) |
| DP.12 | **Fixed critical boot bug**: first live Render deploy 500'd on every Nayak route (`relation "nayak_sessions" does not exist`) | Done | 2026-07-19 — root cause: `main.py`'s `Base.metadata.create_all()` ran BEFORE `app.models` was ever imported anywhere, so SQLAlchemy's table registry was empty at that moment — create_all silently created 0 tables. Fix: `import app.models` moved before `create_all()`. Verified two ways: (1) ran the fixed boot sequence directly against the real Supabase DB — confirmed all 26 tables now exist; (2) hit the live Render URL — `/api/nayak/sessions` returns `200 []`. Committed + pushed (`f6101de`) |
| DP.13 | **Fixed Gemini model lockout**: new API key gets `404 "no longer available to new users"` on `gemini-2.5-flash`/`gemini-2.5-flash-lite` | Done | 2026-07-19 — Google restricts those model IDs for accounts created after some cutoff (Classifier's separate, older key is unaffected — don't cross-wire the two keys). `nayak.py`'s 3 hardcoded Gemini URLs (check_link, classify_text, main chat loop) now use a module-level `GEMINI_MODEL` env-overridable constant, defaulting to `gemini-flash-latest` (Google's self-updating alias). Verified live with the real key: correct, on-topic digital-arrest advisory response. Key saved in `police/backend/.env` (gitignored). Committed + pushed (`420db74`) |
| DP.14 | **Fixed the real reason Nayak stayed on the fallback template even with a valid Gemini key**: `UnicodeEncodeError` silently swallowed | Done | 2026-07-19 — reproduced locally by calling `handle_nayak_chat()` directly against the real DB+key: with default console encoding, a print() of Gemini's emoji-laden response text threw `UnicodeEncodeError`, caught by nayak.py's broad `except Exception` and disguised as a generic "Gemini agent loop error" (previously an unlabeled catch — also improved to log the exception TYPE now, and every `[NAYAK]`/`[RAG]` print uses `flush=True`). With `PYTHONIOENCODING=utf-8` forced, the exact same call returns a real, correct Gemini response. Fix: `PYTHONUTF8=1` + `PYTHONUNBUFFERED=1` added to `render.yaml`. Also fixed `text-embedding-004` (404, same new-account restriction as gemini-2.5-flash) → `gemini-embedding-001`, live-verified |
| DP.15 | **Fixed the ACTUAL root cause** (my UTF-8 fix was real but not the main blocker; teammate's "thinking parts" filter was real but incomplete): Nayak's agent loop only supported ONE round of tool-calling, but the system prompt explicitly chains tools (classify_text → propose_report, get_area_incidents → propose_report) | Done | 2026-07-19 — reproduced by tracing a real scam message end to end against the live API: 1st call → `classify_text`, 2nd call (after feeding the result back) → `propose_report` (not text!) — old code did `.get("text", "I'm sorry...")` blindly, silently returning the canned apology. Rewrote `handle_nayak_chat`'s Gemini section as a bounded loop (max 4 hops), executing chained tool calls until real text arrives; forces one final tools-stripped completion if the cap is hit. **Verified live, two-turn, against real DB+Gemini**: correct scam ID, link flagged, area-check run, confirmation offered, and on "yes" a fully-formed CRITICAL/POLICE `propose_report` proposal returned. Commit `9df56ee` |
| DP.16 | Also fixed en route: `run_check_link`'s Gemini fallback had only a 5s timeout (too short, was silently timing out and falling to the heuristic default — harmless but noisy in logs) | Noted, not yet bumped | Low priority — heuristic fallback (whitelist + red-flag keywords) already covers this correctly; only cosmetic |
| DP.next | Update `GEMINI_API_KEY` on Render to the current key + remove `/api/nayak/_debug_env` once confirmed | **User** | Render dashboard → `kawach-police` → Environment → set `GEMINI_API_KEY` to the value in `police/backend/.env` (gitignored, never commit the literal key to any tracked file — see DP.17) → save (redeploys) → test on `kawach-two.vercel.app` |
| DP.17 | **🔴 Security incident: real Gemini key committed in plain text to this file (this row), pushed to public GitHub, auto-flagged by Google's leak scanner** | Fixed + rotate required | 2026-07-19 — my error: wrote the literal key value into a DP.next row above instead of referencing `police/backend/.env`. Redacted here immediately on discovery. **The exposed key must be treated as permanently compromised** — it's in git history (`git log -p`) regardless of this edit; scrub from history AND rotate to a fresh key. Scanned all tracked files for both known keys + the Supabase DB password — this was the only leak found |
| DP.next | Deploy `police/backend` on Render (unblocks Nayak on the live site) | **User** | Render → New → Blueprint → pick the GitHub repo (reads `render.yaml`) → paste the verified pooler `DATABASE_URL` from `police/backend/.env` + `GEMINI_API_KEY` + `JWT_SECRET` → deploy → after first successful boot set `SEED_ON_START=0` → set `VITE_POLICE_API_URL=https://kawach-police.onrender.com` in user/.env and push |
| DP.11 | Host `departments/` (dashboards + admin) — currently undeployed | **User** | Not part of the `user/` Vercel build (confirmed: Vercel project root = `user/` only). New Vercel project → same repo → Root Directory = `departments` → Framework: Other (static, no build) |

## Nayak Assistant (parallel track — see `plan/nayak_assistant_plan.md`)

*Owned separately from the phases above; sequence and detail live in the dedicated plan file. Tracked here so both work streams are visible in one place.*

| # | Task | Type | Status | Notes |
|---|---|---|---|---|
| N.1 | Build law knowledge corpus seed and database models | MANUAL | Done | Seeder script populated database |
| N.2 | Stand up retrieval pipeline (Postgres JSONB + numpy similarity) | AI | Done | Cosine similarity implemented in python |
| N.3 | Build `search_law` RAG tool with citation capability | AI | Done | Works with vector similarity or keyword fallback |
| N.4 | Build Nayak agent core (Gemini 2.5 Flash function-calling + sessions) | AI | Done | Fully implemented using FastAPI and HTTP requests |
| N.5 | Wire existing Classifier tools (`classify_video`, `classify_currency`) | AI | Done | **Re-done 2026-07-17**: the original handler returned hardcoded fake verdicts (every video "deepfake 12.5", every image "authentic 98.4"). Now fetches the media and calls the real Classifier — video→`/classify`, image→`/classify-currency` (new Pipeline 7); unreachable ⇒ honest `PENDING_ANALYSIS`, never fabricated. Set `CLASSIFIER_URL` env in deployment |
| N.6 | Build `check_link` government whitelist and red flags tool | AI | Done | Whitelist matches + typosquat heuristics + Gemini fallback |
| N.7 | Build `classify_text` digital arrest script classifier tool | AI | Done | Checks pre-filters + Gemini analysis |
| N.8 | Build `get_area_incidents` situational awareness tool | AI | Done | Proximity checks against citizen_reports |
| N.9 | Build escalation handoff (`propose_report` pre-fills) | AI | Done | Prefills categories, phone, bank fields for confirmation |
| N.10 | Replace `AlertsChatView.jsx`'s fake simulation with the real agent | AI | Done | Connected to backend API with active local session memory |

---

## Quick status summary

- **Total tasks**: 47 (37 across the 6 main phases + 10 in the Nayak track)
- **Done**: 38 (0.1, 0.2, 0.4, 0.5, 0.6, 1.1–1.7, 2.1–2.5, 3.1–3.2, 4.0, 4.0b, 4.0c, 4.0d, 4.1, 4.2, 4.2b, 4.3, 5.1, N.1–N.10)
- **Waiting on user / Not started**: 9 (0.3 Gemini key check, 3.3–3.4 WhatsApp, 5.2–5.3 copy/session, 6.1–6.4 verification/deliverables)

