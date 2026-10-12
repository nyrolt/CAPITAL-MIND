from abc import ABC, abstractmethod
from app.auth.schemas import AuthenticatedUser

class BaseAuthProvider(ABC):
    @abstractmethod
    async def verify_token(self, token: str) -> AuthenticatedUser:
        """Decode and verify access token, returning the unified AuthenticatedUser context."""
        pass

