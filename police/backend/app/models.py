from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Table, text, Boolean
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime

# Junction table for FIR to Accused (Many-to-Many)
fir_accused = Table(
    'fir_accused',
    Base.metadata,
    Column('fir_id', String, ForeignKey('fir_records.id', ondelete='CASCADE'), primary_key=True),
    Column('offender_id', String, ForeignKey('offenders.id', ondelete='CASCADE'), primary_key=True)
)

# Junction table for Offender known associates (Self-referencing Many-to-Many)
offender_associates = Table(
    'offender_associates',
    Base.metadata,
    Column('offender_id', String, ForeignKey('offenders.id', ondelete='CASCADE'), primary_key=True),
    Column('associate_id', String, ForeignKey('offenders.id', ondelete='CASCADE'), primary_key=True)
)

# Junction table for Offender to Gangs
offender_gang = Table(
    'offender_gang',
    Base.metadata,
    Column('offender_id', String, ForeignKey('offenders.id', ondelete='CASCADE'), primary_key=True),
    Column('gang_id', String, ForeignKey('gangs.id', ondelete='CASCADE'), primary_key=True)
)

class User(Base):
    __tablename__ = 'users'
    
    username = Column(String, primary_key=True)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False)  # DGP, SP, SHO, Constable
    district_id = Column(Integer, ForeignKey('districts.id', ondelete='SET NULL'), nullable=True)
    station_id = Column(String, ForeignKey('police_stations.id', ondelete='SET NULL'), nullable=True)
    mfa_secret = Column(String, nullable=True)
    mfa_enabled = Column(Boolean, default=True)
    
    district = relationship("District")
    station = relationship("PoliceStation")

class AuditLog(Base):
    __tablename__ = 'audit_logs'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    username = Column(String, nullable=False)
    role = Column(String, nullable=False)
    action = Column(String, nullable=False)
    details = Column(JSONB, nullable=True)
    ip_address = Column(String, nullable=True)

class EntityMatchReview(Base):
    __tablename__ = 'entity_match_reviews'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    offender1_id = Column(String, ForeignKey('offenders.id', ondelete='CASCADE'), nullable=False)
    offender2_id = Column(String, ForeignKey('offenders.id', ondelete='CASCADE'), nullable=False)
    confidence_score = Column(Float, nullable=False)
    status = Column(String, default="Pending")  # Pending, Merged, Rejected
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    reviewed_by = Column(String, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    
    offender1 = relationship("Offender", foreign_keys=[offender1_id])
    offender2 = relationship("Offender", foreign_keys=[offender2_id])

class District(Base):
    __tablename__ = 'districts'
    
    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True, nullable=False)
    population = Column(Integer)
    area_sqkm = Column(Float)
    literacy_rate = Column(Float)
    unemployment_rate = Column(Float)
    avg_income = Column(Float)
    urbanization_pct = Column(Float)
    
    stations = relationship("PoliceStation", back_populates="district")
    socio_economic = relationship("SocioEconomicIndicator", back_populates="district")

class PoliceStation(Base):
    __tablename__ = 'police_stations'
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    district_id = Column(Integer, ForeignKey('districts.id'))
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    jurisdiction_area_sqkm = Column(Float)
    officer_count = Column(Integer)
    
    district = relationship("District", back_populates="stations")
    firs = relationship("FIRRecord", back_populates="station")

class Gang(Base):
    __tablename__ = 'gangs'
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(String)
    
    members = relationship("Offender", secondary=offender_gang, back_populates="gangs")

class Vehicle(Base):
    __tablename__ = 'vehicles'
    
    plate_number = Column(String, primary_key=True)
    make = Column(String)
    model = Column(String)
    owner_offender_id = Column(String, ForeignKey('offenders.id', ondelete='SET NULL'), nullable=True)
    
    owner = relationship("Offender", back_populates="vehicles")

class Phone(Base):
    __tablename__ = 'phones'
    
    phone_number = Column(String, primary_key=True)
    owner_offender_id = Column(String, ForeignKey('offenders.id', ondelete='SET NULL'), nullable=True)
    
    owner = relationship("Offender", back_populates="phones")

