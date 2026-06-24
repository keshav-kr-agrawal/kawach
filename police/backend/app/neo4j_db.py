import os
import json
import logging
from neo4j import GraphDatabase

logger = logging.getLogger("kawach.neo4j")

# Neo4j connection details
NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")

MOCK_GRAPH_FILE = os.path.join(os.path.dirname(__file__), "mock_neo4j_graph.json")

# In-memory graph data structure representing nodes and relationships
# Seeding 100+ entities
class MockNode:
    def __init__(self, id_val, labels, properties):
        self.id = id_val
        self.labels = labels
        self._properties = properties
        # Emulate dict-like access for node properties
        for k, v in properties.items():
            setattr(self, k, v)

    def __getitem__(self, key):
        return self._properties.get(key)

    def get(self, key, default=None):
        return self._properties.get(key, default)

    def items(self):
        return self._properties.items()

    @property
    def element_id(self):
        return str(self.id)

class MockRelationship:
    def __init__(self, id_val, type_val, start_node_id, end_node_id, properties):
        self.id = id_val
        self.type = type_val
        self.start_node_id = start_node_id
        self.end_node_id = end_node_id
        self._properties = properties

    def __getitem__(self, key):
        return self._properties.get(key)

    def get(self, key, default=None):
        return self._properties.get(key, default)

    def items(self):
        return self._properties.items()

class MockRecord:
    def __init__(self, keys, values):
        self._keys = keys
        self._values = values

    def keys(self):
        return self._keys

    def values(self):
        return self._values

    def get(self, key, default=None):
        if key in self._keys:
            return self._values[self._keys.index(key)]
        return default

    def __getitem__(self, item):
        if isinstance(item, int):
            return self._values[item]
        if item in self._keys:
            return self._values[self._keys.index(item)]
        raise KeyError(item)

class MockResult:
    def __init__(self, records):
        self._records = records
        self._index = 0

    def __iter__(self):
        return iter(self._records)

    def __next__(self):
        if self._index < len(self._records):
            val = self._records[self._index]
            self._index += 1
            return val
        raise StopIteration

    def data(self):
        # Format as list of dictionaries
        res = []
        for rec in self._records:
            row = {}
            for k, v in zip(rec.keys(), rec.values()):
                if isinstance(v, (MockNode, MockRelationship)):
                    row[k] = v._properties
                else:
                    row[k] = v
            res.append(row)
        return res

class MockSession:
    def __init__(self, graph_db):
        self.db = graph_db

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        pass

    def close(self):
        pass

    def run(self, query, parameters=None):
        query_upper = query.upper().strip()
        parameters = parameters or {}
        
        # Emulate MATCH (inc:Incident)-[:OCCURRED_AT]->(loc:Location)
        if "INCIDENT" in query_upper and "LOCATION" in query_upper and "OCCURRED_AT" in query_upper:
            records = []
            for rel in self.db.relationships.values():
                if rel.type == "OCCURRED_AT":
                    inc_node = self.db.nodes.get(rel.start_node_id)
                    loc_node = self.db.nodes.get(rel.end_node_id)
                    if inc_node and loc_node:
                        records.append(MockRecord(["inc", "loc"], [inc_node, loc_node]))
            return MockResult(records)

        # Emulate Match for alerts and XAI paths
        elif "MATCH" in query_upper and "RISK_SCORE" in query_upper:
            # Return high risk nodes
            records = []
            for n in self.db.nodes.values():
                if "Person" in n.labels and n.get("risk_score", 0) > 70:
                    records.append(MockRecord(["p"], [n]))
            return MockResult(records)
            
        # Fallback return all node lists
        else:
            # Parse nodes matching single label queries
            records = []
            for n in self.db.nodes.values():
                records.append(MockRecord(["n"], [n]))
            return MockResult(records)

    def execute_read(self, tx_func, *args, **kwargs):
        class MockTx:
            def run(self, q, p=None):
                return self.run(q, p)
        return tx_func(self, *args, **kwargs)

    def execute_write(self, tx_func, *args, **kwargs):
        return tx_func(self, *args, **kwargs)

