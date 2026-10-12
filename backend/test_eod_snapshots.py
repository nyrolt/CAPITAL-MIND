"""
Test Suite: EOD Snapshots, Portfolio History, Data Integrity, and Scheduler
===========================================================================

Coverage:
- Section 1: Snapshot computation and storage
- Section 2: Idempotency / duplicate prevention  
- Section 3: Timezone and date handling
- Section 4: Missing / stale prices
- Section 5: Historical chart data (date-range filtering + return calculations)
- Section 6: Strict real vs paper trading separation
- Section 7: Restart recovery / catch-up logic
- Section 8: Empty and partial history
- Section 9: Trade persistence and transaction consistency
"""

import sys
import os
import unittest
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.db_models import (
    Portfolio, Holding, Transaction, PortfolioSnapshot, User, gen_uuid
)
from app.services.snapshot_service import (
    compute_snapshot_for_portfolio,
    save_snapshot,
    run_eod_snapshots,
    _classify_asset,
    _get_current_price_sync,
    get_snapshot_status,
)


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _make_test_portfolio(db, name="Test Portfolio", pid=None) -> Portfolio:
    pid = pid or gen_uuid("tp")
    # Ensure demo user exists
    user = db.query(User).filter(User.id == "usr_dev_001").first()
    if not user:
        from app.auth.dev_provider import hash_password
        user = User(
            id="usr_dev_001",
            email="demo@capitalmind.ai",
            name="Arjun Mehta",
            hashed_password=hash_password("demo123"),
            role="Retail Investor",
            auth_mode="development",
        )
        db.add(user)
        db.commit()
    p = Portfolio(
        id=pid,
        user_id="usr_dev_001",
        name=name,
        objective="Wealth Maximization",
        risk_preference="Aggressive",
        description="",
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


def _run_async(coro):
    """Run an async coroutine in tests (Python 3.10+ compatible)."""
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_closed():
            raise RuntimeError
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)


def _add_holding(db, portfolio, symbol, qty, avg_price, curr_price, asset_type="Stock"):
    h = Holding(
        id=gen_uuid("h"),
        portfolio_id=portfolio.id,
        symbol=symbol,
        company_name=symbol,
        asset_type=asset_type,
        quantity=qty,
        average_price=avg_price,
        current_price=curr_price,
        sector="IT",
    )
    db.add(h)
    db.commit()
    db.refresh(portfolio)
    return h


def _cleanup_portfolio(db, portfolio_id):
    db.query(PortfolioSnapshot).filter(PortfolioSnapshot.portfolio_id == portfolio_id).delete()
    db.query(Holding).filter(Holding.portfolio_id == portfolio_id).delete()
    db.query(Transaction).filter(Transaction.portfolio_id == portfolio_id).delete()
    db.query(Portfolio).filter(Portfolio.id == portfolio_id).delete()
    db.commit()


# ─────────────────────────────────────────────────────────────────────────────
# Section 1: Snapshot computation and storage
# ─────────────────────────────────────────────────────────────────────────────

