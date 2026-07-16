# KAWACH — Build Specification & Project Context

*Use this as the working brief for yourself, teammates, or an AI coding assistant. It is the source of truth for what to build, in what order, and why.*

---

## 1. One-line vision

KAWACH is an anonymous, AI-mediated bridge between citizens and government — any photo, video, or report a citizen submits is auto-classified, auto-routed to the correct real government department, and tracked through resolution, while a separate AI safety layer detects digital-arrest scams and counterfeit currency in real time.

---

## 2. Problem statements this targets

| Track | Core ask |
|---|---|
| **ET PS** — AI for Digital Public Safety | Detect and disrupt digital-arrest scams, counterfeit currency, and fraud networks before mass victimization; produce court-admissible evidence |
| **Zoho PS** — AI-Driven Crime Analytics | Turn siloed crime records into geospatial, predictive, network-linked intelligence for proactive policing |

KAWACH answers both: the citizen-facing layer + department routing is the general civic-safety product; the police branch and its analytics satisfy the crime-analytics track; the digital-arrest/counterfeit/fraud-graph pieces satisfy the digital-public-safety track.

### Coverage checklist (keep this updated as you build)

- [ ] Digital arrest scam detection & alerting (voice + video + text fusion, pre-transfer alert)
- [ ] Counterfeit currency identification (image classifier)
- [ ] Fraud network graph intelligence (NetworkX/Neo4j)
- [ ] Geospatial crime pattern intelligence (citizen map + police hotspot layer, separate)
- [ ] Citizen Fraud Shield, multi-channel (app + WhatsApp)
- [ ] Interactive dashboards & geospatial maps (per-department + master admin)
- [ ] Crime hotspot detection, trend alerts, anomaly detection
- [ ] District-level drilldowns
- [ ] Network & link analysis of criminals
- [ ] Repeat offender tracking
- [ ] Socio-economic crime correlation
- [ ] Predictive risk scoring
- [ ] Auditability / evidence export for legal admissibility

---

## 3. Core design principles — don't violate these while building

1. **Detection and reporting are two separate pipelines.** The AI classifier never auto-files a complaint. It always asks the citizen to confirm ("raise this as a complaint?") before a report enters a department queue. A citizen can also skip detection entirely and file a manual report.
2. **Anonymity is structural, not a setting.** No table in the schema should join a report to a real citizen identity that a department can see. Use an anonymous tracking ID (UUID) as the only citizen-facing reference.
3. **Reels/social feed is independent of formal reporting.** A clip can surface to nearby users whether or not the citizen chooses to file a complaint from it. Treat "visibility" and "complaint filed" as two separate booleans on the same upload record.
4. **Every department dashboard shares one schema and one UI shell.** Don't hand-build 11 different dashboards — build one dashboard component parameterized by `department_id`.
5. **Zero budget.** Every tool below has a free tier that covers hackathon-scale demo traffic. Do not introduce a paid dependency without checking this doc first.

---

## 4. User roles

| Role | Access | What they do |
|---|---|---|
| Citizen (anonymous) | Public app | Uploads to Reels, files reports, chats with Nayak, uses Fraud Shield |
| Department officer | Single-department dashboard | Sees only their department's queue, updates status, resolves issues |
| Department admin | Single-department dashboard + department analytics | Same as officer + department-level reporting |
| Police officer (SHO/Constable) | Police console | Dispatch queue, case updates |
| Police command (SP/DGP) | Police console + graph intelligence | Offender graph, predictive scoring, cross-district view |
| Government super-admin | Master admin dashboard | Cross-department analytics, escalation oversight, city-wide heatmap |

---

## 5. Citizen app — detailed spec

### 5.1 Social feed / Reels (the USP)
- Feed of short video/photo posts, geo-scoped to a radius around the viewer.
- Any upload — from Reels or attached to a report — is run through the AI detection layer first (see 5.2).
- If the classifier tags it as a local-interest incident (pothole, fight, fire, visible counterfeit note, crowd gathering), it's eligible to surface in nearby users' feeds regardless of whether a complaint was filed.
- Store two independent flags per upload: `is_public_visible` (Reels) and `complaint_id` (nullable — set only if the citizen confirmed a report).

