import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import decode_access_token
from app.db.mongo import users_collection

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail={"error": {"code": "not_authenticated", "message": "Sign in to continue."}},
        )

    try:
        payload = decode_access_token(credentials.credentials)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail={"error": {"code": "token_expired", "message": "Your session has expired. Please sign in again."}},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=401,
            detail={"error": {"code": "invalid_token", "message": "Your session is invalid. Please sign in again."}},
        )

    user = await users_collection.find_one({"_id": payload.get("sub")})
    if not user:
        raise HTTPException(
            status_code=401,
            detail={"error": {"code": "invalid_token", "message": "Your session is invalid. Please sign in again."}},
        )

    return user