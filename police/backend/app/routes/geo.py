import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
import random
from app.database import get_db
from app.auth import get_current_user_claims
from app.zcql_utils import zcql_rows, parse_date, parse_datetime, insert_row
from app.ml.features import get_districts, get_station_district_map
from app.ml.train_isolation_forest import get_case_category_lookup
from sklearn.cluster import DBSCAN

router = APIRouter()


def _scoped_cases(db, claims: dict, station_to_district: dict) -> list:
    """Same role-scoping semantics as dashboard.py's _scoped_cases — see that
    docstring for the Constable-scoping caveat (falls back to station-level)."""
    role = claims.get("role")
    cases = zcql_rows(db, "CaseMaster")
    if role == "SP":
        dist_id = claims.get("district_id")
        return [c for c in cases if station_to_district.get(c.get("PoliceStationID")) == dist_id]
    if role in ("SHO", "Constable"):
        station_id = claims.get("station_id")
        return [c for c in cases if c.get("PoliceStationID") == station_id]
    return cases


@router.get("/points")
def get_geo_points(
    crime_type: Optional[str] = None,
    status: Optional[str] = None,
    precision: str = "exact",  # exact, blurred, masked
    mask_sensitive: bool = False,
    db=Depends(get_db),
    claims: dict = Depends(get_current_user_claims)
):
    station_to_district = get_station_district_map(db)
    cases = _scoped_cases(db, claims, station_to_district)
    category_labels = get_case_category_lookup(db)
    status_labels = {
        s["CaseStatusID"]: s.get("CaseStatusName")
        for s in zcql_rows(db, "CaseStatusMaster")
        if s.get("CaseStatusID") is not None
    }
    stations_by_id = {u["UnitID"]: u for u in zcql_rows(db, "Unit") if u.get("UnitID") is not None}
    sensitive_locs = zcql_rows(db, "Location") if mask_sensitive else []

    res = []
    for r in cases:
        r_crime_type = category_labels.get(r.get("CaseCategoryID"), "Unclassified")
        r_status = status_labels.get(r.get("CaseStatusID"), "Investigation")
        if crime_type and r_crime_type != crime_type:
            continue
        if status and r_status != status:
            continue

        lat, lng = r.get("latitude"), r.get("longitude")
        if lat is None or lng is None:
            continue

        if mask_sensitive:
            for loc in sensitive_locs:
                dist = np.sqrt((lat - loc.get("lat", 0)) ** 2 + (lng - loc.get("lng", 0)) ** 2)
                if dist < 0.0045:
                    lat += random.uniform(-0.02, 0.02)
                    lng += random.uniform(-0.02, 0.02)
                    break

        if precision == "blurred":
            lat += random.uniform(-0.006, 0.006)
            lng += random.uniform(-0.006, 0.006)
        elif precision == "masked":
            station = stations_by_id.get(r.get("PoliceStationID"))
            if station:
                lat, lng = station.get("lat", lat), station.get("lng", lng)

        d = parse_date(r.get("CrimeRegisteredDate"))
        res.append({
            "id": r.get("CaseMasterID"),
            "lat": lat,
            "lng": lng,
            "crime_type": r_crime_type,
            "ipc_section": None,  # act/section now lives in ActSectionAssociation, not on CaseMaster directly
            "date": d.isoformat() if d else None,
            "status": r_status,
        })
    return res


@router.get("/hexbins")
def get_hexbins(db=Depends(get_db), claims: dict = Depends(get_current_user_claims)):
    station_to_district = get_station_district_map(db)
    cases = _scoped_cases(db, claims, station_to_district)
    return [
        {"lat": c["latitude"], "lng": c["longitude"], "weight": 1.0}
        for c in cases if c.get("latitude") is not None and c.get("longitude") is not None
    ]

from app.neo4j_db import get_neo4j_db


class SeizureCreateRequest(BaseModel):
    lat: float
    lng: float
    verdict: str  # e.g. LIKELY_COUNTERFEIT, COUNTERFEIT — mirrors /classify-currency's verdict enum
    denomination: Optional[str] = None
    authenticity_score: Optional[float] = None
    notes_count: int = 1
    location_name: Optional[str] = None


@router.post("/seizures")
def log_seizure(
    req: SeizureCreateRequest,
    db=Depends(get_db),
    claims: dict = Depends(get_current_user_claims),
):
    """
    Field-log a counterfeit currency seizure so it appears on the hotspot map
    alongside crime/fraud clusters (ET PS: seizure points on the geospatial
    layer). Typically called after a field officer runs a note through the
    Classifier's real /classify-currency and confirms a counterfeit physically.
    """
    seizure_id = f"CS-{uuid.uuid4().hex[:8].upper()}"
    logged_at = datetime.utcnow()
    insert_row(db, "CurrencySeizure", {
        "id": seizure_id,
        "lat": req.lat,
        "lng": req.lng,
        "denomination": req.denomination,
        "verdict": req.verdict,
        "authenticity_score": req.authenticity_score,
        "notes_count": req.notes_count,
        "logged_by": claims.get("username", "field_officer"),
        "location_name": req.location_name,
        "logged_at": logged_at.isoformat(),
    })
    return {
        "id": seizure_id,
        "lat": req.lat,
        "lng": req.lng,
        "denomination": req.denomination,
        "verdict": req.verdict,
        "logged_at": logged_at.isoformat(),
    }


