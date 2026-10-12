import unittest
import os
import sys
from pathlib import Path

# Ensure backend directory is in sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.services.sector_service import sector_service
from app.services.instrument_master import instrument_master
from app.database import SessionLocal
from app.models.db_models import Holding, PaperPosition, Stock
from app.services.portfolio_service import portfolio_service


class TestSectorsAndDiversification(unittest.TestCase):
    def test_diverse_unrelated_stock_sectors(self):
        """Test multiple unrelated stocks and verify their sectors are different and correct."""
        expected = {
            "TATAMOTORS": "Automobile",
            "MARUTI": "Automobile",
            "M&M": "Automobile",
            "RELIANCE": "Energy",
            "ONGC": "Energy",
            "ADANIPOWER": "Energy",
            "NTPC": "Energy",
            "ITC": "FMCG",
            "HINDUNILVR": "FMCG",
            "HDFCBANK": "Banking",
            "ICICIBANK": "Banking",
            "SBIN": "Banking",
            "TCS": "IT",
            "INFY": "IT",
            "WIPRO": "IT",
            "SUNPHARMA": "Pharma",
            "CIPLA": "Pharma",
            "BAJFINANCE": "Financial Services",
            "JSWHL": "Financial Services",
            "TATACHEM": "Chemicals",
            "PIDILITIND": "Chemicals",
            "TATASTEEL": "Metals",
            "JSWSTEEL": "Metals",
            "DLF": "Realty",
            "LT": "Construction",
            "BHARTIARTL": "Telecom",
            "TITAN": "Consumer Goods",
            "NIFTYBEES": "Index ETF",
            "GOLDBEES": "Commodities",
            "LIQUIDBEES": "Cash Equivalent",
            "GSEC2033": "Government Debt",
        }

        sectors_seen = set()
        for symbol, exp_sector in expected.items():
            sec, ind = sector_service.get_sector_and_industry(symbol)
            if symbol == "RELIANCE":
                self.assertIn(sec, {"Refineries", "Energy"}, f"Stock {symbol} expected Refineries or Energy, got {sec}")
            else:
                self.assertEqual(
                    sec,
                    exp_sector,
                    f"Stock {symbol} expected sector {exp_sector}, got {sec}",
                )
            self.assertNotIn(
                sec,
                {"NSE_EQ", "BSE_EQ", "NSE_INDEX", "BSE_INDEX", "EQ"},
                f"Sector for {symbol} must never be exchange/segment/type!",
            )
            sectors_seen.add(sec)

        # Confirm we have at least 10 distinct, correct sectors
        self.assertGreaterEqual(
            len(sectors_seen),
            10,
            f"Expected at least 10 distinct sectors, got {len(sectors_seen)}: {sectors_seen}",
        )

    def test_unclassified_graceful_handling(self):
        """If sector information is unavailable, handle gracefully without fabricating data."""
        sec, ind = sector_service.get_sector_and_industry("NONEXISTENT_999_XYZ", "Random Unknown Private Ltd")
        self.assertEqual(sec, "Unclassified")
        self.assertEqual(ind, "Unclassified")

    def test_concept_separation(self):
        """Exchange, segment, instrument type, sector, and industry must be separate concepts."""
        infy = instrument_master.get_by_symbol("INFY")
        self.assertIsNotNone(infy)
        self.assertEqual(infy.exchange, "NSE")
        self.assertEqual(infy.segment, "NSE_EQ")
        self.assertEqual(infy.instrument_type, "EQ")

        sec, ind = sector_service.get_sector_and_industry(
            infy.trading_symbol,
            infy.name,
            infy.isin,
            infy.instrument_type,
        )
        self.assertEqual(sec, "IT")
        self.assertNotEqual(sec, infy.segment)
        self.assertNotEqual(sec, infy.exchange)
        self.assertNotEqual(sec, infy.instrument_type)

    def test_real_portfolio_diversification_math(self):
        """
        holding value = quantity × current market price
        sector percentage = sector holding value / total real portfolio value × 100
        """
        db = SessionLocal()
        try:
            portfolio = portfolio_service.get_by_id("p1", db=db)
            self.assertIsNotNone(portfolio)

            holdings = portfolio["holdings"]
            self.assertGreater(len(holdings), 0)

            total_val = sum(h["currentValue"] for h in holdings)
            self.assertAlmostEqual(portfolio["totalValue"], total_val, delta=0.01)

            # Check each holding uses quantity * current_price
            for h in holdings:
                expected_curr_val = round(h["quantity"] * h["currentPrice"], 2)
                self.assertAlmostEqual(h["currentValue"], expected_curr_val, delta=0.01)

            # Verify sector allocation math
            sector_alloc = portfolio["sectorAllocation"]
            self.assertGreater(len(sector_alloc), 1)

            # Check distinct non-general sectors
            for sa in sector_alloc:
                self.assertNotIn(sa["sector"], ["General", "NSE_EQ", "BSE_EQ"])

            total_pct = sum(sa["percentage"] for sa in sector_alloc)
            self.assertAlmostEqual(total_pct, 100.0, delta=1.0)
        finally:
            db.close()

    def test_strict_isolation_real_holdings_and_paper(self):
        """Real holdings and paper trading must be completely independent."""
        db = SessionLocal()
        try:
            real_count = db.query(Holding).count()
            paper_count = db.query(PaperPosition).count()

            # Confirm separate database tables and models
            self.assertGreater(real_count, 0)
            self.assertGreater(paper_count, 0)

            # Verify real portfolio p1 has zero paper positions in its computed holdings
            port_p1 = portfolio_service.get_by_id("p1", db=db)
            for h in port_p1["holdings"]:
                # Real holding has portfolioId / portfolio_id association, not account_id
                db_h = db.query(Holding).filter(Holding.id == h["id"]).first()
                self.assertIsNotNone(db_h)
                self.assertEqual(db_h.portfolio_id, "p1")
        finally:
            db.close()


if __name__ == "__main__":
    unittest.main()
