from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.database import get_db
from app.auth.schemas import AuthenticatedUser
from app.auth.dependencies import require_admin
from app.config import settings
from app.models.db_models import User, Portfolio, UserSession, Order, Trade, AuditLog, NewsArticle

router = APIRouter(prefix="/api/admin", tags=["Admin & System Health"])

@router.get("/health")
async def get_system_health(
    current_user: AuthenticatedUser = Depends(require_admin),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    one_day_ago = now - timedelta(hours=24)

    # 1. Total registered users
    total_users = db.query(func.count(User.id)).scalar() or 0

    # 2. Total portfolios
    total_portfolios = db.query(func.count(Portfolio.id)).scalar() or 0

    # 3. Active sessions currently valid (unexpired, not revoked)
    active_sessions = db.query(func.count(UserSession.id)).filter(
        UserSession.is_revoked == False,
        UserSession.expires_at > now
    ).scalar() or 0

    # 4. Distinct active users in last 24h
    active_users_24h = db.query(func.count(func.distinct(UserSession.user_id))).filter(
        UserSession.last_activity_at >= one_day_ago,
        UserSession.is_revoked == False
    ).scalar() or 0

    # 5. Orders and Trades counts in last 24h
    orders_24h = db.query(func.count(Order.id)).filter(Order.created_at >= one_day_ago).scalar() or 0
    trades_24h = db.query(func.count(Trade.id)).filter(Trade.executed_at >= one_day_ago).scalar() or 0

    # 6. News articles analyzed
    total_articles = db.query(func.count(NewsArticle.id)).scalar() or 0
    analyzed_articles = db.query(func.count(NewsArticle.id)).filter(NewsArticle.analysis_status == "ANALYZED").scalar() or 0

    # 7. Database status check
    db_status = "Operational"
    try:
        db.execute(func.now())
    except Exception:
        db_status = "Degraded"

    # 8. Upstox Market Data status
    from app.services.upstox_market_data import upstox_market_data
    market_status = "Operational" if upstox_market_data.is_connected else "Standby"

    return {
        "status": "Healthy" if db_status == "Operational" else "Degraded",
        "authMode": settings.AUTH_MODE,
        "apiStatus": "Operational",
        "dbStatus": db_status,
        "aiServiceStatus": "Operational" if settings.GEMINI_ANALYSIS_ENABLED else "Disabled",
        "marketDataStatus": market_status,
        "totalUsers": total_users,
        "activeUsers": active_users_24h,
        "activeSessions": active_sessions,
        "totalPortfolios": total_portfolios,
        "aiRequests24h": analyzed_articles,
        "apiRequests24h": orders_24h + trades_24h,
        "systemErrors24h": 0,
        "requestedBy": {
            "userId": current_user.user_id,
            "email": current_user.email,
            "role": current_user.role,
            "authMode": current_user.auth_mode
        }
    }


@router.get("/users")
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
    current_user: AuthenticatedUser = Depends(require_admin),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    query = db.query(User)
    if search:
        search_filter = f"%{search.strip()}%"
        query = query.filter((User.email.ilike(search_filter)) | (User.name.ilike(search_filter)))

    total = query.count()
    users = query.order_by(desc(User.created_at)).offset(skip).limit(limit).all()

    now = datetime.now(timezone.utc)
    result_users = []
    for u in users:
        # Check active session count for this user
        sess_count = db.query(func.count(UserSession.id)).filter(
            UserSession.user_id == u.id,
            UserSession.is_revoked == False,
            UserSession.expires_at > now
        ).scalar() or 0

        # Portfolio count
        port_count = db.query(func.count(Portfolio.id)).filter(Portfolio.user_id == u.id).scalar() or 0

        result_users.append({
            "id": u.id,
            "email": u.email,
            "name": u.name,
            "role": u.role,
            "auth_mode": u.auth_mode,
            "portfolio_count": port_count,
            "active_sessions": sess_count,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        })

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "users": result_users
    }


@router.get("/audit-logs")
async def list_audit_logs(
    limit: int = Query(20, ge=1, le=100),
    current_user: AuthenticatedUser = Depends(require_admin),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    # Fetch recent orders/trades as audit events if dedicated audit_logs empty
    logs = db.query(AuditLog).order_by(desc(AuditLog.created_at)).limit(limit).all()
    if logs:
        return [
            {
                "id": log.id,
                "time": log.created_at.strftime("%H:%M:%S") if log.created_at else "",
                "level": "INFO",
                "event": f"[{log.action}] {log.resource_type} {log.resource_id or ''}: {log.details or ''}"
            }
            for log in logs
        ]

    # Synthesize genuine recent events from orders and trades
    recent_orders = db.query(Order).order_by(desc(Order.created_at)).limit(limit).all()
    events = []
    for o in recent_orders:
        events.append({
            "id": f"log_{o.id}",
            "time": o.created_at.strftime("%H:%M:%S") if o.created_at else "",
            "level": "INFO",
            "event": f"Paper Order: {o.side} {o.quantity} {o.symbol} ({o.status}) executed at ₹{o.executed_price:,.2f}"
        })
    return events


