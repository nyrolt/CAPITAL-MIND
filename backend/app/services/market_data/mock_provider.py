import math
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from app.services.market_data.base import MarketDataProvider

# Curated reference dataset for Indian listed equities (NSE/BSE)
INDIAN_STOCKS_DIRECTORY: Dict[str, Dict[str, Any]] = {
    "TCS": {
        "symbol": "TCS",
        "company_name": "Tata Consultancy Services Ltd.",
        "isin": "INE467B01029",
        "exchange": "NSE",
        "sector": "Information Technology",
        "industry": "IT Services & Consulting",
        "instrument_type": "EQUITY",
        "currency": "INR",
        "base_price": 3950.0,
        "previous_close": 3920.0,
        "day_open": 3930.0,
        "day_high": 3985.0,
        "day_low": 3915.0,
        "volume": 2185420,
        "market_cap": 1428500.0,  # in Crores
        "pe_ratio": 29.8,
        "week_52_high": 4585.0,
        "week_52_low": 3310.0,
    },
    "INFY": {
        "symbol": "INFY",
        "company_name": "Infosys Ltd.",
        "isin": "INE009A01021",
        "exchange": "NSE",
        "sector": "Information Technology",
        "industry": "IT Services & Consulting",
        "instrument_type": "EQUITY",
        "currency": "INR",
        "base_price": 1510.0,
        "previous_close": 1495.0,
        "day_open": 1500.0,
        "day_high": 1525.0,
        "day_low": 1488.0,
        "volume": 6420100,
        "market_cap": 628900.0,
        "pe_ratio": 24.2,
        "week_52_high": 1991.0,
        "week_52_low": 1358.0,
    },
    "RELIANCE": {
        "symbol": "RELIANCE",
        "company_name": "Reliance Industries Ltd.",
        "isin": "INE002A01018",
        "exchange": "NSE",
        "sector": "Energy & Petrochemicals",
        "industry": "Oil, Gas & Consumable Fuels",
        "instrument_type": "EQUITY",
        "currency": "INR",
        "base_price": 2650.0,
        "previous_close": 2630.0,
        "day_open": 2640.0,
        "day_high": 2675.0,
        "day_low": 2625.0,
        "volume": 7890450,
        "market_cap": 1792400.0,
        "pe_ratio": 26.5,
        "week_52_high": 3217.0,
        "week_52_low": 2220.0,
    },
    "HDFCBANK": {
        "symbol": "HDFCBANK",
        "company_name": "HDFC Bank Ltd.",
        "isin": "INE040A01034",
        "exchange": "NSE",
        "sector": "Financial Services",
        "industry": "Private Sector Bank",
        "instrument_type": "EQUITY",
        "currency": "INR",
        "base_price": 1780.0,
        "previous_close": 1765.0,
        "day_open": 1770.0,
        "day_high": 1795.0,
        "day_low": 1760.0,
        "volume": 12540800,
        "market_cap": 1354200.0,
        "pe_ratio": 18.9,
        "week_52_high": 1794.0,
        "week_52_low": 1363.0,
    },
    "ICICIBANK": {
        "symbol": "ICICIBANK",
        "company_name": "ICICI Bank Ltd.",
        "isin": "INE090A01021",
        "exchange": "NSE",
        "sector": "Financial Services",
        "industry": "Private Sector Bank",
        "instrument_type": "EQUITY",
        "currency": "INR",
        "base_price": 1230.0,
        "previous_close": 1215.0,
        "day_open": 1220.0,
        "day_high": 1245.0,
        "day_low": 1210.0,
        "volume": 14210300,
        "market_cap": 865200.0,
        "pe_ratio": 17.4,
        "week_52_high": 1300.0,
        "week_52_low": 910.0,
    },
    "BHARTIARTL": {
        "symbol": "BHARTIARTL",
        "company_name": "Bharti Airtel Ltd.",
        "isin": "INE397D01024",
        "exchange": "NSE",
        "sector": "Telecommunication",
        "industry": "Telecom - Cellular & Fixed line",
        "instrument_type": "EQUITY",
        "currency": "INR",
        "base_price": 1640.0,
        "previous_close": 1618.0,
        "day_open": 1625.0,
        "day_high": 1658.0,
        "day_low": 1615.0,
        "volume": 5890120,
        "market_cap": 948200.0,
        "pe_ratio": 42.1,
        "week_52_high": 1779.0,
        "week_52_low": 915.0,
    },
    "SBIN": {
        "symbol": "SBIN",
        "company_name": "State Bank of India",
        "isin": "INE062A01020",
        "exchange": "NSE",
        "sector": "Financial Services",
        "industry": "Public Sector Bank",
        "instrument_type": "EQUITY",
        "currency": "INR",
        "base_price": 820.0,
        "previous_close": 810.0,
        "day_open": 814.0,
        "day_high": 828.0,
        "day_low": 808.0,
        "volume": 18450100,
        "market_cap": 731500.0,
        "pe_ratio": 10.8,
        "week_52_high": 912.0,
        "week_52_low": 555.0,
    },
    "ITC": {
        "symbol": "ITC",
        "company_name": "ITC Ltd.",
        "isin": "INE154A01025",
        "exchange": "NSE",
        "sector": "Fast Moving Consumer Goods",
        "industry": "Diversified FMCG",
        "instrument_type": "EQUITY",
        "currency": "INR",
        "base_price": 495.0,
        "previous_close": 490.0,
        "day_open": 492.0,
        "day_high": 499.0,
        "day_low": 488.0,
        "volume": 11200400,
        "market_cap": 618400.0,
        "pe_ratio": 28.6,
        "week_52_high": 528.0,
        "week_52_low": 399.0,
    },
    "LT": {
        "symbol": "LT",
        "company_name": "Larsen & Toubro Ltd.",
        "isin": "INE018A01030",
        "exchange": "NSE",
        "sector": "Capital Goods",
        "industry": "Civil Construction & Engineering",
        "instrument_type": "EQUITY",
        "currency": "INR",
        "base_price": 3650.0,
        "previous_close": 3610.0,
        "day_open": 3620.0,
        "day_high": 3680.0,
        "day_low": 3600.0,
        "volume": 1820400,
        "market_cap": 501800.0,
        "pe_ratio": 33.4,
        "week_52_high": 3919.0,
        "week_52_low": 2873.0,
    },
    "TATAMOTORS": {
        "symbol": "TATAMOTORS",
        "company_name": "Tata Motors Ltd.",
        "isin": "INE155A01022",
        "exchange": "NSE",
        "sector": "Automobile and Auto Components",
        "industry": "Commercial & Passenger Vehicles",
        "instrument_type": "EQUITY",
        "currency": "INR",
        "base_price": 980.0,
        "previous_close": 965.0,
        "day_open": 970.0,
        "day_high": 995.0,
        "day_low": 960.0,
        "volume": 9450200,
        "market_cap": 361200.0,
        "pe_ratio": 10.2,
        "week_52_high": 1179.0,
        "week_52_low": 608.0,
    },
    "BAJFINANCE": {
        "symbol": "BAJFINANCE",
        "company_name": "Bajaj Finance Ltd.",
        "isin": "INE296A01024",
        "exchange": "NSE",
        "sector": "Financial Services",
        "industry": "Non-Banking Financial Company (NBFC)",
        "instrument_type": "EQUITY",
        "currency": "INR",
        "base_price": 7250.0,
        "previous_close": 7180.0,
        "day_open": 7200.0,
        "day_high": 7320.0,
        "day_low": 7150.0,
        "volume": 1150400,
        "market_cap": 448500.0,
        "pe_ratio": 29.5,
        "week_52_high": 8192.0,
        "week_52_low": 6375.0,
    },
    "SUNPHARMA": {
        "symbol": "SUNPHARMA",
        "company_name": "Sun Pharmaceutical Industries Ltd.",
        "isin": "INE044A01036",
        "exchange": "NSE",
        "sector": "Healthcare",
        "industry": "Pharmaceuticals & Biotechnology",
        "instrument_type": "EQUITY",
        "currency": "INR",
        "base_price": 1890.0,
        "previous_close": 1870.0,
        "day_open": 1878.0,
        "day_high": 1910.0,
        "day_low": 1865.0,
        "volume": 2450800,
        "market_cap": 453600.0,
        "pe_ratio": 38.4,
        "week_52_high": 1960.0,
        "week_52_low": 1110.0,
    },
    "TITAN": {
        "symbol": "TITAN",
        "company_name": "Titan Company Ltd.",
        "isin": "INE280A01028",
        "exchange": "NSE",
        "sector": "Consumer Durables",
        "industry": "Gems, Jewellery and Watches",
        "instrument_type": "EQUITY",
        "currency": "INR",
        "base_price": 3480.0,
        "previous_close": 3445.0,
        "day_open": 3460.0,
        "day_high": 3510.0,
        "day_low": 3435.0,
        "volume": 1210400,
        "market_cap": 308900.0,
        "pe_ratio": 84.5,
        "week_52_high": 3886.0,
        "week_52_low": 3055.0,
    },
    "WIPRO": {
        "symbol": "WIPRO",
        "company_name": "Wipro Ltd.",
        "isin": "INE075A01022",
        "exchange": "NSE",
        "sector": "Information Technology",
        "industry": "IT Services & Consulting",
        "instrument_type": "EQUITY",
        "currency": "INR",
        "base_price": 540.0,
        "previous_close": 535.0,
        "day_open": 537.0,
        "day_high": 548.0,
        "day_low": 532.0,
        "volume": 6840200,
        "market_cap": 282400.0,
        "pe_ratio": 23.8,
        "week_52_high": 580.0,
        "week_52_low": 375.0,
    },
    "MARUTI": {
        "symbol": "MARUTI",
        "company_name": "Maruti Suzuki India Ltd.",
        "isin": "INE585B01010",
        "exchange": "NSE",
        "sector": "Automobile and Auto Components",
        "industry": "Passenger Cars & Utility Vehicles",
        "instrument_type": "EQUITY",
        "currency": "INR",
        "base_price": 12650.0,
        "previous_close": 12520.0,
        "day_open": 12580.0,
        "day_high": 12780.0,
        "day_low": 12490.0,
        "volume": 412000,
        "market_cap": 397600.0,
        "pe_ratio": 27.8,
        "week_52_high": 13680.0,
        "week_52_low": 9250.0,
    },
    "NIFTY 50": {
        "symbol": "NIFTY 50",
        "company_name": "Nifty 50 Benchmark Index",
        "isin": "IN0000000001",
        "exchange": "NSE",
        "sector": "Benchmark Index",
        "industry": "Index",
        "instrument_type": "INDEX",
        "currency": "INR",
        "base_price": 25810.85,
        "previous_close": 25668.55,
        "day_open": 25700.0,
        "day_high": 25880.0,
        "day_low": 25640.0,
        "volume": 25480000,
        "market_cap": 0.0,
        "pe_ratio": 22.8,
        "week_52_high": 26277.35,
        "week_52_low": 18837.85,
    },
    "NIFTY": {
        "symbol": "NIFTY 50",
        "company_name": "Nifty 50 Benchmark Index",
        "isin": "IN0000000001",
        "exchange": "NSE",
        "sector": "Benchmark Index",
        "industry": "Index",
        "instrument_type": "INDEX",
        "currency": "INR",
        "base_price": 25810.85,
        "previous_close": 25668.55,
        "day_open": 25700.0,
        "day_high": 25880.0,
        "day_low": 25640.0,
        "volume": 25480000,
        "market_cap": 0.0,
        "pe_ratio": 22.8,
        "week_52_high": 26277.35,
        "week_52_low": 18837.85,
    },
    "NIFTY50": {
        "symbol": "NIFTY 50",
        "company_name": "Nifty 50 Benchmark Index",
        "isin": "IN0000000001",
        "exchange": "NSE",
        "sector": "Benchmark Index",
        "industry": "Index",
        "instrument_type": "INDEX",
        "currency": "INR",
        "base_price": 25810.85,
        "previous_close": 25668.55,
        "day_open": 25700.0,
        "day_high": 25880.0,
        "day_low": 25640.0,
        "volume": 25480000,
        "market_cap": 0.0,
        "pe_ratio": 22.8,
        "week_52_high": 26277.35,
        "week_52_low": 18837.85,
    }
}


