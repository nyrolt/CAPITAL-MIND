import asyncio
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings

# Import routers
from app.routers import (
    auth,
    portfolio,
    analytics,
    risk,
    advisor,
    recommendations,
    reports,
    notifications,
    admin,
    stocks,
    watchlist,
    trading,
    market_ws,
    news
)
from app.services.upstox_market_data import upstox_market_data

logger = logging.getLogger("capitalmind.main")

app = FastAPI(
    title=settings.APP_NAME,
    description="Unified API with Dual Auth (Local Dev JWT & AWS Cognito ready)",
    version="1.0.0"
)

from app.routers.market_ws import manager as ws_manager

# -----------------------------------------------------------------------
# APScheduler — EOD snapshot job at 4:15 PM IST on NSE/BSE trading days
# -----------------------------------------------------------------------
# Runs in the same process; AsyncIOScheduler integrates cleanly with FastAPI's
# event loop without blocking. A single global instance ensures one scheduler
# per process regardless of how many times lifespan runs.
# -----------------------------------------------------------------------
_scheduler_started = False

def _get_scheduler():
    """Return a lazily-created, process-singleton AsyncIOScheduler."""
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    from apscheduler.triggers.cron import CronTrigger

    scheduler = AsyncIOScheduler(timezone="Asia/Kolkata")

    # Scheduled job: 16:15 IST Monday–Friday
    # CronTrigger with day_of_week='mon-fri' automatically skips weekends.
    # Public holidays are handled by the snapshot service checking whether prices
    # are available (partial/stale) and marking status accordingly.
    scheduler.add_job(
        _run_eod_job,
        CronTrigger(
            hour=16, minute=15,
            day_of_week="mon-fri",
            timezone="Asia/Kolkata"
        ),
        id="eod_snapshot",
        replace_existing=True,
        misfire_grace_time=3600,  # tolerate up to 1 hour late start
    )
    # Scheduled job: Financial news ingestion & Gemini analysis periodic cycle
    if settings.NEWS_INGESTION_ENABLED:
        from apscheduler.triggers.interval import IntervalTrigger
        scheduler.add_job(
            _run_news_cycle,
            IntervalTrigger(
                minutes=settings.NEWS_INGESTION_INTERVAL_MINUTES,
                timezone="Asia/Kolkata"
            ),
            id="news_ingestion_and_analysis",
            replace_existing=True,
            misfire_grace_time=600,
        )

    return scheduler


def _run_news_cycle():
    """Periodic job for genuine financial news ingestion and Gemini impact analysis."""
    from app.services.news_service import news_service
    try:
        ingest_res = news_service.ingest_rss_feeds()
        logger.info(f"[Scheduler] News ingestion completed: {ingest_res}")
        if settings.GEMINI_ANALYSIS_ENABLED:
            analysis_res = news_service.process_pending_analyses(max_batch=settings.NEWS_MAX_ANALYSES_PER_RUN)
            logger.info(f"[Scheduler] News analysis completed: {analysis_res}")
    except Exception as exc:
        logger.error(f"[Scheduler] News cycle job error: {exc}")


def _run_eod_job():
    """Synchronous wrapper called by APScheduler from the event loop thread."""
    from app.services.snapshot_service import run_eod_snapshots
    try:
        summary = run_eod_snapshots(is_eod=True)
        logger.info(f"[Scheduler] EOD snapshot completed: {summary}")
    except Exception as exc:
        logger.error(f"[Scheduler] EOD snapshot failed: {exc}")


@app.on_event("startup")
async def on_startup():
    global _scheduler_started

    try:
        ws_manager.set_loop(asyncio.get_running_loop())
    except Exception:
        pass

    upstox_market_data.start()

    # Start scheduler exactly once per process
    if not _scheduler_started:
        try:
            scheduler = _get_scheduler()
            scheduler.start()
            _scheduler_started = True
            logger.info("[Scheduler] APScheduler started — EOD snapshots scheduled at 16:15 IST Mon-Fri")
        except Exception as exc:
            logger.error(f"[Scheduler] Failed to start scheduler: {exc}")

    # Catch-up: if server restarted after market close and today's snapshot is missing
    try:
        from app.services.snapshot_service import run_catchup_if_missed
        run_catchup_if_missed()
    except Exception as exc:
        logger.warning(f"[Catchup] Catch-up check failed (non-fatal): {exc}")


@app.on_event("shutdown")
async def on_shutdown():
    upstox_market_data.stop()


# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(portfolio.router)
app.include_router(portfolio.holdings_router)
app.include_router(analytics.router)
app.include_router(risk.router)
app.include_router(advisor.router)
app.include_router(recommendations.router)
app.include_router(reports.router)
app.include_router(notifications.router)
app.include_router(admin.router)
app.include_router(stocks.router)
app.include_router(watchlist.router)
app.include_router(trading.router)
app.include_router(market_ws.router)
app.include_router(news.router)


@app.get("/")
async def root():
    return {
        "message": "Welcome to CapitalMind AI Fintech API",
        "auth_mode": settings.AUTH_MODE,
        "docs_url": "/docs"
    }


@app.get("/health")
@app.get("/api/health")
async def health_check():
    from app.services.snapshot_service import get_snapshot_status
    snapshot_info = get_snapshot_status()
    return {
        "status": "Healthy",
        "auth_mode": settings.AUTH_MODE,
        "app_name": settings.APP_NAME,
        "eod_snapshots": snapshot_info,
    }
