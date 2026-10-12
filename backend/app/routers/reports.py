from fastapi import APIRouter, Depends, HTTPException
from app.auth.schemas import AuthenticatedUser
from app.auth.dependencies import get_current_user
from app.models.advisor import ReportModel
from app.services.portfolio_service import portfolio_service
from datetime import datetime

router = APIRouter(prefix="/api/reports", tags=["Reports"])

@router.post("/{portfolio_id}", response_model=ReportModel)
async def generate_report(
    portfolio_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    p = portfolio_service.get_by_id(portfolio_id, user_id=current_user.user_id)
    if not p:
        raise HTTPException(status_code=404, detail="Portfolio not found or access denied")

    return {
        "id": f"rep_{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "title": f"Q3 Comprehensive Portfolio Report — {p['name']}",
        "type": "Portfolio Performance Report",
        "date": datetime.now().strftime("%Y-%m-%d"),
        "portfolioId": portfolio_id,
        "portfolioName": p["name"],
        "summaryText": f"Detailed quarterly return breakdown for {p['name']}. Total Value: ₹{p['totalValue']:,.2f}, Risk Score: {p['riskScore']}/100.",
        "fileSize": "2.4 MB"
    }

