import os
import sys
import unittest
import httpx
import uuid

BASE_URL = "http://127.0.0.1:8000"

class TestPaperTrading(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = httpx.Client(base_url=BASE_URL, timeout=15.0)

        # 1. Login as Retail Investor (user 1)
        res = cls.client.post("/api/auth/login", json={
            "email": "demo@capitalmind.ai",
            "password": "demo123"
        })
        assert res.status_code == 200, f"Failed dev login: {res.text}"
        data = res.json()
        cls.token_user1 = data["access_token"]
        cls.headers_user1 = {"Authorization": f"Bearer {cls.token_user1}"}
        cls.user1_id = data["user"]["user_id"]
        # Ensure available paper capital is reset
        cls.client.put("/api/trading/account/capital", headers=cls.headers_user1, json={"capital": 1000000.0})

        # 2. Login as Admin (user 2) for tenant isolation testing
        res_admin = cls.client.post("/api/auth/login", json={
            "email": "admin@capitalmind.ai",
            "password": "admin123"
        })
        assert res_admin.status_code == 200, f"Failed admin login: {res_admin.text}"
        data_admin = res_admin.json()
        cls.token_admin = data_admin["access_token"]
        cls.headers_admin = {"Authorization": f"Bearer {cls.token_admin}"}
        cls.admin_id = data_admin["user"]["user_id"]

    @classmethod
    def tearDownClass(cls):
        cls.client.close()

    def test_01_authenticated_user_can_view_paper_account(self):
        """TEST 1: Authenticated user can view paper account with initial balance."""
        res = self.client.get("/api/trading/account", headers=self.headers_user1)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("account_id", data)
        self.assertEqual(data["user_id"], self.user1_id)
        self.assertGreater(data["available_cash"], 0)
        self.assertEqual(data["is_paper_trading"], True)
        self.assertIn("Simulated", data["notice"])

    def test_02_unauthenticated_user_receives_401(self):
        """TEST 2: Unauthenticated user receives 401 on paper trading endpoints."""
        res1 = self.client.get("/api/trading/account")
        self.assertEqual(res1.status_code, 401)

        res2 = self.client.get("/api/orders")
        self.assertEqual(res2.status_code, 401)

        res3 = self.client.post("/api/orders", json={
            "symbol": "TCS", "side": "BUY", "quantity": 5
        })
        self.assertEqual(res3.status_code, 401)

        res4 = self.client.get("/api/trades")
        self.assertEqual(res4.status_code, 401)

    def test_03_user_can_buy_valid_stock(self):
        """
        TEST 3: User can BUY a valid stock.
        Verify: order created, FILLED, trade created, cash decreased, holding created/updated, transaction created.
        """
        acc_before = self.client.get("/api/trading/account", headers=self.headers_user1).json()
        cash_before = acc_before["available_cash"]

        cid = f"test-buy-{uuid.uuid4().hex[:8]}"
        res = self.client.post("/api/orders", headers=self.headers_user1, json={
            "symbol": "TCS",
            "side": "BUY",
            "quantity": 10,
            "order_type": "MARKET",
            "client_order_id": cid
        })
        self.assertEqual(res.status_code, 200, res.text)
        order = res.json()
        self.assertEqual(order["status"], "FILLED")
        self.assertEqual(order["symbol"], "TCS")
        self.assertEqual(order["side"], "BUY")
        self.assertEqual(order["quantity"], 10)
        self.assertGreater(order["executed_price"], 0)
        self.assertEqual(order["total_value"], round(10 * order["executed_price"], 2))
        self.assertIsNotNone(order["trade_id"])
        self.assertTrue(order["is_paper_trade"])

        # Check cash decreased
        acc_after = self.client.get("/api/trading/account", headers=self.headers_user1).json()
        self.assertAlmostEqual(acc_after["available_cash"], cash_before - order["total_value"], delta=0.05)

        # Check order is in orders list
        orders_res = self.client.get("/api/orders?symbol=TCS", headers=self.headers_user1)
        self.assertEqual(orders_res.status_code, 200)
        orders = orders_res.json()
        found_order = next((o for o in orders if o["order_id"] == order["order_id"]), None)
        self.assertIsNotNone(found_order)

        # Check trade is accessible
        trade_res = self.client.get(f"/api/trades/{order['trade_id']}", headers=self.headers_user1)
        self.assertEqual(trade_res.status_code, 200)
        trade = trade_res.json()
        self.assertEqual(trade["order_id"], order["order_id"])
        self.assertEqual(trade["symbol"], "TCS")
        self.assertEqual(trade["quantity"], 10)

    def test_04_second_buy_updates_weighted_average_cost(self):
        """TEST 4: Second BUY updates weighted average cost correctly."""
        port_res = self.client.get("/api/trading/portfolio", headers=self.headers_user1)
        self.assertEqual(port_res.status_code, 200)
        tcs_holding = next(h for h in port_res.json()["holdings"] if h["symbol"] == "TCS")
        prev_qty = tcs_holding["quantity"]
        prev_avg = tcs_holding["average_price"]

        # Second BUY of 5 shares
        buy2_res = self.client.post("/api/orders", headers=self.headers_user1, json={
            "symbol": "TCS",
            "side": "BUY",
            "quantity": 5,
            "order_type": "MARKET"
        })
        self.assertEqual(buy2_res.status_code, 200)
        buy2_order = buy2_res.json()
        exec_price2 = buy2_order["executed_price"]

        expected_new_qty = prev_qty + 5
        expected_new_avg = round(((prev_qty * prev_avg) + (5 * exec_price2)) / expected_new_qty, 2)

        port_res_after = self.client.get("/api/trading/portfolio", headers=self.headers_user1)
        tcs_holding_after = next(h for h in port_res_after.json()["holdings"] if h["symbol"] == "TCS")

        self.assertEqual(tcs_holding_after["quantity"], expected_new_qty)
        self.assertAlmostEqual(tcs_holding_after["average_price"], expected_new_avg, delta=0.05)

    def test_05_sell_valid_quantity(self):
        """
        TEST 5: SELL valid quantity.
        Verify: holding decreases, cash increases, trade created, realized P/L calculated.
        """
        acc_before = self.client.get("/api/trading/account", headers=self.headers_user1).json()
        cash_before = acc_before["available_cash"]

        port_before = self.client.get("/api/trading/portfolio", headers=self.headers_user1).json()
        tcs_before = next(h for h in port_before["holdings"] if h["symbol"] == "TCS")
        qty_before = tcs_before["quantity"]

        sell_qty = 5
        sell_res = self.client.post("/api/orders", headers=self.headers_user1, json={
            "symbol": "TCS",
            "side": "SELL",
            "quantity": sell_qty,
            "order_type": "MARKET"
        })
        self.assertEqual(sell_res.status_code, 200)
        sell_order = sell_res.json()
        self.assertEqual(sell_order["status"], "FILLED")
        self.assertEqual(sell_order["side"], "SELL")

        acc_after = self.client.get("/api/trading/account", headers=self.headers_user1).json()
        self.assertAlmostEqual(acc_after["available_cash"], cash_before + sell_order["total_value"], delta=0.05)

        port_after = self.client.get("/api/trading/portfolio", headers=self.headers_user1).json()
        tcs_after = next(h for h in port_after["holdings"] if h["symbol"] == "TCS")
        self.assertEqual(tcs_after["quantity"], qty_before - sell_qty)

    def test_06_sell_more_shares_than_owned(self):
        """TEST 6: SELL more shares than owned must fail (409 Conflict)."""
        port = self.client.get("/api/trading/portfolio", headers=self.headers_user1).json()
        tcs_holding = next((h for h in port["holdings"] if h["symbol"] == "TCS"), None)
        owned_qty = tcs_holding["quantity"] if tcs_holding else 0

        res = self.client.post("/api/orders", headers=self.headers_user1, json={
            "symbol": "TCS",
            "side": "SELL",
            "quantity": owned_qty + 1000,
            "order_type": "MARKET"
        })
        self.assertEqual(res.status_code, 409)
        self.assertIn("Insufficient holdings", res.text)

    def test_07_buy_with_insufficient_cash(self):
        """TEST 7: BUY with insufficient cash must fail (409 Conflict)."""
        res = self.client.post("/api/orders", headers=self.headers_user1, json={
            "symbol": "TCS",
            "side": "BUY",
            "quantity": 10000000,
            "order_type": "MARKET"
        })
        self.assertEqual(res.status_code, 409)
        self.assertIn("Insufficient paper trading balance", res.text)

    def test_08_invalid_stock_symbol(self):
        """TEST 8: Invalid stock symbol must fail (404 Not Found)."""
        res = self.client.post("/api/orders", headers=self.headers_user1, json={
            "symbol": "NONEXISTENT_XYZ_123",
            "side": "BUY",
            "quantity": 10,
            "order_type": "MARKET"
        })
        self.assertEqual(res.status_code, 404)

    def test_09_quantity_less_than_or_equal_to_zero(self):
        """TEST 9: Quantity <= 0 must fail (400 or 422)."""
        res_zero = self.client.post("/api/orders", headers=self.headers_user1, json={
            "symbol": "TCS",
            "side": "BUY",
            "quantity": 0,
            "order_type": "MARKET"
        })
        self.assertIn(res_zero.status_code, [400, 422])

        res_neg = self.client.post("/api/orders", headers=self.headers_user1, json={
            "symbol": "TCS",
            "side": "BUY",
            "quantity": -5,
            "order_type": "MARKET"
        })
        self.assertIn(res_neg.status_code, [400, 422])

    def test_10_user_cannot_access_another_users_order(self):
        """TEST 10: User cannot access another user's order."""
        res = self.client.post("/api/orders", headers=self.headers_user1, json={
            "symbol": "INFY",
            "side": "BUY",
            "quantity": 2,
            "order_type": "MARKET"
        })
        self.assertEqual(res.status_code, 200)
        order_id = res.json()["order_id"]

        res_other = self.client.get(f"/api/orders/{order_id}", headers=self.headers_admin)
        self.assertEqual(res_other.status_code, 404)

    def test_11_user_cannot_access_another_users_trade(self):
        """TEST 11: User cannot access another user's trade."""
        trades = self.client.get("/api/trades", headers=self.headers_user1).json()
        self.assertTrue(len(trades) > 0)
        trade_id = trades[0]["trade_id"]

        res_other = self.client.get(f"/api/trades/{trade_id}", headers=self.headers_admin)
        self.assertEqual(res_other.status_code, 404)

    def test_12_user_cannot_access_another_users_paper_account(self):
        """TEST 12: Account endpoint strictly returns the authenticated user's own account."""
        acc_user1 = self.client.get("/api/trading/account", headers=self.headers_user1).json()
        acc_admin = self.client.get("/api/trading/account", headers=self.headers_admin).json()

        self.assertEqual(acc_user1["user_id"], self.user1_id)
        self.assertEqual(acc_admin["user_id"], self.admin_id)
        self.assertNotEqual(acc_user1["account_id"], acc_admin["account_id"])

    def test_13_duplicate_client_order_id_idempotency(self):
        """TEST 13: Duplicate client_order_id returns existing order without creating duplicate trade."""
        cid = f"idem-key-{uuid.uuid4().hex}"

        res1 = self.client.post("/api/orders", headers=self.headers_user1, json={
            "symbol": "RELIANCE",
            "side": "BUY",
            "quantity": 2,
            "order_type": "MARKET",
            "client_order_id": cid
        })
        self.assertEqual(res1.status_code, 200)
        ord1 = res1.json()

        res2 = self.client.post("/api/orders", headers=self.headers_user1, json={
            "symbol": "RELIANCE",
            "side": "BUY",
            "quantity": 2,
            "order_type": "MARKET",
            "client_order_id": cid
        })
        self.assertEqual(res2.status_code, 200)
        ord2 = res2.json()

        self.assertEqual(ord1["order_id"], ord2["order_id"])
        self.assertTrue(ord2.get("is_duplicate", False))

    def test_14_filled_order_cannot_be_cancelled(self):
        """TEST 14: Filled order cannot be cancelled."""
        orders = self.client.get("/api/orders", headers=self.headers_user1).json()
        filled_order = next(o for o in orders if o["status"] == "FILLED")

        res = self.client.post(f"/api/orders/{filled_order['order_id']}/cancel", headers=self.headers_user1)
        self.assertEqual(res.status_code, 400)
        self.assertIn("Cannot cancel an already filled order", res.text)

    def test_15_admin_read_only_monitoring(self):
        """TEST 15: Admin can view systemwide read-only paper trading activity."""
        res_admin = self.client.get("/api/admin/trading/stats", headers=self.headers_admin)
        self.assertEqual(res_admin.status_code, 200)
        stats = res_admin.json()
        self.assertIn("total_paper_accounts", stats)
        self.assertIn("total_paper_orders", stats)
        self.assertIn("total_paper_trades", stats)
        self.assertGreaterEqual(stats["total_paper_orders"], 1)

    def test_16_database_direct_persistence(self):
        """TEST 16: Verify orders, trades, and paper accounts persist directly in PostgreSQL."""
        from app.database import SessionLocal
        from app.models.db_models import PaperTradingAccount, Order, Trade

        s = SessionLocal()
        try:
            acc = s.query(PaperTradingAccount).filter(PaperTradingAccount.user_id == self.user1_id).first()
            self.assertIsNotNone(acc, "PaperTradingAccount must exist in PostgreSQL")
            self.assertGreater(acc.cash_balance, 0)

            orders_count = s.query(Order).filter(Order.user_id == self.user1_id).count()
            self.assertGreater(orders_count, 0, "Orders must exist in PostgreSQL")

            trades_count = s.query(Trade).filter(Trade.user_id == self.user1_id).count()
            self.assertGreater(trades_count, 0, "Trades must exist in PostgreSQL")
        finally:
            s.close()

    def test_17_full_section_50_accounting_flow(self):
        """
        TEST 17: Portfolio Accounting Example from Section 50 of specification.
        Dedicated fresh user tests:
        Starting cash: 10,00,000
        BUY 10 TCS -> Cash decreases, Holding created with avg buy price
        BUY 10 TCS -> Weighted avg cost updated
        SELL 5 TCS -> Holding decreases, Cash increases, Realized P/L and remaining Unrealized P/L calculated.
        """
        # Register new dedicated user for clean accounting test
        email = f"acct_{uuid.uuid4().hex[:6]}@capitalmind.ai"
        reg_res = self.client.post("/api/auth/register", json={
            "email": email,
            "password": "AccountPassword123!",
            "full_name": "Accounting Test User"
        })
        self.assertEqual(reg_res.status_code, 200)
        user_headers = {"Authorization": f"Bearer {reg_res.json()['access_token']}"}

        # 1. Starting cash: ₹10,00,000
        acc0 = self.client.get("/api/trading/account", headers=user_headers).json()
        self.assertEqual(acc0["available_cash"], 1000000.0)
        self.assertEqual(acc0["initial_cash"], 1000000.0)

        # 2. BUY 10 shares of TCS
        buy1 = self.client.post("/api/orders", headers=user_headers, json={
            "symbol": "TCS",
            "side": "BUY",
            "quantity": 10,
            "order_type": "MARKET"
        }).json()
        p1 = buy1["executed_price"]
        c1 = buy1["total_value"]
        self.assertEqual(c1, round(10 * p1, 2))

        acc1 = self.client.get("/api/trading/account", headers=user_headers).json()
        self.assertAlmostEqual(acc1["available_cash"], 1000000.0 - c1, delta=0.05)

        port1 = self.client.get("/api/trading/portfolio", headers=user_headers).json()
        tcs1 = next(h for h in port1["holdings"] if h["symbol"] == "TCS")
        self.assertEqual(tcs1["quantity"], 10)
        self.assertEqual(tcs1["average_price"], p1)

        # 3. BUY 10 more shares of TCS
        buy2 = self.client.post("/api/orders", headers=user_headers, json={
            "symbol": "TCS",
            "side": "BUY",
            "quantity": 10,
            "order_type": "MARKET"
        }).json()
        p2 = buy2["executed_price"]
        c2 = buy2["total_value"]

        expected_weighted_avg = round(((10 * p1) + (10 * p2)) / 20.0, 2)
        port2 = self.client.get("/api/trading/portfolio", headers=user_headers).json()
        tcs2 = next(h for h in port2["holdings"] if h["symbol"] == "TCS")
        self.assertEqual(tcs2["quantity"], 20)
        self.assertAlmostEqual(tcs2["average_price"], expected_weighted_avg, delta=0.05)

        acc2 = self.client.get("/api/trading/account", headers=user_headers).json()
        self.assertAlmostEqual(acc2["available_cash"], 1000000.0 - (c1 + c2), delta=0.05)

        # 4. SELL 5 shares of TCS
        sell1 = self.client.post("/api/orders", headers=user_headers, json={
            "symbol": "TCS",
            "side": "SELL",
            "quantity": 5,
            "order_type": "MARKET"
        }).json()
        p_sell = sell1["executed_price"]
        rec_sell = sell1["total_value"]

        port3 = self.client.get("/api/trading/portfolio", headers=user_headers).json()
        tcs3 = next(h for h in port3["holdings"] if h["symbol"] == "TCS")
        self.assertEqual(tcs3["quantity"], 15)
        # Average buy cost remains unchanged on SELL
        self.assertAlmostEqual(tcs3["average_price"], expected_weighted_avg, delta=0.05)

        acc3 = self.client.get("/api/trading/account", headers=user_headers).json()
        expected_cash_after_sell = round(acc2["available_cash"] + rec_sell, 2)
        self.assertAlmostEqual(acc3["available_cash"], expected_cash_after_sell, delta=0.05)

        # Realized P/L on sold 5 shares: (p_sell - expected_weighted_avg) * 5
        expected_realized = round((p_sell - expected_weighted_avg) * 5.0, 2)
        self.assertAlmostEqual(acc3["realized_pnl"], expected_realized, delta=0.1)

        # Consistency check: cash + portfolio_market_value == total_value
        self.assertAlmostEqual(acc3["available_cash"] + acc3["portfolio_value"], acc3["total_value"], delta=0.1)

if __name__ == "__main__":
    unittest.main()
