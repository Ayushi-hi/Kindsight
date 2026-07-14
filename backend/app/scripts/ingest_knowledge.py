"""
One-time (or re-runnable) script that embeds the curated pneumonia knowledge
base and stores it in the same ChromaDB collection the running backend reads
from (app.db.chroma.knowledge_collection) - so this must be run inside the
backend's environment (same persisted chroma_data volume), not on your local
machine separately.

Usage (from inside the backend container):
    python -m app.scripts.ingest_knowledge

Safe to re-run: uses deterministic IDs (based on title), so re-running just
overwrites/upserts the same entries instead of duplicating them.
"""

import re

from app.db.chroma import knowledge_collection
from app.scripts.knowledge_base import KNOWLEDGE_CHUNKS


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def get_embedder():
    from sentence_transformers import SentenceTransformer

    return SentenceTransformer("BAAI/bge-small-en-v1.5")


def main():
    print(f"Loading embedding model...")
    embedder = get_embedder()

    print(f"Embedding {len(KNOWLEDGE_CHUNKS)} knowledge chunks...")
    texts = [chunk["text"] for chunk in KNOWLEDGE_CHUNKS]
    embeddings = embedder.encode(texts, show_progress_bar=True).tolist()

    ids = [slugify(chunk["title"]) for chunk in KNOWLEDGE_CHUNKS]
    metadatas = [
        {
            "title": chunk["title"],
            "source": chunk["source"],
            "url": chunk.get("url", ""),
        }
        for chunk in KNOWLEDGE_CHUNKS
    ]

    knowledge_collection.upsert(
        ids=ids,
        embeddings=embeddings,
        documents=texts,
        metadatas=metadatas,
    )

    total = knowledge_collection.count()
    print(f"Done. Collection now has {total} entries.")


if __name__ == "__main__":
    main()