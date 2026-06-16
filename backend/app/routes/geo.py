from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import numpy as np
from app.database import get_db
from app.models import FIRRecord
from sklearn.cluster import DBSCAN

router = APIRouter()

@router.get("/points")
def get_geo_points(
    crime_type: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(FIRRecord)
    if crime_type:
        query = query.filter(FIRRecord.crime_type == crime_type)
    if status:
        query = query.filter(FIRRecord.status == status)
        
    records = query.all()
    return [{
        "id": r.id,
        "lat": r.lat,
        "lng": r.lng,
        "crime_type": r.crime_type,
        "ipc_section": r.ipc_section,
        "date": r.date_filed.isoformat(),
        "status": r.status
    } for r in records]

@router.get("/hexbins")
def get_hexbins(db: Session = Depends(get_db)):
    # Simple list of lat/lng/weight
    records = db.query(FIRRecord.lat, FIRRecord.lng).all()
    return [{"lat": r[0], "lng": r[1], "weight": 1.0} for r in records]

@router.get("/hotspots")
def detect_hotspots(
    eps_km: float = Query(2.5, description="DBSCAN epsilon radius in kilometers"),
    min_samples: int = Query(8, description="Minimum FIRs to form a cluster"),
    db: Session = Depends(get_db)
):
    records = db.query(FIRRecord).all()
    if not records or len(records) < min_samples:
        return []
        
    # Extract coordinates
    coords = np.array([[r.lat, r.lng] for r in records])
    
    # Haversine DBSCAN requires coordinates in radians: [lat, lng]
    coords_rad = np.radians(coords)
    
    # Earth radius in km is 6371
    kms_per_radian = 6371.0
    epsilon = eps_km / kms_per_radian
    
    dbscan = DBSCAN(eps=epsilon, min_samples=min_samples, metric='haversine')
    labels = dbscan.fit_predict(coords_rad)
    
    # Group results
    unique_labels = set(labels)
    hotspots = []
    
    for label in unique_labels:
        if label == -1:
            continue # noise
            
        cluster_mask = (labels == label)
        cluster_coords = coords[cluster_mask]
        cluster_records = [records[i] for i, matches in enumerate(cluster_mask) if matches]
        
        # Calculate centroid
        centroid_lat = float(np.mean(cluster_coords[:, 0]))
        centroid_lng = float(np.mean(cluster_coords[:, 1]))
        
        # Dominant crime type
        crime_counts = {}
        for r in cluster_records:
            crime_counts[r.crime_type] = crime_counts.get(r.crime_type, 0) + 1
        dominant_crime = max(crime_counts, key=crime_counts.get)
        
        # Maximum distance from centroid as radius (rough estimate in km)
        distances_to_centroid = []
        for c in cluster_coords:
            # simple euclidean approximation for small radius
            dist = np.sqrt((c[0] - centroid_lat)**2 + (c[1] - centroid_lng)**2) * 111.0 # 1 degree lat is ~111km
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
        
    # Sort by size descending
    hotspots.sort(key=lambda x: x["fir_count"], reverse=True)
    return hotspots
