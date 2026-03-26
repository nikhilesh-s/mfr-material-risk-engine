"""Technical datasheet generation from stored analyses."""

from __future__ import annotations

from typing import Any

from app.services.database_service import get_database_service


def generate_tds(analysis_id: str) -> dict[str, Any]:
    """Build a structured TDS view from stored analysis history."""
    stored = get_database_service().get_analysis(analysis_id)
    if stored is None:
        raise KeyError(f"Analysis not found: {analysis_id}")

    result_row = stored.get("result") or {}
    prediction = result_row.get("prediction_json") or {}
    return {
        "analysis_id": analysis_id,
        "material_name": prediction.get("material_name", stored["analysis"].get("material_name")),
        "predicted_fire_resistance": prediction.get("DFRS", prediction.get("effectiveResistance")),
        "resistance_score": prediction.get("DFRS", prediction.get("effectiveResistance")),
        "risk_score": prediction.get("risk_score"),
        "property_summary": ((stored.get("analysis") or {}).get("additional_properties")) or {},
        "confidence": prediction.get("confidence"),
        "coating_compatibility": prediction.get("coating_analysis"),
        "top_drivers": prediction.get("top_drivers", []),
        "recommended_tests": prediction.get("recommended_tests", []),
        "design_suggestions": prediction.get("counterfactual_suggestions", []),
        "analysis_summary": prediction.get("explanation", ""),
        "subscores": prediction.get("subscores", {}),
        "sensitivity_summary": prediction.get("sensitivity_summary", []),
        "limitations_notice": prediction.get("limitations_notice"),
    }
