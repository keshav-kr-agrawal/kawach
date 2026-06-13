# 🛡️ KAWACH — KSP Datathon 2026: Master Execution Plan

> **Challenge 02: AI-Driven Crime Analytics & Visualization Platform**
>
> *Karnataka State Police × Hack2Skill*

---

## 📋 Problem Statement

> Current systems rely on siloed data and manual reporting, limiting advanced analytics and proactive policing capabilities.

**The Challenge:** Develop a modern AI-powered analytics platform to transform fragmented records into actionable intelligence.

### Required Deliverables

| # | Deliverable | Category |
|---|---|---|
| 1 | Interactive dashboards | Visualization |
| 2 | Geospatial maps | Visualization |
| 3 | Crime hotspot detection | Analytics |
| 4 | District-level drilldowns | Visualization |
| 5 | Trend alerts & anomaly detection | AI/ML |
| 6 | Network & link analysis of criminals | AI/ML + Visualization |
| 7 | Repeat offender tracking | Analytics |
| 8 | Socio-economic crime correlation | Analytics |
| 9 | Predictive risk scoring | AI/ML |
| 10 | AI/ML-based pattern detection | AI/ML |

---

## 📅 Datathon Details & Timeline

* **Organizer:** Karnataka State Police (KSP)
* **Venue:** Bengaluru, Karnataka, India (In-Person Demo Day)
* **Team Size:** 2–5 members
* **Registration Fee:** Free
* **Last Date to Register:** Sunday, 19 Jul 2026
* **Total Prize Pool:** **₹10 Lakhs** across both challenges

| Milestone / Event | Date(s) | Details |
|---|---|---|
| Registrations Open | 22 May – 26 Jul 2026 | Register before Jul 19 |
| Problem Statement Explainer | 05 Jun 2026 | 4:00 – 5:00 PM IST |
| Workshop 1: Zoho Catalyst | 11 Jun 2026 | Technical platform workshop |
| AMA Session | 18 Jun 2026 | Q&A with organizers |
| Initial Shortlist | 19 Aug 2026 | Prototype round results |
| Prototype Refinement | 19 – 30 Aug 2026 | Iterate on feedback |
| Induction Session | 20 Aug 2026 | Shortlisted teams onboarding |
| Mentor-Mentee Connects | 20 – 28 Aug 2026 | Feedback sessions with KSP |
| Final Shortlist | 09 Sep 2026 | Finalists for Demo Day |
| Grand Finale (Demo Day) | 26 Sep 2026 | In-person in Bengaluru |

---

## 🏗️ System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REACT FRONTEND                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │Dashboard │ │ GeoMap   │ │ Network  │ │ Drilldown │  │
│  │ Module   │ │ Module   │ │ Graph    │ │ Module    │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬──────┘  │
│       └─────────────┴────────────┴─────────────┘        │
│                         │  REST / WebSocket              │
└─────────────────────────┼───────────────────────────────┘
                          │
┌─────────────────────────┼───────────────────────────────┐
│               PYTHON FASTAPI BACKEND                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │ Auth &   │ │ Analytics│ │ ML       │ │ Export    │  │
│  │ RBAC     │ │ Engine   │ │ Pipeline │ │ Service   │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬──────┘  │
│       └─────────────┴────────────┴─────────────┘        │
│                         │                                │
│              ┌──────────┴──────────┐                    │
│              │  PostgreSQL + PostGIS │                    │
│              └─────────────────────┘                    │
└─────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology | Justification |
|---|---|---|
| **Frontend** | React 18 + Tailwind CSS + Recharts + Deck.gl + react-force-graph-3d | Recharts for charts, Deck.gl for WebGL geo maps, react-force-graph for 3D network |
| **Animations** | GSAP + Framer Motion | Premium "Antigravity" transitions |
| **Backend** | Python FastAPI + SQLAlchemy | Unified Python stack, auto-docs, async |
| **Database** | PostgreSQL 16 + PostGIS | Spatial queries, JSONB for FIR metadata |
| **ML/AI** | scikit-learn, PyTorch Geometric, Prophet | Classification, graph networks, time-series |
| **Auth** | JWT tokens + role middleware | RBAC for officer/admin/chief roles |
| **Export** | WeasyPrint (HTML-to-PDF) | Automated briefing reports |
| **Deployment** | Docker Compose | One-command startup for Demo Day |

---

## 📊 Data Strategy

### Synthetic Datasets (Simulating SCRB Data)

