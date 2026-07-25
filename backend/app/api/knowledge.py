"""
Read-only browsing of the curated RAG knowledge base stored in ChromaDB.
Does not touch chat_service.py's retrieve() function, which remains the
source of truth for actual query-time retrieval during chat/report
generation. This endpoint just lists everything that's been ingested.
"""
from fastapi import APIRouter, Depends

from app.core.deps import get_current_user
from app.db.chroma import knowledge_collection

router = APIRouter(prefix="/knowledge", tags=["knowledge"])


@router.get("")
async def list_knowledge(current_user: dict = Depends(get_current_user)):
    if knowledge_collection.count() == 0:
        return {"chunks": [], "total": 0}

    results = knowledge_collection.get()

    ids = results.get("ids", [])
    documents = results.get("documents", [])
    metadatas = results.get("metadatas", [])

    chunks = []
    for chunk_id, doc, meta in zip(ids, documents, metadatas or [{}] * len(ids)):
        meta = meta or {}
        chunks.append(
            {
                "id": chunk_id,
                "text": doc,
                "source": meta.get("source", "unknown"),
                "title": meta.get("title", ""),
                "url": meta.get("url", ""),
            }
        )

    return {"chunks": chunks, "total": len(chunks)}