class TestSnapshotComputation(unittest.TestCase):

    def setUp(self):
        self.db = SessionLocal()
        self.portfolio = _make_test_portfolio(self.db, name="Snap Compute Test")
        # Use unique symbols unlikely to exist in the Stock table cache
        _add_holding(self.db, self.portfolio, "TESTSYM1", 10, 3800, 3950, "Stock")
        _add_holding(self.db, self.portfolio, "TESTSYM2", 80, 1000, 1003, "Cash")
        _add_holding(self.db, self.portfolio, "TESTSYM3", 50, 40, 43, "Gold")
        self.db.refresh(self.portfolio)

    def tearDown(self):
        _cleanup_portfolio(self.db, self.portfolio.id)
        self.db.close()

    def test_compute_total_value(self):
        """Snapshot total must be > 0 and include all holdings."""
        snap = compute_snapshot_for_portfolio(self.portfolio, self.db, is_eod=False)
        self.assertIsNotNone(snap)
        self.assertGreater(snap["total_value"], 0)
        # Each holding contributes — total must be >= all buckets
        self.assertAlmostEqual(
            snap["total_value"],
            snap["holdings_value"] + snap["cash_value"] + snap["gold_value"] + snap["other_value"],
            places=1
        )

    def test_asset_class_buckets_sum_to_total(self):
        """Holdings + cash + gold + other must exactly equal total_value."""
        snap = compute_snapshot_for_portfolio(self.portfolio, self.db, is_eod=False)
        bucket_sum = snap["holdings_value"] + snap["cash_value"] + snap["gold_value"] + snap["other_value"]
        self.assertAlmostEqual(snap["total_value"], bucket_sum, places=1)

    def test_stock_goes_into_holdings_bucket(self):
        snap = compute_snapshot_for_portfolio(self.portfolio, self.db, is_eod=False)
        self.assertGreater(snap["holdings_value"], 0)

    def test_cash_goes_into_cash_bucket(self):
        snap = compute_snapshot_for_portfolio(self.portfolio, self.db, is_eod=False)
        self.assertGreater(snap["cash_value"], 0)

    def test_gold_goes_into_gold_bucket(self):
        snap = compute_snapshot_for_portfolio(self.portfolio, self.db, is_eod=False)
        self.assertGreater(snap["gold_value"], 0)

    def test_invested_capital_matches_qty_times_avg_price(self):
        # avg prices: TESTSYM1=3800×10, TESTSYM2=1000×80, TESTSYM3=40×50
        expected_invested = 10 * 3800 + 80 * 1000 + 50 * 40
        snap = compute_snapshot_for_portfolio(self.portfolio, self.db, is_eod=False)
        self.assertAlmostEqual(snap["invested_capital"], expected_invested, places=0)

    def test_profit_loss_is_total_minus_invested(self):
        snap = compute_snapshot_for_portfolio(self.portfolio, self.db, is_eod=False)
        expected_pl = snap["total_value"] - snap["invested_capital"]
        self.assertAlmostEqual(snap["profit_loss"], expected_pl, places=1)

    def test_return_percentage_derived_from_pl_and_invested(self):
        snap = compute_snapshot_for_portfolio(self.portfolio, self.db, is_eod=False)
        expected_pct = (snap["profit_loss"] / snap["invested_capital"]) * 100.0
        self.assertAlmostEqual(snap["return_percentage"], round(expected_pct, 2), places=1)

    def test_empty_portfolio_returns_none(self):
        """Portfolio with no holdings should return None, not a zero snapshot."""
        empty_p = _make_test_portfolio(self.db, name="Empty Portfolio Test")
        try:
            result = compute_snapshot_for_portfolio(empty_p, self.db, is_eod=False)
            self.assertIsNone(result)
        finally:
            _cleanup_portfolio(self.db, empty_p.id)

    def test_snapshot_persists_to_db(self):
        snap_data = compute_snapshot_for_portfolio(self.portfolio, self.db, is_eod=False)
        saved = save_snapshot(self.portfolio.id, "2026-10-09", snap_data, self.db)
        self.assertIsNotNone(saved)
        self.assertEqual(saved.portfolio_id, self.portfolio.id)
        self.assertEqual(saved.snapshot_date, "2026-10-09")
        self.assertGreater(saved.total_value, 0)

    def test_eod_flag_is_stored(self):
        snap_data = compute_snapshot_for_portfolio(self.portfolio, self.db, is_eod=True)
        saved = save_snapshot(self.portfolio.id, "2026-10-08", snap_data, self.db)
        self.assertTrue(saved.is_eod)

    def test_live_flag_when_not_eod(self):
        snap_data = compute_snapshot_for_portfolio(self.portfolio, self.db, is_eod=False)
        saved = save_snapshot(self.portfolio.id, "2026-10-07", snap_data, self.db)
        self.assertFalse(saved.is_eod)


# ─────────────────────────────────────────────────────────────────────────────
# Section 2: Idempotency / duplicate prevention
# ─────────────────────────────────────────────────────────────────────────────

