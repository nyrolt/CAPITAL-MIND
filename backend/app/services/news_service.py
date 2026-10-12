import logging
import hashlib
import json
import time
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import feedparser
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_

from app.config import settings
from app.database import SessionLocal
from app.models.db_models import NewsArticle, Portfolio, Holding, Watchlist, gen_uuid
from app.services.news_impact_analysis import gemini_news_analyzer

logger = logging.getLogger("capitalmind.news_service")

# Reliable Indian Financial News RSS Feeds
INDIAN_NEWS_FEEDS = [
    {
        "provider": "Economic Times",
        "source": "ET Markets",
        "url": "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms",
        "category": "Markets",
    },
    {
        "provider": "Economic Times",
        "source": "ET Stocks",
        "url": "https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms",
        "category": "Stocks",
    },
    {
        "provider": "Livemint",
        "source": "Livemint Markets",
        "url": "https://www.livemint.com/rss/markets",
        "category": "Markets",
    },
    {
        "provider": "Moneycontrol",
        "source": "Moneycontrol Markets",
        "url": "https://www.moneycontrol.com/rss/marketreports.xml",
        "category": "Markets",
    },
    {
        "provider": "Moneycontrol",
        "source": "Moneycontrol Business",
        "url": "https://www.moneycontrol.com/rss/business.xml",
        "category": "Economy",
    },
]

RELEVANT_KEYWORDS = [
    r"\bnifty\b", r"\bsensex\b", r"\bbse\b", r"\bnse\b", r"\brbi\b", r"\brepo\b", r"\binflation\b",
    r"\bsebi\b", r"\bearnings\b", r"\bprofit\b", r"\brevenue\b", r"\bdividend\b", r"\bq1\b", r"\bq2\b",
    r"\bq3\b", r"\bq4\b", r"\bcrore\b", r"\bstock\b", r"\bshare price\b", r"\bipo\b", r"\bquarter\b",
    r"\bresults\b", r"\bguidance\b", r"\brupee\b", r"\bfed\b", r"\bfii\b", r"\bdii\b", r"\bit sector\b",
    r"\bbanking\b", r"\bfmcg\b", r"\bauto sector\b", r"\bpharma\b", r"\bmetal\b", r"\benergy\b", r"\bcrude oil\b",
    r"\btcs\b", r"\breliance\b", r"\bhdfc\b", r"\binfosys\b", r"\bicici\b", r"\bsbi\b", r"\bmarket\b",
    r"\bequities\b", r"\bequity\b", r"\brally\b", r"\bplunge\b", r"\bsurge\b", r"\bslump\b"
]

import re
RE_KEYWORD_PATTERN = re.compile("|".join(RELEVANT_KEYWORDS), re.IGNORECASE)

def compute_url_hash(url: str) -> str:
    """Normalize and hash canonical URL for strict database deduplication."""
    clean = url.strip().split("?")[0].rstrip("/")
    return hashlib.sha256(clean.encode("utf-8")).hexdigest()

def is_market_relevant(headline: str, summary: str = "") -> bool:
    """Check if the news item is relevant to Indian financial markets."""
    text = f"{headline} {summary}"
    return bool(RE_KEYWORD_PATTERN.search(text))

def parse_pub_date(entry: Any) -> datetime:
    """Safely parse RSS published timestamp to UTC datetime."""
    if hasattr(entry, "published_parsed") and entry.published_parsed:
        try:
            return datetime.fromtimestamp(time.mktime(entry.published_parsed), tz=timezone.utc)
        except Exception:
            pass
    return datetime.now(timezone.utc)

