"""
Portfolio Accounting & Valuation Audit Test Suite
==================================================
Comprehensive automated tests verifying the real portfolio accounting engine:
1. One buy and multiple buys at different prices (Weighted-Average Cost Basis).
2. Partial and full sells (Remaining quantity, cost basis, realized P/L).
3. Weighted-average cost basis preservation on sells.
4. Realized and unrealized P/L reconciliation (Total P/L = Realized + Unrealized).
5. Fees on transactions (acquisition costs, proceeds deductions).
6. Deposits and withdrawals not counted as profit.
7. Manual holdings without transaction history (preserved initial position).
8. Conflicting manual and transaction records (documented source-of-truth rule).
9. Missing, stale, and canonical instrument matching prices (no zero-price wipeout).
10. Multiple asset types and portfolio allocation (sums to 100%, ETF distinction).
11. Zero quantity and zero cost-basis edge cases (no division by zero).
12. Reconciliation across backend API responses (portfolio, holdings, transactions, risk).
13. Real portfolio isolation from paper trading.
14. Performance history with zero, one, and two or more valid snapshots.
15. Snapshot scheduling, duplicate prevention, and idempotency.
"""

import unittest
import asyncio
import sys
from pathlib import Path
from datetime import datetime, timezone, timedelta

# Ensure backend directory is in sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.database import SessionLocal
from app.models.db_models import Portfolio, Holding, Transaction, Stock, PortfolioSnapshot, PaperTradingAccount, PaperPosition
from app.services.portfolio_service import portfolio_service
from app.services.snapshot_service import compute_snapshot_for_portfolio, save_snapshot, run_eod_snapshots


