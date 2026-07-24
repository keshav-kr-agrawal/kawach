import asyncio
import json
import random
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import FIRRecord, PoliceStation, District, AuditLog, Alert

router = APIRouter()

# Active Patrol Unit Fleet state in memory (Karnataka Command)
PATROL_UNITS = [
    {"id": "PATROL-BGP-101", "unit_name": "Cheetah 01", "district": "Bengaluru Urban", "lat": 12.9716, "lng": 77.5946, "status": "PATROLLING", "heading": 45, "speed_kmh": 28},
    {"id": "PATROL-KRM-204", "unit_name": "Hoysala 14", "district": "Bengaluru Urban", "lat": 12.9344, "lng": 77.6101, "status": "DISPATCHED", "heading": 120, "speed_kmh": 42},
    {"id": "PATROL-MYS-302", "unit_name": "Garuda 03", "district": "Mysuru", "lat": 12.2958, "lng": 76.6394, "status": "PATROLLING", "heading": 210, "speed_kmh": 22},
    {"id": "PATROL-DK-405", "unit_name": "Coastal Guard 05", "district": "Dakshina Kannada", "lat": 12.8703, "lng": 74.8827, "status": "PATROLLING", "heading": 90, "speed_kmh": 35},
    {"id": "PATROL-BEL-501", "unit_name": "Ranger 01", "district": "Belagavi", "lat": 15.8497, "lng": 74.4977, "status": "STANDBY", "heading": 0, "speed_kmh": 0},
]

class DispatchAlertRequest(BaseModel):
    title: str
    severity: str  # Critical, High, Medium, Low
    district: str
    message: str
    channels: list[str]  # ['dashboard', 'mobile_push', 'sms', 'email']
    incident_id: str | None = None

@router.get("/patrols")
def get_active_patrols():
    """Returns real-time status and coordinates of state-wide patrol units."""
    return {"units": PATROL_UNITS, "count": len(PATROL_UNITS), "timestamp": datetime.utcnow().isoformat()}

@router.post("/dispatch")
def dispatch_multichannel_alert(req: DispatchAlertRequest, db: Session = Depends(get_db)):
    """Simulates real-time multi-channel notification dispatch across SMS, Email, PWA Push, and Command Console."""
    dispatch_id = f"DSP-{random.randint(10000, 99999)}"
    
    # Immutable audit record
    audit = AuditLog(
        username="SYSTEM_DISPATCH",
        role="AUTOMATED_ENG",
        action="REALTIME_ALERT_DISPATCH",
        details={
            "dispatch_id": dispatch_id,
            "title": req.title,
            "severity": req.severity,
            "channels": req.channels,
            "district": req.district
        },
        ip_address="127.0.0.1"
    )
    db.add(audit)
    db.commit()
    
    return {
        "status": "DISPATCHED",
        "dispatch_id": dispatch_id,
        "delivered_channels": req.channels,
        "timestamp": datetime.utcnow().isoformat(),
        "delivery_confirmation": {
            "sms_gateway": "ENABLED" if "sms" in req.channels else "SKIPPED",
            "email_smtp": "SENT" if "email" in req.channels else "SKIPPED",
            "pwa_push": "BROADCAST" if "mobile_push" in req.channels else "SKIPPED",
            "command_deck": "ACTIVE" if "dashboard" in req.channels else "SKIPPED"
        }
    }

async def event_generator(request: Request):
    """Generates Server-Sent Events (SSE) for live alerts, telemetry, and patrol movements."""
    patrol_copy = [dict(p) for p in PATROL_UNITS]
    tick = 0
    
    while True:
        if await request.is_disconnected():
            break
            
        tick += 1
        
        # 1. Update patrol unit positions slightly (simulated live movement)
        for unit in patrol_copy:
            if unit["status"] != "STANDBY":
                unit["lat"] += (random.random() - 0.5) * 0.0015
                unit["lng"] += (random.random() - 0.5) * 0.0015
                unit["heading"] = (unit["heading"] + random.randint(-15, 15)) % 360
                
        # Broadcast patrol movement telemetry every 3s
        patrol_payload = {
            "event": "patrol_telemetry",
            "data": {
                "units": patrol_copy,
                "timestamp": datetime.utcnow().isoformat()
            }
        }
        yield f"event: patrol_telemetry\ndata: {json.dumps(patrol_payload['data'])}\n\n"
        
        # Every 3 ticks (~9s), broadcast a dynamic anomaly alert event
        if tick % 3 == 0:
            sample_districts = ["Bengaluru Urban", "Mysuru", "Dakshina Kannada", "Belagavi", "Kalaburagi", "Shivamogga"]
            alert_district = random.choice(sample_districts)
            alert_payload = {
                "id": f"ALT-LIVE-{random.randint(1000, 9999)}",
                "district": alert_district,
                "type": random.choice(["DBSCAN Hotspot Cluster", "Call Burst Anomaly", "SLA Escalation Alert", "Digital Arrest High Threat"]),
                "message": f"Real-time cluster threat detected in {alert_district} sector {random.randint(1, 12)}.",
                "severity": random.choice(["Critical", "High", "Medium"]),
                "timestamp": datetime.utcnow().isoformat()
            }
            yield f"event: alert_push\ndata: {json.dumps(alert_payload)}\n\n"
            
        await asyncio.sleep(3)

@router.get("/stream")
async def realtime_stream(request: Request):
    """Server-Sent Events (SSE) endpoint streaming real-time alerts and patrol telemetry."""
    return StreamingResponse(
        event_generator(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
