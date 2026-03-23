"""Property sensitivity analysis for material descriptors."""

from __future__ import annotations

from typing import Any, Callable

import numpy as np

NUMERIC_PROPERTIES = {
    "density": "Density (g/cc)",
    "melting_point": "Melting Point (°C)",
    "specific_heat": "Specific Heat (J/g-°C)",
    "thermal_conductivity": "Thermal Cond. (W/m-K)",
    "flash_point": "Flash Point (°C)",
    "autoignition_temp": "Autoignition Temp (°C)",
    "limiting_oxygen_index": "Limiting Oxygen Index (%)",
    "smoke_density": "Smoke Density (Ds)",
    "char_yield": "Char Yield (%)",
    "decomposition_temp": "Decomp. Temp (°C)",
    "heat_of_combustion": "Heat of Combustion (MJ/kg)",
    "flame_spread_index": "Flame Spread Index",
    "glass_transition_temp": "Glass Transition Temp (°C)",
}


def _get_numeric(payload: dict[str, Any], key: str) -> float | None:
    value = payload.get(key)
    try:
        if value is None:
            return None
        numeric = float(value)
    except (TypeError, ValueError):
        return None
    if np.isnan(numeric):
        return None
    return numeric


def compute_sensitivity_map(
    payload: dict[str, Any],
    predict_fn: Callable[[dict[str, Any]], float],
    baseline_score: float,
) -> dict[str, float]:
    sensitivity: dict[str, float] = {}
    for property_name, payload_key in NUMERIC_PROPERTIES.items():
        current_value = _get_numeric(payload, payload_key)
        if current_value is None:
            continue

        step = max(abs(current_value) * 0.1, 1e-6)
        increased = dict(payload)
        decreased = dict(payload)
        increased[payload_key] = current_value * 1.1
        decreased[payload_key] = max(current_value * 0.9, 0.0) if current_value >= 0 else current_value - step

        increased_score = predict_fn(increased)
        decreased_score = predict_fn(decreased)
        sensitivity[property_name] = float(((increased_score - baseline_score) + (baseline_score - decreased_score)) / 2.0)
    return sensitivity


def summarize_sensitivity(sensitivity_map: dict[str, float], limit: int = 3) -> list[dict[str, float | str]]:
    ranked = sorted(
        sensitivity_map.items(),
        key=lambda item: abs(item[1]),
        reverse=True,
    )[:limit]
    return [
        {
            "property": property_name,
            "impact": float(impact),
            "direction": "increase_dfrs" if impact >= 0 else "decrease_dfrs",
        }
        for property_name, impact in ranked
    ]
