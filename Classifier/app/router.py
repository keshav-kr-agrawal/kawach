import os
import json
from typing import Dict, Any
import google.generativeai as genai

# Fallback Keyword Map for 10 Departments
KEYWORD_MAPPING = [
    {
        "keywords": ["fire", "smoke", "explosion", "gas leak", "cylinder", "flame", "blast", "rescue"],
        "dept": "FIRE",
        "name": "Fire & Rescue Services",
        "priority": "CRITICAL",
        "reason": "Immediate fire hazard or rescue emergency detected in the report text.",
        "escalation": True
    },
    {
        "keywords": ["violence", "theft", "assault", "robbery", "fight", "stole", "weapon", "gun", "knife", "kidnap", "threat", "crime", "illegal", "drugs", "police"],
        "dept": "POLICE",
        "name": "Police & Law Enforcement",
        "priority": "HIGH",
        "reason": "Incident involves public safety threat, violence, or criminal activity.",
        "escalation": True
    },
    {
        "keywords": ["wire", "power", "current", "transformer", "shock", "cable", "short circuit", "electricity", "electric", "blackout"],
        "dept": "ELECTRICITY",
        "name": "Electricity Board",
        "priority": "HIGH",
        "reason": "Report indicates electric grid damage or hazardous live wiring.",
        "escalation": True
    },
    {
        "keywords": ["leak", "pipe", "sewage", "drainage", "overflow", "flood", "gutter", "water", "plumbing"],
        "dept": "WATER",
        "name": "Water Supply Authority",
        "priority": "NORMAL",
        "reason": "Issue concerns water pipelines, sewage leakage, or local drainage overflow.",
        "escalation": False
    },
    {
        "keywords": ["accident", "traffic", "jam", "road block", "signal", "crash", "collision", "vehicle", "rash driving"],
        "dept": "TRAFFIC",
        "name": "Traffic Control & Roads",
        "priority": "NORMAL",
        "reason": "Traffic flow disruption, road accident, or signal malfunction detected.",
        "escalation": False
    },
    {
        "keywords": ["garbage", "waste", "trash", "dump", "cleaning", "litter", "stench", "smell", "dustbin", "sanitation", "sweeper"],
        "dept": "SANITATION",
        "name": "Sanitation & Municipal Waste",
        "priority": "NORMAL",
        "reason": "Relates to public littering, overflowing bins, or civic hygiene issues.",
        "escalation": False
    },
    {
        "keywords": ["hospital", "disease", "medical", "doctor", "food poisoning", "outbreak", "epidemic", "illness", "infection"],
        "dept": "HEALTH",
        "name": "Health & Medical",
        "priority": "HIGH",
        "reason": "Public health concern or medical safety oversight detected.",
        "escalation": True
    },
    {
        "keywords": ["pothole", "construction", "bridge", "crack", "road damage", "digging", "building collapse", "pwd"],
        "dept": "CONSTRUCTION",
        "name": "Urban Construction & PWD",
        "priority": "NORMAL",
        "reason": "Potholes or damage to public structural facilities reported.",
        "escalation": False
    },
    {
        "keywords": ["pollution", "smoke", "chemical", "deforestation", "tree", "river", "lake", "dust", "emission"],
        "dept": "ENVIRONMENT",
        "name": "Environmental Protection",
        "priority": "NORMAL",
        "reason": "Environmental damage, illegal tree cutting, or smoke pollution detected.",
        "escalation": False
    },
    {
        "keywords": ["land", "encroachment", "encroach", "property", "bribe", "dispute", "administrative", "official"],
        "dept": "REVENUE",
        "name": "Revenue & Administration",
        "priority": "NORMAL",
        "reason": "Property boundary disputes or land encroachment issues.",
        "escalation": False
    }
]

def keyword_fallback_route(title: str, description: str, category: str) -> Dict[str, Any]:
    text = f"{title} {description} {category}".lower()
    
    # Try to find matching keywords
    for item in KEYWORD_MAPPING:
        for kw in item["keywords"]:
            if kw in text:
                return {
                    "department": item["dept"],
                    "department_name": item["name"],
                    "routing_reason": item["reason"],
                    "priority": item["priority"],
                    "escalation_required": item["escalation"],
                    "confidence": "FALLBACK"
                }
                
    # Default fallback if nothing matches
    return {
        "department": "SANITATION",
        "department_name": "Sanitation & Municipal Waste",
        "routing_reason": "Default civic category routing based on general alert patterns.",
        "priority": "NORMAL",
        "escalation_required": False,
        "confidence": "FALLBACK"
    }

def route_report_text(title: str, description: str, category: str) -> Dict[str, Any]:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("[ROUTER] No GEMINI_API_KEY found. Using keyword fallback.")
        return keyword_fallback_route(title, description, category)
        
    try:
        genai.configure(api_key=api_key)
        # Using gemini-1.5-flash as it is extremely fast and perfect for text classification
        model = genai.GenerativeModel("gemini-1.5-flash")
        
        prompt = f"""
You are the central AI dispatcher for KAWACH, a community-based civic incident reporting application in India.
Your task is to route the incoming citizen report to the correct department based on the Title, Description, and Category.

Title: {title}
Description: {description}
Category: {category}

Available Departments to route to:
1. POLICE: Violence, theft, assault, kidnapping, physical danger, illegal activities, crime.
2. TRAFFIC: Road accidents, signals broken, traffic jams, vehicle rash driving, blocked roads.
3. WATER: Sewage overflow, pipe bursts, clean water leak, flooded streets, no water supply.
4. ELECTRICITY: Sparking wires, hanging cables, power outage, transformer damage.
5. SANITATION: Garbage dumps, stench, trash piling, animal carcass, drain blockages.
6. FIRE: Building on fire, chemical/gas leak, fire danger.
7. HEALTH: Epidemic, disease outbreak, medical negligence, unhygienic conditions.
8. CONSTRUCTION: Potholes, damaged bridge/road, illegal construction, unsafe buildings.
9. ENVIRONMENT: Heavy smoke, industrial waste dump, illegal cutting of trees, lake/river pollution.
10. REVENUE: Civic administrative corruption, bribery, land encroachment, boundary disputes.

You MUST respond with a JSON object ONLY containing:
{{
  "department": "ONE_OF_THE_ABOVE_10_DEPARTMENTS",
  "department_name": "Friendly Department Name (e.g. Police & Law Enforcement)",
  "routing_reason": "A precise 1-sentence rationale detailing why this report fits this department.",
  "priority": "CRITICAL" | "HIGH" | "NORMAL" | "LOW",
  "escalation_required": true | false
}}

JSON response:
"""
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
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
            "REVENUE": "Revenue & Administration"
        }
        
        dept = data.get("department", "").upper()
        if dept not in allowed_depts:
            # Try to match key or fallback
            matched = False
            for k in allowed_depts:
                if k in dept or dept in k:
                    dept = k
                    matched = True
                    break
            if not matched:
                raise ValueError(f"Invalid department parsed: {dept}")
                
        return {
            "department": dept,
            "department_name": allowed_depts[dept],
            "routing_reason": data.get("routing_reason", "Routed via automated zero-shot AI dispatch."),
            "priority": data.get("priority", "NORMAL").upper() if data.get("priority") in ["CRITICAL", "HIGH", "NORMAL", "LOW"] else "NORMAL",
            "escalation_required": bool(data.get("escalation_required", False)),
            "confidence": "AI"
        }
    except Exception as e:
        print(f"[ROUTER] Gemini routing failed: {e}. Falling back to keyword model.")
        return keyword_fallback_route(title, description, category)
