import os
import uuid
from datetime import datetime, timezone

import aiofiles
from fastapi import APIRouter, UploadFile, File, HTTPException

from app.core.config import settings
from app.db.mongo import scans_collection, predictions_collection
from app.services.image_utils import save_viewable_preview

router = APIRouter(prefix="/scans", tags=["scans"])

ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".dcm"}


@router.post("/upload")
async def upload_scan(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "unsupported_file_type", "message": f"File type {ext} not supported."}},
        )

    os.makedirs(settings.upload_dir, exist_ok=True)
    scan_id = str(uuid.uuid4())
    stored_filename = f"{scan_id}{ext}"
    file_path = os.path.join(settings.upload_dir, stored_filename)

    async with aiofiles.open(file_path, "wb") as out_file:
        content = await file.read()
        await out_file.write(content)

    # Always generate a browser-viewable PNG preview, even for DICOM uploads
    # that the browser can't render directly. This is what the frontend's
    # "original image" toggle actually links to, not the raw uploaded file.
    preview_dir = os.path.join(settings.upload_dir, "previews")
    os.makedirs(preview_dir, exist_ok=True)
    preview_path = os.path.join(preview_dir, f"{scan_id}.png")
    save_viewable_preview(file_path, preview_path)

    scan_doc = {
        "_id": scan_id,
        "modality": "chest_xray",
        "file_url": file_path,
        "preview_url": preview_path,
        "file_type": ext.replace(".", ""),
        "status": "uploaded",
        "uploaded_at": datetime.now(timezone.utc),
    }
    await scans_collection.insert_one(scan_doc)

    return {"scan_id": scan_id, "status": "uploaded"}


@router.get("")
async def list_scans(limit: int = 10):
    cursor = scans_collection.find().sort("uploaded_at", -1).limit(limit)
    scans = await cursor.to_list(length=limit)
    for scan in scans:
        scan["id"] = scan.pop("_id")

    # Attach which screening type(s) have actually been run for each scan,
    # so the dashboard can show "Pneumonia" / "14-Condition" badges instead
    # of a generic status pill that doesn't distinguish the two pipelines.
    scan_ids = [s["id"] for s in scans]
    if scan_ids:
        pred_cursor = predictions_collection.find(
            {"scan_id": {"$in": scan_ids}}, {"scan_id": 1, "prediction_type": 1}
        )
        predictions = await pred_cursor.to_list(length=None)
        types_by_scan: dict[str, set[str]] = {}
        for p in predictions:
            types_by_scan.setdefault(p["scan_id"], set()).add(p.get("prediction_type", "single"))
        for scan in scans:
            scan["screening_types"] = sorted(types_by_scan.get(scan["id"], set()))
    else:
        for scan in scans:
            scan["screening_types"] = []

    return {"scans": scans}


@router.get("/{scan_id}")
async def get_scan(scan_id: str):
    scan = await scans_collection.find_one({"_id": scan_id})
    if not scan:
        raise HTTPException(status_code=404, detail={"error": {"code": "not_found", "message": "Scan not found."}})
    scan["id"] = scan.pop("_id")
    return scan