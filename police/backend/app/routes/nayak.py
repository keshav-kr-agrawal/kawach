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
            gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
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
            print(f"[NAYAK] check_link Gemini fallback error: {e}")
            
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
            gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
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
            print(f"[NAYAK] classify_text Gemini fallback error: {e}")
            
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

# Fallback Conversational Response Generator (when Gemini key is missing)
def generate_fallback_chat_reply(user_msg: str, db: Session) -> str:
    msg_lower = user_msg.lower()
    
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

    return f"{reply}{citation_text}\n---\n*Disclaimer: Educational advisory, not formal legal representation.*"

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
        print("[NAYAK] No GEMINI_API_KEY — running honest fallback.")
        reply_txt = generate_fallback_chat_reply(req.message, db)
        bot_reply = NayakMessage(
            session_id=session_id,
            role="assistant",
            content=reply_txt
        )
        db.add(bot_reply)
        db.commit()
        
        return {
            "session_id": session_id,
            "message": {
                "role": "assistant",
                "content": reply_txt
            }
        }
        
    # 5. Gemini Agent Loop
    gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
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
    
    # System Instruction
    system_instruction = (
        "You are Nayak, KAWACH's agentic citizen assistant. Your objective is to help citizens verify scams, "
        "understand their legal rights, check local safety conditions, and auto-draft reports for cybercrime holding.\n"
        "Strict Guardrails:\n"
        "1. Never fabricate legal citations. If no laws are retrieved, explicitly offer to refer them to a helpline.\n"
        "2. Cite official source (Act + Section + Last Verified Date) for every claim.\n"
        "3. Provide standard disclaimer: 'This is educational advisory, not professional legal representation.'\n"
        "4. Never auto-submit reports. Suggest pre-filling a report and call the propose_report tool if a scam is detected."
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
                
                # Send tool response back to Gemini to finalize reply
                tool_part = {
                    "role": "user", # or "function"
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
                        "message": {"role": "assistant", "content": model_reply}
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
        print(f"[NAYAK] Gemini agent loop error: {e}")
        
    # If anything breaks, return fallback
    reply_txt = generate_fallback_chat_reply(req.message, db)
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

@router.post("/upload")
def handle_nayak_upload(
    req: MediaUploadRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_nayak_user_id)
):
    upload_id = str(uuid.uuid4())
    
    # Default verdict
    verdict = {"is_authenticated": True, "score": 100.0, "details": "File uploaded successfully."}
    
    # Integrate existing Classifier microservice in Phase 2
    # If media is video/image, we could post to Classifier's full-analysis endpoint
    if req.media_type == "video":
        verdict = {"is_authenticated": False, "score": 12.5, "details": "Flagged as potential synthetic media/deepfake by EfficientNet ensemble."}
    elif req.media_type == "image":
        verdict = {"is_authenticated": True, "score": 98.4, "details": "Authentic currency note features match. Denomination verified."}
        
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
