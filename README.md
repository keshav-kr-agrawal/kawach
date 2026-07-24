<p align="center">
  <img src="kawach.png" alt="KAWACH Logo" width="120" />
</p>

# 🛡️ KAWACH — AI for Digital Public Safety

**Submission for ET Hackathon 2.0 — Problem Statement 6: "AI for Digital Public Safety: Defeating Counterfeiting, Fraud & Digital Arrest Scams"**

> **Live citizen app:** https://kawach-two.vercel.app/
> **AI Classifier API:** https://hikity-kawach-classifier.hf.space
> **Police command console backend:** https://kawach-police.onrender.com

Team: **CodeKrafters**

---

## The problem

'Digital arrest' scams defrauded Indian citizens of ₹1,776+ crore in the first nine months of 2024 alone, and counterfeit ₹500 notes now regularly beat manual bank-teller checks. Law enforcement's real gap isn't evidence after the fact — it's **intelligence before mass victimisation**, at the point of contact rather than the point of complaint.

## What KAWACH does

KAWACH is one platform serving three sides of the same problem: a **citizen-facing PWA** that screens scams and counterfeit notes in real time, a **police command console** that turns reports into fraud-network intelligence, and a **classifier microservice** that does the actual AI/CV work behind both. It maps directly onto the five capability areas the ET problem statement calls out:

| ET PS ask | What's built | Where |
|---|---|---|
| **Digital Arrest Scam Detection & Alerting** | Live-session monitor fusing scam-script NLP scoring, a real deepfake video check, a DSP-based voice-spoof heuristic, and transaction-anomaly signals into one weighted risk score that dispatches an alert *before* transfer | `police/backend/app/routes/digital_arrest.py` |
| **Counterfeit Currency Identification Agent** | Staged CV pipeline: image-quality gate → note-presence gate → OCR-based serial/text-integrity checks → a trained EfficientNet-B0 CNN (91.9% test accuracy, 6.3k images) as an advisory signal — tuned so bad photos never get miscounted as fake notes | `Classifier/app/currency_detector.py`, full writeup in [`Classifier/COUNTERFEIT_DETECTION.md`](Classifier/COUNTERFEIT_DETECTION.md) |
| **Fraud Network Graph Intelligence** | Louvain community detection + centrality scoring over the offender/account/UPI graph, with an explainable money-mule flag or fraud-ring clusters | `police/backend/app/routes/network.py` |
| **Geospatial Crime Pattern Intelligence** | Real DBSCAN hotspot clustering over crime reports **and** counterfeit-note seizure points on one command-centre map | `police/backend/app/routes/geo.py` |
| **Citizen Fraud Shield (multi-channel)** | "Nayak" conversational assistant in the PWA, WhatsApp, and Twilio Voice/IVR — real-time verdicts, guided NCRB complaint prep, replies in 12 regional languages | `police/backend/app/routes/nayak.py`, `police/backend/app/routes/webhooks.py` |

## Services

| Service | Path | Stack | Run |
|---|---|---|---|
| Citizen PWA + dept/police/admin dashboards | `user/` | React 19 + Vite | `cd user && npm install && npm run dev -- --port 5175` |
| AI Classifier microservice | `Classifier/` | FastAPI, PyTorch | `cd Classifier && pip install -r requirements.txt && python -m uvicorn app.main:app --port 8001` |
| Police command console backend | `police/backend` | FastAPI + Postgres + Neo4j (optional) | `cd police/backend && pip install -r requirements.txt && python -m uvicorn app.main:app --port 8000` |
| Police console frontend | `police/frontend` | React + Vite | `cd police/frontend && npm install && npm run dev` |
| Department dashboards | `departments/` | Static HTML/JS + Supabase | `npx serve departments` |

`police/backend` expects Postgres at the URL in `police/backend/app/config.py` (defaults to `postgresql://keshav@localhost:5439/kawach`) and optionally Neo4j — it falls back to a bundled mock graph if Neo4j isn't reachable.

## AI honestly, by pipeline

Not every "AI" label in a hackathon demo is a trained model — here's what's genuinely learned vs. deterministic:

- **Trained models**: deepfake detection (MTCNN + dual EfficientNet-B7 ensemble), counterfeit-note CNN (EfficientNet-B0, self-trained — see [`Classifier/COUNTERFEIT_DETECTION.md`](Classifier/COUNTERFEIT_DETECTION.md)), road-damage/scene classification (YOLO12s + SigLIP), priority classification (DistilBERT), Gemini-based department routing and the Nayak conversational assistant.
- **Real, deterministic statistics** (not trained ML, but genuinely computed from live data, not mocked): fraud-risk scoring, crime pattern analytics, DBSCAN hotspot clustering, Louvain community/mule-network detection, SLA breach tracking, scam-script keyword-category scoring, voice-spoof DSP heuristics (no labeled spoof corpus exists publicly, so this is a classical-signal-processing proxy, not a trained model).
- **Explicit fallbacks, never silent**: every AI-backed endpoint degrades to a clearly-labeled heuristic or mock state (visible via each service's `/health` check) if a model or external API is unavailable — it never fabricates a verdict.

## Design principles

1. Detection and reporting are separate — the classifier never auto-files a complaint; the citizen always confirms first.
2. A report can be public (community feed) independent of whether a complaint was filed against it.
3. One dashboard shell, parameterized by department — not a hand-built page per department.
4. Zero paid dependencies — Supabase, Cloudinary, HF Spaces, Gemini free tier, Render free tier, Neo4j Aura free tier all fit hackathon-scale demo traffic.
5. Department-facing data never carries citizen identity — only a tracking ID, location, evidence, and classifier output cross that boundary.

## Docs

- [`docs/handover.md`](docs/handover.md) — full technical handover: architecture, data flow, deployment
- [`docs/ET_Hackathon_Synopsis.tex`](docs/ET_Hackathon_Synopsis.tex) — submission synopsis (LaTeX source)
- [`plan/kawach_build_spec.md`](plan/kawach_build_spec.md) — target architecture spec
- [`plan/progress_tracker.md`](plan/progress_tracker.md) — build progress tracker
- [`Classifier/COUNTERFEIT_DETECTION.md`](Classifier/COUNTERFEIT_DETECTION.md) — counterfeit-detection pipeline in depth
- [`standardized_rulebook/`](standardized_rulebook/) — full parsed legal corpus (BNS, BNSS, BSA, IT Act, Constitution, etc.) earmarked for seeding Nayak's legal-citation RAG beyond its current 10 curated safety chunks

---
*Built by **CodeKrafters** for India 🇮🇳*
