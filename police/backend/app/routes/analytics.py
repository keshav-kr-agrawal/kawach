from fastapi import APIRouter, Depends
import pandas as pd
from collections import defaultdict
from datetime import datetime, timedelta
from typing import List, Dict, Any
from app.database import get_db
# Models are imported but not used directly in queries anymore since we use ZCQL strings
from app.models import District, SocioEconomicIndicator, CaseMaster, Unit
from app.ml.features import (
    build_latest_month_frame, zcql_rows, get_districts,
    get_station_district_map, get_indicator_lookup, _parse_date,
)
from app.ml.train_isolation_forest import get_case_category_lookup
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
def predict_district_risk(db=Depends(get_db)):
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

    districts_by_id = get_districts(db)
    station_to_district = get_station_district_map(db)
    indicators = get_indicator_lookup(db)

    # Recent 180-day case count per district — raw ZCQL rows, joined/filtered
    # in Python (see features.py's module docstring for why).
    cutoff = datetime.utcnow().date() - timedelta(days=180)
    crime_counts = defaultdict(int)
    for c in zcql_rows(db, "CaseMaster"):
        did = station_to_district.get(c.get("PoliceStationID"))
        d = _parse_date(c.get("CrimeRegisteredDate"))
        if did is None or d is None or d < cutoff:
            continue
        crime_counts[did] += 1

    predictions = []
    for did, dist in districts_by_id.items():
        ind_years = [y for (d2, y) in indicators.keys() if d2 == did]
        recent_indicator = indicators.get((did, max(ind_years))) if ind_years else None

        poverty = recent_indicator.get("poverty_rate") if recent_indicator else 15.0
        police_capita = recent_indicator.get("police_per_capita") if recent_indicator else 100.0

        recent_crimes = crime_counts.get(did, 0)
        crime_per_100k = (recent_crimes / dist["population"]) * 100000 if dist["population"] else 0.0

        unemp_score = min(dist["unemployment_rate"] * 6, 30)     # up to 30
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
            "district_id": did,
            "district_name": dist["name"],
            "risk_score": round(risk_score, 1),
            "risk_tier": tier,
            "contributing_factors": {
                "unemployment": f"Unemployment rate at {dist['unemployment_rate']}%",
                "poverty": f"Poverty rate at {round(poverty, 1)}%",
                "police_density": f"Police per capita index at {round(police_capita, 1)}",
                "recent_crime_volume": f"{recent_crimes} cases in last 180 days ({round(crime_per_100k, 1)} per 100k)"
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
def detect_crime_patterns(db=Depends(get_db)):
    """
    Pattern intelligence computed from the FIR data actually in the database
    (temporal weekend clustering, crime-type trend shift, socio-economic
    correlation). Each card carries the sample size behind it; cards are
    omitted when there isn't enough data to support the claim.
    """
    patterns = []
    # CaseMaster only carries CaseCategoryID (Zoho's prescribed lookup-table
    # design), not a crime-type string — join against CaseCategory to get the
    # same human-readable labels the old FIRRecord.crime_type column had.
    category_labels = get_case_category_lookup(db)
    firs = []
    for c in zcql_rows(db, "CaseMaster"):
        d = _parse_date(c.get("CrimeRegisteredDate"))
        if d is None:
            continue
        crime_type = category_labels.get(c.get("CaseCategoryID"), "Unclassified")
        firs.append((crime_type, datetime.combine(d, datetime.min.time())))
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
    # Fetched once via ZCQL and joined/grouped in Python — see features.py's
    # module docstring for why (no verified ZCQL join/date-function support).
    indicators = zcql_rows(db, "SocioEconomicIndicator")
    districts_by_id = get_districts(db)
    station_to_district = get_station_district_map(db)
    crime_counts_by_district = defaultdict(int)
    for c in zcql_rows(db, "CaseMaster"):
        did = station_to_district.get(c.get("PoliceStationID"))
        if did is not None:
            crime_counts_by_district[did] += 1

    rows = []
    for ind in indicators:
        dist = districts_by_id.get(ind.get("district_id"))
        if not dist or not dist["population"]:
            continue
        crime_count = crime_counts_by_district.get(ind.get("district_id"), 0)
        rows.append({
            "poverty_rate": ind.get("poverty_rate"),
            "unemployment_rate": dist["unemployment_rate"],
            "police_per_capita": ind.get("police_per_capita"),
            "crime_rate": (crime_count / dist["population"]) * 100000,
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
def get_district_performance(db=Depends(get_db)):
    """
    District performance metrics computed from real CaseMaster rows —
    clearance rate and investigation cycle time are both derived from each
    case's actual status/timeline fields (replaces the previously hardcoded
    Bangalore-area mock numbers). Case volume itself still comes from the
    seed DB — see generate_data.py's documented signal-injection gap.
    """
    districts_by_id = get_districts(db)
    station_to_district = get_station_district_map(db)

    status_labels = {
        s["CaseStatusID"]: (s.get("CaseStatusName") or "").lower()
        for s in zcql_rows(db, "CaseStatusMaster")
        if s.get("CaseStatusID") is not None
    }
    cleared_status_ids = {
        sid for sid, name in status_labels.items()
        if "closed" in name or "charge" in name
    }

    cases = zcql_rows(db, "CaseMaster")
    if not cases:
        return {"clearance_data": [], "cycle_time_data": [], "kpis": {}, "sample_size": 0}

    by_district: Dict[str, Dict[str, Any]] = {}
    total_cleared = 0
    total_sla_met = 0
    total_sla_resolved = 0
    all_cycle_days = []

    for fir in cases:
        did = station_to_district.get(fir.get("PoliceStationID"))
        dist_name = districts_by_id.get(did, {}).get("name", "Unknown")
        entry = by_district.setdefault(dist_name, {"total": 0, "cleared": 0, "cycle_days": []})
        entry["total"] += 1
        status_id = fir.get("CaseStatusID")
        is_cleared = status_id in cleared_status_ids if cleared_status_ids else (status_id or 0) > 1

        last_event = None
        timeline = fir.get("timeline")
        if timeline:
            try:
                last_event = max(datetime.fromisoformat(t["date"]) for t in timeline)
            except (KeyError, ValueError, TypeError):
                last_event = None

        filed_date = _parse_date(fir.get("CrimeRegisteredDate"))
        sla_deadline = fir.get("sla_deadline")
        if isinstance(sla_deadline, str):
            try:
                sla_deadline = datetime.fromisoformat(sla_deadline)
            except ValueError:
                sla_deadline = None

        if is_cleared:
            entry["cleared"] += 1
            total_cleared += 1
            if last_event and filed_date:
                dt = datetime.combine(filed_date, datetime.min.time())
                days = (last_event - dt).total_seconds() / 86400
                if days >= 0:
                    entry["cycle_days"].append(days)
                    all_cycle_days.append(days)

        if not is_cleared and sla_deadline:
            total_sla_resolved += 1
            if last_event and last_event <= sla_deadline:
                total_sla_met += 1

    clearance_data = []
    cycle_time_data = []
    for name, e in sorted(by_district.items(), key=lambda kv: kv[1]["total"], reverse=True)[:10]:
        rate = round((e["cleared"] / e["total"]) * 100, 1) if e["total"] else 0
        clearance_data.append({"name": name, "rate": rate, "sample_size": e["total"]})
        if e["cycle_days"]:
            avg_days = round(sum(e["cycle_days"]) / len(e["cycle_days"]), 1)
            cycle_time_data.append({"name": name, "avg_days": avg_days, "sample_size": len(e["cycle_days"])})

    total = len(cases)
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
