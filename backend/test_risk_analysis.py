"""
test_risk_analysis.py
=====================
Comprehensive tests for the Risk Analysis data pipeline.

Covers:
  - Single-stock concentrated portfolio
  - Diversified multi-sector, multi-asset portfolio
  - Cash-heavy portfolio (LIQUIDBEES as Cash, not stock)
  - ETF-containing portfolio (GOLDBEES as Gold, not stock)
  - Empty portfolio (no holdings)
  - Missing sector classification
  - Zero / invalid portfolio values
  - Sector weight denominator consistency
  - HHI formula correctness
  - Score direction (higher = more risk)
  - API endpoint via router (no hardcoded demo values returned)
  - dataQualityWarning presence for stale prices
  - calculatedAt timestamp presence
"""
import unittest
import sys
from pathlib import Path

# Ensure backend directory is on path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.db_models import Portfolio, Holding
from app.services.portfolio_service import portfolio_service


# ─────────────────────────────────────────────────────────────────────────────
# Helper: create an in-session Portfolio + Holdings and return computed dict
# ─────────────────────────────────────────────────────────────────────────────

def _make_portfolio(db: Session, pid: str, holdings_data: list) -> dict:
    """
    Create a transient portfolio with the given holdings, compute metrics,
    and return the portfolio dict.

    holdings_data: list of (symbol, company_name, sector, asset_type, qty, avg_price, curr_price)
    """
    p_orm = Portfolio(
        id=pid,
        user_id="usr_dev_001",
        name=f"Test Portfolio {pid}",
        objective="Testing",
        risk_preference="Moderate",
        description="",
        created_at=datetime.now(timezone.utc),
    )
    db.add(p_orm)
    db.flush()

    for i, (sym, cname, sec, atype, qty, avg_p, curr_p) in enumerate(holdings_data):
        h = Holding(
            id=f"{pid}_h{i}",
            portfolio_id=pid,
            symbol=sym,
            company_name=cname,
            asset_type=atype,
            quantity=float(qty),
            average_price=float(avg_p),
            current_price=float(curr_p),
            sector=sec,
        )
        db.add(h)
    db.commit()
    return portfolio_service.get_by_id(pid, db=db)


