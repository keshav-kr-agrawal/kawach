from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import numpy as np
import random
from app.database import get_db
from app.models import FIRRecord, PoliceStation, Location
from app.auth import get_current_user_claims
from sklearn.cluster import DBSCAN

router = APIRouter()

def apply_geo_role_filters(query, claims):
    role = claims.get("role")
    if role == "SP":
        return query.join(PoliceStation).filter(PoliceStation.district_id == claims.get("district_id"))
    elif role == "SHO":
        return query.filter(FIRRecord.police_station_id == claims.get("station_id"))
    elif role == "Constable":
        return query.filter(FIRRecord.assigned_officer_id == claims.get("username"))
    return query

@router.get("/points")
def get_geo_points(
    crime_type: Optional[str] = None,
    status: Optional[str] = None,
    precision: str = "exact",  # exact, blurred, masked
    mask_sensitive: bool = False,
    db: Session = Depends(get_db),
    claims: dict = Depends(get_current_user_claims)
):
    query = db.query(FIRRecord)
    query = apply_geo_role_filters(query, claims)
    
    if crime_type:
        query = query.filter(FIRRecord.crime_type == crime_type)
    if status:
        query = query.filter(FIRRecord.status == status)
        
    records = query.all()
    sensitive_locs = db.query(Location).all() if mask_sensitive else []
    
    res = []
    for r in records:
        lat, lng = r.lat, r.lng
        
        # Sensitive site masking (exclude/blur if within ~500m of a sensitive location)
        if mask_sensitive:
            near_sensitive = False
            for loc in sensitive_locs:
                # 1 degree is ~111km, 500m is ~0.0045 degrees
                dist = np.sqrt((lat - loc.lat)**2 + (lng - loc.lng)**2)
                if dist < 0.0045:
                    near_sensitive = True
                    break
            if near_sensitive:
                # Mask by introducing a large coordinate offset or skipping
                lat += random.uniform(-0.02, 0.02)
                lng += random.uniform(-0.02, 0.02)
        
        # Location precision controls
        if precision == "blurred":
            # Add 300m - 1km jitter (0.003 to 0.009 degrees)
            lat += random.uniform(-0.006, 0.006)
            lng += random.uniform(-0.006, 0.006)
        elif precision == "masked":
            # Complete obscuring: snap to police station lat/lng
            lat, lng = r.station.lat, r.station.lng
            
        res.append({
            "id": r.id,
            "lat": lat,
            "lng": lng,
            "crime_type": r.crime_type,
            "ipc_section": r.ipc_section,
            "date": r.date_filed.isoformat(),
            "status": r.status
        })
    return res

@router.get("/hexbins")
def get_hexbins(db: Session = Depends(get_db), claims: dict = Depends(get_current_user_claims)):
    query = db.query(FIRRecord.lat, FIRRecord.lng)
    role = claims.get("role")
    if role == "SP":
        query = query.join(PoliceStation).filter(PoliceStation.district_id == claims.get("district_id"))
    elif role == "SHO":
        query = query.filter(FIRRecord.police_station_id == claims.get("station_id"))
    elif role == "Constable":
        query = query.filter(FIRRecord.assigned_officer_id == claims.get("username"))
        
    records = query.all()
    return [{"lat": r[0], "lng": r[1], "weight": 1.0} for r in records]

from app.neo4j_db import get_neo4j_db

@router.get("/hotspots")
def detect_hotspots(
    eps_km: float = Query(1.5, ge=0.1, le=25.0, description="DBSCAN neighborhood radius in km"),
    min_samples: int = Query(2, ge=1, le=20, description="Min incidents to form a hotspot cluster"),
    db = Depends(get_neo4j_db),
    claims: dict = Depends(get_current_user_claims)
):
    """
    Crime/fraud hotspot detection via DBSCAN spatial clustering.

    Incidents are clustered on haversine distance; each cluster becomes one
    GeoJSON feature at the cluster centroid carrying its member incidents,
    dominant type, and max threat level. Unclustered incidents (DBSCAN noise)
    are returned as single-point features flagged is_hotspot=false.
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
                        "properties": {**{k: m[k] for k in ("id", "type", "description", "threat_level", "timestamp", "location_name")},
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

