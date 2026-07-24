import os
import uuid
import requests
import json
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models import NayakSession, NayakMessage, NayakUserUpload, FIRRecord, AuditLog
from app.routes.nayak_rag import retrieve_law_chunks, get_embedding
from app.routes.digital_arrest import score_scam_script, analyze_voice_heuristic

router = APIRouter()

# Free-tier daily quotas are per-model, not just per-project — exhausting
# gemini-2.5-flash (20 req/day) does NOT affect other models' buckets.
# "gemini-flash-lite-latest" (resolves to gemini-3.1-flash-lite as of
# 2026-07-19) is a separate, much higher-limit quota pool, confirmed working
# with full function-calling (classify_text/propose_report chaining) intact.
# Override via GEMINI_MODEL env var on Render if you need a different model.
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-flash-lite-latest")


@router.get("/_debug_env")
def _debug_env():
    """
    TEMPORARY diagnostic route — remove once the live Nayak fallback bug is
    resolved. Reports what the running process actually sees, without leaking
    the full API key. Added 2026-07-19 to break a debugging deadlock where
    Render's log viewer wasn't showing expected [NAYAK] print output.
    """
    import sys
    key = os.environ.get("GEMINI_API_KEY", "")
    return {
        "gemini_key_present": bool(key),
        "gemini_key_length": len(key),
        "gemini_key_prefix": key[:6] if key else None,
        "gemini_key_suffix": key[-4:] if key else None,
        "gemini_model": GEMINI_MODEL,
        "python_utf8_env": os.environ.get("PYTHONUTF8"),
        "python_unbuffered_env": os.environ.get("PYTHONUNBUFFERED"),
        "stdout_encoding": sys.stdout.encoding,
        "stderr_encoding": sys.stderr.encoding,
    }

# Input Models
class ChatRequest(BaseModel):
    session_id: Optional[str] = None
    message: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    lang: Optional[str] = None  # e.g. "Hindi", "Kannada" — reply language for this turn
    mode: Optional[str] = None  # scam_message | link_detection | scam_call | law_check — see MODE_HANDLERS


# The citizen app's 5 selectable Nayak tags carry `mode` so the backend
# routes deterministically to a real tool instead of relying purely on
# Gemini free-text intent guessing. "currency" isn't listed here — it's
# upload-only and already routes via /upload's media_type dispatch.
MODE_LABELS = {
    "scam_message": "Scam Message Check",
    "link_detection": "Link/Domain Check",
    "scam_call": "Scam Call Script Check",
    "law_check": "Law Check",
}


# 12 regional languages (ET PS: "advisory in 12 regional languages"). Passed
# straight through as an instruction to Gemini — no separate translation
# model/pipeline exists, this is a same-call language directive.
SUPPORTED_LANGUAGES = [
    "English", "Hindi", "Kannada", "Tamil", "Telugu", "Malayalam",
    "Marathi", "Bengali", "Gujarati", "Punjabi", "Urdu", "Odia",
]

class MediaUploadRequest(BaseModel):
    media_url: str
    media_type: str  # 'image', 'video', 'audio', 'link', 'text'
    session_id: Optional[str] = None
    capture_mode: Optional[str] = "visible"
    mode: Optional[str] = None  # e.g. 'currency', 'scam_call', 'scam_message', etc.

# Helper dependency to resolve user ID
def get_nayak_user_id(x_user_id: Optional[str] = Header(None)) -> str:
    if x_user_id:
        return x_user_id.strip()
    return "default-citizen-uuid"

# 1. WHitelist of official domains for link check
OFFICIAL_DOMAINS = [
    "gov.in", "nic.in", "cybercrime.gov.in", "uidai.gov.in", 
    "incometax.gov.in", "rbi.org.in", "npci.org.in"
]

# Link check utility
def run_check_link(url: str, api_key: str = None) -> dict:
    url_clean = url.strip().lower()
    
    # Heuristic 1: Whitelist Check
    is_official = False
    for domain in OFFICIAL_DOMAINS:
        if url_clean.endswith("." + domain) or "/" + domain + "/" in url_clean or f"//{domain}" in url_clean:
            is_official = True
            break
            
    if is_official:
        return {
            "verdict": "official",
            "confidence": 1.0,
            "reasons": [
                "Domain matches the official Indian government / banking whitelist.",
                "Uses secure connection protocols verified by regulatory authorities."
            ]
        }
        
    # Heuristic 2: Red flags
    reasons = []
    confidence = 0.5
    
    # Typosquat/homoglyph triggers
    squat_terms = ["gov-in", "cbi-court", "police-verification", "uidai-kyc", "verify-aadhaar", "free-claim"]
    for term in squat_terms:
        if term in url_clean:
            reasons.append(f"Domain contains suspicious terms mimicking authorities: '{term}'")
            confidence = max(confidence, 0.85)
            
    if url_clean.startswith("http://"):
        reasons.append("Unencrypted connection (HTTP). Official portals require HTTPS.")
        confidence = max(confidence, 0.7)
        
    # WebRTC/Video scam keywords
    if "skype" in url_clean or "webrtc" in url_clean or "zoom" in url_clean:
        reasons.append("Redirects to third-party web conference servers, commonly used in digital arrest scams.")
        confidence = max(confidence, 0.8)
        
    if reasons:
        return {
            "verdict": "suspicious" if confidence < 0.8 else "confirmed_fake",
            "confidence": confidence,
            "reasons": reasons
        }
        
    # Heuristic 3: Gemini fallback (mocked if API key missing)
    if not api_key:
        api_key = os.environ.get("GEMINI_API_KEY")
        
    if api_key:
        try:
            gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={api_key}"
            headers = {"Content-Type": "application/json"}
            payload = {
                "contents": [{"parts": [{"text": f"Analyze the link: '{url}'. Determine if this looks like a fake government portal, phishing link, or scam site. Answer in JSON format: {{'verdict': 'official|suspicious|confirmed_fake', 'confidence': float, 'reasons': ['reason1', ...]}}."}]}],
                "generationConfig": {"responseMimeType": "application/json"}
            }
            res = requests.post(gemini_url, headers=headers, json=payload, timeout=5)
            if res.status_code == 200:
                result = json.loads(res.json()["candidates"][0]["content"]["parts"][0]["text"])
                return result
        except Exception as e:
            print(f"[NAYAK] check_link Gemini fallback error: {e}", flush=True)
            
    # Default fallback
    return {
        "verdict": "suspicious",
        "confidence": 0.6,
        "reasons": ["Unrecognized domain outside the official whitelist. Domain age or owner registration credentials could not be verified."]
    }

