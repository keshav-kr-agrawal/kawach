# Nayak — Assistant Plan (for the engineer building this track)

*Companion to `CLAUDE.md` (verified architecture reality), `plan/kawach_master_plan.md` (main build plan), and `plan/kawach_build_spec.md`/`plan/kawach_dev_architecture.html` (original target design, where Nayak is first named as "AI detection layer — Nayak assistant"). This file is the deep-dive spec for Nayak specifically. Read `ps.txt` alongside this — Nayak is the centerpiece of the **ET PS** (AI for Digital Public Safety) submission, not a side feature.*

---

## 1. What Nayak is, in one paragraph

Nayak is KAWACH's always-on, agentic citizen assistant — one conversational entry point that (a) knows Indian law well enough to answer a citizen's question with real citations, (b) watches everything a citizen uploads or pastes (text, link, image, video, voice) and tells them in plain language whether it looks like a scam, a fake government portal, counterfeit currency, or a manipulated video, (c) remembers a given citizen's own history so it has context across a conversation and across visits, and (d) knows what's currently happening near the citizen so it can answer "is it safe right now" questions with real local data. Nayak never files a complaint by itself — per KAWACH's core design principle, it always proposes and asks the citizen to confirm before anything becomes an official report.

---

## 2. Why Nayak is the ET PS centerpiece (read `ps.txt` for full text)

The ET PS challenge statement asks for a platform that gives "law enforcement agencies, financial institutions, **and citizens** proactive tools to detect, disrupt, and respond to digital fraud networks... shifting from reactive case investigation to predictive threat neutralisation." Its own "what you may build" list names, near-verbatim, what Nayak is:

| ET PS ask | Nayak capability that answers it |
|---|---|
| "Digital Arrest Scam Detection & Alerting — real-time AI classifier... that flags active scam sessions... to potential victims **before financial transfer occurs**" | Nayak's live in-conversation scam detection (§4.4) — the single highest-value flow in the whole product |
| "Citizen Fraud Shield (Multi-channel) — Conversational AI... walks citizens through real-time fraud risk assessment... providing instant verdicts, guided reporting to NCRB portals, and advisory in 12 regional languages" | This is Nayak's job description, almost word for word (§4.6, §4.7) |
| "Counterfeit Currency Identification Agent" | Nayak's image-detection tool, delegating to the existing Classifier pipeline (§4.4) |
| "Fraud Network Graph Intelligence... clustering victim reports, scammer infrastructure, and money mule networks" | Nayak doesn't build the graph itself (that's `police/backend`), but every confirmed scam report Nayak escalates is graph fuel — see §4.8 for the handoff contract |
| "Geospatial Crime Pattern Intelligence... near real time" | Nayak's area-awareness tool (§4.5) |

The evaluation focus explicitly names **"false positive rate for citizen-facing tools (must be very low)"** and **"auditability of intelligence packages for legal admissibility."** Both are direct constraints on how Nayak must behave (§7 Guardrails) — this isn't a chatbot demo, it's the piece that gets evaluated hardest.

---

## 3. Current state — honest assessment (don't build on top of these facades)

Three chat-shaped things exist in the repo today. **None of them is Nayak.** Know what they are so you don't mistake polish for functionality:

- `user/src/components/user/AlertsChatView.jsx` — a citizen-facing chat UI called "KAWACH Safety Guard." It is **entirely fake**: `simulateAIResponse()` does keyword matching (`if query.includes('scam')`) inside a `setTimeout`, with three canned responses and one generic fallback. No LLM call, no memory, no tools, no law data.
- `police/backend/app/routes/ai.py` `/query` — the **police-side** "AI Copilot." Also not a real LLM — it's regex matching against FIR IDs, offender names, and vehicle plates against Postgres/Neo4j, then string-templates a response. Useful as a *pattern reference* for citation discipline and DPDP-compliance disclaimers (it already does both well — copy that habit), but it is not Nayak and not conversational AI.
- `user/src/components/user/InteractiveLegalLibraryView.jsx` — a set of ~10 hardcoded "flashcards" (BNS/CrPC/Motor Vehicles Act scenarios) with a fixed shape: `{title, backTitle, frontDescription, backContent, action, penalty}`. This is good UX and a good **schema reference** for how law content should read to a citizen, but it's 10 static cards, not a queryable knowledge base.

