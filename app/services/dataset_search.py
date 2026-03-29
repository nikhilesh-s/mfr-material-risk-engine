"""In-memory dataset search helpers for lightweight exploration endpoints."""

from __future__ import annotations

from typing import Any

import pandas as pd

from backend.core.dataset_loader import load_datasets


def _material_name_column(frame: pd.DataFrame) -> str:
    for column in ("Material Name", "material_name", "Material"):
        if column in frame.columns:
            return column
    raise ValueError("Dataset is missing a material name column.")


def _to_serializable_records(frame: pd.DataFrame) -> list[dict[str, Any]]:
    cleaned = frame.where(pd.notna(frame), None)
    return cleaned.to_dict(orient="records")


def search_dataset_materials(
    *,
    material_name: str | None = None,
    density_min: float | None = None,
    density_max: float | None = None,
    melting_point_min: float | None = None,
    melting_point_max: float | None = None,
) -> dict[str, Any]:
    """Filter the loaded material dataset with simple numeric and name bounds."""
    material_dataset, _ = load_datasets()
    frame = material_dataset.copy()
    name_column = _material_name_column(frame)

    if material_name:
        needle = material_name.strip().lower()
        frame = frame[frame[name_column].astype(str).str.lower().str.contains(needle, na=False)]

    if "Density (g/cc)" in frame.columns:
        density_series = pd.to_numeric(frame["Density (g/cc)"], errors="coerce")
        if density_min is not None:
            frame = frame[density_series >= float(density_min)]
        if density_max is not None:
            frame = frame[density_series <= float(density_max)]

    if "Melting Point (°C)" in frame.columns:
        melting_series = pd.to_numeric(frame["Melting Point (°C)"], errors="coerce")
        if melting_point_min is not None:
            frame = frame[melting_series >= float(melting_point_min)]
        if melting_point_max is not None:
            frame = frame[melting_series <= float(melting_point_max)]

    results = _to_serializable_records(frame.reset_index(drop=True))
    return {
        "results": results,
        "count": int(len(results)),
    }