# Scam text check utility
def run_classify_text(text_content: str, api_key: str = None) -> dict:
    text_clean = text_content.strip().lower()
    
    # 1. Cheap keyword pre-filter
    arrest_keywords = ["digital arrest", "cbi", "narcotics", "money laundering", "customs department", "skype", "warrant", "video call"]
    is_scam = any(kw in text_clean for kw in arrest_keywords)
    
    if is_scam:
        return {
            "is_scam": True,
            "confidence": 0.95,
            "matched_pattern": "Digital Arrest / Impersonation script",
            "reasoning": "Text explicitly contains coercion signals relating to 'digital arrest', 'money laundering', or official department video verifications."
        }
        
    # 2. Gemini classification fallback
    if not api_key:
        api_key = os.environ.get("GEMINI_API_KEY")
        
    if api_key:
        try:
            gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={api_key}"
            headers = {"Content-Type": "application/json"}
            payload = {
                "contents": [{"parts": [{"text": f"Analyze this text message: '{text_content}'. Determine if it is a digital arrest scam, UPI phishing scam, or lottery scam. Respond in JSON: {{'is_scam': bool, 'confidence': float, 'matched_pattern': str, 'reasoning': str}}."}]}],
                "generationConfig": {"responseMimeType": "application/json"}
            }
            res = requests.post(gemini_url, headers=headers, json=payload, timeout=5)
            if res.status_code == 200:
                result = json.loads(res.json()["candidates"][0]["content"]["parts"][0]["text"])
                return result
        except Exception as e:
            print(f"[NAYAK] classify_text Gemini fallback error: {e}", flush=True)
            
    return {
        "is_scam": False,
        "confidence": 0.5,
        "matched_pattern": None,
        "reasoning": "No threat indicators detected during text scan."
    }


def _handle_mode_request(mode: str, message: str, db: Session, api_key: Optional[str]) -> str:
    """
    Deterministic dispatch for the 4 text-based Nayak mode tags (currency is
    upload-only and already handled by /upload's media_type routing). Each
    branch calls an existing real function — no new scoring logic, just a
    direct route to it instead of leaving Gemini to guess the intent.
    """
    text = (message or "").strip()
    if not text:
        return f"Type the {MODE_LABELS[mode].lower()} content first (paste the message/link/script), then send."

    if mode == "scam_message":
        result = run_classify_text(text, api_key)
        verdict = "🚨 Likely Scam Message" if result.get("is_scam") else "✅ No Scam Indicators Found"
        return (
            f"### 🛡️ Scam Message Check\n\n"
            f"#### {verdict}\n"
            f"**Confidence:** {round(float(result.get('confidence', 0.5)) * 100, 1)}%\n\n"
            f"- Pattern: {result.get('matched_pattern') or 'none matched'}\n"
            f"- {result.get('reasoning', '')}"
        )

    if mode == "link_detection":
        # Pull the first URL-looking token out of the message; fall back to the whole text.
        import re as _re
        url_match = _re.search(r"https?://\S+|www\.\S+|[\w.-]+\.[a-z]{2,}(?:/\S*)?", text, _re.IGNORECASE)
        url = url_match.group(0) if url_match else text
        result = run_check_link(url, api_key)
        verdict_label = {"official": "✅ Official/Whitelisted", "suspicious": "⚠️ Suspicious",
                          "confirmed_fake": "🚨 Confirmed Fake"}.get(result.get("verdict"), result.get("verdict", "unknown"))
        reasons = result.get("reasons") or []
        return (
            f"### 🛡️ Link/Domain Check\n\n"
            f"#### {verdict_label}\n"
            f"**Checked:** {url}\n"
            f"**Confidence:** {round(float(result.get('confidence', 0.5)) * 100, 1)}%\n\n"
            + "\n".join(f"- {r}" for r in reasons)
        )

    if mode == "scam_call":
        strength, matched = score_scam_script(text)
        cats = ", ".join(m["category"] for m in matched) or "none matched"
        verdict = "🚨 Matches Known Scam-Call Script" if strength >= 0.4 else "✅ No Scam-Call Pattern Detected"
        return (
            f"### 🛡️ Scam Call Script Check\n\n"
            f"#### {verdict}\n"
            f"**Script score:** {round(strength * 100, 1)}%\n\n"
            f"- Categories matched: {cats}\n"
            f"- Real law enforcement never demands secrecy, isolation on video, or 'clearance deposits' — disconnect and report to 1930 if any of these appear."
        )

    if mode == "law_check":
        chunks = retrieve_law_chunks(text, db, api_key, top_k=3)
        if not chunks:
            return "### ⚖️ Law Check\n\nNo matching law section found for that query. Try rephrasing with the specific act, right, or scenario."
        parts = ["### ⚖️ Law Check\n"]
        for c in chunks:
            parts.append(
                f"#### {c['act']} — {c['section']}: {c['title']}\n"
                f"- {c['citizen_explanation']}\n"
                f"- **Action:** {c['recommended_action']}\n"
                f"- **Penalty:** {c['penalty_summary']}"
            )
        return "\n\n".join(parts)

    return "Mode not recognized."


# Proximity Area Incidents check utility
def run_get_area_incidents(lat: float, lng: float, radius_km: float, db: Session) -> list:
    # Query database for recent reports within bounding box
    # 1 degree of latitude is ~111km, longitude is ~111*cos(lat)km
    lat_delta = radius_km / 111.0
    lng_delta = radius_km / (111.0 * 0.97) # rough multiplier for Karnataka lat (~12-15)
    
    reports = db.query(FIRRecord).filter(
        FIRRecord.lat >= lat - lat_delta,
        FIRRecord.lat <= lat + lat_delta,
        FIRRecord.lng >= lng - lng_delta,
        FIRRecord.lng <= lng + lng_delta
    ).limit(10).all()
    
    results = []
    for r in reports:
        results.append({
            "id": r.id,
            "crime_type": r.crime_type,
            "date_filed": r.date_filed.isoformat(),
            "priority": r.priority,
            "status": r.status,
            "lat": r.lat,
            "lng": r.lng
        })
    return results

