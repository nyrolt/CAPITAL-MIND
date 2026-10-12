from fastapi import Depends, HTTPException, status, Header
from typing import Optional
from app.config import settings
from app.auth.schemas import AuthenticatedUser
from app.auth.dev_provider import dev_auth_provider
from app.auth.cognito_provider import cognito_auth_provider

async def get_current_user(authorization: Optional[str] = Header(None)) -> AuthenticatedUser:
    """
    Unified FastAPI dependency for authentication and authorization.
    Switches between Local Dev Auth and AWS Cognito Auth based on AUTH_MODE.
    Both modes produce the exact same AuthenticatedUser context.
    """
    token: Optional[str] = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]

    mode = settings.AUTH_MODE.lower()

    if mode == "cognito":
        if not token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Bearer authentication token required in Cognito mode",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return await cognito_auth_provider.verify_token(token)
    else:
        # Development mode
        if token:
            return await dev_auth_provider.verify_token(token)

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def require_admin(
    current_user: AuthenticatedUser = Depends(get_current_user)
) -> AuthenticatedUser:
    """
    RBAC dependency requiring Admin privileges.
    Rejects unauthenticated requests with 401 (via get_current_user)
    and non-admin authenticated users with 403 Forbidden.
    """
    if current_user.role.lower() != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Admin privileges required"
        )
    return current_user

