from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient
from jwt.exceptions import PyJWTError

from app.config import settings


bearer_scheme = HTTPBearer(auto_error=False)
issuer = f"{settings.supabase_url.rstrip('/')}/auth/v1"
jwks_client = PyJWKClient(f"{issuer}/.well-known/jwks.json", lifespan=600)
allowed_algorithms = {"RS256", "RS384", "RS512", "ES256", "ES384", "ES512", "EdDSA"}


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> UUID:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    try:
        algorithm = jwt.get_unverified_header(token).get("alg")
        if algorithm not in allowed_algorithms:
            raise PyJWTError("Unsupported JWT signing algorithm")

        signing_key = jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=[algorithm],
            audience="authenticated",
            issuer=issuer,
            options={"require": ["exp", "sub"]},
        )
        return UUID(payload["sub"])
    except (PyJWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from None
