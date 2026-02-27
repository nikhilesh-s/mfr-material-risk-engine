"""Phase 3 model runtime helpers for v0.3-stable inference."""

from __future__ import annotations

import pickle
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

PHASE3_REFERENCE_PATH = Path("data/phase3_model/materials_phase3_with_target_v2.csv")

DATASET_VERSION = "v0.3-stable"
MODEL_VERSION = DATASET_VERSION

SUPPORTED_DATASET_VERSIONS = [
    "v0.3-stable",
]

MODEL_ARTIFACT_PATH = Path("models/model_v0.3-stable.pkl")


def get_model_artifact_path(version: str) -> str:
    """Return versioned model artifact path for explicit phase tags."""
    return str(Path("models") / f"model_{version}.pkl")


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
    """Compute training-time variance mean/std once for confidence calibration."""
    estimator = _extract_estimator(model)
    transformed = _transform_features(model, feature_frame)

    tree_matrix = np.vstack([tree.predict(transformed) for tree in estimator.estimators_])
    sample_variances = np.var(tree_matrix, axis=0)
    return {
        "training_variance_mean": float(np.mean(sample_variances)),
        "training_variance_std": float(np.std(sample_variances)),
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


def _confidence_label(score: float) -> str:
    if score > 0.75:
        return "High"
    if score >= 0.4:
        return "Medium"
    return "Low"


def compute_confidence(
    model: Any,
    feature_frame: pd.DataFrame,
    training_variance_mean: float,
    training_variance_std: float,
) -> dict[str, float | str]:
    """Return calibrated deterministic confidence from tree variance."""
    variance = compute_tree_variance(model, feature_frame)
    score = _variance_to_confidence_score(
        variance=variance,
        training_variance_mean=training_variance_mean,
        training_variance_std=training_variance_std,
    )
    return {
        "score": score,
        "label": _confidence_label(score),
    }