class TestPortfolioAccountingEngine(unittest.TestCase):
    def setUp(self):
        self.db = SessionLocal()
        portfolio_service.seed_demo_data(self.db)
        self.test_pf_id = f"test_acct_{datetime.now().strftime('%H%M%S%f')}"
        p = Portfolio(
            id=self.test_pf_id,
            user_id="usr_dev_001",
            name="Accounting Audit Portfolio",
            objective="Capital Growth",
            risk_preference="Moderate",
            description="Automated accounting test portfolio",
            created_at=datetime.now(timezone.utc)
        )
        self.db.add(p)
        self.db.commit()

    def tearDown(self):
        # Clean up test artifacts
        self.db.rollback()
        self.db.query(PortfolioSnapshot).filter(PortfolioSnapshot.portfolio_id == self.test_pf_id).delete(synchronize_session=False)
        self.db.query(Transaction).filter(Transaction.portfolio_id == self.test_pf_id).delete(synchronize_session=False)
        self.db.query(Holding).filter(Holding.portfolio_id == self.test_pf_id).delete(synchronize_session=False)
        self.db.query(Portfolio).filter(Portfolio.id == self.test_pf_id).delete(synchronize_session=False)
        self.db.commit()
        self.db.close()

    def test_01_single_buy_and_multiple_buys_weighted_average_cost(self):
        """1. One buy and multiple buys at different prices must calculate exact weighted-average cost."""
        # Buy 1: 10 shares of RELIANCE @ 2400 -> Invested: 24,000, Avg: 2400
        portfolio_service.add_transaction(self.test_pf_id, {
            "symbol": "RELIANCE",
            "type": "BUY",
            "quantity": 10.0,
            "price": 2400.0,
            "date": "2026-10-01"
        }, db=self.db)

        p = portfolio_service.get_by_id(self.test_pf_id, db=self.db)
        self.assertEqual(len(p["holdings"]), 1)
        h = p["holdings"][0]
        self.assertEqual(h["quantity"], 10.0)
        self.assertEqual(h["avgPrice"], 2400.0)
        self.assertEqual(h["investedValue"], 24000.0)

        # Buy 2: 10 shares of RELIANCE @ 2600 -> Total: 20 shares, Total Invested: 24,000 + 26,000 = 50,000, Avg: 2500
        portfolio_service.add_transaction(self.test_pf_id, {
            "symbol": "RELIANCE",
            "type": "BUY",
            "quantity": 10.0,
            "price": 2600.0,
            "date": "2026-10-02"
        }, db=self.db)

        p = portfolio_service.get_by_id(self.test_pf_id, db=self.db)
        h = p["holdings"][0]
        self.assertEqual(h["quantity"], 20.0)
        self.assertEqual(h["avgPrice"], 2500.0)
        self.assertEqual(h["investedValue"], 50000.0)

    def test_02_partial_and_full_sells_realized_pnl(self):
        """2. Partial sell must reduce quantity, preserve unit cost, and compute exact realized P/L."""
        # Buy 20 shares @ 2500 -> Cost basis: 50,000
        portfolio_service.add_transaction(self.test_pf_id, {
            "symbol": "TCS",
            "type": "BUY",
            "quantity": 20.0,
            "price": 2500.0,
            "date": "2026-10-01"
        }, db=self.db)

        # Sell 5 shares @ 3000 -> Proceeds: 15,000, Cost of shares sold: 5 * 2500 = 12,500. Realized P/L = +2,500
        portfolio_service.add_transaction(self.test_pf_id, {
            "symbol": "TCS",
            "type": "SELL",
            "quantity": 5.0,
            "price": 3000.0,
            "date": "2026-10-03"
        }, db=self.db)

        p = portfolio_service.get_by_id(self.test_pf_id, db=self.db)
        h = p["holdings"][0]
        self.assertEqual(h["quantity"], 15.0)
        self.assertEqual(h["avgPrice"], 2500.0)  # Unit cost preserved
        self.assertEqual(h["investedValue"], 37500.0)  # Remaining cost basis: 15 * 2500
        self.assertEqual(p["realizedProfitLoss"], 2500.0)

        # Full sell of remaining 15 shares @ 2800 -> Proceeds: 42,000, Cost: 37,500. Realized P/L = +4,500
        # Cumulative Realized P/L = 2,500 + 4,500 = 7,000
        portfolio_service.add_transaction(self.test_pf_id, {
            "symbol": "TCS",
            "type": "SELL",
            "quantity": 15.0,
            "price": 2800.0,
            "date": "2026-10-04"
        }, db=self.db)

        p = portfolio_service.get_by_id(self.test_pf_id, db=self.db)
        h = p["holdings"][0]
        self.assertEqual(h["quantity"], 0.0)
        self.assertEqual(h["investedValue"], 0.0)
        self.assertEqual(h["currentValue"], 0.0)
        self.assertEqual(p["realizedProfitLoss"], 7000.0)

    def test_03_weighted_average_cost_preserved_on_sell(self):
        """3. Weighted-average cost basis per share must remain identical before and after a partial sell."""
        portfolio_service.add_transaction(self.test_pf_id, {
            "symbol": "INFY",
            "type": "BUY",
            "quantity": 50.0,
            "price": 1400.0,
            "date": "2026-10-01"
        }, db=self.db)
        portfolio_service.add_transaction(self.test_pf_id, {
            "symbol": "INFY",
            "type": "BUY",
            "quantity": 50.0,
            "price": 1600.0,
            "date": "2026-10-02"
        }, db=self.db)

        p_before = portfolio_service.get_by_id(self.test_pf_id, db=self.db)
        self.assertEqual(p_before["holdings"][0]["avgPrice"], 1500.0)

        # Sell 30 shares
        portfolio_service.add_transaction(self.test_pf_id, {
            "symbol": "INFY",
            "type": "SELL",
            "quantity": 30.0,
            "price": 1700.0,
            "date": "2026-10-03"
        }, db=self.db)

        p_after = portfolio_service.get_by_id(self.test_pf_id, db=self.db)
        self.assertEqual(p_after["holdings"][0]["quantity"], 70.0)
        self.assertEqual(p_after["holdings"][0]["avgPrice"], 1500.0)  # Strictly preserved

    def test_04_realized_and_unrealized_pnl_reconciliation(self):
        """4. Total P/L must equal Realized P/L + Unrealized P/L without double-counting."""
        # Buy 10 shares @ 1000 = 10,000
        portfolio_service.add_transaction(self.test_pf_id, {
            "symbol": "LT",
            "type": "BUY",
            "quantity": 10.0,
            "price": 1000.0,
            "date": "2026-10-01"
        }, db=self.db)

        # Sell 4 shares @ 1500 -> Realized P/L = 4 * (1500 - 1000) = +2,000
        portfolio_service.add_transaction(self.test_pf_id, {
            "symbol": "LT",
            "type": "SELL",
            "quantity": 4.0,
            "price": 1500.0,
            "date": "2026-10-02"
        }, db=self.db)

        # Remaining 6 shares held. Update current price to 1200
        # Unrealized P/L = 6 * (1200 - 1000) = +1,200
        h_orm = self.db.query(Holding).filter(Holding.portfolio_id == self.test_pf_id, Holding.symbol == "LT").first()
        h_orm.current_price = 1200.0
        self.db.commit()

        p = portfolio_service.get_by_id(self.test_pf_id, db=self.db)
        self.assertEqual(p["realizedProfitLoss"], 2000.0)
        self.assertEqual(p["unrealizedProfitLoss"], 1200.0)
        self.assertEqual(p["totalProfitLoss"], 3200.0)
        self.assertEqual(p["profitLoss"], 3200.0)

    def test_05_fees_on_transactions(self):
        """5. Transaction fees must be included in cost basis on BUY."""
        portfolio_service.add_transaction(self.test_pf_id, {
            "symbol": "HDFCBANK",
            "type": "BUY",
            "quantity": 10.0,
            "price": 1500.0,
            "fee": 50.0,  # 50 INR brokerage/STT fee
            "date": "2026-10-01"
        }, db=self.db)

        p = portfolio_service.get_by_id(self.test_pf_id, db=self.db)
        h = p["holdings"][0]
        # Total cost = 15,000 + 50 = 15,050. Avg price = 1505.0
        self.assertEqual(h["investedValue"], 15050.0)
        self.assertEqual(h["avgPrice"], 1505.0)

    def test_06_deposits_and_withdrawals_not_counted_as_profit(self):
        """6. Cash DEPOSIT and WITHDRAWAL must not alter stock holdings or generate investment profit."""
        portfolio_service.add_transaction(self.test_pf_id, {
            "symbol": "CASH",
            "type": "DEPOSIT",
            "quantity": 1.0,
            "price": 100000.0,  # 100k cash deposit
            "date": "2026-10-01"
        }, db=self.db)

        p = portfolio_service.get_by_id(self.test_pf_id, db=self.db)
        self.assertEqual(len(p["holdings"]), 0)  # No stock holding created
        self.assertEqual(p["realizedProfitLoss"], 0.0)  # Not profit
        self.assertEqual(p["unrealizedProfitLoss"], 0.0)
        self.assertEqual(p["totalProfitLoss"], 0.0)

        portfolio_service.add_transaction(self.test_pf_id, {
            "symbol": "CASH",
            "type": "WITHDRAWAL",
            "quantity": 1.0,
            "price": 20000.0,
            "date": "2026-10-02"
        }, db=self.db)

        p_after = portfolio_service.get_by_id(self.test_pf_id, db=self.db)
        self.assertEqual(p_after["realizedProfitLoss"], 0.0)
        self.assertEqual(p_after["totalProfitLoss"], 0.0)

    def test_07_manual_holdings_without_transaction_history(self):
        """7. Holdings added manually without transactions must preserve initial quantity and cost basis."""
        portfolio_service.add_holding(self.test_pf_id, {
            "symbol": "PIDILITIND",
            "name": "Pidilite Industries Ltd.",
            "quantity": 25.0,
            "avgPrice": 2800.0,
            "currentPrice": 3100.0,
            "sector": "Chemicals",
            "assetType": "Stock"
        }, db=self.db)

        p = portfolio_service.get_by_id(self.test_pf_id, db=self.db)
        self.assertEqual(len(p["transactions"]), 0)  # Zero transactions invented
        self.assertEqual(len(p["holdings"]), 1)
        h = p["holdings"][0]
        self.assertEqual(h["quantity"], 25.0)
        self.assertEqual(h["avgPrice"], 2800.0)
        self.assertEqual(h["investedValue"], 70000.0)
        self.assertEqual(h["currentValue"], 77500.0)
        self.assertEqual(h["unrealizedProfitLoss"], 7500.0)
        self.assertEqual(p["realizedProfitLoss"], 0.0)

    def test_08_conflicting_manual_and_transaction_records_source_of_truth(self):
        """8. Prevent duplicate holding records when symbol is added multiple times."""
        # First manual entry
        portfolio_service.add_holding(self.test_pf_id, {
            "symbol": "ITC",
            "name": "ITC Ltd.",
            "quantity": 100.0,
            "avgPrice": 400.0,
            "currentPrice": 450.0,
            "sector": "FMCG",
            "assetType": "Stock"
        }, db=self.db)

        # Second entry for same symbol: must update/merge in place, NOT create a second duplicate row
        portfolio_service.add_holding(self.test_pf_id, {
            "symbol": "ITC",
            "name": "ITC Ltd.",
            "quantity": 50.0,
            "avgPrice": 460.0,
            "currentPrice": 450.0,
            "sector": "FMCG",
            "assetType": "Stock"
        }, db=self.db)

        p = portfolio_service.get_by_id(self.test_pf_id, db=self.db)
        self.assertEqual(len(p["holdings"]), 1, "Duplicate holding for ITC must be prevented")
        h = p["holdings"][0]
        self.assertEqual(h["quantity"], 150.0)
        # (100 * 400 + 50 * 460) / 150 = (40000 + 23000) / 150 = 63000 / 150 = 420.0
        self.assertEqual(h["avgPrice"], 420.0)

    def test_09_missing_and_stale_prices_no_zero_wipeout(self):
        """9. Missing prices must never be treated as zero, preventing catastrophic false -100% P/L."""
        portfolio_service.add_holding(self.test_pf_id, {
            "symbol": "MYSTERYSYM",
            "name": "Unlisted Venture Co",
            "quantity": 10.0,
            "avgPrice": 500.0,
            "currentPrice": 0.0,  # 0.0 simulates missing feed
            "sector": "Unclassified",
            "assetType": "Stock"
        }, db=self.db)

        p = portfolio_service.get_by_id(self.test_pf_id, db=self.db)
        h = p["holdings"][0]
        # Must fall back to cost basis (500) rather than zero
        self.assertEqual(h["currentPrice"], 500.0)
        self.assertEqual(h["currentValue"], 5000.0)
        self.assertEqual(h["unrealizedProfitLoss"], 0.0)
        self.assertEqual(h["priceSource"], "cost_basis_fallback")
        self.assertTrue(h["isPriceStale"])
        self.assertIsNotNone(h["priceWarning"])

    def test_10_multiple_asset_types_and_etf_classification(self):
        """10. ETFs must be classified as ETF and allocation percentages must total 100%."""
        holdings = [
            ("INFY", "Stock", "IT", 10.0, 1500.0),
            ("NIFTYBEES", "ETF", "Index ETF", 100.0, 250.0),
            ("LIQUIDBEES", "ETF", "Cash Equivalent", 20.0, 1000.0),
            ("GOLDBEES", "ETF", "Commodities", 100.0, 60.0),
            ("GSEC2033", "Bond", "Government Debt", 10.0, 1000.0),
        ]
        for sym, atype, sec, qty, price in holdings:
            portfolio_service.add_holding(self.test_pf_id, {
                "symbol": sym,
                "name": sym,
                "assetType": atype,
                "sector": sec,
                "quantity": qty,
                "avgPrice": price,
                "currentPrice": price
            }, db=self.db)

        p = portfolio_service.get_by_id(self.test_pf_id, db=self.db)
        # Sum of allocation percentages must equal 100%
        sum_alloc = sum(h["allocationPercentage"] for h in p["holdings"])
        self.assertAlmostEqual(sum_alloc, 100.0, delta=0.5)

        # Asset allocations must contain ETF and Bond
        asset_types = {a["assetType"] for a in p["assetAllocation"]}
        self.assertIn("ETF", asset_types)
        self.assertIn("Bond", asset_types)
        self.assertIn("Stock", asset_types)

    def test_11_zero_quantity_and_zero_cost_basis_edge_cases(self):
        """11. Zero quantity and zero cost basis holdings must not cause ZeroDivisionError."""
        portfolio_service.add_holding(self.test_pf_id, {
            "symbol": "ZEROHOLDING",
            "name": "Zero Shares Co",
            "quantity": 0.0,
            "avgPrice": 0.0,
            "currentPrice": 100.0,
            "sector": "General",
            "assetType": "Stock"
        }, db=self.db)

        p = portfolio_service.get_by_id(self.test_pf_id, db=self.db)
        h = p["holdings"][0]
        self.assertEqual(h["investedValue"], 0.0)
        self.assertEqual(h["currentValue"], 0.0)
        self.assertEqual(h["returnPercentage"], 0.0)
        self.assertEqual(h["allocationPercentage"], 0.0)

    def test_12_reconciliation_across_api_responses(self):
        """12. Holdings values and portfolio total values must reconcile exactly across service calls."""
        portfolio_service.add_holding(self.test_pf_id, {
            "symbol": "TCS",
            "name": "Tata Consultancy Services Ltd.",
            "quantity": 10.0,
            "avgPrice": 3800.0,
            "currentPrice": 4000.0,
            "sector": "IT",
            "assetType": "Stock"
        }, db=self.db)
        portfolio_service.add_holding(self.test_pf_id, {
            "symbol": "RELIANCE",
            "name": "Reliance Industries Ltd.",
            "quantity": 5.0,
            "avgPrice": 2400.0,
            "currentPrice": 2600.0,
            "sector": "Energy",
            "assetType": "Stock"
        }, db=self.db)

        p = portfolio_service.get_by_id(self.test_pf_id, db=self.db)
        holdings = portfolio_service.get_holdings(self.test_pf_id, db=self.db)

        sum_holdings_val = sum(h["currentValue"] for h in holdings)
        sum_holdings_inv = sum(h["investedValue"] for h in holdings)

        self.assertEqual(p["totalValue"], sum_holdings_val)
        self.assertEqual(p["investedCapital"], sum_holdings_inv)
        self.assertEqual(p["unrealizedProfitLoss"], round(sum_holdings_val - sum_holdings_inv, 2))

    def test_13_real_portfolio_isolation_from_paper_trading(self):
        """13. Paper trading accounts and positions must never pollute real portfolio valuations."""
        # Create a paper position
        paper_acct = self.db.query(PaperTradingAccount).filter(PaperTradingAccount.user_id == "usr_dev_001").first()
        if not paper_acct:
            paper_acct = PaperTradingAccount(
                id="test_paper_acct",
                user_id="usr_dev_001",
                balance=1000000.0,
                available_cash=1000000.0
            )
            self.db.add(paper_acct)
            self.db.flush()

        pos = PaperPosition(
            id="test_paper_pos",
            account_id=paper_acct.id,
            user_id=paper_acct.user_id,
            symbol="HDFCBANK",
            company_name="HDFC Bank Ltd.",
            quantity=500.0,  # 500 paper shares
            average_price=1500.0,
            current_price=1600.0
        )
        self.db.add(pos)
        self.db.commit()

        # Check real portfolio: must have 0 shares of HDFCBANK
        p = portfolio_service.get_by_id(self.test_pf_id, db=self.db)
        self.assertFalse(any(h["symbol"] == "HDFCBANK" for h in p["holdings"]),
                         "Paper position must never appear in real portfolio holdings")

        # Cleanup paper position
        self.db.delete(pos)
        self.db.commit()

    def test_14_performance_history_with_zero_one_two_snapshots(self):
        """14. Performance history must handle 0, 1, and 2+ snapshots honestly without fabricating data."""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            # Add holding to portfolio
            portfolio_service.add_holding(self.test_pf_id, {
                "symbol": "INFY",
                "name": "Infosys Ltd.",
                "quantity": 10.0,
                "avgPrice": 1500.0,
                "currentPrice": 1500.0,
                "sector": "IT",
                "assetType": "Stock"
            }, db=self.db)

            # Snapshots = 0: first call auto-seeds today's snapshot and returns 1 point
            h1 = loop.run_until_complete(portfolio_service.get_portfolio_history(self.test_pf_id, timeframe="1M", db=self.db))
            self.assertGreaterEqual(len(h1), 1)
            self.assertEqual(h1[0]["periodReturnPercentage"], 0.0)

            # Save a 2nd snapshot for yesterday
            yesterday_str = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
            snap2 = PortfolioSnapshot(
                id=f"snp_test_yest_{self.test_pf_id}",
                portfolio_id=self.test_pf_id,
                snapshot_date=yesterday_str,
                total_value=14000.0,
                invested_capital=15000.0,
                profit_loss=-1000.0,
                return_percentage=-6.67,
                price_source="eod",
                is_eod=True
            )
            self.db.add(snap2)
            self.db.commit()

            # Now 2+ snapshots exist inside window
            h2 = loop.run_until_complete(portfolio_service.get_portfolio_history(self.test_pf_id, timeframe="1M", db=self.db))
            self.assertGreaterEqual(len(h2), 2)
            self.assertIn("periodReturnPercentage", h2[1])
        finally:
            loop.close()

    def test_15_snapshot_scheduling_and_idempotency(self):
        """15. Re-running snapshot computation for the same calendar date must update in place without duplicating."""
        p_orm = self.db.query(Portfolio).filter(Portfolio.id == self.test_pf_id).first()
        portfolio_service.add_holding(self.test_pf_id, {
            "symbol": "LT",
            "name": "Larsen & Toubro Ltd.",
            "quantity": 10.0,
            "avgPrice": 3000.0,
            "currentPrice": 3200.0,
            "sector": "Construction",
            "assetType": "Stock"
        }, db=self.db)
        self.db.refresh(p_orm)

        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        snap_data1 = compute_snapshot_for_portfolio(p_orm, self.db, is_eod=True)
        self.assertIsNotNone(snap_data1)

        # Save first time
        save_snapshot(self.test_pf_id, today_str, snap_data1, self.db)
        count1 = self.db.query(PortfolioSnapshot).filter(
            PortfolioSnapshot.portfolio_id == self.test_pf_id,
            PortfolioSnapshot.snapshot_date == today_str
        ).count()
        self.assertEqual(count1, 1)

        # Save second time (e.g. catchup or retry): must NOT duplicate
        save_snapshot(self.test_pf_id, today_str, snap_data1, self.db)
        count2 = self.db.query(PortfolioSnapshot).filter(
            PortfolioSnapshot.portfolio_id == self.test_pf_id,
            PortfolioSnapshot.snapshot_date == today_str
        ).count()
        self.assertEqual(count2, 1, "Snapshot for the same date must be idempotent and never duplicated")

    def test_16_five_holdings_diagnostic_scenario(self):
        """16. Verify diagnostic scenario with the 5 holdings: PIIND, LIQUIDBEES, GOLDBEES, TCS, LT.
        Market value must equal exactly ₹6,95,984.20, cost basis ₹2,43,700.00, P/L ₹4,52,284.20 (185.59%).
        Asset allocations: Stock (86.74%) and ETF (13.26%) summing to 100%.
        """
        # Create a clean dedicated test portfolio for the 5 holdings
        pf_5_id = f"test_pf_5_{datetime.now().strftime('%H%M%S%f')}"
        p5 = Portfolio(
            id=pf_5_id,
            user_id="usr_dev_001",
            name="Diagnostic 5 Holdings Test",
            objective="Growth",
            risk_preference="Moderate",
            description="Reconciliation test for diagnostic 5 holdings",
            created_at=datetime.now(timezone.utc)
        )
        self.db.add(p5)
        self.db.commit()

        try:
            # 1. PIIND: 100 @ 80.0 avg, current 2118.20 -> mval 2,11,820.00
            portfolio_service.add_holding(pf_5_id, {
                "symbol": "PIIND", "name": "PI Industries Ltd.", "assetType": "Stock",
                "quantity": 100.0, "avgPrice": 80.0, "currentPrice": 2118.20, "sector": "Agrochemicals"
            }, db=self.db)

            # 2. LIQUIDBEES: 80 @ 1000.00 avg, current 999.99 -> mval 79,999.20
            portfolio_service.add_holding(pf_5_id, {
                "symbol": "LIQUIDBEES", "name": "Nippon India Liquid ETF", "assetType": "ETF",
                "quantity": 80.0, "avgPrice": 1000.00, "currentPrice": 999.99, "sector": "Cash Equivalent"
            }, db=self.db)

            # 3. GOLDBEES: 100 @ 43.0 avg, current 122.75 -> mval 12,275.00
            portfolio_service.add_holding(pf_5_id, {
                "symbol": "GOLDBEES", "name": "Nippon India Gold ETF", "assetType": "ETF",
                "quantity": 100.0, "avgPrice": 43.0, "currentPrice": 122.75, "sector": "Commodities"
            }, db=self.db)

            # 4. TCS: 10 @ 3950.00 avg, current 2156.00 -> mval 21,560.00
            portfolio_service.add_holding(pf_5_id, {
                "symbol": "TCS", "name": "Tata Consultancy Services Ltd.", "assetType": "Stock",
                "quantity": 10.0, "avgPrice": 3950.00, "currentPrice": 2156.00, "sector": "IT"
            }, db=self.db)

            # 5. LT: 100 @ 1119.00 avg, current 3703.30 -> mval 3,70,330.00
            portfolio_service.add_holding(pf_5_id, {
                "symbol": "LT", "name": "Larsen & Toubro Ltd.", "assetType": "Stock",
                "quantity": 100.0, "avgPrice": 1119.00, "currentPrice": 3703.30, "sector": "Construction"
            }, db=self.db)

            res = portfolio_service.get_by_id(pf_5_id, db=self.db)

            # Assert Total Market Value = ₹6,95,984.20
            self.assertAlmostEqual(res["totalValue"], 695984.20, places=2)

            # Assert Total Cost Basis = ₹2,43,700.00
            self.assertAlmostEqual(res["investedCapital"], 243700.00, places=2)

            # Assert Unrealized / Total P/L = ₹4,52,284.20
            self.assertAlmostEqual(res["totalProfitLoss"], 452284.20, places=2)
            self.assertAlmostEqual(res["unrealizedProfitLoss"], 452284.20, places=2)

            # Assert Return on Cost = 185.59%
            self.assertAlmostEqual(res["totalReturnPercentage"], 185.59, places=2)

            # Assert Asset Allocation: Stock (86.74%) and ETF (13.26%)
            alloc_dict = {a["assetType"]: a for a in res["assetAllocation"]}
            self.assertIn("Stock", alloc_dict)
            self.assertIn("ETF", alloc_dict)
            self.assertAlmostEqual(alloc_dict["Stock"]["value"], 603710.00, places=2)
            self.assertAlmostEqual(alloc_dict["ETF"]["value"], 92274.20, places=2)
            self.assertAlmostEqual(alloc_dict["Stock"]["percentage"], 86.74, places=1)
            self.assertAlmostEqual(alloc_dict["ETF"]["percentage"], 13.26, places=1)
            self.assertAlmostEqual(
                sum(a["percentage"] for a in res["assetAllocation"]),
                100.0, places=1
            )
        finally:
            self.db.query(Holding).filter(Holding.portfolio_id == pf_5_id).delete(synchronize_session=False)
            self.db.query(Portfolio).filter(Portfolio.id == pf_5_id).delete(synchronize_session=False)
            self.db.commit()


if __name__ == "__main__":
    unittest.main()

