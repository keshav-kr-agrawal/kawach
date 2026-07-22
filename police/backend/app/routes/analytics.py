from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Any
from app.database import get_db
from app.models import District, SocioEconomicIndicator, FIRRecord, PoliceStation

router = APIRouter()

@router.get("/correlation")
def get_socio_economic_correlation(db: Session = Depends(get_db)):
    # Pull district socio-economic indicators and join with total crime count
    indicators = db.query(SocioEconomicIndicator).all()
    if not indicators:
        return {}
        
    # Build data frame
    data = []
    for ind in indicators:
        # Get crime count for this district in this year
        # (approximate by matching station district)
        crime_count = db.query(FIRRecord).join(PoliceStation)\
            .filter(PoliceStation.district_id == ind.district_id)\
            .filter(func.extract('year', FIRRecord.date_filed) == ind.year).count()
            
        # Get district metadata
        dist = db.query(District).filter(District.id == ind.district_id).first()
        if not dist:
            continue
            
        crime_rate = (crime_count / dist.population) * 100000 if dist.population else 0
        
        data.append({
            "poverty_rate": ind.poverty_rate,
            "unemployment_rate": dist.unemployment_rate,
            "gdp_per_capita": ind.gdp_per_capita,
            "school_density": ind.school_density,
            "hospital_density": ind.hospital_density,
            "police_per_capita": ind.police_per_capita,
            "crime_rate": crime_rate
        })
        
    df = pd.DataFrame(data)
    if df.empty:
        return {}
        
    corr_matrix = df.corr().fillna(0).to_dict()

    # Return formatted correlation response
    # e.g., list of key correlations to render a matrix/heatmap easily
    return corr_matrix

@router.get("/predict")
def predict_district_risk(db: Session = Depends(get_db)):
    """
    District risk scoring: deterministic weighted model over socio-economic
    indicators PLUS observed recent crime volume. Identical inputs always
    produce identical scores — no random jitter (a score that changes on
    refresh is indefensible under scrutiny).

    Weights: unemployment ≤30, poverty ≤25, police-density deficit ≤20,
    recent crime rate per 100k ≤25.
    """
    districts = db.query(District).all()

    # Recent 180-day FIR count per district (single grouped query)
    cutoff = datetime.utcnow() - timedelta(days=180)
    crime_counts = dict(
        db.query(PoliceStation.district_id, func.count(FIRRecord.id))
        .join(FIRRecord, FIRRecord.police_station_id == PoliceStation.id)
        .filter(FIRRecord.date_filed >= cutoff)
        .group_by(PoliceStation.district_id)
        .all()
    )

    predictions = []
    for dist in districts:
        recent_indicator = db.query(SocioEconomicIndicator)\
            .filter(SocioEconomicIndicator.district_id == dist.id)\
            .order_by(SocioEconomicIndicator.year.desc()).first()

        poverty = recent_indicator.poverty_rate if recent_indicator else 15.0
        police_capita = recent_indicator.police_per_capita if recent_indicator else 100.0

        recent_crimes = crime_counts.get(dist.id, 0)
        crime_per_100k = (recent_crimes / dist.population) * 100000 if dist.population else 0.0

        unemp_score = min(dist.unemployment_rate * 6, 30)        # up to 30
        poverty_score = min(poverty * 1.25, 25)                  # up to 25
        police_factor = max(0.0, 20 - (police_capita / 7.5))     # lower density -> higher risk, up to 20
        crime_volume_score = min(crime_per_100k / 4, 25)         # observed recent crime, up to 25

        risk_score = min(100.0, max(5.0, unemp_score + poverty_score + police_factor + crime_volume_score))

        if risk_score >= 70:
            tier = "High"
        elif risk_score >= 40:
            tier = "Medium"
        else:
            tier = "Low"

        predictions.append({
            "district_id": dist.id,
            "district_name": dist.name,
            "risk_score": round(risk_score, 1),
            "risk_tier": tier,
            "contributing_factors": {
                "unemployment": f"Unemployment rate at {dist.unemployment_rate}%",
                "poverty": f"Poverty rate at {round(poverty, 1)}%",
                "police_density": f"Police per capita index at {round(police_capita, 1)}",
                "recent_crime_volume": f"{recent_crimes} FIRs in last 180 days ({round(crime_per_100k, 1)} per 100k)"
            },
            "score_breakdown": {
                "unemployment": round(unemp_score, 1),
                "poverty": round(poverty_score, 1),
                "police_deficit": round(police_factor, 1),
                "recent_crime_volume": round(crime_volume_score, 1)
            }
        })

    predictions.sort(key=lambda x: x["risk_score"], reverse=True)
    return predictions

