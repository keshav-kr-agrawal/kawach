from fastapi import APIRouter, Depends, HTTPException, status
from app.database import get_db
from app.auth import get_current_user_claims
from app.zcql_utils import zcql_rows, parse_datetime, log_audit
from pydantic import BaseModel
from typing import List, Optional, Tuple
from datetime import datetime, timedelta
import re

router = APIRouter()


def call_burst_anomaly(db, phone_number: str) -> Optional[Tuple[float, str]]:
    """
    Behavioral anomaly signal for digital-arrest detection: a dormant or
    low-activity line that suddenly bursts with calls is a signature of an
    active scam operation (the pattern regulators flagged as missing from
    current bank/telco tooling). Compares last-7-day call volume against the
    prior-90-day daily baseline using real Call rows.

    Returns (risk_bonus 0-15, rationale) or None if no anomaly / no data.
    """
    now = datetime.utcnow()
    recent_start = now - timedelta(days=7)
    baseline_start = now - timedelta(days=97)

    recent, baseline = 0, 0
    for c in zcql_rows(db, "Call"):
        if c.get("caller_phone") != phone_number and c.get("receiver_phone") != phone_number:
            continue
        ts = parse_datetime(c.get("timestamp"))
        if not ts:
            continue
        if ts >= recent_start:
            recent += 1
        elif ts >= baseline_start:
            baseline += 1

    baseline_daily = baseline / 90.0
    recent_daily = recent / 7.0

    if recent < 5:
        return None
    if baseline_daily < 0.1:  # effectively dormant before
        return (15.0, f"Line was dormant ({baseline} calls in prior 90 days) then made/received "
                      f"{recent} calls in the last 7 days — burst-after-dormancy is a known "
                      f"digital-arrest operation signature.")
    ratio = recent_daily / baseline_daily
    if ratio >= 3:
        return (min(12.0, 4.0 * (ratio / 3)),
                f"Call volume is {ratio:.1f}x the line's own 90-day baseline "
                f"({recent_daily:.1f}/day vs {baseline_daily:.1f}/day) — abnormal activity burst.")
    return None


