import unittest
import asyncio
import os
import sys
from pathlib import Path

# Ensure backend directory is in sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from datetime import datetime, timezone
from app.services.portfolio_service import portfolio_service
from app.database import SessionLocal
from app.models.db_models import Portfolio, Holding, User, Transaction
from app.routers.risk import router

class TestPortfolioCalculationsAndAnalytics(unittest.TestCase):
    def setUp(self):
        self.db = SessionLocal()
        portfolio_service.seed_demo_data(self.db)

    def tearDown(self):
        # Clean up any test holdings and portfolios created
        self.db.query(Holding).filter(Holding.portfolio_id.like("test_pf_%")).delete(synchronize_session=False)
        self.db.query(Portfolio).filter(Portfolio.id.like("test_pf_%")).delete(synchronize_session=False)
        self.db.commit()
        self.db.close()

    def test_01_portfolio_metric_reconciliation(self):
        """Verify that totalValue, investedCapital, P/L, asset & sector allocations reconcile perfectly."""
        p = portfolio_service.get_by_id("p1", db=self.db)
        self.assertIsNotNone(p)

        holdings = p["holdings"]
        self.assertGreater(len(holdings), 0)

        # 1. Total value must equal sum of holding market values
        computed_market_val = sum(h["currentValue"] for h in holdings)
        self.assertAlmostEqual(p["totalValue"], computed_market_val, places=2)

        # 2. Invested capital must equal sum of invested values
        computed_invested = sum(h["investedValue"] for h in holdings)
        self.assertAlmostEqual(p["investedCapital"], computed_invested, places=2)

        # 3. P/L reconciliation
        expected_pl = computed_market_val - computed_invested
        self.assertAlmostEqual(p["profitLoss"], expected_pl, places=2)
        self.assertAlmostEqual(p["unrealizedProfitLoss"], expected_pl, places=2)
        self.assertAlmostEqual(p["totalProfitLoss"], expected_pl, places=2)

        # 4. Return % reconciliation
        expected_ret_pct = (expected_pl / computed_invested * 100.0) if computed_invested > 0 else 0.0
        self.assertAlmostEqual(p["returnPercentage"], expected_ret_pct, places=2)

        # 5. Asset allocation reconciliation: sum of asset values must equal totalValue
        asset_alloc = p["assetAllocation"]
        self.assertGreater(len(asset_alloc), 0)
        sum_asset_values = sum(a["value"] for a in asset_alloc)
        self.assertAlmostEqual(sum_asset_values, p["totalValue"], places=2)

        # Asset percentages sum to ~100%
        sum_asset_pcts = sum(a["percentage"] for a in asset_alloc)
        self.assertAlmostEqual(sum_asset_pcts, 100.0, delta=0.5)

        # 6. Sector allocation reconciliation: sum of sector values must equal totalValue
        sector_alloc = p["sectorAllocation"]
        self.assertGreater(len(sector_alloc), 0)
        sum_sector_values = sum(s["value"] for s in sector_alloc)
        self.assertAlmostEqual(sum_sector_values, p["totalValue"], places=2)

        sum_sector_pcts = sum(s["percentage"] for s in sector_alloc)
        self.assertAlmostEqual(sum_sector_pcts, 100.0, delta=0.5)

    def test_02_concentrated_sample_portfolio_risk_and_diversification(self):
        """A concentrated portfolio (single stock) must produce a high risk score and low diversification score."""
        pf_id = "test_pf_concentrated"
        p_orm = Portfolio(
            id=pf_id,
            user_id="usr_dev_001",
            name="Concentrated Stock Portfolio",
            objective="Aggressive Growth",
            risk_preference="Aggressive",
            description="Single stock concentrated holding",
            created_at=datetime.now(timezone.utc)
        )
        self.db.add(p_orm)
        self.db.flush()

        # 100% in a single equity stock
        h1 = Holding(
            id="h_conc_1",
            portfolio_id=pf_id,
            symbol="HDFCBANK",
            company_name="HDFC Bank Ltd.",
            asset_type="Stock",
            quantity=100.0,
            average_price=1500.0,
            current_price=1600.0,
            sector="Banking"
        )
        self.db.add(h1)
        self.db.commit()

        p = portfolio_service.get_by_id(pf_id, db=self.db)
        self.assertIsNotNone(p)

        # High risk score (≥ 80) and Low diversification score (≤ 15)
        self.assertGreaterEqual(p["riskScore"], 80)
        self.assertEqual(p["riskLevel"], "Very High")
        self.assertLessEqual(p["diversificationScore"], 15)
        self.assertEqual(p["diversificationLevel"], "Low")

    def test_03_diversified_sample_portfolio_risk_and_diversification(self):
        """A well-spread multi-stock, multi-sector, multi-asset portfolio must yield low risk and high diversification."""
        pf_id = "test_pf_diversified"
        p_orm = Portfolio(
            id=pf_id,
            user_id="usr_dev_001",
            name="All-Weather Diversified Portfolio",
            objective="Balanced Wealth Preservation",
            risk_preference="Conservative",
            description="Broad multi-asset multi-sector portfolio",
            created_at=datetime.now(timezone.utc)
        )
        self.db.add(p_orm)
        self.db.flush()

        # 10 balanced holdings across different sectors and asset types (Stock, Cash, Gold)
        holdings_data = [
            ("HDFCBANK", "Banking", "Stock", 10.0, 1600.0),
            ("TCS", "IT", "Stock", 4.0, 4000.0),
            ("RELIANCE", "Energy", "Stock", 6.0, 2600.0),
            ("ITC", "FMCG", "Stock", 35.0, 450.0),
            ("SUNPHARMA", "Pharma", "Stock", 10.0, 1600.0),
            ("TATAMOTORS", "Automobile", "Stock", 16.0, 1000.0),
            ("LT", "Construction", "Stock", 4.0, 3800.0),
            ("BHARTIARTL", "Telecom", "Stock", 12.0, 1300.0),
            ("LIQUIDBEES", "Cash Equivalent", "Cash", 20.0, 1000.0),
            ("GOLDBEES", "Commodities", "Gold", 300.0, 65.0),
        ]

        for i, (sym, sec, atype, qty, price) in enumerate(holdings_data):
            h = Holding(
                id=f"h_div_{i}",
                portfolio_id=pf_id,
                symbol=sym,
                company_name=sym,
                asset_type=atype,
                quantity=qty,
                average_price=price,
                current_price=price,
                sector=sec
            )
            self.db.add(h)
        self.db.commit()

        p = portfolio_service.get_by_id(pf_id, db=self.db)
        self.assertIsNotNone(p)

        # Normalized HHI is low, sectors well below 30% cap, multi-asset breadth is 100%
        self.assertLessEqual(p["riskScore"], 35)
        self.assertIn(p["riskLevel"], ["Very Low", "Low"])
        self.assertGreaterEqual(p["diversificationScore"], 75)
        self.assertEqual(p["diversificationLevel"], "High")

    def test_04_empty_portfolio_insufficient_data(self):
        """An empty portfolio with 0 holdings must return 'Insufficient data' instead of misleading precise scores."""
        pf_id = "test_pf_empty"
        p_orm = Portfolio(
            id=pf_id,
            user_id="usr_dev_001",
            name="Empty New Portfolio",
            objective="Wealth Maximization",
            risk_preference="Moderate",
            description="No holdings yet",
            created_at=datetime.now(timezone.utc)
        )
        self.db.add(p_orm)
        self.db.commit()

        p = portfolio_service.get_by_id(pf_id, db=self.db)
        self.assertIsNotNone(p)

        self.assertIsNone(p["riskScore"])
        self.assertEqual(p["riskLevel"], "Insufficient data")
        self.assertIsNone(p["diversificationScore"])
        self.assertEqual(p["diversificationLevel"], "Insufficient data")
        self.assertEqual(p["totalValue"], 0.0)
        self.assertEqual(p["investedCapital"], 0.0)

    def test_05_portfolio_history_endpoint(self):
        """
        Verify get_portfolio_history returns at least one point with required fields.

        NOTE: When only one EOD snapshot exists (e.g. on the day of server bootstrap),
        the history list will contain exactly 1 point -- this is correct and expected.
        A full chart requires 2+ snapshots, which accumulate after the next 4:15 PM IST
        EOD snapshot fires.  We therefore assert >= 1 here.
        """
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            for tf in ["1M", "3M", "6M", "1Y", "ALL"]:
                history = loop.run_until_complete(
                    portfolio_service.get_portfolio_history("p1", timeframe=tf, db=self.db)
                )
                self.assertIsInstance(history, list)
                # At minimum 1 point (today's auto-seeded snapshot)
                self.assertGreaterEqual(len(history), 1,
                                        f"History for timeframe {tf} must contain >= 1 point")
                self.assertIn("date", history[0])
                self.assertIn("portfolioValue", history[0])
                self.assertIn("periodReturnPercentage", history[0])

                # Last point value must reconcile with current portfolio total
                p1 = portfolio_service.get_by_id("p1", db=self.db)
                self.assertAlmostEqual(
                    history[-1]["portfolioValue"], p1["totalValue"], delta=10.0,
                    msg=f"Last history point for {tf} must match current portfolio value"
                )
        finally:
            loop.close()

if __name__ == "__main__":
    unittest.main()