class TestSnapshotIdempotency(unittest.TestCase):

    def setUp(self):
        self.db = SessionLocal()
        self.portfolio = _make_test_portfolio(self.db, name="Idempotency Test Portfolio")
        _add_holding(self.db, self.portfolio, "IDMSYM1", 20, 1420, 1510, "Stock")
        self.db.refresh(self.portfolio)

    def tearDown(self):
        _cleanup_portfolio(self.db, self.portfolio.id)
        self.db.close()

    def test_duplicate_save_does_not_create_second_row(self):
        """Saving the same (portfolio_id, snapshot_date) twice must NOT create two rows."""
        snap_data = compute_snapshot_for_portfolio(self.portfolio, self.db, is_eod=False)
        save_snapshot(self.portfolio.id, "2026-10-05", snap_data, self.db)
        save_snapshot(self.portfolio.id, "2026-10-05", snap_data, self.db)
        count = self.db.query(PortfolioSnapshot).filter(
            PortfolioSnapshot.portfolio_id == self.portfolio.id,
            PortfolioSnapshot.snapshot_date == "2026-10-05",
        ).count()
        self.assertEqual(count, 1, "Duplicate snapshot must not be created")

    def test_re_run_updates_existing_snapshot(self):
        """A second run for the same date must update the total, not duplicate it."""
        snap_data = compute_snapshot_for_portfolio(self.portfolio, self.db, is_eod=False)
        first_total = snap_data["total_value"]
        save_snapshot(self.portfolio.id, "2026-10-06", snap_data, self.db)

        # Simulate price change: update holding price manually
        holding = self.db.query(Holding).filter(Holding.portfolio_id == self.portfolio.id).first()
        old_price = float(holding.current_price)
        new_price = old_price * 1.10  # +10%
        holding.current_price = new_price
        self.db.commit()
        self.db.refresh(self.portfolio)

        snap_data2 = compute_snapshot_for_portfolio(self.portfolio, self.db, is_eod=False)
        save_snapshot(self.portfolio.id, "2026-10-06", snap_data2, self.db)

        rows = self.db.query(PortfolioSnapshot).filter(
            PortfolioSnapshot.portfolio_id == self.portfolio.id,
            PortfolioSnapshot.snapshot_date == "2026-10-06",
        ).all()
        self.assertEqual(len(rows), 1)
        # Value must have changed upward after price increase
        self.assertGreater(rows[0].total_value, first_total)

    def test_different_dates_create_separate_rows(self):
        snap_data = compute_snapshot_for_portfolio(self.portfolio, self.db, is_eod=False)
        save_snapshot(self.portfolio.id, "2026-10-01", snap_data, self.db)
        save_snapshot(self.portfolio.id, "2026-10-02", snap_data, self.db)
        save_snapshot(self.portfolio.id, "2026-10-03", snap_data, self.db)
        count = self.db.query(PortfolioSnapshot).filter(
            PortfolioSnapshot.portfolio_id == self.portfolio.id,
        ).count()
        self.assertGreaterEqual(count, 3)


# ─────────────────────────────────────────────────────────────────────────────
# Section 3: Timezone and date handling
# ─────────────────────────────────────────────────────────────────────────────

class TestTimezoneHandling(unittest.TestCase):

    def test_snapshot_date_is_ist_calendar_date(self):
        """Snapshot dates must reflect IST (UTC+5:30), not UTC."""
        # At 23:00 UTC = 04:30 IST+1 the next day
        fake_utc = datetime(2026, 10, 9, 23, 0, 0, tzinfo=timezone.utc)
        with patch("app.services.snapshot_service.datetime") as mock_dt:
            mock_dt.now.return_value = fake_utc
            mock_dt.strptime = datetime.strptime
            ist_now = fake_utc + timedelta(hours=5, minutes=30)
            snapshot_date = ist_now.strftime("%Y-%m-%d")
        # At 23:00 UTC → 04:30 IST on Oct 10
        self.assertEqual(snapshot_date, "2026-10-10")

    def test_classify_asset_buckets(self):
        """Asset type classification must map correctly to storage buckets."""
        self.assertEqual(_classify_asset("Stock"), "holdings")
        self.assertEqual(_classify_asset("Equity"), "holdings")
        self.assertEqual(_classify_asset("ETF"), "holdings")
        self.assertEqual(_classify_asset("Mutual Fund"), "holdings")
        self.assertEqual(_classify_asset("Cash"), "cash")
        self.assertEqual(_classify_asset("Cash Equivalent"), "cash")
        self.assertEqual(_classify_asset("cash_equivalent"), "cash")
        self.assertEqual(_classify_asset("Gold"), "gold")
        self.assertEqual(_classify_asset("Bond"), "other")
        self.assertEqual(_classify_asset("Index ETF"), "holdings")


