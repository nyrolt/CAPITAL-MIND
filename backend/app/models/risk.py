# pyrefly: ignore [missing-import]
from pydantic import BaseModel
from typing import List, Literal, Optional

RiskLevel = Literal['Very Low', 'Low', 'Moderate', 'High', 'Very High', 'Insufficient data']
DiversificationLevel = Literal['Low', 'Moderate', 'High', 'Insufficient data']

# Risk factor status uses a 3-way scale (Low / Moderate / High), not the full
# RiskLevel type.  "Insufficient data" is only emitted for the empty-portfolio
# sentinel factor.
RiskFactorStatus = Literal['Low', 'Moderate', 'High', 'Insufficient data']


class RiskFactorModel(BaseModel):
    id: str
    name: str
    score: int
    status: RiskFactorStatus
    explanation: str


class DiversificationMetricsModel(BaseModel):
    score: Optional[int] = None
    level: DiversificationLevel
    hhiIndex: float
    hhiExplanation: str
    assetDiversificationScore: Optional[int] = None
    sectorDiversificationScore: Optional[int] = None
    topHoldingConcentration: float


class PortfolioRiskAssessmentModel(BaseModel):
    portfolioId: str
    portfolioName: str
    riskScore: Optional[int] = None
    riskLevel: RiskLevel
    diversificationScore: Optional[int] = None
    diversificationLevel: DiversificationLevel
    # ISO-8601 UTC timestamp of when this response was computed
    calculatedAt: Optional[str] = None
    # Human-readable warning when one or more prices are stale / not live
    dataQualityWarning: Optional[str] = None
    riskFactors: List[RiskFactorModel]
    diversificationMetrics: DiversificationMetricsModel
