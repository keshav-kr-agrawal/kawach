import os
import sys
import unittest

# Adjust path to find app module
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models import NayakSession, NayakMessage, NayakLawChunk

class TestNayakAssistant(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        cls.db = SessionLocal()
        
    @classmethod
    def tearDownClass(cls):
        cls.db.close()
        
    def test_01_health_check(self):
        """Test main FastAPI home endpoint"""
        res = self.client.get("/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("message", res.json())
        
    def test_02_nayak_sessions(self):
        """Test listing and creating chat sessions"""
        # List sessions (should be empty or list existing ones)
        res = self.client.get("/api/nayak/sessions", headers={"X-User-Id": "test-citizen-uuid"})
        self.assertEqual(res.status_code, 200)
        self.assertIsInstance(res.json(), list)
        
    def test_03_nayak_chat_fallback(self):
        """Test chat interaction endpoint with fallback flow triggers"""
        payload = {
            "message": "CBI video call placing me under digital arrest help",
            "lat": 12.9716,
            "lng": 77.5946
        }
        res = self.client.post(
            "/api/nayak/chat", 
            json=payload,
            headers={"X-User-Id": "test-citizen-uuid"}
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("session_id", data)
        self.assertIn("message", data)
        self.assertIn("content", data["message"])
        # Should trigger the digital arrest warning
        self.assertIn("DIGITAL ARREST", data["message"]["content"].upper())
        
    def test_04_nayak_chat_history(self):
        """Test retrieving message history of active session"""
        # Create session
        payload = {
            "message": "Is HSR layout safe to walk?",
            "lat": 12.9716,
            "lng": 77.5946
        }
        res1 = self.client.post(
            "/api/nayak/chat", 
            json=payload,
            headers={"X-User-Id": "test-citizen-uuid"}
        )
        self.assertEqual(res1.status_code, 200)
        sess_id = res1.json()["session_id"]
        
        # Fetch history
        res2 = self.client.get(
            f"/api/nayak/sessions/{sess_id}/messages",
            headers={"X-User-Id": "test-citizen-uuid"}
        )
        self.assertEqual(res2.status_code, 200)
        messages = res2.json()
        self.assertGreaterEqual(len(messages), 2)
        self.assertEqual(messages[0]["role"], "user")
        self.assertEqual(messages[1]["role"], "assistant")
        
    def test_05_link_classifier(self):
        """Test check_link endpoint locally"""
        from app.routes.nayak import run_check_link
        
        # 1. Official domain check
        res_official = run_check_link("https://uidai.gov.in/en/")
        self.assertEqual(res_official["verdict"], "official")
        
        # 2. Typosquat check
        res_fake = run_check_link("http://cbi-court-verification.xyz/login")
        self.assertEqual(res_fake["verdict"], "confirmed_fake")
        
    def test_06_text_classifier(self):
        """Test classify_text script detection locally"""
        from app.routes.nayak import run_classify_text
        
        res_scam = run_classify_text("Verify this custom digital arrest order from Customs department")
        self.assertTrue(res_scam["is_scam"])
        self.assertEqual(res_scam["matched_pattern"], "Digital Arrest / Impersonation script")

    def test_07_search_law(self):
        """Test search_law endpoint with query terms"""
        res = self.client.get("/api/nayak/search?query=cheating")
        self.assertEqual(res.status_code, 200)
        results = res.json()
        self.assertIsInstance(results, list)
        self.assertGreater(len(results), 0)
        # Cheating should match BNS Section 318 or IPC Section 415
        self.assertIn(results[0]["section"], ["318", "415"])

if __name__ == "__main__":
    unittest.main()
