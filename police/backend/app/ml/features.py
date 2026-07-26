"""
Shared feature engineering for the ML risk/pattern models. Both training
scripts and the live inference path (predict.py, patterns.py) import from
here so the feature definition can never drift between train and serve.

Rewritten 2026-07-26 for the Zoho Catalyst ZCQL/NoSQL datastore migration —
`db` is now a Catalyst datastore object (`db.execute_query(zcql_string)`,
returning `[{"<TableName>": {...fields}}, ...]`), not a SQLAlchemy Session,
and `FIRRecord`/`PoliceStation` no longer exist as ORM classes (replaced by
`CaseMaster`/`Unit` in app/models.py, which are now plain Pydantic schemas
used for typing only — not queryable). Raw rows are fetched via ZCQL and all
joining/grouping happens in Python, matching the working pattern already in
routes/analytics.py's /correlation route rather than relying on ZCQL date
functions this codebase hasn't verified support for.
"""
import math
from collections import defaultdict

from app.zcql_utils import zcql_rows, parse_date as _parse_date

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


def get_districts(db) -> dict:
    """DistrictID -> normalized dict (id/name/population/area_sqkm/unemployment_rate)."""
    out = {}
    for d in zcql_rows(db, "District"):
        did = d.get("DistrictID")
        if did is None:
            continue
        out[did] = {
            "id": did,
            "name": d.get("DistrictName") or f"District {did}",
            "population": d.get("population") or 500000,
            "area_sqkm": d.get("area_sqkm") or 6183.0,
            "unemployment_rate": d.get("unemployment_rate") or 4.5,
        }
    return out


def get_station_district_map(db) -> dict:
    """UnitID (police station) -> DistrictID — CaseMaster only carries
    PoliceStationID, so every crime-count query needs this to attribute a
    case to a district."""
    return {
        u["UnitID"]: u.get("DistrictID")
        for u in zcql_rows(db, "Unit")
        if u.get("UnitID") is not None
    }


def get_district_centroids(db) -> dict:
    """District centroid = mean lat/lng of its own police stations (Unit
    rows). District itself carries no lat/lng column, only its Units do."""
    sums = defaultdict(lambda: [0.0, 0.0, 0])
    for u in zcql_rows(db, "Unit"):
        did, lat, lng = u.get("DistrictID"), u.get("lat"), u.get("lng")
        if did is None or lat is None or lng is None:
            continue
        entry = sums[did]
        entry[0] += lat
        entry[1] += lng
        entry[2] += 1
    return {did: (s[0] / s[2], s[1] / s[2]) for did, s in sums.items() if s[2] > 0}


def get_adjacency_map(db, k: int = ADJACENCY_K) -> dict:
    """district_id -> [k nearest other district_ids by centroid haversine distance]."""
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


def get_monthly_crime_counts(db) -> dict:
    """(district_id, year, month) -> CaseMaster count."""
    station_to_district = get_station_district_map(db)
    counts = defaultdict(int)
    for c in zcql_rows(db, "CaseMaster"):
        did = station_to_district.get(c.get("PoliceStationID"))
        d = _parse_date(c.get("CrimeRegisteredDate"))
        if did is None or d is None:
            continue
        counts[(did, d.year, d.month)] += 1
    return dict(counts)


def get_indicator_lookup(db) -> dict:
    """(district_id, year) -> SocioEconomicIndicator dict."""
    return {
        (i.get("district_id"), i.get("year")): i
        for i in zcql_rows(db, "SocioEconomicIndicator")
        if i.get("district_id") is not None
    }


def _shift_month(year: int, month: int, back: int):
    total = year * 12 + (month - 1) - back
    return total // 12, total % 12 + 1


def build_month_range(db):
    """Every (year, month) with at least one case, sorted chronologically."""
    months = sorted({(y, m) for (_did, y, m) in get_monthly_crime_counts(db).keys()})
    return months


def build_district_feature_row(
    district: dict, year: int, month: int, *,
    crime_counts: dict, indicators: dict, adjacency: dict, districts_by_id: dict,
):
    """One feature row (no target) for a single district/month — used both
    for historical training rows and for 'current month' live inference.
    `district` is a normalized dict from get_districts(), not an ORM row."""
    did = district["id"]
    pop = district["population"]
    ind = indicators.get((did, year)) or indicators.get((did, max(
        (y for (d, y) in indicators.keys() if d == did), default=year
    )))

    lag3_year, lag3_month = _shift_month(year, month, 3)
    lag12_year, lag12_month = _shift_month(year, month, 12)
    lag3_count = crime_counts.get((did, lag3_year, lag3_month), 0)
    lag12_count = crime_counts.get((did, lag12_year, lag12_month), 0)

    neighbor_ids = adjacency.get(did, [])
    adj_rates = []
    for nid in neighbor_ids:
        ndist = districts_by_id.get(nid)
        if not ndist:
            continue
        npop = ndist["population"]
        ncount = crime_counts.get((nid, year, month), 0)
        adj_rates.append((ncount / npop) * 100000)
    this_count = crime_counts.get((did, year, month), 0)
    this_rate = (this_count / pop) * 100000
    adjacent_crime_rate = sum(adj_rates) / len(adj_rates) if adj_rates else this_rate

    return {
        "district_id": did,
        "district_name": district["name"],
        "year": year,
        "month": month,
        "unemployment_rate": district["unemployment_rate"],
        "poverty_rate": ind.get("poverty_rate") if ind else 18.0,
        "police_per_capita": ind.get("police_per_capita") if ind else 120.0,
        "gdp_per_capita": ind.get("gdp_per_capita") if ind else 85000.0,
        "school_density": ind.get("school_density") if ind else 2.1,
        "hospital_density": ind.get("hospital_density") if ind else 0.8,
        "population_density": pop / district["area_sqkm"],
        "month_sin": math.sin(2 * math.pi * month / 12),
        "month_cos": math.cos(2 * math.pi * month / 12),
        "festival_flag": 1 if month in FESTIVAL_MONTHS else 0,
        "adjacent_crime_rate": adjacent_crime_rate,
        "lagged_crime_rate_3m": (lag3_count / pop) * 100000,
        "lagged_crime_rate_12m": (lag12_count / pop) * 100000,
        "crime_rate_per_100k": this_rate,
    }


def build_training_frame(db):
    import pandas as pd

    districts_by_id = get_districts(db)
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


def build_latest_month_frame(db):
    """Feature rows (no target needed) for the most recent month present in
    the case data — this is what /api/analytics/predict scores live."""
    import pandas as pd

    districts_by_id = get_districts(db)
    crime_counts = get_monthly_crime_counts(db)
    indicators = get_indicator_lookup(db)
    adjacency = get_adjacency_map(db)
    months = build_month_range(db)
    if not months or not districts_by_id:
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
