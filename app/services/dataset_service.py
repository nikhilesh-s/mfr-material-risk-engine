"""Dataset ingestion service for training workflows."""

from __future__ import annotations

from io import BytesIO, StringIO
from pathlib import Path
from typing import Any

import pandas as pd

from app.core.logging import get_logger
from app.db.supabase_client import get_supabase

logger = get_logger("uvicorn.error")

REQUIRED_DATASET_COLUMNS = [
    "material_name",
    "density",
    "melting_point",
    "thermal_conductivity",
    "specific_heat",
    "decomposition_temp",
    "glass_transition_temp",
]

_COLUMN_ALIASES = {
    "material": "material_name",
    "material name": "material_name",
    "density (g/cc)": "density",
    "density_g_cc": "density",
    "melting point (°c)": "melting_point",
    "melting_point_c": "melting_point",
    "thermal cond. (w/m-k)": "thermal_conductivity",
    "thermal_cond_w_mk": "thermal_conductivity",
    "specific heat (j/g-°c)": "specific_heat",
    "specific_heat_j_g_c": "specific_heat",
    "decomp. temp (°c)": "decomposition_temp",
    "decomp_temp_c": "decomposition_temp",
    "decomposition_temp_c": "decomposition_temp",
    "glass transition temp (°c)": "glass_transition_temp",
    "glass_transition_temp_c": "glass_transition_temp",
}


def _normalize_column_name(name: str) -> str:
    cleaned = str(name).strip()
    lowered = cleaned.lower()
    return _COLUMN_ALIASES.get(lowered, lowered.replace(" ", "_"))


def _read_csv_input(csv_input: str | bytes | Path) -> pd.DataFrame:
    if isinstance(csv_input, Path):
        return pd.read_csv(csv_input)
    if isinstance(csv_input, bytes):
        return pd.read_csv(BytesIO(csv_input))
    path = Path(csv_input)
    if path.exists():
        return pd.read_csv(path)
    return pd.read_csv(StringIO(csv_input))


def _normalize_units(frame: pd.DataFrame) -> pd.DataFrame:
    normalized = frame.copy()
    for column in REQUIRED_DATASET_COLUMNS:
        if column == "material_name":
            normalized[column] = normalized[column].astype(str).str.strip()
            continue
        normalized[column] = pd.to_numeric(normalized[column], errors="coerce")
    return normalized


def validate_dataset_schema(frame: pd.DataFrame) -> None:
    missing = [column for column in REQUIRED_DATASET_COLUMNS if column not in frame.columns]
    if missing:
        raise ValueError(
            "Dataset is missing required columns: " + ", ".join(missing)
        )


def clean_dataset_frame(frame: pd.DataFrame) -> pd.DataFrame:
    renamed = frame.rename(columns={column: _normalize_column_name(column) for column in frame.columns})
    validate_dataset_schema(renamed)
    normalized = _normalize_units(renamed[REQUIRED_DATASET_COLUMNS].copy())
    normalized = normalized.dropna(subset=["material_name"])
    normalized = normalized.drop_duplicates(subset=["material_name"], keep="first")
    return normalized.reset_index(drop=True)


def store_dataset_materials(frame: pd.DataFrame) -> None:
    try:
        supabase = get_supabase()
        payload = frame.to_dict(orient="records")
        if payload:
            supabase.table("dataset_materials").insert(payload).execute()
    except Exception as exc:
        logger.warning("Dataset material persistence skipped: %s", exc)


def upload_csv(csv_input: str | bytes | Path) -> pd.DataFrame:
    """Validate, normalize, persist, and return a training-ready dataframe."""
    raw_frame = _read_csv_input(csv_input)
    cleaned_frame = clean_dataset_frame(raw_frame)
    store_dataset_materials(cleaned_frame)
    return cleaned_frame
