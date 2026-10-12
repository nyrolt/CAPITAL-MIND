from pydantic import BaseModel
from typing import List, Optional, Literal, Union

AssetType = Union[Literal['Stock', 'Mutual Fund', 'Cash', 'Gold', 'Bond', 'ETF', 'Equity', 'Bond/Debt'], str]
RiskLevel = Literal['Very Low', 'Low', 'Moderate', 'High', 'Very High', 'Insufficient data']
DiversificationLevel = Literal['Low', 'Moderate', 'High', 'Insufficient data']

class HoldingModel(BaseModel):
    id: str
    symbol: str
    name: str
    assetType: AssetType
    quantity: float
    avgPrice: float
    currentPrice: float
    investedValue: float
    currentValue: float
    profitLoss: float
    returnPercentage: float
    allocationPercentage: float
    sector: str
    unrealizedProfitLoss: Optional[float] = None
    realizedProfitLoss: Optional[float] = None
    priceSource: Optional[str] = "demo_data"
    isRealTime: Optional[bool] = False
    isPriceStale: Optional[bool] = False
    priceWarning: Optional[str] = None
    lastPriceUpdate: Optional[str] = None
    instrumentKey: Optional[str] = None
    exchange: Optional[str] = "NSE"
    isin: Optional[str] = None

class HoldingCreateRequest(BaseModel):
    symbol: str
    name: Optional[str] = None
    assetType: AssetType = "Stock"
    quantity: float
    avgPrice: float
    sector: Optional[str] = "General"
    instrument_key: Optional[str] = None
    instrumentKey: Optional[str] = None
    exchange: Optional[str] = "NSE"
    isin: Optional[str] = None

class HoldingUpdateRequest(BaseModel):
    quantity: Optional[float] = None
    avgPrice: Optional[float] = None
    currentPrice: Optional[float] = None
    sector: Optional[str] = None
    name: Optional[str] = None
    assetType: Optional[AssetType] = None

class TransactionModel(BaseModel):
    id: str
    date: str
    symbol: str
    assetName: str
    type: Literal['BUY', 'SELL', 'DEPOSIT', 'WITHDRAWAL']
    quantity: float
    price: float
    totalValue: float
    portfolioId: str
    fee: Optional[float] = 0.0
    realizedProfitLoss: Optional[float] = None

class TransactionCreateRequest(BaseModel):
    symbol: str
    assetName: Optional[str] = None
    type: Literal['BUY', 'SELL', 'DEPOSIT', 'WITHDRAWAL'] = "BUY"
    quantity: float
    price: float
    date: Optional[str] = None
    fee: Optional[float] = 0.0

class SectorAllocationModel(BaseModel):
    sector: str
    percentage: float
    value: float

class AssetClassAllocationModel(BaseModel):
    assetType: AssetType
    percentage: float
    value: float

class PortfolioModel(BaseModel):
    id: str
    name: str
    objective: str
    riskPreference: str
    description: str
    totalValue: float
    investedCapital: float
    profitLoss: float
    returnPercentage: float
    unrealizedProfitLoss: Optional[float] = None
    realizedProfitLoss: Optional[float] = None
    totalProfitLoss: Optional[float] = None
    returnOnCost: Optional[float] = None
    totalReturnPercentage: Optional[float] = None
    cashBalance: Optional[float] = None
    securitiesValue: Optional[float] = None
    dataQualityWarning: Optional[str] = None
    riskScore: Optional[int] = None
    riskLevel: RiskLevel
    diversificationScore: Optional[int] = None
    diversificationLevel: DiversificationLevel
    sectorAllocation: List[SectorAllocationModel]
    assetAllocation: List[AssetClassAllocationModel]
    holdings: List[HoldingModel]
    transactions: List[TransactionModel]
    createdAt: str
    userId: Optional[str] = None

class PortfolioCreateRequest(BaseModel):
    name: str
    objective: str = "Wealth Maximization"
    riskPreference: str = "Aggressive"
    description: Optional[str] = "Custom investment portfolio."