class Account(Base):
    __tablename__ = 'accounts'
    
    account_number = Column(String, primary_key=True)
    bank_name = Column(String)
    owner_offender_id = Column(String, ForeignKey('offenders.id', ondelete='SET NULL'), nullable=True)
    
    owner = relationship("Offender", back_populates="accounts")

class Call(Base):
    __tablename__ = 'calls'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    caller_phone = Column(String, ForeignKey('phones.phone_number', ondelete='CASCADE'), nullable=False)
    receiver_phone = Column(String, ForeignKey('phones.phone_number', ondelete='CASCADE'), nullable=False)
    timestamp = Column(DateTime, nullable=False)
    duration_seconds = Column(Integer, nullable=False)

class Location(Base):
    __tablename__ = 'locations'
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)

class Visit(Base):
    __tablename__ = 'visits'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    offender_id = Column(String, ForeignKey('offenders.id', ondelete='CASCADE'), nullable=False)
    location_id = Column(String, ForeignKey('locations.id', ondelete='CASCADE'), nullable=False)
    timestamp = Column(DateTime, nullable=False)
    
    offender = relationship("Offender")
    location = relationship("Location")

class Offender(Base):
    __tablename__ = 'offenders'
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    age = Column(Integer)
    gender = Column(String)
    address = Column(String)
    num_prior_offenses = Column(Integer, default=0)
    risk_score = Column(Float, default=0.0)
    
    firs = relationship("FIRRecord", secondary=fir_accused, back_populates="accused")
    gangs = relationship("Gang", secondary=offender_gang, back_populates="members")
    vehicles = relationship("Vehicle", back_populates="owner")
    phones = relationship("Phone", back_populates="owner")
    accounts = relationship("Account", back_populates="owner")
    
    # Self-referencing relationship for associates
    associates = relationship(
        'Offender',
        secondary=offender_associates,
        primaryjoin=id == offender_associates.c.offender_id,
        secondaryjoin=id == offender_associates.c.associate_id,
        backref='associated_by'
    )

