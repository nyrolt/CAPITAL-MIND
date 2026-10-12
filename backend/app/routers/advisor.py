from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.schemas import AuthenticatedUser
from app.auth.dependencies import get_current_user
from app.models.advisor import AIInsightModel, AIInsightRequest
from app.services.portfolio_service import portfolio_service
from app.services.advisor_service import advisor_service

router = APIRouter(prefix="/api/advisor", tags=["AI Advisor"])

@router.post("/portfolio/{id}/insight", response_model=AIInsightModel)
async def generate_portfolio_insight(
    id: str,
    req: AIInsightRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    p = portfolio_service.get_by_id(id, db=db, user_id=current_user.user_id)
    if not p:
        raise HTTPException(status_code=404, detail="Portfolio not found or access denied")

    insight = advisor_service.generate_insight(p, req.query)
    return insight