class MockGraphDB:
    def __init__(self):
        self.nodes = {}
        self.relationships = {}
        self.load_from_json()

    def load_from_json(self):
        if os.path.exists(MOCK_GRAPH_FILE):
            try:
                with open(MOCK_GRAPH_FILE, "r") as f:
                    data = json.load(f)
                    for n in data.get("nodes", []):
                        self.nodes[n["id"]] = MockNode(n["id"], n["labels"], n["properties"])
                    for r in data.get("relationships", []):
                        self.relationships[r["id"]] = MockRelationship(
                            r["id"], r["type"], r["start_node"], r["end_node"], r["properties"]
                        )
                logger.info(f"Loaded {len(self.nodes)} nodes from mock JSON.")
                return
            except Exception as e:
                logger.error(f"Failed to load mock graph JSON: {e}")
        
        # Default fallback data: 100+ entities if no file exists
        self.generate_default_graph()

    def generate_default_graph(self):
        # Nodes
        # Incidents
        incident_types = [
            ("ANPR Spotting", "Known gang associate vehicle entered Koramangala hotspot.", "Critical"),
            ("CCTV Crowd Alert", "High-density crowd formation - 15+ people detected at Town Hall.", "High"),
            ("Restricted Entry", "Trespassing - Restricted Zone violation flagged at harbor checkpoint.", "Critical"),
            ("Cyber Fraud", "UPI digital arrest scam registry flag spotted from suspect node.", "High"),
            ("Burglary Spike", "Reported night housebreak burglaries cluster detected.", "High")
        ]
        
        # Let's seed 30 locations in Karnataka (focusing on Bengaluru Urban, Koramangala, Indiranagar, etc.)
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
            ("L-10", "Mangaluru Harbor Portal", 12.8700, 74.8800, "Secure Port")
        ]
        
        # Expand coordinates list to reach 100+ total mock elements (nodes + relations)
        # Add locations to nodes
        for l_id, name, lat, lng, l_type in locations:
            self.nodes[l_id] = MockNode(l_id, ["Location"], {"id": l_id, "name": name, "lat": lat, "lng": lng, "type": l_type})
            
        # Add Incidents
        for i in range(1, 25):
            inc_id = f"I-{i}"
            itype, desc, t_level = incident_types[i % len(incident_types)]
            # Add some jitter to date
            timestamp = f"2026-06-24T{12-i//2:02d}:{(i*7)%60:02d}:00"
            self.nodes[inc_id] = MockNode(inc_id, ["Incident"], {
                "id": inc_id,
                "type": itype,
                "description": desc,
                "threat_level": t_level,
                "timestamp": timestamp
            })
            # Relationship: Incident occurred at location
            rel_id = f"R-IO-{i}"
            loc_id = f"L-{(i % len(locations)) + 1}"
            self.relationships[rel_id] = MockRelationship(rel_id, "OCCURRED_AT", inc_id, loc_id, {})

        # Persons
        persons = [
            ("P-1", "Ramesh K.", 88),
            ("P-2", "John Kumar", 75),
            ("P-3", "Jon Offender", 92),
            ("P-4", "Suresh G.", 45),
            ("P-5", "Anil Sharma", 81),
            ("P-6", "Vijay Prasad", 62),
            ("P-7", "Gang Leader Rocky", 95),
            ("P-8", "Vikram Rathore", 30)
        ]
        for p_id, name, r_score in persons:
            self.nodes[p_id] = MockNode(p_id, ["Person"], {"id": p_id, "name": name, "risk_score": r_score})

        # Relationship: Person associations
        self.relationships["R-PA-1"] = MockRelationship("R-PA-1", "ASSOCIATED_WITH", "P-1", "P-7", {})
        self.relationships["R-PA-2"] = MockRelationship("R-PA-2", "ASSOCIATED_WITH", "P-2", "P-1", {})
        self.relationships["R-PA-3"] = MockRelationship("R-PA-3", "ASSOCIATED_WITH", "P-3", "P-7", {})
        self.relationships["R-PA-4"] = MockRelationship("R-PA-4", "ASSOCIATED_WITH", "P-5", "P-3", {})

        # Phones
        for i in range(1, 15):
            ph_id = f"PH-{i}"
            number = f"98765432{i:02d}"
            self.nodes[ph_id] = MockNode(ph_id, ["Phone"], {"id": ph_id, "number": number, "type": "Mobile"})
            # OWNED relation
            p_id = f"P-{(i % len(persons)) + 1}"
            self.relationships[f"R-PO-{i}"] = MockRelationship(f"R-PO-{i}", "OWNED", p_id, ph_id, {})

        # Phone calls
        self.relationships["R-PC-1"] = MockRelationship("R-PC-1", "CALLED", "PH-1", "PH-7", {"duration": 120})
        self.relationships["R-PC-2"] = MockRelationship("R-PC-2", "CALLED", "PH-2", "PH-1", {"duration": 45})
        self.relationships["R-PC-3"] = MockRelationship("R-PC-3", "CALLED", "PH-3", "PH-7", {"duration": 300})

        # Bank accounts
        for i in range(1, 12):
            ba_id = f"BA-{i}"
            acc = f"ACC1000200{i:02d}"
            self.nodes[ba_id] = MockNode(ba_id, ["BankAccount"], {"id": ba_id, "account_no": acc, "ifsc": "SBIN0004401"})

        # Financial Transfers
        self.relationships["R-FT-1"] = MockRelationship("R-FT-1", "TRANSFERRED_TO", "BA-1", "BA-2", {"amount": 50000, "date": "2026-06-23"})
        self.relationships["R-FT-2"] = MockRelationship("R-FT-2", "TRANSFERRED_TO", "BA-3", "BA-1", {"amount": 125000, "date": "2026-06-24"})
        self.relationships["R-FT-3"] = MockRelationship("R-FT-3", "TRANSFERRED_TO", "BA-2", "BA-5", {"amount": 35000, "date": "2026-06-22"})

        # IP Addresses
        for i in range(1, 10):
            ip_id = f"IP-{i}"
            addr = f"192.168.4.{i*15}"
            self.nodes[ip_id] = MockNode(ip_id, ["IP_Address"], {"id": ip_id, "address": addr})

class MockNeo4jDriver:
    def __init__(self):
        self.db = MockGraphDB()

    def session(self, **kwargs):
        return MockSession(self.db)

    def close(self):
        pass

    def verify_connectivity(self):
        pass

# Initialize driver (attempt real connection, fall back to mock)
driver = None
is_mock = False

try:
    # Attempting to construct real Neo4j driver
    # Set a connection timeout of 2 seconds so FastAPI doesn't hang on startup
    driver = GraphDatabase.driver(
        NEO4J_URI, 
        auth=(NEO4J_USER, NEO4J_PASSWORD),
        connection_timeout=2.0,
        max_connection_lifetime=30.0
    )
    # Check connectivity
    driver.verify_connectivity()
    logger.info("Successfully connected to active Neo4j database.")
except Exception as e:
    logger.warning(f"Neo4j Bolt connection failed ({e}). Falling back to In-Memory Mock Graph.")
    driver = MockNeo4jDriver()
    is_mock = True

def get_neo4j_db():
    session = driver.session()
    try:
        yield session
    finally:
        session.close()