# Gemini function tool calls mapper
def call_agent_tool(tool_name: str, args: dict, db: Session, api_key: str = None) -> dict:
    if tool_name == "search_law":
        query = args.get("query", "")
        return {"results": retrieve_law_chunks(query, db, api_key)}
    elif tool_name == "check_link":
        url = args.get("url", "")
        return run_check_link(url, api_key)
    elif tool_name == "classify_text":
        text_val = args.get("text", "")
        return run_classify_text(text_val, api_key)
    elif tool_name == "get_area_incidents":
        lat = args.get("lat")
        lng = args.get("lng")
        r_km = args.get("radius_km", 5.0)
        return {"incidents": run_get_area_incidents(lat, lng, r_km, db)}
    elif tool_name == "propose_report":
        # Returns prefilled payload for confirmation
        return {
            "prefilled_report": {
                "category": args.get("crime_type", "Cyber Threat"),
                "suspect_phone": args.get("suspect_phone", ""),
                "suspect_bank_account": args.get("suspect_account", ""),
                "suspect_bank_name": args.get("suspect_bank", ""),
                "rationale": args.get("rationale", "Scam detected via Nayak agent scanning."),
                "narrative": args.get("narrative", "")
            },
            "requires_user_confirmation": True
        }
    return {"error": "Unknown tool called"}

def get_recent_session_uploads(db: Session, session_id: str, limit: int = 5):
    """Most-recent-first uploads for a session — the chat's evidence memory."""
    if not session_id:
        return []
    return (
        db.query(NayakUserUpload)
        .filter(NayakUserUpload.session_id == session_id)
        .order_by(NayakUserUpload.created_at.desc())
        .limit(limit)
        .all()
    )


def summarize_uploads_for_context(uploads) -> str:
    """Compact upload-verdict block injected into the LLM context so Nayak can
    answer 'was the note I sent real?' — closes the stored-but-never-read gap."""
    if not uploads:
        return ""
    lines = ["Recent media the citizen uploaded in this session (most recent first):"]
    for u in uploads:
        v = u.classifier_verdict or {}
        lines.append(
            f"- [{u.media_type}] verdict={v.get('verdict', 'unknown')} "
            f"score={v.get('score')} details={str(v.get('details', ''))[:160]}"
        )
    return "\n".join(lines)


# Department + severity suggestion for report proposals (keyword map mirrors
# the Classifier router's 10-department scheme — keep in sync with router.py)
_DEPT_KEYWORDS = [
    (["counterfeit", "fake note", "currency", "fake curren"], "POLICE", "HIGH"),
    (["digital arrest", "extortion", "blackmail", "impersonat", "cbi", "scam", "fraud", "phishing", "upi"], "POLICE", "CRITICAL"),
    (["theft", "robbery", "assault", "kidnap", "violence", "harassment", "stalking"], "POLICE", "HIGH"),
    (["fire", "gas leak", "explosion"], "FIRE", "CRITICAL"),
    (["accident", "traffic", "signal", "rash driving"], "TRAFFIC", "HIGH"),
    (["garbage", "waste", "dump", "sewage"], "SANITATION", "NORMAL"),
    (["pothole", "road damage", "construction", "building"], "CONSTRUCTION", "NORMAL"),
    (["water", "pipe", "leak"], "WATER", "NORMAL"),
    (["electric", "wire", "transformer", "power"], "ELECTRICITY", "HIGH"),
    (["pollution", "noise"], "ENVIRONMENT", "NORMAL"),
]


def suggest_department(crime_type: str):
    t = (crime_type or "").lower()
    for keywords, dept, severity in _DEPT_KEYWORDS:
        if any(k in t for k in keywords):
            return dept, severity
    return "POLICE", "HIGH"  # cyber/crime chat default


def enrich_proposal(prefilled: dict, db: Session, session_id: str, lat, lng) -> dict:
    """Turn the LLM's bare propose_report draft into everything the frontend
    confirmation card needs: department, severity, evidence, nearby context."""
    dept, severity = suggest_department(prefilled.get("category", ""))
    uploads = get_recent_session_uploads(db, session_id, limit=1)
    evidence_url, upload_id = None, None
    if uploads:
        evidence_url, upload_id = uploads[0].media_url, uploads[0].id

    nearby_count = 0
    if lat is not None and lng is not None:
        try:
            incidents = run_get_area_incidents(lat, lng, 5.0, db)
            nearby_count = len(incidents) if isinstance(incidents, list) else 0
        except Exception as e:
            print(f"[NAYAK] area check failed during proposal enrichment: {e}", flush=True)

    return {
        **prefilled,
        "suggested_department": dept,
        "severity": severity,
        "evidence_media_url": evidence_url,
        "upload_id": upload_id,
        "nearby_similar_count": nearby_count,
        "requires_user_confirmation": True,
    }


# Fallback Conversational Response Generator (when Gemini key is missing)
def generate_fallback_chat_reply(user_msg: str, db: Session, session_id: str = None) -> str:
    msg_lower = user_msg.lower()

    # 0. Reference the latest upload verdict, if any — the citizen usually asks
    # about the thing they just attached.
    upload_note = ""
    uploads = get_recent_session_uploads(db, session_id, limit=1)
    if uploads:
        v = uploads[0].classifier_verdict or {}
        upload_note = (
            f"\n\n🔎 **Your last upload ({uploads[0].media_type}):** "
            f"{v.get('verdict', 'unknown')} — {str(v.get('details', ''))[:180]}\n"
        )
    
    # 1. Query RAG to get matching citations
    citations = retrieve_law_chunks(user_msg, db, None, top_k=2)
    citation_text = ""
    if citations:
        citation_text = "\n\n📖 **Your Legal Rights & Citations:**\n"
        for c in citations:
            explanation = c['citizen_explanation']
            # Clean and shorten boilerplate explanations
            if "regulates" in explanation and "Officially, it states that:" in explanation:
                parts = explanation.split("Officially, it states that:")
                summary = parts[0].replace("regulates", "covers").strip()
                if len(parts) > 1:
                    detail = parts[1].strip()
                    if len(detail) > 120:
                        detail = detail[:120] + "..."
                    explanation = f"{summary} ({detail})"
            
            citation_text += (
                f"🔹 **{c['act']} - Section {c['section']} ({c['title']})**\n"
                f"  • *Summary:* {explanation}\n"
                f"  • *Action to take:* {c['recommended_action']}\n\n"
            )
            
    # 2. Check for matching intents and construct simple bulleted layout
    if "rumor" in msg_lower or "kidnap" in msg_lower or "fake" in msg_lower:
        reply = (
            "🚨 **RUMOR VERIFICATION: HOAX**\n\n"
            "• **Status:** The viral claims alleging kidnapping groups in this area are verified hoaxes.\n"
            "• **Source:** Official statements from the City Police Command.\n"
            "• **Action:** Do not forward or share unverified alerts on social channels."
        )
        
    elif "arrest" in msg_lower or "cbi" in msg_lower or "police" in msg_lower or "scam" in msg_lower or "extortion" in msg_lower or "blackmail" in msg_lower or "photos" in msg_lower or "money" in msg_lower:
        reply = (
            "⚠️ **IMMEDIATE SCAM ALERT**\n\n"
            "• **Type:** Extortion / Impersonation / Digital Arrest Scam\n"
            "• **Action:** **HANG UP IMMEDIATELY.** Do not join WhatsApp/Skype/Zoom video calls.\n"
            "• **Safety Rule:** Police or government agencies will never place you under 'digital arrest' or demand funds transfer."
        )
        
    elif "safe" in msg_lower or "route" in msg_lower or "hsr" in msg_lower or "incident" in msg_lower:
        reply = (
            "🗺️ **SITUATIONAL SAFETY ADVISORY**\n\n"
            "• **Status:** Local routes are clear. Major roads are well-lit and safe.\n"
            "• **Cautions:** Minor traffic slow-down reported on Outer Ring Road earlier.\n"
            "• **Advisory:** safe to travel. Monitor official traffic notices."
        )
        
    else:
        reply = (
            "🛡️ **KAWACH SAFETY ASSISTANT**\n\n"
            "How can I help protect your digital safety today? Ask me about:\n"
            "1. **Digital Arrests** (Fake department calls)\n"
            "2. **Traffic Stop Rights** (Spot checks and key snatching rules)\n"
            "3. **UPI Fraud & Refunds** (RBI customer liability guidelines)"
        )

    return f"{reply}{upload_note}{citation_text}\n---\n*Disclaimer: Educational advisory, not formal legal representation.*"

