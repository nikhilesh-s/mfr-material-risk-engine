"""Phase 3 experimental inference wrapper (no API integration)."""

from __future__ import annotations

import pickle
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from src.model import DATASET_VERSION

MODEL_PATH = Path("models/model_v0.3-alpha.pkl")
BOUNDS_SOURCE_PATH = Path("data/phase3_model/materials_phase3_ready.csv")
MODEL_VERSION = DATASET_VERSION

COMBUSTION_COLUMNS = [
    "Melting Point (°C)",
    "Flash Point (°C)",
    "Autoignition Temp (°C)",
    "Decomp. Temp (°C)",
    "Heat of Combustion (MJ/kg)",
    "Limiting Oxygen Index (%)",
    "Char Yield (%)",
    "Flame Spread Index",
    "Smoke Density (Ds)",
]

RESISTANCE_POSITIVE_COLUMNS = {
    "Melting Point (°C)",
    "Flash Point (°C)",
    "Autoignition Temp (°C)",
    "Decomp. Temp (°C)",
    "Limiting Oxygen Index (%)",
    "Char Yield (%)",
}

RESISTANCE_NEGATIVE_COLUMNS = {
    "Heat of Combustion (MJ/kg)",
    "Flame Spread Index",
    "Smoke Density (Ds)",
}

_CACHE: dict[str, Any] = {}


def _as_float(value: Any) -> float:
    try:
        if value is None:
            return float("nan")
        return float(value)
    except (TypeError, ValueError):
        return float("nan")


def _min_max_scale(value: float, min_value: float, max_value: float) -> float:
    if np.isnan(value):
        return float("nan")
    if np.isclose(max_value, min_value):
        return 0.0
    return float((value - min_value) / (max_value - min_value))


def _load_model():
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Missing model artifact: {MODEL_PATH}")
    with MODEL_PATH.open("rb") as fh:
        model = pickle.load(fh)
    if not hasattr(model, "predict"):
        raise TypeError("Loaded artifact does not implement predict().")
    if not hasattr(model, "feature_names_in_"):
        raise ValueError("Loaded model is missing feature_names_in_.")
    return model


def _load_bounds() -> dict[str, dict[str, float]]:
    if not BOUNDS_SOURCE_PATH.exists():
        raise FileNotFoundError(f"Missing bounds source dataset: {BOUNDS_SOURCE_PATH}")

    df = pd.read_csv(BOUNDS_SOURCE_PATH, low_memory=False)
    missing_cols = [c for c in COMBUSTION_COLUMNS if c not in df.columns]
    if missing_cols:
        raise ValueError(
            "Bounds source is missing combustion columns: " + ", ".join(missing_cols)
        )

    bounds: dict[str, dict[str, float]] = {}
    for col in COMBUSTION_COLUMNS:
        numeric_series = pd.to_numeric(df[col], errors="coerce")
        if numeric_series.notna().sum() == 0:
            raise ValueError(f"Cannot compute bounds for {col}: all values are missing.")
        bounds[col] = {
            "min": float(numeric_series.min()),
            "max": float(numeric_series.max()),
        }
    return bounds


def _get_runtime_state() -> dict[str, Any]:
    if _CACHE:
        return _CACHE

    model = _load_model()
    feature_names = list(model.feature_names_in_)
    bounds = _load_bounds()

    feature_importances: list[dict[str, float]] = []
    if hasattr(model, "named_steps") and "model" in model.named_steps:
        estimator = model.named_steps["model"]
        if hasattr(estimator, "feature_importances_"):
            importances = pd.Series(estimator.feature_importances_, index=feature_names)
            top_5 = importances.sort_values(ascending=False).head(5)
            feature_importances = [
                {"feature": feature, "importance": float(score)}
                for feature, score in top_5.items()
            ]

    _CACHE.update(
        {
            "model": model,
            "feature_names": feature_names,
            "bounds": bounds,
            "top_feature_importances": feature_importances,
        }
    )
    return _CACHE


def get_runtime_state() -> dict[str, Any]:
    """Public accessor for shared runtime state (model, bounds, feature names)."""
    return _get_runtime_state()


def build_feature_vector(input_dict: dict[str, Any]) -> pd.DataFrame:
    """Construct a model-aligned one-row feature vector from raw descriptor input."""
    state = _get_runtime_state()
    feature_names = state["feature_names"]
    bounds = state["bounds"]

    row: dict[str, float] = {}
    for feature in feature_names:
        raw_value = _as_float(input_dict.get(feature))

        if feature in COMBUSTION_COLUMNS:
            feature_bounds = bounds[feature]
            normalized = _min_max_scale(
                raw_value,
                feature_bounds["min"],
                feature_bounds["max"],
            )
            if feature in RESISTANCE_NEGATIVE_COLUMNS and not np.isnan(normalized):
                oriented = float(1.0 - normalized)
            else:
                oriented = normalized
            row[feature] = oriented
        else:
            row[feature] = raw_value

    return pd.DataFrame([row], columns=feature_names)


def predict_material_resistance(input_dict: dict[str, Any]) -> dict[str, Any]:
    """Predict Phase 3 resistance target from descriptor inputs."""
    state = _get_runtime_state()
    model = state["model"]
    feature_vector = build_feature_vector(input_dict)
    prediction = float(model.predict(feature_vector)[0])
    return {
        "resistance_score": prediction,
        "top_feature_importances": state["top_feature_importances"],
        "model_version": MODEL_VERSION,
    }


def _build_example_input(feature_names: list[str]) -> dict[str, Any]:
    df = pd.read_csv(BOUNDS_SOURCE_PATH, low_memory=False)
    example: dict[str, Any] = {}
    for feature in feature_names:
        if feature in df.columns:
            values = pd.to_numeric(df[feature], errors="coerce")
            example[feature] = float(values.median()) if values.notna().any() else np.nan
    return example


def main() -> None:
    state = _get_runtime_state()
    example_input = _build_example_input(state["feature_names"])
    example_prediction = predict_material_resistance(example_input)

    print("=== PHASE 3 DOCUMENTATION FLAG ===")
    print(f"Model loaded: {MODEL_PATH}")
    print(f"Feature count: {len(state['feature_names'])}")
    print(f"Normalization bounds source: {BOUNDS_SOURCE_PATH}")
    print("Example prediction:")
    print(example_prediction)
    print(f"Timestamp: {datetime.now(timezone.utc).isoformat()}")


if __name__ == "__main__":
    main()