@router.get("/hotspots")
def detect_hotspots(
    eps_km: float = Query(1.5, ge=0.1, le=25.0, description="DBSCAN neighborhood radius in km"),
    min_samples: int = Query(2, ge=1, le=20, description="Min incidents to form a hotspot cluster"),
    db_sql=Depends(get_db),
    db=Depends(get_neo4j_db),
    claims: dict = Depends(get_current_user_claims)
):
    """
    Crime/fraud hotspot detection via DBSCAN spatial clustering.

    Incidents are clustered on haversine distance; each cluster becomes one
    GeoJSON feature at the cluster centroid carrying its member incidents,
    dominant type, and max threat level. Unclustered incidents (DBSCAN noise)
    are returned as single-point features flagged is_hotspot=false.

    Counterfeit currency seizure points (logged via POST /seizures) are
    merged in as their own incident type so they cluster and render
    alongside crime hotspots on the same map.
    """
    result = db.run("MATCH (inc:Incident)-[:OCCURRED_AT]->(loc:Location) RETURN inc, loc")

    incidents = []
    for record in result:
        inc = record["inc"]
        loc = record["loc"]
        try:
            lat, lng = float(loc.get("lat")), float(loc.get("lng"))
        except (TypeError, ValueError):
            continue
        incidents.append({
            "id": inc.get("id"),
            "type": inc.get("type"),
            "description": inc.get("description"),
            "threat_level": inc.get("threat_level"),
            "timestamp": inc.get("timestamp"),
            "location_name": loc.get("name"),
            "lat": lat,
            "lng": lng,
            "is_seizure": False,
        })

    seizure_verdict_threat = {
        "COUNTERFEIT": "CRITICAL",
        "LIKELY_COUNTERFEIT": "HIGH",
        "SUSPECT_FEATURES": "MEDIUM",
    }
    for s in zcql_rows(db_sql, "CurrencySeizure"):
        logged_at = parse_datetime(s.get("logged_at"))
        incidents.append({
            "id": s.get("id"),
            "type": "COUNTERFEIT_SEIZURE",
            "description": f"{s.get('notes_count', 1)} note(s) seized"
                            + (f" (₹{s['denomination']})" if s.get("denomination") else "")
                            + f" — {s.get('verdict')}",
            "threat_level": seizure_verdict_threat.get(s.get("verdict"), "MEDIUM"),
            "timestamp": logged_at.isoformat() if logged_at else None,
            "location_name": s.get("location_name"),
            "lat": s.get("lat"),
            "lng": s.get("lng"),
            "is_seizure": True,
            "denomination": s.get("denomination"),
            "verdict": s.get("verdict"),
            "authenticity_score": s.get("authenticity_score"),
        })

    features = []
    if incidents:
        # Haversine-metric DBSCAN: inputs in radians, eps in radians
        # (earth radius ~6371 km).
        coords = np.radians([[i["lat"], i["lng"]] for i in incidents])
        eps_rad = eps_km / 6371.0
        labels = DBSCAN(eps=eps_rad, min_samples=min_samples, metric="haversine").fit_predict(coords)

        threat_rank = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1}
        clusters = {}
        for incident, label in zip(incidents, labels):
            clusters.setdefault(int(label), []).append(incident)

        for label, members in sorted(clusters.items()):
            if label == -1:
                # DBSCAN noise — isolated incidents, not hotspots
                for m in members:
                    features.append({
                        "type": "Feature",
                        "geometry": {"type": "Point", "coordinates": [m["lng"], m["lat"]]},
                        "properties": {**{k: m[k] for k in ("id", "type", "description", "threat_level", "timestamp", "location_name", "is_seizure")},
                                       "is_hotspot": False, "cluster_id": None, "incident_count": 1},
                    })
                continue

            centroid_lat = sum(m["lat"] for m in members) / len(members)
            centroid_lng = sum(m["lng"] for m in members) / len(members)
            type_counts = {}
            for m in members:
                type_counts[m["type"]] = type_counts.get(m["type"], 0) + 1
            dominant_type = max(type_counts, key=type_counts.get)
            max_threat = max(members, key=lambda m: threat_rank.get(str(m["threat_level"]).upper(), 0))["threat_level"]
            seizure_count = sum(1 for m in members if m.get("is_seizure"))

            features.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [centroid_lng, centroid_lat]},
                "properties": {
                    "is_hotspot": True,
                    "cluster_id": label,
                    "incident_count": len(members),
                    "dominant_type": dominant_type,
                    "max_threat_level": max_threat,
                    "location_names": sorted({m["location_name"] for m in members if m["location_name"]}),
                    "incident_ids": [m["id"] for m in members],
                    "seizure_count": seizure_count,
                    "is_seizure_dominant": seizure_count > len(members) / 2,
                },
            })

    hotspot_count = sum(1 for f in features if f["properties"].get("is_hotspot"))
    return {
        "type": "FeatureCollection",
        "features": features,
        "metadata": {
            "algorithm": "DBSCAN (haversine)",
            "eps_km": eps_km,
            "min_samples": min_samples,
            "total_incidents": len(incidents),
            "hotspot_clusters": hotspot_count,
        },
    }
