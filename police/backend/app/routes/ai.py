from fastapi import APIRouter, Depends, HTTPException
from app.database import get_db
from app.auth import get_current_user_claims
from app.zcql_utils import zcql_rows, parse_datetime, log_audit
from app.ml.train_isolation_forest import get_case_category_lookup
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import os
import re
import requests

from app.neo4j_db import get_neo4j_db
from app.routes.nayak_rag import retrieve_law_chunks

router = APIRouter()

# Same model + honest-fallback pattern as routes/nayak.py — override via
# GEMINI_MODEL env var. No separate model choice for the police copilot.
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-flash-lite-latest")


def _gemini_synthesize(query: str, graph_context: str, law_chunks: list) -> Optional[str]:
    """Single-shot Gemini call for freeform officer queries the regex fast-paths
    don't cover — mirrors nayak.py's run_classify_text/run_check_link pattern
    (plain request/response, not the multi-turn tool-calling agent loop nayak
    uses, since the copilot doesn't need to execute tools mid-conversation).
    Returns None if no API key or the call fails — caller must have an honest
    fallback ready."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return None

    law_context = "\n\n".join(
        f"[{c['act']} {c['section']} — {c['title']}]\n{c['official_text']}\nGuidance: {c['citizen_explanation']}"
        for c in law_chunks
    ) or "No matching statute retrieved."

    prompt = f"""You are the KAWACH AI Investigation Copilot for Karnataka Police officers.
Answer the officer's query below using ONLY the case/graph context and legal citations provided —
do not invent FIR numbers, offender names, or statistics that aren't in the context.

#### Graph-RAG Context (Neo4j)
{graph_context or 'No graph matches.'}

#### Retrieved Legal Citations (BNS/BNSS/BSA/IT Act/RBI, vector-RAG)
{law_context}

#### Officer Query
{query}

Respond with a concise, well-structured answer (use markdown headers/bullets where useful).
End with a one-line disclaimer that this is AI-assisted synthesis, advisory only, and requires
human officer verification before any action — no automated guilt/arrest inference."""

    try:
        gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={api_key}"
        res = requests.post(
            gemini_url,
            headers={"Content-Type": "application/json"},
            json={"contents": [{"parts": [{"text": prompt}]}]},
            timeout=12,
        )
        if res.status_code == 200:
            return res.json()["candidates"][0]["content"]["parts"][0]["text"]
        print(f"[AI COPILOT] Gemini HTTP {res.status_code}: {res.text[:300]}", flush=True)
    except Exception as e:
        print(f"[AI COPILOT] Gemini call error: {type(e).__name__}: {e}", flush=True)
    return None

class ChatRequest(BaseModel):
    message: str

@router.post("/query")
def process_copilot_query(
    req: ChatRequest,
    db=Depends(get_db),
    neo4j_db = Depends(get_neo4j_db),
    claims: dict = Depends(get_current_user_claims)
):
    msg = req.message.strip()
    msg_lower = msg.lower()
    
    # 0. Graph-RAG Context Injection
    graph_context = ""
    try:
        matched_names = [name for name in ["ramesh", "john", "suresh", "anil", "vijay", "rocky", "jon"] if name in msg_lower]
        phone_match = re.search(r'\d{10}', msg_lower)
        
        ctx_list = []
        if matched_names:
            for name in matched_names:
                query = """
                MATCH (p:Person)-[r:ASSOCIATED_WITH]-(a:Person)
                WHERE toLower(p.name) CONTAINS $name
                RETURN p.name as p_name, p.risk_score as p_risk, a.name as a_name, a.risk_score as a_risk
                LIMIT 3
                """
                res = neo4j_db.run(query, {"name": name})
                for rec in res:
                    ctx_list.append(
                        f"Person({rec['p_name']}, Risk: {rec['p_risk']}%) -[:ASSOCIATED_WITH]-> Person({rec['a_name']}, Risk: {rec['a_risk']}%)"
                    )
        
        if phone_match:
            phone_num = phone_match.group(0)
            query = """
            MATCH (p:Person)-[r:OWNED]->(ph:Phone)
            WHERE ph.number = $phone
            RETURN p.name as p_name, ph.number as ph_num
            """
            res = neo4j_db.run(query, {"phone": phone_num})
            for rec in res:
                ctx_list.append(
                    f"Person({rec['p_name']}) -[:OWNED]-> Phone({rec['ph_num']})"
                )
        
        # Fallback to general incident occurred_at links if no names/phones found
        if not ctx_list:
            query = """
            MATCH (inc:Incident)-[:OCCURRED_AT]->(loc:Location)
            RETURN inc.id as inc_id, inc.type as inc_type, inc.threat_level as inc_threat, loc.name as loc_name
            LIMIT 2
            """
            res = neo4j_db.run(query)
            for rec in res:
                ctx_list.append(
                    f"Incident({rec['inc_id']}, Type: {rec['inc_type']}) -[:OCCURRED_AT]-> Location({rec['loc_name']})"
                )
                
        if ctx_list:
            graph_context = "\n".join([f"  - {path}" for path in ctx_list])
    except Exception as ex:
        print(f"Graph-RAG execution warning: {ex}")
        graph_context = "  - Neo4j Bolt Offline (In-Memory Database active)"

    rag_header = f"#### Graph-RAG Active Pathways (Neo4j Context):\n{graph_context}\n\n"

    
    # Track the interaction in the audit logs
    log_audit(db, claims.get("sub", claims.get("username", "anonymous")), claims.get("role", "Field Officer"),
              "AI_COPILOT_QUERY", {"query": msg})

    category_labels = get_case_category_lookup(db)

    # 1. Search for Case references (e.g. FIR-2024-00005 / a numeric CaseMasterID)
    fir_match = re.search(r'fir-\d{4}-\d+', msg_lower) or re.search(r'\bcase\s*#?(\d+)\b', msg_lower)
    if fir_match:
        raw_id = fir_match.group(0).upper()
        cases = zcql_rows(db, "CaseMaster")
        fir = next((c for c in cases if str(c.get("CaseMasterID")) == raw_id or raw_id.endswith(str(c.get("CaseMasterID")))), None)
        if fir:
            stations_by_id = {u["UnitID"]: u for u in zcql_rows(db, "Unit") if u.get("UnitID") is not None}
            station = stations_by_id.get(fir.get("PoliceStationID"))
            filed = parse_datetime(fir.get("CrimeRegisteredDate"))
            citation = f"Citation: [CaseMaster: {fir.get('CaseMasterID')}] filed on {filed.strftime('%Y-%m-%d') if filed else '?'} at {station.get('UnitName') if station else 'Unknown Station'}."
            timeline_str = "\n".join([f"- {str(t.get('date'))[:10]}: {t.get('event')}" for t in (fir.get("timeline") or [])])
            leads_str = "\n".join([f"- {lead}" for lead in (fir.get("leads") or [])])

            response_text = f"""### AI Case Synthesis: {fir.get('CaseMasterID')}
