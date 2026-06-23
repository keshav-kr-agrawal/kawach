from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import AuditLog, FIRRecord
from app.auth import get_current_user_claims
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

class ReportRequest(BaseModel):
    report_type: str  # district_performance, repeat_offenders, case_sla_breach
    format: str  # pdf, excel

# Mock list of previously compiled reports
MOCK_REPORTS = [
    {"id": "REP-2026-001", "name": "Karnataka Statewide Crime Summary 2025", "created_at": "2026-01-05T10:00:00", "size": "4.2 MB", "format": "PDF", "user": "admin"},
    {"id": "REP-2026-002", "name": "Bengaluru Urban Repeat Offender Watchlist", "created_at": "2026-03-12T14:30:00", "size": "1.8 MB", "format": "EXCEL", "user": "sp_bengaluru"},
    {"id": "REP-2026-003", "name": "Mysuru Station SLA Clearance Analysis", "created_at": "2026-05-18T16:15:00", "size": "2.5 MB", "format": "PDF", "user": "sho_mysore_1"}
]

@router.get("")
def list_reports(claims: dict = Depends(get_current_user_claims)):
    return MOCK_REPORTS

@router.post("/generate")
def generate_report(
    req: ReportRequest,
    db: Session = Depends(get_db),
    claims: dict = Depends(get_current_user_claims)
):
    user = claims.get("username", "officer")
    role = claims.get("role", "Constable")
    
    # Audit log entry for report export (MANDATORY REQUIREMENT)
    audit = AuditLog(
        username=user,
        role=role,
        action="EXPORT_REPORT",
        details={"message": f"Generated and exported {req.report_type} report as {req.format.upper()}"},
        ip_address="10.25.0.1"
    )
    db.add(audit)
    db.commit()
    
    report_id = f"REP-2026-{len(MOCK_REPORTS) + 1:03d}"
    report_name = f"{req.report_type.replace('_', ' ').title()} Report"
    
    new_report = {
        "id": report_id,
        "name": report_name,
        "created_at": datetime.utcnow().isoformat(),
        "size": "1.2 MB" if req.format == "excel" else "2.8 MB",
        "format": req.format.upper(),
        "user": user
    }
    
    MOCK_REPORTS.insert(0, new_report)
    return {"message": "Report generated successfully", "report": new_report, "download_url": f"http://localhost:8000/api/reports/download/{report_id}"}
