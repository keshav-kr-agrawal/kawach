import os
import sys
import json
from datetime import datetime

# Adjust path to find app module
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

# Force GEMINI_API_KEY to be empty
os.environ["GEMINI_API_KEY"] = ""

from fastapi.testclient import TestClient
from app.main import app
from app.auth import create_access_token
from app.database import SessionLocal
from app.models import FIRRecord, Offender, Vehicle

# Artifact path
ARTIFACT_DIR = "/Users/keshav/.gemini/antigravity-ide/brain/40fec63a-c259-4722-ab6f-5f71b588126a"
ARTIFACT_PATH = os.path.join(ARTIFACT_DIR, "chatbot_test_responses.md")

def main():
    print("[TEST-QUERIES] Starting chatbot fallback tests (GEMINI_API_KEY = '')...")
    client = TestClient(app)
    
    # Generate mock token for Police Copilot
    token_data = {"sub": "officer_test", "role": "DGP", "district_id": 1}
    token = create_access_token(token_data)
    headers = {"Authorization": f"Bearer {token}"}
    
    db = SessionLocal()
    
    # Retrieve some real test IDs from database to make tests reliable
    fir_record = db.query(FIRRecord).first()
    fir_id = fir_record.id if fir_record else "FIR-2024-00001"
    
    offender_record = db.query(Offender).first()
    offender_name = offender_record.name if offender_record else "Ramesh Kumar"
    
    vehicle_record = db.query(Vehicle).first()
    vehicle_plate = vehicle_record.plate_number if vehicle_record else "KA-01-XY-1002"
    
    db.close()

    # Define User (Nayak) queries
    user_queries = [
        "I got a Skype call saying I am under digital arrest for money laundering by CBI help!",
        "Can a traffic police officer seize my bike keys on spot check?",
        "What does the RBI say about customer liability for bank UPI fraud?",
        "Is HSR layout safe to walk at night?",
        "How do I file a Zero FIR if police refuse to register my case?",
        "Hello Nayak, who are you and what do you do?"
    ]

    # Define Police AI Copilot queries
    police_queries = [
        f"Summarize case {fir_id}",
        f"Analyze profile for offender {offender_name}",
        f"Who owns vehicle {vehicle_plate}?",
        "Find suspect associates and relations on the network",
        "Explain your security compliance and DPDP guardrails"
    ]

    md_report = []
    md_report.append("# KAWACH Chatbot Fallback Response Validation Dossier")
    md_report.append(f"**Execution Timestamp:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    md_report.append("**Gemini API Key:** `None / Hidden` (Running honest fallback protocols)")
    md_report.append("\n---\n")

    md_report.append("## Part 1: Citizen Chatbot (Nayak) Fallback Tests")
    md_report.append("These endpoints process citizen safety issues and fetch legal citations from the 3,974 sections RAG database.")
    md_report.append("\n")

    for q in user_queries:
        print(f"  -> Sending Nayak query: '{q}'")
        res = client.post(
            "/api/nayak/chat",
            json={"message": q, "lat": 12.9716, "lng": 77.5946},
            headers={"X-User-Id": "test-dossier-user"}
        )
        reply = "ERROR"
        if res.status_code == 200:
            reply = res.json()["message"]["content"]
            
        md_report.append(f"### 💬 Citizen Inquiry: \"{q}\"")
        md_report.append("#### 🛡️ Nayak Assistant Response:")
        md_report.append(reply)
        md_report.append("\n---\n")

    md_report.append("## Part 2: Police AI Investigation Copilot Offline Tests")
    md_report.append("These queries retrieve master profiles, vehicle registers, and cypher networks directly from local PostgreSQL and Neo4j memory buffers.")
    md_report.append("\n")

    for q in police_queries:
        print(f"  -> Sending Police query: '{q}'")
        res = client.post(
            "/api/ai/query",
            json={"message": q},
            headers=headers
        )
        reply = "ERROR"
        if res.status_code == 200:
            reply = res.json()["response"]
            
        md_report.append(f"### 👮 Officer Query: \"{q}\"")
        md_report.append("#### 💻 Copilot Terminal Response:")
        md_report.append(reply)
        md_report.append("\n---\n")

    # Save to artifact directory
    os.makedirs(ARTIFACT_DIR, exist_ok=True)
    with open(ARTIFACT_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(md_report))
        
    print(f"\n[TEST-QUERIES] Validation complete! Saved responses to: {ARTIFACT_PATH}")

if __name__ == "__main__":
    main()
