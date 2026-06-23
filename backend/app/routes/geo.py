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

@router.get("/hotspots")
def detect_hotspots(
    eps_km: float = Query(2.5, description="DBSCAN epsilon radius in kilometers"),
    min_samples: int = Query(8, description="Minimum FIRs to form a cluster"),
    db: Session = Depends(get_db),
    claims: dict = Depends(get_current_user_claims)
):
    query = db.query(FIRRecord)
    query = apply_geo_role_filters(query, claims)
    records = query.all()
    
    if not records or len(records) < min_samples:
        return []
        
    coords = np.array([[r.lat, r.lng] for r in records])
    coords_rad = np.radians(coords)
    
    kms_per_radian = 6371.0
    epsilon = eps_km / kms_per_radian
    
    dbscan = DBSCAN(eps=epsilon, min_samples=min_samples, metric='haversine')
    labels = dbscan.fit_predict(coords_rad)
    
    unique_labels = set(labels)
    hotspots = []
    
    for label in unique_labels:
        if label == -1:
            continue
            
        cluster_mask = (labels == label)
        cluster_coords = coords[cluster_mask]
        cluster_records = [records[i] for i, matches in enumerate(cluster_mask) if matches]
        
        centroid_lat = float(np.mean(cluster_coords[:, 0]))
        centroid_lng = float(np.mean(cluster_coords[:, 1]))
        
        crime_counts = {}
        for r in cluster_records:
            crime_counts[r.crime_type] = crime_counts.get(r.crime_type, 0) + 1
        dominant_crime = max(crime_counts, key=crime_counts.get)
        
        distances_to_centroid = []
        for c in cluster_coords:
            dist = np.sqrt((c[0] - centroid_lat)**2 + (c[1] - centroid_lng)**2) * 111.0
            distances_to_centroid.append(dist)
        radius_km = float(np.max(distances_to_centroid)) if distances_to_centroid else eps_km
        
        hotspots.append({
            "cluster_id": int(label),
            "lat": centroid_lat,
            "lng": centroid_lng,
            "radius_km": round(max(radius_km, 0.5), 2),
            "fir_count": len(cluster_records),
            "dominant_crime": dominant_crime,
            "heat_score": min(100.0, float(len(cluster_records) * 3))
        })
        
    hotspots.sort(key=lambda x: x["fir_count"], reverse=True)
    return hotspots