| Dataset | Description | Key Columns | Volume |
|---|---|---|---|
| **FIR Records** | First Information Reports | `fir_id`, `station_id`, `district`, `crime_type`, `ipc_section`, `date_filed`, `lat`, `lng`, `status`, `accused_ids[]`, `victim_age`, `victim_gender` | ~500K rows |
| **Offender Registry** | Individuals involved in crimes | `offender_id`, `name`, `age`, `gender`, `address`, `known_associates[]`, `num_prior_offenses`, `risk_score` | ~80K rows |
| **Police Stations** | All KSP stations with geolocation | `station_id`, `name`, `district`, `lat`, `lng`, `jurisdiction_area_sqkm`, `officer_count` | ~1,200 rows |
| **Districts** | Karnataka administrative boundaries | `district_id`, `name`, `population`, `area_sqkm`, `literacy_rate`, `unemployment_rate`, `avg_income` | 31 rows |
| **Crime Categories** | IPC section mapping | `ipc_section`, `crime_category`, `severity_level` | ~100 rows |
| **Socio-Economic** | Per-district development data | `district_id`, `year`, `gdp_per_capita`, `poverty_rate`, `school_density`, `police_per_capita` | 31 × 5 years |

### Data Relationships

```
Districts ──1:M──▶ Police Stations ──1:M──▶ FIR Records
                                              │
                                              ├── M:M ──▶ Offenders (via junction)
Districts ──1:M──▶ Socio-Economic Indicators
Offenders ──M:M──▶ Offenders (known_associates = self-referencing graph)
```

### Data Generation Notes
- Use `Faker` + `numpy` + real Karnataka district/station names from public sources
- Crime distributions modeled on realistic urban/rural patterns
- 5–10% of offenders linked to 3+ FIRs (repeat offender clusters)
- Geographic hotspots via Gaussian blobs on Bengaluru, Mysuru, Hubli-Dharwad, Mangaluru

---

## 🧩 Module-by-Module Breakdown

### Module 1: Interactive Dashboard (Home Screen)
**→ Deliverable #1**

| Component | Description |
|---|---|
| KPI Cards (top row) | Total FIRs, Active Cases, Conviction Rate, Top Crime Category |
| Crime Trend Chart | Month-over-month FIR count (12–24 months) |
| Category Donut | Crime type distribution (theft, assault, cybercrime…) |
| Top 5 Districts Bar | Ranked by crime density (FIRs per 100K population) |
| Alert Ticker | Scrolling feed of auto-generated anomaly alerts |

**API:** `GET /api/dashboard/summary`

---

### Module 2: Geospatial Crime Map
**→ Deliverable #2**

| Component | Description |
|---|---|
| Base Map | Karnataka outline with district boundary polygons (GeoJSON) |
| Hex-Bin Heatmap | Crime density via Deck.gl `HexagonLayer` |
| Point Clusters | Individual FIRs, clustering on zoom-out |
| Timeline Scrubber | Slider to animate data across months/years |
| Filter Panel | Crime type, date range, severity, district |

**API:** `GET /api/geo/hexbins?crime_type=&date_from=&date_to=`

**Tech Notes:** PostGIS `ST_Within` / `ST_DWithin` for spatial queries. Deck.gl handles 100K+ points via WebGL.

---

### Module 3: Crime Hotspot Detection
**→ Deliverable #3**

| Aspect | Detail |
|---|---|
| Algorithm | DBSCAN on FIR lat/lng coordinates |
| Enhancement | Kernel Density Estimation (KDE) for smooth probability surfaces |
| Output | Ranked hotspot zones: centroid, radius, crime count, dominant type, heat score |
| UI | Pulsating red/orange polygons on map. Click → detail panel with FIR list, temporal trend, nearby station capacity |

**API:** `GET /api/geo/hotspots?min_cluster_size=10&eps_km=2`

---

### Module 4: District-Level Drilldowns
**→ Deliverable #4**

Click any district on the map or pick from a dropdown → deep-dive view:
- District Profile Card (population, area, literacy, police ratio)
- District Crime Breakdown (bar chart by category)
- Station-Level Table (ranked by FIR volume, clearance rate)
- Year-over-Year Comparison
- Socio-Economic Overlay (crime vs. poverty, unemployment side-by-side)

**API:** `GET /api/districts/{district_id}/analytics`

---

### Module 5: Trend Alerts & Anomaly Detection
**→ Deliverable #5**

| Method | Description |
|---|---|
| Isolation Forest | Establish "normal" baselines per district per crime type; flag >2σ deviations |
| Z-Score Spike Detection | Weekly FIR count vs. rolling 12-week mean |
| Emerging Patterns | Crime types with 3+ consecutive months of growth |

**Alert Format:**
```json
{
  "alert_id": "ALT-2026-0042",
  "type": "SPIKE",
  "district": "Bengaluru Urban",
  "crime_type": "Cybercrime",
  "message": "67% increase vs. 12-week average",
  "severity": "HIGH"
}
```

