"""Feature engineering helpers for the MFR risk model prototype."""

from __future__ import annotations

from typing import Dict, List

import pandas as pd

FEATURE_COLUMNS: List[str] = [
    "material_type",
    "temperature_c",
    "exposure_time_min",
    "environment_factor",
    "thermal_load",
    "severity_index",
]


def add_derived_features(df: pd.DataFrame) -> pd.DataFrame:
    """Return a copy of ``df`` with thermal load and severity features added."""
    engineered = df.copy()
    engineered["thermal_load"] = (
        engineered["temperature_c"] * engineered["exposure_time_min"]
    )
    engineered["severity_index"] = (
        engineered["thermal_load"] * engineered["environment_factor"]
    )
    return engineered


def prepare_feature_frame(record: Dict[str, float]) -> pd.DataFrame:
    """Create a single-row DataFrame ready for model inference."""
    base_frame = pd.DataFrame([record])
    engineered = add_derived_features(base_frame)
    return engineered[FEATURE_COLUMNS]
