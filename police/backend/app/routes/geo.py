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
    db = Depends(get_neo4j_db),
    claims: dict = Depends(get_current_user_claims)
):
    result = db.run("MATCH (inc:Incident)-[:OCCURRED_AT]->(loc:Location) RETURN inc, loc")
    features = []
    
    for record in result:
        inc = record["inc"]
        loc = record["loc"]
        
        # Ensure longitude comes first in GeoJSON coordinates
        feature = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [float(loc.get("lng")), float(loc.get("lat"))]
            },
            "properties": {
                "id": inc.get("id"),
                "type": inc.get("type"),
                "description": inc.get("description"),
                "threat_level": inc.get("threat_level"),
                "timestamp": inc.get("timestamp"),
                "location_name": loc.get("name")
            }
        }
        features.append(feature)
        
    return {
        "type": "FeatureCollection",
        "features": features
    }