### 5.2 AI detection layer ("Nayak assistant")
Runs on every upload. Always classify → score → suggest → ask. Never auto-file.

| Modality | What it does | Suggested model / approach |
|---|---|---|
| Text | Scam-script and phishing-language detection | DistilBERT fine-tuned classifier, or Gemini structured-output classification |
| Video | Deepfake face check + general scene classification (pothole/fire/fight/crowd/etc.) | MTCNN + EfficientNet-B7 ensemble (deepfake); YOLO12s or a fine-tuned scene classifier (civic issue type) |
| Voice | Voice-spoof/AI-clone detection + loud-noise/disturbance event detection | Pretrained spoofing classifier (e.g. AASIST-style) from HF Hub; simple audio-event model (YAMNet-class) for noise |
| Image | Counterfeit-currency real/fake verdict | CV model fine-tuned on a public FICN dataset, or classical CV (edge/template correlation on security-thread region) if time-constrained |
| Link | Phishing/fraud-site and deepfake-source detection | URL reputation heuristics + Gemini classification of page content |
| Fusion classifier | Combines all signals into one output: `{issue_type, department, severity, confidence}` | Rule-based weighting to start; can upgrade to a learned fusion model later |
| Confirm & route | Presents the fusion output to the citizen, waits for yes/no | Simple UI prompt — this is the bridge between detection and reporting |

### 5.3 Reporting (manual, independent path)
Citizen picks a category directly. Categories: crimes, emergencies, gov department issues, text reporting, counterfeit, digital arrest / active scam session. The classifier still validates attached evidence (e.g. confirms a currency photo) but does not gate submission.

### 5.4 Citizen Fraud Shield — WhatsApp
Same fusion classifier, exposed via WhatsApp Cloud API (free tier) for citizens mid-scam-call who won't install a new app.

### 5.5 Anonymity layer
- Citizen auth: anonymous session via Supabase Auth (device-bound, no PII required to report).
- Every report gets a `tracking_id` (UUID) the citizen can use to check status.
- Department-facing tables never expose citizen identity, device ID, or account info — only `tracking_id`, location, evidence, and classifier output.

---

## 6. Department layer — detailed spec

### 6.1 Shared department dashboard (build once, parameterize)
Every department — municipal or police — gets the same dashboard shell:

- **Alert queue**: incoming reports for this `department_id`, sorted by severity then recency.
- **Map view**: Leaflet + OpenStreetMap, pins for active issues in this department's jurisdiction.
- **Status workflow**: `new → acknowledged → in_progress → resolved` (officer-updatable).
- **SLA timer**: visible countdown per report based on severity tier; turns red on breach.
- **Analytics panel**: issue volume over time, average resolution time, recurring hotspot areas (reuse the geospatial layer, filtered to this department).

### 6.2 Final department list (corrected from your original 11)

| # | Department | Handles |
|---|---|---|
| 1 | Public Works – Roads (PWD) | Potholes, road damage |
| 2 | Public Works – Buildings (PWD) | Unsafe/unauthorized construction |
| 3 | Electricity Board (DISCOM) | Outages, exposed wiring |
| 4 | Water Supply & Sewerage Board | Supply, leakage, sewage |
| 5 | Sanitation & Solid Waste Management | Garbage, dumping *(merged from your original "sanitation" + "waste management")* |
| 6 | Pollution & Noise Control Board | Air pollution + noise complaints *(renamed from "air quality" — this is what your loud-noise example routes to)* |
| 7 | Traffic Police / Management | Congestion, signal faults, violations |
| 8 | Fire & Emergency Services | Fire hazards, active fires |
| 9 | Health Department | Public health hazards, outbreaks |
| 10 | Education Department | School infrastructure |
| 11 | Police (crime classifier) | Crimes, digital arrest, counterfeit fraud cases — deepest branch, see 6.4 |

