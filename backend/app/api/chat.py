from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from app.db.mongo import reports_collection, predictions_collection, chat_sessions_collection
from app.models.schemas import ChatMessageIn
from app.services.chat_service import answer_question

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/{scan_id}/message")
async def send_message(scan_id: str, payload: ChatMessageIn):
    report = await reports_collection.find_one({"scan_id": scan_id}, sort=[("generated_at", -1)])
    prediction = await predictions_collection.find_one({"scan_id": scan_id}, sort=[("created_at", -1)])

    if not prediction:
        raise HTTPException(status_code=404, detail={"error": {"code": "no_prediction", "message": "No prediction found for this scan."}})

    scan_context = {
        "label": prediction["label"],
        "confidence": prediction["confidence"],
        "findings": report.get("findings") if report else None,
        "impression": report.get("impression") if report else None,
    }

    result = answer_question(scan_context, payload.message)

    now = datetime.now(timezone.utc)
    await chat_sessions_collection.update_one(
        {"scan_id": scan_id},
        {
            "$push": {
                "messages": {
                    "$each": [
                        {"role": "user", "content": payload.message, "ts": now},
                        {"role": "assistant", "content": result["reply"], "citations": result["citations"], "ts": now},
                    ]
                }
            }
        },
        upsert=True,
    )

    return result


@router.get("/{scan_id}/history")
async def get_history(scan_id: str):
    session = await chat_sessions_collection.find_one({"scan_id": scan_id})
    if not session:
        return {"messages": []}
    return {"messages": session.get("messages", [])}
