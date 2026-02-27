"""Phase 3 model runtime helpers for v0.3-stable inference."""

from __future__ import annotations

import pickle
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from treeinterpreter import treeinterpreter as ti

from .utils import repo_path

PHASE3_REFERENCE_PATH = repo_path(
    "data",
    "phase3_model",
    "materials_phase3_with_target_v2.csv",
)
MATERIALS_LOOKUP_PATH = repo_path(
    "data",
    "phase3_model",
    "materials_phase3_ready.csv",
)

DATASET_VERSION = "v0.3-stable"
MODEL_VERSION = DATASET_VERSION
DATASET_BUILD_DATE = "2026-02-27"
DEFAULT_TARGET_COLUMN = "Base_Resistance_Target"

SUPPORTED_DATASET_VERSIONS = [
    "v0.3-stable",
]

MODEL_ARTIFACT_PATH = repo_path("models", "model_v0.3-stable.pkl")

material_lookup: dict[str, dict[str, Any]] = {}
material_display_names: dict[str, str] = {}
dataset_metadata: dict[str, Any] = {
    "version": DATASET_VERSION,
    "feature_count": 0,
    "target_column": DEFAULT_TARGET_COLUMN,
    "build_date": DATASET_BUILD_DATE,
    "confidence_thresholds": {
        "low": "variance > p75",
        "medium": "p25 <= variance <= p75",
        "high": "variance < p25",
        "mean": None,
        "std": None,
        "p25": None,
        "p50": None,
        "p75": None,
    },
}


def get_model_artifact_path(version: str) -> str:
    """Return versioned model artifact path for explicit phase tags."""
    return str(repo_path("models", f"model_{version}.pkl"))


def load_phase3_model(model_path: Path | None = None) -> Any:
    """Load the Phase 3 model artifact without retraining."""
    path = model_path or MODEL_ARTIFACT_PATH
    if not path.exists():
        raise FileNotFoundError(f"Missing model artifact: {path}")
    with path.open("rb") as fh:
        model = pickle.load(fh)
    if not hasattr(model, "predict"):
        raise TypeError("Loaded artifact does not implement predict().")
    if not hasattr(model, "feature_names_in_"):
        raise ValueError("Loaded model is missing feature_names_in_.")
    return model


def normalize_material_name(material_name: str) -> str:
    """Normalize incoming material names for deterministic lookup keys."""
    return material_name.strip().lower()


def _to_native_value(value: Any) -> Any:
    if pd.isna(value):
        return None
    if isinstance(value, (np.floating, np.integer)):
        return float(value)
    return value


def load_material_lookup(path: Path | None = None) -> dict[str, dict[str, Any]]:
    """Load and cache material descriptor lookup from Phase 3 materials dataset."""
    csv_path = path or MATERIALS_LOOKUP_PATH
    if not csv_path.exists():
        raise FileNotFoundError(f"Missing materials lookup dataset: {csv_path}")

    df = pd.read_csv(csv_path, low_memory=False)
    if "Material Name" not in df.columns:
        raise ValueError("materials lookup dataset must contain 'Material Name' column.")

    lookup: dict[str, dict[str, Any]] = {}
    display_names: dict[str, str] = {}
    for _, row in df.iterrows():
        raw_name = row.get("Material Name")
        if pd.isna(raw_name):
            continue

        normalized_name = normalize_material_name(str(raw_name))
        if not normalized_name:
            continue
        if normalized_name in lookup:
            # Keep first occurrence for deterministic behavior.
            continue

        row_dict = {column: _to_native_value(value) for column, value in row.items()}
        lookup[normalized_name] = row_dict
        display_names[normalized_name] = str(raw_name).strip()

    global material_lookup
    global material_display_names
    material_lookup = lookup
    material_display_names = display_names
    return material_lookup


def get_material_names() -> list[str]:
    """Return sorted material names available in the loaded lookup."""
    return sorted(material_display_names.values())


def get_material_descriptors(
    material_name: str,
    feature_names: list[str] | None = None,
) -> dict[str, Any] | None:
    """Return feature descriptor dict for a material name, if available."""
    normalized_name = normalize_material_name(material_name)
    row = material_lookup.get(normalized_name)
    if row is None:
        return None

    if feature_names is None:
        return dict(row)
    return {feature: row.get(feature) for feature in feature_names}


