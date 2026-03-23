"""Phase 3 model runtime helpers for versioned inference artifacts."""

from __future__ import annotations

import json
import os
import pickle
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from treeinterpreter import treeinterpreter as ti

from .utils import repo_path

DEFAULT_TARGET_COLUMN = "Base_Resistance_Target"
DEFAULT_MODEL_VERSION = "v0.3-stable"

MODEL_RUNTIME_CONFIGS: dict[str, dict[str, Any]] = {
    "v0.3-stable": {
        "model_version": "v0.3-stable",
        "dataset_version": "v0.3-stable",
        "dataset_build_date": "2026-02-27",
        "reference_dataset": ("data", "materials", "v0.3", "materials_dataset.csv"),
        "materials_lookup": ("data", "materials", "v0.3", "materials_dataset.csv"),
        "coatings_lookup": ("data", "coatings", "v0.3", "coatings_dataset.csv"),
        "model_artifact": ("models", "model_v0.3-stable.pkl"),
        "metadata_artifact": None,
    },
    "v0.4": {
        "model_version": "v0.4",
        "dataset_version": "materials-v0.3.1",
        "dataset_build_date": "2026-03-22T00:00:00Z",
        "reference_dataset": ("data", "materials", "v0.3.1", "materials_dataset_clean.csv"),
        "materials_lookup": ("data", "materials", "v0.3.1", "materials_dataset_clean.csv"),
        # Keep the stable coating lookup until a v0.4-compatible coating modifier exists.
        "coatings_lookup": ("data", "coatings", "v0.3", "coatings_dataset.csv"),
        "model_artifact": ("models", "model_v0.4.pkl"),
        "metadata_artifact": ("models", "model_v0.4_metadata.json"),
    },
    "v0.3.2": {
        "model_version": "v0.3.2",
        "dataset_version": "materials-v0.3.1",
        "dataset_build_date": "2026-03-23T00:00:00Z",
        "reference_dataset": ("data", "materials", "v0.3.1", "materials_dataset_clean.csv"),
        "materials_lookup": ("data", "materials", "v0.3.1", "materials_dataset_clean.csv"),
        "coatings_lookup": ("data", "coatings", "v0.3", "coatings_dataset.csv"),
        "model_artifact": ("models", "dravix_model_v0.3.2.pkl"),
        "metadata_artifact": ("models", "dravix_model_v0.3.2.json"),
    },
}

SUPPORTED_MODEL_VERSIONS = sorted(MODEL_RUNTIME_CONFIGS.keys())

def _resolve_explicit_model_version() -> str | None:
    raw_value = os.getenv("DRAVIX_MODEL_VERSION", "").strip()
    return raw_value or None


def _load_json_if_exists(path: Path | None) -> dict[str, Any]:
    if path is None or not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def _resolve_registry_runtime_config() -> dict[str, Any] | None:
    try:
        from app.training.model_registry import get_latest_registered_model
    except Exception:
        return None

    registry_record = get_latest_registered_model()
    if not registry_record:
        return None

    raw_model_path = registry_record.get("model_path")
    if not raw_model_path:
        return None

    model_path = Path(str(raw_model_path))
    if not model_path.is_absolute():
        model_path = repo_path(*model_path.parts)
    metadata_path = model_path.with_suffix(".json")
    metadata = _load_json_if_exists(metadata_path)

    return {
        "model_version": str(registry_record.get("model_version") or DEFAULT_MODEL_VERSION),
        "dataset_version": str(
            metadata.get("training_dataset")
            or registry_record.get("training_dataset")
            or "materials-v0.3.1"
        ),
        "dataset_build_date": str(
            metadata.get("training_timestamp")
            or registry_record.get("created_at")
            or "unknown"
        ),
        "reference_dataset": ("data", "materials", "v0.3.1", "materials_dataset_clean.csv"),
        "materials_lookup": ("data", "materials", "v0.3.1", "materials_dataset_clean.csv"),
        "coatings_lookup": ("data", "coatings", "v0.3", "coatings_dataset.csv"),
        "model_artifact": tuple(model_path.parts),
        "metadata_artifact": tuple(metadata_path.parts) if metadata_path.exists() else None,
    }