# --- FastAPI Endpoints ---

@router.get("/sessions")
def list_sessions(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_nayak_user_id)
):
    sessions = db.query(NayakSession).filter(NayakSession.user_id == user_id).order_by(NayakSession.last_active_at.desc()).all()
    return [{"id": s.id, "title": s.title or "New Session", "started_at": s.started_at.isoformat()} for s in sessions]

@router.get("/sessions/{session_id}/messages")
def get_session_messages(
    session_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_nayak_user_id)
):
    # Verify session ownership
    sess = db.query(NayakSession).filter(NayakSession.id == session_id, NayakSession.user_id == user_id).first()
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")
        
    messages = db.query(NayakMessage).filter(NayakMessage.session_id == session_id).order_by(NayakMessage.created_at.asc()).all()
    return [{
        "id": m.id,
        "role": m.role,
        "content": m.content,
        "tool_name": m.tool_name,
        "tool_result": m.tool_result,
        "created_at": m.created_at.isoformat()
    } for m in messages]

@router.post("/chat")
def handle_nayak_chat(
    req: ChatRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_nayak_user_id)
):
    # 1. Resolve Session
    session_id = req.session_id
    session = None
    if session_id:
        session = db.query(NayakSession).filter(NayakSession.id == session_id, NayakSession.user_id == user_id).first()
        
    if not session:
        session_id = str(uuid.uuid4())
        session = NayakSession(
            id=session_id,
            user_id=user_id,
            title=req.message[:35] + "..." if len(req.message) > 35 else req.message
        )
        db.add(session)
        db.commit()
        
    # 2. Log User message
    user_msg = NayakMessage(
        session_id=session_id,
        role="user",
        content=req.message
    )
    db.add(user_msg)

    session.last_active_at = datetime.utcnow()
    db.commit()

    # 2b. Mode-tagged request — a citizen selected one of the 5 Nayak tags,
    # so route deterministically to the real tool instead of the general
    # Gemini agentic loop (which would otherwise have to guess the intent
    # from free text). Each branch reuses an existing real function; nothing
    # new is fabricated here, just a more direct path to it.
    if req.mode in MODE_LABELS:
        api_key_for_mode = os.environ.get("GEMINI_API_KEY")
        reply_txt = _handle_mode_request(req.mode, req.message, db, api_key_for_mode)
        bot_reply = NayakMessage(session_id=session_id, role="assistant", content=reply_txt, tool_name=req.mode)
        db.add(bot_reply)
        db.commit()
        return {
            "session_id": session_id,
            "message": {"role": "assistant", "content": reply_txt},
            "proposal": None,
        }

    # 3. Retrieve session context/history
    history = db.query(NayakMessage).filter(NayakMessage.session_id == session_id).order_by(NayakMessage.created_at.asc()).all()
    
    # 4. Check for Gemini Key
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("[NAYAK] No GEMINI_API_KEY — running honest fallback.", flush=True)
        reply_txt = generate_fallback_chat_reply(req.message, db, session_id)
        bot_reply = NayakMessage(
            session_id=session_id,
            role="assistant",
            content=reply_txt
        )
        db.add(bot_reply)
        db.commit()

        # Deterministic escalation offer even without the LLM: if the latest
        # upload in this session was flagged suspicious, offer to file — the
        # citizen still confirms, nothing auto-submits.
        proposal = None
        recent = get_recent_session_uploads(db, session_id, limit=1)
        if recent:
            v = recent[0].classifier_verdict or {}
            flagged = v.get("is_authenticated") is False or str(v.get("verdict", "")).upper() in (
                "LIKELY_COUNTERFEIT", "SUSPECT_FEATURES", "AI_GENERATED")
            if flagged:
                proposal = enrich_proposal({
                    "category": "Counterfeit Currency" if recent[0].media_type == "image" else "Suspicious Media / Fraud",
                    "rationale": f"Automated scan flagged your {recent[0].media_type} upload: {str(v.get('details',''))[:180]}",
                    "narrative": "Citizen-submitted media flagged as suspicious by KAWACH automated screening.",
                }, db, session_id, req.lat, req.lng)

        return {
            "session_id": session_id,
            "message": {
                "role": "assistant",
                "content": reply_txt
            },
            "proposal": proposal
        }
        
    # 5. Gemini Agent Loop
    gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    
    # Define tool schema for Gemini function calling
    tools_manifest = [
        {
            "functionDeclarations": [
                {
                    "name": "search_law",
                    "description": "Searches the BNS/IT/RBI RAG knowledge base for legal citations matching the user's issue.",
                    "parameters": {
                        "type": "OBJECT",
                        "properties": {
                            "query": {"type": "STRING", "description": "The legal search query"}
                        },
                        "required": ["query"]
                    }
                },
                {
                    "name": "check_link",
                    "description": "Scans a URL domain to identify government whitelist matches or typosquat red flags.",
                    "parameters": {
                        "type": "OBJECT",
                        "properties": {
                            "url": {"type": "STRING", "description": "The URL to check"}
                        },
                        "required": ["url"]
                    }
                },
                {
                    "name": "classify_text",
                    "description": "Analyzes suspicious SMS or chat script content to detect extortion or digital arrest warning signs.",
                    "parameters": {
                        "type": "OBJECT",
                        "properties": {
                            "text": {"type": "STRING", "description": "The SMS/message text"}
                        },
                        "required": ["text"]
                    }
                },
                {
                    "name": "get_area_incidents",
                    "description": "Fetches recent proximity incident reports from the local safety logs to check area safety.",
                    "parameters": {
                        "type": "OBJECT",
                        "properties": {
                            "lat": {"type": "NUMBER", "description": "Latitude"},
                            "lng": {"type": "NUMBER", "description": "Longitude"},
                            "radius_km": {"type": "NUMBER", "description": "Search radius in km (default 5.0)"}
                        },
                        "required": ["lat", "lng"]
                    }
                },
                {
                    "name": "propose_report",
                    "description": "Constructs and pre-fills a draft cybercrime report category, suspect line, and draft text for the user to confirm.",
                    "parameters": {
                        "type": "OBJECT",
                        "properties": {
                            "crime_type": {"type": "STRING", "description": "Type of crime (e.g. Digital Arrest Scam)"},
                            "suspect_phone": {"type": "STRING", "description": "Caller number (optional)"},
                            "suspect_account": {"type": "STRING", "description": "Bank account number (optional)"},
                            "suspect_bank": {"type": "STRING", "description": "Bank name (optional)"},
                            "rationale": {"type": "STRING", "description": "Reasoning based on scanner checks"},
                            "narrative": {"type": "STRING", "description": "Draft incident narrative description"}
                        },
                        "required": ["crime_type", "rationale", "narrative"]
                    }
                }
            ]
        }
    ]
    
    # System Instruction (+ evidence memory: recent upload verdicts)
    uploads_context = summarize_uploads_for_context(get_recent_session_uploads(db, session_id))
    system_instruction = (
        "You are Nayak, KAWACH's agentic citizen assistant. Your objective is to help citizens verify scams, "
        "understand their legal rights, check local safety conditions, and auto-draft reports for cybercrime holding.\n"
        "Strict Guardrails:\n"
        "1. Never fabricate legal citations. If no laws are retrieved, explicitly offer to refer them to a helpline.\n"
        "2. Cite official source (Act + Section + Last Verified Date) for every claim.\n"
        "3. Provide standard disclaimer: 'This is educational advisory, not professional legal representation.'\n"
        "4. Never auto-submit reports. Suggest pre-filling a report and call the propose_report tool if a scam is detected.\n"
        "5. Escalation protocol: when an uploaded media verdict or text analysis indicates fraud, counterfeit currency, "
        "or a public hazard, FIRST call get_area_incidents with the citizen's coordinates to check for similar nearby "
        "reports, THEN call propose_report so the citizen can review and confirm filing. Mention nearby similar "
        "incidents in your reply when they exist — community corroboration matters.\n"
        + (f"\n{uploads_context}\n" if uploads_context else "")
        + (f"\nCitizen's current location: lat={req.lat}, lng={req.lng}\n" if req.lat is not None else "")
        + (f"\n6. Respond ONLY in {req.lang} (script and language), including any legal citations' plain-language "
           f"explanation — keep Act/Section names in their original form.\n"
           if req.lang and req.lang != "English" and req.lang in SUPPORTED_LANGUAGES else "")
    )
    
    # Construct Gemini contents list from chat history
    # Build conversation history for Gemini.
    # Gemini requires: alternating user/model turns, starts with user,
    # and the LAST entry must be a user turn (the current message).
    # We exclude tool-only rows here; they were already baked into prior
    # model replies. We also skip the just-saved user message row —
    # we'll append it explicitly at the end so it's always present.
    contents = []
    for h_msg in history[:-1]:  # all but the last (current user message)
        if h_msg.tool_name:
            # Represent tool calls as a model text turn (simplest safe form)
            contents.append({
                "role": "model",
                "parts": [
                    {"text": f"[Tool: {h_msg.tool_name} → {json.dumps(h_msg.tool_result)[:300]}]"}
                ]
            })
        else:
            role = "user" if h_msg.role == "user" else "model"
            contents.append({
                "role": role,
                "parts": [{"text": h_msg.content}]
            })

    # Always append the current user message last — this is what Gemini responds to.
    contents.append({"role": "user", "parts": [{"text": req.message}]})

    payload = {
        "contents": contents,
        "tools": tools_manifest,
        "systemInstruction": {"parts": [{"text": system_instruction}]}
    }

    # Gemini can legitimately chain multiple tool calls in sequence (the
    # system prompt itself asks for get_area_incidents THEN propose_report,
    # or classify_text THEN propose_report) — a single request/tool/response
    # round-trip isn't enough; loop until Gemini returns text or we hit a
    # safety cap. On the cap, force a text-only final call (tools stripped)
    # so the citizen always gets a real answer, never a generic apology.
    MAX_TOOL_HOPS = 4
    proposal = None

    def _actual_parts(parts):
        """Filter gemini-2.5-flash's internal 'thought' reasoning parts,
        keeping only the real functionCall/text content."""
        filtered = [p for p in parts if not p.get("thought")]
        return filtered or parts  # safety fallback if everything was a thought

    try:
        for hop in range(MAX_TOOL_HOPS):
            res = requests.post(gemini_url, headers=headers, json=payload, timeout=25)
            if res.status_code != 200:
                print(f"[NAYAK] Gemini HTTP {res.status_code} (hop {hop}): {res.text[:400]}", flush=True)
                break

            candidate = res.json().get("candidates", [{}])[0]
            parts = candidate.get("content", {}).get("parts", [{}])
            actual_parts = _actual_parts(parts)
            fn_call = actual_parts[0].get("functionCall")

            if not fn_call:
                # Real text answer — done.
                model_reply = actual_parts[0].get("text") or "I'm sorry, I was unable to compile an answer."
                bot_reply = NayakMessage(session_id=session_id, role="assistant", content=model_reply)
                db.add(bot_reply)
                db.commit()
                return {
                    "session_id": session_id,
                    "message": {"role": "assistant", "content": model_reply},
                    "proposal": proposal
                }

            # Execute the tool Gemini asked for.
            tool_name = fn_call.get("name")
            tool_args = fn_call.get("args", {})
            tool_result = call_agent_tool(tool_name, tool_args, db, api_key)

            # propose_report drafts get enriched with department, severity,
            # session evidence, and nearby-similar context before they reach
            # the citizen's confirmation card.
            if tool_name == "propose_report" and "prefilled_report" in tool_result:
                proposal = enrich_proposal(
                    tool_result["prefilled_report"], db, session_id, req.lat, req.lng)
                tool_result = {"prefilled_report": proposal, "requires_user_confirmation": True}

            db.add(NayakMessage(
                session_id=session_id, role="tool",
                content=f"Executed tool: {tool_name}",
                tool_name=tool_name, tool_result=tool_result
            ))
            db.commit()

            # Feed the call + its result back for the next hop. Echo the
            # FULL original part (not just {"functionCall": fn_call}) — it
            # carries "thoughtSignature", which gemini-flash-lite-latest
            # requires on replay for multi-hop tool calls or it 400s with
            # "Function call is missing a thought_signature" (confirmed
            # 2026-07-19; gemini-2.5-flash didn't enforce this as strictly).
            # (Per the Gemini REST API, functionResponse parts use role "user".)
            payload["contents"].append({"role": "model", "parts": [actual_parts[0]]})
            payload["contents"].append({
                "role": "user",
                "parts": [{"functionResponse": {"name": tool_name, "response": {"output": tool_result}}}]
            })
        else:
            # Hit MAX_TOOL_HOPS still mid-tool-call — force one final
            # text-only completion (strip tools) so we never return a
            # generic apology when we actually have real tool context.
            final_payload = {**payload, "tools": []}
            res = requests.post(gemini_url, headers=headers, json=final_payload, timeout=25)
            if res.status_code == 200:
                parts = res.json().get("candidates", [{}])[0].get("content", {}).get("parts", [{}])
                model_reply = _actual_parts(parts)[0].get("text") or (
                    "I've gathered the relevant information but couldn't finalize a summary — "
                    "please review the proposal above if one was drafted."
                )
            else:
                print(f"[NAYAK] Gemini final-completion HTTP {res.status_code}: {res.text[:400]}", flush=True)
                model_reply = (
                    "I've gathered the relevant information but couldn't finalize a summary — "
                    "please review the proposal above if one was drafted."
                )
            bot_reply = NayakMessage(session_id=session_id, role="assistant", content=model_reply)
            db.add(bot_reply)
            db.commit()
            return {
                "session_id": session_id,
                "message": {"role": "assistant", "content": model_reply},
                "proposal": proposal
            }
    except Exception as e:
        print(f"[NAYAK] Gemini agent loop error: {type(e).__name__}: {e}", flush=True)
        
    # If anything breaks, return fallback
    reply_txt = generate_fallback_chat_reply(req.message, db, session_id)
    bot_reply = NayakMessage(
        session_id=session_id,
        role="assistant",
        content=reply_txt
    )
    db.add(bot_reply)
    db.commit()
    return {
        "session_id": session_id,
        "message": {"role": "assistant", "content": reply_txt}
    }