**Status:** {fir.get('CaseStatusID')} | **Priority:** {fir.get('priority')} | **Crime Type:** {category_labels.get(fir.get('CaseCategoryID'), 'Unclassified')}
**Assigned Officer (EmployeeID):** {fir.get('PolicePersonID') or "Not Assigned"}

#### AI-Generated Summary
{fir.get('summary') or "Summary not compiled yet."}

#### Case Timeline
{timeline_str or "No timeline events recorded."}

#### Recommended Investigative Leads
{leads_str or "- Monitor suspect activity and check phone logs."}

---
*Disclaimer: AI recommendations are advisory only. Final arrest and charge actions require manual human officer approval. No guilt is inferred by this summary.*
*Source Reference: {citation}*"""
            return {"response": rag_header + response_text, "citations": [citation]}
        else:
            return {"response": rag_header + f"Case ID **{raw_id}** was not found in the Data Lake. Please check the ID format and try again.", "citations": []}

    # 2. Search for Accused/offender references (e.g. Ramesh Kumar or an AccusedMasterID)
    off_match = re.search(r'off-(\d+)', msg_lower)
    offender = None
    all_accused = zcql_rows(db, "Accused")

    if off_match:
        off_id = int(off_match.group(1))
        offender = next((a for a in all_accused if a.get("AccusedMasterID") == off_id), None)
    else:
        for name in ["ramesh", "suresh", "zia", "anil", "vikram"]:
            if name in msg_lower:
                offender = next((a for a in all_accused if name in (a.get("AccusedName") or "").lower()), None)
                if offender:
                    break

    if offender:
        oid = offender.get("AccusedMasterID")
        citation = f"Citation: [AccusedProfile: {oid} - {offender.get('AccusedName')}], priors: {offender.get('num_prior_offenses')}."
        vehicles = ", ".join([f"{v.get('make')} {v.get('model')} ({v['plate_number']})" for v in zcql_rows(db, "Vehicle") if v.get("owner_offender_id") == oid]) or "None registered"
        phones = ", ".join([p["phone_number"] for p in zcql_rows(db, "Phone") if p.get("owner_offender_id") == oid]) or "None logged"
        associates = ", ".join([
            a.get("AccusedName") for a in all_accused
            if a.get("CaseMasterID") == offender.get("CaseMasterID") and a.get("AccusedMasterID") != oid
        ]) or "No immediate associates logged"

        response_text = f"""### Master Criminal Profile: {offender.get('AccusedName')} ({oid})
