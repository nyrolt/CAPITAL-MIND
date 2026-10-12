import unittest
from datetime import datetime, timezone
from app.services.sector_service import (
    sector_service,
    fundamentals_client,
    BAD_SECTORS,
    UpstoxFundamentalsClient
)
from app.services.instrument_master import instrument_master
from app.database import SessionLocal
from app.models.db_models import Stock, Holding, PaperPosition
from app.services.portfolio_service import portfolio_service


class TestUpstoxFundamentalsSector(unittest.TestCase):
    """
    Verification test suite for Upstox Fundamentals Sector integration.
    """

    def test_a_fundamentals_api_direct_fetch(self):
        """A & B: Test the Upstox Fundamentals API directly with real ISINs and verify data.sector."""
        # 1. TCS
        tcs_isin = "INE467B01029"
        tcs_sec = fundamentals_client.fetch_sector(tcs_isin)
        self.assertIsNotNone(tcs_sec, "TCS sector from Fundamentals API should not be None")
        self.assertNotIn(tcs_sec, BAD_SECTORS, f"TCS sector must not be a bad sector code: {tcs_sec}")
        self.assertIn("IT", tcs_sec)

        # 2. RELIANCE
        rel_isin = "INE002A01018"
        rel_sec = fundamentals_client.fetch_sector(rel_isin)
        self.assertIsNotNone(rel_sec, "RELIANCE sector from Fundamentals API should not be None")
        self.assertNotIn(rel_sec, BAD_SECTORS)
        self.assertIn(rel_sec, {"Refineries", "Energy"})

        # 3. JSW STEEL
        jsw_isin = "INE019A01038"
        jsw_sec = fundamentals_client.fetch_sector(jsw_isin)
        self.assertIsNotNone(jsw_sec, "JSWSTEEL sector from Fundamentals API should not be None")
        self.assertNotIn(jsw_sec, BAD_SECTORS)
        self.assertIn("Steel", jsw_sec)

        # 4. MRF
        mrf_isin = "INE883A01011"
        mrf_sec = fundamentals_client.fetch_sector(mrf_isin)
        self.assertIsNotNone(mrf_sec, "MRF sector from Fundamentals API should not be None")
        self.assertNotIn(mrf_sec, BAD_SECTORS)
        self.assertIn("Tyre", mrf_sec)

        # Confirm distinct sectors
        sectors = {tcs_sec, rel_sec, jsw_sec, mrf_sec}
        self.assertEqual(len(sectors), 4, f"All 4 stocks must have distinct sectors, got: {sectors}")

    def test_b_database_caching_and_staleness(self):
        """C: Verify sector is stored and cached in the database (stocks.sector and sector_fetched_at)."""
        db = SessionLocal()
        try:
            # Check TCS stock record
            tcs_stock = db.query(Stock).filter(Stock.symbol == "TCS").first()
            if not tcs_stock:
                # Enrich to create record
                sec, ind = sector_service.get_sector_and_industry(
                    symbol="TCS",
                    company_name="Tata Consultancy Services Ltd.",
                    isin="INE467B01029",
                    db=db
                )
                tcs_stock = db.query(Stock).filter(Stock.symbol == "TCS").first()

            self.assertIsNotNone(tcs_stock)
            self.assertNotIn(tcs_stock.sector, BAD_SECTORS)
            self.assertEqual(tcs_stock.sector, "IT")

            # Check that sector_fetched_at is a valid recent timestamp
            fetched_at = getattr(tcs_stock, "sector_fetched_at", None)
            if fetched_at is not None:
                if isinstance(fetched_at, str):
                    fetched_at = datetime.fromisoformat(fetched_at)
                if fetched_at.tzinfo is None:
                    fetched_at = fetched_at.replace(tzinfo=timezone.utc)
                age_hours = (datetime.now(timezone.utc) - fetched_at).total_seconds() / 3600
                self.assertLess(age_hours, 24, "sector_fetched_at should be recent")
        finally:
            db.close()

    def test_c_stock_detail_sector_not_nse_eq(self):
        """D & E: Stock detail sector is NOT NSE_EQ or BSE_EQ for any stock."""
        test_symbols = ["TCS", "RELIANCE", "JSWSTEEL", "MRF", "INFY", "LT", "PIIND"]
        for sym in test_symbols:
            sec, ind = sector_service.get_sector_and_industry(sym)
            self.assertNotIn(
                sec,
                {"NSE_EQ", "BSE_EQ", "NSE_INDEX", "BSE_INDEX", "Equity", "General", "Unclassified"},
                f"{sym} sector must not be an exchange/segment code, got '{sec}'"
            )
            self.assertNotIn(
                ind,
                {"NSE_EQ", "BSE_EQ"},
                f"{sym} industry must not be an exchange/segment code, got '{ind}'"
            )

    def test_d_analytics_sector_diversification(self):
        """F: Portfolio sector diversification uses corrected sectors without Unclassified."""
        db = SessionLocal()
        try:
            port = portfolio_service.get_by_id("p1", db=db)
            sector_alloc = port.get("sectorAllocation", [])
            self.assertTrue(len(sector_alloc) > 0, "Sector allocation should not be empty")

            for item in sector_alloc:
                self.assertNotIn(
                    item["sector"],
                    {"NSE_EQ", "BSE_EQ", "Unclassified", "General", "Equity"},
                    f"Portfolio p1 sector allocation contains invalid sector: {item['sector']}"
                )
                self.assertGreater(item["value"], 0)
                self.assertGreater(item["percentage"], 0)
        finally:
            db.close()

    def test_e_paper_trading_separation(self):
        """G: Paper trading positions must NOT affect real portfolio sector diversification."""
        db = SessionLocal()
        try:
            # Get baseline sector allocation for real portfolio p1
            port_before = portfolio_service.get_by_id("p1", db=db)
            alloc_before = {s["sector"]: s["value"] for s in port_before.get("sectorAllocation", [])}

            # Get or create paper trading account
            from app.models.db_models import PaperTradingAccount
            test_uid = "usr_dev_001"
            acct = db.query(PaperTradingAccount).filter(PaperTradingAccount.user_id == test_uid).first()
            if not acct:
                acct = PaperTradingAccount(user_id=test_uid, cash_balance=1000000.0)
                db.add(acct)
                db.flush()

            # Create an artificial paper position for test user
            paper_pos = PaperPosition(
                account_id=acct.id,
                user_id=test_uid,
                symbol="TITAN",
                company_name="Titan Company Limited",
                quantity=1000,
                average_price=3500.0,
                current_price=3600.0,
                sector="Consumer Goods"
            )
            db.add(paper_pos)
            db.commit()

            # Re-fetch real portfolio p1
            port_after = portfolio_service.get_by_id("p1", db=db)
            alloc_after = {s["sector"]: s["value"] for s in port_after.get("sectorAllocation", [])}

            # TITAN or paper positions must NOT appear in real portfolio
            self.assertNotIn("Consumer Goods", alloc_after if "Consumer Goods" not in alloc_before else {})
            self.assertEqual(alloc_before, alloc_after, "Paper position mutated real portfolio allocation!")

            # Clean up
            db.delete(paper_pos)
            db.commit()
        finally:
            db.close()


if __name__ == "__main__":
    unittest.main()
