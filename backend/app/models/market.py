from pydantic import BaseModel
from typing import Optional, Literal

AssetTypeCategory = Literal['EQUITY', 'ETF', 'INDEX', 'BOND', 'FUND', 'DERIVATIVE']

class MarketTick(BaseModel):
    """
    Normalized Indian Market Data Tick Model.
    Decoupled from Upstox raw protobuf or mock formats.
    """
    instrument_key: str
    symbol: str
    name: Optional[str] = None
    exchange: str = "NSE"
    segment: str = "NSE_EQ"
    asset_type: AssetTypeCategory = "EQUITY"
    ltp: float
    previous_close: float = 0.0
    change: float = 0.0
    change_percent: float = 0.0
    open: Optional[float] = None
    high: Optional[float] = None
    low: Optional[float] = None
    volume: Optional[float] = 0.0
    timestamp: int = 0  # Epoch milliseconds
    bid: Optional[float] = None
    ask: Optional[float] = None
    bid_quantity: Optional[float] = None
    ask_quantity: Optional[float] = None
    market_status: str = "CLOSED"  # OPEN, CLOSED, PRE_OPEN, AUCTION, UNKNOWN
    source: Literal['UPSTOX', 'MOCK'] = "UPSTOX"

class MarketStatusModel(BaseModel):
    market: str = "NSE / BSE"
    status: str = "CLOSED"
    session: str = "REGULAR"
    trading_hours: str = "09:15 - 15:30 IST"
    timezone: str = "Asia/Kolkata"
    current_time_ist: Optional[str] = None
    is_real_time: bool = True
    provider: str = "UPSTOX"
    disclaimer: Optional[str] = None

class ProviderStatusModel(BaseModel):
    provider: str = "UPSTOX"
    mode: str = "live"
    connected: bool = False
    state: str = "DISCONNECTED"  # DISCONNECTED, CONNECTING, CONNECTED, SUBSCRIBED, RECONNECTING, STOPPED
    market_data_enabled: bool = True
    is_upstox_live: bool = True
    subscribed_instruments: int = 0
    cached_instruments: int = 0
    market_status: str = "CLOSED"
    last_update: Optional[str] = None
