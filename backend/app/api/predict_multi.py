"""
Multi-label (14-condition) prediction endpoint - deliberately separate from
predict.py's single-disease pneumonia endpoint, so that pipeline keeps
working completely unchanged. This lets the two models be tested and
compared independently before any decision is made about replacing one
with the other.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app.db.mongo import scans_collection, predictions_collection
from app.services.multilabel_inference_service import predict_multilabel, CONDITIONS
from app.services.gradcam_service import generate_gradcam_for_condition

router = APIRouter(prefix="/predict-multi", tags=["predict-multi"])


@router.post("/{scan_id}")
async def run_multilabel_prediction(scan_id: str):
    scan = await scans_collection.find_one({"_id": scan_id})
    if not scan:
        raise HTTPException(status_code=404, detail={"error": {"code": "not_found", "message": "Scan not found."}})

    await scans_collection.update_one({"_id": scan_id}, {"$set": {"status": "processing"}})

    result = predict_multilabel(scan["file_url"])

    # Generate one Grad-CAM heatmap per positive finding - a scan showing
    # both Cardiomegaly and Effusion gets two separate heatmaps, each showing
    # where the model attended to for that specific condition.
    findings_with_gradcam = []
    for finding in result["findings"]:
        condition = finding["condition"]
        class_idx = CONDITIONS.index(condition)
        gradcam_path = generate_gradcam_for_condition(scan["file_url"], scan_id, condition, class_idx)
        findings_with_gradcam.append(
            {
                "condition": condition,
                "confidence": finding["confidence"],
                "gradcam_url": gradcam_path,
            }
        )

    prediction_doc = {
        "scan_id": scan_id,
        "model_name": "efficientnet_b0_chestxray14_v1",
        "findings": findings_with_gradcam,
        "all_probabilities": result["all_probabilities"],
        "created_at": datetime.now(timezone.utc),
    }
    await predictions_collection.insert_one({**prediction_doc, "prediction_type": "multilabel"})
    await scans_collection.update_one({"_id": scan_id}, {"$set": {"status": "done"}})

    prediction_doc.pop("_id", None)
    return prediction_doc


@router.get("/{scan_id}")
async def get_multilabel_prediction(scan_id: str):
    prediction = await predictions_collection.find_one(
        {"scan_id": scan_id, "prediction_type": "multilabel"}, sort=[("created_at", -1)]
    )
    if not prediction:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "not_found", "message": "No multi-label prediction yet for this scan."}},
        )
    prediction.pop("_id", None)
    return prediction