from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db
from app.models import EntityMatchReview, Offender, FIRRecord, AuditLog, Vehicle, Phone, Account, fir_accused, offender_associates
from app.auth import get_current_user_claims
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

class ResolveMergeRequest(BaseModel):
    action: str  # merge, reject

@router.get("/entity-merges")
def list_pending_merges(db: Session = Depends(get_db), claims: dict = Depends(get_current_user_claims)):
    role = claims.get("role")
    if role not in ["DGP", "SP"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permission to view entity resolution queue")
        
    reviews = db.query(EntityMatchReview).filter(EntityMatchReview.status == "Pending").all()
    
    res = []
    for r in reviews:
        o1 = r.offender1
        o2 = r.offender2
        
        res.append({
            "id": r.id,
            "confidence_score": r.confidence_score,
            "status": r.status,
            "offender1": {
                "id": o1.id,
                "name": o1.name,
                "age": o1.age,
                "gender": o1.gender,
                "address": o1.address,
                "priors": o1.num_prior_offenses,
                "risk_score": o1.risk_score
            },
            "offender2": {
                "id": o2.id,
                "name": o2.name,
                "age": o2.age,
                "gender": o2.gender,
                "address": o2.address,
                "priors": o2.num_prior_offenses,
                "risk_score": o2.risk_score
            }
        })
    return res

@router.post("/entity-merges/{id}/resolve")
def resolve_entity_merge(
    id: int,
    req: ResolveMergeRequest,
    db: Session = Depends(get_db),
    claims: dict = Depends(get_current_user_claims)
):
    role = claims.get("role")
    if role not in ["DGP", "SP"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permission to resolve entity resolution queue")
        
    review = db.query(EntityMatchReview).filter(EntityMatchReview.id == id).first()
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Merge review record not found")
        
    o1 = review.offender1
    o2 = review.offender2
    
    if req.action == "merge":
        # Immutable Audit logging BEFORE the action
        audit = AuditLog(
            username=claims.get("username"),
            role=claims.get("role"),
            action="ENTITY_RESOLVE_MERGE",
            details={"message": f"Merged duplicate profiles: {o2.name} ({o2.id}) into {o1.name} ({o1.id})"},
            ip_address="10.25.0.1"
        )
        db.add(audit)
        
        # 1. Transfer FIR records
        for fir in o2.firs:
            if fir not in o1.firs:
                o1.firs.append(fir)
                
        # 2. Transfer associates
        for assoc in o2.associates:
            if assoc not in o1.associates and assoc.id != o1.id:
                o1.associates.append(assoc)
                
        # 3. Transfer vehicles
        db.query(Vehicle).filter(Vehicle.owner_offender_id == o2.id).update({Vehicle.owner_offender_id: o1.id})
        
        # 4. Transfer phones
        db.query(Phone).filter(Phone.owner_offender_id == o2.id).update({Phone.owner_offender_id: o1.id})
        
        # 5. Transfer accounts
        db.query(Account).filter(Account.owner_offender_id == o2.id).update({Account.owner_offender_id: o1.id})
        
        # 6. Recalculate priors & risk score
        o1.num_prior_offenses = o1.num_prior_offenses + o2.num_prior_offenses
        o1.risk_score = min(100.0, max(o1.risk_score, o2.risk_score) + 5.0)
        
        # 7. Delete offender2 and update review record
        review.status = "Merged"
        review.reviewed_by = claims.get("username")
        review.reviewed_at = datetime.utcnow()
        
        db.delete(o2)
        db.commit()
        return {"message": f"Successfully merged {o2.id} into {o1.id}"}
        
    elif req.action == "reject":
        audit = AuditLog(
            username=claims.get("username"),
            role=claims.get("role"),
            action="ENTITY_RESOLVE_REJECT",
            details={"message": f"Rejected duplicate profile merge of {o2.name} ({o2.id}) and {o1.name} ({o1.id})"},
            ip_address="10.25.0.1"
        )
        db.add(audit)
        
        review.status = "Rejected"
        review.reviewed_by = claims.get("username")
        review.reviewed_at = datetime.utcnow()
        
        db.commit()
        return {"message": "Merge suggestion rejected"}
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid action: choose merge or reject")