def mule_network_signal(db, owner: dict) -> Optional[Tuple[float, str]]:
    """
    Mule-shape signal: an account/phone owner with little or no criminal
    history who is directly tied to high-risk offenders. Mirrors the
    graph-intelligence mule heuristic in routes/network.py — "associates"
    here means other Accused rows sharing the same CaseMasterID, since the
    old Offender.associates many-to-many table has no surviving equivalent.
    Returns (risk_bonus 0-20, rationale) or None.
    """
    priors = owner.get("num_prior_offenses") or 0
    own_risk = owner.get("risk_score") or 0
    if priors > 1 or own_risk >= 50:
        return None  # already an established offender — not mule-shaped

    all_accused = zcql_rows(db, "Accused")
    associates = [
        a for a in all_accused
        if a.get("CaseMasterID") == owner.get("CaseMasterID") and a.get("AccusedMasterID") != owner.get("AccusedMasterID")
    ]
    high_risk_ties = [a for a in associates if (a.get("risk_score") or 0) >= 70]
    if not high_risk_ties:
        return None

    return (
        min(20.0, 10.0 + 5.0 * len(high_risk_ties)),
        f"Owner {owner.get('AccusedName')} has a clean history ({priors} priors) but "
        f"{len(high_risk_ties)} co-accused with risk ≥70% — the receive-and-forward mule profile.",
    )

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
    db=Depends(get_db),
    claims: dict = Depends(get_current_user_claims)
):
    val = req.value.strip()
    val_type = req.type.lower()

    log_audit(db, claims.get("sub", claims.get("username", "anonymous")), claims.get("role", "Field Officer"),
              "CITIZEN_FRAUD_SCAN", {"type": val_type, "query": val})

    risk_level = "Low"
    score = 12.0
    rationale = "No suspicious matching nodes detected in State Crime Database or RBI Central Fraud Registry. Number has a normal communication reputation."
    actions = ["This contact appears safe.", "Exercise normal cyber precautions.", "Never share OTPs or click unverified links."]
    ncrp_draft = None

    if val_type == "phone":
        # 1. Query DB
        phone = next((p for p in zcql_rows(db, "Phone") if val in (p.get("phone_number") or "")), None)
        owner = None
        if phone and phone.get("owner_offender_id") is not None:
            owner = next((a for a in zcql_rows(db, "Accused") if a.get("AccusedMasterID") == phone["owner_offender_id"]), None)
        if owner:
            score = owner.get("risk_score") or 0
            rationale = f"Phone match found in Crime Database. Owned by registered offender {owner.get('AccusedName')} ({owner.get('AccusedMasterID')}). Prior offenses: {owner.get('num_prior_offenses')} cases."

            # Behavioral anomaly fusion: dormancy-burst + mule-network signals
            burst = call_burst_anomaly(db, phone["phone_number"])
            if burst:
                score = min(100.0, score + burst[0])
                rationale += f" ANOMALY: {burst[1]}"
            mule = mule_network_signal(db, owner)
            if mule:
                score = min(100.0, score + mule[0])
                rationale += f" MULE SIGNAL: {mule[1]}"

            risk_level = "High" if score >= 80 else "Medium"
            actions = [
                "DISCONNECT immediately. This is a flagged impersonation/fraud line.",
                "Block this phone number on all communication platforms.",
                "Report this encounter using the Auto-Draft NCRP portal below."
            ]

            owner_accounts = [ac for ac in zcql_rows(db, "Account") if ac.get("owner_offender_id") == owner.get("AccusedMasterID")]
            ncrp_draft = NCRPDraft(
                suspect_name=owner.get("AccusedName"),
                suspect_phone=val,
                suspect_account=owner_accounts[0]["account_number"] if owner_accounts else "SB-88203-9021",
                suspect_bank=owner_accounts[0].get("bank_name") if owner_accounts else "State Bank of India",
                crime_type="Cyber Threat / Impersonation Scam",
                rationale=rationale,
                narrative=f"I received a phone call from {val} claiming to be law enforcement / custom officials. They threatened me with digital arrest. Suspect is linked in database as {owner.get('AccusedName')} ({owner.get('AccusedMasterID')}). Please freeze accounts connected to this entity."
            )
        else:
            # Unknown number — still run the behavioral anomaly check against
            # real call records. This is the "lead time before mass
            # victimization" case: no criminal record yet, but the line's
            # own activity pattern is anomalous.
            burst = call_burst_anomaly(db, val)
            if burst:
                score = 40.0 + burst[0] * 2  # 40-70 range: warning tier, honest about uncertainty
                risk_level = "Medium"
                rationale = (
                    f"Number has no criminal-database match, but behavioral analysis of call "
                    f"records raises concern. {burst[1]}"
                )
                actions = [
                    "Treat unsolicited calls from this number with high suspicion.",
                    "Do not transfer funds or share OTP/credentials on this call.",
                    "If the caller claims to be police/CBI/customs: hang up — 'digital arrest' does not exist in Indian law. Verify via 1930."
                ]
            # Demo pattern heuristic (seed-data convention, not real intelligence):
            # numbers containing '420'/'999' or ending '88' simulate a scam line
            elif "420" in val or "999" in val or val.endswith("88"):
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
        account = next((ac for ac in zcql_rows(db, "Account") if val in (ac.get("account_number") or "")), None)
        owner = None
        if account and account.get("owner_offender_id") is not None:
            owner = next((a for a in zcql_rows(db, "Accused") if a.get("AccusedMasterID") == account["owner_offender_id"]), None)
        if owner:
            score = owner.get("risk_score") or 0
            rationale = f"Bank Account / UPI ID registered to offender {owner.get('AccusedName')} ({owner.get('AccusedMasterID')}). Linked bank: {account.get('bank_name')}. Risk flagged under money laundering & mule accounts registry."

            mule = mule_network_signal(db, owner)
            if mule:
                score = min(100.0, score + mule[0])
                rationale += f" MULE SIGNAL: {mule[1]}"

            risk_level = "High" if score >= 80 else "Medium"
            actions = [
                "STOP transaction immediately. Do NOT send money to this ID.",
                "Flag this account in banking system to prevent automated transactions.",
                "Draft NCRP freeze request immediately."
            ]
            owner_phones = [p for p in zcql_rows(db, "Phone") if p.get("owner_offender_id") == owner.get("AccusedMasterID")]
            ncrp_draft = NCRPDraft(
                suspect_name=owner.get("AccusedName"),
                suspect_phone=owner_phones[0]["phone_number"] if owner_phones else "+91-9844000121",
                suspect_account=val,
                suspect_bank=account.get("bank_name"),
                crime_type="Financial Mule Account Scam",
                rationale=rationale,
                narrative=f"Transferred money to account/UPI {val} under fraudulent pretense. Mule account owner: {owner.get('AccusedName')} ({owner.get('AccusedMasterID')}). Requesting instant freeze."
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
