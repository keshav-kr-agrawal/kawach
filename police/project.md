# 🛡️ KAWACH: State-Wide Crime Intelligence Command Center

KAWACH is a production-grade, state-wide AI-driven crime analytics, network visualization, and case management command platform developed for law enforcement agencies (specifically modeled for the **Karnataka State Police**). 

The platform consolidates fragmented police registries, emergency logs, and offender records into a single, high-fidelity command console. It offers real-time analytics, entity resolution, GIS hotspot masking, communication network graphs, case SLA tracking, and an interactive NLP Copilot.

---

## 🏗️ System Architecture & Decoupled Stack

KAWACH is built on a modular, decoupled client-server architecture designed for high performance, security, and strict data containment.

```mermaid
graph TD
    subgraph Client [Frontend UI: React 19 & Vite]
        A[App.jsx Main Frame]
        A --> B1[Command Center Dashboard]
        A --> B2[Crime Map GIS]
        A --> B3[Network Analysis Graph]
        A --> B4[Criminal Profiles Registry]
        A --> B5[Alerts Hub]
        A --> B6[Investigations Kanban]
        A --> B7[AI Copilot Terminal]
        A --> B8[Reports Hub]
        A --> B9[Socio-Economic Analytics]
        A --> B10[Predictive Risk Modeler]
        A --> B11[Admin Duplicate Merge & Audits]
    end
    
    subgraph Server [Backend REST API: FastAPI & Python]
        C1[Auth & MFA Validator]
        C2[Dashboard Analytics API]
        C3[Geo DBSCAN Cluster Service]
        C4[Network Graph builder]
        C5[SLA Case & Assignment Router]
        C6[NLP Query Parser & Citation Generator]
        C7[Entity Resolution Merge Handler]
        C8[Immutable Audit Log Logger]
    end

    subgraph Storage [Database Engine: PostgreSQL]
        DB[(PostgreSQL Database)]
    end

    Client -- "HTTP/HTTPS + JWT Authorization Header" --> Server
    Server -- "SQLAlchemy ORM (Connection Pooling)" --> Storage
```

### Technical Specifications
1. **Frontend Core**: **React 19** compiled via **Vite** for optimized assets. Styled with clean, responsive **Vanilla CSS** and utility structures for full cross-device flexibility (desktops, tablets, mobile displays). Data visuals are rendered using **Recharts**, and visual vector iconography is supplied by **Lucide-React**.
2. **Backend Engine**: **FastAPI** running on a **Uvicorn** ASGI server. Features automated OpenAPI documentation, async endpoints, and dependency-injection for request tracking.
3. **Database Layer**: **PostgreSQL** with configured connection pools (size=10, max_overflow=20). SQLAlchemy serves as the Object-Relational Mapper (ORM) to execute structured, transaction-safe SQL.
4. **Machine Learning & Graph Services**:
   - **Scikit-Learn (DBSCAN)**: Applied for clustering geospatial coordinates in hotspot maps.
   - **NetworkX**: Utilized to process offender-asset relationships, trace communications, and establish nodes.
   - **Pandas**: Used in backend routes to build dynamic matrices and correlations.

---

## 📂 Project Directory Structure

