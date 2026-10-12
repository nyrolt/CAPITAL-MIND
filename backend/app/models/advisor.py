from pydantic import BaseModel
from typing import Optional, Literal

class AIInsightModel(BaseModel):
    id: str
    portfolioId: str
    query: Optional[str] = None
    portfolioSummary: str
    riskObservation: str
    diversificationObservation: str
    recommendation: str
    priority: Literal['Low', 'Medium', 'High']
    timestamp: str
    category: str
    isLiveAI: Optional[bool] = False
    modelName: Optional[str] = "Rule-based Engine"

class AIInsightRequest(BaseModel):
    query: Optional[str] = "Explain my current portfolio risk"

class RecommendationModel(BaseModel):
    id: str
    category: Literal['Diversification', 'Risk', 'Concentration', 'Sector Concentration', 'Performance', 'Portfolio Structure']
    severity: Literal['High', 'Medium', 'Low']
    title: str
    recommendation: str
    explanation: str
    createdDate: str
    portfolioId: str

class ReportModel(BaseModel):
    id: str
    title: str
    type: Literal['Portfolio Performance Report', 'Risk Analysis Report', 'Diversification Report', 'AI Advisory Report']
    date: str
    portfolioId: str
    portfolioName: str
    summaryText: str
    fileSize: str

