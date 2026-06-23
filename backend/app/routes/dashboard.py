from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from typing import List
from app.database import get_db
from app.models import FIRRecord, Offender, District, PoliceStation, fir_accused
from app.schemas import DashboardSummary, TrendDataPoint, CategoryDistribution, DistrictCrimeDensity
from app.auth import get_current_user_claims

router = APIRouter()

def apply_role_filters(query, claims, table_class):
    role = claims.get("role")
    if role == "SP":
        if table_class == FIRRecord:
            return query.join(PoliceStation).filter(PoliceStation.district_id == claims.get("district_id"))
        elif table_class == Offender:
            return query.join(FIRRecord, Offender.firs).join(PoliceStation).filter(PoliceStation.district_id == claims.get("district_id")).distinct()
    elif role == "SHO":
        if table_class == FIRRecord:
            return query.filter(FIRRecord.police_station_id == claims.get("station_id"))
        elif table_class == Offender:
            return query.join(FIRRecord, Offender.firs).filter(FIRRecord.police_station_id == claims.get("station_id")).distinct()
    elif role == "Constable":
        if table_class == FIRRecord:
            return query.filter(FIRRecord.assigned_officer_id == claims.get("username"))
        elif table_class == Offender:
            return query.join(FIRRecord, Offender.firs).filter(FIRRecord.assigned_officer_id == claims.get("username")).distinct()
    return query

@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(db: Session = Depends(get_db), claims: dict = Depends(get_current_user_claims)):
    firs_q = apply_role_filters(db.query(FIRRecord), claims, FIRRecord)
    total_firs = firs_q.count()
    active_cases = firs_q.filter(FIRRecord.status == "Investigation").count()
    
    offenders_q = apply_role_filters(db.query(Offender), claims, Offender)
    total_offenders = offenders_q.count()
    
    # Calculate top crime category
    top_crime_q = apply_role_filters(
        db.query(FIRRecord.crime_type, func.count(FIRRecord.id).label("count")),
        claims,
        FIRRecord
    ).group_by(FIRRecord.crime_type).order_by(text("count DESC"))
    
    top_crime = top_crime_q.first()
    top_crime_name = top_crime[0] if top_crime else "N/A"
    
    # Mock some realistic stats
    conviction_rate = 64.2
    avg_response_time = 22
    
    return {
        "total_firs": total_firs,
        "active_cases": active_cases,
        "conviction_rate": conviction_rate,
        "avg_response_time_mins": avg_response_time,
        "top_crime_category": top_crime_name,
        "total_offenders": total_offenders
    }

@router.get("/trend", response_model=List[TrendDataPoint])
def get_crime_trend(db: Session = Depends(get_db), claims: dict = Depends(get_current_user_claims)):
    q = db.query(
        func.to_char(FIRRecord.date_filed, 'YYYY-MM').label('month'),
        func.count(FIRRecord.id).label('count')
    )
    role = claims.get("role")
    if role == "SP":
        q = q.join(PoliceStation).filter(PoliceStation.district_id == claims.get("district_id"))
    elif role == "SHO":
        q = q.filter(FIRRecord.police_station_id == claims.get("station_id"))
    elif role == "Constable":
        q = q.filter(FIRRecord.assigned_officer_id == claims.get("username"))
        
    results = q.group_by('month').order_by('month').all()
    return [{"date": r[0], "count": r[1]} for r in results]

@router.get("/categories", response_model=List[CategoryDistribution])
def get_category_distribution(db: Session = Depends(get_db), claims: dict = Depends(get_current_user_claims)):
    q = db.query(
        FIRRecord.crime_type.label('category'),
        func.count(FIRRecord.id).label('count')
    )
    role = claims.get("role")
    if role == "SP":
        q = q.join(PoliceStation).filter(PoliceStation.district_id == claims.get("district_id"))
    elif role == "SHO":
        q = q.filter(FIRRecord.police_station_id == claims.get("station_id"))
    elif role == "Constable":
        q = q.filter(FIRRecord.assigned_officer_id == claims.get("username"))
        
    results = q.group_by(FIRRecord.crime_type).order_by(text("count DESC")).all()
    return [{"category": r[0], "count": r[1]} for r in results]

@router.get("/districts", response_model=List[DistrictCrimeDensity])
def get_district_rankings(db: Session = Depends(get_db), claims: dict = Depends(get_current_user_claims)):
    role = claims.get("role")
    if role in ["SP", "SHO", "Constable"]:
        dist_id = claims.get("district_id")
        results = db.query(
            PoliceStation.name.label('station_name'),
            func.count(FIRRecord.id).label('count'),
            PoliceStation.officer_count.label('officer_count')
        ).join(FIRRecord, PoliceStation.id == FIRRecord.police_station_id)\
         .filter(PoliceStation.district_id == dist_id)\
         .group_by(PoliceStation.name, PoliceStation.officer_count)\
         .order_by(text("count DESC")).limit(5).all()
         
        return [{
            "district_name": r[0],
            "count": r[1],
            "density": round((r[1] / max(1, r[2])) * 10, 2)
        } for r in results]
    else:
        results = db.query(
            District.name.label('district_name'),
            func.count(FIRRecord.id).label('count'),
            District.population.label('pop')
        ).join(PoliceStation, District.id == PoliceStation.district_id)\
         .join(FIRRecord, PoliceStation.id == FIRRecord.police_station_id)\
         .group_by(District.name, District.population)\
         .order_by(text("count DESC")).limit(5).all()
         
        return [{
            "district_name": r[0],
            "count": r[1],
            "density": round((r[1] / r[2]) * 100000, 2)
        } for r in results]

