from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List

# Auth Schemas
class LoginRequest(BaseModel):
    username: str
    password: str
    role: str # Field Officer, District Head, State Admin
    district_id: Optional[int] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    username: str
    role: str
    district_id: Optional[int] = None

# District Schemas
class DistrictBase(BaseModel):
    name: str
    population: int
    area_sqkm: float
    literacy_rate: float
    unemployment_rate: float
    avg_income: float
    urbanization_pct: float

class DistrictResponse(DistrictBase):
    id: int

    class Config:
        from_attributes = True

# Police Station Schemas
class PoliceStationResponse(BaseModel):
    id: str
    name: str
    district_id: int
    lat: float
    lng: float
    jurisdiction_area_sqkm: float
    officer_count: int

    class Config:
        from_attributes = True

# Offender Schemas
class OffenderBase(BaseModel):
    id: str
    name: str
    age: int
    gender: str
    address: str
    num_prior_offenses: int
    risk_score: float

class OffenderResponse(OffenderBase):
    associates: List[str] = []

    class Config:
        from_attributes = True

# FIR Record Schemas
class FIRRecordResponse(BaseModel):
    id: str
    police_station_id: str
    crime_type: str
    ipc_section: str
    date_filed: datetime
    lat: float
    lng: float
    status: str
    victim_age: int
    victim_gender: str
    accused: List[OffenderBase] = []

    class Config:
        from_attributes = True

# Dashboard summary schema
class DashboardSummary(BaseModel):
    total_firs: int
    active_cases: int
    conviction_rate: float
    avg_response_time_mins: int
    top_crime_category: str
    total_offenders: int

class TrendDataPoint(BaseModel):
    date: str
    count: int

class CategoryDistribution(BaseModel):
    category: str
    count: int

class DistrictCrimeDensity(BaseModel):
    district_name: str
    density: float
    count: int
