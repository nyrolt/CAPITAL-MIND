from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class MarketDataProvider(ABC):
    """
    Abstract Base Class for Indian Stock Market Data Providers.
    Decouples the application from any specific market data vendor (e.g. NSE/BSE, AlphaVantage, Yahoo Finance, Zerodha Kite).
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Provider name identifier."""
        pass

    @property
    @abstractmethod
    def is_real_time(self) -> bool:
        """Whether this provider returns verified real-time market data or simulated/mock data."""
        pass

    @abstractmethod
    async def search_stocks(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search stocks by symbol or company name."""
        pass

    @abstractmethod
    async def get_stock_quote(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Get latest price quote for a symbol."""
        pass

    @abstractmethod
    async def get_stock_details(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Get comprehensive company and market information for a symbol."""
        pass

    @abstractmethod
    async def get_historical_prices(self, symbol: str, timeframe: str = "1M") -> List[Dict[str, Any]]:
        """Get historical prices for charting (e.g., 1D, 1W, 1M, 1Y, 5Y)."""
        pass

    @abstractmethod
    async def get_market_status(self) -> Dict[str, Any]:
        """Get overall market trading status (NSE/BSE trading sessions)."""
        pass
