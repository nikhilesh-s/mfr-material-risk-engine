"""Shared normalized material-input helpers."""

from __future__ import annotations

from typing import Any

from src.api_contract import Phase3Input

DISPLAY_FIELD_MAP = {
    "Density_g_cc": "Density (g/cc)",
    "Melting_Point_C": "Melting Point (°C)",
    "Specific_Heat_J_g_C": "Specific Heat (J/g-°C)",
    "Thermal_Cond_W_mK": "Thermal Cond. (W/m-K)",
    "CTE_um_m_C": "CTE (µm/m-°C)",
    "Flash_Point_C": "Flash Point (°C)",
    "Autoignition_Temp_C": "Autoignition Temp (°C)",
    "UL94_Flammability": "UL94 Flammability",
    "Limiting_Oxygen_Index_pct": "Limiting Oxygen Index (%)",
    "Smoke_Density_Ds": "Smoke Density (Ds)",
    "Char_Yield_pct": "Char Yield (%)",
    "Decomp_Temp_C": "Decomp. Temp (°C)",
    "Heat_of_Combustion_MJ_kg": "Heat of Combustion (MJ/kg)",
    "Flame_Spread_Index": "Flame Spread Index",
}

NUMERIC_INPUT_FIELDS = list(DISPLAY_FIELD_MAP.keys())


def raw_phase3_payload(payload: Phase3Input) -> dict[str, Any]:
    if hasattr(payload, "model_dump"):
        return dict(payload.model_dump(exclude_none=True, by_alias=False))
    return dict(payload.dict(exclude_none=True))


def has_custom_descriptors(payload: Phase3Input) -> bool:
    raw_payload = raw_phase3_payload(payload)
    return any(raw_payload.get(field_name) is not None for field_name in NUMERIC_INPUT_FIELDS)


def normalize_material_payload(
    payload: Phase3Input,
    *,
    fallback_material_name: str | None = None,
) -> dict[str, Any]:
    raw_payload = raw_phase3_payload(payload)
    normalized = {
        display_name: raw_payload[field_name]
        for field_name, display_name in DISPLAY_FIELD_MAP.items()
        if raw_payload.get(field_name) is not None
    }
    material_name = raw_payload.get("material_name") or fallback_material_name
    if material_name:
        normalized["Material Name"] = str(material_name)
        normalized["Material"] = str(material_name)
    return normalized
