"""
Citizen Fraud Shield — multi-channel entry points (ET PS: "Citizen Fraud
Shield (Multi-channel) ... accessible via WhatsApp, IVR, and mobile app").

Both endpoints below reuse the SAME scoring primitives as the live-session
monitor and Fraud Shield dashboard check — score_scam_script (weighted
scam-script category match) and call_burst_anomaly (real Call-row behavioral
anomaly) — instead of a second, drifting keyword list. Reply text is
deterministic and explainable, matching CLAUDE.md's non-negotiable principle
that detection is advisory: nothing here files a report on the citizen's
behalf.
"""

import re

from fastapi import APIRouter, Depends, Request, Response


from app.database import get_db
from app.routes.digital_arrest import score_scam_script
from app.routes.fraud_shield import call_burst_anomaly

router = APIRouter()


def make_twiml_message(message_body: str) -> Response:
    xml_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Message>{message_body}</Message>
</Response>"""
    return Response(content=xml_content, media_type="application/xml")


def make_twiml_voice(say_text: str, gather: bool = True) -> Response:
    """
    IVR TwiML: speaks the warning, optionally gathers the caller's next
    utterance via speech-to-text so the same scoring loop can run again on
    what they describe (Twilio transcribes; no STT model lives in this repo).
    """
    gather_block = (
        '<Gather input="speech" action="/api/webhooks/voice/analyze" method="POST" speechTimeout="auto">'
        '<Say voice="Polly.Aditi">Please describe the call or message you received, after the tone.</Say>'
        "</Gather>"
        if gather else ""
    )
    xml_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Aditi">{say_text}</Say>
    {gather_block}
</Response>"""
    return Response(content=xml_content, media_type="application/xml")


def _assess(text: str, sender_number: str, db) -> tuple:
    """Shared scoring: real scam-script weights + real call-burst anomaly. Returns (is_scam, warning_text)."""
    script_score, matched = score_scam_script(text)
    is_scam = script_score >= 0.4

    burst = call_burst_anomaly(db, sender_number) if sender_number and sender_number != "Unknown" else None
    is_suspect_number = bool(re.search(r"^\+?(?!91)\d{10,15}$", sender_number or ""))

    if is_scam:
        cats = ", ".join(m["category"] for m in matched)
        extra = f" This number also shows a call-burst anomaly: {burst[1]}" if burst else ""
        warning_msg = (
            "🚨 SCAM WARNING: your message matches known digital-arrest/extortion script patterns "
            f"({cats}, script score {script_score:.2f}).{extra} Authorized law enforcement or CBI "
            "officials will NEVER isolate you on a video call or demand a 'clearance deposit'. "
            "Disconnect immediately and report to 1930 or cybercrime.gov.in."
        )
    elif burst:
        warning_msg = (
            f"⚠️ SUSPICIOUS NUMBER: {burst[1]} Treat calls/messages from this number with caution — "
            "do not share OTPs, Aadhaar numbers, or bank details."
        )
    elif is_suspect_number:
        warning_msg = (
            "⚠️ SUSPICIOUS NODE: this number matches a non-Indian numbering pattern often used for "
            "spoofed scam calls. Do not share OTPs, Aadhaar numbers, or bank details."
        )
    else:
        warning_msg = (
            "✅ KAWACH SHIELD: message processed — no known digital-arrest or scam-script signature "
            "detected. Always report unsolicited UPI-freeze or 'digital arrest' calls to 1930."
        )
    return is_scam, warning_msg


@router.post("/whatsapp")
async def receive_whatsapp_webhook(request: Request, db=Depends(get_db)):
    """
    Twilio WhatsApp Sandbox (form-encoded) or Meta WhatsApp Cloud API (JSON)
    inbound webhook — both are free-tier per CLAUDE.md principle #4.
    """
    content_type = request.headers.get("content-type", "")
    body_text, sender_number = "", "Unknown"

    if "application/x-www-form-urlencoded" in content_type:
        form_data = await request.form()
        body_text = form_data.get("Body", "").strip()
        sender_number = form_data.get("From", "").strip()
    else:
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
            body_text, sender_number = "", "Unknown"

    is_scam, warning_msg = _assess(body_text, sender_number, db)

    if "application/x-www-form-urlencoded" in content_type:
        return make_twiml_message(warning_msg)
    return {"status": "processed", "sender": sender_number, "threat_detected": is_scam, "warning": warning_msg}


@router.post("/voice")
async def receive_voice_call(request: Request):
    """
    Twilio Voice IVR entry point — the ET PS's 'IVR' channel. A citizen (or
    a call forwarded mid-scam) dials in; KAWACH greets them and gathers a
    spoken description via Twilio's speech-to-text, then scores it the same
    way as the WhatsApp/Fraud-Shield paths at /voice/analyze.
    """
    return make_twiml_voice(
        "Welcome to KAWACH Citizen Fraud Shield. This automated line checks suspicious calls and messages for known scam patterns."
    )


@router.post("/voice/analyze")
async def analyze_voice_call(request: Request, db=Depends(get_db)):
    form_data = await request.form()
    speech_text = form_data.get("SpeechResult", "").strip()
    caller_number = form_data.get("From", "").strip()

    if not speech_text:
        return make_twiml_voice(
            "I did not catch a description. Please call back and describe the suspicious call after the tone.",
            gather=False,
        )

    _, warning_msg = _assess(speech_text, caller_number, db)
    # Strip markdown/emoji for speech synthesis — Twilio's <Say> reads raw text.
    spoken = re.sub(r"[^\w\s.,'-]", "", warning_msg)
    return make_twiml_voice(spoken, gather=False)
