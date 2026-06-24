from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import MissingPerson, UnidentifiedBody, TelecomCDR, RBIFraudRegistry, AuditLog
from app.auth import get_current_user_claims
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

class MissingPersonOut(BaseModel):
    id: str
    name: str
    age: int
    gender: str
    last_seen_date: datetime
    last_seen_location: str
    photo_url: Optional[str]
    status: str

    class Config:
        from_attributes = True

class UnidentifiedBodyOut(BaseModel):
    id: str
    estimated_age: int
    gender: str
    found_date: datetime
    found_location: str
    distinguishing_features: str
    status: str

    class Config:
        from_attributes = True

class TelecomCDROut(BaseModel):
    id: int
    phone_number: str
    imsi: Optional[str]
    imei: Optional[str]
    cell_tower_id: Optional[str]
    call_type: str
    associated_number: str
    duration_seconds: int
    timestamp: datetime

    class Config:
        from_attributes = True

class RBIFraudRegistryOut(BaseModel):
    id: int
    account_number: str
    bank_name: str
    flagged_date: datetime
    fraud_type: str
    reported_amount: float
    status: str

    class Config:
        from_attributes = True

@router.get("/missing-persons", response_model=List[MissingPersonOut])
def get_missing_persons(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    claims: dict = Depends(get_current_user_claims)
):
    query = db.query(MissingPerson)
    if status_filter:
        query = query.filter(MissingPerson.status == status_filter)
    return query.limit(100).all()

@router.get("/unidentified-bodies", response_model=List[UnidentifiedBodyOut])
def get_unidentified_bodies(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    claims: dict = Depends(get_current_user_claims)
):
    query = db.query(UnidentifiedBody)
    if status_filter:
        query = query.filter(UnidentifiedBody.status == status_filter)
    return query.limit(100).all()

@router.get("/cdrs", response_model=List[TelecomCDROut])
def get_cdrs(
    phone: Optional[str] = None,
    db: Session = Depends(get_db),
    claims: dict = Depends(get_current_user_claims)
):
    # Log query activity in audit log
    audit = AuditLog(
        username=claims.get("sub", "anonymous"),
        role=claims.get("role", "Field Officer"),
        action="VIEW_CDR_REGISTRY",
        details={"search_phone": phone},
        ip_address="10.25.0.1"
    )
    db.add(audit)
    db.commit()

    query = db.query(TelecomCDR)
    if phone:
        query = query.filter(TelecomCDR.phone_number.ilike(f"%{phone}%") | TelecomCDR.associated_number.ilike(f"%{phone}%"))
    return query.order_by(TelecomCDR.timestamp.desc()).limit(150).all()

@router.get("/rbi-registry", response_model=List[RBIFraudRegistryOut])
def get_rbi_registry(
    account: Optional[str] = None,
    db: Session = Depends(get_db),
    claims: dict = Depends(get_current_user_claims)
):
    query = db.query(RBIFraudRegistry)
    if account:
        query = query.filter(RBIFraudRegistry.account_number.ilike(f"%{account}%"))
    return query.order_by(RBIFraudRegistry.flagged_date.desc()).limit(100).all()
