from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import get_current_user_claims
from datetime import datetime

router = APIRouter()

@router.get("/news-pins")
def get_osint_news_pins(db: Session = Depends(get_db), claims: dict = Depends(get_current_user_claims)):
    # Mock OSINT geocoded feeds scraped from local Twitter/X and emergency logs
    return [
        {
            "id": "NEWS-001",
            "title": "Severe Water Logging & Traffic Standstill at Koramangala 80ft Rd",
            "source": "@BlrCityPolice",
            "lat": 12.9348,
            "lng": 77.6200,
            "category": "Traffic",
            "severity": "High",
            "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        },
        {
            "id": "NEWS-002",
            "title": "Minor Electrical Fire Controlled at Commercial Street Mall",
            "source": "Karnataka Fire Services",
            "lat": 12.9815,
            "lng": 77.6080,
            "category": "Fire",
            "severity": "Medium",
            "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        },
        {
            "id": "NEWS-003",
            "title": "Protests Reported Near Town Hall. Alternate Routes Advised.",
            "source": "Local News Web",
            "lat": 12.9642,
            "lng": 77.5855,
            "category": "Violence",
            "severity": "Critical",
            "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        },
        {
            "id": "NEWS-004",
            "title": "ANPR Camera Flags Stolen SUV Passing Through Indiranagar 12th Main",
            "source": "KSP ANPR System",
            "lat": 12.9719,
            "lng": 77.6412,
            "category": "Vehicle Theft",
            "severity": "Medium",
            "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        }
    ]