class FIRRecord(Base):
    __tablename__ = 'fir_records'
    
    id = Column(String, primary_key=True)
    police_station_id = Column(String, ForeignKey('police_stations.id'), nullable=False)
    crime_type = Column(String, nullable=False)
    ipc_section = Column(String, nullable=False)
    date_filed = Column(DateTime, nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    status = Column(String, default="Investigation")  # Investigation, Charge Sheeted, Closed
    victim_age = Column(Integer)
    victim_gender = Column(String)
    
    # SLA, routing, AI helper columns
    assigned_officer_id = Column(String, ForeignKey('users.username', ondelete='SET NULL'), nullable=True)
    priority = Column(String, default="Medium")  # Low, Medium, High, Critical
    sla_deadline = Column(DateTime, nullable=True)
    summary = Column(String, nullable=True)
    leads = Column(JSONB, nullable=True)
    evidence_correlations = Column(JSONB, nullable=True)
    timeline = Column(JSONB, nullable=True)
    
    station = relationship("PoliceStation", back_populates="firs")
    accused = relationship("Offender", secondary=fir_accused, back_populates="firs")
    assigned_officer = relationship("User")

class SocioEconomicIndicator(Base):
    __tablename__ = 'socio_economic_indicators'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    district_id = Column(Integer, ForeignKey('districts.id'), nullable=False)
    year = Column(Integer, nullable=False)
    gdp_per_capita = Column(Float)
    poverty_rate = Column(Float)
    school_density = Column(Float)
    hospital_density = Column(Float)
    police_per_capita = Column(Float)
    
    district = relationship("District", back_populates="socio_economic")

class MissingPerson(Base):
    __tablename__ = 'missing_persons'
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    age = Column(Integer)
    gender = Column(String)
    last_seen_date = Column(DateTime, nullable=False)
    last_seen_location = Column(String)
    photo_url = Column(String, nullable=True)
    status = Column(String, default="Active") # Active, Found

class UnidentifiedBody(Base):
    __tablename__ = 'unidentified_bodies'
    
    id = Column(String, primary_key=True)
    estimated_age = Column(Integer)
    gender = Column(String)
    found_date = Column(DateTime, nullable=False)
    found_location = Column(String)
    distinguishing_features = Column(String)
    status = Column(String, default="Unidentified") # Unidentified, Identified

class TelecomCDR(Base):
    __tablename__ = 'telecom_cdrs'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    phone_number = Column(String, nullable=False)
    imsi = Column(String)
    imei = Column(String)
    cell_tower_id = Column(String)
    call_type = Column(String) # Incoming, Outgoing, SMS
    associated_number = Column(String)
    duration_seconds = Column(Integer)
    timestamp = Column(DateTime, nullable=False)

class RBIFraudRegistry(Base):
    __tablename__ = 'rbi_fraud_registry'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    account_number = Column(String, nullable=False)
    bank_name = Column(String)
    flagged_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    fraud_type = Column(String)
    reported_amount = Column(Float)
    status = Column(String, default="Flagged") # Flagged, Frozen

class NayakSession(Base):
    __tablename__ = 'nayak_sessions'
    
    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_active_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    title = Column(String, nullable=True)

class NayakMessage(Base):
    __tablename__ = 'nayak_messages'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, ForeignKey('nayak_sessions.id', ondelete='CASCADE'), nullable=False)
    role = Column(String, nullable=False)  # 'user', 'assistant', 'tool'
    content = Column(String, nullable=False)
    tool_name = Column(String, nullable=True)
    tool_result = Column(JSONB, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class NayakUserUpload(Base):
    __tablename__ = 'nayak_user_uploads'
    
    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False)
    session_id = Column(String, ForeignKey('nayak_sessions.id', ondelete='SET NULL'), nullable=True)
    media_url = Column(String, nullable=False)
    media_type = Column(String, nullable=False)  # 'image', 'video', 'audio', 'link', 'text'
    classifier_verdict = Column(JSONB, nullable=True)
    linked_report_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class CurrencySeizure(Base):
    """
    Field-logged counterfeit currency seizure — geo-tagged so it can render
    on the same hotspot map as crime incidents (ET PS: 'counterfeit currency
    seizure points' alongside fraud/cybercrime hotspots). Independent of the
    Neo4j incident graph on purpose: seizures are officer-logged facts, not
    graph-derived intelligence, so they live in Postgres like FIRs.
    """
    __tablename__ = 'currency_seizures'

    id = Column(String, primary_key=True)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    denomination = Column(String, nullable=True)
    verdict = Column(String, nullable=False)  # mirrors Classifier's /classify-currency verdict enum
    authenticity_score = Column(Float, nullable=True)
    notes_count = Column(Integer, default=1)
    logged_by = Column(String, nullable=True)
    location_name = Column(String, nullable=True)
    logged_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class NayakLawChunk(Base):
    __tablename__ = 'nayak_law_chunks'
    
    id = Column(String, primary_key=True)
    act = Column(String, nullable=False)
    section = Column(String, nullable=False)
    title = Column(String, nullable=False)
    official_text = Column(String, nullable=False)
    citizen_scenario = Column(String, nullable=False)
    citizen_explanation = Column(String, nullable=False)
    recommended_action = Column(String, nullable=False)
    penalty_summary = Column(String, nullable=False)
    source_url = Column(String, nullable=True)
    last_verified = Column(String, nullable=False)
    tags = Column(JSONB, nullable=False)
    embedding = Column(JSONB, nullable=True)


class IPSighting(Base):
    """How many times KAWACH itself has looked up a given IP — the one
    'reputation' signal no external API can supply, since it reflects this
    department's own case history, not the wider internet's."""
    __tablename__ = 'ip_sightings'

    ip = Column(String, primary_key=True)
    lookup_count = Column(Integer, default=1, nullable=False)
    first_seen = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_seen = Column(DateTime, default=datetime.utcnow, nullable=False)


class IPWatchlistEntry(Base):
    __tablename__ = 'ip_watchlist'

    id = Column(Integer, primary_key=True, autoincrement=True)
    ip = Column(String, nullable=False, index=True)
    list_type = Column(String, nullable=False)  # 'watchlist' | 'blocklist'
    note = Column(String, nullable=True)
    added_by = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

