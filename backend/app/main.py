from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.deps import get_current_user
from app.api import auth, upload, predict, predict_multi, report, report_multi, reports, chat, knowledge

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

# Auth is the only router that's open - everything else requires a valid
# bearer token. Adding the dependency here (rather than inside each router
# file) means predict.py / report.py / etc. didn't need to change at all.
app.include_router(auth.router)
app.include_router(upload.router, dependencies=[Depends(get_current_user)])
app.include_router(predict.router, dependencies=[Depends(get_current_user)])
app.include_router(predict_multi.router, dependencies=[Depends(get_current_user)])
app.include_router(report.router, dependencies=[Depends(get_current_user)])
app.include_router(report_multi.router, dependencies=[Depends(get_current_user)])
app.include_router(reports.router, dependencies=[Depends(get_current_user)])
app.include_router(chat.router, dependencies=[Depends(get_current_user)])
app.include_router(knowledge.router, dependencies=[Depends(get_current_user)])
# Serves uploaded images + gradcam overlays so the frontend can <img src=...> them directly
app.mount("/files", StaticFiles(directory=settings.upload_dir), name="files")


@app.get("/")
async def root():
    return {"status": "ok", "service": settings.app_name}