class MockMarketDataProvider(MarketDataProvider):
    """
    Simulation provider for Indian Stock Market data (NSE/BSE).
    Returns realistic market quotes for major Indian listed equities,
    clearly labeled with data_source='mock' and is_real_time=False.
    """

    @property
    def name(self) -> str:
        return "Mock Indian Market Data Provider (Simulation)"

    @property
    def is_real_time(self) -> bool:
        return False

    async def search_stocks(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        q = query.strip().upper()
        if not q:
            return []

        results: List[Dict[str, Any]] = []
        for symbol, stock in INDIAN_STOCKS_DIRECTORY.items():
            name_upper = stock["company_name"].upper()
            if q in symbol or q in name_upper:
                day_change = round(stock["base_price"] - stock["previous_close"], 2)
                day_change_pct = round((day_change / stock["previous_close"]) * 100, 2)
                results.append({
                    "symbol": stock["symbol"],
                    "name": stock["company_name"],
                    "company_name": stock["company_name"],
                    "isin": stock["isin"],
                    "exchange": stock["exchange"],
                    "sector": stock["sector"],
                    "industry": stock["industry"],
                    "currency": stock["currency"],
                    "current_price": stock["base_price"],
                    "day_change": day_change,
                    "day_change_percentage": day_change_pct,
                    "data_source": "mock",
                    "is_real_time": False,
                    "last_updated": datetime.now(timezone.utc).isoformat()
                })
                if len(results) >= limit:
                    break

        return results

    async def get_stock_quote(self, symbol: str) -> Optional[Dict[str, Any]]:
        sym = symbol.strip().upper()
        stock = INDIAN_STOCKS_DIRECTORY.get(sym)
        if not stock:
            return None

        day_change = round(stock["base_price"] - stock["previous_close"], 2)
        day_change_pct = round((day_change / stock["previous_close"]) * 100, 2)

        return {
            "symbol": stock["symbol"],
            "company_name": stock["company_name"],
            "isin": stock["isin"],
            "exchange": stock["exchange"],
            "sector": stock["sector"],
            "industry": stock["industry"],
            "current_price": stock["base_price"],
            "previous_close": stock["previous_close"],
            "day_open": stock["day_open"],
            "day_high": stock["day_high"],
            "day_low": stock["day_low"],
            "volume": stock["volume"],
            "day_change": day_change,
            "day_change_percentage": day_change_pct,
            "currency": stock["currency"],
            "data_source": "mock",
            "is_real_time": False,
            "provider": self.name,
            "disclaimer": "Simulated market data for demonstration only. Not real market quotes.",
            "last_updated": datetime.now(timezone.utc).isoformat()
        }

    async def get_stock_details(self, symbol: str) -> Optional[Dict[str, Any]]:
        sym = symbol.strip().upper()
        stock = INDIAN_STOCKS_DIRECTORY.get(sym)
        if not stock:
            return None

        quote = await self.get_stock_quote(sym)
        if not quote:
            return None

        return {
            **quote,
            "sector": stock["sector"],
            "industry": stock["industry"],
            "instrument_type": stock["instrument_type"],
            "market_cap": stock["market_cap"],
            "pe_ratio": stock["pe_ratio"],
            "week_52_high": stock["week_52_high"],
            "week_52_low": stock["week_52_low"],
            "is_active": True,
        }

    async def get_historical_prices(self, symbol: str, timeframe: str = "1M") -> List[Dict[str, Any]]:
        sym = symbol.strip().upper()
        stock = INDIAN_STOCKS_DIRECTORY.get(sym)
        if not stock:
            return []

        base_p = stock["base_price"]
        points_map = {
            "1D": (7, 60, "%H:%M"),     # 7 hours of intraday trading
            "1W": (7, 1440, "%a"),      # 7 days
            "1M": (30, 1440, "%d %b"),  # 30 days
            "3M": (90, 1440, "%d %b"),  # 90 days
            "6M": (26, 10080, "%b %y"), # 26 weeks
            "1Y": (52, 10080, "%b %y"), # 52 weeks
            "5Y": (60, 43200, "%Y"),    # 60 months
            "ALL": (60, 43200, "%Y"),   # all history
        }
        num_points, delta_mins, date_fmt = points_map.get(timeframe.upper(), (30, 1440, "%d %b"))

        now = datetime.now(timezone.utc)
        history: List[Dict[str, Any]] = []

        for i in range(num_points, -1, -1):
            point_time = now - timedelta(minutes=i * delta_mins)
            # deterministic organic curve around base price
            phase = (num_points - i) / max(1, num_points)
            cycle = math.sin(phase * 4 * math.pi) * 0.04
            trend = (phase - 0.5) * 0.08
            p = round(base_p * (1.0 + cycle + trend), 2)
            high = round(p * 1.012, 2)
            low = round(p * 0.989, 2)
            vol = int(stock["volume"] / num_points * (0.8 + 0.4 * abs(math.cos(phase * math.pi))))

            history.append({
                "timestamp": point_time.isoformat(),
                "formatted_date": point_time.strftime(date_fmt),
                "price": p,
                "open": round(p * 0.998, 2),
                "high": high,
                "low": low,
                "close": p,
                "volume": vol,
            })

        return history

    async def get_market_status(self) -> Dict[str, Any]:
        # Indian Standard Time (IST) is UTC + 5:30
        now_utc = datetime.now(timezone.utc)
        ist_now = now_utc + timedelta(hours=5, minutes=30)
        
        is_weekday = ist_now.weekday() < 5  # Mon=0, Fri=4
        current_time_minutes = ist_now.hour * 60 + ist_now.minute

        market_open_minutes = 9 * 60 + 15   # 09:15 AM
        market_close_minutes = 15 * 60 + 30 # 03:30 PM

        is_open = is_weekday and (market_open_minutes <= current_time_minutes <= market_close_minutes)
        session = "Regular Trading Session" if is_open else ("Pre-Market" if is_weekday and 9*60 <= current_time_minutes < market_open_minutes else "Market Closed")

        return {
            "market": "NSE / BSE (National & Bombay Stock Exchanges)",
            "timezone": "Asia/Kolkata (IST, UTC+5:30)",
            "current_time_ist": ist_now.strftime("%Y-%m-%d %H:%M:%S IST"),
            "status": "OPEN" if is_open else "CLOSED",
            "session": session,
            "trading_hours": "09:15 - 15:30 IST (Mon - Fri)",
            "indices": {
                "NIFTY_50": {"current": 25810.85, "change": 142.30, "change_pct": 0.56},
                "SENSEX": {"current": 84299.90, "change": 483.15, "change_pct": 0.58},
                "NIFTY_BANK": {"current": 53840.20, "change": 310.40, "change_pct": 0.58}
            },
            "data_source": "mock",
            "is_real_time": False,
            "disclaimer": "Simulated market status and mock prices for demonstration purposes."
        }
