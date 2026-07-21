# KAWACH — Demo Video Script

*Target runtime: ~3:15. Structure: Problem → Solution reveal → Live demo → Proof/credibility → Close. Every claim in this script is backed by something actually built and verified in this repo — don't ad-lib numbers beyond what's here.*

---

## ACT 1 — THE PROBLEM (0:00–0:35)

**[Screen: black, then a phone lights up. Sound: a phone ringing, tense.]**

> **VO (serious, fast-paced):**
> "Hello... this is CBI Mumbai. There is an arrest warrant issued in your name."

**[Cut: a hand shaking, holding the phone.]**

> **VO:**
> "In the first nine months of 2024 alone, scams like this stole **₹1,776 crore** from Indian citizens. India logged **1.14 million cybercrime complaints in 2023** — up 60% in a single year."

**[Cut: quick montage — a fake ₹500 note held to light, a pothole swallowing a scooter wheel, a garbage pile on a street corner.]**

> **VO:**
> "Counterfeit notes designed to fool bank staff. Civic complaints that vanish into silence. And police departments still working off spreadsheets and gut feeling — not intelligence."

**[Beat. Screen fades to black.]**

> **VO (quieter):**
> "The problem was never that people don't report things. It's that nobody's listening in time."

---

## ACT 2 — THE SOLUTION REVEAL (0:35–0:55)

**[Screen: KAWACH logo animates in, bold, over a dark UI backdrop.]**

> **VO (confident, up-tempo):**
> "Meet **KAWACH** — India's AI-native public safety grid. One app for citizens. One brain for detection. One console for every government department — police included."

**[Quick text overlay, 3 words each, punchy:]**
- "Detect before harm."
- "Route to the right desk."
- "Never file alone."

> **VO:**
> "Let me show you how it actually works."

---

## ACT 3 — LIVE DEMO (0:55–2:45)

*This is the section to actually screen-record. Follow this exact path — it's the one verified end-to-end in this codebase.*

### 3a. The citizen app (0:55–1:15)
**[Screen recording: open kawach-two.vercel.app on a phone or responsive browser]**

> **VO:**
> "This is the citizen side — built like a social app people actually want to open, not a government form."

- Show the **map** (nearby civic issues, geo-scoped)
- Swipe the **feed** (Reels-style local incident clips)
- Tap **Camera**, film a mock issue (pothole, or use a pre-recorded clip)

> **VO:**
> "Every upload runs through real computer vision before anyone sees it — deepfake forensics, road-damage detection, waste classification — fused into a trust score. It's routed to the correct department automatically."

### 3b. Nayak — the AI assistant (1:15–2:05) — **the centerpiece**
**[Screen: open the Nayak chat tab]**

> **VO:**
> "This is Nayak — our agentic safety assistant. Watch what happens when I show it a suspicious ₹500 note."

- Attach a currency photo in chat
- Show the real verdict rendering: security-thread check, microprint sharpness, serial-number pattern — **and the model itself, trained on 6,300+ real images, 91.9% held-out accuracy**
- Then paste/say a digital-arrest scam script line ("You are under digital arrest, do not disconnect...")

> **VO:**
> "Nayak recognizes the scam pattern instantly — and it checks: has anyone nearby reported something similar?"

- Show the **confirmation card**: department, severity, nearby-similar count, **"File report" / "Not now"**

> **VO:**
> "Nayak never files anything on its own. It always asks. That's not a limitation — it's the design. AI suggests, a human confirms, every time."

- Tap **File report** → show the confirmation bubble with a report ID

- Then show the **🚨 Emergency button** in the chat header

> **VO:**
> "And when it's truly urgent, one tap dispatches immediately — no AI approval needed, no waiting on a model to respond."

### 3c. Where the report goes (2:05–2:30)
**[Screen: switch to the department dashboard]**

> **VO:**
> "That report just landed here — in real time — on the department's own queue, with a live SLA countdown. Fire and digital-arrest cases jump straight to a 15-minute clock."

- Show a report card with the SLA badge, then the **Master Admin** console

> **VO:**
> "And this is the view no one else has — every department, every SLA breach, every escalation, on one screen, city-wide."

### 3d. The police side (2:30–2:45)
**[Screen: quick cuts — offender graph, hotspot map, evidence export button]**

> **VO:**
> "For police, KAWACH goes deeper — fraud-ring detection using real graph algorithms, DBSCAN-clustered crime hotspots, and one-click, hash-sealed evidence packages ready for court."

---

## ACT 4 — WHY THIS IS DIFFERENT (2:45–3:05)

**[Screen: split-panel text callouts over B-roll of the app]**

> **VO (measured, credible — this is the trust-building beat):**
> "Everything you just saw is real. Not a mockup. Our deepfake detector runs a genuine dual-model ensemble. Our currency classifier was trained from scratch — because no usable pretrained model for Indian currency exists anywhere, so we built one, and measured it honestly: **91.9% held-out accuracy, denomination by denomination** — including the hard cases. Our fraud-network detection uses real community-detection graph algorithms, not a hardcoded demo."

> **VO:**
> "And every citizen report is de-identified before it ever reaches a department. Anonymity isn't a setting here — it's structural."

---

## ACT 5 — CLOSE (3:05–3:15)

**[Screen: KAWACH logo, tagline forms letter by letter]**

> **VO (warm, resolute):**
> "KAWACH. Detect early. Report safely. Respond faster."

**[Final card: logo + team name + "Built for [hackathon name]"]**

---

## Production notes

- **Pacing**: Act 1 and Act 5 should feel cinematic (music, slow cuts). Act 3 should feel fast and real — actual screen recording, not slides, minimal editing tricks, so it visibly looks like a working product.
- **Music**: tense/minor-key under Act 1, swells into confident/major-key at the "Meet KAWACH" reveal, stays energetic through the demo, softens for Act 4's credibility beat.
- **If you're short on time**: Act 3b (Nayak) is the single most important 50 seconds — it's the one flow that hits digital-arrest detection, counterfeit detection, community corroboration, human-confirmed reporting, and the emergency path all at once. If you have to cut anything, cut from Act 3d (police side) before touching 3b.
- **Don't claim** anything not in this script — every number here (₹1,776 crore, 1.14M complaints, 91.9% accuracy, denomination breakdown) is sourced from `ps.txt` or `Classifier/weights/currency/eval_report.json` and is defensible if a judge asks where it came from.
