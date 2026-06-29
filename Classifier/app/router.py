import os
import json
from typing import Dict, Any
import google.generativeai as genai

# ── Keyword Routing Map — 10 Indian Civic Departments ─────────────────────
# Each entry has keywords, routing metadata, sub_category, and resolution estimate.
KEYWORD_MAPPING = [
    {
        "keywords": [
            "fire", "smoke", "explosion", "gas leak", "cylinder", "flame", "blast",
            "rescue", "arson", "inferno", "burning", "LPG", "inflammable", "spark"
        ],
        "dept": "FIRE",
        "name": "Fire & Rescue Services",
        "priority": "CRITICAL",
        "reason": "Immediate fire hazard or rescue emergency detected in the report.",
        "escalation": True,
        "sub_category": "fire_emergency",
        "resolution_days": 1,
    },
    {
        "keywords": [
            "violence", "theft", "assault", "robbery", "fight", "stole", "weapon",
            "gun", "knife", "kidnap", "threat", "crime", "illegal", "drugs", "police",
            "harassment", "stalking", "chain snatching", "vandalism", "drunk", "eve teasing",
            "rowdy", "goon", "extortion", "gambling"
        ],
        "dept": "POLICE",
        "name": "Police & Law Enforcement",
        "priority": "HIGH",
        "reason": "Incident involves public safety threat, violence, or criminal activity.",
        "escalation": True,
        "sub_category": "law_enforcement",
        "resolution_days": 2,
    },
    {
        "keywords": [
            "wire", "power", "current", "transformer", "shock", "cable", "short circuit",
            "electricity", "electric", "blackout", "live wire", "electrocution",
            "power cut", "fuse", "meter", "voltage", "tripping", "streetlight broken"
        ],
        "dept": "ELECTRICITY",
        "name": "Electricity Board",
        "priority": "HIGH",
        "reason": "Report indicates electric grid damage or hazardous live wiring.",
        "escalation": True,
        "sub_category": "electrical_hazard",
        "resolution_days": 2,
    },
    {
        "keywords": [
            "leak", "pipe", "sewage", "drainage", "overflow", "flood", "gutter", "water",
            "plumbing", "contaminated water", "waterlogging", "clogged drain",
            "burst pipe", "no water supply", "drinking water"
        ],
        "dept": "WATER",
        "name": "Water Supply Authority",
        "priority": "NORMAL",
        "reason": "Issue concerns water pipelines, sewage leakage, or local drainage overflow.",
        "escalation": False,
        "sub_category": "water_infrastructure",
        "resolution_days": 5,
    },
    {
        "keywords": [
            "accident", "traffic", "jam", "road block", "signal", "crash", "collision",
            "vehicle", "rash driving", "wrong way", "speed breaker", "divider",
            "hit and run", "road rage", "blockage", "stuck"
        ],
        "dept": "TRAFFIC",
        "name": "Traffic Control & Roads",
        "priority": "NORMAL",
        "reason": "Traffic flow disruption, road accident, or signal malfunction detected.",
        "escalation": False,
        "sub_category": "traffic_disruption",
        "resolution_days": 1,
    },
    {
        "keywords": [
            "garbage", "waste", "trash", "dump", "cleaning", "litter", "stench", "smell",
            "dustbin", "sanitation", "sweeper", "mosquito", "vector", "unhygienic",
            "compost", "open garbage", "overflowing bin", "solid waste"
        ],
        "dept": "SANITATION",
        "name": "Sanitation & Municipal Waste",
        "priority": "NORMAL",
        "reason": "Relates to public littering, overflowing bins, or civic hygiene issues.",
        "escalation": False,
        "sub_category": "waste_management",
        "resolution_days": 3,
    },
    {
        "keywords": [
            "hospital", "disease", "medical", "doctor", "food poisoning", "outbreak",
            "epidemic", "illness", "infection", "dengue", "malaria", "rabies",
            "food safety", "contamination", "health hazard", "dead animal"
        ],
        "dept": "HEALTH",
        "name": "Health & Medical",
        "priority": "HIGH",
        "reason": "Public health concern or medical safety oversight detected.",
        "escalation": True,
        "sub_category": "public_health",
        "resolution_days": 3,
    },
    {
        "keywords": [
            "pothole", "construction", "bridge", "crack", "road damage", "digging",
            "building collapse", "pwd", "streetlight", "lamp post", "dilapidated",
            "unsafe structure", "demolition", "broken road", "road repair", "pavement"
        ],
        "dept": "CONSTRUCTION",
        "name": "Urban Construction & PWD",
        "priority": "NORMAL",
        "reason": "Potholes or damage to public structural facilities reported.",
        "escalation": False,
        "sub_category": "road_infrastructure",
        "resolution_days": 10,
    },
    {
        "keywords": [
            "pollution", "smoke", "chemical", "deforestation", "tree", "river", "lake",
            "dust", "emission", "sewage", "effluent", "noise pollution",
            "logging", "industrial waste", "air quality", "toxic"
        ],
        "dept": "ENVIRONMENT",
        "name": "Environmental Protection",
        "priority": "NORMAL",
        "reason": "Environmental damage, illegal tree cutting, or smoke pollution detected.",
        "escalation": False,
        "sub_category": "environmental_hazard",
        "resolution_days": 14,
    },
    {
        "keywords": [
            "land", "encroachment", "encroach", "property", "bribe", "dispute",
            "administrative", "official", "illegal construction", "unauthorized",
            "forgery", "fake document", "corruption", "revenue"
        ],
        "dept": "REVENUE",
        "name": "Revenue & Administration",
        "priority": "NORMAL",
        "reason": "Property boundary disputes or land encroachment issues.",
        "escalation": False,
        "sub_category": "land_administration",
        "resolution_days": 21,
    },
]

