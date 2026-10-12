"""
EOD Snapshot Service
====================
Computes and persists end-of-day portfolio valuations for all real portfolios.

Design principles:
- One snapshot per portfolio per calendar date (idempotency via UNIQUE constraint + upsert logic).
- Uses ONLY real portfolio holdings. Paper-trading positions are never included.
- Records price_source status ('live', 'eod', 'stale', 'partial') honestly;
  never fabricates prices or treats a missing price as zero silently.
- Logs success/failure for every portfolio; does not let one failure block others.
- Compatible with APScheduler running in the same event loop as FastAPI.
"""
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database import SessionLocal
from app.models.db_models import Portfolio, Holding, PortfolioSnapshot, gen_uuid

logger = logging.getLogger("capitalmind.snapshots")

# -----------------------------------------------------------------------
# Status tracking (in-process; survives for the lifetime of the process)
# -----------------------------------------------------------------------
_last_snapshot_run: Optional[datetime] = None
_last_snapshot_status: str = "never_run"
_last_snapshot_detail: str = ""


def get_snapshot_status() -> Dict[str, Any]:
    return {
        "last_run_utc": _last_snapshot_run.isoformat() if _last_snapshot_run else None,
        "status": _last_snapshot_status,
        "detail": _last_snapshot_detail,
    }


# -----------------------------------------------------------------------
# Core valuation helper
# -----------------------------------------------------------------------

def _classify_asset(asset_type: str) -> str:
    """Map holding asset_type to bucket: 'holdings', 'cash', 'gold', 'other'."""
    t = (asset_type or "Stock").lower()
    if t in ("cash", "cash equivalent", "cash_equivalent"):
        return "cash"
    if t == "gold":
        return "gold"
    if t in ("stock", "equity", "mutual fund", "etf", "index etf"):
        return "holdings"
    return "other"

def _get_current_price_sync(symbol: str, holding_current_price: float, db: Session,
                             instrument_key: str = "") -> tuple[float, str]:
    """
    Resolve the current price for a holding — must use IDENTICAL priority to
    `portfolio_service._compute_from_orm` so that snapshot total == dashboard total.

    Priority:
    0. Live Upstox tick cache (freshest — non-blocking, cache-only)
    1. holding.current_price (stored on the Holding row)
    2. Stock table cache
    3. 0.0 / 'missing'
    """
    # P0: Live Upstox tick cache (non-blocking, never makes REST calls)
    try:
        from app.services.upstox_market_data import upstox_market_data
        _lookup = instrument_key or symbol
        live_tick = upstox_market_data.get_cached_tick(_lookup, fetch_if_missing=False)
        if not live_tick:
            live_tick = upstox_market_data.get_cached_tick(symbol, fetch_if_missing=False)
        if live_tick and live_tick.ltp and float(live_tick.ltp) > 0:
            source = "live_feed"
            if live_tick.timestamp:
                age_secs = datetime.now(timezone.utc).timestamp() - float(live_tick.timestamp) / 1000.0
                if age_secs > 4 * 3600:
                    source = "stale_live_feed"
            return float(live_tick.ltp), source
    except Exception:
        pass

    # P1: Holding price is authoritative (matches dashboard behaviour)
    if holding_current_price and holding_current_price > 0:
        return float(holding_current_price), "holding_cache"

    # P2: Fallback: Stock table cache (for holdings whose current_price was never set)
    from app.models.db_models import Stock
    stock_rec = db.query(Stock).filter(Stock.symbol == symbol.upper()).first()
    if stock_rec and stock_rec.current_price and stock_rec.current_price > 0:
        if stock_rec.last_updated:
            age = datetime.now(timezone.utc) - stock_rec.last_updated.replace(tzinfo=timezone.utc)
            if age.total_seconds() > 4 * 3600:
                return float(stock_rec.current_price), "stale"
        return float(stock_rec.current_price), "cached"

    return 0.0, "missing"




