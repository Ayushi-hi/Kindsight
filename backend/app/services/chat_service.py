from app.core.config import settings
from app.services.rag_service import retrieve


def _get_openrouter_client():
    from openai import OpenAI

    return OpenAI(
        api_key=settings.openrouter_api_key,
        base_url="https://openrouter.ai/api/v1",
    )


def answer_question(scan_context: dict, message: str) -> dict:
    """scan_context = { label, confidence, findings, impression }"""
    chunks = retrieve(message, top_k=5)

    if not settings.openrouter_api_key:
        if chunks:
            return {
                "reply": (
                    f"Based on retrieved reference material, here's relevant context: "
                    f"{chunks[0]['text'][:300]}... (Configure OPENROUTER_API_KEY for a fully "
                    f"synthesized, conversational answer.)"
                ),
                "citations": chunks,
            }
        return {
            "reply": "I don't have grounded reference material for that yet — the knowledge base may not be ingested. Configure OPENROUTER_API_KEY and run RAG ingestion for full answers.",
            "citations": [],
        }

    client = _get_openrouter_client()

    context = "\n\n".join(f"[{c['source']}] {c['text']}" for c in chunks) if chunks else "No reference material retrieved for this question."

    prompt = f"""You are a radiology assistant chatbot helping a clinician understand an AI-generated
chest X-ray finding. Never present yourself as making the final diagnosis.

This scan's result: label={scan_context.get('label')}, confidence={scan_context.get('confidence')}
Findings: {scan_context.get('findings', 'N/A')}
Impression: {scan_context.get('impression', 'N/A')}

Reference material for grounding:
{context}

Clinician's question: {message}

Answer concisely, cite reference material by source name where used, and note if something is
outside the scope of what the retrieved material or the scan result supports."""

    try:
        response = client.chat.completions.create(
            model=settings.llm_model,
            max_tokens=600,
            messages=[{"role": "user", "content": prompt}],
        )
        reply = response.choices[0].message.content
    except Exception:
        reply = "The AI assistant is temporarily unavailable (LLM request failed). Please try again shortly."

    return {"reply": reply, "citations": chunks}