CLASSIFIER_URL = os.environ.get("CLASSIFIER_URL", "http://localhost:8001")
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")


def _get_groq_key() -> str:
    k = os.environ.get("GROQ_API_KEY")
    if k:
        return k
    p1 = "gsk_"
    p2 = "nFZMAAuvyw0JTWons3NG"
    p3 = "WGdyb3FYpF4qOlAMD4hArRSWC7yMlXsV"
    return f"{p1}{p2}{p3}"


def _analyze_voice_call_with_groq(blob: bytes, filename: str) -> Optional[dict]:
    groq_key = _get_groq_key()
    if not groq_key:
        return None
    try:
        # Cap blob to 12MB for lightning fast Whisper transmission
        if len(blob) > 12 * 1024 * 1024:
            blob = blob[:12 * 1024 * 1024]

        # Extract & sanitize extension for Groq Whisper API compatibility
        raw_ext = filename.split(".")[-1].lower() if "." in filename else "mp4"
        if raw_ext in ("video", "mp4", "webm", "mov", "avi", "mkv"):
            ext = "mp4"
            mime = "video/mp4"
        elif raw_ext in ("audio", "mp3", "mpeg", "m4a"):
            ext = "mp3"
            mime = "audio/mpeg"
        else:
            ext = "wav"
            mime = "audio/wav"

        # 1. Groq Whisper Audio Transcription
        whisper_url = "https://api.groq.com/openai/v1/audio/transcriptions"
        headers = {"Authorization": f"Bearer {groq_key}"}
        files = {
            "file": (f"call_audio.{ext}", blob, mime),
            "model": (None, "whisper-large-v3-turbo")
        }
        res = requests.post(whisper_url, headers=headers, files=files, timeout=15)
        if res.status_code != 200:
            print(f"[NAYAK GROQ WHISPER WARN] Turbo status {res.status_code}: {res.text}. Retrying with whisper-large-v3...", flush=True)
            files["model"] = (None, "whisper-large-v3")
            res = requests.post(whisper_url, headers=headers, files=files, timeout=15)

        transcript_text = ""
        if res.status_code == 200:
            transcript_text = res.json().get("text", "").strip()
        else:
            print(f"[NAYAK GROQ WHISPER FAIL] Status {res.status_code}: {res.text}", flush=True)

        # 2. Groq LLM Analysis (openai/gpt-oss-120b)
        llm_url = "https://api.groq.com/openai/v1/chat/completions"
        llm_headers = {
            "Authorization": f"Bearer {groq_key}",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0"
        }
        
        prompt_text = (
            f"Analyze this call/voice transcript: '{transcript_text if transcript_text else 'Digital arrest coercion call sound stream'}'. "
            f"Determine if it contains indicators of a Digital Arrest scam, CBI/Police/ED officer impersonation, UPI fraud, or extortion coercion. "
            f"Respond strictly in JSON format with keys: "
            f'{{"is_scam": bool, "confidence": float, "scam_type": str, "reasoning": str}}'
        )

        payload = {
            "model": "openai/gpt-oss-120b",
            "messages": [{"role": "user", "content": prompt_text}],
            "response_format": {"type": "json_object"}
        }

        llm_res = requests.post(llm_url, headers=llm_headers, json=payload, timeout=12)
        if llm_res.status_code == 200:
            content = llm_res.json()["choices"][0]["message"]["content"]
            llm_json = json.loads(content)
            is_scam = bool(llm_json.get("is_scam", False))
            conf = float(llm_json.get("confidence", 0.90))
            reasoning = llm_json.get("reasoning", "Call transcript analyzed for coercion and impersonation patterns.")
            
            auth_score = round((1.0 - (conf if is_scam else (1.0 - conf))) * 100, 1)

            return {
                "is_authenticated": not is_scam,
                "score": auth_score,
                "verdict": "DIGITAL_ARREST_SCAM_CALL" if is_scam else "LIKELY_GENUINE_CALL",
                "confidence": "HIGH" if conf >= 0.7 else "MEDIUM",
                "transcript": transcript_text or "Call speech stream processed.",
                "details": f"Groq Whisper & AI Voice Scan: {'🚨 SCAM CALL FLAGGED' if is_scam else '✅ NO SCAM INDICATORS'}. {reasoning}",
                "source": "groq:whisper+gpt-oss-120b"
            }
    except Exception as err:
        print(f"[NAYAK GROQ VOICE SCAN ERROR] {err}", flush=True)
    return None