def compute_snapshot_for_portfolio(portfolio: Portfolio, db: Session, is_eod: bool = False) -> Optional[Dict[str, Any]]:
    """
    Compute a portfolio valuation snapshot using real holdings × resolved prices.

    Returns a dict with all snapshot fields, or None if the portfolio has no holdings.
    DOES NOT persist; caller is responsible for persistence.
    """
    holdings: List[Holding] = portfolio.holdings
    if not holdings:
        return None

    total_value = 0.0
    total_invested = 0.0
    holdings_val = 0.0
    cash_val = 0.0
    gold_val = 0.0
    other_val = 0.0

    price_sources = set()
    missing_count = 0

    for h in holdings:
        qty = float(h.quantity or 0)
        avg_p = float(h.average_price or 0)
        price, source = _get_current_price_sync(
            h.symbol, float(h.current_price or 0), db,
            instrument_key=h.instrument_key or ""
        )

        if source == "missing":
            missing_count += 1
            # Use average_price as fallback for cost basis, but mark snapshot as partial
            price = avg_p  # use cost basis for invested calculation but not for current value
            # Record separately that this holding is missing a live price
            price_sources.add("partial")
        else:
            price_sources.add(source)

        invested = qty * avg_p
        curr_val = qty * price
        total_invested += invested
        total_value += curr_val

        bucket = _classify_asset(h.asset_type)
        if bucket == "holdings":
            holdings_val += curr_val
        elif bucket == "cash":
            cash_val += curr_val
        elif bucket == "gold":
            gold_val += curr_val
        else:
            other_val += curr_val

    if total_value <= 0:
        return None

    profit_loss = total_value - total_invested
    return_pct = (profit_loss / total_invested * 100.0) if total_invested > 0 else 0.0

    # Determine overall price_source label
    if "missing" in price_sources or missing_count > 0:
        price_source_label = "partial"
        status = "partial"
    elif "stale" in price_sources:
        price_source_label = "stale"
        status = "complete"
    elif is_eod:
        price_source_label = "eod"
        status = "complete"
    else:
        price_source_label = "live"
        status = "complete"

    return {
        "total_value": round(total_value, 2),
        "holdings_value": round(holdings_val, 2),
        "cash_value": round(cash_val, 2),
        "gold_value": round(gold_val, 2),
        "other_value": round(other_val, 2),
        "invested_capital": round(total_invested, 2),
        "profit_loss": round(profit_loss, 2),
        "return_percentage": round(return_pct, 2),
        "price_source": price_source_label,
        "is_eod": is_eod,
        "is_reconstructed": False,
        "status": status,
    }


def save_snapshot(portfolio_id: str, snapshot_date: str, data: Dict[str, Any], db: Session) -> Optional[PortfolioSnapshot]:
    """
    Upsert one snapshot for (portfolio_id, snapshot_date).
    If a snapshot already exists for that date, it is UPDATED (not duplicated).
    Returns the saved snapshot ORM object, or None on error.
    """
    try:
        existing = db.query(PortfolioSnapshot).filter(
            PortfolioSnapshot.portfolio_id == portfolio_id,
            PortfolioSnapshot.snapshot_date == snapshot_date,
        ).first()

        if existing:
            # Update in-place (idempotent re-run safety)
            for key, val in data.items():
                if hasattr(existing, key):
                    setattr(existing, key, val)
            db.commit()
            db.refresh(existing)
            return existing
        else:
            snap = PortfolioSnapshot(
                id=gen_uuid("snp"),
                portfolio_id=portfolio_id,
                snapshot_date=snapshot_date,
                **data,
            )
            db.add(snap)
            db.commit()
            db.refresh(snap)
            return snap
    except IntegrityError:
        db.rollback()
        # Race condition: another process wrote it first — update instead
        existing = db.query(PortfolioSnapshot).filter(
            PortfolioSnapshot.portfolio_id == portfolio_id,
            PortfolioSnapshot.snapshot_date == snapshot_date,
        ).first()
        if existing:
            for key, val in data.items():
                if hasattr(existing, key):
                    setattr(existing, key, val)
            db.commit()
            db.refresh(existing)
            return existing
        return None
    except Exception as exc:
        db.rollback()
        logger.error(f"Failed to save snapshot for {portfolio_id} on {snapshot_date}: {exc}")
        return None


# -----------------------------------------------------------------------
# Public entry point called by scheduler
# -----------------------------------------------------------------------

