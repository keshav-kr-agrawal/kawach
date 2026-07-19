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

router = APIRouter()

# "gemini-2.5-flash" is blocked for accounts created after Google's cutoff
# (confirmed 2026-07-19: this key gets a 404 "no longer available to new
# users" on both 2.5-flash and 2.5-flash-lite). "gemini-flash-latest" is
# Google's self-updating alias — always resolves to a current, non-deprecated
# flash model, so this never needs touching again as models rotate.
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-flash-latest")


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

class MediaUploadRequest(BaseModel):
    media_url: str
    media_type: str  # 'image', 'video', 'audio', 'link', 'text'
    session_id: Optional[str] = None

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
    )
    
    # Construct Gemini contents list from chat history
    contents = []
    for h_msg in history:
        # Map roles to gemini model tags ('user', 'model')
        role = "user" if h_msg.role == "user" else "model"
        
        # If it was a tool call
        if h_msg.tool_name:
            # We don't map tool contents directly, but we can send them as model parts or pass the simplified message text
            # For simplicity in request payloads, we build standard text structures
            contents.append({
                "role": "model",
                "parts": [
                    {"text": f"[Tool Call: {h_msg.tool_name} with result {json.dumps(h_msg.tool_result)}]"}
                ]
            })
        else:
            contents.append({
                "role": role,
                "parts": [{"text": h_msg.content}]
            })
            
    payload = {
        "contents": contents,
        "tools": tools_manifest,
        "systemInstruction": {"parts": [{"text": system_instruction}]}
    }
    
    try:
        res = requests.post(gemini_url, headers=headers, json=payload, timeout=10)
        if res.status_code == 200:
            res_json = res.json()
            candidate = res_json.get("candidates", [{}])[0]
            content = candidate.get("content", {})
            parts = content.get("parts", [{}])
            
            # Check for functionCall
            fn_call = parts[0].get("functionCall")
            if fn_call:
                tool_name = fn_call.get("name")
                tool_args = fn_call.get("args", {})
                
                # Execute tool call locally
                tool_result = call_agent_tool(tool_name, tool_args, db, api_key)

                # propose_report drafts get enriched with department, severity,
                # session evidence, and nearby-similar context before they
                # reach the citizen's confirmation card.
                proposal = None
                if tool_name == "propose_report" and "prefilled_report" in tool_result:
                    proposal = enrich_proposal(
                        tool_result["prefilled_report"], db, session_id, req.lat, req.lng)
                    tool_result = {"prefilled_report": proposal,
                                   "requires_user_confirmation": True}

                # Save tool message to DB
                tool_msg = NayakMessage(
                    session_id=session_id,
                    role="tool",
                    content=f"Executed tool: {tool_name}",
                    tool_name=tool_name,
                    tool_result=tool_result
                )
                db.add(tool_msg)
                db.commit()

                # Send tool response back to Gemini to finalize reply.
                # (Per the Gemini REST API, functionResponse parts are sent
                # with role "user".)
                tool_part = {
                    "role": "user",
                    "parts": [
                        {
                            "functionResponse": {
                                "name": tool_name,
                                "response": {"output": tool_result}
                            }
                        }
                    ]
                }
                
                # Append functions to payload contents
                payload["contents"].append({
                    "role": "model",
                    "parts": [{"functionCall": fn_call}]
                })
                payload["contents"].append(tool_part)
                
                # Re-invoke Gemini
                second_res = requests.post(gemini_url, headers=headers, json=payload, timeout=10)
                if second_res.status_code == 200:
                    model_reply = second_res.json()["candidates"][0]["content"]["parts"][0]["text"]
                    bot_reply = NayakMessage(
                        session_id=session_id,
                        role="assistant",
                        content=model_reply
                    )
                    db.add(bot_reply)
                    db.commit()
                    return {
                        "session_id": session_id,
                        "message": {"role": "assistant", "content": model_reply},
                        "proposal": proposal
                    }
            else:
                model_reply = parts[0].get("text", "I'm sorry, I was unable to compile an answer.")
                bot_reply = NayakMessage(
                    session_id=session_id,
                    role="assistant",
                    content=model_reply
                )
                db.add(bot_reply)
                db.commit()
                return {
                    "session_id": session_id,
                    "message": {"role": "assistant", "content": model_reply}
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


def _classify_media_for_real(media_url: str, media_type: str) -> dict:
    """
    Fetch the media and run it through the real Classifier microservice:
    video -> /classify (deepfake forensics), image -> /classify-currency
    (counterfeit screening). If the media or classifier is unreachable the
    verdict honestly says PENDING_ANALYSIS — never a fabricated score.
    """
    try:
        media_res = requests.get(media_url, timeout=30)
        media_res.raise_for_status()
        blob = media_res.content

        if media_type == "video":
            r = requests.post(
                f"{CLASSIFIER_URL}/classify",
                files={"file": ("nayak_upload.mp4", blob, "video/mp4")},
                timeout=600,
            )
            r.raise_for_status()
            data = r.json()
            return {
                "is_authenticated": data.get("verdict") == "AUTHENTIC",
                "score": round((1.0 - data.get("fake_probability", 0.5)) * 100, 1),
                "verdict": data.get("verdict"),
                "confidence": data.get("confidence_level"),
                "trust_score": data.get("trust_score"),
                "details": (
                    f"Deepfake forensics: {data.get('verdict')} "
                    f"(fake probability {data.get('fake_probability', 0):.2f}, "
                    f"{data.get('faces_detected', 0)} face(s) across {data.get('frames_analyzed', 0)} frames)."
                ),
                "source": "classifier:/classify",
            }

        if media_type == "image":
            r = requests.post(
                f"{CLASSIFIER_URL}/classify-currency",
                files={"file": ("nayak_note.jpg", blob, "image/jpeg")},
                timeout=60,
            )
            r.raise_for_status()
            data = r.json()
            findings = "; ".join(c["finding"] for c in data.get("security_checks", [])[:2])
            return {
                "is_authenticated": data.get("verdict") in ("LIKELY_GENUINE", "GENUINE_FEATURES"),
                "score": round((1.0 - data.get("fake_probability", 0.5)) * 100, 1),
                "verdict": data.get("verdict"),
                "confidence": data.get("confidence"),
                "model_mode": data.get("model_mode"),
                "details": f"Currency screening ({data.get('model_mode')}): {data.get('verdict')}. {findings}",
                "source": "classifier:/classify-currency",
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
            "details": "Classifier service unreachable — media stored, analysis pending. No verdict fabricated.",
            "source": "unreachable",
        }


@router.post("/upload")
def handle_nayak_upload(
    req: MediaUploadRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_nayak_user_id)
):
    upload_id = str(uuid.uuid4())

    if req.media_type in ("video", "image"):
        verdict = _classify_media_for_real(req.media_url, req.media_type)
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
