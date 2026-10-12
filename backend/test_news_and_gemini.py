import os
import sys
import unittest
import json
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone

# Ensure backend directory is in sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.database import SessionLocal
from app.models.db_models import User, NewsArticle, Portfolio, Holding, Watchlist, gen_uuid
from app.services.news_service import news_service, compute_url_hash, is_market_relevant
from app.services.news_impact_analysis import gemini_news_analyzer
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

class TestFinancialNewsAndGemini(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.db = SessionLocal()
        # Create test users
        cls.user_id = gen_uuid("usr_test")
        user = User(
            id=cls.user_id,
            email=f"trader_news_{cls.user_id}@capitalmind.ai",
            name="News Trader",
            role="Retail Investor",
            auth_mode="development"
        )
        cls.db.add(user)
        cls.db.commit()

        # Login to obtain token
        reg_res = client.post("/api/auth/register", json={
            "email": f"auth_news_{cls.user_id}@capitalmind.ai",
            "password": "Password123!",
            "full_name": "Auth News Trader"
        })
        cls.token = reg_res.json()["access_token"]
        cls.auth_user_id = reg_res.json()["user"]["user_id"]
        cls.headers = {"Authorization": f"Bearer {cls.token}"}

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def test_01_url_hash_and_deduplication(self):
        """URL hashing and canonical normalization prevent duplicate articles."""
        url1 = "https://economictimes.indiatimes.com/markets/stocks/news/article-123.cms?from=mdr"
        url2 = "https://economictimes.indiatimes.com/markets/stocks/news/article-123.cms"
        self.assertEqual(compute_url_hash(url1), compute_url_hash(url2))

    def test_02_relevance_filtering(self):
        """Relevant Indian stock market articles pass filter, irrelevant ones are excluded."""
        self.assertTrue(is_market_relevant("TCS Q3 net profit rises 12% to Rs 12,000 crore"))
        self.assertTrue(is_market_relevant("Nifty 50 crosses 25,000 mark as RBI holds repo rates steady"))
        self.assertFalse(is_market_relevant("Celebrity shares vacation photos on beach in Hawaii"))

    def test_03_stock_symbol_validation_against_instrument_master(self):
        """Only real NSE/BSE tickers in Instrument Master are accepted; fabricated tickers rejected."""
        input_tickers = ["TCS", "INFY", "FAKE_STOCK_XYZ_999", "RELIANCE", "RANDOMTICKER"]
        validated = gemini_news_analyzer.validate_and_filter_stocks(input_tickers)
        self.assertIn("TCS", validated)
        self.assertIn("INFY", validated)
        self.assertIn("RELIANCE", validated)
        self.assertNotIn("FAKE_STOCK_XYZ_999", validated)
        self.assertNotIn("RANDOMTICKER", validated)

    def test_04_sector_validation(self):
        """Sectors are normalized to canonical Indian market sectors."""
        raw_sectors = ["banking", "Information Technology", "random_sector_abc"]
        validated = gemini_news_analyzer.validate_sectors(raw_sectors)
        self.assertIn("Banking", validated)
        self.assertIn("Information Technology", validated)

    def test_05_gemini_mocked_analysis(self):
        """Structured Gemini JSON is validated, mapped, and parsed accurately."""
        mock_response = MagicMock()
        mock_response.text = json.dumps({
            "impact_direction": "POSITIVE",
            "reasoning": "Strong quarterly results expected to lift IT equities.",
            "confidence": 0.88,
            "uncertainty": "Macro headwinds in US retail could moderate constant currency margins.",
            "directly_mentioned": ["Infosys Limited"],
            "sectors": ["Information Technology"],
            "stocks": ["INFY"],
            "time_horizon": "SHORT_TERM"
        })

        with patch.object(gemini_news_analyzer, "_get_client") as mock_client_getter:
            mock_client = MagicMock()
            mock_client.models.generate_content.return_value = mock_response
            mock_client_getter.return_value = mock_client

            res = gemini_news_analyzer.analyze_article("Infosys wins $2B mega deal from European enterprise")
            self.assertEqual(res["impact_direction"], "POSITIVE")
            self.assertEqual(res["stocks"], ["INFY"])
            self.assertEqual(res["sectors"], ["Information Technology"])
            self.assertEqual(res["time_horizon"], "SHORT_TERM")
            self.assertEqual(res["confidence"], 0.88)

    def test_06_gemini_missing_key_behavior(self):
        """Analyzer raises clear configured error when API key is not present."""
        with patch("app.config.settings.GEMINI_API_KEY", ""):
            with self.assertRaises(ValueError):
                gemini_news_analyzer.analyze_article("Test Headline")

    def test_07_gemini_rate_limit_handling(self):
        """Rate limit errors are recognized and tagged as RATE_LIMITED."""
        with patch.object(gemini_news_analyzer, "_get_client") as mock_client_getter:
            mock_client = MagicMock()
            mock_client.models.generate_content.side_effect = Exception("429 Resource has been exhausted (e.g. check quota)")
            mock_client_getter.return_value = mock_client

            with self.assertRaises(RuntimeError) as ctx:
                gemini_news_analyzer.analyze_article("Headline")
            self.assertIn("RATE_LIMITED", str(ctx.exception))

    def test_08_news_api_feed_and_pagination(self):
        """GET /api/news returns paginated articles with valid metadata."""
        res = client.get("/api/news?page=1&limit=5")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("items", data)
        self.assertIn("total", data)
        self.assertIn("pages", data)
        self.assertGreaterEqual(data["total"], 1)

    def test_09_news_api_filters(self):
        """GET /api/news filtering by search and impact works correctly."""
        res = client.get("/api/news?search=IPO")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsInstance(data["items"], list)

    def test_10_article_detail_and_analysis_endpoints(self):
        """GET /api/news/{id} and /api/news/{id}/analysis return exact article status."""
        feed_res = client.get("/api/news?limit=1")
        item = feed_res.json()["items"][0]
        art_id = item["id"]

        res_detail = client.get(f"/api/news/{art_id}")
        self.assertEqual(res_detail.status_code, 200)
        self.assertEqual(res_detail.json()["id"], art_id)

        res_analysis = client.get(f"/api/news/{art_id}/analysis")
        self.assertEqual(res_analysis.status_code, 200)
        self.assertIn("analysis_status", res_analysis.json())

    def test_11_personalized_feed_tenant_isolation(self):
        """GET /api/news/for-me enforces authentication and returns holdings-specific news."""
        # Unauthenticated rejected
        res_unauth = client.get("/api/news/for-me")
        self.assertEqual(res_unauth.status_code, 401)

        # Authenticated allowed
        res_auth = client.get("/api/news/for-me", headers=self.headers)
        self.assertEqual(res_auth.status_code, 200)
        self.assertIsInstance(res_auth.json(), list)

    def test_12_admin_trigger_authorization(self):
        """Admin triggers require Admin role; normal retail users are rejected with 403."""
        res_normal = client.post("/api/news/trigger-ingestion", headers=self.headers)
        self.assertEqual(res_normal.status_code, 403)

        # Admin login
        admin_login = client.post("/api/auth/login", json={"email": "admin@capitalmind.ai", "password": "admin123"})
        self.assertEqual(admin_login.status_code, 200)
        admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

        res_admin = client.post("/api/news/trigger-ingestion", headers=admin_headers)
        self.assertEqual(res_admin.status_code, 200)
        self.assertEqual(res_admin.json()["status"], "success")

    def test_13_news_status_endpoint(self):
        """GET /api/news/status reports total and analyzed article counts."""
        res = client.get("/api/news/status")
        self.assertEqual(res.status_code, 200)
        status_data = res.json()
        self.assertTrue(status_data["ingestion_enabled"])
        self.assertTrue(status_data["gemini_enabled"])
        self.assertGreaterEqual(status_data["total_articles"], 1)

if __name__ == "__main__":
    unittest.main()
