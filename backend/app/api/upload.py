import os
import uuid
from datetime import datetime, timezone

import aiofiles
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException

from app.core.config import settings
from app.core.deps import get_current_user
from app.db.mongo import scans_collection, predictions_collection
from app.services.image_utils import save_viewable_preview

router = APIRouter(prefix="/scans", tags=["scans"])

ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".dcm"}


@router.post("/upload")
async def upload_scan(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
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
        "owner_id": current_user["_id"],
        "uploaded_at": datetime.now(timezone.utc),
    }
    await scans_collection.insert_one(scan_doc)

    return {"scan_id": scan_id, "status": "uploaded"}


@router.get("")
async def list_scans(
    page: int = 1,
    page_size: int = 10,
    limit: int | None = None,
    current_user: dict = Depends(get_current_user),
):
    # `limit` is kept for backward compatibility with the dashboard's
    # "give me the most recent N" call - it just maps to page 1 at that size.
    if limit is not None:
        page_size = limit
        page = 1

    page = max(page, 1)
    page_size = max(1, min(page_size, 100))
    skip = (page - 1) * page_size

    # Per-user visibility: every scan query is scoped to the requesting user.
    owner_filter = {"owner_id": current_user["_id"]}

    total = await scans_collection.count_documents(owner_filter)
    cursor = scans_collection.find(owner_filter).sort("uploaded_at", -1).skip(skip).limit(page_size)
    scans = await cursor.to_list(length=page_size)
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

        # Also pull the latest pneumonia-pipeline result (label + confidence)
        # per scan, purely for a compact summary in list views - the full
        # prediction is still fetched separately on the scan result page.
        single_cursor = predictions_collection.find(
            {"scan_id": {"$in": scan_ids}, "prediction_type": "single"},
            {"scan_id": 1, "label": 1, "confidence": 1, "created_at": 1},
        ).sort("created_at", -1)
        single_preds = await single_cursor.to_list(length=None)
        latest_single: dict[str, dict] = {}
        for p in single_preds:
            latest_single.setdefault(p["scan_id"], p)
        for scan in scans:
            match = latest_single.get(scan["id"])
            scan["label"] = match["label"] if match else None
            scan["confidence"] = match["confidence"] if match else None
    else:
        for scan in scans:
            scan["screening_types"] = []
            scan["label"] = None
            scan["confidence"] = None

    return {"scans": scans, "total": total, "page": page, "page_size": page_size}


@router.get("/{scan_id}")
async def get_scan(scan_id: str, current_user: dict = Depends(get_current_user)):
    scan = await scans_collection.find_one({"_id": scan_id})
    # 404 (not 403) for a scan owned by someone else, so we don't reveal
    # to a non-owner that a given scan_id even exists.
    if not scan or scan.get("owner_id") != current_user["_id"]:
        raise HTTPException(status_code=404, detail={"error": {"code": "not_found", "message": "Scan not found."}})
    scan["id"] = scan.pop("_id")
    return scan