```
kawach/
├── State_Crime_Intelligence_Masterplan (1).md   # Production-level platform specifications
├── plan.md                                      # Datathon execution plan and timeline
├── project.md                                   # This comprehensive guide
├── backend/                                     # FastAPI Backend Application
│   ├── requirements.txt                         # Python packages
│   └── app/
│       ├── __init__.py
│       ├── config.py                            # Env vars and JWT keys
│       ├── database.py                          # SessionMaker & engine setup
│       ├── main.py                              # FastAPI initialization & routers registry
│       ├── models.py                            # SQLAlchemy PostgreSQL database schemas
│       ├── schemas.py                           # Pydantic request & response validators
│       ├── auth.py                              # JWT encoding, decoding, & password hashers
│       ├── routes/                              # API Sub-routers
│       │   ├── __init__.py
│       │   ├── admin.py                         # Entity resolution & audit logs query
│       │   ├── ai.py                            # AI Copilot chatbot NLP routing
│       │   ├── alerts.py                        # Poisson distribution spike anomaly calculations
│       │   ├── analytics.py                     # Socio-economic correlation & predictive risk
│       │   ├── audit.py                         # Audit query retrieval endpoint
│       │   ├── auth.py                          # Login & token issue routes
│       │   ├── dashboard.py                     # Command Center metric queries
│       │   ├── geo.py                           # DBSCAN geospatial points & hotspot API
│       │   ├── investigations.py                # SLA cases, re-assignments, Kanban state
│       │   ├── network.py                       # Criminal associate & asset graph builders
│       │   ├── offenders.py                     # Offender profile search & priors registry
│       │   └── reports.py                       # Export logging and mockup files
│       └── scripts/
│           └── generate_data.py                 # High-fidelity data seeder (8,000 cases, 1,500 offenders)
└── frontend/                                    # React Frontend Application
    ├── package.json                             # NPM package manifests
    ├── vite.config.js                           # Vite bundler configurations
    └── src/
        ├── App.jsx                              # Shell layout, Login & multi-step MFA layers
        ├── App.css
        ├── index.css                            # Global theme & typography rules
        ├── main.jsx
        └── components/                          # UI View components
            ├── DashboardView.jsx                # Command Center Stats & Charts
            ├── GeoMapView.jsx                   # Hotspots, Jittering, and Sensitive site masks
            ├── NetworkView.jsx                  # Force-directed link analysis maps
            ├── OffendersView.jsx                # Criminal Profile registries
            ├── AlertsView.jsx                   # Spike anomalies and alert triggers
            ├── InvestigationsView.jsx           # Case details, Kanban, and SLA countdowns
            ├── AICopilotView.jsx                # NLP Terminal with references & citations
            ├── ReportsView.jsx                  # PDF/Excel Exports with Audit tracker
            ├── SocioEconomicView.jsx            # Crime vs Development indicator graphs
            ├── PredictiveView.jsx               # Predictive risk scoring and patrol planning
            └── AdminView.jsx                    # Entity duplicates review & Security Log viewer
```

---

## 🗄️ Database Schemas & Data Model Relationships

The PostgreSQL database houses 14 core tables, forming an offender-case-asset intelligence graph:

```
                  ┌──────────────┐             ┌─────────────────────────┐
                  │  Districts   │◄───────────┼│SocioEconomicIndicators │
                  └──────┬───────┘             └─────────────────────────┘
                         │ 1
                         │
                         │ M
                  ┌──────▼───────┐             ┌─────────────────────────┐
                  │PoliceStations│◄───────────┼│          Users          │
                  └──────┬───────┘             └─────────────────────────┘
                         │ 1
                         │
                         │ M
                  ┌──────▼───────┐             ┌─────────────────────────┐
                  │  FIRRecords  │◄───────────┼│        AuditLogs        │
                  └──────┬───────┘             └─────────────────────────┘
                         │ M
                         │
                         │ fir_accused (Junction)
                         │ M
                  ┌──────▼───────┐             ┌─────────────────────────┐
                  │  Offenders   │◄───────────┼│   EntityMatchReviews   │
                  └──────┬───────┘             └─────────────────────────┘
                         │ 1
      ┌──────────────────┼──────────────────┐
      │ M                │ M                │ M
┌─────▼─────┐      ┌─────▼─────┐      ┌─────▼─────┐
│ Vehicles  │      │  Phones   │      │ Accounts  │
└───────────┘      └─────┬─────┘      └───────────┘
                         │ 1
                         │
                         │ M
                   ┌─────▼─────┐
                   │   Calls   │
                   └───────────┘
```

### Table Definitions & Columns

1. **User (`users`)**:
   - `username` (VARCHAR, PK)
   - `hashed_password` (VARCHAR)
   - `role` (VARCHAR) - Roles: `DGP`, `SP`, `SHO`, `Constable`
   - `district_id` (INTEGER, FK -> `districts.id`)
   - `station_id` (VARCHAR, FK -> `police_stations.id`)
   - `mfa_secret` (VARCHAR)
   - `mfa_enabled` (BOOLEAN)

2. **AuditLog (`audit_logs`)**:
   - `id` (INTEGER, PK, Autoincrement)
   - `timestamp` (TIMESTAMP, default UTC)
   - `username` (VARCHAR)
   - `role` (VARCHAR)
   - `action` (VARCHAR) - Actions: `LOGIN`, `ENTITY_RESOLVE_MERGE`, `VIEW_OFFENDER_PROFILE`, `EXPORT_REPORT`, `AI_COPILOT_QUERY`
   - `details` (JSONB)
   - `ip_address` (VARCHAR)

