from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from app.database import get_db
from app.models import FIRRecord, Offender, District
from app.schemas import DashboardSummary, TrendDataPoint, CategoryDistribution, DistrictCrimeDensity

router = APIRouter()

@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(db: Session = Depends(get_db)):
    total_firs = db.query(FIRRecord).count()
    active_cases = db.query(FIRRecord).filter(FIRRecord.status == "Investigation").count()
    total_offenders = db.query(Offender).count()
    
    # Calculate top crime category
    top_crime = db.query(
        FIRRecord.crime_type, func.count(FIRRecord.id).label("count")
    ).group_by(FIRRecord.crime_type).order_by(text("count DESC")).first()
    
    top_crime_name = top_crime[0] if top_crime else "N/A"
    
    # Mock some realistic stats that aren't fully in DB
    conviction_rate = 64.2 # KSP standard target
    avg_response_time = 22 # minutes
    
    return {
        "total_firs": total_firs,
        "active_cases": active_cases,
        "conviction_rate": conviction_rate,
        "avg_response_time_mins": avg_response_time,
        "top_crime_category": top_crime_name,
        "total_offenders": total_offenders
    }

# Help import text
from sqlalchemy import text

@router.get("/trend", response_model=List[TrendDataPoint])
def get_crime_trend(db: Session = Depends(get_db)):
    # Group by month/year
    # For SQLite or PostgreSQL, we format date
    # Since we use PostgreSQL, we can use to_char
    results = db.query(
        func.to_char(FIRRecord.date_filed, 'YYYY-MM').label('month'),
        func.count(FIRRecord.id).label('count')
    ).group_by('month').order_by('month').all()
    
    return [{"date": r[0], "count": r[1]} for r in results]

@router.get("/categories", response_model=List[CategoryDistribution])
def get_category_distribution(db: Session = Depends(get_db)):
    results = db.query(
        FIRRecord.crime_type.label('category'),
        func.count(FIRRecord.id).label('count')
    ).group_by(FIRRecord.crime_type).order_by(text("count DESC")).all()
    
    return [{"category": r[0], "count": r[1]} for r in results]

@router.get("/districts", response_model=List[DistrictCrimeDensity])
def get_district_rankings(db: Session = Depends(get_db)):
    # Calculate crime per district
    # Join FIR -> Police Station -> District
    results = db.query(
        District.name.label('district_name'),
        func.count(FIRRecord.id).label('count'),
        District.population.label('pop')
    ).join(PoliceStation, District.id == PoliceStation.district_id)\
     .join(FIRRecord, PoliceStation.id == FIRRecord.police_station_id)\
     .group_by(District.name, District.population)\
     .order_by(text("count DESC")).limit(5).all()
     
    # Density is crime per 100K population
    return [{
        "district_name": r[0],
        "count": r[1],
        "density": round((r[1] / r[2]) * 100000, 2)
    } for r in results]

# Let's import PoliceStation locally inside routes to avoid circular imports or ensure model is known
from app.models import PoliceStation
