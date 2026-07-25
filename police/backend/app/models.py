from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict
from datetime import datetime, date

# ==========================================
# ZOHO PRESCRIBED LOOKUP TABLES (NoSQL)
# ==========================================

class State(BaseModel):
    StateID: int
    StateName: Optional[str] = None
    NationalityID: Optional[int] = None
    Active: Optional[bool] = None

class District(BaseModel):
    DistrictID: int
    DistrictName: Optional[str] = None
    StateID: Optional[int] = None
    Active: Optional[bool] = None
    # Extended AI Fields
    population: Optional[int] = None
    area_sqkm: Optional[float] = None
    literacy_rate: Optional[float] = None
    unemployment_rate: Optional[float] = None
    avg_income: Optional[float] = None
    urbanization_pct: Optional[float] = None

class Court(BaseModel):
    CourtID: int
    CourtName: Optional[str] = None
    DistrictID: Optional[int] = None
    StateID: Optional[int] = None
    Active: Optional[bool] = None

class UnitType(BaseModel):
    UnitTypeID: int
    UnitTypeName: Optional[str] = None
    CityDistState: Optional[str] = None
    Hierarchy: Optional[int] = None
    Active: Optional[bool] = None

class Unit(BaseModel):
    UnitID: int
    UnitName: Optional[str] = None
    TypeID: Optional[int] = None
    ParentUnit: Optional[int] = None
    NationalityID: Optional[int] = None
    StateID: Optional[int] = None
    DistrictID: Optional[int] = None
    Active: Optional[bool] = None
    # AI Fields
    lat: Optional[float] = None
    lng: Optional[float] = None
    jurisdiction_area_sqkm: Optional[float] = None
    officer_count: Optional[int] = None

class Rank(BaseModel):
    RankID: int
    RankName: Optional[str] = None
    Hierarchy: Optional[int] = None
    Active: Optional[bool] = None

class Designation(BaseModel):
    DesignationID: int
    DesignationName: Optional[str] = None
    Active: Optional[bool] = None
    SortOrder: Optional[int] = None

class Employee(BaseModel):
    EmployeeID: int
    DistrictID: Optional[int] = None
    UnitID: Optional[int] = None
    RankID: Optional[int] = None
    DesignationID: Optional[int] = None
    KGID: Optional[str] = None
    FirstName: Optional[str] = None
    EmployeeDOB: Optional[date] = None
    GenderID: Optional[int] = None
    BloodGroupID: Optional[int] = None
    PhysicallyChallenged: Optional[bool] = None
    AppointmentDate: Optional[date] = None
    # Extended AI Auth fields
    username: Optional[str] = None
    hashed_password: Optional[str] = None
    role: Optional[str] = None
    mfa_secret: Optional[str] = None
    mfa_enabled: bool = True

class CaseCategory(BaseModel):
    CaseCategoryID: int
    LookupValue: Optional[str] = None

class GravityOffence(BaseModel):
    GravityOffenceID: int
    LookupValue: Optional[str] = None

class CrimeHead(BaseModel):
    CrimeHeadID: int
    CrimeGroupName: Optional[str] = None
    Active: Optional[bool] = None

class CrimeSubHead(BaseModel):
    CrimeSubHeadID: int
    CrimeHeadID: Optional[int] = None
    CrimeHeadName: Optional[str] = None
    SeqID: Optional[int] = None

class CaseStatusMaster(BaseModel):
    CaseStatusID: int
    CaseStatusName: Optional[str] = None

class CasteMaster(BaseModel):
    caste_master_id: int
    caste_master_name: Optional[str] = None

class ReligionMaster(BaseModel):
    ReligionID: int
    ReligionName: Optional[str] = None

class OccupationMaster(BaseModel):
    OccupationID: int
    OccupationName: Optional[str] = None

class Act(BaseModel):
    ActCode: str
    ActDescription: Optional[str] = None
    ShortName: Optional[str] = None
    Active: Optional[bool] = None

