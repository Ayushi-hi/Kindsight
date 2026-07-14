"""
Generates a report describing MULTIPLE findings at once (as opposed to
report_service.py, which describes a single pneumonia finding). Kept as a
separate module rather than modifying report_service.py, so the original
pneumonia-only report pipeline keeps working unchanged.
"""

import json
import logging

from app.core.config import settings
from app.services.rag_service import retrieve

logger = logging.getLogger(__name__)


def _fallback_multilabel_report(findings: list[dict]) -> dict:
    if not findings:
        return {
            "findings": "No radiographic abnormality identified among the 14 screened conditions.",
            "impression": "Impression: no acute findings detected by automated screening.",
            "severity": "none",
            "recommendation": "No immediate follow-up indicated based on this automated screening alone.",
            "citations": [],
        }

    condition_list = ", ".join(f"{f['condition']} ({f['confidence']:.0%} confidence)" for f in findings)
    findings_text = (
        f"Automated screening flagged the following possible finding(s): {condition_list}. "
        "Region(s) of interest highlighted in the accompanying heatmap(s) for each finding."
    )
    impression = (
        f"Impression: findings suggestive of {findings[0]['condition'].lower()}"
        + (" and other flagged conditions" if len(findings) > 1 else "")
        + ". Correlate clinically."
    )
    recommendation = (
        "Recommend clinical correlation and, if warranted, further evaluation or specialist "
        "consultation for each flagged finding as advised by the reviewing physician."
    )

    return {
        "findings": findings_text,
        "impression": impression,
        "severity": "moderate" if len(findings) == 1 else "significant",
        "recommendation": recommendation,
        "citations": [],
    }


def _get_openrouter_client():
    from openai import OpenAI

    return OpenAI(api_key=settings.openrouter_api_key, base_url="https://openrouter.ai/api/v1")


def generate_multilabel_report(findings: list[dict]) -> dict:
    """findings = [{"condition": str, "confidence": float}, ...] - already
    filtered to positives above threshold, sorted by confidence descending."""

    if not settings.openrouter_api_key:
        return _fallback_multilabel_report(findings)

    if not findings:
        return _fallback_multilabel_report(findings)

    client = _get_openrouter_client()

    # Retrieve grounding material for each flagged condition, not just one
    all_chunks = []
    for finding in findings:
        chunks = retrieve(f"{finding['condition']} chest X-ray radiographic findings", top_k=2)
        all_chunks.extend(chunks)

    context = (
        "\n\n".join(f"[{c['source']}] {c['text']}" for c in all_chunks)
        if all_chunks
        else "No reference material retrieved."
    )
    condition_summary = ", ".join(f"{f['condition']} (confidence {f['confidence']:.2f})" for f in findings)

    prompt = f"""You are assisting a radiologist by drafting a structured report section for a chest X-ray
that was automatically screened across 14 possible conditions.

Findings flagged by the model: {condition_summary}

Reference material (for grounding only, paraphrase, do not copy verbatim):
{context}

Respond with ONLY valid JSON (no markdown fences, no preamble) with keys findings, impression,
recommendation. Keep each field to 1-2 concise sentences maximum - brevity matters here.
Describe ALL flagged findings together coherently, not as a disconnected list. Do not state or
imply this is a final diagnosis; always include a clinical correlation caveat:"""

    try:
        response = client.chat.completions.create(
            model=settings.llm_model,
            max_tokens=900,
            messages=[{"role": "user", "content": prompt}],
        )
        text = response.choices[0].message.content
        logger.debug("Raw LLM response for multilabel report: %r", text)
        if text:
            text = text.strip()
            if text.startswith("```"):
                text = text.strip("`")
                if text.lower().startswith("json"):
                    text = text[4:]
                text = text.strip()
        parsed = json.loads(text)
    except Exception as e:
        logger.warning("OpenRouter multilabel report generation failed, using fallback: %s: %s", type(e).__name__, e)
        return _fallback_multilabel_report(findings)

    parsed["severity"] = "moderate" if len(findings) == 1 else "significant"
    parsed["citations"] = list({c["source"] for c in all_chunks})
    return parsed
