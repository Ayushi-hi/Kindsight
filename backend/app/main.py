from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.api import upload, predict, predict_multi, report, report_multi, chat

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_origin,
        "http://localhost:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router)
app.include_router(predict.router)
app.include_router(predict_multi.router)
app.include_router(report.router)
app.include_router(report_multi.router)
app.include_router(chat.router)

# Serves uploaded images + gradcam overlays so the frontend can <img src=...> them directly
app.mount("/files", StaticFiles(directory=settings.upload_dir), name="files")


@app.get("/")
async def root():
    return {"status": "ok", "service": settings.app_name}