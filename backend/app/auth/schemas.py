from pydantic import BaseModel
from typing import Optional, Any

class AuthenticatedUser(BaseModel):
    user_id: str
    email: str
    name: str
    role: str = "Retail Investor"
    auth_mode: str  # "development" or "cognito"
    id: Optional[str] = None
    session_id: Optional[str] = None
    created_at: Optional[str] = None

    def model_post_init(self, __context: Any) -> None:
        if not self.id:
            self.id = self.user_id

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: AuthenticatedUser

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
