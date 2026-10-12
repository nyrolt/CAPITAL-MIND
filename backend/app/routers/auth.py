import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.db_models import User
from app.auth.schemas import Token, LoginRequest, RegisterRequest, AuthenticatedUser
from app.auth.dependencies import get_current_user
from app.auth.dev_provider import dev_auth_provider, DEV_USERS_DB, verify_password, hash_password
from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

def ensure_demo_user(db: Session):
    demo = db.query(User).filter(User.id == "usr_dev_001").first()
    if not demo:
        demo = User(
            id="usr_dev_001",
            email="demo@capitalmind.ai",
            name="Arjun Mehta",
            hashed_password=hash_password("demo123"),
            role="Retail Investor",
            auth_mode="development"
        )
        db.add(demo)
        db.commit()

    admin = db.query(User).filter(User.id == "usr_admin_001").first()
    if not admin:
        admin = User(
            id="usr_admin_001",
            email="admin@capitalmind.ai",
            name="Platform Administrator",
            hashed_password=hash_password("admin123"),
            role="Admin",
            auth_mode="development"
        )
        db.add(admin)
        db.commit()
    return demo

@router.post("/register", response_model=Token)
async def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if settings.AUTH_MODE.lower() == "cognito":
        user_context = AuthenticatedUser(
            user_id=f"cognito_{req.email.split('@')[0]}",
            email=req.email,
            name=req.full_name,
            role="Retail Investor",
            auth_mode="cognito"
        )
        return Token(access_token="demo_cognito_id_token", token_type="bearer", user=user_context)

    # Check if user already exists in PostgreSQL
    existing = db.query(User).filter(User.email == req.email).first()
    if existing or req.email in DEV_USERS_DB:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    new_user = User(
        id=f"usr_dev_{uuid.uuid4().hex[:6]}",
        email=req.email,
        name=req.full_name,
        hashed_password=hash_password(req.password),
        role="Retail Investor",
        auth_mode="development"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    from datetime import timedelta, datetime, timezone
    from app.models.db_models import UserSession, gen_uuid

    # Create tracked UserSession
    session_id = gen_uuid("sess")
    session_token = str(uuid.uuid4())
    user_session = UserSession(
        id=session_id,
        user_id=new_user.id,
        session_token=session_token,
        ip_address="127.0.0.1",
        user_agent="CapitalMind Client",
        is_revoked=False,
        last_activity_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    db.add(user_session)
    db.commit()

    DEV_USERS_DB[req.email] = {
        "user_id": new_user.id,
        "email": new_user.email,
        "name": new_user.name,
        "hashed_password": new_user.hashed_password,
        "role": new_user.role,
    }

    token_str = dev_auth_provider.create_token({
        "user_id": new_user.id,
        "email": new_user.email,
        "name": new_user.name,
        "role": new_user.role,
    }, session_id=session_id)

    user_context = AuthenticatedUser(
        user_id=new_user.id,
        email=new_user.email,
        name=new_user.name,
        role=new_user.role,
        auth_mode="development",
        session_id=session_id,
        created_at=new_user.created_at.isoformat() if new_user.created_at else None
    )
    return Token(access_token=token_str, token_type="bearer", user=user_context)

@router.post("/login", response_model=Token)
async def login(req: LoginRequest, db: Session = Depends(get_db)):
    ensure_demo_user(db)

    if settings.AUTH_MODE.lower() == "cognito":
        user_context = AuthenticatedUser(
            user_id=f"cognito_{req.email.split('@')[0]}",
            email=req.email,
            name=req.email.split('@')[0].capitalize(),
            role="Retail Investor",
            auth_mode="cognito"
        )
        return Token(access_token="demo_cognito_access_token", token_type="bearer", user=user_context)

    # First check PostgreSQL database
    user = db.query(User).filter(User.email == req.email).first()
    if user:
        if not verify_password(req.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        user_id = user.id
        email = user.email
        name = user.name
        role = user.role
        user_created_at = user.created_at.isoformat() if user.created_at else None
    else:
        # Fallback to DEV_USERS_DB
        dev_u = DEV_USERS_DB.get(req.email)
        if not dev_u or not verify_password(req.password, dev_u["hashed_password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        user_id = dev_u["user_id"]
        email = dev_u["email"]
        name = dev_u["name"]
        role = dev_u["role"]
        user_created_at = None

    from datetime import timedelta, datetime, timezone
    from app.models.db_models import UserSession, gen_uuid

    # Create persistent session record
    session_id = gen_uuid("sess")
    session_token = str(uuid.uuid4())
    user_session = UserSession(
        id=session_id,
        user_id=user_id,
        session_token=session_token,
        ip_address="127.0.0.1",
        user_agent="CapitalMind Client",
        is_revoked=False,
        last_activity_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    db.add(user_session)
    db.commit()

    token_str = dev_auth_provider.create_token({
        "user_id": user_id,
        "email": email,
        "name": name,
        "role": role,
    }, session_id=session_id)

    user_context = AuthenticatedUser(
        user_id=user_id,
        email=email,
        name=name,
        role=role,
        auth_mode="development",
        session_id=session_id,
        created_at=user_created_at
    )
    return Token(access_token=token_str, token_type="bearer", user=user_context)

@router.post("/logout")
async def logout(current_user: AuthenticatedUser = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.session_id:
        from app.models.db_models import UserSession
        sess = db.query(UserSession).filter(UserSession.id == current_user.session_id).first()
        if sess:
            sess.is_revoked = True
            db.commit()
    return {"message": "Successfully logged out and session invalidated"}

@router.get("/me", response_model=AuthenticatedUser)
async def get_me(current_user: AuthenticatedUser = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == current_user.user_id).first()
    if user and user.created_at:
        current_user.created_at = user.created_at.strftime("%d %b %Y")
    return current_user
