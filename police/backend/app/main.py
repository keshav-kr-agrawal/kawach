from dotenv import load_dotenv
load_dotenv()  # local dev: reads police/backend/.env; hosted: real env/secrets win

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import Base, engine
import app.models as models  # noqa: F401 — import side-effect registers every
# table on Base.metadata. MUST happen before create_all() below, or metadata
# is empty and create_all() silently creates nothing (bug hit on first Render
# deploy 2026-07-19: "relation nayak_sessions does not exist").

# Fresh-database bootstrap (Render/HF free tiers have no shell):
# create_all is idempotent and ADDITIVE ONLY — it creates missing tables and
# never touches existing ones/data.
#
# Demo-data seeding is INTENTIONALLY NOT run automatically here anymore.
# app/scripts/generate_data.py's seed_database() starts with
# Base.metadata.drop_all(bind=engine) — it drops EVERY SQLAlchemy-mapped
# table, including live Nayak chat data (nayak_sessions/messages/uploads).
# Running that on every cold boot (as SEED_ON_START used to) is a standing
# data-loss risk — caught 2026-07-19 when a boot attempted it against the
# real production database (failed only on a lock timeout, not by design).
# If you want demo FIR/offender data, run it manually, once, deliberately:
#   DATABASE_URL=<target> python -m app.scripts.generate_data
try:
    Base.metadata.create_all(bind=engine)
except Exception as _e:
    # Don't block startup on DB issues — routes will surface errors honestly.
    print(f"[BOOT] Database bootstrap warning: {_e}", flush=True)
from app.routes import auth, dashboard, geo, network, offenders, analytics, alerts, investigations, ai, audit, admin, reports, fraud_shield, ingestion, osint_scraper, webhooks, nayak, digital_arrest, ip_tracing, realtime

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set CORS origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://kawach-two.vercel.app",
        "https://kawach-daigofys.onslate.in",
        "http://localhost:5173",
        "http://localhost:5175",
        "http://localhost:3000",
        "http://localhost:8000",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app.*|https://.*\.zohocatalyst\.app.*|https://.*\.onslate\.in.*|http://localhost:.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Auth"])
app.include_router(dashboard.router, prefix=f"{settings.API_V1_STR}/dashboard", tags=["Dashboard"])
app.include_router(geo.router, prefix=f"{settings.API_V1_STR}/geo", tags=["Geo"])
app.include_router(network.router, prefix=f"{settings.API_V1_STR}/network", tags=["Network"])
app.include_router(offenders.router, prefix=f"{settings.API_V1_STR}/offenders", tags=["Offenders"])
app.include_router(analytics.router, prefix=f"{settings.API_V1_STR}/analytics", tags=["Analytics"])
app.include_router(alerts.router, prefix=f"{settings.API_V1_STR}/alerts", tags=["Alerts"])
app.include_router(investigations.router, prefix=f"{settings.API_V1_STR}/investigations", tags=["Investigations"])
app.include_router(ai.router, prefix=f"{settings.API_V1_STR}/ai", tags=["AI Copilot"])
app.include_router(audit.router, prefix=f"{settings.API_V1_STR}/audit", tags=["Audit Log"])
app.include_router(admin.router, prefix=f"{settings.API_V1_STR}/admin", tags=["Administration"])
app.include_router(reports.router, prefix=f"{settings.API_V1_STR}/reports", tags=["Reports"])
app.include_router(fraud_shield.router, prefix=f"{settings.API_V1_STR}/fraud-shield", tags=["Citizen Fraud Shield"])
app.include_router(ingestion.router, prefix=f"{settings.API_V1_STR}/ingestion", tags=["Data Ingestion Layer"])
app.include_router(osint_scraper.router, prefix=f"{settings.API_V1_STR}/osint", tags=["OSINT"])
app.include_router(webhooks.router, prefix=f"{settings.API_V1_STR}/webhooks", tags=["Webhooks"])
app.include_router(nayak.router, prefix=f"{settings.API_V1_STR}/nayak", tags=["Nayak Citizen Assistant"])
app.include_router(digital_arrest.router, prefix=f"{settings.API_V1_STR}/digital-arrest", tags=["Digital Arrest Live Monitor"])
app.include_router(ip_tracing.router, prefix=f"{settings.API_V1_STR}/ip-tracing", tags=["IP Tracing"])
app.include_router(realtime.router, prefix=f"{settings.API_V1_STR}/realtime", tags=["Realtime Telemetry & Stream"])

@app.get("/")
def read_root():
    return {"message": "Welcome to KAWACH API — AI-Driven Crime Analytics Platform"}
