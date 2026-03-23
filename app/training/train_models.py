"""Train and select Dravix regression models."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from dataclasses import dataclass
from typing import Any

import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.model_selection import KFold, cross_validate
from sklearn.pipeline import Pipeline

from app.training.dataset_loader import load_training_dataset
from app.training.evaluate_models import evaluate_benchmark_set
from app.training.feature_engineering import ALL_FEATURE_COLUMNS, build_feature_frame
from app.training.model_registry import register_model, save_model_artifact
from src.utils import repo_path

RANDOM_STATE = 42
MODEL_VERSION = "v0.3.2"
MODEL_NAME = "dravix_model"
TRAINING_DATASET_NAME = "materials-v0.3.1"


@dataclass
class TrainingResult:
    best_model: Any
    model_name: str
    model_version: str
    metrics: dict[str, dict[str, float]]
    feature_importances: list[dict[str, float]]
    benchmark_results: list[dict[str, Any]]
    artifact_path: str
    metadata_path: str


def _build_model_candidates() -> dict[str, Any]:
    candidates: dict[str, Any] = {
        "RandomForestRegressor": RandomForestRegressor(
            n_estimators=300,
            random_state=RANDOM_STATE,
            n_jobs=-1,
        )
    }

    try:
        from xgboost import XGBRegressor
    except ImportError:
        XGBRegressor = None
    if XGBRegressor is not None:
        candidates["XGBoostRegressor"] = XGBRegressor(
            n_estimators=300,
            max_depth=6,
            learning_rate=0.05,
            subsample=0.9,
            colsample_bytree=0.9,
            random_state=RANDOM_STATE,
            objective="reg:squarederror",
        )

    try:
        from lightgbm import LGBMRegressor
    except ImportError:
        LGBMRegressor = None
    if LGBMRegressor is not None:
        candidates["LightGBMRegressor"] = LGBMRegressor(
            n_estimators=300,
            learning_rate=0.05,
            random_state=RANDOM_STATE,
            verbose=-1,
        )

    return candidates


def _build_pipeline(model: Any) -> Pipeline:
    return Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("model", model),
        ]
    )


def _extract_feature_importances(model_pipeline: Pipeline) -> list[dict[str, float]]:
    estimator = model_pipeline.named_steps["model"]
    if not hasattr(estimator, "feature_importances_"):
        return []

    importances = pd.Series(estimator.feature_importances_, index=list(model_pipeline.feature_names_in_))
    return [
        {"feature": str(feature), "importance": float(score)}
        for feature, score in importances.sort_values(ascending=False).items()
    ]


def train_models() -> TrainingResult:
    training_df = load_training_dataset()
    aligned = training_df.dropna(subset=["target_dfrs"]).copy()
    if aligned.empty:
        raise ValueError("No labeled training rows are available.")

    features = build_feature_frame(aligned)
    target = pd.to_numeric(aligned["target_dfrs"], errors="coerce")
    cv = KFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)

    metrics: dict[str, dict[str, float]] = {}
    trained_pipelines: dict[str, Pipeline] = {}

    for candidate_name, estimator in _build_model_candidates().items():
        pipeline = _build_pipeline(estimator)
        scoring = {
            "rmse": "neg_root_mean_squared_error",
            "mae": "neg_mean_absolute_error",
            "r2": "r2",
        }
        cv_scores = cross_validate(
            pipeline,
            features,
            target,
            cv=cv,
            scoring=scoring,
            n_jobs=1,
        )
        metrics[candidate_name] = {
            "rmse": float((-cv_scores["test_rmse"]).mean()),
            "mae": float((-cv_scores["test_mae"]).mean()),
            "r2": float(cv_scores["test_r2"].mean()),
        }
        pipeline.fit(features, target)
        trained_pipelines[candidate_name] = pipeline

    best_model_name = min(metrics, key=lambda name: metrics[name]["rmse"])
    best_pipeline = trained_pipelines[best_model_name]
    feature_importances = _extract_feature_importances(best_pipeline)

    metadata = {
        "model_name": MODEL_NAME,
        "model_version": MODEL_VERSION,
        "selected_model_family": best_model_name,
        "training_dataset": TRAINING_DATASET_NAME,
        "training_rows": int(len(features)),
        "training_timestamp": datetime.now(timezone.utc).isoformat(),
        "feature_columns": list(ALL_FEATURE_COLUMNS),
        "metrics": metrics,
        "feature_importances": feature_importances[:10],
    }
    artifact_path, metadata_path = save_model_artifact(
        best_pipeline,
        model_version=MODEL_VERSION,
        metadata=metadata,
    )
    register_model(
        model_name=MODEL_NAME,
        model_version=MODEL_VERSION,
        training_dataset=TRAINING_DATASET_NAME,
        rmse=metrics[best_model_name]["rmse"],
        r2=metrics[best_model_name]["r2"],
        model_path=str(artifact_path.relative_to(repo_path())),
    )
    metadata["artifact_path"] = str(artifact_path.relative_to(repo_path()))
    metadata["metadata_path"] = str(metadata_path.relative_to(repo_path()))
    metadata_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")

    benchmark_results = evaluate_benchmark_set(
        best_pipeline,
        repo_path("data", "benchmark_materials.csv"),
    )

    return TrainingResult(
        best_model=best_pipeline,
        model_name=best_model_name,
        model_version=MODEL_VERSION,
        metrics=metrics,
        feature_importances=feature_importances,
        benchmark_results=benchmark_results,
        artifact_path=str(artifact_path),
        metadata_path=str(metadata_path),
    )