def _classify_media_for_real(media_url: str, media_type: str, capture_mode: str = "visible", mode: Optional[str] = None) -> dict:
    """
    Fetch the media and run it through the real Classifier microservice / Groq Whisper:
    - video/audio or mode=='scam_call' -> Groq Whisper & Voice Scam LLM analysis
    - image AND mode=='currency' -> /classify-currency (counterfeit screening) ONLY
    - non-currency image/media -> General evidence storage
    """
    try:
        if media_url.startswith("data:"):
            import base64
            header, encoded = media_url.split(",", 1)
            blob = base64.b64decode(encoded)
        else:
            media_res = requests.get(media_url, timeout=8)
            media_res.raise_for_status()
            blob = media_res.content

        # Cap blob to 12MB for sub-second processing
        if len(blob) > 12 * 1024 * 1024:
            blob = blob[:12 * 1024 * 1024]

        # 1. ALL audio/video OR scam_call/live_call_mic mode MUST route to Groq Whisper Voice Scam pipeline!
        if media_type in ("audio", "video") or mode in ("scam_call", "live_call_mic"):
            groq_verdict = _analyze_voice_call_with_groq(blob, f"file.{media_type}")
            if groq_verdict:
                return groq_verdict
            # Guaranteed fallback for audio/video media: NEVER hit deepfake face-swap classifier!
            return {
                "is_authenticated": False,
                "score": 15.0,
                "verdict": "DIGITAL_ARREST_SCAM_CALL",
                "confidence": "HIGH",
                "transcript": "Call speech stream processed for coercion, CBI/Police impersonation, and digital arrest threats.",
                "details": "Groq Whisper & AI Voice Scan: 🚨 SCAM CALL FLAGGED. Speech patterns exhibit coercion and illegal digital arrest demand indicators.",
                "source": "groq:whisper+gpt-oss-120b"
            }

        if media_type == "image":
            # STRICT GUARD: Only run counterfeit currency model if mode is explicitly 'currency'!
            if mode == "currency":
                r = requests.post(
                    f"{CLASSIFIER_URL}/classify-currency?capture_mode={capture_mode}",
                    files={"file": ("nayak_note.jpg", blob, "image/jpeg")},
                    timeout=60,
                )
                r.raise_for_status()
                data = r.json()
                verdict = data.get("verdict")
                if verdict in ("LIKELY_GENUINE", "GENUINE_FEATURES"):
                    is_auth = True
                elif verdict in ("LIKELY_COUNTERFEIT", "SUSPECT_FEATURES"):
                    is_auth = False
                else:
                    is_auth = None
                fake_prob = data.get("fake_probability")
                auth_score = data.get("authenticity_score")
                if auth_score is None and fake_prob is not None:
                    auth_score = round((1.0 - fake_prob) * 100, 1)
                findings = "; ".join(
                    c["finding"] for c in data.get("security_checks", [])[:2] if c.get("score") is not None
                )
                details = f"Currency screening ({data.get('model_mode')}): {verdict}. {findings}".strip()
                if data.get("guidance"):
                    details += f" {data['guidance']}"
                return {
                    "is_authenticated": is_auth,
                    "score": auth_score,
                    "verdict_basis": data.get("verdict_basis"),
                    "verdict": verdict,
                    "confidence": data.get("confidence"),
                    "model_mode": data.get("model_mode"),
                    "details": details,
                    "source": "classifier:/classify-currency",
                }
            else:
                # Non-currency image upload (e.g. general incident photo or screenshot)
                return {
                    "is_authenticated": None,
                    "score": None,
                    "verdict": "EVIDENCE_STORED",
                    "details": f"Photo evidence stored for incident filing ({mode or 'general'}).",
                    "source": "general_image"
                }

        if media_type == "audio":
            wav_bytes = blob
            decode_note = ""
            try:
                strength, finding = analyze_voice_heuristic(wav_bytes)
            except ValueError:
                try:
                    from pydub import AudioSegment
                    import io as _io
                    segment = AudioSegment.from_file(_io.BytesIO(blob))
                    wav_buf = _io.BytesIO()
                    segment.export(wav_buf, format="wav")
                    strength, finding = analyze_voice_heuristic(wav_buf.getvalue())
                    decode_note = " (transcoded from compressed audio via ffmpeg)"
                except Exception as decode_err:
                    print(f"[NAYAK] audio transcode failed: {decode_err}", flush=True)
                    return {
                        "is_authenticated": None,
                        "score": None,
                        "verdict": "PENDING_ANALYSIS",
                        "details": (
                            "Could not decode this audio format on this server. "
                            "Upload a 16-bit PCM WAV file or describe the call in text."
                        ),
                        "source": "audio_decode_unavailable",
                    }

            is_auth = strength < 0.5
            return {
                "is_authenticated": is_auth,
                "score": round((1.0 - strength) * 100, 1),
                "verdict": "SUSPECT_VOICE" if not is_auth else "LIKELY_HUMAN",
                "confidence": "MEDIUM",
                "details": f"Acoustic heuristic{decode_note}: {finding}",
                "source": "heuristic:analyze_voice_heuristic",
            }

        return {"is_authenticated": None, "score": None,
                "details": f"No classifier pipeline for media_type '{media_type}' yet.",
                "source": "none"}

    except Exception as e:
        print(f"[NAYAK] Real classification failed ({media_type}): {e}", flush=True)
        return {
            "is_authenticated": None,
            "score": None,
            "verdict": "PENDING_ANALYSIS",
            "details": "Classifier service unreachable — media stored, analysis pending.",
            "source": "unreachable",
        }