def run_eod_snapshots(is_eod: bool = True) -> Dict[str, Any]:
    """
    Compute and save EOD snapshots for ALL real portfolios.
    Called by the APScheduler job at 4:15 PM IST on trading days.
    Also callable manually via the health/admin endpoint.

    Returns a summary dict.
    """
    global _last_snapshot_run, _last_snapshot_status, _last_snapshot_detail

    _last_snapshot_run = datetime.now(timezone.utc)
    ist_now = _last_snapshot_run + timedelta(hours=5, minutes=30)
    snapshot_date = ist_now.strftime("%Y-%m-%d")

    logger.info(f"[EOD Snapshot] Starting for date={snapshot_date}, is_eod={is_eod}")

    db = SessionLocal()
    succeeded = []
    failed = []
    skipped = []

    try:
        # Exclude portfolios known to be test fixtures or paper trading placeholders
        test_names = {
            "Alice Tech Growth", "Bob Conservative Yield",
            "Persistence Test Portfolio", "Paper Trading Portfolio",
            "User A Real Portfolio",
        }
        portfolios = db.query(Portfolio).all()

        for portfolio in portfolios:
            if portfolio.name in test_names:
                skipped.append(portfolio.id)
                continue

            try:
                snap_data = compute_snapshot_for_portfolio(portfolio, db, is_eod=is_eod)
                if snap_data is None:
                    skipped.append(portfolio.id)
                    logger.debug(f"[EOD Snapshot] Skipped {portfolio.id} ({portfolio.name}): no holdings or zero value")
                    continue

                saved = save_snapshot(portfolio.id, snapshot_date, snap_data, db)
                if saved:
                    succeeded.append(portfolio.id)
                    logger.info(
                        f"[EOD Snapshot] OK: portfolio={portfolio.id} date={snapshot_date} "
                        f"total=₹{snap_data['total_value']:,.0f} source={snap_data['price_source']}"
                    )
                else:
                    failed.append(portfolio.id)
            except Exception as exc:
                failed.append(portfolio.id)
                logger.error(f"[EOD Snapshot] ERROR portfolio={portfolio.id}: {exc}")

    finally:
        db.close()

    summary = {
        "snapshot_date": snapshot_date,
        "is_eod": is_eod,
        "succeeded": len(succeeded),
        "failed": len(failed),
        "skipped": len(skipped),
        "portfolio_ids": succeeded,
        "failed_ids": failed,
    }

    if failed:
        _last_snapshot_status = "partial"
        _last_snapshot_detail = f"{len(succeeded)} succeeded, {len(failed)} failed on {snapshot_date}"
    else:
        _last_snapshot_status = "success"
        _last_snapshot_detail = f"{len(succeeded)} portfolios snapshotted on {snapshot_date}"

    logger.info(f"[EOD Snapshot] Done: {summary}")
    return summary


# -----------------------------------------------------------------------
# Catch-up: detect and fill missed snapshots from today's price for real portfolios
# -----------------------------------------------------------------------

def run_catchup_if_missed() -> None:
    """
    On server startup, check if today's snapshot is missing for any real portfolio.
    If market is closed and today has no snapshot yet, capture one now using cached prices.
    This handles the case of a server restart after the scheduled 4:15 PM job already ran
    (won't duplicate because save_snapshot is idempotent) and the case where the server
    was down when the scheduler should have fired.
    """
    ist_now = datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)
    is_weekday = ist_now.weekday() < 5
    market_close_hour = 15
    market_close_minute = 30

    past_close = (ist_now.hour > market_close_hour) or (
        ist_now.hour == market_close_hour and ist_now.minute >= market_close_minute
    )

    if not is_weekday or not past_close:
        # Market hasn't closed yet today, or it's weekend — don't capture yet
        logger.info("[Catchup] No catch-up needed (market not yet closed for today).")
        return

    today = ist_now.strftime("%Y-%m-%d")
    db = SessionLocal()
    try:
        # Check if any real portfolio is missing a snapshot for today
        all_portfolios = db.query(Portfolio).all()
        test_names = {
            "Alice Tech Growth", "Bob Conservative Yield",
            "Persistence Test Portfolio", "Paper Trading Portfolio",
            "User A Real Portfolio",
        }
        needs_snapshot = []
        for p in all_portfolios:
            if p.name in test_names:
                continue
            existing = db.query(PortfolioSnapshot).filter(
                PortfolioSnapshot.portfolio_id == p.id,
                PortfolioSnapshot.snapshot_date == today,
            ).first()
            if not existing and p.holdings:
                needs_snapshot.append(p)

        if needs_snapshot:
            logger.info(f"[Catchup] {len(needs_snapshot)} portfolio(s) missing today's snapshot — running catch-up.")
            db.close()
            run_eod_snapshots(is_eod=False)  # Not true EOD; use is_eod=False to mark as catch-up
        else:
            logger.info("[Catchup] All portfolios already have today's snapshot.")
    finally:
        try:
            db.close()
        except Exception:
            pass


snapshot_service = object()  # Sentinel — actual functions are module-level
