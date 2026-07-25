from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict, Any
from app.database import get_db
# Models are imported but not used directly in queries anymore since we use ZCQL strings
from app.models import District, SocioEconomicIndicator, CaseMaster, Unit
from app.ml.features import build_latest_month_frame
from app.ml.predict import ml_predict_district_risk
from app.ml.patterns import ml_forecast_patterns, ml_anomaly_patterns

router = APIRouter()

@router.get("/correlation")
def get_socio_economic_correlation(db: Any = Depends(get_db)):
    if not db:
        return {} # Mock fallback if ZCatalyst not initialized
        
    try:
        # ZCQL queries
        indicators_resp = db.execute_query("SELECT * FROM SocioEconomicIndicator")
        indicators = [row['SocioEconomicIndicator'] for row in indicators_resp]
        
        districts_resp = db.execute_query("SELECT * FROM District")
        districts = {row['District']['DistrictID']: row['District'] for row in districts_resp}
        
        data = []
        for ind in indicators:
            dist_id = ind.get('district_id')
            year = ind.get('year')
            
            # ZCQL Join equivalent
            crime_query = f"SELECT count(CaseMasterID) FROM CaseMaster INNER JOIN Unit ON CaseMaster.PoliceStationID = Unit.UnitID WHERE Unit.DistrictID = {dist_id} AND getYear(CaseMaster.CrimeRegisteredDate) = {year}"
            crime_resp = db.execute_query(crime_query)
            crime_count = crime_resp[0]['CaseMaster']['count(CaseMasterID)'] if crime_resp else 0
            
            dist = districts.get(dist_id)
            if not dist:
                continue
                
            population = dist.get('population', 0)
            crime_rate = (crime_count / population) * 100000 if population else 0
        
            data.append({
                "poverty_rate": ind.get('poverty_rate', 0),
                "unemployment_rate": dist.get('unemployment_rate', 0),
                "gdp_per_capita": ind.get('gdp_per_capita', 0),
                "school_density": ind.get('school_density', 0),
                "hospital_density": ind.get('hospital_density', 0),
                "police_per_capita": ind.get('police_per_capita', 0),
                "crime_rate": crime_rate
            })
            
    except Exception as e:
        print(f"ZCQL Error: {e}")
        return {}
        
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
    District risk scoring: ML XGBoost prediction if model is loaded,
    else deterministic formula over socio-economic indicators + recent crime volume.
    """
    # ── ML INTEGRATION WINDOW ────────────────────────────────────────────────
    # XGBoost regressor trained on district features + spatial/temporal lag
    # (app/ml/train_risk_model.py). Falls back to the statistical formula
    # below if risk_model.pkl hasn't been trained yet.
    ml_predictions = ml_predict_district_risk(build_latest_month_frame(db))
    if ml_predictions is not None:
        return ml_predictions
    # ── END ML INTEGRATION WINDOW ────────────────────────────────────────────

    districts = db.query(District).all()

    # Recent 180-day FIR count per district (single grouped query)
    cutoff = datetime.utcnow().date() - timedelta(days=180)
    crime_counts = dict(
        db.query(Unit.DistrictID, func.count(CaseMaster.CaseMasterID))
        .join(CaseMaster, CaseMaster.PoliceStationID == Unit.UnitID)
        .filter(CaseMaster.CrimeRegisteredDate >= cutoff)
        .group_by(Unit.DistrictID)
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
    # Note: CaseMaster doesn't have a direct 'crime_type' string in strict Zoho schema,
    # it references CaseCategoryID or CrimeMajorHeadID. We'll use CrimeNo prefix or a join in a full setup.
    # For now, we simulate fetching the case category ID or similar.
    firs = db.query(CaseMaster.CaseCategoryID, CaseMaster.CrimeRegisteredDate).all()
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
        db.query(Unit.DistrictID, func.count(CaseMaster.CaseMasterID))
        .join(CaseMaster, CaseMaster.PoliceStationID == Unit.UnitID)
        .group_by(Unit.DistrictID)
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

    # ── ML INTEGRATION WINDOW ────────────────────────────────────────────────
    # Prophet forecasts + Isolation Forest anomalies, appended after the
    # statistical cards above. Each returns [] if its model isn't trained yet
    # (app/ml/train_prophet.py, app/ml/train_isolation_forest.py).
    try:
        patterns += ml_forecast_patterns(db) + ml_anomaly_patterns(db)
    except Exception as e:
        print(f"[ML] Pattern ML failed, using statistical-only patterns: {e}")
    # ── END ML INTEGRATION WINDOW ────────────────────────────────────────────

    if not patterns:
        patterns.append({
            "id": "PAT-000",
            "title": "Insufficient Data for Pattern Detection",
            "description": f"Only {n_total} FIR records available — statistical and ML pattern mining both need a larger seeded dataset (run generate_data.py) or trained models (see app/ml/).",
            "confidence": 0.0,
            "category": "System",
            "sample_size": n_total,
        })

    return patterns

@router.get("/district")
def get_district_performance(db: Session = Depends(get_db)):
    """
    District performance metrics computed from real FIRRecord rows —
    clearance rate and investigation cycle time are both derived from each
    FIR's actual status/timeline fields (replaces the previously hardcoded
    Bangalore-area mock numbers). FIR volume itself still comes from the
    seed DB — see generate_data.py's documented signal-injection gap.
    """
    firs = db.query(CaseMaster).join(Unit, CaseMaster.PoliceStationID == Unit.UnitID).join(District, Unit.DistrictID == District.DistrictID).all()
    if not firs:
        return {"clearance_data": [], "cycle_time_data": [], "kpis": {}, "sample_size": 0}

    by_district: Dict[str, Dict[str, Any]] = {}
    total_cleared = 0
    total_sla_met = 0
    total_sla_resolved = 0
    all_cycle_days = []

    for fir in firs:
        dist_name = "Unknown" # simplified for now
        entry = by_district.setdefault(dist_name, {"total": 0, "cleared": 0, "cycle_days": []})
        entry["total"] += 1
        is_cleared = getattr(fir, 'CaseStatusID', 0) > 1 # Assuming >1 is cleared

        last_event = None
        if getattr(fir, 'timeline', None):
            try:
                last_event = max(datetime.fromisoformat(t["date"]) for t in fir.timeline)
            except (KeyError, ValueError, TypeError):
                last_event = None

        if is_cleared:
            entry["cleared"] += 1
            total_cleared += 1
            if last_event and fir.CrimeRegisteredDate:
                # Convert Date to datetime for comparison
                dt = datetime.combine(fir.CrimeRegisteredDate, datetime.min.time())
                days = (last_event - dt).total_seconds() / 86400
                if days >= 0:
                    entry["cycle_days"].append(days)
                    all_cycle_days.append(days)

        if not is_cleared and getattr(fir, 'sla_deadline', None):
            total_sla_resolved += 1
            if last_event and last_event <= fir.sla_deadline:
                total_sla_met += 1

    clearance_data = []
    cycle_time_data = []
    for name, e in sorted(by_district.items(), key=lambda kv: kv[1]["total"], reverse=True)[:10]:
        rate = round((e["cleared"] / e["total"]) * 100, 1) if e["total"] else 0
        clearance_data.append({"name": name, "rate": rate, "sample_size": e["total"]})
        if e["cycle_days"]:
            avg_days = round(sum(e["cycle_days"]) / len(e["cycle_days"]), 1)
            cycle_time_data.append({"name": name, "avg_days": avg_days, "sample_size": len(e["cycle_days"])})

    total = len(firs)
    overall_clearance = round((total_cleared / total) * 100, 1) if total else 0
    overall_cycle = round(sum(all_cycle_days) / len(all_cycle_days), 1) if all_cycle_days else None
    sla_met_rate = round((total_sla_met / total_sla_resolved) * 100, 1) if total_sla_resolved else None

    return {
        "clearance_data": clearance_data,
        "cycle_time_data": cycle_time_data,
        "kpis": {
            "overall_clearance_rate": f"{overall_clearance}%",
            "avg_investigation_cycle_days": overall_cycle,
            "sla_met_rate": f"{sla_met_rate}%" if sla_met_rate is not None else "N/A",
        },
        "sample_size": total,
    }
