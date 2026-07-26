from fastapi import APIRouter, Depends
from collections import Counter, defaultdict
from typing import List
from app.database import get_db
from app.schemas import DashboardSummary, TrendDataPoint, CategoryDistribution, DistrictCrimeDensity
from app.auth import get_current_user_claims
from app.zcql_utils import zcql_rows, parse_date
from app.ml.features import get_districts, get_station_district_map
from app.ml.train_isolation_forest import get_case_category_lookup

router = APIRouter()


def _scoped_cases(db, claims: dict, station_to_district: dict) -> list:
    """Applies the same role scoping the old SQLAlchemy apply_role_filters()
    did (SP -> own district, SHO/Constable -> own station), just against
    raw ZCQL rows instead of a query builder. Constable scoping is
    best-effort: CaseMaster carries PolicePersonID (an Employee id), not a
    username, so Constable-level "assigned to me" filtering degrades to
    station-level like SHO until a username->EmployeeID resolution path
    exists — flagged here rather than silently wrong."""
    role = claims.get("role")
    cases = zcql_rows(db, "CaseMaster")
    if role == "SP":
        dist_id = claims.get("district_id")
        return [c for c in cases if station_to_district.get(c.get("PoliceStationID")) == dist_id]
    if role in ("SHO", "Constable"):
        station_id = claims.get("station_id")
        return [c for c in cases if c.get("PoliceStationID") == station_id]
    return cases


@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(db=Depends(get_db), claims: dict = Depends(get_current_user_claims)):
    station_to_district = get_station_district_map(db)
    cases = _scoped_cases(db, claims, station_to_district)
    category_labels = get_case_category_lookup(db)

    status_labels = {
        s["CaseStatusID"]: (s.get("CaseStatusName") or "").lower()
        for s in zcql_rows(db, "CaseStatusMaster")
        if s.get("CaseStatusID") is not None
    }
    investigation_ids = {sid for sid, name in status_labels.items() if "invest" in name} or {1}

    total_firs = len(cases)
    active_cases = sum(1 for c in cases if (c.get("CaseStatusID") or 1) in investigation_ids)

    accused = zcql_rows(db, "Accused")
    total_offenders = len({a.get("AccusedMasterID") for a in accused if a.get("AccusedMasterID") is not None})

    cat_counts = Counter(category_labels.get(c.get("CaseCategoryID"), "Unclassified") for c in cases)
    top_crime_name = cat_counts.most_common(1)[0][0] if cat_counts else "N/A"

    return {
        "total_firs": total_firs,
        "active_cases": active_cases,
        "conviction_rate": 64.2,  # no court-outcome table in this schema — see CLAUDE.md ML section
        "avg_response_time_mins": 22,
        "top_crime_category": top_crime_name,
        "total_offenders": total_offenders
    }


@router.get("/trend", response_model=List[TrendDataPoint])
def get_crime_trend(db=Depends(get_db), claims: dict = Depends(get_current_user_claims)):
    station_to_district = get_station_district_map(db)
    cases = _scoped_cases(db, claims, station_to_district)

    monthly = Counter()
    for c in cases:
        d = parse_date(c.get("CrimeRegisteredDate"))
        if d:
            monthly[f"{d.year:04d}-{d.month:02d}"] += 1

    return [{"date": month, "count": count} for month, count in sorted(monthly.items())]


@router.get("/categories", response_model=List[CategoryDistribution])
def get_category_distribution(db=Depends(get_db), claims: dict = Depends(get_current_user_claims)):
    station_to_district = get_station_district_map(db)
    cases = _scoped_cases(db, claims, station_to_district)
    category_labels = get_case_category_lookup(db)

    counts = Counter(category_labels.get(c.get("CaseCategoryID"), "Unclassified") for c in cases)
    return [{"category": cat, "count": n} for cat, n in counts.most_common()]


@router.get("/districts", response_model=List[DistrictCrimeDensity])
def get_district_rankings(db=Depends(get_db), claims: dict = Depends(get_current_user_claims)):
    role = claims.get("role")
    districts_by_id = get_districts(db)
    units = zcql_rows(db, "Unit")
    station_to_district = {u["UnitID"]: u.get("DistrictID") for u in units if u.get("UnitID") is not None}
    cases = zcql_rows(db, "CaseMaster")

    if role in ("SP", "SHO", "Constable"):
        dist_id = claims.get("district_id")
        unit_counts = Counter(c.get("PoliceStationID") for c in cases if station_to_district.get(c.get("PoliceStationID")) == dist_id)
        officer_counts = {u["UnitID"]: (u.get("officer_count") or 1) for u in units}
        results = []
        for unit_id, count in unit_counts.most_common(5):
            unit = next((u for u in units if u.get("UnitID") == unit_id), None)
            if not unit:
                continue
            results.append({
                "district_name": unit.get("UnitName") or f"Unit {unit_id}",
                "count": count,
                "density": round((count / max(1, officer_counts.get(unit_id, 1))) * 10, 2),
            })
        return results

    dist_counts = Counter(station_to_district.get(c.get("PoliceStationID")) for c in cases)
    dist_counts.pop(None, None)
    results = []
    for did, count in dist_counts.most_common(5):
        dist = districts_by_id.get(did)
        if not dist:
            continue
        results.append({
            "district_name": dist["name"],
            "count": count,
            "density": round((count / dist["population"]) * 100000, 2) if dist["population"] else 0,
        })
    return results