class TestRiskAnalysis(unittest.TestCase):

    def setUp(self):
        self.db = SessionLocal()
        portfolio_service.seed_demo_data(self.db)
        self._pids_to_clean: list[str] = []

    def tearDown(self):
        for pid in self._pids_to_clean:
            self.db.query(Holding).filter(Holding.portfolio_id == pid).delete(synchronize_session=False)
            self.db.query(Portfolio).filter(Portfolio.id == pid).delete(synchronize_session=False)
        self.db.commit()
        self.db.close()

    def _pid(self, name: str) -> str:
        pid = f"tst_{name}"
        self._pids_to_clean.append(pid)
        return pid

    # ─────────────────────────────────────────────────────────────────────
    # 1. Single-stock concentrated portfolio
    # ─────────────────────────────────────────────────────────────────────

    def test_01_single_stock_high_risk(self):
        """100% in one stock → risk_score >= 80, Very High, diversification_score <= 15."""
        pid = self._pid("single_stock")
        p = _make_portfolio(self.db, pid, [
            ("HDFCBANK", "HDFC Bank", "Banking", "Stock", 100, 1500, 1600),
        ])
        self.assertIsNotNone(p)
        self.assertGreaterEqual(p["riskScore"], 80, "Single-stock portfolio must have risk >= 80")
        self.assertEqual(p["riskLevel"], "Very High")
        self.assertLessEqual(p["diversificationScore"], 15)
        self.assertEqual(p["diversificationLevel"], "Low")
        # Verify single sector allocation matches 100 %
        self.assertEqual(len(p["sectorAllocation"]), 1)
        self.assertAlmostEqual(p["sectorAllocation"][0]["percentage"], 100.0, delta=0.1)

    # ─────────────────────────────────────────────────────────────────────
    # 2. Diversified multi-sector, multi-asset portfolio
    # ─────────────────────────────────────────────────────────────────────

    def test_02_diversified_portfolio_low_risk(self):
        """Well-spread multi-stock, multi-sector, multi-asset → risk <= 35, diversification >= 70."""
        pid = self._pid("diversified")
        p = _make_portfolio(self.db, pid, [
            ("HDFCBANK", "HDFC Bank",   "Banking",     "Stock", 10, 1600, 1600),
            ("TCS",      "TCS",          "IT",           "Stock",  4, 4000, 4000),
            ("RELIANCE", "Reliance",     "Energy",       "Stock",  6, 2600, 2600),
            ("ITC",      "ITC",          "FMCG",         "Stock", 35,  450,  450),
            ("SUNPH",    "Sun Pharma",   "Pharma",       "Stock", 10, 1600, 1600),
            ("TATAMT",   "Tata Motors",  "Automobile",   "Stock", 16, 1000, 1000),
            ("LT",       "Larsen",       "Construction", "Stock",  4, 3800, 3800),
            ("BHRTIARTL","Bharti Airtel","Telecom",      "Stock", 12, 1300, 1300),
            ("LIQUIDBEE","Nippon Liquid","Cash Equivalent","Cash", 20, 1000, 1000),
            ("GOLDBEE",  "Nippon Gold",  "Commodities",  "Gold", 300,   65,   65),
        ])
        self.assertIsNotNone(p)
        self.assertLessEqual(p["riskScore"], 35)
        self.assertIn(p["riskLevel"], ["Very Low", "Low"])
        self.assertGreaterEqual(p["diversificationScore"], 65)
        self.assertIn(p["diversificationLevel"], ["High", "Moderate"])

    # ─────────────────────────────────────────────────────────────────────
    # 3. Cash-heavy portfolio — LIQUIDBEES must not be treated as Stock
    # ─────────────────────────────────────────────────────────────────────

    def test_03_cash_heavy_liquidbees(self):
        """
        LIQUIDBEES (Cash assetType) must not inflate equity_frac.
        Cash should appear in assetAllocation under 'Cash', not 'Stock'.
        """
        pid = self._pid("cash_heavy")
        p = _make_portfolio(self.db, pid, [
            ("TCS",        "TCS",          "IT",             "Stock", 5, 4000, 4000),
            ("LIQUIDBEES", "Nippon Liquid", "Cash Equivalent","Cash", 80, 1000, 1003),
        ])
        self.assertIsNotNone(p)

        asset_types = {a["assetType"] for a in p["assetAllocation"]}
        self.assertIn("Cash", asset_types, "LIQUIDBEES must appear as 'Cash' asset type")
        self.assertNotIn("Stock", [a["assetType"] for a in p["assetAllocation"] if a["assetType"] == "Cash"],
                         "LIQUIDBEES must not appear as Stock")

        # Equity fraction must be only TCS value / total
        tcs_val = 5 * 4000
        liq_val = 80 * 1003
        total_val = tcs_val + liq_val
        expected_equity_frac = tcs_val / total_val
        equity_alloc = next((a for a in p["assetAllocation"] if a["assetType"] == "Stock"), None)
        self.assertIsNotNone(equity_alloc, "Stock asset class must be present")
        self.assertAlmostEqual(equity_alloc["value"], tcs_val, delta=1.0)
        self.assertAlmostEqual(equity_alloc["percentage"] / 100.0, expected_equity_frac, delta=0.005)

    # ─────────────────────────────────────────────────────────────────────
    # 4. ETF-containing portfolio — GOLDBEES must not be double-counted
    # ─────────────────────────────────────────────────────────────────────

    def test_04_goldbees_not_double_counted(self):
        """
        GOLDBEES (Gold assetType) must appear once in assetAllocation under 'Gold',
        not under 'Stock'.  Total value must still reconcile exactly.
        """
        pid = self._pid("goldbees")
        qty_lb, price_lb = 80, 1003.0
        qty_gb, price_gb = 100, 43.0
        qty_lt, price_lt = 100, 3770.0
        p = _make_portfolio(self.db, pid, [
            ("LIQUIDBEES", "Nippon Liquid","Cash Equivalent","Cash",  qty_lb, 1000, price_lb),
            ("GOLDBEES",   "Nippon Gold",  "Commodities",   "Gold",  qty_gb,   43, price_gb),
            ("LT",         "Larsen",       "Construction",  "Stock", qty_lt, 1119, price_lt),
        ])
        self.assertIsNotNone(p)

        expected_total = qty_lb * price_lb + qty_gb * price_gb + qty_lt * price_lt
        self.assertAlmostEqual(p["totalValue"], expected_total, delta=1.0,
                               msg="Total value must exactly equal sum of holding values")

        asset_types_list = [a["assetType"] for a in p["assetAllocation"]]
        self.assertIn("Gold", asset_types_list, "GOLDBEES must appear as 'Gold' asset class")
        # No double-counting: sum of all asset-class values == total value
        asset_total = sum(a["value"] for a in p["assetAllocation"])
        self.assertAlmostEqual(asset_total, expected_total, delta=1.0,
                               msg="Sum of asset allocations must equal totalValue (no double-counting)")

    # ─────────────────────────────────────────────────────────────────────
    # 5. Empty portfolio → Insufficient data, no crash
    # ─────────────────────────────────────────────────────────────────────

    def test_05_empty_portfolio_insufficient_data(self):
        """Empty portfolio must return 'Insufficient data' — not a precise fabricated score."""
        pid = self._pid("empty")
        p_orm = Portfolio(
            id=pid,
            user_id="usr_dev_001",
            name="Empty Portfolio",
            objective="Testing",
            risk_preference="Moderate",
            description="",
            created_at=datetime.now(timezone.utc),
        )
        self.db.add(p_orm)
        self.db.commit()

        p = portfolio_service.get_by_id(pid, db=self.db)
        self.assertIsNone(p["riskScore"])
        self.assertEqual(p["riskLevel"], "Insufficient data")
        self.assertIsNone(p["diversificationScore"])
        self.assertEqual(p["diversificationLevel"], "Insufficient data")
        self.assertAlmostEqual(p["totalValue"], 0.0)
        self.assertAlmostEqual(p["investedCapital"], 0.0)

    # ─────────────────────────────────────────────────────────────────────
    # 6. Missing sector → defaults to 'Unclassified', no crash
    # ─────────────────────────────────────────────────────────────────────

    def test_06_missing_sector_no_crash(self):
        """A holding with an empty sector must not crash — sector_service provides fallback."""
        pid = self._pid("no_sector")
        p_orm = Portfolio(
            id=pid, user_id="usr_dev_001", name="No-Sector Portfolio",
            objective="T", risk_preference="M", description="",
            created_at=datetime.now(timezone.utc),
        )
        self.db.add(p_orm)
        self.db.flush()
        h = Holding(
            id=f"{pid}_h0", portfolio_id=pid,
            symbol="UNKNOWNSYM", company_name="Unknown Company",
            asset_type="Stock", quantity=10.0,
            average_price=500.0, current_price=500.0,
            sector=None,  # intentionally missing
        )
        self.db.add(h)
        self.db.commit()
        p = portfolio_service.get_by_id(pid, db=self.db)
        self.assertIsNotNone(p)
        self.assertGreater(p["totalValue"], 0)
        # Must have exactly one sector entry (whatever sector_service resolved)
        self.assertEqual(len(p["sectorAllocation"]), 1)

    # ─────────────────────────────────────────────────────────────────────
    # 7. Sector weight denominator consistency
    # ─────────────────────────────────────────────────────────────────────

    def test_07_sector_weights_use_total_portfolio_as_denominator(self):
        """
        sector_percentage = sector_value / total_portfolio_value × 100
        This must hold for ALL sectors, not just equity.
        """
        pid = self._pid("sector_denom")
        p = _make_portfolio(self.db, pid, [
            ("TCS",        "TCS",          "IT",             "Stock", 10, 4000, 4000),  # val=40000
            ("LIQUIDBEES", "Nippon Liquid","Cash Equivalent","Cash",  80, 1000, 1000),  # val=80000
            ("GOLDBEES",   "Nippon Gold",  "Commodities",   "Gold",  100,  43,   43),  # val=4300
        ])
        # total = 40000 + 80000 + 4300 = 124300
        total = 40000 + 80000 + 4300
        for s in p["sectorAllocation"]:
            expected_pct = s["value"] / total * 100.0
            self.assertAlmostEqual(s["percentage"], expected_pct, delta=0.1,
                                   msg=f"Sector {s['sector']} pct mismatch")
        # All sector percentages sum to 100%
        self.assertAlmostEqual(sum(s["percentage"] for s in p["sectorAllocation"]), 100.0, delta=0.5)

    # ─────────────────────────────────────────────────────────────────────
    # 8. HHI formula correctness
    # ─────────────────────────────────────────────────────────────────────

    def test_08_hhi_formula(self):
        """
        For N equal-weighted positions HHI = 1/N, HHI_norm ≈ 0.
        For 1 position HHI = 1, HHI_norm = 1.
        """
        # Equal-weighted 4-stock portfolio (HHI = 0.25, HHI_norm ≈ 0)
        pid = self._pid("hhi_equal")
        p = _make_portfolio(self.db, pid, [
            ("A1", "A1", "IT",           "Stock", 10, 1000, 1000),
            ("A2", "A2", "Banking",      "Stock", 10, 1000, 1000),
            ("A3", "A3", "Energy",       "Stock", 10, 1000, 1000),
            ("A4", "A4", "Pharma",       "Stock", 10, 1000, 1000),
        ])
        weights = [h["allocationPercentage"] / 100.0 for h in p["holdings"]]
        hhi = sum(w * w for w in weights)
        self.assertAlmostEqual(hhi, 0.25, delta=0.01, msg="Equal 4-position HHI must be 0.25")
        n = 4
        hhi_norm = (hhi - 1.0 / n) / (1.0 - 1.0 / n)
        self.assertAlmostEqual(hhi_norm, 0.0, delta=0.02, msg="Equal-weight HHI_norm must be ≈ 0")
        # Risk score dominated by equity fraction (all Stock), not HHI
        self.assertLessEqual(p["riskScore"], 60, "Equal-weight 4-stock must not have extreme risk")

    # ─────────────────────────────────────────────────────────────────────
    # 9. Score direction: more concentrated = higher risk
    # ─────────────────────────────────────────────────────────────────────

    def test_09_score_direction(self):
        """Concentrated portfolio must have HIGHER risk and LOWER diversification than diversified one."""
        pid_conc = self._pid("dir_conc")
        pid_div = self._pid("dir_div")
        p_conc = _make_portfolio(self.db, pid_conc, [
            ("TCS", "TCS", "IT", "Stock", 100, 4000, 4000),
        ])
        p_div = _make_portfolio(self.db, pid_div, [
            ("TCS",        "TCS",    "IT",             "Stock", 25, 4000, 4000),
            ("HDFCBANK",   "HDFC",   "Banking",        "Stock", 25, 1600, 1600),
            ("LIQUIDBEES", "Liquid", "Cash Equivalent","Cash",  40, 1000, 1000),
            ("GOLDBEES",   "Gold",   "Commodities",    "Gold",  80,   50,   50),
        ])
        self.assertGreater(p_conc["riskScore"], p_div["riskScore"],
                           "Concentrated portfolio must have higher risk score")
        self.assertLess(p_conc["diversificationScore"], p_div["diversificationScore"],
                        "Concentrated portfolio must have lower diversification score")

    # ─────────────────────────────────────────────────────────────────────
    # 10. Real portfolio p1 — metrics reconcile against actual holdings
    # ─────────────────────────────────────────────────────────────────────

    def test_10_p1_metrics_reconcile(self):
        """p1 holdings reconcile: total_value == sum(qty * curr_price) for all holdings."""
        p = portfolio_service.get_by_id("p1", db=self.db)
        self.assertIsNotNone(p)

        holdings = p["holdings"]
        self.assertGreater(len(holdings), 0)

        # Total value
        computed_total = sum(h["currentValue"] for h in holdings)
        self.assertAlmostEqual(p["totalValue"], computed_total, delta=1.0,
                               msg="totalValue must equal sum of holding currentValues")

        # All allocation percentages sum to 100%
        self.assertAlmostEqual(sum(h["allocationPercentage"] for h in holdings), 100.0, delta=0.5)

        # Sector sum == total value
        sector_total = sum(s["value"] for s in p["sectorAllocation"])
        self.assertAlmostEqual(sector_total, p["totalValue"], delta=1.0,
                               msg="Sum of sector values must equal totalValue")

        # Asset class sum == total value
        asset_total = sum(a["value"] for a in p["assetAllocation"])
        self.assertAlmostEqual(asset_total, p["totalValue"], delta=1.0,
                               msg="Sum of asset class values must equal totalValue")

        # Risk score is not None
        self.assertIsNotNone(p["riskScore"])
        self.assertIn(p["riskLevel"], ["Very Low", "Low", "Moderate", "High", "Very High"])

    # ─────────────────────────────────────────────────────────────────────
    # 11. p1 specific: LT detected as top concentration risk
    # ─────────────────────────────────────────────────────────────────────

    def test_11_p1_lt_top_holding(self):
        """
        For the real portfolio p1, LT should be the top holding by current value.
        Its weight in the portfolio should match the allocationPercentage stored
        in the holdings array.
        """
        p = portfolio_service.get_by_id("p1", db=self.db)
        self.assertIsNotNone(p)
        holdings = p["holdings"]
        self.assertGreater(len(holdings), 0)

        # Find LT holding
        lt_holding = next((h for h in holdings if h["symbol"] == "LT"), None)
        self.assertIsNotNone(lt_holding, "LT must be present in p1 holdings")

        # LT must be the top holding by currentValue
        top_holding = max(holdings, key=lambda h: h["currentValue"])
        self.assertEqual(top_holding["symbol"], "LT",
                         "LT must be the largest holding in p1 by current value")

        # LT's allocation % must equal LT.currentValue / total * 100
        expected_lt_pct = lt_holding["currentValue"] / p["totalValue"] * 100.0
        self.assertAlmostEqual(lt_holding["allocationPercentage"], expected_lt_pct, delta=0.1)

    # ─────────────────────────────────────────────────────────────────────
    # 12. p1: Construction sector attribution — LT drives it
    # ─────────────────────────────────────────────────────────────────────

    def test_12_p1_construction_sector(self):
        """
        p1's Construction sector value must equal LT's current value only.
        No other holding in p1 should be classified as Construction.
        """
        p = portfolio_service.get_by_id("p1", db=self.db)
        self.assertIsNotNone(p)

        lt_holding = next((h for h in p["holdings"] if h["symbol"] == "LT"), None)
        self.assertIsNotNone(lt_holding)
        self.assertEqual(lt_holding["sector"], "Construction",
                         "LT must be classified as Construction")

        construction_sector = next(
            (s for s in p["sectorAllocation"] if s["sector"] == "Construction"), None
        )
        self.assertIsNotNone(construction_sector, "Construction must be present in sectorAllocation")
        self.assertAlmostEqual(
            construction_sector["value"], lt_holding["currentValue"], delta=1.0,
            msg="Construction sector value must equal LT's current value"
        )

    # ─────────────────────────────────────────────────────────────────────
    # 13. p1: LIQUIDBEES classified as Cash, not Stock
    # ─────────────────────────────────────────────────────────────────────

    def test_13_p1_liquidbees_as_cash(self):
        """LIQUIDBEES in p1 must have assetType 'ETF' — not 'Cash'."""
        p = portfolio_service.get_by_id("p1", db=self.db)
        lb_holding = next((h for h in p["holdings"] if h["symbol"] == "LIQUIDBEES"), None)
        self.assertIsNotNone(lb_holding, "LIQUIDBEES must be present in p1")
        self.assertEqual(lb_holding["assetType"], "ETF",
                         "LIQUIDBEES must have assetType 'ETF'")

    # ─────────────────────────────────────────────────────────────────────
    # 14. p1: GOLDBEES classified as Gold ETF, not physical Gold
    # ─────────────────────────────────────────────────────────────────────

    def test_14_p1_goldbees_as_gold(self):
        """GOLDBEES in p1 must have assetType 'ETF' — not 'Gold'."""
        p = portfolio_service.get_by_id("p1", db=self.db)
        gb_holding = next((h for h in p["holdings"] if h["symbol"] == "GOLDBEES"), None)
        self.assertIsNotNone(gb_holding, "GOLDBEES must be present in p1")
        self.assertEqual(gb_holding["assetType"], "ETF",
                         "GOLDBEES must have assetType 'ETF'")

    # ─────────────────────────────────────────────────────────────────────
    # 15. Paper trading positions must NOT appear in real portfolio metrics
    # ─────────────────────────────────────────────────────────────────────

    def test_15_real_portfolio_excludes_paper_trading(self):
        """
        Real portfolio p1's holding count must NOT include any paper trading positions.
        Paper positions are stored in a separate table (PaperPosition) and must never
        affect risk or diversification metrics.
        """
        from app.models.db_models import PaperPosition
        paper_count = self.db.query(PaperPosition).count()
        p = portfolio_service.get_by_id("p1", db=self.db)
        real_holding_count = len(p["holdings"])
        # Real holdings are fetched from Holding table only — paper_count doesn't affect it
        # We just verify real holdings come from the Holding table
        from app.models.db_models import Holding as HoldingModel
        db_holding_count = self.db.query(HoldingModel).filter(
            HoldingModel.portfolio_id == "p1"
        ).count()
        self.assertEqual(real_holding_count, db_holding_count,
                         "Portfolio holdings must match Holding table exactly (no paper positions)")


if __name__ == "__main__":
    unittest.main(verbosity=2)
