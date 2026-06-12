# 🚔 Karnataka State Police (KSP) Datathon 2026: Master Strategy & Execution Plan

This document contains the official master execution plan, architecture, timeline, and team distribution for **Team Codekrafters** to compete in and dominate **Datathon 2026**.

---

## 📅 Initiative Overview & Timeline

### 🏆 Datathon Details
* **Organizer:** Karnataka State Police (KSP)
* **Venue:** Bengaluru, Karnataka, India (In-Person Demo Day)
* **Team Size:** 2–5 members (Syndicate expanded for development)
* **Registration Fee:** Free
* **Last Date to Register:** Sunday, 19 Jul 2026
* **Total Prize Pool:** **₹10 Lakhs** across both challenges:
  * **Winner:** ₹2.5 L per challenge
  * **1st Runner-Up:** ₹1.5 L per challenge
  * **2nd Runner-Up:** ₹1.0 L per challenge

### ⏰ Official Timeline
| Milestone / Event | Start Date | End Date | Details |
|---|---|---|---|
| **Registrations Open** | 22 May 2026 | 26 Jul 2026 | Register team before July 19 deadline |
| **Problem Statement Explainer** | 05 Jun 2026 | 05 Jun 2026 | 4:00 PM – 5:00 PM IST |
| **Workshop 1: Intro to Zoho Catalyst** | 11 Jun 2026 | 11 Jun 2026 | Technical platform workshop |
| **AMA Session** | 18 Jun 2026 | 18 Jun 2026 | Q&A with organizers |
| **Initial Shortlist Announcement** | 19 Aug 2026 | 19 Aug 2026 | Announcement of prototype round winners |
| **Prototype Refinement** | 19 Aug 2026 | 30 Aug 2026 | Enhance prototype based on feedback |
| **Induction Session** | 20 Aug 2026 | 20 Aug 2026 | Onboarding for shortlisted teams |
| **Mentor-Mentee Connects** | 20 Aug 2026 | 28 Aug 2026 | Feedback sessions with KSP officers |
| **Final Shortlist Announcement** | 09 Sep 2026 | 09 Sep 2026 | Finalists selected for Demo Day |
| **Grand Finale (In-Person Demo Day)** | 26 Sep 2026 | 26 Sep 2026 | Pitching live in Bengaluru |

---

## 🎯 The Challenges

### Challenge 01: Intelligent Conversational AI for KSP Crime Database
* **Problem Statement:** The State Crime Records Bureau (SCRB) manages a massive and growing repository of crime-related data from 1,100+ police stations across Karnataka. Current systems rely on static dashboards and manual queries, limiting real-time investigation and analysis.
* **The Goal:** Build an intelligent conversational AI platform enabling investigators to query crime data using natural language and uncover patterns, relationships, and predictive insights.
* **Key Features:**
  * Bilingual Chatbot (English + Kannada)
  * Voice-enabled interaction & context-aware memory
  * PDF export of conversation histories
  * Criminal network visualization & hotspot maps
  * Predictive analytics & Explainable AI (XAI) audit trails
  * Role-based secure access control

### Challenge 02: AI-Driven Crime Analytics & Visualization Platform *(Selected Track)*
* **Problem Statement:** Fragmented records and siloed databases restrict proactive policing and limit advanced geographic and relationship analysis.
* **The Goal:** Develop a modern AI-powered analytics platform to transform raw logs into actionable law enforcement intelligence.
* **Key Capabilities:**
  * Interactive dashboards & WebGL Geospatial maps (Hex-Bin style)
  * Crime hotspot detection & district-level drilldowns
  * Anomaly detection & predictive risk scoring
  * Criminal link/network analysis & repeat offender tracking
  * Correlation of crime trends with socio-economic factors

---

## 🚀 The Winning Strategy: Unified Command Center
> [!IMPORTANT]
> **To secure an absolute victory, winning is mandatory.** We will not build two separate, basic submissions. Instead, we will submit under **Challenge 02** but integrate the natural language capabilities of **Challenge 01** as the master interface. This creates a unified, FOMO-inducing B2B-grade command center that completely overshadows standard dashboards.

### Key Architectural Pillars

```
                     ┌───────────────────────────────────────┐
                     │     UNIFIED COMMAND CENTER FRONTEND   │
                     │  (React + Tailwind + GSAP + Three.js) │
                     └───────────────────┬───────────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
   ┌───────────────────────────┐                   ┌───────────────────────────┐
   │    INTELLIGENCE ENGINE    │                   │    ENTERPRISE BACKBONE    │
   │  (Python RAG, GNNs, XAI)  │                   │ (Java Spring Boot, PG)    │
   └───────────────────────────┘                   └───────────────────────────┘
```

