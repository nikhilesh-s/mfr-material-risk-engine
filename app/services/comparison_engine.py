"""Material comparison engine built on the active Dravix inference stack."""

from __future__ import annotations

from typing import Any

from backend.core.material_input import normalize_material_payload


def _dominant_property_differences(material_payloads: list[dict[str, Any]]) -> list[dict[str, Any]]:
    property_values: dict[str, list[float]] = {}
    for payload in material_payloads:
        for key, value in payload.items():
            if key in {"Material Name", "Material"}:
                continue
            try:
                property_values.setdefault(key, []).append(float(value))
            except (TypeError, ValueError):
                continue

    differences: list[dict[str, Any]] = []
    for key, values in property_values.items():
        if len(values) < 2:
            continue
        min_value = min(values)
        max_value = max(values)
        spread = max_value - min_value
        if spread <= 0:
            continue
        differences.append(
            {
                "property": key,
                "min": min_value,
                "max": max_value,
                "spread": spread,
            }
        )
    differences.sort(key=lambda item: item["spread"], reverse=True)
    return differences[:5]


def compare_materials(material_list: list[Any], use_case: str | None = None) -> dict[str, Any]:
    """Compare multiple candidate materials using the active prediction pipeline."""
    from api.main import _predict_response_payload

    materials: list[dict[str, Any]] = []
    normalized_payloads: list[dict[str, Any]] = []

    for material in material_list:
        prediction = _predict_response_payload(material, use_case=use_case)
        materials.append(
            {
                "material_name": prediction["material_name"],
                "resistance_score": prediction["DFRS"],
                "risk_score": prediction["risk_score"],
                "confidence": prediction["confidence"]["label"],
                "top_drivers": prediction.get("top_drivers", []),
            }
        )
        normalized_payloads.append(normalize_material_payload(material))

    if not materials:
        return {
            "materials": [],
            "best_material": None,
            "comparison_summary": "No materials were provided for comparison.",
            "dominant_property_differences": [],
        }

    best_material = max(materials, key=lambda item: float(item["resistance_score"]))
    dominant_differences = _dominant_property_differences(normalized_payloads)
    comparison_summary = (
        f"{best_material['material_name']} is the strongest candidate in this comparison set "
        f"with a DFRS of {float(best_material['resistance_score']):.3f}."
    )
    if dominant_differences:
        comparison_summary += (
            f" The largest descriptor spread was observed in "
            f"{dominant_differences[0]['property']}."
        )

    return {
        "materials": materials,
        "best_material": best_material,
        "comparison_summary": comparison_summary,
        "dominant_property_differences": dominant_differences,
    }
