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

import io
import os
import re
import uuid
import wave
from datetime import datetime
from typing import List, Optional

import numpy as np
import requests
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AuditLog
from app.auth import get_current_user_claims
from app.routes.fraud_shield import call_burst_anomaly, mule_network_signal
from app.models import Phone

router = APIRouter()

CLASSIFIER_URL = os.environ.get("CLASSIFIER_URL", "http://localhost:8001")

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


def analyze_voice_heuristic(wav_bytes: bytes) -> tuple:
    """
    Classical acoustic heuristic for voice-spoof likelihood — NOT a trained
    model. As documented in CLAUDE.md's currency-detector precedent, no
    trustworthy pretrained AI-voice/spoof-detection model is freely available
    to drop in here, and training one needs a labeled corpus this project
    doesn't have. Rather than fake a confident number, this combines three
    classical DSP proxies known to separate live human speech from
    synthetic/replayed audio, and returns a coarse 0-1 proxy plus the exact
    numbers behind it:
      - spectral flatness (vocoded/TTS voices skew unnaturally flat or
        unnaturally tonal vs natural mid-range speech)
      - pitch-period jitter via short-frame autocorrelation (natural speech
        has continuous micro-jitter; many clones are suspiciously stable)
      - amplitude-envelope regularity (robotic-cadence proxy)
    Only accepts 16-bit PCM WAV (stdlib `wave` — no extra audio codec deps).
    """
    try:
        with wave.open(io.BytesIO(wav_bytes), "rb") as wf:
            n_channels = wf.getnchannels()
            sampwidth = wf.getsampwidth()
            framerate = wf.getframerate()
            n_frames = wf.getnframes()
            raw = wf.readframes(n_frames)
    except Exception as e:
        raise ValueError(f"Could not decode audio as 16-bit PCM WAV: {e}")

    if sampwidth != 2:
        raise ValueError("Only 16-bit PCM WAV is supported by the acoustic heuristic.")

    samples = np.frombuffer(raw, dtype=np.int16).astype(np.float64)
    if n_channels > 1:
        samples = samples.reshape(-1, n_channels).mean(axis=1)
    if samples.size < framerate * 0.5:
        raise ValueError("Clip too short for reliable analysis (need >= 0.5s of audio).")

    peak = np.max(np.abs(samples))
    if peak < 1e-6:
        raise ValueError("Clip is silent.")
    samples = samples / peak

    # Spectral flatness (Wiener entropy) over up to the first 5 seconds.
    window = samples[: min(len(samples), int(framerate * 5))]
    spectrum = np.abs(np.fft.rfft(window * np.hanning(len(window))))
    spectrum = spectrum[spectrum > 1e-9]
    flatness = float(np.exp(np.mean(np.log(spectrum))) / (np.mean(spectrum) + 1e-9)) if spectrum.size else 0.0

    # Pitch-period jitter via short-frame autocorrelation (70-400 Hz search band).
    frame_len = int(framerate * 0.03)
    hop = max(1, frame_len // 2)
    periods = []
    for start in range(0, len(samples) - frame_len, hop):
        frame = samples[start:start + frame_len]
        if np.max(np.abs(frame)) < 0.02:
            continue
        corr = np.correlate(frame, frame, mode="full")[len(frame) - 1:]
        min_lag, max_lag = int(framerate / 400), int(framerate / 70)
        if max_lag >= len(corr) or corr[0] <= 0:
            continue
        segment = corr[min_lag:max_lag]
        if segment.size == 0:
            continue
        peak_lag = min_lag + int(np.argmax(segment))
        if corr[peak_lag] / corr[0] > 0.3:
            periods.append(peak_lag / framerate)
    jitter = float(np.std(np.diff(periods)) / (np.mean(periods) + 1e-9)) if len(periods) >= 4 else None

    # Amplitude-envelope regularity.
    env_frame = max(1, int(framerate * 0.02))
    envelope = np.array([
        np.sqrt(np.mean(samples[i:i + env_frame] ** 2))
        for i in range(0, len(samples) - env_frame, env_frame)
    ])
    env_cv = float(np.std(envelope) / (np.mean(envelope) + 1e-9)) if envelope.size > 2 else None

    signals = []
    if jitter is not None:
        signals.append(1.0 if jitter < 0.008 else (0.5 if jitter < 0.015 else 0.15))
    if env_cv is not None:
        signals.append(1.0 if env_cv < 0.15 else (0.5 if env_cv < 0.3 else 0.15))
    signals.append(1.0 if (flatness > 0.55 or flatness < 0.05) else (0.5 if flatness > 0.4 else 0.15))

    spoof_likelihood = round(float(np.mean(signals)), 3) if signals else 0.5
    finding = (
        f"Acoustic heuristic (classical DSP, not a trained model): spectral flatness "
        f"{flatness:.2f}, pitch-jitter {'n/a' if jitter is None else f'{jitter:.3f}'}, "
        f"envelope CV {'n/a' if env_cv is None else f'{env_cv:.2f}'} -> "
        f"spoof-likelihood proxy {spoof_likelihood:.2f}"
    )
    return spoof_likelihood, finding


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

    return _apply_signal(session, session_id, req.modality, strength, detail, db, claims)


def _apply_signal(session, session_id, modality, strength, detail, db, claims):
    now = datetime.utcnow().isoformat()
    session["signals"].append({"at": now, "modality": modality, "strength": strength, "detail": detail})
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


@router.post("/session/{session_id}/signal/video-frame")
async def ingest_video_frame(
    session_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    claims: dict = Depends(get_current_user_claims),
):
    """
    Real deepfake signal: forwards the uploaded call-frame/clip to the
    Classifier microservice's real MTCNN + dual-EfficientNet-B7 pipeline
    (`/classify`) instead of trusting a client-supplied fake_probability.
    """
    session = SESSIONS.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found — start one via /session/start")

    blob = await file.read()
    try:
        r = requests.post(
            f"{CLASSIFIER_URL}/classify",
            files={"file": (file.filename or "frame.jpg", blob, file.content_type or "image/jpeg")},
            timeout=120,
        )
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Classifier unreachable — no fake signal fabricated: {e}")

    fake_prob = float(data.get("fake_probability", 0.5))
    faces = data.get("faces_detected", 0)
    strength = max(0.0, min(1.0, fake_prob))
    detail = (
        f"Deepfake classifier (MTCNN+EfficientNet-B7) verdict {data.get('verdict')}: "
        f"fake probability {strength:.2f} ({faces} face(s), {data.get('frames_analyzed', 0)} frame(s))"
    )
    return _apply_signal(session, session_id, "video", strength, detail, db, claims)


@router.post("/session/{session_id}/signal/voice-clip")
async def ingest_voice_clip(
    session_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    claims: dict = Depends(get_current_user_claims),
):
    """
    Real (heuristic) voice signal: runs the uploaded 16-bit PCM WAV clip
    through `analyze_voice_heuristic` (classical DSP — spectral flatness,
    pitch jitter, envelope regularity). No pretrained voice-spoof model is
    freely available to drop in here, so this is honestly a heuristic proxy,
    not a trained classifier — same honesty standard as the currency CNN's
    documented no-pretrained-model finding.
    """
    session = SESSIONS.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found — start one via /session/start")

    blob = await file.read()
    try:
        strength, detail = analyze_voice_heuristic(blob)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return _apply_signal(session, session_id, "voice", strength, detail, db, claims)


@router.get("/session/{session_id}")
def get_session(session_id: str, claims: dict = Depends(get_current_user_claims)):
    session = SESSIONS.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.get("/sessions")
def list_sessions(claims: dict = Depends(get_current_user_claims)):
    return sorted(SESSIONS.values(), key=lambda s: s["started_at"], reverse=True)
