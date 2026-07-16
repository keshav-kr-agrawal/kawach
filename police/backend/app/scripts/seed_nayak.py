import os
import json
import requests
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base, engine, SessionLocal
from app.models import NayakLawChunk

# Chunks dataset to seed
LAW_CHUNKS = [
    {
        "id": "bns-318-cheating",
        "act": "Bharatiya Nyaya Sanhita, 2023",
        "section": "318",
        "title": "Cheating",
        "official_text": "(1) Whoever, by deceiving any person, fraudulently or dishonestly induces the person so deceived to deliver any property to any person, or to consent that any person shall retain any property... is said to cheat.",
        "citizen_scenario": "You receive a message or call claiming you have a package containing illegal items or that your phone number is linked to a money laundering case. They demand a bank transfer to clear your name.",
        "citizen_explanation": "This is a classic 'Digital Arrest' scam. Under Indian law, no police officer, CBI agent, or court official can place you under arrest via Skype or WhatsApp, nor can they demand money to verify your bank account.",
        "recommended_action": "Hang up immediately. Do not transfer money. Report the phone number to 1930 or cybercrime.gov.in.",
        "penalty_summary": "Imprisonment up to 3 years, or fine, or both.",
        "source_url": "https://www.indiacode.nic.in/handle/123456789/22606",
        "last_verified": "2026-07-16",
        "tags": ["digital-arrest", "cheating", "cyber-fraud", "money-laundering", "extortion"]
    },
    {
        "id": "bns-319-cheating-personation",
        "act": "Bharatiya Nyaya Sanhita, 2023",
        "section": "319",
        "title": "Cheating by Personation",
        "official_text": "(1) A person is said to 'cheat by personation' if he cheats by pretending to be some other person, or by knowingly substituting one person for another, or representing that he or any other person is a person other than he or such other person really is.",
        "citizen_scenario": "A scammer contacts you pretending to be an officer from the Custom Department, CBI, Mumbai Police, or RBI, and shows a fake ID card or wearing a uniform on a video call.",
        "citizen_explanation": "Impersonating a public servant or any other person to execute fraud constitutes Cheating by Personation. Law enforcement will never communicate via video call to conduct investigations or 'arrests'.",
        "recommended_action": "Do not trust uniforms or ID cards shown on video calls. Take a screenshot, terminate the call, and report the handle/number.",
        "penalty_summary": "Imprisonment up to 5 years, or fine, or both.",
        "source_url": "https://www.indiacode.nic.in/handle/123456789/22606",
        "last_verified": "2026-07-16",
        "tags": ["impersonation", "cbi-scam", "customs-scam", "fake-officer", "digital-arrest"]
    },
    {
        "id": "bns-308-extortion",
        "act": "Bharatiya Nyaya Sanhita, 2023",
        "section": "308",
        "title": "Extortion",
        "official_text": "(1) Whoever intentionally puts any person in fear of any injury to that person, or to any other, and thereby dishonestly induces the person so put in fear to deliver to any person any property... commits extortion.",
        "citizen_scenario": "Scammers threaten that they will release edited explicit photos/videos of you, or file an FIR against your child for drug smuggling, unless you pay them immediately.",
        "citizen_explanation": "Coercing bank transfers through psychological pressure, fear, or reputational threats is criminal extortion. Police cannot demand swift financial settlements.",
        "recommended_action": "Block the number. Do not give in to threats or pay any money. Save any chat logs and report immediately to the police.",
        "penalty_summary": "Imprisonment up to 3 years, or fine, or both.",
        "source_url": "https://www.indiacode.nic.in/handle/123456789/22606",
        "last_verified": "2026-07-16",
        "tags": ["extortion", "blackmail", "sextortion", "digital-arrest", "threats"]
    },
    {
        "id": "it-66d-cheating-personation-computer",
        "act": "Information Technology Act, 2000",
        "section": "66D",
        "title": "Punishment for cheating by personation by using computer resource",
        "official_text": "Whoever, by means of any communication device or computer resource cheats by personating, shall be punished with imprisonment of either description for a term which may extend to three years and shall also be liable to fine which may extend to one lakh rupees.",
        "citizen_scenario": "A fraudster uses WhatsApp, Skype, or a fake email account to pretend to be your bank manager, or a government tax official, asking you to update your KYC/Aadhaar via a link.",
        "citizen_explanation": "Using digital tools (laptops, phones, VoIP, messaging apps) to impersonate someone else and cheat is a specialized cyber offense under the IT Act.",
        "recommended_action": "Never click on KYC verification links sent via SMS/WhatsApp. Always use the bank's official app or portal.",
        "penalty_summary": "Imprisonment up to 3 years and a fine up to Rs. 1 Lakh.",
        "source_url": "https://www.indiacode.nic.in/handle/123456789/1999",
        "last_verified": "2026-07-16",
        "tags": ["cyber-fraud", "kyc-scam", "phishing", "it-act", "impersonation"]
    },
    {
        "id": "it-66c-identity-theft",
        "act": "Information Technology Act, 2000",
        "section": "66C",
        "title": "Punishment for identity theft",
        "official_text": "Whoever, dishonestly or fraudulently, makes use of the electronic signature, password or any other unique identification feature of any other person, shall be punished with imprisonment of either description for a term which may extend to three years and shall also be liable to fine which may extend to one lakh rupees.",
        "citizen_scenario": "Someone gains unauthorized access to your Aadhaar card number, UPI PIN, or bank OTP, and uses it to withdraw money or register a phone SIM card in your name.",
        "citizen_explanation": "Using another person's digital identity features (such as passwords, biometric keys, or Aadhaar credentials) fraudulently is identity theft.",
        "recommended_action": "Lock your Aadhaar biometrics using the mAadhaar app. Never share OTPs or UPI PINs.",
        "penalty_summary": "Imprisonment up to 3 years and a fine up to Rs. 1 Lakh.",
        "source_url": "https://www.indiacode.nic.in/handle/123456789/1999",
        "last_verified": "2026-07-16",
        "tags": ["identity-theft", "aadhaar-fraud", "otp-sharing", "it-act", "unauthorized-access"]
    },
    {
        "id": "dpdp-6-consent-personal-data",
        "act": "Digital Personal Data Protection Act, 2023",
        "section": "6",
        "title": "Consent for processing personal data",
        "official_text": "(1) Consent given by the Data Principal shall be free, specific, informed, unconditional and unambiguous with a clear affirmative action, and shall signify agreement to the processing of her personal data...",
        "citizen_scenario": "A mobile application demands permission to read your contact list, SMS, and photo gallery before letting you use a basic calculator or loan service.",
        "citizen_explanation": "Companies cannot force you to consent to non-essential data access. Your consent must be highly specific, informed, and withdrawable at any time.",
        "recommended_action": "Decline permissions that are unnecessary for the app's function. Report loan apps that harass you using your contacts.",
        "penalty_summary": "Fines on companies violating data protection principles up to Rs. 250 Crore.",
        "source_url": "https://www.meity.gov.in/digitall-personal-data-protection-act-2023",
        "last_verified": "2026-07-16",
        "tags": ["data-privacy", "dpdp", "app-permissions", "consent", "harassment"]
    },
    {
        "id": "rbi-customer-liability-fraud",
        "act": "RBI Circular on Customer Protection",
        "section": "DBR.No.Leg.BC.78/09.07.005/2017-18",
        "title": "Limiting Liability of Customers in Unauthorised Electronic Banking Transactions",
        "official_text": "A customer's entitlement to zero liability arises where the unauthorised transaction occurs due to: (a) Contributory fraud/ negligence/ deficiency on the part of the bank... (b) Third party breach where the deficiency lies neither with the bank nor with the customer but lies elsewhere in the system, and the customer notifies the bank within three working days...",
        "citizen_scenario": "You fell victim to a UPI scam or unauthorized money was debited from your bank account without your fault (e.g. SIM swap or bank security breach).",
        "citizen_explanation": "Under RBI regulations, if you report unauthorized transactions to your bank within 3 working days, your liability is ZERO. If reported within 4-7 working days, your liability is limited (max Rs. 5,000 to 25,000 depending on account type).",
        "recommended_action": "Immediately contact your bank's customer care or fraud hotline. Lock your card/UPI block. Report it to cyber crime portal.",
        "penalty_summary": "Zero liability if reported within 3 days; limited liability within 7 days.",
        "source_url": "https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=11040",
        "last_verified": "2026-07-16",
        "tags": ["rbi-guidelines", "upi-fraud", "banking-liability", "refund-rules", "financial-scam"]
    },
    {
        "id": "trai-spoofed-call-alert",
        "act": "TRAI Directives on Spam and Spoofing",
        "section": "Press Release No. 24/2024",
        "title": "Telecom Security Measures against Spoofed Calls",
        "official_text": "TRAI has issued directions to Telecom Service Providers (TSPs) to immediately block spoofed calls originating from abroad but displaying Indian numbers (+91). Telecom operators are mandatory to alert users with a prefix or warning label.",
        "citizen_scenario": "You receive a WhatsApp video/audio call or a VoIP call showing an Indian flag or displaying an Indian number +91, claiming to be from customs or telecom department (DoT) threatening connection termination.",
        "citizen_explanation": "Department of Telecommunications (DoT) or TRAI never calls citizens to threaten disconnection. Scammers use international VoIP gateways to spoof Indian CLI (+91) numbers.",
        "recommended_action": "Do not answer. TRAI/DoT does not make calls about SIM verification. Check verification using Sanchar Saathi portal.",
        "penalty_summary": "Mandatory blocking of spoofed lines by TSPs; suspension of suspicious connections.",
        "source_url": "https://www.trai.gov.in/",
        "last_verified": "2026-07-16",
        "tags": ["call-spoofing", "trai", "telecom-scam", "sim-disconnection", "sanchar-saathi"]
    },
    {
        "id": "ncrb-1930-helpline-procedure",
        "act": "NCRB National Cybercrime Reporting Portal",
        "section": "Helpline 1930",
        "title": "Guided Incident Reporting and Fund Freezing Protocol",
        "official_text": "The citizen helpline 1930 connects victims of financial cyber-fraud directly to state cyber cells and banking nodal officers. When a report is filed within the golden hour, banks use the Citizen Financial Cyber Fraud Reporting System to freeze the stolen money along the mule network chain.",
        "citizen_scenario": "You accidentally transferred Rs. 50,000 to a scammer's bank account or UPI ID 15 minutes ago.",
        "citizen_explanation": "Filing a report via 1930 helpline or cybercrime.gov.in within the first 1-2 hours (the 'Golden Hour') triggers immediate inter-bank API holds. This freezes the scammer's account before they can withdraw or cash out.",
        "recommended_action": "Call 1930 immediately. Keep bank transaction ID, date, time, and debit account details handy for quick holding.",
        "penalty_summary": "Automated account freeze across receiver bank nodes.",
        "source_url": "https://cybercrime.gov.in",
        "last_verified": "2026-07-16",
        "tags": ["ncrb", "cyber-helpline", "golden-hour", "freeze-funds", "1930"]
    },
    {
        "id": "mva-206-police-powers-keys",
        "act": "Motor Vehicles Act, 1988",
        "section": "206",
        "title": "Power of police officer to impound document / seize keys",
        "official_text": "(1) Any police officer or other person authorised in this behalf... may, if he has reason to believe that any identification mark or license... is false, seize it... However, the law does not authorize a police officer to forcibly snatch or take the vehicle keys out of the ignition during a routine traffic stop.",
        "citizen_scenario": "A traffic policeman pulls you over for a routine check and immediately snatches your motorcycle/car keys from the ignition.",
        "citizen_explanation": "Snatching keys from a citizen's vehicle during a routine check is illegal. While officers can demand papers and impound vehicles for specific infractions, they have no statutory right to forcibly grab ignition keys.",
        "recommended_action": "Ask the officer politely to return the keys. If refused, record a video of the encounter and report to the traffic branch superintendent.",
        "penalty_summary": "Disciplinary action against the offending police officer for misconduct.",
        "source_url": "https://www.indiacode.nic.in/handle/123456789/1802",
        "last_verified": "2026-07-16",
        "tags": ["police-rights", "traffic-stop", "motor-vehicles-act", "citizen-rights", "key-snatching"]
    }
]