def _resolve_active_model_config() -> dict[str, Any]:
    requested_model_version = _resolve_explicit_model_version()
    if requested_model_version is not None:
        if requested_model_version not in MODEL_RUNTIME_CONFIGS:
            raise ValueError(
                "Unsupported DRAVIX_MODEL_VERSION "
                f"{requested_model_version!r}. Supported versions: {', '.join(SUPPORTED_MODEL_VERSIONS)}"
            )
        return MODEL_RUNTIME_CONFIGS[requested_model_version]

    registry_config = _resolve_registry_runtime_config()
    if registry_config is not None:
        return registry_config
    return MODEL_RUNTIME_CONFIGS[DEFAULT_MODEL_VERSION]


def _resolve_path(path_config: tuple[str, ...] | None) -> Path | None:
    if path_config is None:
        return None
    path = Path(*path_config)
    if path.is_absolute():
        return path
    return repo_path(*path.parts)


ACTIVE_MODEL_CONFIG = _resolve_active_model_config()
PHASE3_REFERENCE_PATH = _resolve_path(tuple(ACTIVE_MODEL_CONFIG["reference_dataset"]))
MATERIALS_LOOKUP_PATH = _resolve_path(tuple(ACTIVE_MODEL_CONFIG["materials_lookup"]))
COATINGS_LOOKUP_PATH = _resolve_path(tuple(ACTIVE_MODEL_CONFIG["coatings_lookup"]))
MODEL_ARTIFACT_PATH = _resolve_path(tuple(ACTIVE_MODEL_CONFIG["model_artifact"]))
MODEL_METADATA_PATH = _resolve_path(ACTIVE_MODEL_CONFIG.get("metadata_artifact"))

MODEL_VERSION = str(ACTIVE_MODEL_CONFIG["model_version"])
DATASET_VERSION = str(ACTIVE_MODEL_CONFIG["dataset_version"])
DATASET_BUILD_DATE = str(ACTIVE_MODEL_CONFIG["dataset_build_date"])
_artifact_metadata = _load_json_if_exists(MODEL_METADATA_PATH)
if _artifact_metadata.get("training_timestamp"):
    DATASET_BUILD_DATE = str(_artifact_metadata["training_timestamp"])

SUPPORTED_DATASET_VERSIONS = [
    str(config["dataset_version"]) for config in MODEL_RUNTIME_CONFIGS.values()
]

material_lookup: dict[str, dict[str, Any]] = {}
material_display_names: dict[str, str] = {}
coating_lookup: dict[str, dict[str, Any]] = {}
coating_display_names: dict[str, str] = {}
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
    if version in MODEL_RUNTIME_CONFIGS:
        return str(repo_path(*MODEL_RUNTIME_CONFIGS[version]["model_artifact"]))
    dravix_path = repo_path("models", f"dravix_model_{version}.pkl")
    if dravix_path.exists():
        return str(dravix_path)
    return str(repo_path("models", f"model_{version}.pkl"))


def get_model_metadata_path(version: str) -> str | None:
    """Return metadata path for a versioned model artifact, if defined."""
    if version not in MODEL_RUNTIME_CONFIGS:
        candidate = repo_path("models", f"dravix_model_{version}.json")
        return str(candidate) if candidate.exists() else None
    metadata_config = MODEL_RUNTIME_CONFIGS[version].get("metadata_artifact")
    if metadata_config is None:
        return None
    return str(repo_path(*metadata_config))


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


