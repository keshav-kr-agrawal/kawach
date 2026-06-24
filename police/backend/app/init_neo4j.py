import os
import json
from neo4j import GraphDatabase

# Connection settings
NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")

MOCK_GRAPH_FILE = os.path.join(os.path.dirname(__file__), "mock_neo4j_graph.json")

def build_graph_data():
    nodes = []
    relationships = []

    # Locations (coordinates in Karnataka)
    locations = [
        ("L-1", "Koramangala 80ft Ring Rd", 12.9345, 77.6256, "Hotspot"),
        ("L-2", "Town Hall Entrance", 12.9634, 77.5855, "Public Ground"),
        ("L-3", "Coastal Warehouse Zone", 12.9200, 77.6700, "Restricted Checkpoint"),
        ("L-4", "Indiranagar 100ft Rd", 12.9718, 77.6411, "Hotspot"),
        ("L-5", "HSR Layout Sector 1", 12.9105, 77.6450, "Residential"),
        ("L-6", "Jayanagar 4th Block", 12.9284, 77.5913, "Market Area"),
        ("L-7", "Whitefield ITPL Gate", 12.9840, 77.7340, "Industrial Area"),
        ("L-8", "Malleshwaram Metro", 12.9984, 77.5702, "Transit Hub"),
        ("L-9", "Mysuru Palace Gate", 12.3051, 76.6551, "Historical Hub"),
        ("L-10", "Mangaluru Harbor Portal", 12.8700, 74.8800, "Secure Port"),
        ("L-11", "Hubballi Station Yard", 15.3524, 75.1384, "Transit Hub"),
        ("L-12", "Belagavi Central Ward", 15.8497, 74.4977, "Residential")
    ]
    
    for l_id, name, lat, lng, l_type in locations:
        nodes.append({
            "id": l_id,
            "labels": ["Location"],
            "properties": {"id": l_id, "name": name, "lat": lat, "lng": lng, "type": l_type}
        })

    # Persons (including repeat offenders)
    persons = [
        ("P-1", "Ramesh K.", 88),
        ("P-2", "John Kumar", 75),
        ("P-3", "Jon Offender", 92),
        ("P-4", "Suresh G.", 45),
        ("P-5", "Anil Sharma", 81),
        ("P-6", "Vijay Prasad", 62),
        ("P-7", "Gang Leader Rocky", 95),
        ("P-8", "Vikram Rathore", 30),
        ("P-9", "Amit Shah", 55),
        ("P-10", "Dinesh Karthik", 78),
        ("P-11", "Manoj Bajpayee", 40),
        ("P-12", "Nitin Gadkari", 15)
    ]
    
    for p_id, name, r_score in persons:
        nodes.append({
            "id": p_id,
            "labels": ["Person"],
            "properties": {"id": p_id, "name": name, "risk_score": r_score}
        })

    # Incidents (with locations and dates)
    incidents = [
        ("I-1", "ANPR Spotting", "CRITICAL: Known gang associate vehicle spotted entering Koramangala hotspot.", "Critical", "2026-06-24T12:00:00"),
        ("I-2", "CCTV Crowd Alert", "HIGH: Crowd formation - 15+ people detected near Town Hall entrance.", "High", "2026-06-24T11:45:00"),
        ("I-3", "Restricted Entry", "CRITICAL: Trespassing - Restricted Zone violation flagged at harbor checkpoint.", "Critical", "2026-06-24T11:10:00"),
        ("I-4", "Cyber Fraud", "HIGH: Suspicious UPI digital arrest scam registry flag spotted from suspect node.", "High", "2026-06-24T10:30:00"),
        ("I-5", "Burglary Spike", "WARNING: Burglary spike - 3 break-ins within 2km radius inside Jayanagar.", "High", "2026-06-23T23:15:00"),
        ("I-6", "Vehicle Theft", "CRITICAL: Stolen SUV tracked traversing Indiranagar bypass.", "Critical", "2026-06-24T08:20:00"),
        ("I-7", "Acoustic Detection", "CRITICAL: Low-caliber firearm discharge signature mapped near Whitefield.", "Critical", "2026-06-24T05:12:00"),
        ("I-8", "Digital arrest trigger", "WARNING: Voice-cloned extortion calls targeting senior citizen in Mysuru.", "High", "2026-06-24T09:40:00")
    ]
    
    # Generate 20 more mock incidents to reach 100+ total graph nodes/edges
    for idx in range(9, 31):
        i_id = f"I-{idx}"
        itype = "General Alert" if idx % 2 == 0 else "Nuisance Spurt"
        t_level = "High" if idx % 3 == 0 else "Medium"
        nodes.append({
            "id": i_id,
            "labels": ["Incident"],
            "properties": {
                "id": i_id,
                "type": itype,
                "description": f"Incident registry check ID #{4400+idx} flagged at station beat.",
                "threat_level": t_level,
                "timestamp": f"2026-06-24T{12-(idx//3):02d}:{(idx*9)%60:02d}:00"
            }
        })
        # OCCURRED_AT links
        loc_id = f"L-{(idx % len(locations)) + 1}"
        relationships.append({
            "id": f"R-IO-{idx}",
            "type": "OCCURRED_AT",
            "start_node": i_id,
            "end_node": loc_id,
            "properties": {}
        })

    # Link standard incidents to locations
    for idx, (i_id, itype, desc, t_level, stamp) in enumerate(incidents):
        nodes.append({
            "id": i_id,
            "labels": ["Incident"],
            "properties": {"id": i_id, "type": itype, "description": desc, "threat_level": t_level, "timestamp": stamp}
        })
        loc_id = f"L-{(idx % len(locations)) + 1}"
        relationships.append({
            "id": f"R-IO-{idx+1}",
            "type": "OCCURRED_AT",
            "start_node": i_id,
            "end_node": loc_id,
            "properties": {}
        })

    # Associated Persons
    person_links = [
        ("P-1", "P-7"), ("P-2", "P-1"), ("P-3", "P-7"), ("P-5", "P-3"),
        ("P-10", "P-1"), ("P-6", "P-5"), ("P-9", "P-7"), ("P-2", "P-10")
    ]
    for idx, (p1, p2) in enumerate(person_links):
        relationships.append({
            "id": f"R-PA-{idx+1}",
            "type": "ASSOCIATED_WITH",
            "start_node": p1,
            "end_node": p2,
            "properties": {}
        })

    # Phones
    for idx in range(1, 20):
        ph_id = f"PH-{idx}"
        number = f"98765432{idx:02d}"
        nodes.append({
            "id": ph_id,
            "labels": ["Phone"],
            "properties": {"id": ph_id, "number": number, "type": "Mobile"}
        })
        p_id = f"P-{(idx % len(persons)) + 1}"
        relationships.append({
            "id": f"R-PO-{idx}",
            "type": "OWNED",
            "start_node": p_id,
            "end_node": ph_id,
            "properties": {}
        })

    # Calls
    call_links = [
        ("PH-1", "PH-7"), ("PH-2", "PH-1"), ("PH-3", "PH-7"), ("PH-10", "PH-2"),
        ("PH-5", "PH-9"), ("PH-11", "PH-3"), ("PH-4", "PH-1"), ("PH-12", "PH-5")
    ]
    for idx, (ph1, ph2) in enumerate(call_links):
        relationships.append({
            "id": f"R-PC-{idx+1}",
            "type": "CALLED",
            "start_node": ph1,
            "end_node": ph2,
            "properties": {"duration": 40 * (idx + 1)}
        })

    # Bank Accounts & Transfers
    for idx in range(1, 15):
        ba_id = f"BA-{idx}"
        nodes.append({
            "id": ba_id,
            "labels": ["BankAccount"],
            "properties": {"id": ba_id, "account_no": f"ACC44018800{idx:02d}", "ifsc": "SBIN0004401"}
        })

    transfers = [
        ("BA-1", "BA-2", 45000), ("BA-3", "BA-1", 112000), ("BA-2", "BA-5", 35000),
        ("BA-7", "BA-3", 95000), ("BA-4", "BA-1", 10000), ("BA-12", "BA-7", 220000)
    ]
    for idx, (b1, b2, amt) in enumerate(transfers):
        relationships.append({
            "id": f"R-FT-{idx+1}",
            "type": "TRANSFERRED_TO",
            "start_node": b1,
            "end_node": b2,
            "properties": {"amount": amt, "date": "2026-06-24"}
        })

    # IP Addresses
    for idx in range(1, 15):
        ip_id = f"IP-{idx}"
        nodes.append({
            "id": ip_id,
            "labels": ["IP_Address"],
            "properties": {"id": ip_id, "address": f"10.22.140.{idx*10}"}
        })

    return {"nodes": nodes, "relationships": relationships}

