"""
Shared feature engineering for the ML risk/pattern models. Both training
scripts and the live inference path (predict.py, patterns.py) import from
here so the feature definition can never drift between train and serve.
"""
import math
from collections import defaultdict
from datetime import datetime

from sqlalchemy import func, extract
from sqlalchemy.orm import Session

from app.models import District, SocioEconomicIndicator, FIRRecord, PoliceStation

FEATURE_COLS = [
    "unemployment_rate", "poverty_rate", "police_per_capita", "gdp_per_capita",
    "school_density", "hospital_density", "population_density",
    "month_sin", "month_cos", "festival_flag",
    "adjacent_crime_rate", "lagged_crime_rate_3m", "lagged_crime_rate_12m",
]
TARGET_COL = "crime_rate_per_100k"

# Sankranti (Jan), Ugadi (Mar/Apr), Dasara (Oct), Deepavali (Nov) — the
# months with a documented crime-volume bump in Indian festival-season
# policing literature.
FESTIVAL_MONTHS = {1, 3, 10, 11}

ADJACENCY_K = 3  # nearest-neighbor districts used for the spatial lag


def _haversine_km(lat1, lng1, lat2, lng2):
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlambda / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def get_district_centroids(db: Session) -> dict:
    """District centroid = mean lat/lng of its own police stations.
    District itself carries no lat/lng column, only its stations do."""
    rows = db.query(
        PoliceStation.district_id,
        func.avg(PoliceStation.lat),
        func.avg(PoliceStation.lng),
    ).group_by(PoliceStation.district_id).all()
    return {r[0]: (r[1], r[2]) for r in rows if r[1] is not None and r[2] is not None}


def get_adjacency_map(db: Session, k: int = ADJACENCY_K) -> dict:
    """district_id -> [k nearest other district_ids by centroid haversine distance].
    Computed from real station coordinates instead of a hand-maintained
    neighbor list, so every seeded district gets a spatial-lag neighborhood,
    not just the handful anyone bothered to type in."""
    centroids = get_district_centroids(db)
    adjacency = {}
    for did, (lat, lng) in centroids.items():
        dists = []
        for other_id, (olat, olng) in centroids.items():
            if other_id == did:
                continue
            dists.append((_haversine_km(lat, lng, olat, olng), other_id))
        dists.sort(key=lambda x: x[0])
        adjacency[did] = [oid for _, oid in dists[:k]]
    return adjacency


def get_monthly_crime_counts(db: Session) -> dict:
    """(district_id, year, month) -> FIR count."""
    rows = (
        db.query(
            PoliceStation.district_id,
            extract("year", FIRRecord.date_filed).label("year"),
            extract("month", FIRRecord.date_filed).label("month"),
            func.count(FIRRecord.id).label("count"),
        )
        .join(FIRRecord, FIRRecord.police_station_id == PoliceStation.id)
        .group_by(PoliceStation.district_id, "year", "month")
        .all()
    )
    return {(r[0], int(r[1]), int(r[2])): r[3] for r in rows}


def get_indicator_lookup(db: Session) -> dict:
    """(district_id, year) -> SocioEconomicIndicator row."""
    return {(i.district_id, i.year): i for i in db.query(SocioEconomicIndicator).all()}


def _shift_month(year: int, month: int, back: int):
    total = year * 12 + (month - 1) - back
    return total // 12, total % 12 + 1


def build_month_range(db: Session):
    """Every (year, month) with at least one FIR in the DB, sorted chronologically."""
    months = sorted({(y, m) for (_did, y, m) in get_monthly_crime_counts(db).keys()})
    return months


def build_district_feature_row(
    district, year: int, month: int, *,
    crime_counts: dict, indicators: dict, adjacency: dict, districts_by_id: dict,
):
    """One feature row (no target) for a single district/month — used both
    for historical training rows and for 'current month' live inference."""
    pop = district.population or 500000
    ind = indicators.get((district.id, year)) or indicators.get((district.id, max(
        (y for (d, y) in indicators.keys() if d == district.id), default=year
    )))

    lag3_year, lag3_month = _shift_month(year, month, 3)
    lag12_year, lag12_month = _shift_month(year, month, 12)
    lag3_count = crime_counts.get((district.id, lag3_year, lag3_month), 0)
    lag12_count = crime_counts.get((district.id, lag12_year, lag12_month), 0)

    neighbor_ids = adjacency.get(district.id, [])
    adj_rates = []
    for nid in neighbor_ids:
        ndist = districts_by_id.get(nid)
        if not ndist:
            continue
        npop = ndist.population or 500000
        ncount = crime_counts.get((nid, year, month), 0)
        adj_rates.append((ncount / npop) * 100000)
    this_count = crime_counts.get((district.id, year, month), 0)
    this_rate = (this_count / pop) * 100000
    adjacent_crime_rate = sum(adj_rates) / len(adj_rates) if adj_rates else this_rate

    return {
        "district_id": district.id,
        "district_name": district.name,
        "year": year,
        "month": month,
        "unemployment_rate": district.unemployment_rate or 4.5,
        "poverty_rate": ind.poverty_rate if ind else 18.0,
        "police_per_capita": ind.police_per_capita if ind else 120.0,
        "gdp_per_capita": ind.gdp_per_capita if ind else 85000.0,
        "school_density": ind.school_density if ind else 2.1,
        "hospital_density": ind.hospital_density if ind else 0.8,
        "population_density": pop / (district.area_sqkm or 6183.0),
        "month_sin": math.sin(2 * math.pi * month / 12),
        "month_cos": math.cos(2 * math.pi * month / 12),
        "festival_flag": 1 if month in FESTIVAL_MONTHS else 0,
        "adjacent_crime_rate": adjacent_crime_rate,
        "lagged_crime_rate_3m": (lag3_count / pop) * 100000,
        "lagged_crime_rate_12m": (lag12_count / pop) * 100000,
        "crime_rate_per_100k": this_rate,
    }


def build_training_frame(db: Session):
    import pandas as pd

    districts_by_id = {d.id: d for d in db.query(District).all()}
    crime_counts = get_monthly_crime_counts(db)
    indicators = get_indicator_lookup(db)
    adjacency = get_adjacency_map(db)
    months = build_month_range(db)

    rows = []
    for (year, month) in months:
        for district in districts_by_id.values():
            rows.append(build_district_feature_row(
                district, year, month,
                crime_counts=crime_counts, indicators=indicators,
                adjacency=adjacency, districts_by_id=districts_by_id,
            ))
    return pd.DataFrame(rows)


def build_latest_month_frame(db: Session):
    """Feature rows (no target needed) for the most recent month present in
    the FIR table — this is what /api/analytics/predict scores live."""
    import pandas as pd

    districts_by_id = {d.id: d for d in db.query(District).all()}
    crime_counts = get_monthly_crime_counts(db)
    indicators = get_indicator_lookup(db)
    adjacency = get_adjacency_map(db)
    months = build_month_range(db)
    if not months:
        return pd.DataFrame()
    year, month = months[-1]

    rows = [
        build_district_feature_row(
            district, year, month,
            crime_counts=crime_counts, indicators=indicators,
            adjacency=adjacency, districts_by_id=districts_by_id,
        )
        for district in districts_by_id.values()
    ]
    return pd.DataFrame(rows)