3. **EntityMatchReview (`entity_match_reviews`)**:
   - `id` (INTEGER, PK, Autoincrement)
   - `offender1_id` (VARCHAR, FK -> `offenders.id`)
   - `offender2_id` (VARCHAR, FK -> `offenders.id`)
   - `confidence_score` (FLOAT)
   - `status` (VARCHAR) - States: `Pending`, `Merged`, `Rejected`
   - `created_at` (TIMESTAMP)
   - `reviewed_by` (VARCHAR)
   - `reviewed_at` (TIMESTAMP)

4. **District (`districts`)**:
   - `id` (INTEGER, PK)
   - `name` (VARCHAR, Unique)
   - `population` (INTEGER)
   - `area_sqkm` (FLOAT)
   - `literacy_rate` (FLOAT)
   - `unemployment_rate` (FLOAT)
   - `avg_income` (FLOAT)
   - `urbanization_pct` (FLOAT)

5. **PoliceStation (`police_stations`)**:
   - `id` (VARCHAR, PK)
   - `name` (VARCHAR)
   - `district_id` (INTEGER, FK -> `districts.id`)
   - `lat` (FLOAT)
   - `lng` (FLOAT)
   - `jurisdiction_area_sqkm` (FLOAT)
   - `officer_count` (INTEGER)

6. **Offender (`offenders`)**:
   - `id` (VARCHAR, PK)
   - `name` (VARCHAR)
   - `age` (INTEGER)
   - `gender` (VARCHAR)
   - `address` (VARCHAR)
   - `num_prior_offenses` (INTEGER)
   - `risk_score` (FLOAT)

7. **FIRRecord (`fir_records`)**:
   - `id` (VARCHAR, PK)
   - `police_station_id` (VARCHAR, FK -> `police_stations.id`)
   - `crime_type` (VARCHAR)
   - `ipc_section` (VARCHAR)
   - `date_filed` (TIMESTAMP)
   - `lat` (FLOAT)
   - `lng` (FLOAT)
   - `status` (VARCHAR) - States: `Investigation`, `Charge Sheeted`, `Closed`
   - `victim_age` (INTEGER)
   - `victim_gender` (VARCHAR)
   - `assigned_officer_id` (VARCHAR, FK -> `users.username`)
   - `priority` (VARCHAR) - Priority levels: `Low`, `Medium`, `High`, `Critical`
   - `sla_deadline` (TIMESTAMP)
   - `summary` (VARCHAR)
   - `leads` (JSONB)
   - `evidence_correlations` (JSONB)
   - `timeline` (JSONB)

8. **Vehicle (`vehicles`)**:
   - `plate_number` (VARCHAR, PK)
   - `make` (VARCHAR)
   - `model` (VARCHAR)
   - `owner_offender_id` (VARCHAR, FK -> `offenders.id`)

9. **Phone (`phones`)**:
   - `phone_number` (VARCHAR, PK)
   - `owner_offender_id` (VARCHAR, FK -> `offenders.id`)

10. **Account (`accounts`)**:
    - `account_number` (VARCHAR, PK)
    - `bank_name` (VARCHAR)
    - `owner_offender_id` (VARCHAR, FK -> `offenders.id`)

11. **Call (`calls`)**:
    - `id` (INTEGER, PK, Autoincrement)
    - `caller_phone` (VARCHAR, FK -> `phones.phone_number`)
    - `receiver_phone` (VARCHAR, FK -> `phones.phone_number`)
    - `timestamp` (TIMESTAMP)
    - `duration_seconds` (INTEGER)

12. **Location (`locations`)**:
    - `id` (VARCHAR, PK)
    - `name` (VARCHAR)
    - `lat` (FLOAT)
    - `lng` (FLOAT)

13. **Visit (`visits`)**:
    - `id` (INTEGER, PK, Autoincrement)
    - `offender_id` (VARCHAR, FK -> `offenders.id`)
    - `location_id` (VARCHAR, FK -> `locations.id`)
    - `timestamp` (TIMESTAMP)

