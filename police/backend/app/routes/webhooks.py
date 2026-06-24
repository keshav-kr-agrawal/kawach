from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import HTMLResponse
import re

router = APIRouter()

# Simple Twilio XML response generator
def make_twiml_response(message_body: str) -> Response:
    xml_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>{message_body}</Message>
</Response>"""
    return Response(content=xml_content, media_type="application/xml")

@router.post("/whatsapp")
async def receive_whatsapp_webhook(request: Request):
    # Retrieve content type to check for form-encoded (Twilio) or JSON (Meta)
    content_type = request.headers.get("content-type", "")
    
    body_text = ""
    sender_number = "Unknown"
    
    if "application/x-www-form-urlencoded" in content_type:
        form_data = await request.form()
        body_text = form_data.get("Body", "").strip()
        sender_number = form_data.get("From", "").strip()
    else:
        # Fallback to JSON payload
        try:
            json_data = await request.json()
            if "entry" in json_data:
                entry = json_data.get("entry", [{}])[0]
                changes = entry.get("changes", [{}])[0]
                value = changes.get("value", {})
                messages_list = value.get("messages", [{}])
                if messages_list and isinstance(messages_list, list):
                    message = messages_list[0]
                    body_text = message.get("text", {}).get("body", "").strip()
                    sender_number = message.get("from", "").strip()
            else:
                body_text = json_data.get("message", "").strip()
                sender_number = json_data.get("phone", "").strip()
        except Exception:
            body_text = ""
            sender_number = "Unknown"

    # Pre-process message text for scam indicators
    msg_lower = body_text.lower()
    scam_keywords = ["cbi", "digital arrest", "police arrest", "extortion", "warrant", "lockdown", "narcotics", "customs penalty"]
    
    # Check for presence of scam keywords
    is_scam = any(kw in msg_lower for kw in scam_keywords)
    
    # Check sender against mock fraud lists (e.g. international spoofed numbers)
    is_suspect_number = bool(re.search(r'^\+?(?!91)\d{10,15}$', sender_number)) # Non-Indian phone prefixes
    
    if is_scam:
        warning_msg = (
            "🚨 SCAM WARNING: High Probability of Digital Arrest Extortion! "
            "Authorized law enforcement or CBI officials will NEVER put you under isolation via video call "
            "nor demand financial deposits to 'clear charges'. Disconnect immediately and report to 1930."
        )
    elif is_suspect_number:
        warning_msg = (
            "⚠️ SUSPICIOUS NODE: Incoming phone registry matches international proxy layers. "
            "Examine transactions closely. Do not share OTPs, Aadhar card numbers, or bank registry detail."
        )
    else:
        warning_msg = (
            "✅ KAWACH SHIELD: Message processed. No immediate digital arrest or known scam signatures detected. "
            "Always report unsolicited UPI freeze requests immediately."
        )

    # Return Twilio TwiML XML if form-encoded, otherwise JSON
    if "application/x-www-form-urlencoded" in content_type:
        return make_twiml_response(warning_msg)
    else:
        return {
            "status": "processed",
            "sender": sender_number,
            "threat_detected": is_scam,
            "warning": warning_msg
        }
