from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Table, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.database import Base

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
    status = Column(String, default="Investigation") # Investigation, Charge Sheeted, Closed
    victim_age = Column(Integer)
    victim_gender = Column(String)
    
    station = relationship("PoliceStation", back_populates="firs")
    accused = relationship("Offender", secondary=fir_accused, back_populates="firs")

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
