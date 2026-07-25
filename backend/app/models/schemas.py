from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field


class ScanOut(BaseModel):
    id: str
    modality: str = "chest_xray"
    file_url: str
    status: Literal["uploaded", "processing", "done", "failed"]
    uploaded_at: datetime


class PredictionOut(BaseModel):
    scan_id: str
    label: Literal["pneumonia", "normal"]
    confidence: float = Field(ge=0.0, le=1.0)
    gradcam_url: Optional[str] = None
    inference_time_ms: int
    created_at: datetime


class ReportOut(BaseModel):
    scan_id: str
    findings: str
    impression: str
    severity: Literal["none", "mild", "moderate", "severe"]
    recommendation: str
    citations: list[str] = []
    generated_at: datetime


class ChatMessageIn(BaseModel):
    message: str


class ChatMessageOut(BaseModel):
    reply: str
    citations: list[dict] = []


class ErrorResponse(BaseModel):
    error: dict

class UserRegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=1)


class UserLoginIn(BaseModel):
    email: EmailStr
    password: str


class UserUpdateIn(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=1)
    email: Optional[EmailStr] = None


class PasswordChangeIn(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


class UserOut(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    created_at: datetime


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ForgotPasswordIn(BaseModel):
    email: EmailStr


class ResetPasswordIn(BaseModel):
    token: str
    new_password: str = Field(min_length=8)


class VerifyEmailIn(BaseModel):
    token: str