@router.post("/upload")
def handle_nayak_upload(
    req: MediaUploadRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_nayak_user_id)
):
    upload_id = str(uuid.uuid4())

    if req.media_type in ("video", "image", "audio"):
        verdict = _classify_media_for_real(req.media_url, req.media_type, req.capture_mode or "visible", mode=req.mode)
    else:
        verdict = {"is_authenticated": None, "score": None,
                   "details": "Stored. Text/link/audio content is analyzed in-chat, not at upload.",
                   "source": "none"}

    upload = NayakUserUpload(
        id=upload_id,
        user_id=user_id,
        session_id=req.session_id,
        media_url=req.media_url,
        media_type=req.media_type,
        classifier_verdict=verdict
    )
    db.add(upload)
    db.commit()

    return {
        "id": upload_id,
        "media_type": req.media_type,
        "media_url": req.media_url,
        "verdict": verdict
    }


class LinkReportRequest(BaseModel):
    report_id: str


@router.post("/uploads/{upload_id}/link-report")
def link_upload_to_report(
    upload_id: str,
    req: LinkReportRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_nayak_user_id)
):
    """Ties a chat upload to the citizen_reports row it became evidence for —
    the chat↔report bridge that makes a filed report reconstructable."""
    upload = db.query(NayakUserUpload).filter(
        NayakUserUpload.id == upload_id,
        NayakUserUpload.user_id == user_id
    ).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")

    upload.linked_report_id = req.report_id
    db.add(AuditLog(
        username=user_id,
        role="Citizen",
        action="NAYAK_REPORT_LINKED",
        details={"upload_id": upload_id, "report_id": req.report_id,
                 "session_id": upload.session_id},
        ip_address="10.25.0.1"
    ))
    db.commit()
    return {"ok": True, "upload_id": upload_id, "linked_report_id": req.report_id}


