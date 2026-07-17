import os
import sys
import unittest

# Adjust path to find app module
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

# Force GEMINI_API_KEY to be empty for this test
os.environ["GEMINI_API_KEY"] = ""

from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models import NayakLawChunk

class TestNoApiKeyNayak(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.db = SessionLocal()
        
    @classmethod
    def tearDownClass(cls):
        cls.db.close()
        
    def test_01_verify_untracked_key(self):
        """Confirm that GEMINI_API_KEY is empty"""
        self.assertEqual(os.environ.get("GEMINI_API_KEY"), "")
        
    def test_02_search_cheating(self):
        """Test RAG search for 'cheating' keyword without API key"""
        res = self.client.get("/api/nayak/search?query=cheating")
        self.assertEqual(res.status_code, 200)
        results = res.json()
        self.assertGreater(len(results), 0)
        
        # Check that cheating-related acts are matched
        matched_acts = [r["act"].lower() for r in results]
        self.assertTrue(any("nyaya" in act or "penal" in act for act in matched_acts))
        print("\n[TEST] Search for 'cheating' returned acts:", [r["act"] + " Sec " + r["section"] for r in results])
        
    def test_03_search_corruption_bribe(self):
        """Test RAG search for 'bribe' keyword without API key"""
        res = self.client.get("/api/nayak/search?query=bribe")
        self.assertEqual(res.status_code, 200)
        results = res.json()
        self.assertGreater(len(results), 0)
        
        matched_acts = [r["act"].lower() for r in results]
        self.assertTrue(any("corruption" in act or "nyaya" in act or "penal" in act for act in matched_acts))
        print("[TEST] Search for 'bribe' returned acts:", [r["act"] + " Sec " + r["section"] for r in results])
        
    def test_04_search_eviction_tenant(self):
        """Test RAG search for tenant eviction queries"""
        res = self.client.get("/api/nayak/search?query=eviction notice landlord")
        self.assertEqual(res.status_code, 200)
        results = res.json()
        self.assertGreater(len(results), 0)
        
        matched_acts = [r["act"].lower() for r in results]
        # Should match Rent Control, Contract, or other relevant codes
        print("[TEST] Search for 'eviction notice' returned acts:", [r["act"] + " Sec " + r["section"] for r in results])

    def test_05_chatbot_fallback_extortion(self):
        """Test chatbot fallback flow for extortion warning trigger"""
        payload = {
            "message": "Someone is blackmailing me saying they will share my photos unless I transfer money",
            "lat": 12.9716,
            "lng": 77.5946
        }
        res = self.client.post(
            "/api/nayak/chat", 
            json=payload,
            headers={"X-User-Id": "test-no-key-user"}
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("message", data)
        content = data["message"]["content"]
        
        # Verify that it includes the fallback warning and citation details
        self.assertIn("EXTORTION", content.upper())
        self.assertIn("📚", content)
        print("[TEST] Chatbot fallback response for blackmail/extortion query:\n", content[:250], "...\n")

if __name__ == "__main__":
    unittest.main()