14. **SocioEconomicIndicator (`socio_economic_indicators`)**:
    - `id` (INTEGER, PK, Autoincrement)
    - `district_id` (INTEGER, FK -> `districts.id`)
    - `year` (INTEGER)
    - `gdp_per_capita` (FLOAT)
    - `poverty_rate` (FLOAT)
    - `school_density` (FLOAT)
    - `hospital_density` (FLOAT)
    - `police_per_capita` (FLOAT)

### Junction Tables
- **`fir_accused`**: Maps relationships between `FIRRecord` and `Offender` (Many-to-Many).
- **`offender_associates`**: Maps self-referential relationships between `Offender` and known associates (Many-to-Many).
- **`offender_gang`**: Maps relationships between `Offender` and `Gang` (Many-to-Many).

---

## 🔒 Security, Governance & Ethical Guardrails

### 1. Role-Based Access Control (RBAC) Matrix
The platform restricts API data access and UI views at the backend database query layer.

| User Role | Navigation Access | Backend API Query Filters |
| :--- | :--- | :--- |
| **DGP** | Access to all 11 Views | Direct unrestricted query output. |
| **SP** | Access to all 11 Views | Results filtered to SP's assigned District ID: `WHERE district_id = :sp_district_id`. |
| **SHO** | Scopes: Command Center, Crime Map, Profiles, Alerts, Investigations, AI Copilot, Reports (7 Views total). Hides Admin, Network, Socio-Economic, Predictive Risk. | Results filtered to SHO's assigned Police Station ID: `WHERE police_station_id = :sho_station_id`. |
| **Constable** | Scopes: Command Center, Crime Map, Profiles, Alerts, Investigations, AI Copilot, Reports (7 Views total). Hides Admin, Network, Socio-Economic, Predictive Risk. | Scoped to assigned cases: `WHERE assigned_officer_id = :username`. |

### 2. Multi-Factor Authentication (MFA)
Authentication is a two-step process:
- **Step 1: Credentials Verification**: Validates the password hash against the stored database value. Returns a temporary token if valid.
- **Step 2: MFA Verification Code**: Prompts for a simulated 6-digit physical security token challenge. Demonstration passcode is **`123456`**.

### 3. Immutable Security Audit Trail
The `AuditLog` table records all sensitive system activities. Log entries cannot be deleted or updated:
- **Profile lookups**: Details of searched offender names or IDs.
- **Duplicate resolution actions**: Merged profiles (records source and destination IDs) or rejected match records.
- **Data export operations**: Generates a record of the exported report type, format (PDF/Excel), and username.
- **AI query logging**: Records natural language queries submitted to the copilot.

### 4. Non-Negotiable Compliance Guardrails
- **Biased Attributes Banned**: Personal markers (religion, caste, race, and community details) are completely excluded from the schema and code logic to prevent predictive profiling bias.
- **Human-in-the-Loop Decisions**: The system does not recommend arrests, determine guilt, or automate enforcement actions. AI outputs are advisory indicators (e.g., patrol route density, data compilation, and leads lists) requiring manual approval.

---

## 🖥️ Primary Workspace Views (11 Modules)

### 1. Command Center (Dashboard)
- Displays KPIs: **Total Cases**, **Active Investigations**, **Average Dispatch SLA Response Times**, and **Districts with High-Priority Workloads**.
- Renders crime trend charts (Month-over-Month) and crime type distributions using Recharts.
- Dynamically respects role boundaries: a Constable sees metrics for their assigned cases; an SHO sees metrics for their station; a DGP sees statewide metrics.

### 2. Crime Map (GIS Hotspots)
- Visualizes incident hotspots by running a backend DBSCAN clustering algorithm.
- Implements location precision controls via toggles:
  - `Exact`: Displays precise coordinates.
  - `Blurred`: Adds a random coordinate offset (300m - 1km jitter) to obscure the exact location.
  - `Masked`: Snaps all markers to the coordinates of the assigned police station.
- **Sensitive Site Obscuring**: Toggling the mask option checks coordinates against a database of sensitive locations (e.g., courts, religious sites, educational zones). If an incident is within 500m of a sensitive site, coordinates are automatically offset.

### 3. Network Analysis (Entity Linkages)
- Draws a relational node graph using **NetworkX** to link suspects, phone numbers, vehicles, bank accounts, visited locations, and gang affiliations.
- Maps call log histories and visited locations to identify co-occurrences and co-arrest networks.
- Limits graph size to 120 nodes to ensure optimal rendering performance.