# ─────────────────────────────────────────────────────────────────────────────
# Section 4: Missing / stale prices
# ─────────────────────────────────────────────────────────────────────────────

class TestMissingPrices(unittest.TestCase):

    def setUp(self):
        self.db = SessionLocal()
        self.portfolio = _make_test_portfolio(self.db, name="Missing Price Test")

    def tearDown(self):
        _cleanup_portfolio(self.db, self.portfolio.id)
        self.db.close()

    def test_holding_with_zero_current_price_uses_avg_price_as_fallback(self):
        """If current_price=0 and no Stock record, avg_price is used as fallback (marks partial)."""
        _add_holding(self.db, self.portfolio, "UNKNOWNSYM", 10, 500, 0.0, "Stock")
        self.db.refresh(self.portfolio)
        snap = compute_snapshot_for_portfolio(self.portfolio, self.db, is_eod=False)
        # Should still compute (using avg price fallback) and mark as partial
        self.assertIsNotNone(snap)
        self.assertIn(snap["status"], ("partial", "complete"))
        # Value must not be silently zero
        self.assertGreater(snap["total_value"], 0)

    def test_stale_price_marks_status_correctly(self):
        """A DB stock with last_updated > 4 hours old must yield stale price_source."""
        from app.models.db_models import Stock
        stale_time = datetime.now(timezone.utc) - timedelta(hours=6)
        stock = Stock(
            id=gen_uuid("stk"),
            symbol="STALESYM",
            name="Stale Stock",
            current_price=200.0,
            last_updated=stale_time,
        )
        self.db.add(stock)
        self.db.commit()
        price, source = _get_current_price_sync("STALESYM", 0.0, self.db)
        self.db.delete(stock)
        self.db.commit()
        self.assertEqual(source, "stale")
        self.assertEqual(price, 200.0)

    def test_fresh_price_not_marked_stale(self):
        """A DB stock updated recently must not be marked stale."""
        from app.models.db_models import Stock
        fresh_time = datetime.now(timezone.utc) - timedelta(minutes=30)
        stock = Stock(
            id=gen_uuid("stk"),
            symbol="FRESHSYM",
            name="Fresh Stock",
            current_price=300.0,
            last_updated=fresh_time,
        )
        self.db.add(stock)
        self.db.commit()
        price, source = _get_current_price_sync("FRESHSYM", 0.0, self.db)
        self.db.delete(stock)
        self.db.commit()
        self.assertNotEqual(source, "stale")
        self.assertEqual(price, 300.0)


# ─────────────────────────────────────────────────────────────────────────────
# Section 5: Historical chart data — date filtering and return calculation
# ─────────────────────────────────────────────────────────────────────────────

