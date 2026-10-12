from fastapi import APIRouter, Depends
from typing import List, Dict, Any
from app.auth.schemas import AuthenticatedUser
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

@router.get("", response_model=List[Dict[str, Any]])
async def get_notifications(current_user: AuthenticatedUser = Depends(get_current_user)):
    return [
        {
            "id": "n1",
            "title": "Sector Concentration Alert",
            "message": "Banking sector concentration in 'Long-Term Growth' has reached 34.5%, crossing threshold.",
            "category": "Risk",
            "timestamp": "10 minutes ago",
            "isRead": False,
            "link": "/risk"
        },
        {
            "id": "n2",
            "title": "Milestone Reached",
            "message": "Your total portfolio net asset value crossed ₹8,40,000 following market gains.",
            "category": "Portfolio",
            "timestamp": "2 hours ago",
            "isRead": False,
            "link": "/dashboard"
        },
        {
            "id": "n3",
            "title": "New AI Portfolio Insight Available",
            "message": "CapitalMind Intelligence has updated its monthly portfolio risk analysis.",
            "category": "AI",
            "timestamp": "Yesterday",
            "isRead": True,
            "link": "/ai-advisor"
        }
    ]