### 4. Criminal Profiles Registry
- Index search interface for querying the offender database by ID or name.
- Displays offender profile details: age, known associates, registered assets, risk scores, and list of linked FIR cases.

### 5. Alerts Hub
- Runs a weekly Z-score calculation to detect crime spikes (comparing the past 30 days of data against the historical baseline).
- Highlighted spikes trigger alerts (e.g., *"64.2% spike in Cybercrime / Phishing cases"*).
- Includes buttons to simulate emergency broadcasts via SMS and email channels.

### 6. Investigations (Kanban Workspace)
- Groups cases into standard workflows: **Investigation**, **Charge Sheeted**, and **Closed**.
- Incorporates SLA timers: calculated from the filing date and priority status to track warning and breach states.
- Enables case reassignment to other officers, priority escalations, and status updates, logging all actions directly to the case timeline.

### 7. AI Copilot (NLP Search Terminal)
- Natural language query parser mapping regex rules to DB queries:
  - Searches for Case IDs (`FIR-\d{4}-\d+`) to output summaries, timelines, and investigative leads.
  - Searches for Offender profiles (`OFF-\d+` or names) to output asset records and associate lists.
  - Searches for License Plates (`KA-\d{2}-[A-Z]{2}-\d+`) to output registered vehicle details.
- Returns search responses with clickable source reference citations (e.g., `[OffenderProfile: OFF-0010]`).

### 8. Reports Hub
- Form for generating official briefing papers (Statewide Crime Summaries, Repeat Offender Watchlists) in PDF or Excel formats.
- Triggering an export records the action, username, and report parameters directly to the audit log.

### 9. Socio-Economic Correlation
- Graphs socio-economic metrics (literacy rate, poverty index, unemployment, police count) against crime rates.
- Displays calculated correlation matrices to identify positive and negative statistical alignments.

### 10. Predictive Risk Modeler
- Runs a linear weighted index model to estimate district-level risk scores.
- Risk scores are calculated using socio-economic indicators (e.g., high unemployment rate, high poverty rate, and low police density increase the risk score).
- Features dynamic patrol resource allocation suggestions based on calculated risk tiers (High, Medium, Low).

### 11. Administration Panel
- Accessible to SP and DGP roles:
  1. **Entity Resolution Workspace**: Compares pending duplicates flagged in `EntityMatchReview` side-by-side with similarity scores. Users can approve a profile merge or reject the suggestion.
  2. **Security Audit Log Explorer**: Search interface for querying system audit trails.

---

## ⚙️ Under-the-Hood Working & Code Logic

### 1. Authenticated User Session & Role Filters
When a user logs in, FastAPI generates a JWT token containing their claims:
```python
claims = {
    "sub": user.username,
    "role": user.role,
    "district_id": user.district_id,
    "station_id": user.station_id,
    "exp": datetime.utcnow() + timedelta(minutes=60)
}
```
For subsequent API calls, the claims payload is parsed, and role boundary filters are applied directly to the SQLAlchemy queries:
```python
def apply_role_filters(query, claims):
    role = claims.get("role")
    if role == "SP":
        return query.join(PoliceStation).filter(PoliceStation.district_id == claims.get("district_id"))
    elif role == "SHO":
        return query.filter(FIRRecord.police_station_id == claims.get("station_id"))
    elif role == "Constable":
        return query.filter(FIRRecord.assigned_officer_id == claims.get("username"))
    return query  # DGP sees all
```

### 2. DBSCAN Clustering for Geospatial Hotspots
The backend clusters geographic points using DBSCAN with a Haversine metric:
```python
# Convert coordinates to radians
coords = np.array([[r.lat, r.lng] for r in records])
coords_rad = np.radians(coords)

# 6371.0 km is the Earth's radius
epsilon = eps_km / 6371.0
dbscan = DBSCAN(eps=epsilon, min_samples=min_samples, metric='haversine')
labels = dbscan.fit_predict(coords_rad)
```
For each cluster centroid, the algorithm calculates distances to compile coordinates, identify the dominant crime type, and output the cluster radius.

