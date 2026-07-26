from fastapi import APIRouter, Depends, HTTPException, status
from app.database import get_db
from app.auth import get_current_user_claims
from app.zcql_utils import log_audit
from pydantic import BaseModel

router = APIRouter()

class ResolveMergeRequest(BaseModel):
    action: str  # merge, reject

@router.get("/entity-merges")
def list_pending_merges(db=Depends(get_db), claims: dict = Depends(get_current_user_claims)):
    role = claims.get("role")
    if role not in ["DGP", "SP"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permission to view entity resolution queue")

    # EntityMatchReview has no surviving table in the Zoho-prescribed schema
    # (the Catalyst migration dropped it along with the old Offender fuzzy-
    # match tooling) — returning an honest empty queue rather than fabricating
    # merge candidates against data that doesn't exist.
    return []

@router.post("/entity-merges/{id}/resolve")
def resolve_entity_merge(
    id: int,
    req: ResolveMergeRequest,
    db=Depends(get_db),
    claims: dict = Depends(get_current_user_claims)
):
    role = claims.get("role")
    if role not in ["DGP", "SP"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permission to resolve entity resolution queue")

    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Entity merge review queue is not available — EntityMatchReview has no table in the current Catalyst schema.",
    )
