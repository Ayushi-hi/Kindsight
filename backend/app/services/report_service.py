"""
Generates a structured radiology-style report from a prediction, grounded
with retrieved knowledge chunks where relevant. Falls back to a plain
template (no LLM call) if no API key is configured, so the endpoint always
returns something usable during development.

Uses OpenRouter (OpenAI-compatible API) so you can use free models
without needing an Anthropic billing account.
"""

import json
import logging

from app.core.config import settings
from app.services.rag_service import retrieve

logger = logging.getLogger(__name__)


def _severity_from_confidence(label: str, confidence: float) -> str:
    if label == "normal":
        return "none"
    if confidence >= 0.85:
        return "severe"
    if confidence >= 0.65:
        return "moderate"
    return "mild"


def _fallback_report(label: str, confidence: float, severity: str) -> dict:
    if label == "pneumonia":
        findings = (
            f"Findings consistent with pneumonia detected with {confidence:.0%} model confidence. "
            "Region of interest highlighted in the accompanying heatmap."
        )
        impression = f"Impression: findings suggestive of {severity} pneumonia. Correlate clinically."
        recommendation = "Recommend clinical correlation and follow-up imaging as advised by the reviewing physician."
    else:
        findings = f"No radiographic findings suggestive of pneumonia identified ({confidence:.0%} confidence)."
        impression = "Impression: no acute pulmonary abnormality detected."
        recommendation = "No immediate follow-up indicated based on this finding alone."

    return {
        "findings": findings,
        "impression": impression,
        "severity": severity,
        "recommendation": recommendation,
        "citations": [],
    }


def _get_openrouter_client():
    from openai import OpenAI

    return OpenAI(
        api_key=settings.openrouter_api_key,
        base_url="https://openrouter.ai/api/v1",
    )


def generate_report(label: str, confidence: float) -> dict:
    severity = _severity_from_confidence(label, confidence)

    if not settings.openrouter_api_key:
        return _fallback_report(label, confidence, severity)

    client = _get_openrouter_client()

    query = f"pneumonia radiographic findings severity {severity}" if label == "pneumonia" else "normal chest x-ray"
    chunks = retrieve(query, top_k=3)
    context = "\n\n".join(f"[{c['source']}] {c['text']}" for c in chunks) if chunks else "No reference material retrieved."

    prompt = f"""You are assisting a radiologist by drafting a structured report section for a chest X-ray.

Model output: label={label}, confidence={confidence:.2f}, estimated severity={severity}

Reference material (for grounding only, do not copy verbatim, paraphrase):
{context}

Respond with ONLY valid JSON (no markdown fences, no preamble) with keys findings, impression,
recommendation (each 1-3 sentences, professional radiology register, do not state or imply this
is a final diagnosis, always include a clinical correlation caveat):"""

    try:
        response = client.chat.completions.create(
            model=settings.llm_model,
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}],
        )
        text = response.choices[0].message.content
        logger.debug("Raw LLM response for report generation: %r", text)
        if not text:
            raise ValueError("LLM returned empty/None content")
        text = text.strip()
        if text.startswith("```"):
            # strip markdown code fences some models add despite instructions not to
            text = text.strip("`")
            if text.lower().startswith("json"):
                text = text[4:]
            text = text.strip()
        parsed = json.loads(text)
    except Exception as e:
        logger.warning("OpenRouter report generation failed, using fallback template: %s: %s", type(e).__name__, e)
        return _fallback_report(label, confidence, severity)

    parsed["severity"] = severity
    parsed["citations"] = [c["source"] for c in chunks]
    return parsed