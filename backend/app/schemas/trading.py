from typing import Optional, List
from pydantic import BaseModel, Field

class UpdateCapitalRequest(BaseModel):
    capital: float = Field(..., gt=0, description="Virtual paper trading capital to set")

class UpdateCapitalResponse(BaseModel):
    account_id: str
    user_id: str
    cash_balance: float
    initial_cash: float
    updated_at: str

class CreateOrderRequest(BaseModel):
    symbol: str = Field(..., description="Stock symbol (e.g., TCS, INFY, RELIANCE)")
    side: str = Field(..., description="Order side: BUY or SELL")
    quantity: float = Field(..., gt=0, description="Number of shares to trade")
    order_type: str = Field("MARKET", description="Order type (MARKET)")
    client_order_id: Optional[str] = Field(None, description="Client idempotency key")

class OrderResponse(BaseModel):
    order_id: str
    user_id: str
    symbol: str
    side: str
    quantity: float
    order_type: str
    status: str
    requested_price: float
    executed_price: float
    total_value: float
    client_order_id: Optional[str] = None
    rejection_reason: Optional[str] = None
    trade_id: Optional[str] = None
    updated_cash: Optional[float] = None
    created_at: Optional[str] = None
    filled_at: Optional[str] = None
    data_source: str = "mock"
    is_paper_trade: bool = True
    is_duplicate: bool = False
    notice: str = "Simulated order using simulated market data. No real money is involved."

class TradeResponse(BaseModel):
    trade_id: str
    order_id: str
    user_id: str
    symbol: str
    side: str
    quantity: float
    execution_price: float
    total_value: float
    executed_at: Optional[str] = None
    data_source: str = "mock"
    is_paper_trade: bool = True
    notice: str = "Simulated trade executed on mock market data."

class PaperAccountResponse(BaseModel):
    account_id: str
    user_id: str
    initial_cash: float
    available_cash: float
    invested_value: float
    portfolio_value: float
    total_value: float
    realized_pnl: float
    unrealized_pnl: float
    total_pnl: float
    currency: str = "INR"
    is_paper_trading: bool = True
    notice: str = "Simulated paper trading account. No real capital or financial exchange is involved."

class PaperHoldingItem(BaseModel):
    symbol: str
    company_name: str
    quantity: float
    average_price: float
    current_price: float
    cost_basis: float
    market_value: float
    unrealized_pnl: float
    unrealized_pnl_percentage: float

class PaperPortfolioResponse(BaseModel):
    account_id: str
    cash: float
    invested_value: float
    market_value: float
    total_value: float
    cost_basis: float
    realized_pnl: float
    unrealized_pnl: float
    total_pnl: float
    holdings: List[PaperHoldingItem]
    is_paper_trading: bool = True
    notice: str = "Values are based on simulated market data."