### 6.3 SLA & escalation engine (shared infrastructure, not per-department)

| Severity | SLA timer | On breach |
|---|---|---|
| Critical (active emergency, digital arrest in progress) | 15 minutes | Escalates to department admin + pushes to master admin escalation feed immediately |
| High (crime, fire risk, safety hazard) | 4 hours | Escalates to department admin |
| Medium (civic issue with public impact — pothole on a main road) | 24 hours | Flags on master admin dashboard |
| Low (minor civic issue) | 72 hours | Logged, no active escalation |

- Reports that plausibly touch more than one department (e.g. a pothole causing a traffic hazard) dual-route: both departments get a queue entry linked to the same `report_id`.
- Escalation is a status flag + notification, not a new pipeline — reuse the same `reports` table with an `escalated_at` timestamp.

### 6.4 Police crime classifier (deepest branch)
- **AI analytics**: relation mapping (NetworkX graph — suspects, gangs, vehicles, phone numbers, UPI accounts, CDR pings), criminal mapping via learned embeddings, repeat-offender tracking, predictive risk scoring, crime hotspot + trend/anomaly alerts, geospatial fraud + counterfeit hotspot layer (distinct from the citizen map — patrol-prioritization view), socio-economic crime correlation.
- **Criminal profile**: per-suspect dossier — history, records, analysis, graph position, predictive re-offense score.
- **Digital arrest live-session monitor**: receives the fused risk score from the citizen-side detector in real time; can alert dispatch before a victim transfers money.
- **Auditable evidence export**: one-click hash-sealed (SHA-256) bundle — timestamp, GPS, classifier scores, chain of custody — built for court submission. Make this a visible button; it's an explicit PS evaluation criterion.

### 6.5 Master admin dashboard (whole-government view)
- Cross-department totals: issue count, resolution rate, average time-to-resolve, per department.
- City-wide heatmap layering every department's active issues.
- Department performance leaderboard.
- Live escalation feed — every SLA breach across every department, in one list.
- Drill-down into any single department's queue without leaving the admin view.

---

## 7. Data model sketch (Supabase / Postgres)

```
reports
  id (uuid, pk)
  tracking_id (uuid, citizen-facing)
  source (enum: reels_detected | direct_report | whatsapp)
  category (enum: matches department list + crimes/emergencies/digital_arrest/counterfeit)
  department_id (fk -> departments)
  secondary_department_id (fk -> departments, nullable, for dual-routing)
  severity (enum: critical | high | medium | low)
  status (enum: new | acknowledged | in_progress | resolved)
  confidence_score (float, from fusion classifier)
  lat, lng (geospatial)
  media_url (Cloudinary reference)
  is_public_visible (bool)  -- Reels visibility, independent of complaint status
  created_at, escalated_at, resolved_at

departments
  id (pk), name, jurisdiction_boundary (geojson), sla_tier_overrides (jsonb)

classifier_results
  id (pk), report_id (fk), modality (text|video|voice|image|link), raw_output (jsonb), model_version

evidence_packages
  id (pk), report_id (fk), hash_chain (text), pdf_url, generated_at

offender_graph_refs   -- lightweight pointer table if using Neo4j Aura separately
  id (pk), report_id (fk), neo4j_node_id
```

---

## 8. API surface sketch

**Citizen app → backend**
- `POST /upload` — media upload, triggers classifier, returns `{issue_type, department, severity, confidence}`
- `POST /reports/confirm` — citizen confirms the classifier's suggestion, creates a `reports` row
- `POST /reports/manual` — direct report, bypasses classifier suggestion
- `GET /reports/:tracking_id` — citizen checks status anonymously
- `POST /classify/currency`, `/classify/voice`, `/classify/text`, `/classify/link` — individual modality endpoints, called by the fusion layer

