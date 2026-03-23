"""Counterfactual suggestion engine."""

from __future__ import annotations

from typing import Any


_DISPLAY_NAMES = {
    "decomposition_temp": "decomposition_temp",
    "thermal_conductivity": "thermal_conductivity",
    "density": "density",
    "melting_point": "melting_point",
    "specific_heat": "specific_heat",
    "glass_transition_temp": "glass_transition_temp",
    "limiting_oxygen_index": "limiting_oxygen_index",
}


def suggest_counterfactuals(
    payload: dict[str, Any],
    sensitivity_map: dict[str, float],
    limit: int = 3,
) -> dict[str, list[str]]:
    suggestions: list[str] = []
    ranked = sorted(sensitivity_map.items(), key=lambda item: abs(item[1]), reverse=True)

    for property_name, impact in ranked:
        if len(suggestions) >= limit:
            break
        if abs(impact) < 1e-6:
            continue
        if property_name == "decomposition_temp":
            suggestions.append("increase decomposition_temp by ~80C")
        elif property_name == "thermal_conductivity":
            suggestions.append("reduce thermal_conductivity by 15%")
        elif property_name == "density":
            suggestions.append("increase density slightly")
        elif property_name == "melting_point":
            suggestions.append("increase melting_point by ~40C")
        elif property_name == "specific_heat":
            suggestions.append("increase specific_heat by 10%")
        elif property_name == "glass_transition_temp":
            suggestions.append("increase glass_transition_temp by ~25C")
        elif property_name == "limiting_oxygen_index":
            suggestions.append("increase limiting_oxygen_index by 5%")
        elif impact > 0:
            suggestions.append(f"increase {property_name} moderately")
        else:
            suggestions.append(f"reduce {property_name} moderately")

    return {"suggestions": suggestions}
