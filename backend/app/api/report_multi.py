"""
Report generation for multi-label predictions - separate from report.py
(the pneumonia-only report endpoint), following the same pattern as
predict_multi.py.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app.db.mongo import predictions_collection, reports_collection
from app.services.multilabel_report_service import generate_multilabel_report

router = APIRouter(prefix="/report-multi", tags=["report-multi"])


@router.post("/{scan_id}")
async def create_multilabel_report(scan_id: str):
    prediction = await predictions_collection.find_one(
        {"scan_id": scan_id, "prediction_type": "multilabel"}, sort=[("created_at", -1)]
    )
    if not prediction:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "no_prediction", "message": "Run multi-label prediction before generating a report."}},
        )

    findings = [{"condition": f["condition"], "confidence": f["confidence"]} for f in prediction.get("findings", [])]
    report_content = generate_multilabel_report(findings)

    report_doc = {
        "scan_id": scan_id,
        "prediction_id": str(prediction["_id"]),
        "report_type": "multilabel",
        **report_content,
        "generated_at": datetime.now(timezone.utc),
    }
    await reports_collection.insert_one(report_doc)
    report_doc.pop("_id", None)
    return report_doc


@router.get("/{scan_id}")
async def get_multilabel_report(scan_id: str):
    report = await reports_collection.find_one(
        {"scan_id": scan_id, "report_type": "multilabel"}, sort=[("generated_at", -1)]
    )
    if not report:
        raise HTTPException(status_code=404, detail={"error": {"code": "not_found", "message": "No multi-label report yet for this scan."}})
    report.pop("_id", None)
    return report