**UI:** Dedicated "Alerts" page with severity colors (🔴 Critical, 🟠 High, 🟡 Medium). Also feeds dashboard ticker.

---

### Module 6: Network & Link Analysis ⭐ *Crown Jewel*
**→ Deliverable #6**

**Graph Construction:**
- **Nodes** = Offenders
- **Edges** = Co-accused in same FIR, or listed as known associates
- **Edge weight** = Number of shared FIRs

**Graph Analytics (NetworkX / PyTorch Geometric):**
- **Community Detection:** Louvain algorithm → identify syndicates/gangs
- **Centrality:** Betweenness centrality → find "broker" criminals
- **PageRank:** Most "influential" offenders in the network
- **Link Prediction (stretch):** GNN to predict likely hidden connections

**UI (react-force-graph-3d):**
- 3D force-directed graph, nodes sized by offense count, colored by community
- Click node → offender profile, linked FIRs, risk score
- Click edge → specific connecting FIRs
- Toggle 2D/3D view

**API:** `GET /api/network/graph?district=&min_connections=2`

---

### Module 7: Repeat Offender Tracking
**→ Deliverable #7**

| Tier | FIR Count | Classification |
|---|---|---|
| Watch | 2–3 FIRs | Low concern |
| Concern | 4–6 FIRs | Monitor actively |
| High Risk | 7+ FIRs | Priority surveillance |

**UI:** Sortable/searchable DataGrid with expandable rows showing FIR timeline. "Flag for Surveillance" action button. Residence heatmap on geo map.

---

### Module 8: Socio-Economic Crime Correlation
**→ Deliverable #8**

| Analysis | Method |
|---|---|
| Correlation Matrix | Pearson correlation: crime rates vs. poverty, unemployment, literacy, urbanization, police density |
| Scatter Plots | Interactive (X = socio factor, Y = crime rate, bubble = population) with regression trendlines |
| PCA | Which socio-economic factors explain the most variance in crime rates |
| Insight Cards | Auto-generated: "Districts with unemployment >15% show 2.3× higher property crime" |

---

### Module 9: Predictive Risk Scoring
**→ Deliverable #9**

| Aspect | Detail |
|---|---|
| Model | XGBoost classifier |
| Target | Will district experience >20% crime spike next month? (Low/Medium/High) |
| Features | Historical crime lags, seasonal indicators, socio-economic factors, police density, trend direction |
| Output | Risk score (0–100) per district, updated weekly |
| Explainability | SHAP values showing feature importance |

**UI:** Risk overlay on geo map (green → red). "Predictive Analytics" page with SHAP charts and accuracy tracker.

---

### Module 10: AI/ML-Based Pattern Detection
**→ Deliverable #10**

Umbrella capability tying Modules 5, 6, 8, 9 together. Additional:
- **Temporal Patterns:** "Robberies in District X peak 10 PM–2 AM on weekends"
- **MO Clustering:** TF-IDF + K-Means on FIR descriptions to detect serial offenders
- **Festival Correlation:** Crime spikes during Dasara, New Year, etc.
- **Geographic Drift:** How a crime type migrates across districts over time

**UI:** "Pattern Intelligence" page with auto-generated insight cards + confidence scores.

---

## 🔐 Authentication & RBAC

| Role | Access Level |
|---|---|
| **Field Officer** | Own station data, basic dashboards, no network analysis |
| **District Head** | Full district data, all analytics, can flag offenders |
| **State Admin / Chief** | Statewide view, all modules, predictive analytics, export briefings |

Login screen with role selector for demo. JWT-based auth middleware on all API routes.

---

## 📤 Export & Reporting

- **PDF Briefing:** From any page → "Export Briefing" → generates PDF with current dashboard state, key metrics, anomaly alerts, KSP branding header
- **CSV/Excel Export:** For data tables (FIR lists, offender lists, station stats)
- **Tech:** WeasyPrint (HTML-to-PDF) — simpler than LaTeX, equally polished for a hackathon

---

## 🗂️ API Endpoint Plan

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Login, returns JWT |
| `GET` | `/api/dashboard/summary` | Aggregated KPI stats |
| `GET` | `/api/dashboard/trend` | Monthly crime trend |
| `GET` | `/api/geo/points` | FIR lat/lng for maps |
| `GET` | `/api/geo/hexbins` | Hex-bin aggregated data |
| `GET` | `/api/geo/hotspots` | DBSCAN hotspot clusters |
| `GET` | `/api/districts` | All districts + basic stats |
| `GET` | `/api/districts/{id}/analytics` | Full district drilldown |
| `GET` | `/api/network/graph` | Node/link data for force graph |
| `GET` | `/api/network/communities` | Detected syndicates |
| `GET` | `/api/offenders/repeat` | Repeat offender list |
| `GET` | `/api/offenders/{id}` | Offender profile + FIRs |
| `GET` | `/api/analytics/correlation` | Socio-economic correlation matrix |
| `GET` | `/api/analytics/predict` | District risk scores |
| `GET` | `/api/analytics/patterns` | Detected patterns + insights |
| `GET` | `/api/alerts` | Active anomaly alerts |
| `POST` | `/api/export/pdf` | Generate PDF briefing |