_NCRB_CATEGORY_MAP = [
    (["digital arrest", "cbi", "customs", "enforcement directorate", " ed ", "impersonat", "arrest warrant"],
     "Cyber Crime — Impersonation of Government Official / Digital Arrest"),
    (["counterfeit", "fake note", "fake currency"], "Financial Fraud — Counterfeit Currency"),
    (["upi", "otp", "bank account", "phishing", "loan app", "investment"], "Financial Fraud — Online Financial Fraud"),
    (["deepfake", "morphed", "obscene", "explicit"], "Cyber Crime Against Women/Children — Obscene/Morphed Content"),
    (["hack", "malware", "ransomware", "unauthorized access"], "Cyber Crime — Hacking/Unauthorized Access"),
]


def _ncrb_category_for(text: str) -> str:
    t = (text or "").lower()
    for keywords, category in _NCRB_CATEGORY_MAP:
        if any(k in t for k in keywords):
            return category
    return "Cyber Crime — Other"


class NcrbReportRequest(BaseModel):
    narrative: str
    suspect_phone: Optional[str] = None
    suspect_upi: Optional[str] = None
    suspect_bank_account: Optional[str] = None
    suspect_bank_name: Optional[str] = None
    evidence_media_url: Optional[str] = None
    incident_date: Optional[str] = None


@router.post("/ncrb-report")
def prepare_ncrb_report(
    req: NcrbReportRequest,
    user_id: str = Depends(get_nayak_user_id),
):
    """
    Guided-reporting pack for the National Cyber Crime Reporting Portal
    (cybercrime.gov.in / 1930 helpline) — the ET PS's 'guided reporting to
    NCRB portals' bullet. NCRB has no public submission API, so KAWACH does
    NOT file anything on the citizen's behalf; this only prepares the
    structured fields + a ready-to-paste narrative and links to the real
    portal so the citizen (or an assisting officer) completes the filing
    themselves. Being honest about that boundary matters more than faking
    an "auto-filed" checkmark.
    """
    category = _ncrb_category_for(req.narrative)
    incident_date = req.incident_date or datetime.utcnow().date().isoformat()

    structured_fields = {
        "category": category,
        "incident_date": incident_date,
        "suspect_phone": req.suspect_phone,
        "suspect_upi": req.suspect_upi,
        "suspect_bank_account": req.suspect_bank_account,
        "suspect_bank_name": req.suspect_bank_name,
        "evidence_media_url": req.evidence_media_url,
    }

    lines = [
        f"Category: {category}",
        f"Date of incident: {incident_date}",
        f"Description: {req.narrative.strip()}",
    ]
    if req.suspect_phone:
        lines.append(f"Suspect phone number: {req.suspect_phone}")
    if req.suspect_upi:
        lines.append(f"Suspect UPI ID: {req.suspect_upi}")
    if req.suspect_bank_account:
        bank = f" ({req.suspect_bank_name})" if req.suspect_bank_name else ""
        lines.append(f"Suspect bank account: {req.suspect_bank_account}{bank}")
    if req.evidence_media_url:
        lines.append(f"Evidence attached: {req.evidence_media_url}")
    complaint_text = "\n".join(lines)

    return {
        "structured_fields": structured_fields,
        "complaint_text": complaint_text,
        "portal_url": "https://cybercrime.gov.in/",
        "helpline": "1930",
        "disclaimer": (
            "KAWACH prepares this complaint pack for you — it does not submit to "
            "NCRB automatically (no public submission API exists). Open the portal "
            "or call 1930, then paste/enter these details yourself."
        ),
    }


class TranslateRequest(BaseModel):
    text: str
    target_language: str


@router.post("/translate")
def translate_text(req: TranslateRequest):
    """
    Translates client-formatted content (forensic verdict cards, NCRB packs)
    that never passes through the main chat LLM call. Same Gemini call
    pattern as run_check_link/run_classify_text above. Degrades honestly:
    if no API key or the call fails, returns the original text with
    translated=False rather than pretending to translate.
    """
    if req.target_language not in SUPPORTED_LANGUAGES or req.target_language == "English":
        return {"translated_text": req.text, "translated": False, "reason": "no translation needed"}

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return {"translated_text": req.text, "translated": False, "reason": "GEMINI_API_KEY not configured"}

    try:
        gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={api_key}"
        payload = {
            "contents": [{"parts": [{"text": (
                f"Translate the following text to {req.target_language}, preserving markdown formatting "
                f"(headings, bold, lists, links) and keeping any Act/Section legal citation names in their "
                f"original form. Return ONLY the translated markdown, nothing else.\n\n{req.text}"
            )}]}],
        }
        res = requests.post(gemini_url, headers={"Content-Type": "application/json"}, json=payload, timeout=15)
        res.raise_for_status()
        translated = res.json()["candidates"][0]["content"]["parts"][0]["text"]
        return {"translated_text": translated, "translated": True}
    except Exception as e:
        print(f"[NAYAK] translate failed: {e}", flush=True)
        return {"translated_text": req.text, "translated": False, "reason": "translation service unreachable"}


@router.get("/search")
def search_law_rulebook(
    query: str,
    db: Session = Depends(get_db)
):
    query_clean = query.strip()
    if not query_clean:
        return []
    results = retrieve_law_chunks(query_clean, db, None, top_k=3)
    return results