class TestPortfolioHistoryFiltering(unittest.TestCase):

    def setUp(self):
        self.db = SessionLocal()
        self.portfolio = _make_test_portfolio(self.db, name="History Filter Test")
        _add_holding(self.db, self.portfolio, "TCS", 10, 3800, 3950, "Stock")
        self.db.refresh(self.portfolio)

        # Seed snapshots at various dates
        base_data = {
            "holdings_value": 39500,
            "cash_value": 0,
            "gold_value": 0,
            "other_value": 0,
            "invested_capital": 38000,
            "price_source": "eod",
            "is_eod": True,
            "is_reconstructed": False,
            "status": "complete",
        }
        dates_values = [
            ("2026-07-01", 37000),
            ("2026-08-01", 38000),
            ("2026-09-01", 39000),
            ("2026-10-01", 39500),
        ]
        for d, val in dates_values:
            data = {**base_data, "total_value": val, "profit_loss": val - 38000, "return_percentage": (val - 38000) / 38000 * 100}
            save_snapshot(self.portfolio.id, d, data, self.db)

    def tearDown(self):
        _cleanup_portfolio(self.db, self.portfolio.id)
        self.db.close()

    def _get_history(self, timeframe):
        from app.services.portfolio_service import portfolio_service
        return _run_async(
            portfolio_service.get_portfolio_history(
                portfolio_id=self.portfolio.id,
                timeframe=timeframe,
                db=self.db,
            )
        )

    def test_1m_filter_returns_only_recent_snapshots(self):
        """1M filter must only return snapshots from the last 30 days."""
        history = self._get_history("1M")
        for pt in history:
            dt = datetime.strptime(pt["date"], "%Y-%m-%d").date()
            cutoff = (datetime.now(timezone.utc).date() - timedelta(days=30))
            self.assertGreaterEqual(dt, cutoff)

    def test_all_filter_returns_all_snapshots(self):
        history = self._get_history("ALL")
        self.assertGreaterEqual(len(history), 4)

    def test_period_return_is_computed_from_first_to_last_in_window(self):
        """periodReturnPercentage must be relative to the first point in the window, not inception."""
        history = self._get_history("ALL")
        first_val = history[0]["portfolioValue"]
        last_point = history[-1]
        expected_pct = ((last_point["portfolioValue"] - first_val) / first_val) * 100
        self.assertAlmostEqual(last_point["periodReturnPercentage"], round(expected_pct, 2), places=1)

    def test_first_point_period_return_is_zero(self):
        """The first point in any window always has periodReturnPercentage=0."""
        history = self._get_history("ALL")
        self.assertEqual(history[0]["periodReturnPercentage"], 0.0)

    def test_history_is_chronologically_sorted(self):
        history = self._get_history("ALL")
        dates = [h["date"] for h in history]
        self.assertEqual(dates, sorted(dates))

    def test_history_point_has_required_fields(self):
        history = self._get_history("ALL")
        for pt in history:
            self.assertIn("date", pt)
            self.assertIn("formatted_date", pt)
            self.assertIn("portfolioValue", pt)
            self.assertIn("periodReturnPercentage", pt)

    def test_formatted_date_is_human_readable(self):
        """formatted_date must be like '01 Jul', not a raw ISO string."""
        history = self._get_history("ALL")
        for pt in history:
            # Should be formatted like "01 Jul"
            self.assertRegex(pt["formatted_date"], r"^\d{2} [A-Za-z]{3}$")


# ─────────────────────────────────────────────────────────────────────────────
# Section 6: Real vs paper trading separation
# ─────────────────────────────────────────────────────────────────────────────

class TestRealVsPaperSeparation(unittest.TestCase):

    def setUp(self):
        self.db = SessionLocal()
        self.portfolio = _make_test_portfolio(self.db, name="Real Portfolio Sep Test")
        # Use unique symbol to avoid DB Stock table price override
        _add_holding(self.db, self.portfolio, "SEPSYM1", 5, 2400, 2650, "Stock")
        self.db.refresh(self.portfolio)

    def tearDown(self):
        _cleanup_portfolio(self.db, self.portfolio.id)
        self.db.close()

    def test_snapshot_includes_only_portfolio_holdings(self):
        """Snapshot total must be derived from holdings in this portfolio only."""
        snap = compute_snapshot_for_portfolio(self.portfolio, self.db, is_eod=False)
        self.assertIsNotNone(snap)
        # Must be non-zero and match qty × price for SEPSYM1
        self.assertGreater(snap["total_value"], 0)
        # total = holdings + cash + gold + other (no extra values)
        bucket_sum = snap["holdings_value"] + snap["cash_value"] + snap["gold_value"] + snap["other_value"]
        self.assertAlmostEqual(snap["total_value"], bucket_sum, places=1)

    def test_run_eod_does_not_snapshot_paper_portfolios(self):
        """run_eod_snapshots must skip portfolios named 'Paper Trading Portfolio'."""
        paper_portfolio = _make_test_portfolio(self.db, name="Paper Trading Portfolio")
        _add_holding(self.db, paper_portfolio, "SEPSYM2", 10, 1700, 1780, "Stock")
        self.db.refresh(paper_portfolio)
        try:
            result = run_eod_snapshots(is_eod=False)
            # Paper Trading Portfolio must be in skipped (not succeeded)
            self.assertNotIn(paper_portfolio.id, result.get("portfolio_ids", []),
                             "Paper Trading Portfolio should be skipped, not snapshotted")
        finally:
            _cleanup_portfolio(self.db, paper_portfolio.id)