**Department dashboard → backend**
- `GET /departments/:id/reports?status=&severity=` — queue
- `PATCH /reports/:id/status` — officer updates status
- `GET /departments/:id/analytics` — resolution stats

**Master admin → backend**
- `GET /admin/overview` — cross-department totals
- `GET /admin/escalations` — live SLA-breach feed
- `GET /admin/heatmap` — city-wide geospatial layer

**Police console → backend**
- `GET /police/graph/:suspect_id` — offender relation graph
- `POST /police/evidence/export` — generate hash-sealed bundle
- `GET /police/hotspots` — geospatial fraud + counterfeit layer

---

## 9. Full tech stack (zero budget)

| Layer | Tool | Free-tier note |
|---|---|---|
| Citizen PWA | Vercel (React 19 + Vite) | Static/edge hosting, no cold start |
| Auth, relational DB, realtime | Supabase | Anonymous auth, Postgres, Realtime channels for live queue updates |
| Video/reel storage | Cloudinary | ~25GB storage / 25 credits monthly bandwidth — cap reel resolution/length |
| AI classifier microservice | Hugging Face Spaces (Docker SDK) | Free CPU (2vCPU/16GB) or ZeroGPU quota; writable only at `/tmp`, fixed port 7860 |
| LLM (Nayak assistant, fusion reasoning) | Gemini 2.5/3.x Flash | Free tier — **not** Gemini 1.5, which is fully shut down |
| Department/admin backend | Render (free web service) | 15-min spin-down on free tier — pay $7/mo for demo week or ping with UptimeRobot |
| Offender/fraud graph | Neo4j Aura free tier, or in-memory JSON fallback | Fallback is safer for demo-day reliability |
| Maps | Leaflet + OpenStreetMap | No API key, no cost |
| Multi-channel fraud shield | WhatsApp Cloud API | ~1,000 conversations/month free |
| Charts | Chart.js or Recharts | Free, client-side |
| Source control / CI | GitHub + GitHub Actions | Auto-deploy triggers on push |

---

## 10. Build phases

**Phase 1 — must-have (submission blockers)**
- Migrate off Gemini 1.5 to 2.5/3.x
- Detection/reporting split with confirm-and-route bridge
- Anonymity layer (tracking ID, no PII in department-facing tables)
- Department dashboard shell (one component, parameterized) + queue + status workflow
- Counterfeit-currency classifier, even at modest accuracy
- Auditable evidence export button
- SLA timers + escalation flag on the reports table

**Phase 2 — should-have**
- Master admin dashboard (cross-department view + heatmap + leaderboard)
- Digital-arrest "simulate active call" demo flow (voice + video + text fusion)
- WhatsApp Fraud Shield channel
- Police offender graph (NetworkX, Neo4j Aura or fallback)
- Geospatial hotspot layer distinct from citizen map

**Phase 3 — nice-to-have, cut first if short on time**
- Voice-deepfake detection as a distinct sixth modality
- Predictive risk scoring model (start with a simple heuristic if no time to train)
- Multi-language support beyond 2 languages
- Real-time convection... i.e. live call interception — do not attempt the real version, keep it simulated

---

## 11. Judging-criteria alignment (ET PS weights)

| Criterion | Weight | What in this spec earns it |
|---|---|---|
| Innovation | 25% | Detection→Reels→confirm-to-report bridge; fused multi-modal digital-arrest scoring |
| Business Impact | 25% | Real department routing to actual government bodies; auditable evidence export |
| Technical Excellence | 20% | Multi-modal classifier fusion, graph intelligence, SLA/escalation engine |
| Scalability | 15% | Parameterized single dashboard component across 11 departments; free-tier stack that scales to paid tiers without re-architecture |
| User Experience | 15% | Anonymous reporting, Reels as daily-use hook, WhatsApp channel for non-app users |

---

*Keep this file updated as the single source of truth. When a build decision conflicts with something here, update this doc in the same commit.*
