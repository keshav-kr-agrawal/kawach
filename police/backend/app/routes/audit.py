from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import AuditLog
from app.auth import get_current_user_claims

router = APIRouter()

@router.get("")
def get_audit_trail(
    limit: int = 100,
    db: Session = Depends(get_db),
    claims: dict = Depends(get_current_user_claims)
):
    role = claims.get("role")
    
    # Restrict viewing audit trail to SP and DGP roles
    if role not in ["DGP", "SP"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Only SP and DGP roles can view system security audit logs."
        )
        
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit).all()
    
    return [{
        "id": log.id,
        "timestamp": log.timestamp.isoformat(),
        "username": log.username,
        "role": log.role,
        "action": log.action,
        "details": log.details,
        "ip_address": log.ip_address
    } for log in logs]
