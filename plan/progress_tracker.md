# KAWACH — Progress Tracker

*Edit this file by hand as work proceeds. Status values: `Not started` / `In progress` / `Done` / `Blocked`. Mirrors `plan/kawach_master_plan.md` — see that file for the "why" behind each task.*

Last updated: 2026-07-16

---

## Phase 0 — Foundation

| # | Task | Type | Status | Notes |
|---|---|---|---|---|
| 0.1 | Write/maintain `CLAUDE.md` | AI | Done | Created 2026-07-16 |
| 0.2 | Swap `gemini-1.5-flash` → `gemini-2.5-flash` (router.py:235, main.py:561) | AI | Not started | |
| 0.3 | Confirm `GEMINI_API_KEY` valid for 2.5-flash | MANUAL | Not started | |
| 0.4 | Add real-vs-mock indicator to Classifier `/health` | AI | Not started | |
| 0.5 | Confirm Postgres/Neo4j reachability, decide fallback strategy | MANUAL | Not started | |
| 0.6 | Delete stale duplicate components in `user/src/components/*.jsx` | AI | Not started | |

## Phase 1 — Make the core pipeline honest

| # | Task | Type | Status | Notes |
|---|---|---|---|---|
| 1.1 | Replace `videoService.js` simulation with real `/full-analysis` call | AI | Not started | |
| 1.2 | Fix escalation logic in `App.jsx:840-886` | AI | Not started | |
| 1.3 | Label offline/degraded fallback honestly in UI | AI | Not started | |
| 1.4 | Add SLA severity→minutes mapping + `is_breached` field | AI | Not started | |
| 1.5 | Render SLA breach badge in `departments/app.js` | AI | Not started | |
| 1.6 | Real PDF evidence export with SHA-256 hash | AI | Not started | |
| 1.7 | Activate DBSCAN clustering in `geo.py` `/hotspots` | AI | Not started | |

## Phase 2 — Upgrade the intelligence layer

| # | Task | Type | Status | Notes |
|---|---|---|---|---|
| 2.1 | Remove random jitter from `predict_district_risk` | AI | Not started | |
| 2.2 | Compute `/patterns` from real seeded FIR data | AI | Not started | |
| 2.3 | Add Louvain community detection + centrality to offender graph | AI | Not started | |
| 2.4 | Add money-mule shared-attribute heuristic | AI | Not started | |
| 2.5 | Add transaction-anomaly bonus signal to digital-arrest fusion score | AI | Not started | |

## Phase 3 — Digital Arrest & Fraud Shield completion

| # | Task | Type | Status | Notes |
|---|---|---|---|---|
| 3.1 | Build/confirm live "simulate active call" risk-score demo flow | AI | Not started | |
| 3.2 | Unify `fraud_shield.py` with citizen-side risk score | AI | Not started | |
| 3.3 | Register WhatsApp Cloud API sandbox (optional) | MANUAL | Not started | |
| 3.4 | Wire WhatsApp webhook to fusion classifier (optional) | AI | Not started | Depends on 3.3 |

## Phase 4 — Counterfeit detection hardening

| # | Task | Type | Status | Notes |
|---|---|---|---|---|
| 4.1 | Gather/confirm labeled test set per denomination | MANUAL | Not started | |
| 4.2 | Write per-denomination accuracy eval script | AI | Not started | Depends on 4.1 |
| 4.3 | Add second-opinion heuristic layer (optional) | AI | Not started | |

## Phase 5 — Trust, anonymity & UX honesty pass

| # | Task | Type | Status | Notes |
|---|---|---|---|---|
| 5.1 | Audit `citizen_reports` + queries for PII exposure | AI | Not started | |
| 5.2 | Adjust deck/UI copy to match verified reality | MANUAL | Not started | Depends on 5.1 |
| 5.3 | Add lightweight anonymous/guest session mode (optional) | AI | Not started | |

## Phase 6 — End-to-end verification & submission deliverables

| # | Task | Type | Status | Notes |
|---|---|---|---|---|
| 6.1 | Full local 3-service end-to-end walkthrough, fix breakages | MANUAL+AI | Not started | Final gate — do last |
| 6.2 | Export architecture diagram to static image/PDF | AI+MANUAL | Not started | |
| 6.3 | Build presentation deck mapped to judging weights | MANUAL+AI | Not started | |
| 6.4 | Script and record demo video | MANUAL | Not started | |

---

## Nayak Assistant (parallel track — see `plan/nayak_assistant_plan.md`)

*Owned separately from the phases above; sequence and detail live in the dedicated plan file. Tracked here so both work streams are visible in one place.*

| # | Task | Type | Status | Notes |
|---|---|---|---|---|
| N.1 | Build law knowledge corpus (BNS/BNSS/BSA, IT Act, DPDP Act, RBI/NPCI UPI-fraud circulars, TRAI/DoT spoofing rules, NCRB/1930 procedures) | MANUAL | Not started | Highest-leverage, most manual task — do first |
| N.2 | Stand up retrieval pipeline (Supabase pgvector + embeddings) for the corpus | AI | Not started | Depends on N.1 (partial corpus is enough to start) |
| N.3 | Build `search_law` tool + citation-backed law Q&A | AI | Not started | Depends on N.2 |
| N.4 | Build Nayak agent core (Gemini 2.5 Flash function-calling, `nayak_sessions`/`nayak_messages` schema) | AI | Not started | |
| N.5 | Wire existing Classifier tools (`classify_video`, `classify_currency`) into the agent | AI | Not started | Reuses real, already-working pipelines |
| N.6 | Build `check_link` (gov portal / phishing legitimacy check) | AI | Not started | New — doesn't exist anywhere in the repo yet |
| N.7 | Build `classify_text` (scam-script detection) | AI | Not started | New — few-shot prompt design needed |
| N.8 | Build `get_area_incidents` (situational awareness) | AI | Not started | Reads existing `citizen_reports` geodata |
| N.9 | Build escalation handoff (`propose_report` → citizen confirms → `citizen_reports` row, structured for the police-side graph) | AI | Not started | Coordinate with whoever owns master-plan Phase 2 (graph/mule detection) on payload fields |
| N.10 | Replace `AlertsChatView.jsx`'s fake simulation with the real agent | AI | Not started | Keep existing UI shell, swap what powers it |

---

## Quick status summary

- **Total tasks**: 40 (30 across the 6 main phases + 10 in the Nayak track)
- **Done**: 1
- **In progress**: 0
- **Blocked**: 0
- **Not started**: 39
