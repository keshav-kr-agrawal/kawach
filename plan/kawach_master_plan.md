# KAWACH — Master Build Plan

*Companion to `CLAUDE.md` (architecture reference) and `plan/progress_tracker.md` (checklist to update as you go). This file is the detailed "what and why"; the tracker is the running status. `plan/kawach_build_spec.md` and `plan/kawach_dev_architecture.html` describe the original target design — this plan reconciles that target against verified current code and sequences the remaining work.*

Every task below is tagged:
- **[AI]** — Claude can implement this directly in the repo.
- **[MANUAL]** — needs the user: an account/API key, a judgment call, recording/presenting, or driving a UI by hand.
- **[AI+MANUAL]** — split: a manual precondition unlocks AI-doable work.

No fixed deadline — phases are ordered by dependency and demo risk, not by day. Do them roughly in order; within a phase, tasks are mostly independent.

---

## Research grounding (why these specific technical choices)

- **Gemini 1.5 is fully shut down** (404 on every call) as of 2026 — this isn't a future risk, it's live and currently silently degrading two pipelines. Gemini 2.5 Flash is a stable free-tier model; Gemini 3 Flash is newer but a preview — 2.5 Flash is the safer pick for a deadline-bound build. [Gemini free tier guide](https://www.aifreeapi.com/en/posts/gemini-api-free-tier-complete-guide) · [Models docs](https://ai.google.dev/gemini-api/docs/models)
- **Counterfeit currency detection**: published CNN/ResNet work on Indian ₹500/₹2000 notes reports 94–98% accuracy, always measured per-denomination, never as one blended figure — our accuracy claims should follow that convention. [CNN-based approach for Indian rupee notes](https://journal.hmjournals.com/index.php/JIPIRS/article/download/4793/3390/8349)
- **Digital-arrest scam detection**: current best-practice direction is behavioral/transaction anomaly detection (a sudden large transfer from a normally low-activity account) layered on top of call/video/text content classification — not content classification alone. India's Supreme Court explicitly criticized banks for *not* having this kind of AI/ML anomaly detection in place for exactly this scam type in late 2025 — this is a legitimate, current, judge-recognizable gap to fill. [Tookitaki: Digital Arrest Scam](https://www.tookitaki.com/blog/locked-on-video-inside-indias-chilling-digital-arrest-scam)
- **Fraud ring / graph intelligence**: the established technique is community detection (Louvain) to surface fraud rings as dense clusters distinct from the graph's "giant component" of normal users, plus centrality scores to rank suspects within a ring, plus shared-attribute (device/IP/phone) clustering to find money mules. All of this is doable with `networkx` (already a dependency in `police/backend`) — no trained GNN needed for a hackathon scope. [Neo4j: Identifying fraud rings with GDS](https://neo4j.com/blog/financial-fraud-detection-graph-data-science-identifying-fraud-rings/)

---

## Phase 0 — Foundation (blocks everything else)

**Goal: nothing downstream should be built on top of a landmine or stale understanding.**

- [ ] **0.1** [AI] Write/maintain `CLAUDE.md` — done as part of this planning pass; keep it updated whenever a "real vs. heuristic" fact changes.
- [ ] **0.2** [AI] Swap `gemini-1.5-flash` → `gemini-2.5-flash` in:
  - `Classifier/app/router.py:235`
  - `Classifier/app/main.py:561`
  Re-check `Classifier/README.md` and `Classifier/pipeline.md` for any other stale model-name references and update them too.
- [ ] **0.3** [MANUAL] Confirm the `GEMINI_API_KEY` in use is valid and has quota for `gemini-2.5-flash` (Google AI Studio). If a new key is needed, generate it and update `.env`/deployment secrets (Classifier's HF Space env vars too, not just local).
- [ ] **0.4** [AI] Add an explicit real-vs-mock indicator to `Classifier`'s `/health` endpoint — e.g. `{"deepfake_model": "loaded" | "mock_fallback", ...}` — so a missing `weights/` directory is visible instead of silently returning random "mostly authentic" results (`main.py:146-149`, gated at `174`/`367`).
- [ ] **0.5** [MANUAL] Confirm Postgres is reachable at the URL in `police/backend/app/config.py` (default `postgresql://keshav@localhost:5439/kawach`) and decide on Neo4j: either stand up a reachable instance (local or Aura free tier) or intentionally commit to the JSON fallback (`mock_neo4j_graph.json`) for demo reliability. Document the decision in `CLAUDE.md`.
- [ ] **0.6** [AI] Diff `user/src/components/*.jsx` (top-level) against `user/src/components/user/`, `department/`, `admin/` — confirm via grep of `App.jsx` imports which top-level files have zero live references, then delete them.

---

## Phase 1 — Make the core pipeline honest

**Goal: every flow a judge is likely to click through actually does what it claims, end to end.**

- [ ] **1.1** [AI] Replace the `setTimeout`/`Math.random()` simulation in `user/src/api/videoService.js` (stages like `AI_CHECK_1 → DEPT_ROUTING → COHORT_TEST`) with a real call to Classifier's `/full-analysis`. Mirror the working pattern already used correctly by `routingService.js` for `/route` (real call + local fallback on failure).
- [ ] **1.2** [AI] Apply the same fix to the escalation/flagging logic in `user/src/App.jsx:840-886`, which currently also fakes results via `Math.random()`.
- [ ] **1.3** [AI] Where a fallback is genuinely needed (Classifier unreachable), label it honestly in the UI as offline/degraded mode rather than presenting fallback output as a real AI verdict.
- [ ] **1.4** [AI] Add an SLA model to `police/backend`: a `severity → SLA minutes` mapping (critical=15, high=240, medium=1440, low=4320, matching `plan/kawach_build_spec.md` §6.3) and a computed `is_breached` field (compare `created_at` + SLA window to now) on the reports list endpoint in `police/backend/app/routes/reports.py`.
- [ ] **1.5** [AI] Surface `is_breached` as a red badge in `departments/app.js`'s report cards (`renderDashboard`).
- [ ] **1.6** [AI] Implement real evidence export in `police/backend/app/routes/reports.py:26-59`: add `reportlab` to `requirements.txt`, generate an actual PDF containing report data (timestamp, GPS, classifier scores, chain-of-custody fields), compute a SHA-256 hash of the PDF bytes, return both the file and the hash instead of the current fake `download_url`.
- [ ] **1.7** [AI] Activate the already-imported `DBSCAN` in `police/backend/app/routes/geo.py` — cluster incident lat/lng before building the `/hotspots` GeoJSON response, instead of returning one point per input.

---

## Phase 2 — Upgrade the intelligence layer

**Goal: replace "heuristic dressed as ML" with heuristics that are at least deterministic, explainable, and grounded in real graph-analysis technique — no need for trained models at hackathon scope.**

- [ ] **2.1** [AI] Remove `random.uniform` jitter from `predict_district_risk` in `police/backend/app/routes/analytics.py:56-103` — keep the existing unemployment/poverty/police-density weighted formula, but make it deterministic for identical input.
- [ ] **2.2** [AI] Rewrite `/patterns` in `analytics.py` to compute from the seeded FIR data (already generated by `police/backend/app/scripts/generate_data.py`) instead of returning fully hardcoded mock output.
- [ ] **2.3** [AI] Add Louvain community detection (`networkx.algorithms.community.louvain_communities`) over the offender graph built in `police/backend/app/routes/network.py`, tagging each node with a `community_id`. Add a centrality metric (e.g. betweenness or degree centrality) per node to rank suspects within a community.
- [ ] **2.4** [AI] Add a money-mule heuristic: flag accounts/nodes that (a) share a device/IP/phone attribute with 2+ otherwise-unconnected reports, or (b) receive then immediately forward funds with no prior transaction history in the seeded data. Surface this as a flag on the offender/network response.
- [ ] **2.5** [AI] Add a transaction-anomaly bonus signal to the digital-arrest fusion score: "large transfer from a low-activity account shortly after a flagged call/video session" increases risk score. Wire this into whichever fusion function currently combines voice/video/text signals (check `Classifier/app/trust_scorer.py` and `police/backend/app/routes/fraud_shield.py` for where this belongs).

---

## Phase 3 — Digital Arrest & Fraud Shield completion

**Goal: the PS's headline scenario ("flags an active scam session before financial transfer occurs") is demoable end to end without a real live scam call.**

- [ ] **3.1** [AI] Build or confirm a "simulate active digital-arrest call" flow — feed voice+video+text signals into the fusion classifier in sequence and show the live risk score changing on screen as more signals arrive. Check `police/frontend`'s `CitizenFraudShieldView`/`MobileFieldSimulatorView` for an existing partial implementation to build on rather than starting fresh.
- [ ] **3.2** [AI] Confirm `police/backend/app/routes/fraud_shield.py` actually reads from the same risk-score computation used on the citizen side, rather than being a second, disconnected mocked implementation. Unify if they've diverged.
- [ ] **3.3** [MANUAL] (Optional, time-permitting) Register a Meta developer account and WhatsApp Cloud API sandbox number for a real Fraud Shield channel.
- [ ] **3.4** [AI] (Depends on 3.3) Wire the WhatsApp webhook to the same fusion classifier used elsewhere — reuse, don't reimplement.

---

## Phase 4 — Counterfeit detection hardening

**Goal: the accuracy claim in the deck is specific and defensible, not a vague blanket number.**

- [ ] **4.1** [MANUAL] Gather or confirm a small labeled test set of real/fake note images per denomination (₹100/₹200/₹500/₹2000) — check if `Classifier/weights/` already implies a specific dataset it was trained/validated on and reuse that.
- [ ] **4.2** [AI] Write a small evaluation script that reports accuracy/precision/recall **per denomination**, not blended, and save the output for the deck.
- [ ] **4.3** [AI] (Optional, if time allows) Add a lightweight second-opinion heuristic (e.g. security-thread region correlation via classical CV) alongside the CNN verdict; when the two disagree, report lower confidence instead of silently picking one — cheap way to add rigor without training a new model.

---

## Phase 5 — Trust, anonymity & UX honesty pass

**Goal: every claim the product makes about privacy/anonymity is actually true, because it's the platform's core trust promise.**

- [ ] **5.1** [AI] Audit the `citizen_reports` table schema and every query against it from `departments/app.js` and `police/backend` — confirm no PII/identity/account fields are exposed past the citizen app boundary. Document findings in `CLAUDE.md`.
- [ ] **5.2** [MANUAL] Based on 5.1's findings, adjust deck/UI copy to state what's actually true — most likely "reports are de-identified before reaching departments" rather than "fully anonymous accounts," since citizen auth is real Supabase email/password.
- [ ] **5.3** [AI] (Optional, if time allows) Add a lightweight anonymous/guest session mode alongside the existing auth, closing the gap between claim and reality more completely than messaging alone.

---

## Phase 6 — End-to-end verification & submission deliverables

**Goal: the literal path judges will click through works, and the required deliverables exist.**

- [ ] **6.1** [MANUAL+AI] Run all three services locally together and manually walk: citizen upload → real classification (Phase 1) → confirm-and-route → department queue with SLA badge (Phase 1) → resolve → police graph with community/centrality data (Phase 2) → offender profile → evidence export with real PDF+hash (Phase 1). User drives the click-through; Claude fixes whatever breaks.
- [ ] **6.2** [AI+MANUAL] Export `plan/kawach_dev_architecture.html` to a static image/PDF for the submission package (AI can render it via a headless browser or the artifact/export mechanism available); user does final selection/formatting.
- [ ] **6.3** [MANUAL+AI] Build the presentation deck. Structure talking points around the judging weights (Innovation 25%, Business Impact 25%, Technical Excellence 20%, Scalability 15%, UX 15%) using the coverage checklist in `plan/kawach_build_spec.md` §2 as the outline. Claude can draft slide content/structure; user builds and delivers the deck.
- [ ] **6.4** [MANUAL] Script and record the demo video around the now-real Phase 1–3 flow. Needs the user on camera/voice.

---

## Verification checkpoints (do these as each phase finishes, don't wait until the end)

- **After Phase 0**: `Classifier`'s `/health` reports a real (not mock) model-loaded state; a real POST to `/route` returns Gemini-backed output, not fallback keyword matching.
- **After Phase 1**: browser devtools on a citizen video upload show a real network call to the Classifier API, not a local timer; a seeded overdue report renders `is_breached: true` with a red badge; hitting the evidence-export endpoint returns an actual PDF whose SHA-256 hash can be independently verified against the response.
- **After Phase 2**: `/hotspots` returns clustered groups for a set of nearby seeded points, not one group per point; two identical calls to the risk-prediction endpoint return identical scores; the network/offender graph response includes a `community_id` and centrality value per node.
- **After Phase 3**: the simulated digital-arrest flow's displayed risk score visibly changes in response to injected signals rather than being static.
- **Phase 6.1 is the final gate** — nothing is "submission-ready" until this full walkthrough passes without a judge-visible break.
