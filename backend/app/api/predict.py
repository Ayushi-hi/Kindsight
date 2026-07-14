from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app.db.mongo import scans_collection, predictions_collection
from app.services.inference_service import predict_pneumonia
from app.services.gradcam_service import generate_gradcam

router = APIRouter(prefix="/predict", tags=["predict"])


@router.post("/{scan_id}")
async def run_prediction(scan_id: str):
    scan = await scans_collection.find_one({"_id": scan_id})
    if not scan:
        raise HTTPException(status_code=404, detail={"error": {"code": "not_found", "message": "Scan not found."}})

    await scans_collection.update_one({"_id": scan_id}, {"$set": {"status": "processing"}})

    result = predict_pneumonia(scan["file_url"])
    gradcam_path = generate_gradcam(scan["file_url"], scan_id, result["label"])

    prediction_doc = {
        "scan_id": scan_id,
        "prediction_type": "single",
        "model_name": "efficientnet_b0_pneumonia_v1",
        "label": result["label"],
        "confidence": result["confidence"],
        "gradcam_url": gradcam_path,
        "inference_time_ms": result["inference_time_ms"],
        "created_at": datetime.now(timezone.utc),
    }
    await predictions_collection.insert_one(prediction_doc)
    await scans_collection.update_one({"_id": scan_id}, {"$set": {"status": "done"}})

    prediction_doc.pop("_id", None)
    return prediction_doc


@router.get("/{scan_id}")
async def get_prediction(scan_id: str):
    prediction = await predictions_collection.find_one(
        {"scan_id": scan_id, "prediction_type": "single"}, sort=[("created_at", -1)]
    )
    if not prediction:
        raise HTTPException(status_code=404, detail={"error": {"code": "not_found", "message": "No prediction yet for this scan."}})
    prediction.pop("_id", None)
    return prediction