### 3. Precision Coordinate Jittering & Site Masking
The GIS map applies coordinate jittering based on user permission level and selection:
```python
# Location precision controls
if precision == "blurred":
    # Introduce ~300m - 1km jitter (0.003 to 0.009 degrees offset)
    lat += random.uniform(-0.006, 0.006)
    lng += random.uniform(-0.006, 0.006)
elif precision == "masked":
    # Snap coordinates directly to the police station
    lat, lng = r.station.lat, r.station.lng

# Sensitive Site Masking
if mask_sensitive:
    for loc in sensitive_locs:
        # Distance calculation (1 degree = ~111km)
        dist = np.sqrt((lat - loc.lat)**2 + (lng - loc.lng)**2)
        if dist < 0.0045:  # Incident within ~500m of a sensitive site
            lat += random.uniform(-0.02, 0.02)  # Introduce offset
            lng += random.uniform(-0.02, 0.02)
            break
```

### 4. Entity Resolution Profile Merge Transaction
Merging duplicate offender profiles (`offender2` into `offender1`) executes in a single database transaction:
1. Records a merge log in `AuditLog` (action: `ENTITY_RESOLVE_MERGE`).
2. Transfers all associated FIR relationships:
   ```python
   for fir in o2.firs:
       if fir not in o1.firs:
           o1.firs.append(fir)
   ```
3. Transfers associates:
   ```python
   for assoc in o2.associates:
       if assoc not in o1.associates and assoc.id != o1.id:
           o1.associates.append(assoc)
   ```
4. Updates asset tables to point to the new owner ID:
   - Updates `Vehicle` table (`owner_offender_id` = `o1.id`).
   - Updates `Phone` table (`owner_offender_id` = `o1.id`).
   - Updates `Account` table (`owner_offender_id` = `o1.id`).
5. Recalculates risk indicators:
   ```python
   o1.num_prior_offenses += o2.num_prior_offenses
   o1.risk_score = min(100.0, max(o1.risk_score, o2.risk_score) + 5.0)
   ```
6. Deletes the duplicate record (`o2`) and updates the review status to `Merged`.
7. Commits the transaction to the database.

### 5. SLA Trackers
Cases calculate remaining SLA days relative to the target deadline:
```python
days_left = (record.sla_deadline - datetime.utcnow()).days
```
Cases with less than 7 days remaining display a **`Warning`** status in the UI. If the deadline has passed, the status updates to **`Breached`**.

---

## 🚀 Setup & Execution Guide

### Prerequisite Dependencies
- **PostgreSQL Database** running locally or via Docker
- **Python 3.10+** (venv capability)
- **Node.js 18+** with npm

### 1. Database Configuration
By default, the backend connects to `postgresql://keshav@localhost:5439/kawach`. You can override this location by setting the `DATABASE_URL` environment variable:
```bash
export DATABASE_URL="postgresql://username:password@localhost:5432/databasename"
```

### 2. Initialize Database & Seed High-Fidelity Data
Run the seeder script to build the schema, generate 31 districts, seed police stations, create user credentials, configure 9 gangs, register 1,500 offenders, log asset data, and seed 8,000 cases with timelines:
```bash
# From the project root directory
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run the database seeder
PYTHONPATH=. python app/scripts/generate_data.py
```

### 3. Start the Backend API Server
Start the Uvicorn ASGI server:
```bash
# Run from the backend/ directory with the active virtual environment
PYTHONPATH=. uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
API endpoints are documented and interactive via Swagger UI at: `http://localhost:8000/docs`

### 4. Start the Frontend React Client
Compile and launch the development web server:
```bash
# Open a new terminal tab, navigate to the frontend/ directory
cd frontend
npm install
npm run dev
```
Open **`http://localhost:5173/`** in your browser.

### 5. Access Credentials for Demonstration (MFA Code: `123456`)
You can log in using any of the following pre-seeded test accounts:

| Username | Password | Access Level Scope |
| :--- | :--- | :--- |
| **`dgp`** | `dgp123` | Statewide Access (DGP) |
| **`sp`** | `sp123` | District Access (SP) |
| **`sho`** | `sho123` | Station Access (SHO) |
| **`constable`** | `constable123` | Assigned Cases Access (Constable) |
| **`admin`** | `admin123` | Backup Administrator (DGP) |
| **`district`** | `district123` | Backup District Inspector (SP) |
| **`officer`** | `officer123` | Backup Station Head (SHO) |

---
*KAWACH is fully compliant with the Digital Personal Data Protection (DPDP) Act.*