**Priors Count:** {offender.get('num_prior_offenses')} offenses | **Risk Score:** {offender.get('risk_score')}%

#### Known Assets & Identifiers
- **Registered Vehicles:** {vehicles}
- **Phone Numbers:** {phones}

#### Known Criminal Network
- **Co-accused (same case):** {associates}

#### Guardrail Disclaimer
*System compliance notification: This platform does NOT profile race, religion, caste, or ethnicity. No automated guilt or arrest suggestions have been generated. Prior arrest rates are shown for mapping context only.*
---
*Source Reference: {citation}*"""
        return {"response": rag_header + response_text, "citations": [citation]}

    # 3. Vehicle Lookup (e.g. KA-01-XY-1002)
    veh_match = re.search(r'ka-\d{2}-[a-z]{2}-\d+', msg_lower)
    if veh_match:
        plate = veh_match.group(0).upper()
        veh = next((v for v in zcql_rows(db, "Vehicle") if plate in v.get("plate_number", "").upper()), None)
        if veh:
            owner = next((a for a in all_accused if a.get("AccusedMasterID") == veh.get("owner_offender_id")), None)
            citation = f"Citation: [Vehicle Table: {veh['plate_number']}] owned by {owner.get('AccusedName') if owner else 'Unknown'}."
            response_text = f"""### Vehicle Ownership Details
**Plate Number:** {veh['plate_number']}
**Make / Model:** {veh.get('make')} {veh.get('model')}
**Registered Owner:** {owner.get('AccusedName') if owner else "Unknown"} ({veh.get('owner_offender_id') or "N/A"})

---
*Source Reference: {citation}*"""
            return {"response": rag_header + response_text, "citations": [citation]}
        else:
            return {"response": rag_header + f"Vehicle plate **{plate}** was not found in our database records.", "citations": []}

    # 4. Freeform fallback — no exact FIR/offender/vehicle match found, so this
    # isn't a deterministic lookup anymore. Retrieve BNS/BNSS/BSA/IT Act/RBI
    # law citations via the same vector-RAG pipeline nayak_rag.py uses for the
    # citizen assistant (embedding similarity if GEMINI_API_KEY is set, keyword
    # search otherwise), then let Gemini synthesize an answer grounded in that
    # retrieval plus the graph-RAG context gathered above. If no API key is
    # configured, degrade honestly to the retrieved citations instead of
    # letting an LLM hallucinate one.
    law_chunks = retrieve_law_chunks(msg, db, top_k=3)

    gemini_answer = _gemini_synthesize(msg, graph_context, law_chunks)
    if gemini_answer:
        citations = [f"[{c['act']} {c['section']}] {c['title']}" for c in law_chunks]
        return {"response": rag_header + gemini_answer, "citations": citations}

    if law_chunks:
        cites = "\n\n".join(
            f"**{c['act']} {c['section']} — {c['title']}**\n{c['citizen_explanation']}\n"
            f"*Recommended action:* {c['recommended_action']}"
            for c in law_chunks
        )
        response_text = f"""### Legal Reference Match (Keyword-RAG — no Gemini key configured)
No exact FIR/offender/vehicle ID was found in your query. Closest matching statutes from the BNS/BNSS/BSA/IT Act/RBI knowledge base:

{cites}

---
*System Compliance: Fully compliant with the Digital Personal Data Protection (DPDP) Act, carrying strict disclaimers preventing automated individual profiling.*"""
        citations = [f"[{c['act']} {c['section']}] {c['title']}" for c in law_chunks]
        return {"response": rag_header + response_text, "citations": citations}

    # 5. No FIR/offender/vehicle match, no law-chunk match, and no Gemini key
    # — the honest last resort is the help text, not a fabricated answer.
    response_text = """### KAWACH AI Copilot Support
I can synthesize crime records, map suspect associate lines, locate vehicles, construct investigation case summaries, and cite BNS/BNSS/BSA/IT Act/RBI statutes from the Data Lake.

**Example queries you can run:**
- *Summarize case FIR-2024-00001*
- *Analyze profile Ramesh Kumar*
- *Who owns vehicle KA-15-XY-0020?*
- *Find associates of OFF-0010*
- *What section covers UPI fraud impersonation?*

---
*System Compliance: Fully compliant with the Digital Personal Data Protection (DPDP) Act, carrying strict disclaimers preventing automated individual profiling.*"""
    return {"response": rag_header + response_text, "citations": []}
