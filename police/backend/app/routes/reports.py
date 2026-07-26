import hashlib
import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from app.database import get_db
from app.auth import get_current_user_claims
from app.zcql_utils import zcql_rows, parse_datetime, log_audit
from app.ml.train_isolation_forest import get_case_category_lookup
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


def _sla_state(sla_deadline, status_id):
    if not sla_deadline or status_id in ("Closed", "Charge Sheeted"):
        return "OK"
    days_left = (sla_deadline - datetime.utcnow()).days
    if days_left < 0:
        return "Breached"
    if days_left < 7:
        return "Warning"
    return "OK"


def _gather_report_rows(report_type: str, db):
    """Pull real rows from the Catalyst datastore for each supported report type."""
    if report_type == "repeat_offenders":
        offenders = [a for a in zcql_rows(db, "Accused") if (a.get("num_prior_offenses") or 0) >= 2]
        offenders.sort(key=lambda a: a.get("risk_score", 0) or 0, reverse=True)
        offenders = offenders[:40]
        header = ["Offender ID", "Name", "Priors", "Risk Score"]
        rows = [
            [str(o.get("AccusedMasterID")), o.get("AccusedName"), str(o.get("num_prior_offenses")), f"{o.get('risk_score')}%"]
            for o in offenders
        ]
        return header, rows

    if report_type == "case_sla_breach":
        category_labels = get_case_category_lookup(db)
        records = [c for c in zcql_rows(db, "CaseMaster") if c.get("CaseStatusID") not in ("Closed", "Charge Sheeted")]
        records.sort(key=lambda r: parse_datetime(r.get("sla_deadline")) or datetime.max)
        records = records[:60]
        header = ["Case ID", "Crime Type", "Filed", "Priority", "Status", "SLA State"]
        rows = []
        for r in records:
            sla_deadline = parse_datetime(r.get("sla_deadline"))
            state = _sla_state(sla_deadline, r.get("CaseStatusID"))
            if state not in ("Breached", "Warning"):
                continue
            filed = parse_datetime(r.get("CrimeRegisteredDate"))
            rows.append([
                str(r.get("CaseMasterID")),
                category_labels.get(r.get("CaseCategoryID"), "Unclassified"),
                filed.strftime("%Y-%m-%d") if filed else "?",
                str(r.get("priority")), str(r.get("CaseStatusID")), state,
            ])
        return header, rows

    # default: district_performance — case volume & closure by status
    records = zcql_rows(db, "CaseMaster")[:500]
    by_status = {}
    for r in records:
        key = str(r.get("CaseStatusID"))
        by_status[key] = by_status.get(key, 0) + 1
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
    db=Depends(get_db),
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

    log_audit(db, user, role, "EXPORT_REPORT", {
        "message": f"Generated hash-sealed {req.report_type} evidence package",
        "report_id": report_id,
        "sha256": sha256_hash,
        "rows": len(rows),
    })

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
