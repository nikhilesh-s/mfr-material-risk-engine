"""Dataset loading for Dravix training pipelines."""

from __future__ import annotations

import re
from pathlib import Path

import pandas as pd

from app.services.dataset_service import clean_dataset_frame
from src.utils import repo_path

TARGET_COLUMN = "Base_Resistance_Target"

_NORMALIZED_SOURCE_COLUMNS = {
    "Material Name": "material_name",
    "Material": "material_name",
    "Density (g/cc)": "density",
    "Melting Point (°C)": "melting_point",
    "Thermal Cond. (W/m-K)": "thermal_conductivity",
    "Specific Heat (J/g-°C)": "specific_heat",
    "Decomp. Temp (°C)": "decomposition_temp",
    "Glass Transition Temp (°C)": "glass_transition_temp",
}


def _normalize_material_name(value: object) -> str:
    text = str(value).strip().lower()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _standardize_training_frame(frame: pd.DataFrame) -> pd.DataFrame:
    renamed = frame.rename(
        columns={source: target for source, target in _NORMALIZED_SOURCE_COLUMNS.items() if source in frame.columns}
    )
    if "glass_transition_temp" not in renamed.columns:
        renamed["glass_transition_temp"] = pd.NA
    return clean_dataset_frame(renamed)


def _load_legacy_targets(path: Path) -> pd.DataFrame:
    legacy_df = pd.read_csv(path, low_memory=False)
    if "Material Name" not in legacy_df.columns or TARGET_COLUMN not in legacy_df.columns:
        raise ValueError(
            f"Legacy label source must contain 'Material Name' and '{TARGET_COLUMN}'."
        )

    return (
        legacy_df.assign(
            _material_key=legacy_df["Material Name"].map(_normalize_material_name),
            target_dfrs=pd.to_numeric(legacy_df[TARGET_COLUMN], errors="coerce"),
        )[["_material_key", "target_dfrs"]]
        .dropna(subset=["_material_key", "target_dfrs"])
        .drop_duplicates(subset=["_material_key"], keep="first")
    )


def load_training_dataset(
    materials_path: Path | None = None,
    legacy_target_path: Path | None = None,
) -> pd.DataFrame:
    source_path = materials_path or repo_path("data", "materials", "v0.3.1", "materials_dataset_clean.csv")
    target_source_path = legacy_target_path or repo_path("data", "materials", "v0.3", "materials_dataset.csv")

    source_df = pd.read_csv(source_path, low_memory=False)
    standardized = _standardize_training_frame(source_df)
    standardized["_material_key"] = standardized["material_name"].map(_normalize_material_name)
    targets = _load_legacy_targets(target_source_path)

    merged = standardized.merge(targets, on="_material_key", how="left")
    merged = merged.drop(columns=["_material_key"])
    merged["target_dfrs"] = pd.to_numeric(merged["target_dfrs"], errors="coerce")
    return merged
