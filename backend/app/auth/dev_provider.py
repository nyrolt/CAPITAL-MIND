import jwt
import hashlib
import hmac
from datetime import datetime, timedelta, timezone
from typing import Dict, Any
from fastapi import HTTPException, status
from app.config import settings
from app.auth.base import BaseAuthProvider
from app.auth.schemas import AuthenticatedUser

# Simple secure password hashing for dev environment without external C-bindings
def hash_password(password: str) -> str:
    salt = "capitalmind_dev_salt"
    return hmac.new(salt.encode('utf-8'), password.encode('utf-8'), hashlib.sha256).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password

# In-memory user database for development mode
DEV_USERS_DB: Dict[str, Dict[str, Any]] = {
    "demo@capitalmind.ai": {
        "user_id": "usr_dev_001",
        "email": "demo@capitalmind.ai",
        "name": "Arjun Mehta",
        "hashed_password": hash_password("demo123"),
        "role": "Retail Investor",
    },
    "admin@capitalmind.ai": {
        "user_id": "usr_admin_001",
        "email": "admin@capitalmind.ai",
        "name": "Platform Administrator",
        "hashed_password": hash_password("admin123"),
        "role": "Admin",
    }
}

class DevAuthProvider(BaseAuthProvider):
    def create_token(self, user: Dict[str, Any], session_id: Optional[str] = None) -> str:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        payload = {
            "sub": user["user_id"],
            "email": user["email"],
            "name": user["name"],
            "role": user.get("role", "Retail Investor"),
            "iss": "capitalmind-dev-auth",
            "exp": expire,
            "sid": session_id
        }
        return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

    async def verify_token(self, token: str) -> AuthenticatedUser:
        try:
            payload = jwt.decode(
                token,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM]
            )
            user_id: str = payload.get("sub")
            email: str = payload.get("email")
            name: str = payload.get("name")
            role: str = payload.get("role", "Retail Investor")
            sid: Optional[str] = payload.get("sid")

            if not user_id or not email:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token claims: missing sub or email",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            # Check if this session was explicitly revoked in PostgreSQL
            if sid:
                try:
                    from app.database import SessionLocal
                    from app.models.db_models import UserSession
                    db_sess = SessionLocal()
                    try:
                        active_sess = db_sess.query(UserSession).filter(
                            UserSession.id == sid,
                            UserSession.is_revoked == False
                        ).first()
                        if not active_sess:
                            raise HTTPException(
                                status_code=status.HTTP_401_UNAUTHORIZED,
                                detail="Session has been revoked or expired. Please sign in again.",
                                headers={"WWW-Authenticate": "Bearer"},
                            )
                        # Throttle activity update to once every 2 minutes
                        now = datetime.now(timezone.utc)
                        if active_sess.last_activity_at is None or (now - active_sess.last_activity_at.replace(tzinfo=timezone.utc)).total_seconds() > 120:
                            active_sess.last_activity_at = now
                            db_sess.commit()
                    finally:
                        db_sess.close()
                except HTTPException:
                    raise
                except Exception:
                    pass

            return AuthenticatedUser(
                user_id=user_id,
                email=email,
                name=name or email,
                role=role,
                auth_mode="development",
                session_id=sid
            )
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except jwt.PyJWTError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Could not validate JWT credentials: {str(e)}",
                headers={"WWW-Authenticate": "Bearer"},
            )

dev_auth_provider = DevAuthProvider()

