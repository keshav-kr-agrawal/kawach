import hashlib
import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import AuditLog, FIRRecord, Offender
from app.auth import get_current_user_claims
from pydantic import BaseModel
from datetime import datetime

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

router = APIRouter()

REPORTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "generated_reports")
os.makedirs(REPORTS_DIR, exist_ok=True)

class ReportRequest(BaseModel):
    report_type: str  # district_performance, repeat_offenders, case_sla_breach
    format: str  # pdf (excel falls back to pdf)

# In-memory registry of generated reports (id -> metadata incl. file path + hash).
# Survives for the process lifetime; regenerating is cheap and auditable.
GENERATED_REPORTS = {}


def _sla_state(record):
    if not record.sla_deadline or record.status in ("Closed", "Charge Sheeted"):
        return "OK"
    days_left = (record.sla_deadline - datetime.utcnow()).days
    if days_left < 0:
        return "Breached"
    if days_left < 7:
        return "Warning"
    return "OK"


def _gather_report_rows(report_type: str, db: Session):
    """Pull real rows from the database for each supported report type."""
    if report_type == "repeat_offenders":
        offenders = (
            db.query(Offender)
            .filter(Offender.num_prior_offenses >= 2)
            .order_by(Offender.risk_score.desc())
            .limit(40)
            .all()
        )
        header = ["Offender ID", "Name", "Priors", "Risk Score", "Status"]
        rows = [
            [o.id, o.name, str(o.num_prior_offenses), f"{o.risk_score}%", getattr(o, "status", "Active")]
            for o in offenders
        ]
        return header, rows

    if report_type == "case_sla_breach":
        records = (
            db.query(FIRRecord)
            .filter(FIRRecord.status.notin_(["Closed", "Charge Sheeted"]))
            .order_by(FIRRecord.sla_deadline.asc())
            .limit(60)
            .all()
        )
        header = ["FIR ID", "Crime Type", "Filed", "Priority", "Status", "SLA State"]
        rows = [
            [
                r.id, r.crime_type, r.date_filed.strftime("%Y-%m-%d"),
                r.priority, r.status, _sla_state(r),
            ]
            for r in records
            if _sla_state(r) in ("Breached", "Warning")
        ]
        return header, rows

    # default: district_performance — case volume & closure by status
    records = db.query(FIRRecord).limit(500).all()
    by_status = {}
    for r in records:
        by_status[r.status] = by_status.get(r.status, 0) + 1
    header = ["Case Status", "Count"]
    rows = [[status, str(count)] for status, count in sorted(by_status.items())]
    return header, rows


def _build_pdf(filepath: str, report_type: str, user: str, role: str, header, rows):
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("KTitle", parent=styles["Title"], fontSize=16, spaceAfter=4)
    meta_style = ParagraphStyle("KMeta", parent=styles["Normal"], fontSize=8, textColor=colors.HexColor("#555555"))

    doc = SimpleDocTemplate(filepath, pagesize=A4, topMargin=18 * mm, bottomMargin=18 * mm)
    story = [
        Paragraph("KAWACH — Evidence & Intelligence Package", title_style),
        Paragraph(f"Report type: {report_type.replace('_', ' ').title()}", styles["Heading3"]),
        Paragraph(
            f"Generated (UTC): {datetime.utcnow().isoformat()}Z &nbsp;|&nbsp; "
            f"Requested by: {user} ({role})",
            meta_style,
        ),
        Spacer(1, 4 * mm),
        HRFlowable(width="100%", color=colors.HexColor("#333333")),
        Spacer(1, 4 * mm),
    ]

    if rows:
        table = Table([header] + rows, repeatRows=1)
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a1e25")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#999999")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f2f4f7")]),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(table)
    else:
        story.append(Paragraph("No matching records found for this report type.", styles["Normal"]))

    story += [
        Spacer(1, 8 * mm),
        HRFlowable(width="100%", color=colors.HexColor("#333333")),
        Spacer(1, 2 * mm),
        Paragraph(
            "Chain of custody: this document was generated directly from the KAWACH "
            "operational database. Its SHA-256 hash is computed over the final PDF bytes "
            "and recorded in the tamper-evident audit log at generation time. "
            "Any modification to this file invalidates the recorded hash. "
            "Intended for submission under Section 63 of the Bharatiya Sakshya Adhiniyam, 2023 "
            "(electronic records admissibility).",
            meta_style,
        ),
    ]
    doc.build(story)


@router.get("")
def list_reports(claims: dict = Depends(get_current_user_claims)):
    return sorted(GENERATED_REPORTS.values(), key=lambda r: r["created_at"], reverse=True)


@router.post("/generate")
def generate_report(
    req: ReportRequest,
    db: Session = Depends(get_db),
    claims: dict = Depends(get_current_user_claims)
):
    user = claims.get("username", "officer")
    role = claims.get("role", "Constable")

    report_id = f"REP-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}"
    filename = f"{report_id}_{req.report_type}.pdf"
    filepath = os.path.join(REPORTS_DIR, filename)

    header, rows = _gather_report_rows(req.report_type, db)
    _build_pdf(filepath, req.report_type, user, role, header, rows)

    # Hash-seal: SHA-256 over the final PDF bytes, recorded in the audit log.
    with open(filepath, "rb") as f:
        sha256_hash = hashlib.sha256(f.read()).hexdigest()

    audit = AuditLog(
        username=user,
        role=role,
        action="EXPORT_REPORT",
        details={
            "message": f"Generated hash-sealed {req.report_type} evidence package",
            "report_id": report_id,
            "sha256": sha256_hash,
            "rows": len(rows),
        },
        ip_address="10.25.0.1"
    )
    db.add(audit)
    db.commit()

    size_kb = os.path.getsize(filepath) / 1024
    new_report = {
        "id": report_id,
        "name": f"{req.report_type.replace('_', ' ').title()} Report",
        "created_at": datetime.utcnow().isoformat(),
        "size": f"{size_kb:.1f} KB",
        "format": "PDF",
        "user": user,
        "sha256": sha256_hash,
        "filename": filename,
    }
    GENERATED_REPORTS[report_id] = new_report

    return {
        "message": "Hash-sealed evidence package generated",
        "report": new_report,
        "sha256": sha256_hash,
        "download_url": f"/api/reports/download/{report_id}",
    }


@router.get("/download/{report_id}")
def download_report(report_id: str, claims: dict = Depends(get_current_user_claims)):
    meta = GENERATED_REPORTS.get(report_id)
    if not meta:
        raise HTTPException(status_code=404, detail="Report not found — generate it first via /api/reports/generate")
    filepath = os.path.join(REPORTS_DIR, meta["filename"])
    if not os.path.exists(filepath):
        raise HTTPException(status_code=410, detail="Report file no longer on disk — regenerate it")
    return FileResponse(filepath, media_type="application/pdf", filename=meta["filename"])