def inspect_model_schema(
    model: Any,
    reference_df: pd.DataFrame | None = None,
) -> dict[str, Any]:
    """Inspect model schema and return potential target candidates."""
    feature_names = list(model.feature_names_in_) if hasattr(model, "feature_names_in_") else []
    target_candidates: list[str] = []

    if reference_df is not None and not reference_df.empty:
        non_feature_numeric = [
            column
            for column in reference_df.select_dtypes(include=["number"]).columns
            if column not in set(feature_names)
        ]
        if non_feature_numeric:
            variances = reference_df[non_feature_numeric].var(ddof=0, numeric_only=True)
            target_candidates = (
                variances.sort_values(ascending=False)
                .index.astype(str)
                .tolist()
            )

    return {
        "features": feature_names,
        "feature_count": len(feature_names),
        "target_candidates": target_candidates,
    }


def initialize_dataset_metadata(
    model: Any,
    schema_info: dict[str, Any] | None = None,
    variance_stats: dict[str, float] | None = None,
) -> dict[str, Any]:
    """Initialize module-level dataset metadata from model/schema details."""
    schema = schema_info or inspect_model_schema(model)
    target_candidates = schema.get("target_candidates", [])
    if DEFAULT_TARGET_COLUMN in target_candidates:
        target_column = DEFAULT_TARGET_COLUMN
    elif target_candidates:
        target_column = str(target_candidates[0])
    else:
        target_column = DEFAULT_TARGET_COLUMN

    confidence_thresholds: dict[str, Any] = {
        "low": "variance > p75",
        "medium": "p25 <= variance <= p75",
        "high": "variance < p25",
        "mean": None,
        "std": None,
        "p25": None,
        "p50": None,
        "p75": None,
    }
    if variance_stats is not None:
        confidence_thresholds["mean"] = float(variance_stats["training_variance_mean"])
        confidence_thresholds["std"] = float(variance_stats["training_variance_std"])
        confidence_thresholds["p25"] = float(variance_stats["training_variance_p25"])
        confidence_thresholds["p50"] = float(variance_stats["training_variance_p50"])
        confidence_thresholds["p75"] = float(variance_stats["training_variance_p75"])

    global dataset_metadata
    dataset_metadata = {
        "version": DATASET_VERSION,
        "feature_count": int(schema.get("feature_count", 0)),
        "target_column": target_column,
        "build_date": DATASET_BUILD_DATE,
        "confidence_thresholds": confidence_thresholds,
    }
    return dataset_metadata


def _extract_estimator(model: Any) -> Any:
    if hasattr(model, "named_steps") and "model" in model.named_steps:
        estimator = model.named_steps["model"]
    else:
        estimator = model
    if not hasattr(estimator, "estimators_"):
        raise ValueError("Random-forest estimator with estimators_ is required.")
    return estimator


def _transform_features(model: Any, feature_frame: pd.DataFrame) -> np.ndarray:
    feature_names = list(model.feature_names_in_)
    aligned = feature_frame.reindex(columns=feature_names)

    if hasattr(model, "named_steps") and "imputer" in model.named_steps:
        imputer = model.named_steps["imputer"]
        transformed = imputer.transform(aligned)
        return np.asarray(transformed)

    # Fallback for non-pipeline artifacts.
    return np.asarray(aligned.to_numpy(dtype=float))


def compute_tree_variance(model: Any, feature_frame: pd.DataFrame) -> float:
    """Compute per-sample tree prediction variance for a single-row feature frame."""
    estimator = _extract_estimator(model)
    transformed = _transform_features(model, feature_frame)
    if transformed.shape[0] != 1:
        raise ValueError("compute_tree_variance expects a single-row feature frame.")
    tree_predictions = np.array(
        [float(tree.predict(transformed)[0]) for tree in estimator.estimators_],
        dtype=float,
    )
    return float(np.var(tree_predictions))


