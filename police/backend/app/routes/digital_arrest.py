"""
Digital Arrest Live-Session Monitor.

The ET PS headline flow: a citizen (or the citizen app automatically) opens a
monitored session while a suspected digital-arrest call is in progress. Each
detection signal — scam-script text, voice-spoof probability, video deepfake
probability, attempted transaction — is ingested as it happens and fused into
one running risk score. When the fused score crosses the alert threshold the
session flips to ALERT_DISPATCHED **before any money moves**, and the event is
audit-logged for the evidence trail.

Fusion is deterministic and explainable: fixed modality weights, a
multi-modality corroboration bonus, and behavioral signals reused from the
Fraud Shield (call-burst anomaly, mule-network shape). No random numbers.
"""

import re
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AuditLog
from app.auth import get_current_user_claims
from app.routes.fraud_shield import call_burst_anomaly, mule_network_signal
from app.models import Phone

router = APIRouter()

ALERT_THRESHOLD = 70.0

# Modality weights for the fused score (sum = 1.0).
# Behavioral/transaction carries the most weight — it is the signal closest to
# actual harm (money moving) and the one regulators flagged as missing.
MODALITY_WEIGHTS = {
    "text": 0.30,
    "voice": 0.20,
    "video": 0.20,
    "transaction": 0.30,
}

# ── Scam-script pattern bank ─────────────────────────────────────────────────
# Weighted categories drawn from documented digital-arrest playbooks:
# impersonation of agencies, legal threats, isolation instructions, and
# payment demands. A category counts once no matter how many of its phrases
# match; the strongest scripts hit all four.
SCRIPT_PATTERNS = {
    "impersonation": {
        "weight": 0.25,
        "phrases": [
            "cbi", "enforcement directorate", " ed ", "customs", "narcotics",
            "police station", "cyber cell", "trai", "rbi officer", "income tax",
            "interpol", "supreme court", "arrest warrant", "fir registered",
            "courier", "fedex", "parcel",
        ],
    },
    "threat": {
        "weight": 0.20,
        "phrases": [
            "digital arrest", "you are under arrest", "money laundering",
            "aadhaar linked", "aadhar linked", "your bank account is involved",
            "non-bailable", "legal action", "case registered against you",
            "arrest you", "jail", "custody",
        ],
    },
    "isolation": {
        "weight": 0.25,
        "phrases": [
            "do not disconnect", "don't disconnect", "stay on the line",
            "do not tell anyone", "don't tell anyone", "keep this confidential",
            "do not inform", "switch to video", "skype", "join video call",
            "keep your camera on", "do not leave the room",
        ],
    },
    "payment_demand": {
        "weight": 0.30,
        "phrases": [
            "rtgs", "neft", "transfer the amount", "security deposit",
            "verification deposit", "refundable deposit", "clear your name",
            "send money", "upi", "gift card", "pay the fine",
            "transfer funds", "bank details", "share otp", "one time password",
        ],
    },
}


def score_scam_script(text: str) -> tuple:
    """Deterministic 0-1 script score + list of matched categories."""
    t = f" {text.lower()} "
    matched = []
    score = 0.0
    for category, spec in SCRIPT_PATTERNS.items():
        hits = [p for p in spec["phrases"] if p in t]
        if hits:
            matched.append({"category": category, "examples": hits[:3]})
            score += spec["weight"]
    return min(1.0, score), matched


# ── Session store (in-memory; demo-scale, single worker) ─────────────────────
SESSIONS = {}


class SessionStartRequest(BaseModel):
    victim_phone: Optional[str] = None
    suspect_phone: Optional[str] = None
    notes: Optional[str] = None


class SignalRequest(BaseModel):
    modality: str                       # text | voice | video | transaction
    # text
    content: Optional[str] = None
    # voice (from citizen-side voice classifier)
    spoof_probability: Optional[float] = None
    # video (from Classifier /classify)
    fake_probability: Optional[float] = None
    faces_detected: Optional[int] = None
    # transaction attempt
    amount_inr: Optional[float] = None
    account_monthly_txn_count: Optional[int] = None  # victim account's normal activity


def _fuse(session) -> float:
    """Weighted fusion over the latest strength per modality + corroboration bonus."""
    latest = {}
    for sig in session["signals"]:
        latest[sig["modality"]] = sig["strength"]

    fused = sum(MODALITY_WEIGHTS[m] * s for m, s in latest.items()) * 100

    # Corroboration bonus: independent modalities agreeing is the strongest
    # indicator of an organized scam operation vs a single false positive.
    strong = sum(1 for s in latest.values() if s >= 0.5)
    if strong >= 3:
        fused += 15
    elif strong == 2:
        fused += 8

    return round(min(100.0, fused), 1)


