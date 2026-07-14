from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app.db.mongo import predictions_collection, reports_collection
from app.services.report_service import generate_report

router = APIRouter(prefix="/report", tags=["report"])


@router.post("/{scan_id}")
async def create_report(scan_id: str):
    prediction = await predictions_collection.find_one(
        {"scan_id": scan_id, "prediction_type": "single"}, sort=[("created_at", -1)]
    )
    if not prediction:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "no_prediction", "message": "Run prediction before generating a report."}},
        )

    report_content = generate_report(prediction["label"], prediction["confidence"])

    report_doc = {
        "scan_id": scan_id,
        "prediction_id": str(prediction["_id"]),
        "report_type": "single",
        **report_content,
        "generated_at": datetime.now(timezone.utc),
    }
    await reports_collection.insert_one(report_doc)
    report_doc.pop("_id", None)
    return report_doc


@router.get("/{scan_id}")
async def get_report(scan_id: str):
    report = await reports_collection.find_one(
        {"scan_id": scan_id, "report_type": "single"}, sort=[("generated_at", -1)]
    )
    if not report:
        raise HTTPException(status_code=404, detail={"error": {"code": "not_found", "message": "No report yet for this scan."}})
    report.pop("_id", None)
    return report