def compute_training_variance_stats(model: Any, feature_frame: pd.DataFrame) -> dict[str, float]:
    """Compute deterministic training variance distribution summary for calibration."""
    estimator = _extract_estimator(model)
    transformed = _transform_features(model, feature_frame)

    tree_matrix = np.vstack([tree.predict(transformed) for tree in estimator.estimators_])
    sample_variances = np.var(tree_matrix, axis=0)
    return {
        "training_variance_mean": float(np.mean(sample_variances)),
        "training_variance_std": float(np.std(sample_variances)),
        "training_variance_p25": float(np.percentile(sample_variances, 25)),
        "training_variance_p50": float(np.percentile(sample_variances, 50)),
        "training_variance_p75": float(np.percentile(sample_variances, 75)),
    }


def _variance_to_confidence_score(
    variance: float,
    training_variance_mean: float,
    training_variance_std: float,
) -> float:
    # Lower-than-baseline variance -> higher confidence.
    if np.isclose(training_variance_std, 0.0):
        score = 1.0 if variance <= training_variance_mean else 0.0
    else:
        z = (variance - training_variance_mean) / training_variance_std
        score = 1.0 / (1.0 + np.exp(z))
    return float(np.clip(score, 0.0, 1.0))


def _confidence_label(variance: float, variance_p25: float, variance_p75: float) -> str:
    if variance < variance_p25:
        return "High"
    if variance <= variance_p75:
        return "Medium"
    return "Low"


def compute_confidence(
    model: Any,
    feature_frame: pd.DataFrame,
    training_variance_mean: float,
    training_variance_std: float,
    training_variance_p25: float | None = None,
    training_variance_p75: float | None = None,
) -> dict[str, float | str]:
    """Return calibrated deterministic confidence from tree variance."""
    variance = compute_tree_variance(model, feature_frame)
    score = _variance_to_confidence_score(
        variance=variance,
        training_variance_mean=training_variance_mean,
        training_variance_std=training_variance_std,
    )
    variance_p25 = float(training_variance_p25) if training_variance_p25 is not None else float(
        training_variance_mean
    )
    variance_p75 = float(training_variance_p75) if training_variance_p75 is not None else float(
        training_variance_mean
    )
    return {
        "score": score,
        "label": _confidence_label(
            variance=variance,
            variance_p25=variance_p25,
            variance_p75=variance_p75,
        ),
    }


def compute_feature_interpretability(
    model: Any,
    feature_frame: pd.DataFrame,
) -> dict[str, Any]:
    """Return per-feature contributions and top drivers for a single sample."""
    estimator = _extract_estimator(model)
    transformed = _transform_features(model, feature_frame)
    if transformed.shape[0] != 1:
        raise ValueError("compute_feature_interpretability expects a single-row feature frame.")

    prediction, bias, contributions = ti.predict(estimator, transformed)
    feature_names = list(model.feature_names_in_)
    sample_contributions = np.asarray(contributions[0], dtype=float)

    if sample_contributions.shape[0] != len(feature_names):
        raise ValueError(
            "Contribution vector length does not match model.feature_names_in_."
        )

    feature_contributions = {
        feature_name: float(sample_contributions[index])
        for index, feature_name in enumerate(feature_names)
    }
    assert len(feature_contributions) == len(model.feature_names_in_)

    if not feature_contributions:
        raise ValueError("Interpretability produced empty feature contributions.")

    top_3_drivers = [
        {
            "feature": feature_name,
            "contribution": float(contribution),
            "direction": (
                "increases_resistance" if float(contribution) >= 0.0 else "decreases_resistance"
            ),
            "abs_magnitude": float(abs(contribution)),
        }
        for feature_name, contribution in sorted(
            feature_contributions.items(),
            key=lambda item: abs(item[1]),
            reverse=True,
        )[:3]
    ]
    while len(top_3_drivers) < 3:
        top_3_drivers.append(
            {
                "feature": "_unavailable",
                "contribution": 0.0,
                "direction": "increases_resistance",
                "abs_magnitude": 0.0,
            }
        )

    return {
        "prediction": float(prediction[0]),
        "bias": float(bias[0]),
        "feature_contributions": feature_contributions,
        "top_3_drivers": top_3_drivers,
        "display_names": {feature_name: feature_name for feature_name in feature_names},
    }
