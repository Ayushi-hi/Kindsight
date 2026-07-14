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