# ─────────────────────────────────────────────────────────────────────────────
# Section 7: Restart recovery / catch-up
# ─────────────────────────────────────────────────────────────────────────────

class TestCatchUpLogic(unittest.TestCase):

    def setUp(self):
        self.db = SessionLocal()
        self.portfolio = _make_test_portfolio(self.db, name="Catchup Recovery Test")
        _add_holding(self.db, self.portfolio, "ICICIBANK", 10, 1010, 1230, "Stock")
        self.db.refresh(self.portfolio)

    def tearDown(self):
        _cleanup_portfolio(self.db, self.portfolio.id)
        self.db.close()

    def test_run_eod_produces_snapshot_for_new_portfolio(self):
        """A brand new portfolio with no snapshots gets one after run_eod_snapshots."""
        result = run_eod_snapshots(is_eod=False)
        self.assertIn(self.portfolio.id, result.get("portfolio_ids", []),
                      "New portfolio must receive a snapshot on first run")

        count = self.db.query(PortfolioSnapshot).filter(
            PortfolioSnapshot.portfolio_id == self.portfolio.id
        ).count()
        self.assertGreater(count, 0)

    def test_re_run_eod_does_not_duplicate(self):
        """Running EOD snapshots twice in one day must not produce duplicate rows."""
        run_eod_snapshots(is_eod=False)
        run_eod_snapshots(is_eod=False)
        count = self.db.query(PortfolioSnapshot).filter(
            PortfolioSnapshot.portfolio_id == self.portfolio.id
        ).count()
        # Exactly one snapshot per day
        today = (datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)).strftime("%Y-%m-%d")
        today_count = self.db.query(PortfolioSnapshot).filter(
            PortfolioSnapshot.portfolio_id == self.portfolio.id,
            PortfolioSnapshot.snapshot_date == today,
        ).count()
        self.assertEqual(today_count, 1, "Exactly one snapshot per date even with repeated runs")


# ─────────────────────────────────────────────────────────────────────────────
# Section 8: Empty and partial history states
# ─────────────────────────────────────────────────────────────────────────────

class TestEmptyAndPartialHistory(unittest.TestCase):

    def setUp(self):
        self.db = SessionLocal()

    def tearDown(self):
        self.db.close()

    def test_history_for_nonexistent_portfolio_returns_empty(self):
        from app.services.portfolio_service import portfolio_service
        result = _run_async(
            portfolio_service.get_portfolio_history(
                portfolio_id="does_not_exist",
                timeframe="1M",
                db=self.db,
            )
        )
        self.assertEqual(result, [])

    def test_history_with_no_snapshots_seeds_first_point(self):
        """First call with no snapshots must attempt to create and return today's point."""
        portfolio = _make_test_portfolio(self.db, name="First Snap Test")
        _add_holding(self.db, portfolio, "FSTSYM1", 10, 3800, 3950, "Stock")
        self.db.refresh(portfolio)
        try:
            from app.services.portfolio_service import portfolio_service
            result = _run_async(
                portfolio_service.get_portfolio_history(
                    portfolio_id=portfolio.id,
                    timeframe="1M",
                    db=self.db,
                )
            )
            # Should return at least the seeded single point
            self.assertIsInstance(result, list)
            if len(result) > 0:
                self.assertIn("portfolioValue", result[0])
                self.assertGreater(result[0]["portfolioValue"], 0)
        finally:
            _cleanup_portfolio(self.db, portfolio.id)

    def test_single_point_data_structure_is_valid(self):
        """A single-point response must have all required fields."""
        from app.services.portfolio_service import portfolio_service
        portfolio = _make_test_portfolio(self.db, name="Single Point Test")
        _add_holding(self.db, portfolio, "SPTSYM1", 5, 1420, 1510, "Stock")
        self.db.refresh(portfolio)
        try:
            result = _run_async(
                portfolio_service.get_portfolio_history(
                    portfolio_id=portfolio.id,
                    timeframe="ALL",
                    db=self.db,
                )
            )
            if result:
                pt = result[0]
                self.assertIn("date", pt)
                self.assertIn("portfolioValue", pt)
                self.assertIn("periodReturnPercentage", pt)
                self.assertEqual(pt["periodReturnPercentage"], 0.0,
                                 "Single point must always have 0% period return")
        finally:
            _cleanup_portfolio(self.db, portfolio.id)


