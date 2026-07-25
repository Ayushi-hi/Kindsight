import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException

from app.core.config import settings
from app.core.deps import get_current_user
from app.core.security import create_access_token, hash_password, verify_password
from app.db.mongo import users_collection
from app.models.schemas import (
    ForgotPasswordIn,
    PasswordChangeIn,
    ResetPasswordIn,
    TokenOut,
    UserLoginIn,
    UserOut,
    UserRegisterIn,
    UserUpdateIn,
    VerifyEmailIn,
)
from app.services.email_service import send_password_reset_email, send_verification_email

router = APIRouter(prefix="/auth", tags=["auth"])


def _to_user_out(user_doc: dict) -> UserOut:
    return UserOut(
        id=user_doc["_id"],
        email=user_doc["email"],
        full_name=user_doc["full_name"],
        created_at=user_doc["created_at"],
    )


@router.post("/register", response_model=TokenOut)
async def register(payload: UserRegisterIn):
    email = payload.email.lower()
    existing = await users_collection.find_one({"email": email})
    if existing:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "email_taken", "message": "An account with this email already exists."}},
        )

    verification_token = secrets.token_urlsafe(32)
    verification_expires = datetime.now(timezone.utc) + timedelta(
        hours=settings.verification_token_expire_hours
    )

    user_doc = {
        "_id": str(uuid.uuid4()),
        "email": email,
        "full_name": payload.full_name,
        "hashed_password": hash_password(payload.password),
        "created_at": datetime.now(timezone.utc),
        "is_verified": False,
        "verification_token": verification_token,
        "verification_token_expires": verification_expires,
        "reset_token": None,
        "reset_token_expires": None,
    }
    await users_collection.insert_one(user_doc)

    try:
        send_verification_email(email, verification_token)
    except Exception:
        # Registration should still succeed even if the email fails to send
        # (e.g. SMTP misconfigured) - the user can still use the app, and
        # verification can be re-triggered later. Never block account
        # creation on email delivery.
        pass

    token = create_access_token({"sub": user_doc["_id"]})
    return TokenOut(access_token=token, user=_to_user_out(user_doc))


@router.post("/login", response_model=TokenOut)
async def login(payload: UserLoginIn):
    user = await users_collection.find_one({"email": payload.email.lower()})
    if not user or not verify_password(payload.password, user["hashed_password"]):
        raise HTTPException(
            status_code=401,
            detail={"error": {"code": "invalid_credentials", "message": "Incorrect email or password."}},
        )

    token = create_access_token({"sub": user["_id"]})
    return TokenOut(access_token=token, user=_to_user_out(user))


@router.get("/me", response_model=UserOut)
async def me(current_user: dict = Depends(get_current_user)):
    return _to_user_out(current_user)


@router.put("/me", response_model=UserOut)
async def update_me(payload: UserUpdateIn, current_user: dict = Depends(get_current_user)):
    updates = {}

    if payload.full_name is not None:
        updates["full_name"] = payload.full_name

    if payload.email is not None:
        new_email = payload.email.lower()
        if new_email != current_user["email"]:
            existing = await users_collection.find_one({"email": new_email})
            if existing:
                raise HTTPException(
                    status_code=400,
                    detail={"error": {"code": "email_taken", "message": "An account with this email already exists."}},
                )
            updates["email"] = new_email

    if not updates:
        return _to_user_out(current_user)

    await users_collection.update_one({"_id": current_user["_id"]}, {"$set": updates})
    updated_user = await users_collection.find_one({"_id": current_user["_id"]})
    return _to_user_out(updated_user)


@router.post("/change-password")
async def change_password(payload: PasswordChangeIn, current_user: dict = Depends(get_current_user)):
    if not verify_password(payload.current_password, current_user["hashed_password"]):
        raise HTTPException(
            status_code=401,
            detail={"error": {"code": "incorrect_password", "message": "Current password is incorrect."}},
        )

    await users_collection.update_one(
        {"_id": current_user["_id"]},
        {"$set": {"hashed_password": hash_password(payload.new_password)}},
    )
    return {"status": "ok"}


@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordIn):
    user = await users_collection.find_one({"email": payload.email.lower()})

    # Always return a generic success response, whether or not the email
    # exists - prevents leaking which emails have accounts (user enumeration).
    if user:
        reset_token = secrets.token_urlsafe(32)
        reset_expires = datetime.now(timezone.utc) + timedelta(minutes=settings.reset_token_expire_minutes)
        await users_collection.update_one(
            {"_id": user["_id"]},
            {"$set": {"reset_token": reset_token, "reset_token_expires": reset_expires}},
        )
        try:
            send_password_reset_email(user["email"], reset_token)
        except Exception:
            pass

    return {"status": "ok", "message": "If an account exists for that email, a reset link has been sent."}


@router.post("/reset-password")
async def reset_password(payload: ResetPasswordIn):
    user = await users_collection.find_one({"reset_token": payload.token})
    if not user:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "invalid_token", "message": "This reset link is invalid or has already been used."}},
        )

    expires = user.get("reset_token_expires")
    if not expires or datetime.now(timezone.utc) > expires.replace(tzinfo=timezone.utc):
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "expired_token", "message": "This reset link has expired. Request a new one."}},
        )

    await users_collection.update_one(
        {"_id": user["_id"]},
        {
            "$set": {"hashed_password": hash_password(payload.new_password)},
            "$unset": {"reset_token": "", "reset_token_expires": ""},
        },
    )
    return {"status": "ok"}


@router.post("/verify-email")
async def verify_email(payload: VerifyEmailIn):
    user = await users_collection.find_one({"verification_token": payload.token})
    if not user:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "invalid_token", "message": "This verification link is invalid or has already been used."}},
        )

    expires = user.get("verification_token_expires")
    if not expires or datetime.now(timezone.utc) > expires.replace(tzinfo=timezone.utc):
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "expired_token", "message": "This verification link has expired."}},
        )

    await users_collection.update_one(
        {"_id": user["_id"]},
        {
            "$set": {"is_verified": True},
            "$unset": {"verification_token": "", "verification_token_expires": ""},
        },
    )
    return {"status": "ok"}