from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from app.database import get_db
from app.models import FIRRecord, User, PoliceStation
from app.auth import get_current_user_claims
from pydantic import BaseModel

router = APIRouter()

class AssignRequest(BaseModel):
    officer_username: str

class EscalateRequest(BaseModel):
    new_priority: str
    reason: str

class StatusRequest(BaseModel):
    new_status: str

@router.get("")
def list_investigations(db: Session = Depends(get_db), claims: dict = Depends(get_current_user_claims)):
    role = claims.get("role")
    query = db.query(FIRRecord)
    
    if role == "SP":
        query = query.join(PoliceStation).filter(PoliceStation.district_id == claims.get("district_id"))
    elif role == "SHO":
        query = query.filter(FIRRecord.police_station_id == claims.get("station_id"))
    elif role == "Constable":
        query = query.filter(FIRRecord.assigned_officer_id == claims.get("username"))
        
    records = query.order_by(FIRRecord.date_filed.desc()).limit(150).all()
    
    res = []
    for r in records:
        # Calculate SLA warning state
        days_left = (r.sla_deadline - datetime.utcnow()).days if r.sla_deadline else 99
        sla_status = "OK"
        if r.status != "Closed" and r.status != "Charge Sheeted":
            if days_left < 0:
                sla_status = "Breached"
            elif days_left < 7:
                sla_status = "Warning"
                
        res.append({
            "id": r.id,
            "crime_type": r.crime_type,
            "ipc_section": r.ipc_section,
            "date_filed": r.date_filed.isoformat(),
            "status": r.status,
            "assigned_officer_id": r.assigned_officer_id,
            "priority": r.priority,
            "sla_deadline": r.sla_deadline.isoformat() if r.sla_deadline else None,
            "days_left": days_left,
            "sla_status": sla_status
        })
    return res

@router.get("/{id}")
def get_investigation_details(id: str, db: Session = Depends(get_db), claims: dict = Depends(get_current_user_claims)):
    record = db.query(FIRRecord).filter(FIRRecord.id == id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investigation case not found")
        
    # Check authorization boundaries
    role = claims.get("role")
    if role == "SP" and record.station.district_id != claims.get("district_id"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to district data")
    elif role == "SHO" and record.police_station_id != claims.get("station_id"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to station data")
    elif role == "Constable" and record.assigned_officer_id != claims.get("username"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to unassigned case")
        
    days_left = (record.sla_deadline - datetime.utcnow()).days if record.sla_deadline else 99
    
    return {
        "id": record.id,
        "crime_type": record.crime_type,
        "ipc_section": record.ipc_section,
        "date_filed": record.date_filed.isoformat(),
        "status": record.status,
        "assigned_officer_id": record.assigned_officer_id,
        "priority": record.priority,
        "sla_deadline": record.sla_deadline.isoformat() if record.sla_deadline else None,
        "days_left": days_left,
        "summary": record.summary,
        "leads": record.leads or [],
        "evidence_correlations": record.evidence_correlations or [],
        "timeline": record.timeline or [],
        "victim_age": record.victim_age,
        "victim_gender": record.victim_gender,
        "police_station_name": record.station.name
    }

@router.post("/{id}/assign")
def assign_investigation(id: str, req: AssignRequest, db: Session = Depends(get_db), claims: dict = Depends(get_current_user_claims)):
    record = db.query(FIRRecord).filter(FIRRecord.id == id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investigation case not found")
        
    role = claims.get("role")
    if role not in ["DGP", "SP", "SHO"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permission to assign officer")
        
    # Verify assignee is active user
    officer = db.query(User).filter(User.username == req.officer_username).first()
    if not officer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target officer username not found")
        
    record.assigned_officer_id = officer.username
    
    # Update timeline
    timeline = record.timeline or []
    timeline.append({
        "date": datetime.utcnow().isoformat(),
        "event": f"Case assigned to officer: {officer.username} ({officer.role}) by {claims.get('username')}."
    })
    record.timeline = timeline
    
    db.commit()
    return {"message": f"Successfully assigned to {officer.username}", "timeline": timeline}

@router.post("/{id}/escalate")
def escalate_investigation(id: str, req: EscalateRequest, db: Session = Depends(get_db), claims: dict = Depends(get_current_user_claims)):
    record = db.query(FIRRecord).filter(FIRRecord.id == id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investigation case not found")
        
    record.priority = req.new_priority
    
    # Update timeline
    timeline = record.timeline or []
    timeline.append({
        "date": datetime.utcnow().isoformat(),
        "event": f"Priority escalated to '{req.new_priority}' by {claims.get('username')}. Reason: {req.reason}."
    })
    record.timeline = timeline
    
    db.commit()
    return {"message": "Successfully escalated priority", "timeline": timeline}

@router.post("/{id}/status")
def update_status(id: str, req: StatusRequest, db: Session = Depends(get_db), claims: dict = Depends(get_current_user_claims)):
    record = db.query(FIRRecord).filter(FIRRecord.id == id).first()
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investigation case not found")
        
    old_status = record.status
    record.status = req.new_status
    
    # Update timeline
    timeline = record.timeline or []
    timeline.append({
        "date": datetime.utcnow().isoformat(),
        "event": f"Case status updated from '{old_status}' to '{req.new_status}' by {claims.get('username')}."
    })
    record.timeline = timeline
    
    db.commit()
    return {"message": f"Successfully updated status to {req.new_status}", "timeline": timeline}
