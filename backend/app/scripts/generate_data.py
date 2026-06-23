import random
from datetime import datetime, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import settings
from app.database import Base, SessionLocal, engine
from app.models import (
    District, PoliceStation, Offender, FIRRecord, SocioEconomicIndicator,
    User, AuditLog, EntityMatchReview, Gang, Vehicle, Phone, Account, Call, Location, Visit,
    MissingPerson, UnidentifiedBody, TelecomCDR, RBIFraudRegistry
)
from app.auth import get_password_hash

# Districts of Karnataka with approximate center coords & metrics
KARNATAKA_DISTRICTS = [
    {"name": "Bengaluru Urban", "lat": 12.9716, "lng": 77.5946, "pop": 9621551, "area": 2196, "lit": 87.67, "unemp": 6.8, "income": 280000, "urban": 90.9},
    {"name": "Mysuru", "lat": 12.2958, "lng": 76.6394, "pop": 3001127, "area": 6854, "lit": 72.79, "unemp": 4.5, "income": 160000, "urban": 41.5},
    {"name": "Dakshina Kannada", "lat": 12.8703, "lng": 74.8827, "pop": 2089649, "area": 4843, "lit": 88.57, "unemp": 5.2, "income": 190000, "urban": 47.6},
    {"name": "Dharwad", "lat": 15.4589, "lng": 75.0078, "pop": 1847023, "area": 4263, "lit": 80.30, "unemp": 4.9, "income": 150000, "urban": 56.8},
    {"name": "Belagavi", "lat": 15.8497, "lng": 74.4977, "pop": 4779661, "area": 13415, "lit": 73.48, "unemp": 3.8, "income": 130000, "urban": 25.3},
    {"name": "Kalaburagi", "lat": 17.3297, "lng": 76.8343, "pop": 2566326, "area": 10951, "lit": 64.85, "unemp": 7.2, "income": 110000, "urban": 32.5},
    {"name": "Shivamogga", "lat": 13.9299, "lng": 75.5681, "pop": 1752753, "area": 8477, "lit": 80.45, "unemp": 4.2, "income": 140000, "urban": 35.6},
    {"name": "Udupi", "lat": 13.3409, "lng": 74.7421, "pop": 1177361, "area": 3880, "lit": 86.24, "unemp": 4.8, "income": 175000, "urban": 29.8},
    {"name": "Tumakuru", "lat": 13.3392, "lng": 77.1140, "pop": 2678703, "area": 10597, "lit": 75.14, "unemp": 4.1, "income": 125000, "urban": 22.4},
    {"name": "Ballari", "lat": 15.1394, "lng": 76.9214, "pop": 1400000, "area": 4252, "lit": 67.43, "unemp": 5.8, "income": 115000, "urban": 37.5},
    {"name": "Vijayapura", "lat": 16.8302, "lng": 75.7100, "pop": 2177331, "area": 10498, "lit": 67.20, "unemp": 4.6, "income": 105000, "urban": 23.0},
    {"name": "Bagalkote", "lat": 16.1817, "lng": 75.6958, "pop": 1889752, "area": 6575, "lit": 68.82, "unemp": 4.2, "income": 112000, "urban": 31.6},
    {"name": "Bidar", "lat": 17.9104, "lng": 77.5199, "pop": 1703300, "area": 5448, "lit": 70.51, "unemp": 5.1, "income": 108000, "urban": 25.0},
    {"name": "Mandya", "lat": 12.5218, "lng": 76.8973, "pop": 1805769, "area": 4961, "lit": 70.40, "unemp": 3.5, "income": 135000, "urban": 17.2},
    {"name": "Hassan", "lat": 13.0068, "lng": 76.1026, "pop": 1776421, "area": 6814, "lit": 76.07, "unemp": 3.9, "income": 142000, "urban": 21.2},
    {"name": "Chikkamagaluru", "lat": 13.3161, "lng": 75.7720, "pop": 1137961, "area": 7201, "lit": 79.25, "unemp": 3.7, "income": 152000, "urban": 21.0},
    {"name": "Chitradurga", "lat": 14.2217, "lng": 76.3980, "pop": 1659456, "area": 8440, "lit": 73.82, "unemp": 4.8, "income": 118000, "urban": 19.8},
    {"name": "Davanagere", "lat": 14.4644, "lng": 75.9218, "pop": 1945497, "area": 5924, "lit": 75.74, "unemp": 4.4, "income": 128000, "urban": 32.5},
    {"name": "Kolar", "lat": 13.1368, "lng": 78.1292, "pop": 1536898, "area": 3969, "lit": 74.39, "unemp": 4.5, "income": 132000, "urban": 31.2},
    {"name": "Chikkaballapura", "lat": 13.4354, "lng": 77.7275, "pop": 1255104, "area": 4254, "lit": 69.76, "unemp": 4.3, "income": 126000, "urban": 22.4},
    {"name": "Ramanagara", "lat": 12.7150, "lng": 77.2813, "pop": 1085743, "area": 3556, "lit": 69.22, "unemp": 4.0, "income": 138000, "urban": 24.7},
    {"name": "Bengaluru Rural", "lat": 13.2847, "lng": 77.5760, "pop": 990923, "area": 2295, "lit": 77.93, "unemp": 4.2, "income": 165000, "urban": 27.1},
    {"name": "Chamarajanagar", "lat": 11.9261, "lng": 76.9402, "pop": 1022335, "area": 5101, "lit": 61.43, "unemp": 5.4, "income": 98000, "urban": 17.1},
    {"name": "Kodagu", "lat": 12.3375, "lng": 75.8069, "pop": 554519, "area": 4102, "lit": 82.61, "unemp": 3.2, "income": 185000, "urban": 14.6},
    {"name": "Uttara Kannada", "lat": 14.6200, "lng": 74.6973, "pop": 1437169, "area": 10291, "lit": 84.06, "unemp": 4.6, "income": 148000, "urban": 29.1},
    {"name": "Haveri", "lat": 14.7971, "lng": 75.3980, "pop": 1597668, "area": 4823, "lit": 77.40, "unemp": 3.9, "income": 120000, "urban": 20.7},
    {"name": "Gadag", "lat": 15.4172, "lng": 75.6277, "pop": 1065235, "area": 4656, "lit": 75.12, "unemp": 4.1, "income": 122000, "urban": 35.6},
    {"name": "Koppal", "lat": 15.3463, "lng": 76.1554, "pop": 1389920, "area": 5570, "lit": 68.09, "unemp": 5.0, "income": 110000, "urban": 16.8},
    {"name": "Raichur", "lat": 16.2120, "lng": 77.3556, "pop": 1928812, "area": 8440, "lit": 59.56, "unemp": 6.9, "income": 102000, "urban": 25.4},
    {"name": "Yadgir", "lat": 16.7621, "lng": 77.1442, "pop": 1174271, "area": 5234, "lit": 51.83, "unemp": 7.5, "income": 92000, "urban": 18.6},
    {"name": "Vijayanagara", "lat": 15.2754, "lng": 76.3909, "pop": 1350000, "area": 5644, "lit": 68.00, "unemp": 5.2, "income": 114000, "urban": 26.3}
]

