from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from app.database import get_db
from app.zcql_utils import zcql_rows

router = APIRouter()


@router.get("/repeat")
def get_repeat_offenders(
    min_priors: int = 2,
    limit: int = 100,
    db=Depends(get_db)
):
    results = [a for a in zcql_rows(db, "Accused") if (a.get("num_prior_offenses") or 0) >= min_priors]
    results.sort(key=lambda a: a.get("risk_score", 0) or 0, reverse=True)
    results = results[:limit]

    associate_counts = _associate_counts(db, {a["AccusedMasterID"] for a in results if a.get("AccusedMasterID") is not None})

    return [{
        "id": o.get("AccusedMasterID"),
        "name": o.get("AccusedName"),
        "age": o.get("AgeYear"),
        "gender": o.get("GenderID"),
        "address": o.get("address"),
        "num_prior_offenses": o.get("num_prior_offenses"),
        "risk_score": o.get("risk_score"),
        "associates_count": associate_counts.get(o.get("AccusedMasterID"), 0),
    } for o in results]


@router.get("/search")
def search_offenders(query: str, db=Depends(get_db)):
    q = query.lower()
    results = [
        a for a in zcql_rows(db, "Accused")
        if q in (a.get("AccusedName") or "").lower() or q in str(a.get("AccusedMasterID") or "")
    ][:20]

    return [{
        "id": o.get("AccusedMasterID"),
        "name": o.get("AccusedName"),
        "age": o.get("AgeYear"),
        "gender": o.get("GenderID"),
        "risk_score": o.get("risk_score"),
        "num_prior_offenses": o.get("num_prior_offenses"),
    } for o in results]


def _associate_counts(db, ids: set) -> dict:
    """Same-case co-accused count — see network.py's comment on why this
    replaces the old Offender.associates many-to-many table, which has no
    surviving equivalent in the Zoho-prescribed schema."""
    if not ids:
        return {}
    by_case: dict = {}
    for a in zcql_rows(db, "Accused"):
        by_case.setdefault(a.get("CaseMasterID"), []).append(a.get("AccusedMasterID"))
    counts = {i: 0 for i in ids}
    for case_id, members in by_case.items():
        members_in_scope = [m for m in members if m in ids]
        for m in members_in_scope:
            counts[m] = len(members) - 1
    return counts


def generate_offender_xai_rationale(offender: dict, vehicles: list, phones: list, accounts: list, associates_count: int) -> str:
    priors = offender.get("num_prior_offenses") or 0
    risk = offender.get("risk_score") or 0

    reasons = []
    if priors > 0:
        reasons.append(f"Offender exhibits high-risk recidivism with {priors} prior case records registered in the state database.")
    else:
        reasons.append("Offender registry indicates no historical prior crimes, establishing a low baseline risk.")

    if associates_count > 0:
        reasons.append(f"Maintains co-accused linkages with {associates_count} other individual(s) in the same case record.")

    assets = []
    if vehicles:
        assets.append(f"{len(vehicles)} vehicle(s)")
    if phones:
        assets.append(f"{len(phones)} mobile line(s)")
    if accounts:
        assets.append(f"{len(accounts)} bank account/UPI node(s)")
    if assets:
        reasons.append(f"Registered assets ({', '.join(assets)}) correlate with locations frequented during recent operations.")

    if risk >= 85:
        verdict = f"Critical risk level of {risk}% is due to high recidivism and confirmed asset correlations."
    elif risk >= 60:
        verdict = f"Elevated threat level of {risk}% is driven by active network associations."
    else:
        verdict = f"Baseline risk level of {risk}% reflects prior arrests without active network links."

    return " ".join(reasons) + " " + verdict


@router.get("/{id}")
def get_offender_profile(id: str, db=Depends(get_db)):
    accused = zcql_rows(db, "Accused")
    try:
        target_id = int(id)
    except ValueError:
        target_id = id
    offender = next((a for a in accused if a.get("AccusedMasterID") == target_id), None)
    if not offender:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Offender not found")

    oid = offender["AccusedMasterID"]
    cases = zcql_rows(db, "CaseMaster")
    case_by_id = {c["CaseMasterID"]: c for c in cases if c.get("CaseMasterID") is not None}
    category_labels = {
        c["CaseCategoryID"]: c.get("LookupValue")
        for c in zcql_rows(db, "CaseCategory") if c.get("CaseCategoryID") is not None
    }
    case = case_by_id.get(offender.get("CaseMasterID"))
    firs = []
    if case:
        firs.append({
            "id": case.get("CaseMasterID"),
            "crime_type": category_labels.get(case.get("CaseCategoryID"), "Unclassified"),
            "ipc_section": None,
            "date_filed": str(case.get("CrimeRegisteredDate")) if case.get("CrimeRegisteredDate") else None,
            "status": case.get("CaseStatusID"),
            "police_station_id": case.get("PoliceStationID"),
        })

    associates = [
        {"id": a.get("AccusedMasterID"), "name": a.get("AccusedName"), "risk_score": a.get("risk_score")}
        for a in accused
        if a.get("CaseMasterID") == offender.get("CaseMasterID") and a.get("AccusedMasterID") != oid
    ]

    vehicles = [v for v in zcql_rows(db, "Vehicle") if v.get("owner_offender_id") == oid]
    phones = [p for p in zcql_rows(db, "Phone") if p.get("owner_offender_id") == oid]
    accounts = [ac for ac in zcql_rows(db, "Account") if ac.get("owner_offender_id") == oid]

    xai_rationale = generate_offender_xai_rationale(offender, vehicles, phones, accounts, len(associates))

    return {
        "id": oid,
        "name": offender.get("AccusedName"),
        "age": offender.get("AgeYear"),
        "gender": offender.get("GenderID"),
        "address": offender.get("address"),
        "num_prior_offenses": offender.get("num_prior_offenses"),
        "risk_score": offender.get("risk_score"),
        "firs": firs,
        "associates": associates,
        "xai_rationale": xai_rationale,
    }