def normalize_coating_code(coating_code: str) -> str:
    """Normalize incoming coating codes for deterministic lookup keys."""
    return coating_code.strip().lower()


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
    material_name_column = "Material Name"
    if material_name_column not in df.columns:
        if "Material" in df.columns:
            material_name_column = "Material"
        else:
            raise ValueError(
                "materials lookup dataset must contain 'Material Name' or 'Material' column."
            )

    lookup: dict[str, dict[str, Any]] = {}
    display_names: dict[str, str] = {}
    for _, row in df.iterrows():
        raw_name = row.get(material_name_column)
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


def load_coating_lookup(path: Path | None = None) -> dict[str, dict[str, Any]]:
    """Load and cache coating descriptor lookup from Phase 3 coatings dataset."""
    csv_path = path or COATINGS_LOOKUP_PATH
    if not csv_path.exists():
        raise FileNotFoundError(f"Missing coatings lookup dataset: {csv_path}")

    df = pd.read_csv(csv_path, low_memory=False)
    if "Coating_Code" not in df.columns:
        raise ValueError("coatings lookup dataset must contain 'Coating_Code' column.")

    lookup: dict[str, dict[str, Any]] = {}
    display_names: dict[str, str] = {}
    for _, row in df.iterrows():
        raw_code = row.get("Coating_Code")
        if pd.isna(raw_code):
            continue

        normalized_code = normalize_coating_code(str(raw_code))
        if not normalized_code:
            continue
        if normalized_code in lookup:
            # Keep first occurrence for deterministic behavior.
            continue

        row_dict = {column: _to_native_value(value) for column, value in row.items()}
        lookup[normalized_code] = row_dict
        display_names[normalized_code] = str(raw_code).strip()

    global coating_lookup
    global coating_display_names
    coating_lookup = lookup
    coating_display_names = display_names
    return coating_lookup


def get_coating_names() -> list[str]:
    """Return sorted coating codes available in the loaded lookup."""
    return sorted(coating_display_names.values())


def get_material_descriptors(
    material_name: str,
    feature_names: list[str] | None = None,
) -> dict[str, Any] | None:
    """Return feature descriptor dict for a material name, if available."""
    normalized_name = normalize_material_name(material_name)
    row = material_lookup.get(normalized_name)
    if row is None:
        alias_matches: list[str] = []
        for candidate_name in material_lookup.keys():
            if (
                candidate_name.startswith(f"{normalized_name} ")
                or candidate_name.startswith(f"{normalized_name}(")
                or f"({normalized_name})" in candidate_name
                or normalized_name in candidate_name
            ):
                alias_matches.append(candidate_name)
        if alias_matches:
            alias_matches.sort()
            row = material_lookup.get(alias_matches[0])
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
        return model.named_steps["model"]
    return model


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
    if not hasattr(estimator, "estimators_"):
        return 0.0
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
    if not hasattr(estimator, "estimators_"):
        return {
            "training_variance_mean": 0.0,
            "training_variance_std": 0.0,
            "training_variance_p25": 0.0,
            "training_variance_p50": 0.0,
            "training_variance_p75": 0.0,
        }
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

    feature_names = list(model.feature_names_in_)
    if hasattr(estimator, "estimators_"):
        prediction, bias, contributions = ti.predict(estimator, transformed)
        sample_contributions = np.asarray(contributions[0], dtype=float)
        prediction_value = float(prediction[0])
        bias_value = float(bias[0])
    else:
        prediction_value = float(model.predict(feature_frame.reindex(columns=feature_names))[0])
        bias_value = 0.0
        if hasattr(estimator, "feature_importances_"):
            importances = np.asarray(estimator.feature_importances_, dtype=float)
        else:
            importances = np.zeros(len(feature_names), dtype=float)
        if importances.shape[0] != len(feature_names):
            importances = np.resize(importances, len(feature_names))
        row_values = np.nan_to_num(np.asarray(transformed[0], dtype=float), nan=0.0)
        sample_contributions = row_values * importances

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
        "prediction": prediction_value,
        "bias": bias_value,
        "feature_contributions": feature_contributions,
        "top_3_drivers": top_3_drivers,
        "display_names": {feature_name: feature_name for feature_name in feature_names},
    }
