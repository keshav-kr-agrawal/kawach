import os
import json
import requests
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base, engine, SessionLocal
from app.models import NayakLawChunk
from app.scripts.seed_nayak import LAW_CHUNKS, generate_embedding

# Standardized rulebook path
RULEBOOK_DIR = "/Users/keshav/zoho/standardized_rulebook"

# Normalize text helper to map files to custom seeded safety chunks
def get_safety_chunk_override(act_title, sec_num):
    act_lower = act_title.lower()
    sec_clean = str(sec_num).strip().lower()
    
    # Check against our 10 safety chunks
    for s_chunk in LAW_CHUNKS:
        s_act = s_chunk["act"].lower()
        s_sec = str(s_chunk["section"]).strip().lower()
        
        # Match "BNS" or "Bharatiya Nyaya"
        if ("bharatiya nyaya" in act_lower and "bharatiya nyaya" in s_act) or \
           ("information technology" in act_lower and "information technology" in s_act) or \
           ("motor vehicles" in act_lower and "motor vehicles" in s_act) or \
           ("digital personal data" in act_lower and "digital personal data" in s_act):
            if sec_clean == s_sec:
                return s_chunk
                
        # Match RBI/TRAI/NCRB directly since they are special
        if sec_clean == s_sec and s_chunk["id"] in ["rbi-customer-liability-fraud", "trai-spoofed-call-alert", "ncrb-1930-helpline-procedure"]:
            return s_chunk
            
    return None

def main():
    print("[RULEBOOK-SEEDER] Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        print("[RULEBOOK-SEEDER] Clearing existing law chunks...")
        db.query(NayakLawChunk).delete()
        db.commit()
        
        # 1. First, register the 10 high-quality safety chunks with real/fallback embeddings
        seeded_ids = set()
        safety_chunks_models = []
        
        print(f"[RULEBOOK-SEEDER] Pre-seeding {len(LAW_CHUNKS)} core safety chunks...")
        for chunk_data in LAW_CHUNKS:
            embed_ctx = f"Act: {chunk_data['act']}\nSection: {chunk_data['section']}\nTitle: {chunk_data['title']}\nOfficial Text: {chunk_data['official_text']}\nCitizen Scenario: {chunk_data['citizen_scenario']}\nExplanation: {chunk_data['citizen_explanation']}\nTags: {', '.join(chunk_data['tags'])}"
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
            safety_chunks_models.append(chunk)
            seeded_ids.add(chunk_data["id"])
            
        db.add_all(safety_chunks_models)
        db.commit()
        print("[RULEBOOK-SEEDER] Core safety chunks seeded successfully.")
        
        # 2. Iterate through standardized rulebook directory
        print(f"[RULEBOOK-SEEDER] Scanning directory: {RULEBOOK_DIR}")
        all_chunks_to_insert = []
        
        for filename in sorted(os.listdir(RULEBOOK_DIR)):
            if not filename.endswith(".json") or filename == "verify_integrity.json":
                continue
                
            file_path = os.path.join(RULEBOOK_DIR, filename)
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    
                doc_title = data.get("document_title", filename.replace(".json", "").replace("_", " "))
                chapters = data.get("chapters", [])
                
                print(f"  -> Processing rulebook file: {filename} ('{doc_title}')")
                
                for chapter in chapters:
                    sections = chapter.get("sections", [])
                    for sec in sections:
                        sec_num = str(sec.get("section_number", "")).strip()
                        sec_title = sec.get("title", "").strip()
                        sec_text = sec.get("text", "").strip()
                        
                        if not sec_num or not sec_text:
                            continue
                            
                        # Generate normalized ID
                        chunk_id = f"{filename.replace('.json', '').lower()}-{sec_num}"
                        
                        # If this section is already overridden by one of our safety chunks, skip importing it again
                        override_chunk = get_safety_chunk_override(doc_title, sec_num)
                        if override_chunk:
                            # We already seeded it in step 1, skip duplicate
                            continue
                            
                        if chunk_id in seeded_ids:
                            continue
                            
                        # Create standard fallbacks for citizen readable columns
                        citizen_scenario = f"You are dealing with a scenario involving '{sec_title}' under the '{doc_title}'."
                        citizen_explanation = f"Section {sec_num} of {doc_title} regulates '{sec_title}'. Officially, it states that: {sec_text[:250]}..."
                        recommended_action = f"Verify the applicability of Section {sec_num} with a legal counsel or by reading the complete chapter regarding '{sec_title}'."
                        penalty_summary = f"Refer to the penalty provisions outlined in the {doc_title} for violations of Section {sec_num}."
                        
                        # Generate tags
                        tags = [
                            doc_title.split(",")[0].lower().replace(" ", "-"),
                            "legal-code",
                            sec_title.lower().split()[0] if sec_title.split() else "law"
                        ]
                        
                        chunk = NayakLawChunk(
                            id=chunk_id,
                            act=doc_title,
                            section=sec_num,
                            title=sec_title,
                            official_text=sec_text,
                            citizen_scenario=citizen_scenario,
                            citizen_explanation=citizen_explanation,
                            recommended_action=recommended_action,
                            penalty_summary=penalty_summary,
                            source_url=f"https://www.indiacode.nic.in/",
                            last_verified="2026-07-16",
                            tags=tags,
                            embedding=None  # Set to None, vector similarity will fall back to keyword matching for these sections
                        )
                        all_chunks_to_insert.append(chunk)
                        seeded_ids.add(chunk_id)
                        
            except Exception as e:
                print(f"    [Warning] Failed to parse {filename}: {e}")
                
        # Bulk insert the rest
        if all_chunks_to_insert:
            print(f"[RULEBOOK-SEEDER] Bulk inserting {len(all_chunks_to_insert)} additional sections...")
            db.add_all(all_chunks_to_insert)
            db.commit()
            
        print(f"[RULEBOOK-SEEDER] Seeding completed! Total chunks in database: {len(seeded_ids)}")
    except Exception as e:
        db.rollback()
        print("[RULEBOOK-SEEDER] Seeding failed:", e)
    finally:
        db.close()

if __name__ == "__main__":
    main()
