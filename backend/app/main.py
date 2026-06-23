from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routes import auth, dashboard, geo, network, offenders, analytics, alerts, investigations, ai, audit, admin, reports, fraud_shield

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set CORS origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, specify actual origins
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

@app.get("/")
def read_root():
    return {"message": "Welcome to KAWACH API — AI-Driven Crime Analytics Platform"}