class Section(BaseModel):
    id: int
    ActCode: Optional[str] = None
    SectionCode: Optional[str] = None
    SectionDescription: Optional[str] = None
    Active: Optional[bool] = None

class CrimeHeadActSection(BaseModel):
    id: int
    CrimeHeadID: Optional[int] = None
    ActCode: Optional[str] = None
    SectionCode: Optional[str] = None

# ==========================================
# ZOHO PRESCRIBED CORE INCIDENT TABLES
# ==========================================

class CaseMaster(BaseModel):
    CaseMasterID: int
    CrimeNo: Optional[str] = None
    CaseNo: Optional[str] = None
    CrimeRegisteredDate: Optional[date] = None
    PolicePersonID: Optional[int] = None
    PoliceStationID: Optional[int] = None
    CaseCategoryID: Optional[int] = None
    GravityOffenceID: Optional[int] = None
    CrimeMajorHeadID: Optional[int] = None
    CrimeMinorHeadID: Optional[int] = None
    CaseStatusID: Optional[int] = None
    CourtID: Optional[int] = None
    IncidentFromDate: Optional[datetime] = None
    IncidentToDate: Optional[datetime] = None
    InfoReceivedPSDate: Optional[datetime] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    BriefFacts: Optional[str] = None
    # AI Specific Extensions
    priority: str = "Medium"
    sla_deadline: Optional[datetime] = None
    summary: Optional[str] = None
    leads: Optional[List[Any]] = None
    evidence_correlations: Optional[List[Any]] = None
    timeline: Optional[List[Any]] = None

class ComplainantDetails(BaseModel):
    ComplainantID: int
    CaseMasterID: Optional[int] = None
    ComplainantName: Optional[str] = None
    AgeYear: Optional[int] = None
    OccupationID: Optional[int] = None
    ReligionID: Optional[int] = None
    CasteID: Optional[int] = None
    GenderID: Optional[int] = None

class ActSectionAssociation(BaseModel):
    id: int
    CaseMasterID: Optional[int] = None
    ActID: Optional[str] = None
    SectionID: Optional[str] = None
    ActOrderID: Optional[int] = None
    SectionOrderID: Optional[int] = None

class Victim(BaseModel):
    VictimMasterID: int
    CaseMasterID: Optional[int] = None
    VictimName: Optional[str] = None
    AgeYear: Optional[int] = None
    GenderID: Optional[int] = None
    VictimPolice: Optional[str] = None

class Accused(BaseModel):
    AccusedMasterID: int
    CaseMasterID: Optional[int] = None
    AccusedName: Optional[str] = None
    AgeYear: Optional[int] = None
    GenderID: Optional[int] = None
    PersonID: Optional[str] = None
    # Extended AI Offender fields
    address: Optional[str] = None
    num_prior_offenses: int = 0
    risk_score: float = 0.0

class ArrestSurrender(BaseModel):
    ArrestSurrenderID: int
    CaseMasterID: Optional[int] = None
    ArrestSurrenderTypeID: Optional[int] = None
    ArrestSurrenderDate: Optional[date] = None
    ArrestSurrenderStateId: Optional[int] = None
    ArrestSurrenderDistrictId: Optional[int] = None
    PoliceStationID: Optional[int] = None
    IOID: Optional[int] = None
    CourtID: Optional[int] = None
    AccusedMasterID: Optional[int] = None
    IsAccused: Optional[bool] = None
    IsComplainantAccused: Optional[bool] = None

class ChargesheetDetails(BaseModel):
    CSID: int
    CaseMasterID: Optional[int] = None
    csdate: Optional[datetime] = None
    cstype: Optional[str] = None
    PolicePersonID: Optional[int] = None

# ==========================================
# KAWACH AI EXTENSIONS & GRAPH TABLES
# ==========================================

class AuditLog(BaseModel):
    id: int
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    username: str
    role: str
    action: str
    details: Optional[Dict] = None
    ip_address: Optional[str] = None