---

## 🗓️ Sprint Plan

### Sprint 1: Foundation (Jun 14 – Jun 28)
- [ ] Generate synthetic datasets (Python script)
- [ ] Set up PostgreSQL + PostGIS schema
- [ ] Seed database with generated data
- [ ] Set up FastAPI project skeleton with auth
- [ ] Set up React project with Tailwind, routing, sidebar layout
- [ ] Build Dashboard page (KPI cards + basic charts)

### Sprint 2: Core Visualization (Jun 29 – Jul 13)
- [ ] Implement Geospatial Map (Deck.gl + district GeoJSON)
- [ ] Build Timeline Scrubber component
- [ ] Implement District Drilldown page
- [ ] Build filter panel (crime type, date range)
- [ ] Implement hotspot detection API (DBSCAN)

### Sprint 3: Intelligence Layer (Jul 14 – Jul 26) → **Prototype Submission**
- [ ] Build Network Graph (react-force-graph-3d)
- [ ] Implement community detection (Louvain)
- [ ] Build Repeat Offender tracking page
- [ ] Implement anomaly detection (Isolation Forest / Z-score)
- [ ] Build Alerts page
- [ ] **Submit prototype**

### Sprint 4: Advanced Analytics (Aug 1 – Aug 19)
- [ ] Build Socio-Economic Correlation module
- [ ] Train predictive risk scoring model (XGBoost)
- [ ] Implement SHAP explainability
- [ ] Build Pattern Intelligence page
- [ ] Implement PDF export

### Sprint 5: Polish & Demo Prep (Aug 20 – Sep 26)
- [ ] Refine UI animations (GSAP stagger, Framer Motion transitions)
- [ ] Responsive design pass
- [ ] Performance optimization (lazy loading, virtualized tables)
- [ ] Docker Compose setup for one-command demo
- [ ] Prepare pitch deck and demo script
- [ ] Rehearse live demo
- [ ] Edge case testing and bug fixes

---

## 🎤 Demo Day Pitch Flow (8–10 minutes)

1. **Hook (30s):** "Karnataka has 1,100+ police stations generating thousands of FIRs daily. This data sits in silos. We built **KAWACH** — a unified command center that turns fragmented records into predictive intelligence."
2. **Dashboard (1.5m):** Show home dashboard, real-time KPIs.
3. **Geo Map (2m):** Zoom into Bengaluru, hex-bin heatmap, scrub timeline, click hotspot → detail panel.
4. **Network Analysis (2m):** ⭐ **Wow moment.** Show 3D force graph. Rotate. Click high-centrality node. Auto-detected syndicate.
5. **Predictive Intelligence (1.5m):** Risk map, SHAP feature importance, auto-generated alert.
6. **Export (30s):** One-click PDF briefing.
7. **Architecture (30s):** Flash architecture diagram.
8. **Close (30s):** "KAWACH doesn't just report crime — it predicts it. Ready for statewide deployment."

### Judge-Impressing Details
- **Real Karnataka geography** (district names, station coordinates) — feels production-ready
- **Dark mode UI with fluid animations** — signals engineering maturity
- **3D network graph** — visual differentiator no other team will have
- **Explainable AI (SHAP)** — judges love ML transparency for government
- **One-command Docker startup** — proves deployment readiness

---

## 🎨 The "Antigravity" UI Directive

> **Design Directive:** "The interface must utilize an 'Antigravity' design language. Standard DOM elements should feel untethered but highly responsive. Use Framer Motion for layout persistence during state changes—when a user clicks a crime hotspot, the map should fluidly shrink and dock to the side while the 3D network topology expands from the center, connected by a seamless spatial transition. Data cards should enter the viewport utilizing GSAP's `stagger` and `ease: 'expo.out'`, giving a sense of weightless assembly. Colors must remain strictly minimalist—deep dark mode with high-contrast, neon-muted accents (lavender/gold) strictly reserved for interactive or critical threat nodes."

---

## 📞 Support & Contacts
* **Datathon Support:** datathon2026support@hack2skill.com
* **Business Inquiries:** info@hack2skill.com
* **Helpline:** +91 9870330830
* **Hack2Skill (Bengaluru):** WeWork Galaxy, 43, Residency Rd, Ashok Nagar, Bengaluru 560025