class NewsService:
    def __init__(self):
        self._last_ingestion_time: Optional[datetime] = None

    def ingest_rss_feeds(self, db: Optional[Session] = None) -> Dict[str, Any]:
        """
        Polls configured genuine Indian financial RSS feeds, filters for relevance,
        deduplicates against PostgreSQL database, and persists new articles with PENDING status.
        """
        close_session = False
        if db is None:
            db = SessionLocal()
            close_session = True

        total_fetched = 0
        total_relevant = 0
        total_inserted = 0
        errors = []

        try:
            for feed_info in INDIAN_NEWS_FEEDS:
                url = feed_info["url"]
                provider = feed_info["provider"]
                source = feed_info["source"]
                category = feed_info["category"]

                try:
                    parsed_feed = feedparser.parse(url)
                    entries = parsed_feed.entries or []
                    total_fetched += len(entries)

                    for entry in entries:
                        headline = getattr(entry, "title", "").strip()
                        if not headline:
                            continue

                        link = getattr(entry, "link", "").strip()
                        if not link:
                            continue

                        summary_raw = getattr(entry, "summary", "") or getattr(entry, "description", "")
                        # Simple html tag stripping from RSS descriptions
                        summary = re_clean = ""
                        if summary_raw:
                            import re
                            clean_desc = re.sub(r"<[^>]+>", "", summary_raw).strip()
                            # Truncate clean summary
                            summary = clean_desc[:1200]

                        if not is_market_relevant(headline, summary):
                            continue

                        total_relevant += 1
                        url_hash = compute_url_hash(link)

                        # Check deduplication
                        exists = db.query(NewsArticle.id).filter(NewsArticle.url_hash == url_hash).first()
                        if exists:
                            continue

                        pub_dt = parse_pub_date(entry)

                        article = NewsArticle(
                            id=gen_uuid("art"),
                            provider=provider,
                            provider_article_id=getattr(entry, "id", None) or url_hash[:16],
                            headline=headline,
                            summary=summary or None,
                            source=source,
                            canonical_url=link,
                            url_hash=url_hash,
                            published_at=pub_dt,
                            retrieved_at=datetime.now(timezone.utc),
                            category=category,
                            related_sectors="[]",
                            related_stocks="[]",
                            analysis_status="PENDING"
                        )
                        db.add(article)
                        total_inserted += 1

                    db.commit()
                except Exception as feed_err:
                    logger.warning(f"[NEWS_INGEST] Feed failed '{source}': {feed_err}")
                    errors.append(f"{source}: {str(feed_err)}")

            self._last_ingestion_time = datetime.now(timezone.utc)
            logger.info(f"[NEWS_INGEST] Ingested {total_inserted} new articles from {len(INDIAN_NEWS_FEEDS)} feeds.")

            return {
                "total_fetched": total_fetched,
                "total_relevant": total_relevant,
                "total_inserted": total_inserted,
                "errors": errors
            }
        finally:
            if close_session:
                db.close()

    def process_pending_analyses(self, max_batch: int = 5, db: Optional[Session] = None) -> Dict[str, Any]:
        """
        Takes unanalyzed articles in bounded batches and applies Gemini AI market impact analysis.
        Respects free-tier rate limits, records status, and verifies stock symbols.
        """
        close_session = False
        if db is None:
            db = SessionLocal()
            close_session = True

        analyzed_count = 0
        failed_count = 0

        try:
            if not gemini_news_analyzer.is_configured():
                logger.info("[NEWS_ANALYSIS] Gemini analyzer is not configured. Skipping analysis batch.")
                return {"analyzed": 0, "failed": 0, "reason": "GEMINI_NOT_CONFIGURED"}

            pending_articles = db.query(NewsArticle).filter(
                NewsArticle.analysis_status == "PENDING"
            ).order_by(NewsArticle.published_at.desc()).limit(max_batch).all()

            if not pending_articles:
                return {"analyzed": 0, "failed": 0, "reason": "NO_PENDING_ARTICLES"}

            for article in pending_articles:
                try:
                    analysis_result = gemini_news_analyzer.analyze_article(
                        headline=article.headline,
                        summary=article.summary
                    )

                    article.analysis_json = json.dumps(analysis_result)
                    article.analysis_source = analysis_result.get("analysis_source", settings.GEMINI_MODEL)
                    article.analysis_status = "ANALYZED"
                    article.analyzed_at = datetime.now(timezone.utc)
                    article.related_sectors = json.dumps(analysis_result.get("sectors", []))
                    article.related_stocks = json.dumps(analysis_result.get("stocks", []))

                    db.commit()
                    analyzed_count += 1
                    # Polite rate-limit delay between LLM calls
                    time.sleep(1.0)
                except Exception as e:
                    logger.warning(f"[NEWS_ANALYSIS] Analysis failed for article {article.id}: {e}")
                    err_str = str(e)
                    if "RATE_LIMITED" in err_str:
                        article.analysis_status = "RATE_LIMITED"
                        db.commit()
                        failed_count += 1
                        break  # Stop processing current batch on rate limit
                    else:
                        article.analysis_status = "FAILED"
                        db.commit()
                        failed_count += 1

            return {"analyzed": analyzed_count, "failed": failed_count}
        finally:
            if close_session:
                db.close()

    def get_news_feed(
        self,
        db: Session,
        page: int = 1,
        limit: int = 20,
        search: Optional[str] = None,
        sector: Optional[str] = None,
        stock: Optional[str] = None,
        impact: Optional[str] = None,
        source: Optional[str] = None,
        status: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Paginated news articles with multi-criteria filtering."""
        query = db.query(NewsArticle)

        if search:
            q_clean = f"%{search.strip()}%"
            query = query.filter(or_(NewsArticle.headline.ilike(q_clean), NewsArticle.summary.ilike(q_clean)))

        if sector:
            sec_clean = f"%{sector.strip()}%"
            query = query.filter(NewsArticle.related_sectors.ilike(sec_clean))

        if stock:
            stk_clean = f"%{stock.strip().upper()}%"
            query = query.filter(NewsArticle.related_stocks.ilike(stk_clean))

        if source:
            query = query.filter(NewsArticle.source == source)

        if status:
            query = query.filter(NewsArticle.analysis_status == status.upper())

        if impact:
            # Impact direction stored inside analysis_json
            imp_clean = f'%"{impact.strip().upper()}"%'
            query = query.filter(NewsArticle.analysis_json.ilike(imp_clean))

        total = query.count()
        offset = (page - 1) * limit
        articles = query.order_by(NewsArticle.published_at.desc()).offset(offset).limit(limit).all()

        items = [self._format_article_response(a) for a in articles]
        pages = (total + limit - 1) // limit if total > 0 else 1

        return {
            "items": items,
            "total": total,
            "page": page,
            "limit": limit,
            "pages": pages
        }

    def get_article_by_id(self, article_id: str, db: Session) -> Optional[Dict[str, Any]]:
        article = db.query(NewsArticle).filter(NewsArticle.id == article_id).first()
        if not article:
            return None
        return self._format_article_response(article)

    def get_personalized_news(self, user_id: str, db: Session, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Finds articles relevant specifically to the authenticated user's portfolio holdings
        and watchlist symbols. Enforces strict tenant isolation.
        """
        user_symbols = set()

        # 1. Fetch user's portfolio holdings
        user_portfolios = db.query(Portfolio.id).filter(Portfolio.user_id == user_id).all()
        portfolio_ids = [p.id for p in user_portfolios]
        if portfolio_ids:
            holdings = db.query(Holding.symbol).filter(Holding.portfolio_id.in_(portfolio_ids)).all()
            for h in holdings:
                if h.symbol:
                    user_symbols.add(h.symbol.upper())

        # 2. Fetch user's watchlist symbols
        watchlists = db.query(Watchlist.symbols).filter(Watchlist.user_id == user_id).all()
        for w in watchlists:
            if w.symbols:
                try:
                    syms = json.loads(w.symbols) if isinstance(w.symbols, str) else w.symbols
                    for s in syms:
                        user_symbols.add(str(s).upper())
                except Exception:
                    pass

        if not user_symbols:
            return []

        # 3. Query articles where related_stocks overlaps or headline mentions user symbol
        conditions = []
        for s in list(user_symbols)[:25]: # bounded query
            s_clean = f"%{s}%"
            conditions.append(NewsArticle.related_stocks.ilike(s_clean))
            conditions.append(NewsArticle.headline.ilike(s_clean))

        query = db.query(NewsArticle).filter(or_(*conditions)).order_by(NewsArticle.published_at.desc()).limit(limit)
        articles = query.all()
        return [self._format_article_response(a) for a in articles]

    def get_status(self, db: Session) -> Dict[str, Any]:
        total = db.query(NewsArticle.id).count()
        analyzed = db.query(NewsArticle.id).filter(NewsArticle.analysis_status == "ANALYZED").count()
        pending = db.query(NewsArticle.id).filter(NewsArticle.analysis_status == "PENDING").count()
        failed = db.query(NewsArticle.id).filter(NewsArticle.analysis_status.in_(["FAILED", "RATE_LIMITED"])).count()

        return {
            "ingestion_enabled": settings.NEWS_INGESTION_ENABLED,
            "gemini_enabled": gemini_news_analyzer.is_configured(),
            "gemini_model": settings.GEMINI_MODEL,
            "total_articles": total,
            "analyzed_articles": analyzed,
            "pending_articles": pending,
            "failed_articles": failed,
            "last_ingestion_time": self._last_ingestion_time.isoformat() if self._last_ingestion_time else None
        }

    def _format_article_response(self, article: NewsArticle) -> Dict[str, Any]:
        analysis_data = None
        if article.analysis_json:
            try:
                analysis_data = json.loads(article.analysis_json)
            except Exception:
                pass

        sectors = []
        if article.related_sectors:
            try:
                sectors = json.loads(article.related_sectors)
            except Exception:
                pass

        stocks = []
        if article.related_stocks:
            try:
                stocks = json.loads(article.related_stocks)
            except Exception:
                pass

        return {
            "id": article.id,
            "provider": article.provider,
            "headline": article.headline,
            "summary": article.summary,
            "source": article.source,
            "canonical_url": article.canonical_url,
            "published_at": article.published_at.isoformat() if article.published_at else "",
            "retrieved_at": article.retrieved_at.isoformat() if article.retrieved_at else "",
            "category": article.category,
            "related_sectors": sectors,
            "related_stocks": stocks,
            "analysis": analysis_data,
            "analysis_source": article.analysis_source,
            "analysis_status": article.analysis_status,
            "analyzed_at": article.analyzed_at.isoformat() if article.analyzed_at else None
        }

news_service = NewsService()
