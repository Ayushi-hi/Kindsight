"""
Retrieval over the pneumonia knowledge base stored in ChromaDB.
Ingestion (populating the collection) is a separate offline script —
see rag/ingest/ in the project root, not part of the live API.
"""

from app.db.chroma import knowledge_collection

_embedder = None


def get_embedder():
    global _embedder
    if _embedder is None:
        from sentence_transformers import SentenceTransformer

        _embedder = SentenceTransformer("BAAI/bge-small-en-v1.5")
    return _embedder


def retrieve(query: str, top_k: int = 5) -> list[dict]:
    """Returns a list of { text, source, title, url } chunks relevant to query.
    Returns an empty list gracefully if the knowledge base hasn't been
    ingested yet, rather than throwing — lets the rest of the app run
    before RAG ingestion is done."""
    if knowledge_collection.count() == 0:
        return []

    embedder = get_embedder()
    query_embedding = embedder.encode(query).tolist()

    results = knowledge_collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k,
    )

    chunks = []
    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]

    for doc, meta in zip(documents, metadatas):
        chunks.append(
            {
                "text": doc,
                "source": meta.get("source", "unknown"),
                "title": meta.get("title", ""),
                "url": meta.get("url", ""),
            }
        )
    return chunks
