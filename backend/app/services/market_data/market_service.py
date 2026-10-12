from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.config import settings
from app.models.db_models import Stock
from app.services.market_data.base import MarketDataProvider
from app.services.market_data.mock_provider import MockMarketDataProvider
from app.services.market_data.upstox_provider import UpstoxMarketDataProvider

class MarketDataService:
    def __init__(self):
        self.mode = settings.MARKET_DATA_MODE.lower()
        if settings.is_upstox_live or self.mode in ("live", "upstox"):
            self._provider: MarketDataProvider = UpstoxMarketDataProvider()
        else:
            self._provider: MarketDataProvider = MockMarketDataProvider()

    @property
    def provider(self) -> MarketDataProvider:
        return self._provider

    def set_provider(self, provider: MarketDataProvider) -> None:
        """Allow runtime switching or mocking for test suites."""
        self._provider = provider

    async def search_stocks(self, query: str, limit: int = 10, db: Optional[Session] = None) -> List[Dict[str, Any]]:
        """Search stocks using the active provider with fallback to cached database records."""
        try:
            results = await self._provider.search_stocks(query, limit)
            if results:
                return results
        except Exception:
            pass

        # Fallback to local DB cache
        if db:
            q_str = f"%{query.strip().upper()}%"
            db_stocks = db.query(Stock).filter(
                (Stock.symbol.ilike(q_str)) | (Stock.name.ilike(q_str)) | (Stock.company_name.ilike(q_str))
            ).limit(limit).all()

            return [
                {
                    "symbol": s.symbol,
                    "name": s.company_name or s.name,
                    "company_name": s.company_name or s.name,
                    "isin": s.isin,
                    "exchange": s.exchange,
                    "sector": s.sector,
                    "industry": s.industry,
                    "currency": s.currency,
                    "current_price": s.current_price,
                    "day_change": s.day_change,
                    "day_change_percentage": s.day_change_percentage,
                    "data_source": "cached_database",
                    "is_real_time": False,
                    "last_updated": s.last_updated.isoformat() if s.last_updated else None
                }
                for s in db_stocks
            ]
        return []

    async def get_stock_quote(self, symbol: str, db: Optional[Session] = None) -> Optional[Dict[str, Any]]:
        """Fetch latest stock quote, caching or updating it in the PostgreSQL stocks table."""
        sym = symbol.strip().upper()
        quote: Optional[Dict[str, Any]] = None

        try:
            quote = await self._provider.get_stock_quote(sym)
        except Exception as e:
            # On provider failure, fall back to cached DB quote
            if db:
                db_stock = db.query(Stock).filter(Stock.symbol == sym).first()
                if db_stock:
                    return {
                        "symbol": db_stock.symbol,
                        "company_name": db_stock.company_name or db_stock.name,
                        "isin": db_stock.isin,
                        "exchange": db_stock.exchange,
                        "current_price": db_stock.current_price,
                        "previous_close": db_stock.previous_close,
                        "day_open": db_stock.day_open,
                        "day_high": db_stock.day_high,
                        "day_low": db_stock.day_low,
                        "volume": db_stock.volume,
                        "day_change": db_stock.day_change,
                        "day_change_percentage": db_stock.day_change_percentage,
                        "currency": db_stock.currency,
                        "data_source": "cached_database",
                        "is_real_time": False,
                        "last_updated": db_stock.last_updated.isoformat() if db_stock.last_updated else None,
                        "warning": f"Provider unavailable ({str(e)}), served from database cache"
                    }
            return None

        if not quote:
            return None

        # Upsert into PostgreSQL DB cache if session provided
        if db:
            try:
                from app.services.sector_service import sector_service
                isin_val = quote.get("isin")
                sec = quote.get("sector")
                ind = quote.get("industry")

                # Always attempt fresh sector resolution (uses curated -> DB cache -> API -> heuristics)
                if not sec or sec in ("General", "Equity", "NSE_EQ", "BSE_EQ", "Unclassified"):
                    sec, ind = sector_service.get_sector_and_industry(
                        symbol=sym,
                        company_name=quote.get("company_name", sym),
                        isin=isin_val,
                        instrument_type=quote.get("instrument_type"),
                        db=db,
                    )

                db_stock = db.query(Stock).filter(Stock.symbol == sym).first()
                now_utc = datetime.now(timezone.utc)
                if not db_stock:
                    create_kwargs = dict(
                        symbol=sym,
                        name=quote.get("company_name", sym),
                        company_name=quote.get("company_name"),
                        isin=isin_val,
                        exchange=quote.get("exchange", "NSE"),
                        sector=sec,
                        industry=ind,
                        current_price=quote.get("current_price", 0.0),
                        previous_close=quote.get("previous_close", 0.0),
                        day_open=quote.get("day_open", 0.0),
                        day_high=quote.get("day_high", 0.0),
                        day_low=quote.get("day_low", 0.0),
                        volume=quote.get("volume", 0.0),
                        day_change=quote.get("day_change", 0.0),
                        day_change_percentage=quote.get("day_change_percentage", 0.0),
                        last_updated=now_utc,
                    )
                    if sec and sec not in ("General", "Equity", "NSE_EQ", "BSE_EQ", "Unclassified"):
                        create_kwargs["sector_fetched_at"] = now_utc
                    db_stock = Stock(**create_kwargs)
                    db.add(db_stock)
                else:
                    # Only overwrite sector if new value is better than current
                    BAD_SECTORS = {"General", "Equity", "NSE_EQ", "BSE_EQ", "Unclassified"}
                    if sec and sec not in BAD_SECTORS:
                        if db_stock.sector in BAD_SECTORS or not db_stock.sector:
                            db_stock.sector = sec
                            if hasattr(db_stock, 'sector_fetched_at'):
                                db_stock.sector_fetched_at = now_utc
                    if ind and ind not in ("General", "Equity", "EQ"):
                        if db_stock.industry in ("General", "Equity", "EQ") or not db_stock.industry:
                            db_stock.industry = ind
                    db_stock.current_price = quote.get("current_price", db_stock.current_price)
                    db_stock.previous_close = quote.get("previous_close", db_stock.previous_close)
                    db_stock.day_open = quote.get("day_open", db_stock.day_open)
                    db_stock.day_high = quote.get("day_high", db_stock.day_high)
                    db_stock.day_low = quote.get("day_low", db_stock.day_low)
                    db_stock.volume = quote.get("volume", db_stock.volume)
                    db_stock.day_change = quote.get("day_change", db_stock.day_change)
                    db_stock.day_change_percentage = quote.get("day_change_percentage", db_stock.day_change_percentage)
                    db_stock.last_updated = now_utc

                db.commit()
            except Exception:
                db.rollback()

        return quote

    async def get_stock_details(self, symbol: str, db: Optional[Session] = None) -> Optional[Dict[str, Any]]:
        """Get full stock details with company metrics."""
        sym = symbol.strip().upper()
        # Ensure quote is fetched and cached
        await self.get_stock_quote(sym, db=db)
        details = await self._provider.get_stock_details(sym)
        if details:
            from app.services.sector_service import sector_service, BAD_SECTORS
            if not details.get("sector") or details.get("sector") in BAD_SECTORS:
                sec, ind = sector_service.get_sector_and_industry(
                    symbol=sym,
                    company_name=details.get("company_name"),
                    isin=details.get("isin"),
                    instrument_type=details.get("instrument_type"),
                    db=db,
                )
                if sec not in BAD_SECTORS:
                    details["sector"] = sec
                    details["industry"] = ind
            elif db:
                from app.models.db_models import Stock
                db_stock = db.query(Stock).filter(Stock.symbol == sym).first()
                if db_stock and db_stock.sector and db_stock.sector not in BAD_SECTORS:
                    details["sector"] = db_stock.sector
                    details["industry"] = db_stock.industry
        return details

    async def get_historical_prices(self, symbol: str, timeframe: str = "1M") -> List[Dict[str, Any]]:
        """Get historical prices for charting."""
        return await self._provider.get_historical_prices(symbol.strip().upper(), timeframe=timeframe)

    async def get_market_status(self) -> Dict[str, Any]:
        """Get NSE/BSE market trading status."""
        return await self._provider.get_market_status()

market_data_service = MarketDataService()
