import os

# Must be set BEFORE chromadb is imported - this version reads telemetry
# config from the environment at import time, not just from client settings.
os.environ["ANONYMIZED_TELEMETRY"] = "False"

import chromadb

from app.core.config import settings

chroma_client = chromadb.PersistentClient(path=settings.chroma_persist_dir)

knowledge_collection = chroma_client.get_or_create_collection(
    name=settings.chroma_collection,
    metadata={"hnsw:space": "cosine"},
)