def seed_real_neo4j(graph_data):
    print("Attempting to connect to live Neo4j database...")
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    try:
        with driver.session() as session:
            # Clear existing data first
            print("Purging existing Neo4j data...")
            session.run("MATCH (n) DETACH DELETE n")

            print("Injecting nodes...")
            for node in graph_data["nodes"]:
                label = node["labels"][0]
                props_str = ", ".join([f"{k}: ${k}" for k in node["properties"].keys()])
                query = f"CREATE (n:{label} {{{props_str}}})"
                session.run(query, node["properties"])

            print("Injecting relationships...")
            for rel in graph_data["relationships"]:
                query = f"""
                MATCH (a) WHERE a.id = $start_node
                MATCH (b) WHERE b.id = $end_node
                CREATE (a)-[r:{rel['type']}]->(b)
                """
                session.run(query, {
                    "start_node": rel["start_node"],
                    "end_node": rel["end_node"]
                })
        print("[SUCCESS] Live Neo4j database fully seeded!")
        return True
    except Exception as e:
        print(f"[WARNING] Live Neo4j seeding failed: {e}")
        return False
    finally:
        driver.close()

def main():
    graph_data = build_graph_data()
    
    # Attempt real database seed
    seeded = seed_real_neo4j(graph_data)
    
    # Always write to JSON as fallback cache (so the mock server reads it)
    print(f"Writing mock graph schema file to {MOCK_GRAPH_FILE}...")
    with open(MOCK_GRAPH_FILE, "w") as f:
        json.dump(graph_data, f, indent=2)
    print(f"[SUCCESS] Mock graph config file containing {len(graph_data['nodes'])} nodes saved.")

if __name__ == "__main__":
    main()
