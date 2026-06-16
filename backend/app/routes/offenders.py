from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import Offender, FIRRecord
from app.schemas import OffenderResponse, FIRRecordResponse

router = APIRouter()

@router.get("/repeat")
def get_repeat_offenders(
    min_priors: int = 2,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    results = db.query(Offender)\
        .filter(Offender.num_prior_offenses >= min_priors)\
        .order_by(Offender.risk_score.desc())\
        .limit(limit).all()
        
    return [{
        "id": o.id,
        "name": o.name,
        "age": o.age,
        "gender": o.gender,
        "address": o.address,
        "num_prior_offenses": o.num_prior_offenses,
        "risk_score": o.risk_score,
        "associates_count": len(o.associates)
    } for o in results]

@router.get("/search")
def search_offenders(query: str, db: Session = Depends(get_db)):
    results = db.query(Offender).filter(
        (Offender.name.ilike(f"%{query}%")) | (Offender.id.ilike(f"%{query}%"))
    ).limit(20).all()
    
    return [{
        "id": o.id,
        "name": o.name,
        "age": o.age,
        "gender": o.gender,
        "risk_score": o.risk_score,
        "num_prior_offenses": o.num_prior_offenses
    } for o in results]

@router.get("/{id}")
def get_offender_profile(id: str, db: Session = Depends(get_db)):
    offender = db.query(Offender).filter(Offender.id == id).first()
    if not offender:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Offender not found"
        )
        
    # Get associated FIRs
    firs = [{
        "id": f.id,
        "crime_type": f.crime_type,
        "ipc_section": f.ipc_section,
        "date_filed": f.date_filed.isoformat(),
        "status": f.status,
        "police_station_id": f.police_station_id
    } for f in offender.firs]
    
    # Get associates list
    associates = [{"id": a.id, "name": a.name, "risk_score": a.risk_score} for a in offender.associates]
    
    return {
        "id": offender.id,
        "name": offender.name,
        "age": offender.age,
        "gender": offender.gender,
        "address": offender.address,
        "num_prior_offenses": offender.num_prior_offenses,
        "risk_score": offender.risk_score,
        "firs": firs,
        "associates": associates
    }
