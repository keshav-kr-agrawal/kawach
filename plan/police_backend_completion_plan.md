# Complete the police console backend — seed the missing case data

## Context

Audited every route the police console calls (`#/live-monitor` and others) plus the live Render/Supabase Postgres directly. Finding: the backend code is **not fake** — dashboard, investigations, offenders, network graph, predictive risk, alerts, case terminal, fraud shield, reports, and IP tracing all run real SQL queries against real tables (matches CLAUDE.md's documented "real, not heuristic" status). The problem: **the production database has zero rows in every case-data table.**

Row counts pulled directly from the live pooler DB (`aws-1-ap-southeast-1.pooler.supabase.com`):

```
offenders: 0        fir_records: 0       gangs: 0          phones: 0
accounts: 0         calls: 0             telecom_cdrs: 0   districts: 0
police_stations: 0  vehicles: 0          locations: 0      visits: 0
rbi_fraud_registry: 0   missing_persons: 0   unidentified_bodies: 0
socio_economic_indicators: 0   nayak_law_chunks: 0
```

versus tables that DO have real live data and must not be touched:

```
nayak_sessions: 124   nayak_messages: 413   nayak_user_uploads: 109
citizen_reports: 5    users: 4              audit_logs: 6
ip_sightings: 3       ip_watchlist: 0
```

Real code + zero data = every page except Alerts (has its own baked-in fallback) and Hotspots (falls back to an in-memory Neo4j mock with ~100 entities when real Neo4j Aura isn't configured) looks broken or empty. Seeding the missing tables once unlocks Command Deck, Investigations, Offenders Registry, Network Graph, Predictive Risk/Patterns, Reports/Dossiers, Fraud Shield matches, Case Terminal lookups, and IP Tracing's case-match feature simultaneously, since they all read the same handful of tables.

**The trap**: `police/backend/app/scripts/generate_data.py`'s `seed_database()` starts with `Base.metadata.drop_all(bind=engine)`. Running it as-is against production would destroy the live Nayak chat history (`nayak_sessions`/`nayak_messages`/`nayak_user_uploads`), since those are SQLAlchemy-mapped tables sharing the same `Base.metadata`. `citizen_reports` is safe regardless (Supabase-only table, not a model in this codebase) — but Nayak's tables are definitely in scope of `drop_all` and would be wiped.

## Plan

### 1. Make the seeder safe to run against a database that already holds live data
In `police/backend/app/scripts/generate_data.py`, add an additive mode that skips the destructive reset:
- Read `os.getenv("SEED_MODE", "reset")`; if `"additive"`, only run `Base.metadata.create_all(bind=engine)` (creates missing tables, touches nothing existing) and skip `drop_all`.
- No other change needed — every target table is currently empty, so the existing insert logic runs identically whether the table was just created or already existed but empty. Default (`"reset"`) behavior stays unchanged for local dev resets.

### 2. Run the additive seed once against production
With `SEED_MODE=additive` and `DATABASE_URL` pointed at the pooler URL already in `police/backend/.env`, run `python -m app.scripts.generate_data` once. Populates Districts, PoliceStations, Offenders, Gangs, Vehicles, Phones, Accounts, Calls, TelecomCDRs, FIRRecords, SocioEconomicIndicators, MissingPersons, UnidentifiedBodies, RBIFraudRegistry, Locations, Visits — all currently-empty tables, none of the live ones.

### 3. Seed the Nayak legal RAG knowledge base (independent, also safe/additive)
`app/scripts/seed_entire_rulebook.py` already only does `create_all` (no drop) but has a hardcoded Mac path (`/Users/keshav/zoho/standardized_rulebook`). Point `RULEBOOK_DIR` at the repo's own `standardized_rulebook/` directory and run it once against production. Fills the currently-empty `nayak_law_chunks` table so Nayak's legal citations cite real sections instead of running with no knowledge base.

### 4. Verify end-to-end
- Re-run the row-count query to confirm target tables are populated and live tables (`nayak_*`, `citizen_reports`, `users`, `audit_logs`, `ip_sightings`, `ip_watchlist`) are untouched (same counts as before).
- Hit these with a fresh `dgp`/`dgp123` token and confirm non-empty output: `/dashboard/summary`, `/dashboard/trend`, `/network/graph`, `/investigations`, `/offenders/repeat`, `/analytics/predict`, `/analytics/patterns`, `/ip-tracing/103.85.12.44` (should now hit the real case-match path).
- On the live site, click through Command Deck, Investigations, Offenders Registry, Fraud Network, District Risk, Fraud Shield (try a phone number that now matches a seeded offender), Case Terminal, and Live Arrest Monitor (start a session with a suspect phone that now has real Call rows, confirm the pre-check behavioral signal fires) — each should show real data instead of empty states.
- Rebuild the police console bundle (`cd police/frontend && npx vite build --base=./`, copy `dist/` into `user/public/police/`) only if an empty-state copy needs adjusting — likely unnecessary.

## Out of scope
- Neo4j — Hotspots and Case Terminal's graph-RAG context already degrade to a populated in-memory mock when `NEO4J_URI` isn't configured (documented, intentional fallback). Separate task if you want real Neo4j Aura wired up.
- No page's logic or UI needs to change — every route audited is real SQL/computation, not a feature that needs rewriting.