_DEFAULT_ROUTE = {
    "dept": "SANITATION",
    "name": "Sanitation & Municipal Waste",
    "reason": "Default civic category routing based on general alert patterns.",
    "priority": "NORMAL",
    "escalation": False,
    "sub_category": "general_civic_issue",
    "resolution_days": 7,
}


def _build_result(
    item: Dict,
    title: str,
    description: str,
    confidence_tag: str,
    priority_validator=None,
) -> Dict[str, Any]:
    """Apply DistilBERT validation and construct the final routing dict."""
    base_priority = item["priority"]

    validation = {
        "final_priority": base_priority,
        "distilbert_priority": None,
        "upgraded": False,
        "distilbert_confidence": 0.0,
    }
    if priority_validator:
        validation = priority_validator.validate(title, description, base_priority)

    return {
        "department": item["dept"],
        "department_name": item["name"],
        "routing_reason": item["reason"],
        "priority": validation["final_priority"],
        "escalation_required": item["escalation"],
        "confidence": confidence_tag,
        "distilbert_priority": validation.get("distilbert_priority"),
        "priority_upgraded": validation.get("upgraded", False),
        "distilbert_confidence": validation.get("distilbert_confidence", 0.0),
        "sub_category": item.get("sub_category"),
        "estimated_resolution_days": item.get("resolution_days"),
    }


def keyword_fallback_route(
    title: str, description: str, category: str, priority_validator=None
) -> Dict[str, Any]:
    """
    Multi-keyword scored fallback routing.
    Counts all keyword hits per department (not just first match)
    and selects the highest-scoring department. This is significantly
    more robust than the previous first-match approach.
    """
    text = f"{title} {description} {category}".lower()

    best_item = None
    best_score = 0

    for item in KEYWORD_MAPPING:
        score = sum(1 for kw in item["keywords"] if kw in text)
        if score > best_score:
            best_score = score
            best_item = item

    chosen = best_item if (best_item and best_score > 0) else _DEFAULT_ROUTE
    return _build_result(chosen, title, description, "FALLBACK", priority_validator)


def route_report_text(
    title: str, description: str, category: str, priority_validator=None
) -> Dict[str, Any]:
    """
    Primary routing entry point.
    Tries Gemini zero-shot classification first; falls back to
    multi-keyword scoring if the API key is unavailable or Gemini errors.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("[ROUTER] No GEMINI_API_KEY — using multi-keyword fallback.")
        return keyword_fallback_route(title, description, category, priority_validator)

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")

        prompt = f"""You are the central AI dispatcher for KAWACH, India's civic incident reporting platform.