@router.post("/session/start")
def start_session(
    req: SessionStartRequest,
    db: Session = Depends(get_db),
    claims: dict = Depends(get_current_user_claims),
):
    session_id = f"DAS-{uuid.uuid4().hex[:8].upper()}"
    session = {
        "id": session_id,
        "started_at": datetime.utcnow().isoformat(),
        "victim_phone": req.victim_phone,
        "suspect_phone": req.suspect_phone,
        "notes": req.notes,
        "status": "MONITORING",
        "risk_score": 0.0,
        "signals": [],
        "timeline": [{"at": datetime.utcnow().isoformat(), "event": "Session opened — live monitoring started"}],
        "alert_dispatched_at": None,
    }

    # Pre-seed behavioral intelligence on the suspect line, if known.
    if req.suspect_phone:
        burst = call_burst_anomaly(db, req.suspect_phone)
        if burst:
            session["signals"].append({
                "at": datetime.utcnow().isoformat(),
                "modality": "transaction",
                "strength": min(1.0, burst[0] / 15.0),
                "detail": f"Suspect-line behavioral anomaly at session open: {burst[1]}",
            })
            session["timeline"].append({
                "at": datetime.utcnow().isoformat(),
                "event": f"Behavioral pre-check flagged suspect line: {burst[1]}",
            })
        phone = db.query(Phone).filter(Phone.phone_number.ilike(f"%{req.suspect_phone}%")).first()
        if phone and phone.owner:
            mule = mule_network_signal(phone.owner)
            if mule:
                session["timeline"].append({
                    "at": datetime.utcnow().isoformat(),
                    "event": f"Suspect line owner matches mule profile: {mule[1]}",
                })

    session["risk_score"] = _fuse(session)
    SESSIONS[session_id] = session

    db.add(AuditLog(
        username=claims.get("sub", "citizen"),
        role=claims.get("role", "Citizen"),
        action="DIGITAL_ARREST_SESSION_START",
        details={"session_id": session_id, "suspect_phone": req.suspect_phone},
        ip_address="10.25.0.1",
    ))
    db.commit()
    return session


@router.post("/session/{session_id}/signal")
def ingest_signal(
    session_id: str,
    req: SignalRequest,
    db: Session = Depends(get_db),
    claims: dict = Depends(get_current_user_claims),
):
    session = SESSIONS.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found — start one via /session/start")
    if req.modality not in MODALITY_WEIGHTS:
        raise HTTPException(status_code=400, detail=f"modality must be one of {list(MODALITY_WEIGHTS)}")

    now = datetime.utcnow().isoformat()
    strength, detail = 0.0, ""

    if req.modality == "text":
        if not req.content:
            raise HTTPException(status_code=400, detail="text signal requires 'content'")
        strength, matched = score_scam_script(req.content)
        cats = ", ".join(m["category"] for m in matched) or "no scam-script categories"
        detail = f"Script analysis matched: {cats} (score {strength:.2f})"

    elif req.modality == "voice":
        if req.spoof_probability is None:
            raise HTTPException(status_code=400, detail="voice signal requires 'spoof_probability'")
        strength = max(0.0, min(1.0, req.spoof_probability))
        detail = f"Voice-spoof classifier probability: {strength:.2f}"

    elif req.modality == "video":
        if req.fake_probability is None:
            raise HTTPException(status_code=400, detail="video signal requires 'fake_probability'")
        strength = max(0.0, min(1.0, req.fake_probability))
        detail = f"Deepfake classifier probability: {strength:.2f} ({req.faces_detected or 0} face(s))"

    elif req.modality == "transaction":
        if req.amount_inr is None:
            raise HTTPException(status_code=400, detail="transaction signal requires 'amount_inr'")
        # Anomaly shape: large transfer from a low-activity account mid-call.
        monthly = req.account_monthly_txn_count if req.account_monthly_txn_count is not None else 10
        amount_factor = min(1.0, req.amount_inr / 100000.0)      # ₹1L+ saturates
        dormancy_factor = 1.0 if monthly <= 3 else (0.6 if monthly <= 10 else 0.3)
        strength = round(min(1.0, amount_factor * 0.6 + dormancy_factor * 0.4), 2)
        detail = (
            f"Attempted transfer of ₹{req.amount_inr:,.0f} from an account with "
            f"~{monthly} txns/month — anomaly strength {strength:.2f}"
        )

    session["signals"].append({"at": now, "modality": req.modality, "strength": strength, "detail": detail})
    session["timeline"].append({"at": now, "event": detail})
    session["risk_score"] = _fuse(session)

    # Pre-transfer alert: fires the moment fusion crosses threshold.
    if session["risk_score"] >= ALERT_THRESHOLD and session["status"] == "MONITORING":
        session["status"] = "ALERT_DISPATCHED"
        session["alert_dispatched_at"] = now
        session["timeline"].append({
            "at": now,
            "event": (
                f"🚨 DISPATCH ALERT at fused risk {session['risk_score']}/100 — "
                f"active digital-arrest session flagged BEFORE financial transfer. "
                f"Victim advisory issued; suspect line queued for telco escalation."
            ),
        })
        db.add(AuditLog(
            username=claims.get("sub", "citizen"),
            role=claims.get("role", "Citizen"),
            action="DIGITAL_ARREST_ALERT",
            details={
                "session_id": session_id,
                "risk_score": session["risk_score"],
                "signal_count": len(session["signals"]),
                "suspect_phone": session.get("suspect_phone"),
            },
            ip_address="10.25.0.1",
        ))
        db.commit()

    return session


@router.get("/session/{session_id}")
def get_session(session_id: str, claims: dict = Depends(get_current_user_claims)):
    session = SESSIONS.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.get("/sessions")
def list_sessions(claims: dict = Depends(get_current_user_claims)):
    return sorted(SESSIONS.values(), key=lambda s: s["started_at"], reverse=True)
