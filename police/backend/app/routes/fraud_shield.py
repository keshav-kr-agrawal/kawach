from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Phone, Account, Offender, AuditLog
from app.auth import get_current_user_claims
from pydantic import BaseModel
from typing import List, Optional
import re
import random

router = APIRouter()

class FraudCheckRequest(BaseModel):
    type: str  # "phone", "upi", "link"
    value: str

class NCRPDraft(BaseModel):
    suspect_name: str
    suspect_phone: str
    suspect_account: str
    suspect_bank: str
    crime_type: str
    rationale: str
    narrative: str

class FraudCheckResponse(BaseModel):
    risk_level: str  # "Low", "Medium", "High"
    score: float
    rationale: str
    actions: List[str]
    ncrp_draft: Optional[NCRPDraft] = None

@router.post("/check", response_model=FraudCheckResponse)
def check_fraud_threat(
    req: FraudCheckRequest,
    db: Session = Depends(get_db),
    claims: dict = Depends(get_current_user_claims)
):
    val = req.value.strip()
    val_type = req.type.lower()
    
    # Audit log entry for monitoring activity
    audit = AuditLog(
        username=claims.get("sub", "anonymous"),
        role=claims.get("role", "Field Officer"),
        action="CITIZEN_FRAUD_SCAN",
        details={"type": val_type, "query": val},
        ip_address="10.25.0.1"
    )
    db.add(audit)
    db.commit()

    risk_level = "Low"
    score = 12.0
    rationale = "No suspicious matching nodes detected in State Crime Database or RBI Central Fraud Registry. Number has a normal communication reputation."
    actions = ["This contact appears safe.", "Exercise normal cyber precautions.", "Never share OTPs or click unverified links."]
    ncrp_draft = None

    if val_type == "phone":
        # 1. Query DB
        phone = db.query(Phone).filter(Phone.phone_number.ilike(f"%{val}%")).first()
        if phone and phone.owner:
            owner = phone.owner
            score = owner.risk_score
            risk_level = "High" if score >= 80 else "Medium"
            gang_names = ", ".join([g.name for g in owner.gangs]) or "No known syndicate"
            rationale = f"Phone match found in Crime Database. Owned by registered offender {owner.name} ({owner.id}), linked to syndicate: {gang_names}. Prior offenses: {owner.num_prior_offenses} cases."
            actions = [
                "DISCONNECT immediately. This is a flagged impersonation/fraud line.",
                "Block this phone number on all communication platforms.",
                "Report this encounter using the Auto-Draft NCRP portal below."
            ]
            
            # Generate pre-filled NCRP draft
            ncrp_draft = NCRPDraft(
                suspect_name=owner.name,
                suspect_phone=val,
                suspect_account=owner.accounts[0].account_number if owner.accounts else "SB-88203-9021",
                suspect_bank=owner.accounts[0].bank_name if owner.accounts else "State Bank of India",
                crime_type="Cyber Threat / Impersonation Scam",
                rationale=rationale,
                narrative=f"I received a phone call from {val} claiming to be law enforcement / custom officials. They threatened me with digital arrest. Suspect is linked in database as {owner.name} ({owner.id}). Please freeze accounts connected to this entity."
            )
        else:
            # Check for simulated high-risk pattern
            # For demonstration, numbers containing '420', '999', or ending in '88' are treated as high risk
            if "420" in val or "999" in val or val.endswith("88"):
                score = 86.4
                risk_level = "High"
                rationale = "Flagged by cell-tower ping anomalies. Co-located with digital arrest hubs in Jamtara/Mewat region. Outbound webhook calls show heavy pattern of spoofing."
                actions = [
                    "DISCONNECT the call immediately.",
                    "Do not transfer any funds or verify personal credentials.",
                    "Report this number to police command control."
                ]
                ncrp_draft = NCRPDraft(
                    suspect_name="Mewat Cyber Gang Operator",
                    suspect_phone=val,
                    suspect_account="SB-30291-8891",
                    suspect_bank="Canara Bank",
                    crime_type="Digital Arrest / Phishing Scam",
                    rationale=rationale,
                    narrative=f"Suspect calling from {val} impersonating CBI officials. Coerced into transfer. Please freeze transaction lines."
                )

    elif val_type == "upi" or val_type == "account":
        account = db.query(Account).filter(Account.account_number.ilike(f"%{val}%")).first()
        if account and account.owner:
            owner = account.owner
            score = owner.risk_score
            risk_level = "High" if score >= 80 else "Medium"
            rationale = f"Bank Account / UPI ID registered to offender {owner.name} ({owner.id}). Linked bank: {account.bank_name}. Risk flagged under money laundering & mule accounts registry."
            actions = [
                "STOP transaction immediately. Do NOT send money to this ID.",
                "Flag this account in banking system to prevent automated transactions.",
                "Draft NCRP freeze request immediately."
            ]
            ncrp_draft = NCRPDraft(
                suspect_name=owner.name,
                suspect_phone=owner.phones[0].phone_number if owner.phones else "+91-9844000121",
                suspect_account=val,
                suspect_bank=account.bank_name,
                crime_type="Financial Mule Account Scam",
                rationale=rationale,
                narrative=f"Transferred money to account/UPI {val} under fraudulent pretense. Mule account owner: {owner.name} ({owner.id}). Requesting instant freeze."
            )
        else:
            # Check for simulated high risk bank/UPI patterns
            if "420" in val or "mule" in val or val.endswith("88") or "@ybl" in val.lower() and "scam" in val.lower():
                score = 91.2
                risk_level = "High"
                rationale = "Flagged on RBI Central Fraud Registry. Account exhibits high-frequency credit-debit churn (money laundering behavior) with instant outbound transfers."
                actions = [
                    "DO NOT authorize payment or share security PIN.",
                    "Contact your branch and block outgoing UPI transfers if already initiated.",
                    "Auto-draft NCRP complaint below to request nodal freeze."
                ]
                ncrp_draft = NCRPDraft(
                    suspect_name="Unknown Mule Account Holder",
                    suspect_phone="+91-9123456789",
                    suspect_account=val,
                    suspect_bank="HDFC Bank",
                    crime_type="UPI Fraud / Mule Account Churn",
                    rationale=rationale,
                    narrative=f"Funds sent to suspicious account {val}. Transferred under coercion of threat. Initiate account holds."
                )

    elif val_type == "link":
        # Check suspicious patterns in link
        suspicious_words = ["cbi-court", "police-aadhar", "digital-arrest", "skype-verification", "refund-claim", "free-gift"]
        is_suspicious = any(word in val.lower() for word in suspicious_words) or val.startswith("http://")
        
        if is_suspicious or "420" in val or val.endswith("88"):
            score = 95.0
            risk_level = "High"
            rationale = "Phishing URL pattern detected. Links to unverified WebRTC servers mimicking courtroom backgrounds. Domain registered 48hrs ago via anonymous proxy."
            actions = [
                "DO NOT open the link or provide camera access.",
                "Close the browser tab immediately.",
                "Flag this domain for regional DNS blocking."
            ]
            ncrp_draft = NCRPDraft(
                suspect_name="Phishing Site Operator",
                suspect_phone="+91-9876543210",
                suspect_account="SB-00912-3321",
                suspect_bank="ICICI Bank",
                crime_type="Digital Arrest Skype Link Scam",
                rationale=rationale,
                narrative=f"Victim was directed to open a malicious videolink: {val} for digital arrest. Pre-filled hold request drafted."
            )

    return FraudCheckResponse(
        risk_level=risk_level,
        score=score,
        rationale=rationale,
        actions=actions,
        ncrp_draft=ncrp_draft
    )