Analyze the citizen report below and route it to the correct government department.

Report Details:
- Title: {title}
- Description: {description}
- Category: {category}

Available departments and their specific sub-categories:
1. FIRE        — fire_in_building, gas_leak, vehicle_fire, forest_fire, chemical_fire
2. POLICE      — theft, assault, kidnapping, illegal_activity, chain_snatching, eve_teasing, drug_peddling, vandalism
3. ELECTRICITY — wire_down, transformer_fault, power_outage, streetlight_broken, meter_tampering
4. HEALTH      — disease_outbreak, food_poisoning, hospital_negligence, dengue_malaria, dead_animal, unhygienic_food
5. WATER       — pipe_burst, sewage_overflow, no_water_supply, waterlogging, contaminated_water
6. TRAFFIC     — road_accident, signal_broken, road_blockage, rash_driving, vehicle_breakdown
7. SANITATION  — garbage_dump, drain_blocked, open_defecation, animal_carcass, overflowing_bin, mosquito_breeding
8. CONSTRUCTION— pothole, road_crack, bridge_damage, streetlight_broken, building_collapse, illegal_construction
9. ENVIRONMENT — air_pollution, water_body_pollution, noise_pollution, tree_cutting, industrial_discharge
10. REVENUE    — land_encroachment, property_dispute, bribery, unauthorized_structure, corruption

Respond ONLY with this JSON (no extra text):
{{
  "department": "ONE_OF_10_DEPARTMENTS",
  "department_name": "Full friendly department name",
  "sub_category": "specific_sub_category from the list above",
  "routing_reason": "Precise 1-sentence rationale explaining the routing decision.",
  "priority": "CRITICAL | HIGH | NORMAL | LOW",
  "escalation_required": true | false,
  "estimated_resolution_days": <integer 1 to 30>
}}"""

        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"},
        )

        data = json.loads(response.text.strip())

        allowed_depts = {
            "POLICE": "Police & Law Enforcement",
            "TRAFFIC": "Traffic Control & Roads",
            "WATER": "Water Supply Authority",
            "ELECTRICITY": "Electricity Board",
            "SANITATION": "Sanitation & Municipal Waste",
            "FIRE": "Fire & Rescue Services",
            "HEALTH": "Health & Medical",
            "CONSTRUCTION": "Urban Construction & PWD",
            "ENVIRONMENT": "Environmental Protection",
            "REVENUE": "Revenue & Administration",
        }

        dept = data.get("department", "").upper().strip()
        if dept not in allowed_depts:
            for k in allowed_depts:
                if k in dept or dept in k:
                    dept = k
                    break
            else:
                raise ValueError(f"Invalid department from Gemini: {dept}")

        gemini_priority = data.get("priority", "NORMAL").upper()
        if gemini_priority not in ("CRITICAL", "HIGH", "NORMAL", "LOW"):
            gemini_priority = "NORMAL"

        # DistilBERT validation
        validation = {
            "final_priority": gemini_priority,
            "distilbert_priority": None,
            "upgraded": False,
            "distilbert_confidence": 0.0,
        }
        if priority_validator:
            validation = priority_validator.validate(title, description, gemini_priority)

        resolution_days = data.get("estimated_resolution_days")
        if not isinstance(resolution_days, int) or not (1 <= resolution_days <= 30):
            resolution_days = None

        return {
            "department": dept,
            "department_name": allowed_depts[dept],
            "routing_reason": data.get("routing_reason", "Routed via automated zero-shot AI dispatch."),
            "priority": validation["final_priority"],
            "escalation_required": bool(data.get("escalation_required", False)),
            "confidence": "AI",
            "distilbert_priority": validation.get("distilbert_priority"),
            "priority_upgraded": validation.get("upgraded", False),
            "distilbert_confidence": validation.get("distilbert_confidence", 0.0),
            "sub_category": data.get("sub_category"),
            "estimated_resolution_days": resolution_days,
        }

    except Exception as e:
        print(f"[ROUTER] Gemini failed: {e} — falling back to multi-keyword model.")
        return keyword_fallback_route(title, description, category, priority_validator)
