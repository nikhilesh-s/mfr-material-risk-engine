"""Composite DFRS scoring utilities."""

from __future__ import annotations

from typing import Any

import numpy as np

DISPLAY_TO_STANDARD = {
    "Density (g/cc)": "density",
    "Melting Point (°C)": "melting_point",
    "Thermal Cond. (W/m-K)": "thermal_conductivity",
    "Specific Heat (J/g-°C)": "specific_heat",
    "Decomp. Temp (°C)": "decomposition_temp",
    "Autoignition Temp (°C)": "autoignition_temp",
    "Flash Point (°C)": "flash_point",
    "Heat of Combustion (MJ/kg)": "heat_of_combustion",
    "Limiting Oxygen Index (%)": "limiting_oxygen_index",
    "Smoke Density (Ds)": "smoke_density",
    "Char Yield (%)": "char_yield",
    "Flame Spread Index": "flame_spread_index",
    "Glass Transition Temp (°C)": "glass_transition_temp",
}


def _get_numeric(payload: dict[str, Any], *keys: str) -> float | None:
    for key in keys:
        value = payload.get(key)
        try:
            if value is None:
                continue
            if isinstance(value, str) and not value.strip():
                continue
            numeric = float(value)
        except (TypeError, ValueError):
            continue
        if np.isnan(numeric):
            continue
        return numeric
    return None


def _normalize(value: float | None, low: float, high: float, invert: bool = False) -> float:
    if value is None:
        return 0.5
    if np.isclose(high, low):
        normalized = 0.5
    else:
        normalized = (float(value) - low) / (high - low)
    normalized = float(np.clip(normalized, 0.0, 1.0))
    return float(1.0 - normalized) if invert else normalized


def compute_subscores(payload: dict[str, Any], model_score: float) -> dict[str, float]:
    melting_point = _get_numeric(payload, "melting_point", "Melting Point (°C)")
    autoignition_temp = _get_numeric(payload, "autoignition_temp", "Autoignition Temp (°C)")
    flash_point = _get_numeric(payload, "flash_point", "Flash Point (°C)")
    decomposition_temp = _get_numeric(payload, "decomposition_temp", "Decomp. Temp (°C)")
    glass_transition_temp = _get_numeric(payload, "glass_transition_temp", "Glass Transition Temp (°C)")
    specific_heat = _get_numeric(payload, "specific_heat", "Specific Heat (J/g-°C)")
    density = _get_numeric(payload, "density", "Density (g/cc)")
    char_yield = _get_numeric(payload, "char_yield", "Char Yield (%)")
    thermal_conductivity = _get_numeric(payload, "thermal_conductivity", "Thermal Cond. (W/m-K)")
    heat_of_combustion = _get_numeric(payload, "heat_of_combustion", "Heat of Combustion (MJ/kg)")
    flame_spread = _get_numeric(payload, "flame_spread_index", "Flame Spread Index")
    smoke_density = _get_numeric(payload, "smoke_density", "Smoke Density (Ds)")
    oxygen_index = _get_numeric(payload, "limiting_oxygen_index", "Limiting Oxygen Index (%)")

    ignition_resistance = float(np.mean([
        _normalize(melting_point, 100.0, 2200.0),
        _normalize(autoignition_temp, 200.0, 900.0),
        _normalize(flash_point, 100.0, 800.0),
        _normalize(oxygen_index, 10.0, 100.0),
    ]))
    thermal_persistence = float(np.mean([
        _normalize(decomposition_temp, 150.0, 2200.0),
        _normalize(specific_heat, 0.2, 2.0),
        _normalize(density, 0.2, 5.0),
        _normalize(char_yield, 0.0, 80.0),
    ]))
    decomposition_margin_raw = None
    if decomposition_temp is not None and glass_transition_temp is not None:
        decomposition_margin_raw = decomposition_temp - glass_transition_temp
    decomposition_margin = _normalize(decomposition_margin_raw, 20.0, 1500.0)
    heat_propagation_risk = float(np.mean([
        _normalize(thermal_conductivity, 0.01, 35.0, invert=True),
        _normalize(heat_of_combustion, 0.0, 40.0, invert=True),
        _normalize(flame_spread, 0.0, 100.0, invert=True),
        _normalize(smoke_density, 0.0, 500.0, invert=True),
    ]))

    dfrs = float(np.clip(
        0.45 * float(np.clip(model_score, 0.0, 1.0))
        + 0.2 * ignition_resistance
        + 0.2 * thermal_persistence
        + 0.1 * decomposition_margin
        + 0.05 * heat_propagation_risk,
        0.0,
        1.0,
    ))

    return {
        "DFRS": dfrs,
        "ignition_resistance": ignition_resistance,
        "thermal_persistence": thermal_persistence,
        "decomposition_margin": decomposition_margin,
        "heat_propagation_risk": heat_propagation_risk,
    }
