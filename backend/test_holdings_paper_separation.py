import unittest
import uuid
import httpx
from datetime import datetime

BASE_URL = "http://127.0.0.1:8000"

class TestHoldingsPaperSeparation(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = httpx.Client(base_url=BASE_URL, timeout=15.0)

        # 1. Register User A
        cls.email_a = f"usera_{uuid.uuid4().hex[:6]}@capitalmind.ai"
        res_a = cls.client.post("/api/auth/register", json={
            "email": cls.email_a,
            "password": "Password123!",
            "full_name": "Separation User A"
        })
        assert res_a.status_code == 200, f"Failed register user A: {res_a.text}"
        cls.token_a = res_a.json()["access_token"]
        cls.headers_a = {"Authorization": f"Bearer {cls.token_a}"}
        cls.user_a_id = res_a.json()["user"]["user_id"]

        # Create a real portfolio for User A
        port_res = cls.client.post("/api/portfolio", headers=cls.headers_a, json={
            "name": "User A Real Portfolio",
            "objective": "Wealth Maximization",
            "riskPreference": "Aggressive",
            "description": "User A real holdings test bucket"
        })
        assert port_res.status_code == 201, f"Failed create portfolio: {port_res.text}"
        cls.portfolio_a_id = port_res.json()["id"]

        # 2. Register User B
        cls.email_b = f"userb_{uuid.uuid4().hex[:6]}@capitalmind.ai"
        res_b = cls.client.post("/api/auth/register", json={
            "email": cls.email_b,
            "password": "Password123!",
            "full_name": "Separation User B"
        })
        assert res_b.status_code == 200, f"Failed register user B: {res_b.text}"
        cls.token_b = res_b.json()["access_token"]
        cls.headers_b = {"Authorization": f"Bearer {cls.token_b}"}
        cls.user_b_id = res_b.json()["user"]["user_id"]

    @classmethod
    def tearDownClass(cls):
        cls.client.close()

    def test_01_create_real_holding_isolation(self):
        """Test 1: Create real holding INFY -> appears in Real Holdings, NOT in Paper Positions, no Paper Trade created."""
        add_res = self.client.post(f"/api/portfolio/{self.portfolio_a_id}/holdings", headers=self.headers_a, json={
            "symbol": "INFY",
            "name": "Infosys Ltd.",
            "assetType": "Stock",
            "quantity": 50,
            "avgPrice": 1450.0,
            "currentPrice": 1510.0,
            "sector": "Technology"
        })
        self.assertEqual(add_res.status_code, 200)
        p_data = add_res.json()
        real_infy = next((h for h in p_data["holdings"] if h["symbol"] == "INFY"), None)
        self.assertIsNotNone(real_infy)
        self.assertEqual(real_infy["quantity"], 50)
        self.assertEqual(real_infy["avgPrice"], 1450.0)

        # Verify INFY is NOT in Paper Positions
        paper_res = self.client.get("/api/trading/portfolio", headers=self.headers_a)
        self.assertEqual(paper_res.status_code, 200)
        paper_infy = next((h for h in paper_res.json()["holdings"] if h["symbol"] == "INFY"), None)
        self.assertIsNone(paper_infy, "Real holding must NOT appear in paper trading portfolio!")

        # Verify no Paper Trade was created
        trades_res = self.client.get("/api/trades?symbol=INFY", headers=self.headers_a)
        self.assertEqual(trades_res.status_code, 200)
        self.assertEqual(len(trades_res.json()), 0, "Real holding addition must NOT create paper trades!")

    def test_02_paper_buy_isolation(self):
        """Test 2: Paper BUY INFY -> appears in Paper Positions, NOT in Real Holdings, no Real Holding qty changes."""
        # Get real holding quantity before
        port_before = self.client.get(f"/api/portfolio/{self.portfolio_a_id}", headers=self.headers_a).json()
        real_infy_before = next(h for h in port_before["holdings"] if h["symbol"] == "INFY")
        qty_before = real_infy_before["quantity"]

        # Execute Paper BUY INFY
        buy_res = self.client.post("/api/orders", headers=self.headers_a, json={
            "symbol": "INFY",
            "side": "BUY",
            "quantity": 10,
            "order_type": "MARKET"
        })
        self.assertEqual(buy_res.status_code, 200)
        self.assertTrue(buy_res.json()["is_paper_trade"])

        # Verify INFY appears in Paper Positions
        paper_res = self.client.get("/api/trading/portfolio", headers=self.headers_a)
        self.assertEqual(paper_res.status_code, 200)
        paper_infy = next((h for h in paper_res.json()["holdings"] if h["symbol"] == "INFY"), None)
        self.assertIsNotNone(paper_infy, "Paper BUY must appear in paper positions!")
        self.assertEqual(paper_infy["quantity"], 10)

        # Verify Real Holding INFY quantity remained completely unchanged
        port_after = self.client.get(f"/api/portfolio/{self.portfolio_a_id}", headers=self.headers_a).json()
        real_infy_after = next(h for h in port_after["holdings"] if h["symbol"] == "INFY")
        self.assertEqual(real_infy_after["quantity"], qty_before, "Real holding quantity must NOT change from Paper BUY!")

    def test_03_same_symbol_coexistence_independence(self):
        """Test 3: Both domains contain same symbol independently (Real INFY x 50, Paper INFY x 10)."""
        port = self.client.get(f"/api/portfolio/{self.portfolio_a_id}", headers=self.headers_a).json()
        real_infy = next(h for h in port["holdings"] if h["symbol"] == "INFY")
        self.assertEqual(real_infy["quantity"], 50)
        self.assertEqual(real_infy["avgPrice"], 1450.0)

        paper = self.client.get("/api/trading/portfolio", headers=self.headers_a).json()
        paper_infy = next(h for h in paper["holdings"] if h["symbol"] == "INFY")
        self.assertEqual(paper_infy["quantity"], 10)
        self.assertNotEqual(paper_infy["average_price"], real_infy["avgPrice"])

    def test_04_paper_sell_leaves_real_holding_unaffected(self):
        """Test 4: Paper SELL INFY -> Paper quantity decreases, Real INFY quantity remains unchanged."""
        sell_res = self.client.post("/api/orders", headers=self.headers_a, json={
            "symbol": "INFY",
            "side": "SELL",
            "quantity": 4,
            "order_type": "MARKET"
        })
        self.assertEqual(sell_res.status_code, 200)

        # Paper quantity is now 6
        paper = self.client.get("/api/trading/portfolio", headers=self.headers_a).json()
        paper_infy = next(h for h in paper["holdings"] if h["symbol"] == "INFY")
        self.assertEqual(paper_infy["quantity"], 6)

        # Real holding remains 50
        port = self.client.get(f"/api/portfolio/{self.portfolio_a_id}", headers=self.headers_a).json()
        real_infy = next(h for h in port["holdings"] if h["symbol"] == "INFY")
        self.assertEqual(real_infy["quantity"], 50)

    def test_05_real_holding_edit_leaves_paper_unaffected(self):
        """Test 5: Real holding edit -> Real INFY quantity 50 -> 150, Paper INFY remains 6."""
        port = self.client.get(f"/api/portfolio/{self.portfolio_a_id}", headers=self.headers_a).json()
        real_infy = next(h for h in port["holdings"] if h["symbol"] == "INFY")
        holding_id = real_infy["id"]

        update_res = self.client.put(f"/api/portfolio/{self.portfolio_a_id}/holdings/{holding_id}", headers=self.headers_a, json={
            "quantity": 150,
            "avgPrice": 1450.0
        })
        self.assertEqual(update_res.status_code, 200)

        # Real holding is now 150
        updated_infy = next(h for h in update_res.json()["holdings"] if h["symbol"] == "INFY")
        self.assertEqual(updated_infy["quantity"], 150)

        # Paper position remains exactly 6
        paper = self.client.get("/api/trading/portfolio", headers=self.headers_a).json()
        paper_infy = next(h for h in paper["holdings"] if h["symbol"] == "INFY")
        self.assertEqual(paper_infy["quantity"], 6)

    def test_06_paper_cash_isolation(self):
        """Test 6: Paper capital changes -> Real portfolio/holdings values are unaffected."""
        port_before = self.client.get(f"/api/portfolio/{self.portfolio_a_id}", headers=self.headers_a).json()
        real_total_before = port_before["totalValue"]

        # User modifies paper trading capital
        cap_res = self.client.put("/api/trading/account/capital", headers=self.headers_a, json={
            "capital": 2500000.0
        })
        self.assertEqual(cap_res.status_code, 200)
        self.assertEqual(cap_res.json()["cash_balance"], 2500000.0)

        # Verify real portfolio totalValue is completely unaffected
        port_after = self.client.get(f"/api/portfolio/{self.portfolio_a_id}", headers=self.headers_a).json()
        self.assertEqual(port_after["totalValue"], real_total_before)

    def test_07_real_holding_no_artificial_cash_limit(self):
        """Test 7: Real holding creation has no artificial cash limit (e.g. 50,000 shares @ Rs.2,000 = Rs.10,00,00,000)."""
        large_res = self.client.post(f"/api/portfolio/{self.portfolio_a_id}/holdings", headers=self.headers_a, json={
            "symbol": "RELIANCE",
            "name": "Reliance Industries Ltd.",
            "assetType": "Stock",
            "quantity": 50000,
            "avgPrice": 2400.0,
            "sector": "Energy"
        })
        self.assertEqual(large_res.status_code, 200, "Real holding creation must succeed regardless of cash!")
        port = large_res.json()
        rel_holding = next(h for h in port["holdings"] if h["symbol"] == "RELIANCE")
        self.assertEqual(rel_holding["quantity"], 50000)
        self.assertEqual(rel_holding["investedValue"], 50000 * 2400.0)

    def test_08_paper_insufficient_cash_rejected(self):
        """Test 8: Paper BUY exceeding available paper cash is rejected with 409 Conflict."""
        acc = self.client.get("/api/trading/account", headers=self.headers_a).json()
        cash = acc["available_cash"]

        # Attempt to buy more shares than cash permits
        # 10,000 shares of MRF / RELIANCE (~Rs. 24,000,000 > Rs. 2,500,000)
        fail_res = self.client.post("/api/orders", headers=self.headers_a, json={
            "symbol": "RELIANCE",
            "side": "BUY",
            "quantity": 10000,
            "order_type": "MARKET"
        })
        self.assertEqual(fail_res.status_code, 409)
        self.assertIn("Insufficient", fail_res.json()["detail"])

    def test_09_paper_unrealized_pnl_calculation(self):
        """Test 9: Paper P/L calculation: (current_price - avg_price) * quantity."""
        paper = self.client.get("/api/trading/portfolio", headers=self.headers_a).json()
        paper_infy = next(h for h in paper["holdings"] if h["symbol"] == "INFY")
        expected_unrealized = round((paper_infy["current_price"] - paper_infy["average_price"]) * paper_infy["quantity"], 2)
        self.assertAlmostEqual(paper_infy["unrealized_pnl"], expected_unrealized, delta=0.05)

    def test_10_real_holding_pnl_calculation(self):
        """Test 10: Real holding P/L calculation: investedValue = qty * avgPrice, currentValue = qty * currentPrice."""
        port = self.client.get(f"/api/portfolio/{self.portfolio_a_id}", headers=self.headers_a).json()
        real_infy = next(h for h in port["holdings"] if h["symbol"] == "INFY")
        self.assertEqual(real_infy["investedValue"], real_infy["quantity"] * real_infy["avgPrice"])
        self.assertEqual(real_infy["currentValue"], real_infy["quantity"] * real_infy["currentPrice"])
        self.assertEqual(real_infy["profitLoss"], real_infy["currentValue"] - real_infy["investedValue"])

    def test_11_tenant_isolation(self):
        """Test 11: User A cannot access User B's real holdings, paper positions, account, orders, or trades."""
        # User B cannot access User A's real portfolio holdings
        res_cross_port = self.client.get(f"/api/portfolio/{self.portfolio_a_id}/holdings", headers=self.headers_b)
        self.assertEqual(res_cross_port.status_code, 404)

        # User B's paper account is isolated from User A's account
        acc_b = self.client.get("/api/trading/account", headers=self.headers_b).json()
        self.assertNotEqual(acc_b["account_id"], self.client.get("/api/trading/account", headers=self.headers_a).json()["account_id"])

        # User B has empty paper positions initially
        paper_b = self.client.get("/api/trading/portfolio", headers=self.headers_b).json()
        self.assertEqual(len(paper_b["holdings"]), 0)

    def test_12_persistence_verification(self):
        """Test 12: Direct DB verification that Real Holdings and Paper Positions persist in separate tables."""
        from app.database import SessionLocal
        from app.models.db_models import Holding, PaperPosition, PaperTradingAccount

        s = SessionLocal()
        try:
            # Check real holdings table
            real_holdings = s.query(Holding).filter(Holding.portfolio_id == self.portfolio_a_id).all()
            real_symbols = [h.symbol for h in real_holdings]
            self.assertIn("INFY", real_symbols)
            self.assertIn("RELIANCE", real_symbols)

            # Check paper positions table
            pac = s.query(PaperTradingAccount).filter(PaperTradingAccount.user_id == self.user_a_id).first()
            paper_positions = s.query(PaperPosition).filter(PaperPosition.account_id == pac.id).all()
            paper_symbols = [p.symbol for p in paper_positions]
            self.assertIn("INFY", paper_symbols)

            # Verify quantities differ between the two tables
            infy_real = next(h for h in real_holdings if h.symbol == "INFY")
            infy_paper = next(p for p in paper_positions if p.symbol == "INFY")
            self.assertEqual(infy_real.quantity, 150)
            self.assertEqual(infy_paper.quantity, 6)
        finally:
            s.close()

if __name__ == "__main__":
    unittest.main()