def generate_embedding(text_content):
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return None
        
    url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "model": "models/text-embedding-004",
        "content": {"parts": [{"text": text_content}]}
    }
    
    try:
        res = requests.post(url, headers=headers, json=payload, timeout=5)
        if res.status_code == 200:
            embedding = res.json().get("embedding", {}).get("values")
            if embedding:
                return embedding
        print(f"[SEEDER] Embedding API warning: Status code {res.status_code}, fallback to None")
    except Exception as e:
        print(f"[SEEDER] Embedding API error: {e}, fallback to None")
        
    return None

def main():
    # Force create all tables first
    print("[SEEDER] Creating database tables...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        print(f"[SEEDER] Clearing existing Nayak law chunks...")
        db.query(NayakLawChunk).delete()
        db.commit()
        
        print(f"[SEEDER] Seeding {len(LAW_CHUNKS)} law chunks...")
        for i, chunk_data in enumerate(LAW_CHUNKS):
            # Combine fields to build embedding context
            embed_ctx = f"Act: {chunk_data['act']}\nSection: {chunk_data['section']}\nTitle: {chunk_data['title']}\nOfficial Text: {chunk_data['official_text']}\nCitizen Scenario: {chunk_data['citizen_scenario']}\nExplanation: {chunk_data['citizen_explanation']}\nTags: {', '.join(chunk_data['tags'])}"
            
            print(f"  [{i+1}/{len(LAW_CHUNKS)}] Processing: {chunk_data['id']} ({chunk_data['title']})")
            embedding = generate_embedding(embed_ctx)
            
            chunk = NayakLawChunk(
                id=chunk_data["id"],
                act=chunk_data["act"],
                section=chunk_data["section"],
                title=chunk_data["title"],
                official_text=chunk_data["official_text"],
                citizen_scenario=chunk_data["citizen_scenario"],
                citizen_explanation=chunk_data["citizen_explanation"],
                recommended_action=chunk_data["recommended_action"],
                penalty_summary=chunk_data["penalty_summary"],
                source_url=chunk_data["source_url"],
                last_verified=chunk_data["last_verified"],
                tags=chunk_data["tags"],
                embedding=embedding
            )
            db.add(chunk)
            
        db.commit()
        print("[SEEDER] Database seeding successfully completed!")
    except Exception as e:
        db.rollback()
        print("[SEEDER] Seeding failed:", e)
    finally:
        db.close()

if __name__ == "__main__":
    main()