#### 1. The Enterprise Backbone (Backend & Security)
* **Technologies:** Java (Spring Boot), Hibernate, PostgreSQL + PostGIS (for spatial coordinates).
* **Core Requirements:**
  * **Role-Based Access Control (RBAC):** Field officers at local police stations (e.g., Cyber Economic & Narcotics station) get local access, while Central Crime Branch (CCB) executives unlock statewide dashboards.
  * **Audit Trails:** Immutable, timestamped logging of every single user query and database pull to meet government compliance rules.

#### 2. The Intelligence Engine (AI/ML Pipeline)
* **Technologies:** Python, scikit-learn, PyTorch (Graph Neural Networks), LangChain.
* **Core Requirements:**
  * **Predictive Risk Scoring:** Train anomaly models to detect repeat offenders and identify rising hotspots.
  * **Link Analysis:** GNNs to map network linkages between suspects.
  * **NLP/RAG Interface:** A context-aware chatbot parsing English and Kannada queries, dynamically updating the frontend dashboard based on voice/text instructions.

#### 3. The Visual Masterpiece (Frontend & "Antigravity" UX)
* **Technologies:** React, Tailwind CSS, GSAP, Framer Motion, Three.js.
* **Core Requirements:**
  * **WebGL Mapping:** Hex-bin maps showing crime concentration with a timeline scrubber to play back trends.
  * **3D Syndicate Visualizer:** Interactive 3D topologies built with Three.js allowing investigators to rotate, zoom, and drill down into syndicate node connections.
  * **Aesthetic:** Minimalist luxury obsidian dark theme (`#0A0A0C`) with high-contrast, professional accents (gold/lavender) for threat alerts to prevent eye strain.

#### 4. The Unfair Advantage (Automated Briefings)
* **Technologies:** LaTeX compilation via Python.
* **Core Requirements:** An "Export Threat Brief" function. Clicking it auto-generates a perfectly typeset, academic-grade LaTeX PDF containing current map snapshots, 3D network diagrams, law citations, and predictive scores, styled to immediately present to senior chiefs.

---

## 🗺️ Physical Deployments & Operational Context
Our platform is designed with the operational reality of the Karnataka State Police infrastructure in mind:
* **WeWork Galaxy (Bengaluru):** Operational base for development, setting the clean, startup-like velocity of the tool.
* **KSP CID Recruitment Office:** Aligning tools to screen/match investigators based on skills to specific crime anomalies.
* **KSP Housing Corporation:** Feeding spatial building/asset coordinates into the infrastructure mapping layers.
* **Police Chief Office (Karnataka):** Providing high-level executive macro-dashboards for strategic decisions.
* **Karnataka State Reserve Police (KSRP):** Deploying real-time, low-latency mobile alert feeds for tactical response units.

---

## 👥 Team Roles & Responsibilities

| Sub-team | Members | Core Responsibilities |
|---|---|---|
| **Backend & Database** |  | Spin up Spring Boot services, design Hibernate entity-relationships for the SCRB data, optimize APIs for <50ms response times. |
| **AI/ML & NLP Engine** | | Build PyTorch predictive models, construct GNNs for syndicate link analysis, implement Python RAG flow (English + Kannada). |
| **UI & Antigravity Motion** | | Build the React components, design the slate/obsidian UI, write fluid GSAP & Framer Motion transitions. |
| **3D & Spatial Maps** || Render 3D network topologies using Three.js, implement WebGL map overlays and binning. |
| **LaTeX & Documentation** |  | Write the automated PDF briefing script, draft the academic-grade whitepaper for submissions. |

---

## 🎨 The "Antigravity" UI Engineering Directive
*(To be strictly followed by the frontend team)*
> **Design Directive:** "The interface must utilize an 'Antigravity' design language. Standard DOM elements should feel untethered but highly responsive. Use Framer Motion for layout persistence during state changes—when a user clicks a crime hotspot, the map should fluidly shrink and dock to the side while the 3D network topology expands from the center, connected by a seamless spatial transition. Data cards should enter the viewport utilizing GSAP's `stagger` and `ease: 'expo.out'`, giving a sense of weightless assembly. Colors must remain strictly minimalist—deep dark mode with high-contrast, neon-muted accents (lavender/gold) strictly reserved for interactive or critical threat nodes."

---

## 📞 Support & Contacts
* **Datathon Support Email:** support@hack2skill.com
* **Business Inquiries:** info@hack2skill.com
* **Helpline:** +91 9870330830 / +91 9870330830
* **Corporate Address (Bengaluru):** WeWork Galaxy, 43, Residency Rd, Ashok Nagar, Bengaluru, Karnataka 560025
* **Corporate Address (Noida):** A-14, 4th floor Eco Tower, Sector 125, Noida, Uttar Pradesh 201303