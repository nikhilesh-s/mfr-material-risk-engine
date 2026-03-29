"""AI advisor service for post-analysis recommendations."""

from __future__ import annotations

import json
from typing import Any

from app.core.config import OPENAI_API_KEY
from app.core.logging import get_logger
from app.services.database_service import get_database_service

ADVISOR_MODEL = "gpt-4.1-mini"
logger = get_logger("uvicorn.error")


def _fallback_advisor_response(prediction: dict[str, Any], reason: str) -> dict[str, Any]:
    top_drivers = prediction.get("top_drivers", [])
    sensitivity_summary = prediction.get("sensitivity_summary", [])
    counterfactuals = prediction.get("counterfactual_suggestions", [])
    recommended_tests = prediction.get("recommended_tests", [])
    dominant_driver_names = [str(item.get("feature")) for item in top_drivers[:3] if item.get("feature")]
    sensitive_properties = [str(item.get("property")) for item in sensitivity_summary[:3] if item.get("property")]
    property_targets = {
        str(item.get("property")): str(item.get("suggested_range"))
        for item in prediction.get("optimization_targets", [])
        if item.get("property") and item.get("suggested_range")
    }

    return {
        "advisor_summary": (
            f"Advisor fallback generated without OpenAI because {reason}. "
            f"Use the stored Dravix analysis outputs for review."
        ),
        "design_tradeoffs": [
            (
                f"Balance changes in {', '.join(dominant_driver_names[:2])} "
                "against manufacturability and thermal stability."
            )
            if dominant_driver_names
            else "Balance combustion-energy reduction against manufacturability and thermal stability."
        ],
        "design_improvement_suggestions": counterfactuals,
        "recommended_tests": recommended_tests,
        "property_targets": property_targets,
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
    property_summary = (
        (stored.get("custom_material") or {}).get("descriptor_payload")
        or (stored.get("analysis") or {}).get("additional_properties")
        or {}
    )
    if not OPENAI_API_KEY:
        logger.info("[DRAVIX] Advisor fallback mode")
        return _fallback_advisor_response(prediction, "OPENAI_API_KEY is not configured")

    try:
        from openai import OpenAI
    except ImportError:
        logger.info("[DRAVIX] Advisor fallback mode")
        return _fallback_advisor_response(prediction, "the openai package is not installed")

    prompt_payload = {
        "material_name": prediction.get("material_name"),
        "DFRS": prediction.get("DFRS"),
        "confidence": prediction.get("confidence"),
        "top_drivers": prediction.get("top_drivers", []),
        "subscores": prediction.get("subscores", {}),
        "sensitivity_summary": prediction.get("sensitivity_summary", []),
        "design_suggestions": prediction.get("counterfactual_suggestions", []),
        "recommended_tests": prediction.get("recommended_tests", []),
        "property_summary": property_summary,
        "analysis_explanation": prediction.get("explanation"),
    }
    system_prompt = (
        "You are the Dravix materials advisor. Return strict JSON with keys "
        "advisor_summary, design_tradeoffs, design_improvement_suggestions, recommended_tests, "
        "property_targets, risk_mitigation_strategies, material_family_recommendations. "
        "Cover design tradeoffs, fire resistance improvement strategy, property targets, "
        "and validation experiments. "
        "Do not include markdown."
    )
    user_prompt = (
        "Produce concise engineering guidance for the following analysis payload. "
        "Keep recommendations non-certifying and testing-oriented.\n"
        f"{json.dumps(prompt_payload, default=str)}"
    )

    try:
        logger.info("[DRAVIX] Advisor using OpenAI")
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
        logger.info("[DRAVIX] Advisor fallback mode")
        return _fallback_advisor_response(prediction, str(exc))

    return {
        "advisor_summary": parsed.get("advisor_summary", ""),
        "design_tradeoffs": list(parsed.get("design_tradeoffs", [])),
        "design_improvement_suggestions": list(parsed.get("design_improvement_suggestions", [])),
        "recommended_tests": list(parsed.get("recommended_tests", prediction.get("recommended_tests", []))),
        "property_targets": dict(parsed.get("property_targets", {})),
        "risk_mitigation_strategies": list(parsed.get("risk_mitigation_strategies", [])),
        "material_family_recommendations": list(parsed.get("material_family_recommendations", [])),
    }


def build_advisor_chat_response(analysis_id: str, user_question: str) -> dict[str, Any]:
    stored = get_database_service().get_analysis(analysis_id)
    if stored is None:
        raise KeyError(f"Analysis not found: {analysis_id}")

    prediction = (stored.get("result") or {}).get("prediction_json") or {}
    property_summary = (
        (stored.get("custom_material") or {}).get("descriptor_payload")
        or (stored.get("analysis") or {}).get("additional_properties")
        or {}
    )
    if not OPENAI_API_KEY:
        logger.info("[DRAVIX] Advisor fallback mode")
        return {
            "analysis_id": analysis_id,
            "answer": (
                "Advisor fallback mode is active. "
                f"Question received: {user_question}. "
                f"Top drivers: {prediction.get('top_drivers', [])}. "
                f"Recommended tests: {prediction.get('recommended_tests', [])}."
            ),
            "grounded_sources": [
                "prediction_json.top_drivers",
                "prediction_json.subscores",
                "prediction_json.sensitivity_summary",
                "prediction_json.recommended_tests",
                "analysis.property_summary",
            ],
        }

    try:
        from openai import OpenAI
        logger.info("[DRAVIX] Advisor using OpenAI")
        client = OpenAI(api_key=OPENAI_API_KEY)
        response = client.chat.completions.create(
            model=ADVISOR_MODEL,
            temperature=0.2,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are the Dravix advisor. Answer using only the supplied analysis context. "
                        "Be concise and grounded. When helpful, discuss design tradeoffs, fire resistance "
                        "improvement strategy, property targets, and validation experiments."
                    ),
                },
                {
                    "role": "user",
                    "content": json.dumps(
                        {
                            "analysis_id": analysis_id,
                            "question": user_question,
                            "analysis_context": prediction,
                            "property_summary": property_summary,
                        },
                        default=str,
                    ),
                },
            ],
        )
        answer = response.choices[0].message.content or ""
    except Exception:
        logger.info("[DRAVIX] Advisor fallback mode")
        answer = (
            "OpenAI advisor was unavailable, so this answer is based on stored Dravix outputs only. "
            f"Question: {user_question}. "
            f"Counterfactual suggestions: {prediction.get('counterfactual_suggestions', [])}."
        )

    return {
        "analysis_id": analysis_id,
        "answer": answer,
        "grounded_sources": [
            "prediction_json.top_drivers",
            "prediction_json.subscores",
            "prediction_json.sensitivity_summary",
            "prediction_json.counterfactual_suggestions",
        ],
    }
