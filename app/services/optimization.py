"""Lightweight property optimization heuristics for Dravix descriptor inputs."""

from __future__ import annotations

from typing import Any, Callable

import numpy as np

DISPLAY_TO_TARGET = {
    "Density (g/cc)": "density",
    "Melting Point (°C)": "melting_point",
    "Specific Heat (J/g-°C)": "specific_heat",
    "Thermal Cond. (W/m-K)": "thermal_conductivity",
    "Flash Point (°C)": "flash_point",
    "Autoignition Temp (°C)": "autoignition_temp",
    "Limiting Oxygen Index (%)": "limiting_oxygen_index",
    "Char Yield (%)": "char_yield",
    "Decomp. Temp (°C)": "decomposition_temp",
    "Flame Spread Index": "flame_spread_index",
}

POSITIVE_DIRECTION_FEATURES = {
    "Density (g/cc)",
    "Melting Point (°C)",
    "Specific Heat (J/g-°C)",
    "Flash Point (°C)",
    "Autoignition Temp (°C)",
    "Limiting Oxygen Index (%)",
    "Char Yield (%)",
    "Decomp. Temp (°C)",
}

NEGATIVE_DIRECTION_FEATURES = {
    "Thermal Cond. (W/m-K)",
    "Flame Spread Index",
}


def _numeric_value(payload: dict[str, Any], feature_name: str) -> float | None:
    value = payload.get(feature_name)
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _candidate_values(current: float, direction: int) -> list[float]:
    step = max(abs(current) * 0.05, 0.05)
    return [
        current + direction * step,
        current + direction * step * 2.0,
    ]


def _range_string(value: float) -> str:
    lower = value * 0.95
    upper = value * 1.05
    return f"{lower:.3f}-{upper:.3f}"


def optimize_material_properties(
    payload_data: dict[str, Any],
    *,
    predict_fn: Callable[[dict[str, Any]], float],
) -> dict[str, Any]:
    """Estimate property target ranges with a deterministic local search."""
    baseline_score = float(predict_fn(payload_data))
    best_score = baseline_score
    best_payload = dict(payload_data)
    improvements: list[dict[str, Any]] = []

    for feature_name, target_name in DISPLAY_TO_TARGET.items():
        current = _numeric_value(payload_data, feature_name)
        if current is None or np.isnan(current):
            continue

        directions: list[int] = []
        if feature_name in POSITIVE_DIRECTION_FEATURES:
            directions.append(1)
        if feature_name in NEGATIVE_DIRECTION_FEATURES:
            directions.append(-1)
        if not directions:
            directions.extend([-1, 1])

        best_local_score = baseline_score
        best_local_value = current
        for direction in directions:
            for candidate in _candidate_values(current, direction):
                candidate_payload = dict(payload_data)
                candidate_payload[feature_name] = float(max(candidate, 0.0))
                candidate_score = float(predict_fn(candidate_payload))
                if candidate_score > best_local_score:
                    best_local_score = candidate_score
                    best_local_value = float(max(candidate, 0.0))

        if best_local_score > baseline_score:
            improvements.append(
                {
                    "feature_name": feature_name,
                    "target_name": target_name,
                    "best_value": best_local_value,
                    "score_gain": best_local_score - baseline_score,
                }
            )

    improvements.sort(key=lambda item: item["score_gain"], reverse=True)
    property_targets = {
        item["target_name"]: _range_string(float(item["best_value"]))
        for item in improvements[:3]
    }

    for item in improvements[:3]:
        best_payload[item["feature_name"]] = float(item["best_value"])
    if property_targets:
        best_score = float(predict_fn(best_payload))

    return {
        "baseline_score": float(round(baseline_score, 6)),
        "optimized_score_estimate": float(round(best_score, 6)),
        "property_targets": property_targets,
    }
