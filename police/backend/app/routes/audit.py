from fastapi import APIRouter, Depends, HTTPException, status
from app.database import get_db
from app.auth import get_current_user_claims
from app.zcql_utils import zcql_rows, parse_datetime

router = APIRouter()

@router.get("")
def get_audit_trail(
    limit: int = 100,
    db=Depends(get_db),
    claims: dict = Depends(get_current_user_claims)
):
    role = claims.get("role")

    # Restrict viewing audit trail to SP and DGP roles
    if role not in ["DGP", "SP"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Only SP and DGP roles can view system security audit logs."
        )

    logs = zcql_rows(db, "AuditLog")
    logs.sort(key=lambda l: l.get("timestamp") or "", reverse=True)

    return [{
        "id": log.get("ROWID") or log.get("id"),
        "timestamp": (parse_datetime(log.get("timestamp")) or "").isoformat() if parse_datetime(log.get("timestamp")) else log.get("timestamp"),
        "username": log.get("username"),
        "role": log.get("role"),
        "action": log.get("action"),
        "details": log.get("details"),
        "ip_address": log.get("ip_address")
    } for log in logs[:limit]]