CRIME_TYPES_IPC = [
    ("Theft / Robbery", "IPC Section 379/392", 2),
    ("Assault / Grievous Hurt", "IPC Section 323/325", 3),
    ("Cybercrime / Phishing", "IPC Section 66D IT Act / IPC 420", 2),
    ("Murder / Homicide", "IPC Section 302", 5),
    ("Extortion", "IPC Section 384", 3),
    ("Kidnapping", "IPC Section 363", 4),
    ("Riot / Public Mischief", "IPC Section 147/505", 2),
    ("Drug Trafficking (NDPS)", "NDPS Section 20", 4),
    ("Economic Offense / Fraud", "IPC Section 406/420", 3),
    ("Agrarian / Land Dispute", "IPC Section 447/427", 1),
    ("Smuggling", "Customs Act Sec 135", 3)
]

def seed_database():
    db = SessionLocal()
    try:
        # Recreate tables
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        print("Schema initialized.")
        
        # 1. Seed Districts
        districts_objects = []
        for d in KARNATAKA_DISTRICTS:
            district = District(
                name=d["name"],
                population=d["pop"],
                area_sqkm=d["area"],
                literacy_rate=d["lit"],
                unemployment_rate=d["unemp"],
                avg_income=d["income"],
                urbanization_pct=d["urban"]
            )
            db.add(district)
            districts_objects.append((d, district))
        
        db.commit()
        print("Districts seeded.")
        
        # 2. Seed Police Stations
        stations_objects = []
        for d_info, d_model in districts_objects:
            num_stations = 15 if d_model.name == "Bengaluru Urban" else random.randint(3, 5)
            
            for i in range(num_stations):
                station_id = f"PS-{d_model.id:02d}-{i+1:02d}"
                jitter_lat = random.uniform(-0.15, 0.15)
                jitter_lng = random.uniform(-0.15, 0.15)
                
                station = PoliceStation(
                    id=station_id,
                    name=f"{d_model.name} Station {i+1}",
                    district_id=d_model.id,
                    lat=d_info["lat"] + jitter_lat,
                    lng=d_info["lng"] + jitter_lng,
                    jurisdiction_area_sqkm=round(d_info["area"] / num_stations, 2),
                    officer_count=random.randint(15, 80)
                )
                db.add(station)
                stations_objects.append(station)
                
        db.commit()
        print(f"{len(stations_objects)} Police Stations seeded.")

        # 3. Seed Users with credentials, roles, and boundaries
        blr_dist = db.query(District).filter(District.name == "Bengaluru Urban").first()
        blr_station = db.query(PoliceStation).filter(PoliceStation.district_id == blr_dist.id).first()

        users_to_seed = [
            {"username": "dgp", "password": "dgp123", "role": "DGP", "dist": None, "stat": None},
            {"username": "sp", "password": "sp123", "role": "SP", "dist": blr_dist.id, "stat": None},
            {"username": "sho", "password": "sho123", "role": "SHO", "dist": blr_dist.id, "stat": blr_station.id},
            {"username": "constable", "password": "constable123", "role": "Constable", "dist": blr_dist.id, "stat": blr_station.id},
            # Dummy test users to show ease of use
            {"username": "admin", "password": "admin123", "role": "DGP", "dist": None, "stat": None},
            {"username": "district", "password": "district123", "role": "SP", "dist": blr_dist.id, "stat": None},
            {"username": "officer", "password": "officer123", "role": "SHO", "dist": blr_dist.id, "stat": blr_station.id}
        ]

        users_objects = {}
        for u in users_to_seed:
            user = User(
                username=u["username"],
                hashed_password=get_password_hash(u["password"]),
                role=u["role"],
                district_id=u["dist"],
                station_id=u["stat"],
                mfa_secret="GA_SECRET_KEY_KAWACH_DEMO_2026",
                mfa_enabled=True
            )
            db.add(user)
            users_objects[u["username"]] = user

        db.commit()
        print("Users seeded successfully.")
        
        # 4. Seed Gangs
        gangs_objects = []
        gang_names = [
            "KGF Syndicate", "Silk Board Extortionists", "Brigade Road Gang", 
            "Electronic City Cyber Cartel", "Deccan Smugglers", "Coastal Mavericks",
            "Malleswaram Hackers", "Indiranagar Syndicate", "Whitefield Mafia"
        ]
        for idx, gname in enumerate(gang_names):
            gang = Gang(
                id=f"GANG-{idx+1:02d}",
                name=gname,
                description=f"Active organized syndicate specialized in operations near {gname.split(' ')[0]} areas."
            )
            db.add(gang)
            gangs_objects.append(gang)
        db.commit()
        print("Criminal Gangs seeded.")

        # 5. Seed Offenders
        offenders_objects = []
        genders = ["Male", "Female", "Other"]
        # Generate 2000 offenders
        for i in range(2000):
            offender_id = f"OFF-{i+1:04d}"
            # Let's seed specific names for entity resolution demo
            if i == 10:
                name = "Ramesh Kumar"
            elif i == 110:
                name = "Ramesh K. (Alias R. Kumar)"
            elif i == 20:
                name = "Zia Ahmed"
            elif i == 120:
                name = "Syed Zia Ahmed"
            else:
                name = f"Offender {i+1}"
                
            age = random.randint(18, 65)
            gender = random.choices(genders, weights=[88, 11, 1], k=1)[0]
            num_priors = random.choices([0, 1, 2, 3, 4, 5, 8, 12], weights=[60, 20, 10, 5, 2, 1.5, 1, 0.5], k=1)[0]
            risk_score = min(100.0, float(num_priors * 12 + random.randint(0, 15)))
            
            offender = Offender(
                id=offender_id,
                name=name,
                age=age,
                gender=gender,
                address=f"H.No {random.randint(1, 400)}, Ward {random.randint(1, 20)}, Karnataka",
                num_prior_offenses=num_priors,
                risk_score=risk_score
            )
            db.add(offender)
            offenders_objects.append(offender)
            
        db.commit()
        print(f"{len(offenders_objects)} Offenders seeded.")
        
        # Link some offenders to the Gangs
        for offender in offenders_objects:
            if random.random() < 0.15:
                gang = random.choice(gangs_objects)
                offender.gangs.append(gang)
                
        # Seed Graph Nodes: Phones, Vehicles, Bank Accounts
        phones_objects = []
        vehicles_objects = []
        accounts_objects = []
        
        for idx, o in enumerate(offenders_objects):
            # Seed Phone (75% of offenders have phones)
            if random.random() < 0.75:
                phone = Phone(
                    phone_number=f"+91-9844{idx:06d}",
                    owner_offender_id=o.id
                )
                db.add(phone)
                phones_objects.append(phone)
                
            # Seed Vehicle (50% of offenders have vehicles)
            if random.random() < 0.50:
                vehicle = Vehicle(
                    plate_number=f"KA-{random.randint(10,55)}-XY-{idx:04d}",
                    make=random.choice(["Maruti", "Hyundai", "Tata", "Mahindra", "Honda"]),
                    model=random.choice(["Swift", "i20", "Nexon", "Thar", "City"]),
                    owner_offender_id=o.id
                )
                db.add(vehicle)
                vehicles_objects.append(vehicle)
                
            # Seed Bank Account (60% of offenders)
            if random.random() < 0.60:
                account = Account(
                    account_number=f"SB-{random.randint(100000,999999)}-{idx:04d}",
                    bank_name=random.choice(["State Bank of India", "HDFC Bank", "ICICI Bank", "Canara Bank"]),
                    owner_offender_id=o.id
                )
                db.add(account)
                accounts_objects.append(account)
                
        db.commit()
        print("Associated Phones, Vehicles, and Accounts seeded.")

        # Seed Calls between phones
        for i in range(120):
            if len(phones_objects) > 2:
                caller = random.choice(phones_objects)
                receiver = random.choice(phones_objects)
                if caller.phone_number != receiver.phone_number:
                    call = Call(
                        caller_phone=caller.phone_number,
                        receiver_phone=receiver.phone_number,
                        timestamp=datetime.utcnow() - timedelta(days=random.randint(0, 90), hours=random.randint(0, 23)),
                        duration_seconds=random.randint(10, 600)
                    )
                    db.add(call)
        
        # Seed Locations & Visits
        locations_objects = []
        loc_names = ["Kempegowda Bus Stand", "MG Road Metro", "Koramangala 3rd Block", "Yeshwanthpur Toll", "Silk Board Junction", "Mysore Palace Plaza", "Mangalore Port Warehouse", "Dharwad Court Complex"]
        for idx, lname in enumerate(loc_names):
            location = Location(
                id=f"LOC-{idx+1:02d}",
                name=lname,
                lat=12.9716 + random.uniform(-0.1, 0.1),
                lng=77.5946 + random.uniform(-0.1, 0.1)
            )
            db.add(location)
            locations_objects.append(location)
            
        db.commit()
        
        for idx, o in enumerate(offenders_objects[:100]): # Seed visits for a subset of offenders
            for _ in range(random.randint(1, 3)):
                loc = random.choice(locations_objects)
                visit = Visit(
                    offender_id=o.id,
                    location_id=loc.id,
                    timestamp=datetime.utcnow() - timedelta(days=random.randint(1, 45), hours=random.randint(0, 23))
                )
                db.add(visit)
        db.commit()
        print("Calls, Locations, and Visits graph links seeded.")

        # Establish known associate connections for network analysis
        gang_count = 15
        for g in range(gang_count):
            gang_size = random.randint(5, 20)
            gang_members = random.sample(offenders_objects, gang_size)
            for m1 in gang_members:
                for m2 in gang_members:
                    if m1.id != m2.id and random.random() < 0.4:
                        if m2 not in m1.associates:
                            m1.associates.append(m2)
        
        db.commit()
        print("Criminal network associates linked.")
        
        # 6. Seed Entity Match Review queue
        reviews = [
            EntityMatchReview(offender1_id=offenders_objects[10].id, offender2_id=offenders_objects[110].id, confidence_score=0.88, status="Pending"),
            EntityMatchReview(offender1_id=offenders_objects[20].id, offender2_id=offenders_objects[120].id, confidence_score=0.91, status="Pending"),
            EntityMatchReview(offender1_id=offenders_objects[35].id, offender2_id=offenders_objects[235].id, confidence_score=0.74, status="Pending")
        ]
        for r in reviews:
            db.add(r)
        db.commit()
        print("Entity merge candidate reviews seeded.")

        # 7. Seed FIR Records
        fir_objects = []
        statuses = ["Investigation", "Charge Sheeted", "Closed"]
        victim_genders = ["Male", "Female"]
        
        start_date = datetime(2024, 1, 1)
        end_date = datetime(2026, 6, 15)
        delta_days = (end_date - start_date).days
        
        officer_usernames = ["sho", "constable", "officer"]

        for i in range(10500):
            fir_id = f"FIR-{2024 + random.randint(0,2)}-{i+1:05d}"
            station = random.choice(stations_objects)
            crime_type, ipc, severity = random.choice(CRIME_TYPES_IPC)
            
            days_offset = random.randint(0, delta_days)
            date_filed = start_date + timedelta(days=days_offset)
            
            jitter_lat = random.uniform(-0.04, 0.04)
            jitter_lng = random.uniform(-0.04, 0.04)
            
            accused_list = []
            if random.random() < 0.25:
                weighted_offenders = random.choices(
                    offenders_objects,
                    weights=[(o.num_prior_offenses + 1) for o in offenders_objects],
                    k=random.choices([1, 2, 3], weights=[80, 15, 5])[0]
                )
                accused_list = list(set(weighted_offenders))
                
            priority = random.choice(["Critical", "High", "Medium", "Low"])
            sla_days = {"Critical": 15, "High": 30, "Medium": 60, "Low": 90}[priority]
            sla_deadline = date_filed + timedelta(days=sla_days)

            # Assign timeline logs
            timeline_logs = [
                {"date": date_filed.isoformat(), "event": "FIR registered automatically in system Data Lake."},
                {"date": (date_filed + timedelta(hours=2)).isoformat(), "event": f"Case cataloged under {ipc}."}
            ]
            status = random.choices(statuses, weights=[50, 35, 15])[0]
            if status != "Investigation":
                timeline_logs.append({
                    "date": (date_filed + timedelta(days=random.randint(5, 12))).isoformat(),
                    "event": "Evidence collected: Suspect details mapped to database profiles."
                })
            if status == "Charge Sheeted":
                timeline_logs.append({
                    "date": (date_filed + timedelta(days=random.randint(15, 25))).isoformat(),
                    "event": "Chargesheet drafted and filed in District Court."
                })
            elif status == "Closed":
                timeline_logs.append({
                    "date": (date_filed + timedelta(days=random.randint(10, 20))).isoformat(),
                    "event": "Final report approved. Case closed by station head."
                })

            # Mock AI assistance fields
            summary = f"FIR registered on {date_filed.strftime('%Y-%m-%d')} regarding {crime_type} at {station.name}. Victim reported {ipc} violation. Preliminary assessment has been initiated."
            
            # Simulated evidence links
            linked_evidences = []
            if accused_list:
                prime = accused_list[0]
                linked_evidences.append({"type": "Primary Suspect", "id": prime.id, "reason": "Linked in complaints and FIR statements."})
                if random.random() < 0.6:
                    linked_evidences.append({"type": "Associate Phone Link", "id": f"+91-9844{random.randint(1,100):03d}", "reason": "Call log correlation detected 1hr prior to crime."})
                    
            leads = [
                f"Obtain CCTV feeds from near lat {station.lat:.4f}, lng {station.lng:.4f}.",
                "Cross reference accused associates list for vehicle ownership checks."
            ]

            fir = FIRRecord(
                id=fir_id,
                police_station_id=station.id,
                crime_type=crime_type,
                ipc_section=ipc,
                date_filed=date_filed,
                lat=station.lat + jitter_lat,
                lng=station.lng + jitter_lng,
                status=status,
                victim_age=random.randint(18, 70),
                victim_gender=random.choice(victim_genders),
                assigned_officer_id=random.choice(officer_usernames) if status == "Investigation" else None,
                priority=priority,
                sla_deadline=sla_deadline,
                summary=summary,
                leads=leads,
                evidence_correlations=linked_evidences,
                timeline=timeline_logs
            )
            
            for acc in accused_list:
                fir.accused.append(acc)
                
            db.add(fir)
            
        db.commit()
        print("10,500 FIR Records with timeline & SLA seeded.")
        
        # 8. Seed Socio-Economic Indicators (5 years per district)
        for _, d_model in districts_objects:
            base_gdp = random.randint(90000, 220000)
            base_poverty = random.uniform(8.0, 35.0)
            base_school = random.uniform(1.2, 5.0)
            base_hospital = random.uniform(0.5, 3.0)
            base_police = random.uniform(80.0, 200.0)
            
            for year in range(2022, 2027):
                trend = (year - 2022)
                indicator = SocioEconomicIndicator(
                    district_id=d_model.id,
                    year=year,
                    gdp_per_capita=base_gdp * (1 + 0.05 * trend),
                    poverty_rate=max(2.0, base_poverty - 0.8 * trend),
                    school_density=base_school + 0.1 * trend,
                    hospital_density=base_hospital + 0.05 * trend,
                    police_per_capita=base_police + 3.0 * trend
                )
                db.add(indicator)
                
        db.commit()
        print("Socio-economic indicators seeded.")

        # 9. Seed Audit Logs to demonstrate immutable logging
        audit_activities = [
            {"user": "admin", "role": "DGP", "action": "LOGIN", "details": "Successful login via Web Console."},
            {"user": "sp", "role": "SP", "action": "VIEW_OFFENDER_PROFILE", "details": "Viewed criminal profile for Ramesh Kumar (OFF-0011)"},
            {"user": "sho", "role": "SHO", "action": "EXPORT_REPORT", "details": "Exported Case SLA Statistics Report for Bengaluru District as CSV"},
            {"user": "admin", "role": "DGP", "action": "ENTITY_RESOLVE_MERGE", "details": "Merged profile Ramesh K. (OFF-0111) into Ramesh Kumar (OFF-0011)"},
            {"user": "sho", "role": "SHO", "action": "AI_COPILOT_QUERY", "details": "AI Chat: 'What are the main associate links for Gang 01?'"}
        ]
        for act in audit_activities:
            log = AuditLog(
                timestamp=datetime.utcnow() - timedelta(hours=random.randint(1, 48)),
                username=act["user"],
                role=act["role"],
                action=act["action"],
                details={"message": act["details"]},
                ip_address=f"10.25.{random.randint(10,99)}.{random.randint(1,250)}"
            )
            db.add(log)
        db.commit()
        print("Initial Audit Trail seeded.")

        # 10. Seed Missing Persons
        missing_names = ["Amit Gowda", "Kavitha Raj", "Chethan Kumar", "Sushma Hedge", "Nandini Reddy", "Vikram Sen", "Rupa Patel", "Srinivas Rao", "Ananya Bhat", "Aditya Sharma"]
        for idx in range(50):
            name = random.choice(missing_names) + f" {random.randint(1, 100)}"
            age = random.randint(5, 75)
            gender = random.choice(["Male", "Female"])
            last_seen_date = datetime(2024, 1, 1) + timedelta(days=random.randint(1, 800))
            last_seen_loc = random.choice(KARNATAKA_DISTRICTS)["name"]
            person = MissingPerson(
                id=f"MP-{idx+1:04d}",
                name=name,
                age=age,
                gender=gender,
                last_seen_date=last_seen_date,
                last_seen_location=last_seen_loc,
                photo_url=f"/assets/missing/photo_{idx+1}.jpg",
                status=random.choices(["Active", "Found"], weights=[80, 20])[0]
            )
            db.add(person)
        print("Missing persons seeded.")

        # 11. Seed Unidentified Bodies
        features_list = ["Tattoo of trident on left forearm", "Surgical scar on right knee", "Silver ring on index finger", "Black birthmark on neck", "Stature approx 175cm, wearing blue shirt", "Gold tooth on upper left jaw"]
        for idx in range(30):
            gender = random.choice(["Male", "Female", "Unknown"])
            found_date = datetime(2024, 1, 1) + timedelta(days=random.randint(1, 800))
            found_loc = random.choice(KARNATAKA_DISTRICTS)["name"]
            body = UnidentifiedBody(
                id=f"UB-{idx+1:04d}",
                estimated_age=random.randint(20, 60),
                gender=gender,
                found_date=found_date,
                found_location=found_loc,
                distinguishing_features=random.choice(features_list) + f" (Code: {idx*7})",
                status=random.choices(["Unidentified", "Identified"], weights=[85, 15])[0]
            )
            db.add(body)
        print("Unidentified bodies seeded.")

        # 12. Seed Telecom CDRs
        cdr_types = ["Incoming", "Outgoing", "SMS"]
        offender_phones = [p.phone_number for p in phones_objects]
        for idx in range(500):
            phone = random.choice(offender_phones) if (offender_phones and random.random() < 0.3) else f"+91-9844{random.randint(100000, 999999)}"
            associated = f"+91-9123{random.randint(100000, 999999)}"
            timestamp = datetime(2024, 1, 1) + timedelta(days=random.randint(1, 800), hours=random.randint(0, 23))
            cdr = TelecomCDR(
                phone_number=phone,
                imsi=f"IMSI-404-45-{random.randint(10000, 99999)}",
                imei=f"IMEI-3589{random.randint(100000, 999999)}",
                cell_tower_id=f"TOWER-{random.choice(KARNATAKA_DISTRICTS)['name'][:4].upper()}-{random.randint(1, 50)}",
                call_type=random.choice(cdr_types),
                associated_number=associated,
                duration_seconds=random.randint(10, 1200) if random.random() < 0.7 else 0,
                timestamp=timestamp
            )
            db.add(cdr)
        print("Telecom CDRs seeded.")

        # 13. Seed RBI Fraud Registry
        fraud_types = ["UPI Phishing", "Mule Account Transfer", "Investment Scam", "Digital Arrest Ransom", "Card Spoofing"]
        offender_accounts = [a.account_number for a in accounts_objects]
        for idx in range(100):
            account = random.choice(offender_accounts) if (offender_accounts and random.random() < 0.25) else f"SB-{random.randint(100000, 999999)}-{random.randint(1000, 9999)}"
            bank = random.choice(["State Bank of India", "HDFC Bank", "ICICI Bank", "Canara Bank", "Axis Bank"])
            flagged_date = datetime(2024, 1, 1) + timedelta(days=random.randint(1, 800))
            registry = RBIFraudRegistry(
                account_number=account,
                bank_name=bank,
                flagged_date=flagged_date,
                fraud_type=random.choice(fraud_types),
                reported_amount=float(random.randint(5000, 250000)),
                status=random.choices(["Flagged", "Frozen"], weights=[75, 25])[0]
            )
            db.add(registry)
        db.commit()
        print("RBI Fraud Registry seeded.")

        print("Data Seeding Completed Successfully!")
        
    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
