"""AI advisor service for post-analysis recommendations."""

from __future__ import annotations

import json
from typing import Any

from app.core.config import OPENAI_API_KEY
from app.services.database_service import get_database_service

ADVISOR_MODEL = "gpt-4.1-mini"


def _fallback_advisor_response(prediction: dict[str, Any], reason: str) -> dict[str, Any]:
    top_drivers = prediction.get("top_drivers", [])
    sensitivity_summary = prediction.get("sensitivity_summary", [])
    counterfactuals = prediction.get("counterfactual_suggestions", [])
    recommended_tests = prediction.get("recommended_tests", [])
    dominant_driver_names = [str(item.get("feature")) for item in top_drivers[:3] if item.get("feature")]
    sensitive_properties = [str(item.get("property")) for item in sensitivity_summary[:3] if item.get("property")]

    return {
        "advisor_summary": (
            f"Advisor fallback generated without OpenAI because {reason}. "
            f"Use the stored Dravix analysis outputs for review."
        ),
        "design_improvement_suggestions": counterfactuals,
        "recommended_tests": recommended_tests,
        "risk_mitigation_strategies": [
            f"Review dominant drivers: {', '.join(dominant_driver_names)}." if dominant_driver_names else "Review top fire-risk drivers.",
            f"Validate the most sensitive properties: {', '.join(sensitive_properties)}." if sensitive_properties else "Validate the most sensitive properties experimentally.",
        ],
        "material_family_recommendations": [
            "Prioritize materials with higher thermal stability and lower combustion energy.",
            "Screen alternative coated or flame-retarded variants before certification testing.",
        ],
    }


def build_advisor_response(analysis_id: str) -> dict[str, Any]:
    """Generate advisor guidance from stored analysis history and optional OpenAI summarization."""
    stored = get_database_service().get_analysis(analysis_id)
    if stored is None:
        raise KeyError(f"Analysis not found: {analysis_id}")

    prediction = (stored.get("result") or {}).get("prediction_json") or {}
    if not OPENAI_API_KEY:
        return _fallback_advisor_response(prediction, "OPENAI_API_KEY is not configured")

    try:
        from openai import OpenAI
    except ImportError:
        return _fallback_advisor_response(prediction, "the openai package is not installed")

    prompt_payload = {
        "material_name": prediction.get("material_name"),
        "DFRS": prediction.get("DFRS"),
        "confidence": prediction.get("confidence"),
        "drivers": prediction.get("top_drivers", []),
        "subscores": prediction.get("subscores", {}),
        "sensitivity_summary": prediction.get("sensitivity_summary", []),
        "counterfactual_suggestions": prediction.get("counterfactual_suggestions", []),
        "recommended_tests": prediction.get("recommended_tests", []),
        "analysis_explanation": prediction.get("explanation"),
    }
    system_prompt = (
        "You are the Dravix materials advisor. Return strict JSON with keys "
        "advisor_summary, design_improvement_suggestions, recommended_tests, "
        "risk_mitigation_strategies, material_family_recommendations. "
        "Do not include markdown."
    )
    user_prompt = (
        "Produce concise engineering guidance for the following analysis payload. "
        "Keep recommendations non-certifying and testing-oriented.\n"
        f"{json.dumps(prompt_payload, default=str)}"
    )

    try:
        client = OpenAI(api_key=OPENAI_API_KEY)
        response = client.chat.completions.create(
            model=ADVISOR_MODEL,
            temperature=0.2,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        content = response.choices[0].message.content or "{}"
        parsed = json.loads(content)
    except Exception as exc:
        return _fallback_advisor_response(prediction, str(exc))

    return {
        "advisor_summary": parsed.get("advisor_summary", ""),
        "design_improvement_suggestions": list(parsed.get("design_improvement_suggestions", [])),
        "recommended_tests": list(parsed.get("recommended_tests", prediction.get("recommended_tests", []))),
        "risk_mitigation_strategies": list(parsed.get("risk_mitigation_strategies", [])),
        "material_family_recommendations": list(parsed.get("material_family_recommendations", [])),
    }
