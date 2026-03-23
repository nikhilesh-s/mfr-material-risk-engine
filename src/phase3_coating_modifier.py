"""Phase 3 standalone coating modifier prototype scoring."""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from .utils import repo_path

INPUT_PATH = repo_path("data", "coatings", "v0.3", "coatings_dataset.csv")

COATING_DESCRIPTOR_COLUMNS = [
    "Melting_Point_C",
    "Thermal_Conductivity_W_mK",
    "Emissivity_Total",
    "Hardness_Vickers",
]

POSITIVE_COLUMNS = {
    "Melting_Point_C",
    "Emissivity_Total",
    "Hardness_Vickers",
}

REVERSED_COLUMNS = {
    "Thermal_Conductivity_W_mK",
}

_CACHE: dict[str, Any] = {}


def min_max_scale(series: pd.Series) -> pd.Series:
    """Scale values to [0, 1], preserving NaNs."""
    min_value = float(series.min())
    max_value = float(series.max())
    scaled = pd.Series(np.nan, index=series.index, dtype=float)
    valid = series.notna()
    if not valid.any():
        return scaled
    if np.isclose(max_value, min_value):
        scaled.loc[valid] = 0.0
        return scaled
    scaled.loc[valid] = (series.loc[valid] - min_value) / (max_value - min_value)
    return scaled


def _load_coatings_df() -> pd.DataFrame:
    if not INPUT_PATH.exists():
        raise FileNotFoundError(f"Missing input dataset: {INPUT_PATH}")

    df = pd.read_csv(INPUT_PATH, low_memory=False)
    missing_cols = [c for c in COATING_DESCRIPTOR_COLUMNS if c not in df.columns]
    if missing_cols:
        raise ValueError(
            "Missing required coating descriptor columns: " + ", ".join(missing_cols)
        )

    work_df = df.copy()
    for col in COATING_DESCRIPTOR_COLUMNS:
        work_df[col] = pd.to_numeric(work_df[col], errors="coerce")
    return work_df


def get_coating_modifier_table() -> pd.DataFrame:
    """Return coating table with normalized/oriented columns and modifier fields."""
    if "coatings_table" in _CACHE:
        return _CACHE["coatings_table"].copy()

    work_df = _load_coatings_df()
    normalized: dict[str, pd.Series] = {}
    oriented: dict[str, pd.Series] = {}
    for col in COATING_DESCRIPTOR_COLUMNS:
        normalized[col] = min_max_scale(work_df[col])
        if col in REVERSED_COLUMNS:
            oriented[col] = 1.0 - normalized[col]
        else:
            oriented[col] = normalized[col]

    oriented_df = pd.DataFrame(oriented, index=work_df.index)
    work_df["Coating_Modifier_Index"] = oriented_df.mean(axis=1, skipna=True)
    work_df["Coating_Modifier"] = (work_df["Coating_Modifier_Index"] - 0.5) * 0.4
    work_df["descriptor_count_used"] = oriented_df.notna().sum(axis=1)

    _CACHE["coatings_table"] = work_df
    _CACHE["normalized"] = normalized
    _CACHE["oriented"] = oriented
    return work_df.copy()


def get_coating_modifier(coating_code: str) -> dict[str, float | str]:
    """Lookup and return coating modifier information for a coating code."""
    coatings = get_coating_modifier_table()
    if "Coating_Code" not in coatings.columns:
        raise ValueError("Coating_Code column missing from coatings dataset.")

    match = coatings[coatings["Coating_Code"] == coating_code]
    if match.empty:
        raise KeyError(f"Coating code not found: {coating_code}")

    row = match.iloc[0]
    return {
        "coating_code": str(row["Coating_Code"]),
        "coating_modifier_index": float(row["Coating_Modifier_Index"]),
        "coating_modifier": float(row["Coating_Modifier"]),
        "descriptor_count_used": int(row["descriptor_count_used"]),
    }


def main() -> None:
    work_df = get_coating_modifier_table()
    modifier_series = work_df["Coating_Modifier"].dropna()
    if modifier_series.empty:
        raise ValueError("Unable to compute Coating_Modifier; all rows are NaN.")

    normalized = _CACHE["normalized"]
    oriented = _CACHE["oriented"]

    # Choose an example row with the highest descriptor availability.
    example_idx = (
        work_df["descriptor_count_used"]
        .sort_values(ascending=False)
        .index[0]
    )
    example = work_df.loc[example_idx]

    print("=== PHASE 3 COATING MODIFIER REPORT ===")
    print(f"Dataset path used: {INPUT_PATH}")
    print("Modifier distribution:")
    print(f"  - min: {float(modifier_series.min()):.6f}")
    print(f"  - max: {float(modifier_series.max()):.6f}")
    print(f"  - mean: {float(modifier_series.mean()):.6f}")
    print(f"  - std: {float(modifier_series.std(ddof=0)):.6f}")
    print("Example coating calculation:")
    if "Coating_Code" in work_df.columns:
        print(f"  - Coating_Code: {example['Coating_Code']}")
    print(
        f"  - descriptors used: {int(example['descriptor_count_used'])}/"
        f"{len(COATING_DESCRIPTOR_COLUMNS)}"
    )
    for col in COATING_DESCRIPTOR_COLUMNS:
        raw_val = example[col]
        norm_val = normalized[col].loc[example_idx]
        orient_val = oriented[col].loc[example_idx]
        print(
            f"  - {col}: raw={raw_val if pd.notna(raw_val) else 'NaN'}, "
            f"normalized={float(norm_val) if pd.notna(norm_val) else 'NaN'}, "
            f"oriented={float(orient_val) if pd.notna(orient_val) else 'NaN'}"
        )
    print(f"  - Coating_Modifier_Index: {float(example['Coating_Modifier_Index']):.6f}")
    print(f"  - Coating_Modifier: {float(example['Coating_Modifier']):.6f}")
    print(f"Timestamp: {datetime.now(timezone.utc).isoformat()}")


if __name__ == "__main__":
    main()
