from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.core.config import settings

bearer_scheme = HTTPBearer(auto_error=False)


class CurrentUser:
    def __init__(self, user_id: str, email: str | None = None) -> None:
        self.user_id = user_id
        self.email = email


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> CurrentUser:
    if not settings.auth_enabled:
        return CurrentUser(user_id="dev-user", email="dev@local")

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )

    token = credentials.credentials
    
    # Handle mock development token with expiration check
    if token.startswith("mock-dev-token"):
        parts = token.split(".")
        if len(parts) > 1:
            try:
                import base64
                import json
                import time
                payload_str = base64.b64decode(parts[1]).decode("utf-8")
                payload = json.loads(payload_str)
                iat = payload.get("iat")
                if iat and (time.time() - iat > 900):  # 15 minutes
                    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired.")
                return CurrentUser(user_id=payload.get("sub", "dev-user"), email=payload.get("email", "dev@local"))
            except HTTPException:
                raise
            except Exception:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token.")
        else:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired.")

    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token.")
        
        # Enforce 5-minute maximum lifetime
        iat = payload.get("iat")
        if iat:
            import time
            if time.time() - iat > 900:  # 15 minutes
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired.")
                
        return CurrentUser(user_id=user_id, email=payload.get("email"))
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token.") from exc