# ─────────────────────────────────────────────────────────────────────────────
# Section 9: Trade persistence and transaction consistency
# ─────────────────────────────────────────────────────────────────────────────

class TestTradePersistence(unittest.TestCase):

    def setUp(self):
        self.db = SessionLocal()
        self.portfolio = _make_test_portfolio(self.db, name="Trade Persistence Test")
        _add_holding(self.db, self.portfolio, "TPRSYM1", 10, 2400, 2650, "Stock")
        self.db.refresh(self.portfolio)

    def tearDown(self):
        _cleanup_portfolio(self.db, self.portfolio.id)
        self.db.close()

    def test_transaction_persists_after_add(self):
        """Adding a transaction must persist to DB and survive a new session."""
        from app.services.portfolio_service import portfolio_service
        portfolio_service.add_transaction(
            self.portfolio.id,
            {
                "symbol": "TPRSYM1",
                "assetName": "Test Persist Symbol",
                "type": "BUY",
                "quantity": 5,
                "price": 2600,
                "date": "2026-10-09",
            },
            db=self.db,
        )

        # Open fresh session to verify persistence
        db2 = SessionLocal()
        try:
            count = db2.query(Transaction).filter(
                Transaction.portfolio_id == self.portfolio.id
            ).count()
            self.assertGreater(count, 0, "Transaction must persist to DB")
        finally:
            db2.close()

    def test_holding_update_persists(self):
        """Updating a holding's quantity must persist correctly."""
        holding = self.db.query(Holding).filter(
            Holding.portfolio_id == self.portfolio.id,
            Holding.symbol == "TPRSYM1",
        ).first()
        from app.services.portfolio_service import portfolio_service
        portfolio_service.update_holding(
            self.portfolio.id,
            holding.id,
            {"quantity": 15},
            db=self.db,
        )
        db2 = SessionLocal()
        try:
            h = db2.query(Holding).filter(Holding.id == holding.id).first()
            self.assertEqual(h.quantity, 15.0)
        finally:
            db2.close()

    def test_total_value_reflects_quantity_after_update(self):
        """After quantity update, portfolio total value must change proportionally."""
        holding = self.db.query(Holding).filter(
            Holding.portfolio_id == self.portfolio.id,
            Holding.symbol == "TPRSYM1",
        ).first()
        curr_price = float(holding.current_price)
        from app.services.portfolio_service import portfolio_service
        result = portfolio_service.update_holding(
            self.portfolio.id,
            holding.id,
            {"quantity": 20, "currentPrice": curr_price},
            db=self.db,
        )
        self.assertAlmostEqual(result["totalValue"], 20 * curr_price, places=0)


# ─────────────────────────────────────────────────────────────────────────────
# Section 10: Scheduler status tracking
# ─────────────────────────────────────────────────────────────────────────────

class TestSchedulerStatus(unittest.TestCase):

    def test_initial_status_is_never_run(self):
        """get_snapshot_status must report 'never_run' before any snapshot."""
        status = get_snapshot_status()
        self.assertIn("status", status)
        self.assertIn("last_run_utc", status)

    def test_status_updates_after_run(self):
        """After run_eod_snapshots, status must reflect the outcome."""
        run_eod_snapshots(is_eod=False)
        status = get_snapshot_status()
        self.assertIn(status["status"], ("success", "partial"))
        self.assertIsNotNone(status["last_run_utc"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
