from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from datetime import datetime, timedelta
from app.database import get_db
from app.auth import get_current_user_claims
from app.zcql_utils import zcql_rows, parse_datetime
from app.ml.features import get_station_district_map
from app.ml.train_isolation_forest import get_case_category_lookup
from pydantic import BaseModel

router = APIRouter()

class AssignRequest(BaseModel):
    officer_username: str

class EscalateRequest(BaseModel):
    new_priority: str
    reason: str

class StatusRequest(BaseModel):
    new_status: str


def _scoped_cases(db, claims: dict, station_to_district: dict) -> list:
    role = claims.get("role")
    cases = zcql_rows(db, "CaseMaster")
    if role == "SP":
        dist_id = claims.get("district_id")
        return [c for c in cases if station_to_district.get(c.get("PoliceStationID")) == dist_id]
    if role in ("SHO", "Constable"):
        station_id = claims.get("station_id")
        return [c for c in cases if c.get("PoliceStationID") == station_id]
    return cases


def _serialize(r: dict, category_labels: dict) -> dict:
    sla_deadline = parse_datetime(r.get("sla_deadline"))
    days_left = (sla_deadline - datetime.utcnow()).days if sla_deadline else 99
    status_name = str(r.get("CaseStatusID") or "Investigation")
    sla_status = "OK"
    if status_name not in ("Closed", "Charge Sheeted"):
        if days_left < 0:
            sla_status = "Breached"
        elif days_left < 7:
            sla_status = "Warning"

    filed = parse_datetime(r.get("CrimeRegisteredDate"))
    return {
        "id": r.get("CaseMasterID"),
        "crime_type": category_labels.get(r.get("CaseCategoryID"), "Unclassified"),
        "ipc_section": None,
        "date_filed": filed.isoformat() if filed else None,
        "status": r.get("CaseStatusID"),
        "assigned_officer_id": r.get("PolicePersonID"),
        "priority": r.get("priority"),
        "sla_deadline": sla_deadline.isoformat() if sla_deadline else None,
        "days_left": days_left,
        "sla_status": sla_status,
    }


@router.get("")
def list_investigations(db=Depends(get_db), claims: dict = Depends(get_current_user_claims)):
    station_to_district = get_station_district_map(db)
    cases = _scoped_cases(db, claims, station_to_district)
    category_labels = get_case_category_lookup(db)
    cases.sort(key=lambda r: str(r.get("CrimeRegisteredDate") or ""), reverse=True)
    return [_serialize(r, category_labels) for r in cases[:150]]


def _find_case(db, case_id: str) -> dict | None:
    try:
        target_id = int(case_id)
    except ValueError:
        target_id = case_id
    return next((c for c in zcql_rows(db, "CaseMaster") if c.get("CaseMasterID") == target_id), None)


@router.get("/{id}")
def get_investigation_details(id: str, db=Depends(get_db), claims: dict = Depends(get_current_user_claims)):
    record = _find_case(db, id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investigation case not found")

    station_to_district = get_station_district_map(db)
    role = claims.get("role")
    if role == "SP" and station_to_district.get(record.get("PoliceStationID")) != claims.get("district_id"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to district data")
    elif role == "SHO" and record.get("PoliceStationID") != claims.get("station_id"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to station data")

    category_labels = get_case_category_lookup(db)
    stations_by_id = {u["UnitID"]: u for u in zcql_rows(db, "Unit") if u.get("UnitID") is not None}
    station = stations_by_id.get(record.get("PoliceStationID"))
    filed = parse_datetime(record.get("CrimeRegisteredDate"))
    sla_deadline = parse_datetime(record.get("sla_deadline"))
    days_left = (sla_deadline - datetime.utcnow()).days if sla_deadline else 99

    return {
        "id": record.get("CaseMasterID"),
        "crime_type": category_labels.get(record.get("CaseCategoryID"), "Unclassified"),
        "ipc_section": None,
        "date_filed": filed.isoformat() if filed else None,
        "status": record.get("CaseStatusID"),
        "assigned_officer_id": record.get("PolicePersonID"),
        "priority": record.get("priority"),
        "sla_deadline": sla_deadline.isoformat() if sla_deadline else None,
        "days_left": days_left,
        "summary": record.get("summary"),
        "leads": record.get("leads") or [],
        "evidence_correlations": record.get("evidence_correlations") or [],
        "timeline": record.get("timeline") or [],
        "victim_age": None,  # lives on ComplainantDetails/Victim now, not CaseMaster
        "victim_gender": None,
        "police_station_name": station.get("UnitName") if station else None,
    }


def _update_case(db, record: dict, fields: dict):
    row_id = record.get("ROWID")
    if row_id is None:
        print("[investigations] update skipped — no ROWID on fetched CaseMaster row")
        return
    db.table("CaseMaster").update_row({"ROWID": row_id, **fields})


@router.post("/{id}/assign")
def assign_investigation(id: str, req: AssignRequest, db=Depends(get_db), claims: dict = Depends(get_current_user_claims)):
    record = _find_case(db, id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investigation case not found")

    role = claims.get("role")
    if role not in ["DGP", "SP", "SHO"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permission to assign officer")

    officer = next((e for e in zcql_rows(db, "Employee") if e.get("username") == req.officer_username), None)
    if not officer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target officer username not found")

    timeline = record.get("timeline") or []
    timeline.append({
        "date": datetime.utcnow().isoformat(),
        "event": f"Case assigned to officer: {officer['username']} ({officer.get('role')}) by {claims.get('username')}.",
    })
    _update_case(db, record, {"PolicePersonID": officer.get("EmployeeID"), "timeline": timeline})
    return {"message": f"Successfully assigned to {officer['username']}", "timeline": timeline}


@router.post("/{id}/escalate")
def escalate_investigation(id: str, req: EscalateRequest, db=Depends(get_db), claims: dict = Depends(get_current_user_claims)):
    record = _find_case(db, id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investigation case not found")

    timeline = record.get("timeline") or []
    timeline.append({
        "date": datetime.utcnow().isoformat(),
        "event": f"Priority escalated to '{req.new_priority}' by {claims.get('username')}. Reason: {req.reason}.",
    })
    _update_case(db, record, {"priority": req.new_priority, "timeline": timeline})
    return {"message": "Successfully escalated priority", "timeline": timeline}


@router.post("/{id}/status")
def update_status(id: str, req: StatusRequest, db=Depends(get_db), claims: dict = Depends(get_current_user_claims)):
    record = _find_case(db, id)
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investigation case not found")

    old_status = record.get("CaseStatusID")
    timeline = record.get("timeline") or []
    timeline.append({
        "date": datetime.utcnow().isoformat(),
        "event": f"Case status updated from '{old_status}' to '{req.new_status}' by {claims.get('username')}.",
    })
    _update_case(db, record, {"CaseStatusID": req.new_status, "timeline": timeline})
    return {"message": f"Successfully updated status to {req.new_status}", "timeline": timeline}
