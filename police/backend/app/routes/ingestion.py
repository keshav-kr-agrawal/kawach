from fastapi import APIRouter, Depends, HTTPException, status
from app.database import get_db
from app.auth import get_current_user_claims
from app.zcql_utils import zcql_rows, log_audit
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
    db=Depends(get_db),
    claims: dict = Depends(get_current_user_claims)
):
    rows = zcql_rows(db, "MissingPerson")
    if status_filter:
        rows = [r for r in rows if r.get("status") == status_filter]
    return rows[:100]

@router.get("/unidentified-bodies", response_model=List[UnidentifiedBodyOut])
def get_unidentified_bodies(
    status_filter: Optional[str] = None,
    db=Depends(get_db),
    claims: dict = Depends(get_current_user_claims)
):
    rows = zcql_rows(db, "UnidentifiedBody")
    if status_filter:
        rows = [r for r in rows if r.get("status") == status_filter]
    return rows[:100]

@router.get("/cdrs", response_model=List[TelecomCDROut])
def get_cdrs(
    phone: Optional[str] = None,
    db=Depends(get_db),
    claims: dict = Depends(get_current_user_claims)
):
    log_audit(db, claims.get("sub", claims.get("username", "anonymous")), claims.get("role", "Field Officer"),
              "VIEW_CDR_REGISTRY", {"search_phone": phone})

    rows = zcql_rows(db, "TelecomCDR")
    if phone:
        rows = [r for r in rows if phone in (r.get("phone_number") or "") or phone in (r.get("associated_number") or "")]
    rows.sort(key=lambda r: str(r.get("timestamp") or ""), reverse=True)
    return rows[:150]

@router.get("/rbi-registry", response_model=List[RBIFraudRegistryOut])
def get_rbi_registry(
    account: Optional[str] = None,
    db=Depends(get_db),
    claims: dict = Depends(get_current_user_claims)
):
    rows = zcql_rows(db, "RBIFraudRegistry")
    if account:
        rows = [r for r in rows if account in (r.get("account_number") or "")]
    rows.sort(key=lambda r: str(r.get("flagged_date") or ""), reverse=True)
    return rows[:100]
