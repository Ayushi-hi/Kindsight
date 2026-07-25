"""
List endpoint for reports across BOTH pipelines (single + multilabel).
Read-only aggregation over the existing `reports` collection - does not
touch report.py or report_multi.py, which remain the source of truth for
generating and fetching a single scan's report.
"""
from fastapi import APIRouter, Depends

from app.core.deps import get_current_user
from app.db.mongo import scans_collection, reports_collection

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("")
async def list_reports(page: int = 1, page_size: int = 10, current_user: dict = Depends(get_current_user)):
    page = max(page, 1)
    page_size = max(1, min(page_size, 100))
    skip = (page - 1) * page_size

    # Reports don't carry owner_id directly, so scope via the user's own scans.
    owned_cursor = scans_collection.find(
        {"owner_id": current_user["_id"]}, {"_id": 1, "preview_url": 1, "modality": 1}
    )
    owned_scans = await owned_cursor.to_list(length=None)
    scan_ids = [s["_id"] for s in owned_scans]
    scan_lookup = {s["_id"]: s for s in owned_scans}

    if not scan_ids:
        return {"reports": [], "total": 0, "page": page, "page_size": page_size}

    filter_q = {"scan_id": {"$in": scan_ids}}
    total = await reports_collection.count_documents(filter_q)
    cursor = reports_collection.find(filter_q).sort("generated_at", -1).skip(skip).limit(page_size)
    reports = await cursor.to_list(length=page_size)

    result = []
    for r in reports:
        r.pop("_id", None)
        scan = scan_lookup.get(r["scan_id"], {})
        result.append(
            {
                **r,
                "preview_url": scan.get("preview_url"),
                "modality": scan.get("modality"),
            }
        )

    return {"reports": result, "total": total, "page": page, "page_size": page_size}