class SocioEconomicIndicator(BaseModel):
    id: int
    district_id: int
    year: int
    gdp_per_capita: Optional[float] = None
    poverty_rate: Optional[float] = None
    school_density: Optional[float] = None
    hospital_density: Optional[float] = None
    police_per_capita: Optional[float] = None

class Gang(BaseModel):
    id: str
    name: str
    description: Optional[str] = None

class Vehicle(BaseModel):
    plate_number: str
    make: Optional[str] = None
    model: Optional[str] = None
    owner_offender_id: Optional[int] = None

class Phone(BaseModel):
    phone_number: str
    owner_offender_id: Optional[int] = None

class Account(BaseModel):
    account_number: str
    bank_name: Optional[str] = None
    owner_offender_id: Optional[int] = None

class Call(BaseModel):
    id: int
    caller_phone: str
    receiver_phone: str
    timestamp: datetime
    duration_seconds: int

class Location(BaseModel):
    id: str
    name: str
    lat: float
    lng: float

class Visit(BaseModel):
    id: int
    offender_id: int
    location_id: str
    timestamp: datetime

class MissingPerson(BaseModel):
    id: str
    name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    last_seen_date: datetime
    last_seen_location: Optional[str] = None
    photo_url: Optional[str] = None
    status: str = "Active"

class UnidentifiedBody(BaseModel):
    id: str
    estimated_age: Optional[int] = None
    gender: Optional[str] = None
    found_date: datetime
    found_location: Optional[str] = None
    distinguishing_features: Optional[str] = None
    status: str = "Unidentified"

class TelecomCDR(BaseModel):
    id: int
    phone_number: str
    imsi: Optional[str] = None
    imei: Optional[str] = None
    cell_tower_id: Optional[str] = None
    call_type: Optional[str] = None
    associated_number: Optional[str] = None
    duration_seconds: Optional[int] = None
    timestamp: datetime

class RBIFraudRegistry(BaseModel):
    id: int
    account_number: str
    bank_name: Optional[str] = None
    flagged_date: datetime = Field(default_factory=datetime.utcnow)
    fraud_type: Optional[str] = None
    reported_amount: Optional[float] = None
    status: str = "Flagged"

class NayakSession(BaseModel):
    id: str
    user_id: str
    started_at: datetime = Field(default_factory=datetime.utcnow)
    last_active_at: datetime = Field(default_factory=datetime.utcnow)
    title: Optional[str] = None

class NayakMessage(BaseModel):
    id: int
    session_id: str
    role: str
    content: str
    tool_name: Optional[str] = None
    tool_result: Optional[Dict] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class NayakUserUpload(BaseModel):
    id: str
    user_id: str
    session_id: Optional[str] = None
    media_url: str
    media_type: str
    classifier_verdict: Optional[Dict] = None
    linked_report_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class CurrencySeizure(BaseModel):
    id: str
    lat: float
    lng: float
    denomination: Optional[str] = None
    verdict: str
    authenticity_score: Optional[float] = None
    notes_count: int = 1
    logged_by: Optional[str] = None
    location_name: Optional[str] = None
    logged_at: datetime = Field(default_factory=datetime.utcnow)

class NayakLawChunk(BaseModel):
    id: str
    act: str
    section: str
    title: str
    official_text: str
    citizen_scenario: str
    citizen_explanation: str
    recommended_action: str
    penalty_summary: str
    source_url: Optional[str] = None
    last_verified: str
    tags: List[str]
    embedding: Optional[List[float]] = None

class IPSighting(BaseModel):
    ip: str
    lookup_count: int = 1
    first_seen: datetime = Field(default_factory=datetime.utcnow)
    last_seen: datetime = Field(default_factory=datetime.utcnow)

class IPWatchlistEntry(BaseModel):
    id: int
    ip: str
    list_type: str
    note: Optional[str] = None
    added_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
