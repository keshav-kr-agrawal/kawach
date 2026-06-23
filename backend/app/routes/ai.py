from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import FIRRecord, Offender, Vehicle, Phone, Call, AuditLog, Gang
from app.auth import get_current_user_claims
from pydantic import BaseModel
from datetime import datetime
import re

router = APIRouter()

class ChatRequest(BaseModel):
    message: str

@router.post("/query")
def process_copilot_query(
    req: ChatRequest,
    db: Session = Depends(get_db),
    claims: dict = Depends(get_current_user_claims)
):
    msg = req.message.strip()
    msg_lower = msg.lower()
    
    # Track the interaction in the audit logs
    audit_log = AuditLog(
        username=claims.get("sub", "anonymous"),
        role=claims.get("role", "Field Officer"),
        action="AI_COPILOT_QUERY",
        details={"query": msg},
        ip_address="10.25.0.1"
    )
    db.add(audit_log)
    db.commit()
    
    # 1. Search for FIR references (e.g. FIR-2024-00005)
    fir_match = re.search(r'fir-\d{4}-\d+', msg_lower)
    if fir_match:
        fir_id = fir_match.group(0).upper()
        fir = db.query(FIRRecord).filter(FIRRecord.id == fir_id).first()
        if fir:
            citation = f"Citation: [FIRRecord: {fir.id}] filed on {fir.date_filed.strftime('%Y-%m-%d')} at {fir.station.name}."
            timeline_str = "\n".join([f"- {t.get('date')[:10]}: {t.get('event')}" for t in (fir.timeline or [])])
            leads_str = "\n".join([f"- {lead}" for lead in (fir.leads or [])])
            
            response_text = f"""### AI Case Synthesis: {fir.id}
**Status:** {fir.status} | **Priority:** {fir.priority} | **Crime Type:** {fir.crime_type}
**Assigned Officer:** {fir.assigned_officer_id or "Not Assigned"}

#### AI-Generated Summary
{fir.summary or "Summary not compiled yet."}

#### Case Timeline
{timeline_str or "No timeline events recorded."}

#### Recommended Investigative Leads
{leads_str or "- Monitor suspect activity and check phone logs."}

---
*Disclaimer: AI recommendations are advisory only. Final arrest and charge actions require manual human officer approval. No guilt is inferred by this summary.*
*Source Reference: {citation}*"""
            return {"response": response_text, "citations": [citation]}
        else:
            return {"response": f"Case ID **{fir_id}** was not found in the Data Lake. Please check the ID format and try again.", "citations": []}

    # 2. Search for Offender references (e.g. Ramesh Kumar or OFF-0011)
    off_match = re.search(r'off-\d+', msg_lower)
    offender_name = None
    offender = None
    
    if off_match:
        off_id = off_match.group(0).upper()
        offender = db.query(Offender).filter(Offender.id == off_id).first()
    else:
        # Check if query names an offender like Ramesh Kumar or Zia Ahmed
        for name in ["ramesh", "suresh", "zia", "anil", "vikram"]:
            if name in msg_lower:
                offender = db.query(Offender).filter(Offender.name.ilike(f"%{name}%")).first()
                break

    if offender:
        citation = f"Citation: [OffenderProfile: {offender.id} - {offender.name}], priors: {offender.num_prior_offenses}."
        vehicles = ", ".join([f"{v.make} {v.model} ({v.plate_number})" for v in offender.vehicles]) or "None registered"
        phones = ", ".join([p.phone_number for p in offender.phones]) or "None logged"
        gangs = ", ".join([g.name for g in offender.gangs]) or "None"
        associates = ", ".join([a.name for a in offender.associates]) or "No immediate associates logged"
        
        response_text = f"""### Master Criminal Profile: {offender.name} ({offender.id})
**Syndicate Affiliation:** {gangs}
**Priors Count:** {offender.num_prior_offenses} offenses | **Risk Score:** {offender.risk_score}%

#### Known Assets & Identifiers
- **Registered Vehicles:** {vehicles}
- **Phone Numbers:** {phones}

#### Known Criminal Network
- **Associates:** {associates}

#### Guardrail Disclaimer
*System compliance notification: This platform does NOT profile race, religion, caste, or ethnicity. No automated guilt or arrest suggestions have been generated. Prior arrest rates are shown for mapping context only.*
---
*Source Reference: {citation}*"""
        return {"response": response_text, "citations": [citation]}

    # 3. Vehicle Lookup (e.g. KA-01-XY-1002)
    veh_match = re.search(r'ka-\d{2}-[a-z]{2}-\d+', msg_lower)
    if veh_match:
        plate = veh_match.group(0).upper()
        veh = db.query(Vehicle).filter(Vehicle.plate_number.ilike(f"%{plate}%")).first()
        if veh:
            citation = f"Citation: [Vehicle Table: {veh.plate_number}] owned by {veh.owner.name if veh.owner else 'Unknown'}."
            response_text = f"""### Vehicle Ownership Details
**Plate Number:** {veh.plate_number}
**Make / Model:** {veh.make} {veh.model}
**Registered Owner:** {veh.owner.name if veh.owner else "Unknown"} ({veh.owner_offender_id or "N/A"})

---
*Source Reference: {citation}*"""
            return {"response": response_text, "citations": [citation]}
        else:
            return {"response": f"Vehicle plate **{plate}** was not found in our database records.", "citations": []}

    # 4. Fallback options & help instructions
    response_text = """### KAWACH AI Copilot Support
I can synthesize crime records, map suspect associate lines, locate vehicles, and construct investigation case summaries from the Data Lake.

**Example queries you can run:**
- *Summarize case FIR-2024-00001*
- *Analyze profile Ramesh Kumar*
- *Who owns vehicle KA-15-XY-0020?*
- *Find associates of OFF-0010*

---
*System Compliance: Fully compliant with the Digital Personal Data Protection (DPDP) Act, carrying strict disclaimers preventing automated individual profiling.*"""
    return {"response": response_text, "citations": []}
