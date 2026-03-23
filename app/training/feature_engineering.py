"""Shared feature engineering for training and inference."""

from __future__ import annotations

from typing import Iterable

import numpy as np
import pandas as pd

STANDARD_FEATURE_COLUMNS = [
    "density",
    "melting_point",
    "thermal_conductivity",
    "specific_heat",
    "decomposition_temp",
    "glass_transition_temp",
]

DERIVED_FEATURE_COLUMNS = [
    "thermal_resistance_index",
    "heat_capacity_density",
    "decomposition_margin",
    "conductivity_density_ratio",
]

ALL_FEATURE_COLUMNS = STANDARD_FEATURE_COLUMNS + DERIVED_FEATURE_COLUMNS


def _safe_divide(left: pd.Series, right: pd.Series) -> pd.Series:
    denominator = right.replace({0: np.nan})
    return left / denominator


def add_derived_features(frame: pd.DataFrame) -> pd.DataFrame:
    engineered = frame.copy()
    for column in STANDARD_FEATURE_COLUMNS:
        if column not in engineered.columns:
            engineered[column] = np.nan
        engineered[column] = pd.to_numeric(engineered[column], errors="coerce")

    engineered["thermal_resistance_index"] = _safe_divide(
        engineered["melting_point"],
        engineered["thermal_conductivity"],
    )
    engineered["heat_capacity_density"] = (
        engineered["density"] * engineered["specific_heat"]
    )
    engineered["decomposition_margin"] = (
        engineered["decomposition_temp"] - engineered["glass_transition_temp"]
    )
    engineered["conductivity_density_ratio"] = _safe_divide(
        engineered["thermal_conductivity"],
        engineered["density"],
    )
    return engineered


def build_feature_frame(frame: pd.DataFrame, feature_columns: Iterable[str] | None = None) -> pd.DataFrame:
    engineered = add_derived_features(frame)
    ordered_columns = list(feature_columns) if feature_columns is not None else list(ALL_FEATURE_COLUMNS)
    for column in ordered_columns:
        if column not in engineered.columns:
            engineered[column] = np.nan
    return engineered[ordered_columns].copy()
