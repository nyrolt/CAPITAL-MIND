from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.schemas import AuthenticatedUser
from app.auth.dependencies import get_current_user
from app.services.portfolio_service import portfolio_service

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

@router.get("/portfolio/{id}")
async def get_portfolio_analytics(
    id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    p = portfolio_service.get_by_id(id, db=db, user_id=current_user.user_id)
    if not p:
        raise HTTPException(status_code=404, detail="Portfolio not found or access denied")
    
    return {
        "portfolioId": p["id"],
        "name": p["name"],
        "totalValue": p["totalValue"],
        "investedCapital": p["investedCapital"],
        "profitLoss": p["profitLoss"],
        "returnPercentage": p["returnPercentage"],
        "sectorAllocation": p["sectorAllocation"],
        "assetAllocation": p["assetAllocation"],
        "holdingCount": len(p["holdings"]),
        "topHolding": p["holdings"][0] if p["holdings"] else None
    }