Your job is to replace the *concept* behind all three — real conversation, real law retrieval, real detection — while reusing the UX patterns and disclaimer discipline that already exist.

---

## 4. Capability map

### 4.1 Conversational core
Nayak is an LLM with **function-calling / tool use**, not a scripted flow. Use Gemini 2.5 Flash (see `CLAUDE.md` — 1.5 is dead, don't use it; 2.5 Flash is the stable free-tier pick over the newer 3.x preview line for a deadline-bound build) in function-calling mode. The model decides, per turn, whether to just answer from its own knowledge + retrieved law, or call a tool (§5).

### 4.2 Per-user chat history & memory
Every citizen (already has a real Supabase-authenticated account — see `CLAUDE.md`, auth is real email/password) gets persistent chat sessions. Minimum schema (Supabase/Postgres, new tables):

```
nayak_sessions
  id (uuid, pk), user_id (fk -> auth.users), started_at, last_active_at, title (auto-summarized)

nayak_messages
  id (uuid, pk), session_id (fk), role (user|assistant|tool), content (text),
  tool_name (nullable), tool_result (jsonb, nullable), created_at

nayak_user_uploads
  id (uuid, pk), user_id (fk), session_id (fk, nullable), media_url, media_type (image|video|audio|link|text),
  classifier_verdict (jsonb, nullable), linked_report_id (fk -> citizen_reports, nullable), created_at
```
`nayak_user_uploads` is what lets Nayak say "you asked me about a similar link last week" or "this is the third suspicious call you've flagged this month" — real longitudinal awareness, not just single-turn context. Keep this table **de-identified the same way `citizen_reports` is** (see `CLAUDE.md` §"Non-negotiable design principles" #5) — Nayak's memory is citizen-facing only, never exposed to a department dashboard directly.

### 4.3 Law knowledge (this is the coworker's primary deliverable — see §6)
Nayak must answer legal questions **with citations**, using retrieved real law text, not memorized/hallucinated section numbers. This is RAG (retrieval-augmented generation), not fine-tuning — don't train a model, build a good retrieval corpus (§6).

### 4.4 Detection layer — Nayak as the front door to the Classifier microservice
Every modality in `plan/kawach_dev_architecture.html`'s "AI detection layer" section is a **tool Nayak can call**, not logic Nayak reimplements:

| Modality | Tool Nayak calls | Backing implementation |
|---|---|---|
| Video (deepfake + scene) | `classify_video(url)` | `Classifier` `/full-analysis` — already real (MTCNN + dual EfficientNet-B7, YOLO12s, SigLIP) |
| Image (currency) | `classify_currency(url)` | `Classifier`'s image pipeline — verify per-denomination accuracy per `kawach_master_plan.md` Phase 4 |
| Text (scam script/phishing language) | `classify_text(text)` | **New** — doesn't exist yet anywhere in the repo. Build as a Gemini structured-output classifier (`{is_scam, confidence, matched_pattern, reasoning}`) using known digital-arrest/UPI-fraud script patterns as few-shot examples. Layer a cheap keyword pre-filter in front so obvious cases don't burn an LLM call |
| Voice (spoof/AI-clone + disturbance) | `classify_voice(url)` | Not yet implemented per `CLAUDE.md` — track as a `Classifier` pipeline addition, HF Hub has pretrained spoof-detection models (AASIST-style) per the original build spec §5.2 |
| Link (phishing / fake gov portal) | `check_link(url)` | **New, and specifically named in your request** — see §4.6 |
| Fusion | (implicit — Nayak's own reasoning combines tool outputs) | Reuse `Classifier/app/trust_scorer.py`'s trust/urgency fusion logic as a reference for how to weight signals, don't reinvent the formula |

**Critical rule (from the build spec, keep enforcing it):** none of these tools ever auto-files a report. Every tool call returns a verdict to Nayak, Nayak explains it to the citizen in the conversation, and only an explicit citizen "yes, report this" creates a row in `citizen_reports` (§4.8).

### 4.5 Area / situational awareness
"What's happening in his area" = a tool, not a separate feature: `get_area_incidents(lat, lng, radius_km)` reading from `citizen_reports` (already has `lat`, `lng`) filtered to recent + public-visible entries, the same data `SnapMapView`/`LocalReelsFeedView` already render. Nayak doesn't need its own incident store — it queries the existing one. This directly answers the ET PS's "near real time" geospatial ask from the citizen side.

### 4.6 Government portal / link legitimacy check
This is explicitly requested and doesn't exist yet. Recommended approach, cheapest-first:
1. **Whitelist check** (instant, free, no API call): maintain a curated list of legitimate domains — `*.gov.in`, `*.nic.in`, `cybercrime.gov.in`, `uidai.gov.in`, `incometax.gov.in`, RBI/NPCI/bank domains, etc. If the link matches, short-circuit to "verified official" with high confidence.
2. **Heuristic red flags** (instant, free): homoglyph/typosquat detection (`gov-in-verify.com`, `uidai-kyc.info`), non-HTTPS, IP-literal URLs, recently-registered domains (if a free WHOIS API is available within budget), URL shorteners hiding the real destination.
3. **Gemini content classification fallback** (only if 1-2 are inconclusive): fetch the page, ask Gemini structured-output "does this page impersonate an Indian government service / is it requesting credentials or payment under false pretense" — mirrors the spec's original "link detection" design (§5.2 of `kawach_build_spec.md`).
Return `{verdict: official | suspicious | confirmed_fake, confidence, reasons[]}` — always give reasons, never a bare verdict (ties to the "auditability" evaluation criterion).

### 4.7 Multi-language, multi-channel
The ET PS explicitly asks for WhatsApp/IVR access and "12 regional languages." For an MVP: build Nayak as a single backend agent service with a clean API, so the **app chat UI and a future WhatsApp webhook both call the same agent** — don't build two separate assistants. Language: Gemini handles multilingual input/output natively, so this is largely a prompt-instruction concern ("detect the citizen's language and respond in it") rather than a separate translation pipeline — validate this works well for at least Hindi + 1-2 more regional languages before claiming "12 languages" anywhere in a deck.

### 4.8 Escalation / reporting handoff contract
When Nayak's tools return a scam/fraud verdict above a severity threshold and the citizen confirms, Nayak's job is to construct a `citizen_reports` row (or call the existing `/reports/confirm` pattern already used by `routingService.js` — reuse it, don't fork it) with: category, severity, confidence, evidence links, and — if it's a digital-arrest or fraud-network case — enough structure that `police/backend`'s offender graph (`routes/network.py`, being upgraded per `kawach_master_plan.md` Phase 2) can actually link it to phone numbers/UPI IDs/device fingerprints already in the graph. Talk to whoever owns Phase 2 (money-mule heuristic, Louvain community detection) so Nayak's escalation payload has the fields that side actually needs — this is the seam between the citizen product and the police intelligence product, worth a direct conversation, not just a schema guess.

---

## 5. Agent architecture (how the pieces actually fit together)

```
Citizen (app chat UI, later WhatsApp)
        │
        ▼
  Nayak Agent Service  (new — FastAPI or similar, own service or a route group inside an existing backend)
        │  Gemini 2.5 Flash, function-calling mode
        │  System prompt: persona + non-negotiable guardrails (§7) + tool manifest
        │
        ├── tool: search_law(query)            → law RAG (§6)
        ├── tool: classify_text(text)           → new scam-text classifier
        ├── tool: check_link(url)               → whitelist + heuristics + Gemini fallback (§4.6)
        ├── tool: classify_video/image(url)      → Classifier microservice (existing, real)
        ├── tool: classify_voice(url)            → Classifier microservice (new pipeline, tracked separately)
        ├── tool: get_area_incidents(lat,lng,r)  → Supabase citizen_reports query
        ├── tool: get_user_history(user_id)      → nayak_messages / nayak_user_uploads
        └── tool: propose_report(payload)        → returns a draft for citizen confirmation, never auto-submits
        │
        ▼
  citizen_reports (only on explicit citizen confirmation)
```

Keep the agent as a distinct service or route group with its own file, not logic bolted onto `App.jsx` or scattered across existing view components — every tool call should be independently testable.

---

## 6. Your primary task: the law knowledge base

Nayak's law answers are only as good as this corpus. Don't fine-tune a model on law text — that's expensive, slow to update, and wrong for a domain where citations must be exact and auditable. Build a **retrieval corpus** instead.

### 6.1 Sources to pull (prioritize what Nayak will actually be asked about)
- **Bharatiya Nyaya Sanhita (BNS), Bharatiya Nagarik Suraksha Sanhita (BNSS), Bharatiya Sakshya Adhiniyam (BSA)** — the current criminal law (replaced IPC/CrPC/Evidence Act in 2023) — official text via India Code (indiacode.nic.in)
- **IT Act, 2000 + amendments** — Section 66D (cheating by personation using computer resource) is already referenced in the existing flashcards; get the full cyber-crime-relevant sections
- **Digital Personal Data Protection (DPDP) Act, 2023** — relevant to KAWACH's own anonymity claims too, not just citizen-facing answers
- **RBI/NPCI circulars on UPI fraud liability** — the "report within 3 days = zero liability" fact already in the flashcards needs a verifiable, current source (RBI circulars get updated — cite the specific circular number and date, not just "RBI guidelines")
- **TRAI/DoT circulars on call-spoofing and international-call warning labels** — directly relevant to digital-arrest scam calls
- **NCRB / cybercrime.gov.in procedures** — the actual guided-reporting steps for 1930 helpline and the NCCRP portal — this is what "guided reporting to NCRB portals" in the ET PS ask literally means
- **Prevention of Corruption Act, Motor Vehicles Act 1988** — already represented in flashcards, extend rather than replace

### 6.2 How to structure it (match the existing flashcard schema, extend it for retrieval)
For each law "chunk," capture both the citizen-readable framing (matches `InteractiveLegalLibraryView.jsx`'s existing shape) and retrieval metadata:

```json
{
  "id": "bns-318-cheating",
  "act": "Bharatiya Nyaya Sanhita, 2023",
  "section": "318",
  "title": "Cheating",
  "official_text": "<verbatim or accurately paraphrased section text>",
  "citizen_scenario": "You receive a video call claiming your Aadhaar is linked to money laundering...",
  "citizen_explanation": "There is NO legal concept of 'digital arrest'...",
  "recommended_action": "Disconnect immediately. Do not share banking passwords...",
  "penalty_summary": "Up to 7 years imprisonment and fines",
  "source_url": "https://www.indiacode.nic.in/...",
  "last_verified": "2026-07-16",
  "tags": ["digital-arrest", "cyber-fraud", "cheating"]
}
```
`last_verified` matters — law text and RBI/TRAI circulars change; a stale citation is worse than no citation for the "auditability" evaluation criterion.

### 6.3 Retrieval pipeline (zero-budget, matches the rest of the stack)
- **Storage**: Supabase Postgres with the `pgvector` extension (Supabase free tier supports this) — keep everything in the same database KAWACH already uses, don't stand up a separate vector DB service.
- **Embeddings**: Gemini's embedding endpoint (free tier) for consistency with the rest of the AI stack, or a local `sentence-transformers` model if you want zero API dependency for this step — either is fine, pick based on how much you want another network call in the loop.
- **Retrieval**: on `search_law(query)`, embed the query, cosine-similarity search top-k chunks from `pgvector`, pass the retrieved chunks into Gemini's context alongside the citizen's question, force the model (via prompt instruction) to answer only from retrieved text and cite `act` + `section` for every legal claim.
- **Coverage target for a first pass**: don't try to digitize all of Indian law. Prioritize the ~30-50 chunks that map to KAWACH's actual scenarios — digital arrest, UPI/bank fraud, counterfeit currency law, police-interaction rights (already partially covered by flashcards), tenant/consumer basics if time allows. Depth on the scam/fraud angle matters more than breadth for this PS.

---

## 7. Guardrails (non-negotiable — these are judged, not optional polish)

1. **Never fabricate a citation.** If retrieval finds nothing relevant, Nayak says so and offers to escalate to a human/helpline instead of guessing a section number. A wrong citation is worse than "I don't know" under an evaluation criterion about legal admissibility.
2. **Every legal answer names its source** (act + section + `last_verified` date), same discipline the existing `police/backend/app/routes/ai.py` copilot already has for FIR/offender citations — carry that habit over.
3. **Nayak never auto-files a report.** Detection → propose → citizen confirms → then and only then does anything land in `citizen_reports`. This is KAWACH's structural design principle, and it directly serves the "false positive rate... must be very low" evaluation criterion — a human confirmation step is the cheapest, most reliable false-positive filter available.
4. **Always disclose it's advisory, not legal representation.** Mirror the existing disclaimer pattern from `routes/ai.py`.
5. **No profiling.** Same DPDP/anti-profiling compliance language already established in `routes/ai.py` applies to anything Nayak says about a specific person.
6. **Degrade honestly.** If Gemini/the Classifier/the law corpus is unreachable, say so in the UI rather than silently returning a fallback dressed up as a real answer — this is the same "no silent fakes" principle the rest of KAWACH is being fixed to follow (see `kawach_master_plan.md` Phase 1).

---

## 8. Suggested build order

1. **Corpus first** (§6) — even a partial 20-30 chunk corpus with correct citations is immediately useful and de-risks the hardest, most manual part of this track early.
2. **Retrieval + `search_law` tool** — get citation-backed law Q&A working stand-alone before wiring the rest of the agent around it.
3. **Agent core with function-calling**, starting with just `search_law` and `get_user_history` as tools — validate the conversational loop and persona before adding detection tools.
4. **Wire existing Classifier tools** (`classify_video`, `classify_currency`) — these already work, this is integration, not new ML.
5. **Build `check_link`** (§4.6) — self-contained, no dependency on anything else in this list.
6. **Build `classify_text`** (§4.4) — needs a few-shot prompt design pass with real scam-script examples.
7. **Area awareness + escalation handoff** (§4.5, §4.8) — do last, since it depends on the Phase 2 police-side graph work landing (coordinate timing with whoever owns `kawach_master_plan.md` Phase 2).
8. Replace `AlertsChatView.jsx`'s fake simulation with the real agent once the backend is ready — keep the existing UI shell/visual design, it's good, just swap what powers it.

---

## 9. Example user journeys (sanity-check the design against these)

- **Mid-scam-call**: citizen opens Nayak mid-call, pastes what the caller said. Nayak's `classify_text` flags digital-arrest script patterns, `search_law` confirms "no such legal procedure exists," Nayak tells the citizen to disconnect now and offers to pre-fill a report with the caller's number if the citizen provides it. Citizen confirms → report filed. This is the flow named directly in the ET PS ("before financial transfer occurs") — it should feel fast, not like a multi-step form.
- **Suspicious link**: citizen forwards a link claiming to be an income-tax refund portal. Nayak's `check_link` catches a typosquat domain, explains why, citizen doesn't click through.
- **Rights question**: citizen asks "can a cop take my bike keys during a routine stop?" Nayak's `search_law` retrieves the Motor Vehicles Act chunk, answers with the citation, matching what the current hardcoded flashcard already says — but now generalizable to questions that aren't one of the ~10 pre-written cards.
- **Area check**: citizen asks "is it safe to walk home right now?" Nayak's `get_area_incidents` pulls real recent reports near the citizen's location and gives a grounded answer instead of a canned "no incidents" response like the current fake bot always gives regardless of input.

---

## 10. Judging-criteria alignment (why this is worth building well, not just fast)

| Criterion | Weight | What a well-built Nayak earns |
|---|---|---|
| Innovation | 25% | Single agentic assistant spanning law knowledge + multi-modal detection + local awareness, not a bundle of separate features |
| Business Impact | 25% | Directly answers the ET PS's named "before financial transfer occurs" scenario — the platform's strongest, most quotable claim |
| Technical Excellence | 20% | Real RAG with citations (not hallucinated law), real tool-use agent architecture (not a keyword `if` chain like the current facades) |
| Scalability | 15% | One agent service serving app chat now, WhatsApp/IVR later, without rebuilding — same pattern KAWACH already uses for one dashboard shell across departments |
| User Experience | 15% | One conversational entry point instead of separate screens for "check a link," "ask about law," "report something" |