@router.get("/patterns")
def detect_crime_patterns(db: Session = Depends(get_db)):
    """
    Pattern intelligence computed from the FIR data actually in the database
    (temporal weekend clustering, crime-type trend shift, socio-economic
    correlation). Each card carries the sample size behind it; cards are
    omitted when there isn't enough data to support the claim.
    """
    patterns = []
    firs = db.query(FIRRecord.crime_type, FIRRecord.date_filed).all()
    n_total = len(firs)

    # ── PAT-001: Weekend vs weekday daily crime rate ─────────────────────────
    if n_total >= 30:
        weekend = sum(1 for _, d in firs if d.weekday() >= 5)   # Sat/Sun
        weekday = n_total - weekend
        weekend_daily = weekend / 2.0
        weekday_daily = weekday / 5.0
        if weekday_daily > 0:
            delta_pct = (weekend_daily - weekday_daily) / weekday_daily * 100
            if abs(delta_pct) >= 10:
                direction = "increase" if delta_pct > 0 else "decrease"
                patterns.append({
                    "id": "PAT-001",
                    "title": f"Weekend Crime Rate {'Spike' if delta_pct > 0 else 'Dip'}",
                    "description": (
                        f"Daily crime volume shows a {abs(delta_pct):.0f}% {direction} on weekends "
                        f"vs weekdays ({weekend_daily:.1f}/day vs {weekday_daily:.1f}/day, "
                        f"n={n_total} FIRs)."
                    ),
                    "confidence": round(min(95.0, 60 + n_total / 100), 1),
                    "category": "Temporal",
                    "sample_size": n_total,
                })

    # ── PAT-002: Fastest-growing crime type (last 90d vs prior 90d) ──────────
    now = datetime.utcnow()
    recent_start = now - timedelta(days=90)
    prior_start = now - timedelta(days=180)
    recent_counts, prior_counts = {}, {}
    for crime_type, d in firs:
        if d >= recent_start:
            recent_counts[crime_type] = recent_counts.get(crime_type, 0) + 1
        elif d >= prior_start:
            prior_counts[crime_type] = prior_counts.get(crime_type, 0) + 1

    best_growth, best_type, best_recent, best_prior = 0.0, None, 0, 0
    for crime_type, recent_n in recent_counts.items():
        prior_n = prior_counts.get(crime_type, 0)
        if prior_n >= 3 and recent_n >= 5:
            growth = (recent_n - prior_n) / prior_n * 100
            if growth > best_growth:
                best_growth, best_type, best_recent, best_prior = growth, crime_type, recent_n, prior_n
    if best_type and best_growth >= 15:
        patterns.append({
            "id": "PAT-002",
            "title": f"Rising Trend: {best_type}",
            "description": (
                f"{best_type} cases grew {best_growth:.0f}% in the last 90 days "
                f"({best_prior} → {best_recent} FIRs vs the prior 90-day window)."
            ),
            "confidence": round(min(95.0, 55 + best_recent), 1),
            "category": "Trend",
            "sample_size": best_recent + best_prior,
        })

    # ── PAT-003: Strongest socio-economic correlate of crime volume ──────────
    # Precompute once instead of per SocioEconomicIndicator row — with 5
    # years x 31 districts that was 155 rows x 2 queries each (District
    # lookup + a full FIRRecord join/count repeated identically per year),
    # ~310 avoidable round-trips to a remote DB.
    indicators = db.query(SocioEconomicIndicator).all()
    districts_by_id = {d.id: d for d in db.query(District).all()}
    crime_counts_by_district = dict(
        db.query(PoliceStation.district_id, func.count(FIRRecord.id))
        .join(FIRRecord, FIRRecord.police_station_id == PoliceStation.id)
        .group_by(PoliceStation.district_id)
        .all()
    )
    rows = []
    for ind in indicators:
        dist = districts_by_id.get(ind.district_id)
        if not dist or not dist.population:
            continue
        crime_count = crime_counts_by_district.get(ind.district_id, 0)
        rows.append({
            "poverty_rate": ind.poverty_rate,
            "unemployment_rate": dist.unemployment_rate,
            "police_per_capita": ind.police_per_capita,
            "crime_rate": (crime_count / dist.population) * 100000,
        })
    if len(rows) >= 4:
        df = pd.DataFrame(rows)
        corr = df.corr()["crime_rate"].drop("crime_rate").fillna(0)
        strongest = corr.abs().idxmax()
        r = corr[strongest]
        if abs(r) >= 0.3:
            label = strongest.replace("_", " ").title()
            direction = "higher" if r > 0 else "lower"
            patterns.append({
                "id": "PAT-003",
                "title": f"Socio-Economic Correlation: {label} vs Crime Rate",
                "description": (
                    f"Districts with {direction} {label.lower()} show correlated crime rates "
                    f"(Pearson r={r:.2f} across {len(rows)} district-year observations)."
                ),
                "confidence": round(min(95.0, abs(r) * 100), 1),
                "category": "Socio-Economic",
                "sample_size": len(rows),
            })

    if not patterns:
        patterns.append({
            "id": "PAT-000",
            "title": "Insufficient Data for Pattern Detection",
            "description": f"Only {n_total} FIR records available — statistical pattern mining needs a larger seeded dataset (run generate_data.py).",
            "confidence": 0.0,
            "category": "System",
            "sample_size": n_total,
        })
    return patterns

@router.get("/district")
def get_district_performance():
    return {
        "clearance_data": [
            { "name": "Koramangala", "rate": 78 },
            { "name": "Indiranagar", "rate": 84 },
            { "name": "Jayanagar", "rate": 72 },
            { "name": "Whitefield", "rate": 65 },
            { "name": "HSR Layout", "rate": 81 },
            { "name": "Malleshwaram", "rate": 75 }
        ],
        "response_time_data": [
            { "day": "Day 1", "time": 24.5 },
            { "day": "Day 5", "time": 22.1 },
            { "day": "Day 10", "time": 19.8 },
            { "day": "Day 15", "time": 23.4 },
            { "day": "Day 20", "time": 18.2 },
            { "day": "Day 25", "time": 15.6 },
            { "day": "Day 30", "time": 14.2 }
        ],
        "kpis": {
            "conviction_rate": "71.4%",
            "patrol_effectiveness": "86.8%",
            "resource_utilization": "92.1%"
        }
    }
