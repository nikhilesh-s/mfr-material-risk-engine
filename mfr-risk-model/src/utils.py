"""Dataset loading and cleanup helpers for the MFR risk model."""

from __future__ import annotations

from pathlib import Path
from typing import Dict, List, Tuple

import pandas as pd


TEXT_HEAVY_COLUMNS = ["PRE TEST CMT", "POST TEST CMT", "POST TEST CMT.1"]
DROP_COLUMNS = ["Unnamed: 24"]
META_COLUMNS = ["Source_File", "LABORATORY", "TEST IDENT", "OPERATOR"]


def map_material_type(material_text: str) -> str:
    """Map raw material text to a coarse material_type label."""
    if not isinstance(material_text, str):
        return "generic"

    text = material_text.lower()
    polymer_keywords = [
        "poly",
        "plastic",
        "nylon",
        "pvc",
        "pe ",
        "pp ",
        "pet",
        "epoxy",
        "resin",
        "vinyl",
        "rubber",
    ]
    composite_keywords = [
        "composite",
        "fiber",
        "fiberglass",
        "carbon",
        "laminate",
        "ply",
    ]

    if any(keyword in text for keyword in composite_keywords):
        return "composite"
    if any(keyword in text for keyword in polymer_keywords):
        return "polymer"
    return "generic"


def normalize_numeric(df: pd.DataFrame, columns: List[str]) -> pd.DataFrame:
    """Return a copy with selected numeric columns min-max scaled to 0-1."""
    normalized = df.copy()
    for col in columns:
        series = normalized[col]
        col_min = series.min()
        col_max = series.max()
        if pd.isna(col_min) or pd.isna(col_max) or col_min == col_max:
            normalized[col] = 0.0
        else:
            normalized[col] = (series - col_min) / (col_max - col_min)
    return normalized


def compute_proxy_risk_score(df: pd.DataFrame) -> pd.Series:
    """Compute a proxy fire risk score from normalized, weighted features."""
    required = [
        "HEAT FLUX",
        "TIME TO IGN",
        "SURF AREA",
        "FLOW FACTOR",
        "SPECIMEN MASS",
        "C FACTOR",
    ]
    missing = [col for col in required if col not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns for risk score: {missing}")

    # Assumption: risk increases with higher heat flux, surface area, flow, and C factor.
    # Assumption: faster ignition and lower specimen mass increase risk, so those are inverted.
    inputs = normalize_numeric(df, required)
    time_to_ign_inv = 1 - inputs["TIME TO IGN"]
    mass_inv = 1 - inputs["SPECIMEN MASS"]

    score = (
        0.35 * inputs["HEAT FLUX"]
        + 0.30 * time_to_ign_inv
        + 0.15 * inputs["SURF AREA"]
        + 0.10 * inputs["FLOW FACTOR"]
        + 0.05 * mass_inv
        + 0.05 * inputs["C FACTOR"]
    )

    return (score * 100).clip(0, 100)


def build_feature_groups(df: pd.DataFrame) -> Dict[str, List[str]]:
    """Group columns into material, thermal, and fire-related buckets."""
    thermal_columns = [
        "HEAT FLUX",
        "SCAN TIME",
        "O2 DELAY TIME",
        "CO DELAY TIME",
        "CO2 DELAY TIME",
        "TIME TO IGN",
        "END OF TEST TIME",
    ]
    fire_property_columns = [
        "SURF AREA",
        "C FACTOR",
        "SPEC HOLDER DIFF",
        "SPECIMEN MASS",
        "FLOW FACTOR",
        "SCAN COUNT",
        "END OF TEST SCAN",
        "TEST STATUS",
    ]

    return {
        "material_type": ["material_type"],
        "thermal": [col for col in thermal_columns if col in df.columns],
        "fire_properties": [col for col in fire_property_columns if col in df.columns],
    }


def clean_fire_properties(
    df: pd.DataFrame,
) -> Tuple[pd.DataFrame, Dict[str, List[str]]]:
    """Return a cleaned, encoded, and normalized dataframe plus feature groups."""
    cleaned = df.drop(columns=DROP_COLUMNS, errors="ignore")
    cleaned = cleaned.drop(columns=TEXT_HEAVY_COLUMNS, errors="ignore")
    cleaned = cleaned.drop(columns=META_COLUMNS, errors="ignore")

    cleaned["material_type"] = cleaned["MATERIAL"].map(map_material_type)

    cleaned["risk_score"] = compute_proxy_risk_score(cleaned)

    numeric_cols = cleaned.select_dtypes(include=["number"]).columns.tolist()
    if "risk_score" in numeric_cols:
        numeric_cols.remove("risk_score")
    categorical_cols = [
        col for col in cleaned.select_dtypes(include=["object"]).columns if col != "MATERIAL"
    ]

    # Assumption: missing numeric values are filled with the median for stability.
    for col in numeric_cols:
        cleaned[col] = cleaned[col].fillna(cleaned[col].median())

    # Assumption: missing categorical values are labeled "unknown".
    for col in categorical_cols:
        cleaned[col] = cleaned[col].fillna("unknown")

    feature_groups = build_feature_groups(cleaned)

    encoded = pd.get_dummies(cleaned.drop(columns=["MATERIAL"], errors="ignore"), drop_first=True)
    encoded = normalize_numeric(encoded, numeric_cols)

    return encoded, feature_groups


def load_and_clean_fire_properties(path: Path) -> Tuple[pd.DataFrame, Dict[str, List[str]]]:
    """Load the raw CSV and return a cleaned dataframe ready for modeling."""
    df = pd.read_csv(path)
    return clean_fire_properties(df)
