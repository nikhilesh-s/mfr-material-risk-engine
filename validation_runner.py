"""Standalone validation pipeline for reproducible regression metrics export."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import KFold

from api.main import RAW_DATA_PATH, app, load_model
from model import (
    DATASET_VERSION,
    SUPPORTED_DATASET_VERSIONS,
    build_feature_matrix,
    export_model_metadata,
)
from utils import clean_fire_properties


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run reproducible validation metrics for the Dravix risk model."
    )
    parser.add_argument(
        "--cv",
        action="store_true",
        help="Enable deterministic K-fold cross-validation scaffold.",
    )
    parser.add_argument(
        "--folds",
        type=int,
        default=5,
        help="Number of folds to use when --cv is enabled (default: 5).",
    )
    return parser.parse_args()


def _validation_output_path(version: str) -> Path:
    return Path(f"validation_summary_{version}.json")


def _fold_metrics(y_true: np.ndarray, preds: np.ndarray) -> tuple[float, float, float]:
    pearson = float(np.corrcoef(preds, y_true)[0, 1])
    r2 = float(r2_score(y_true, preds))
    mae = float(mean_absolute_error(y_true, preds))
    return pearson, r2, mae


def _run_cross_validation(
    cleaned_df: pd.DataFrame, folds: int
) -> dict[str, float | int | bool]:
    if folds < 2:
        raise ValueError("--folds must be >= 2 when --cv is enabled.")
    if "risk_score" not in cleaned_df.columns:
        raise ValueError("risk_score column is required for cross-validation.")

    X = build_feature_matrix(cleaned_df)
    y = cleaned_df["risk_score"].to_numpy(dtype=float)
    kfold = KFold(n_splits=folds, shuffle=True, random_state=42)

    cv_pearson: list[float] = []
    cv_r2: list[float] = []
    cv_mae: list[float] = []
    for train_idx, test_idx in kfold.split(X):
        X_train = X.iloc[train_idx]
        X_test = X.iloc[test_idx]
        y_train = y[train_idx]
        y_test = y[test_idx]

        fold_model = RandomForestRegressor(random_state=42)
        fold_model.fit(X_train, y_train)
        fold_preds = fold_model.predict(X_test)
        pearson, r2, mae = _fold_metrics(y_test, fold_preds)
        cv_pearson.append(pearson)
        cv_r2.append(r2)
        cv_mae.append(mae)

    return {
        "cv_enabled": True,
        "cv_folds": int(folds),
        "cv_r2_mean": float(np.mean(cv_r2)),
        "cv_r2_std": float(np.std(cv_r2)),
        "cv_mae_mean": float(np.mean(cv_mae)),
        "cv_mae_std": float(np.std(cv_mae)),
        "cv_pearson_mean": float(np.mean(cv_pearson)),
        "cv_pearson_std": float(np.std(cv_pearson)),
    }


def main() -> None:
    """Run deterministic validation and export summary metrics."""
    args = _parse_args()
    output_path = _validation_output_path(DATASET_VERSION)

    print(f"Dataset version: {DATASET_VERSION}")
    if DATASET_VERSION not in SUPPORTED_DATASET_VERSIONS:
        raise ValueError(
            f"Unknown DATASET_VERSION: {DATASET_VERSION}. "
            f"Supported: {', '.join(SUPPORTED_DATASET_VERSIONS)}"
        )
    if not RAW_DATA_PATH.exists():
        raise FileNotFoundError(f"Missing dataset at {RAW_DATA_PATH}")

    # Reuse the application's model-loading path so validation matches runtime model setup.
    try:
        load_model()
    except NotImplementedError as exc:
        if DATASET_VERSION == "v0.3-layered":
            raise RuntimeError(
                "Validation for DRAVIX_DATASET_VERSION=v0.3-layered is not available yet: "
                "feature builder scaffold exists but is not implemented."
            ) from exc
        raise
    model = app.state.model
    raw_df = app.state.raw_df

    cleaned_df, _ = clean_fire_properties(raw_df)
    if "risk_score" not in cleaned_df.columns:
        raise ValueError("risk_score column is required for validation.")

    feature_names = (
        list(model.feature_names_in_) if hasattr(model, "feature_names_in_") else []
    )
    if not feature_names:
        raise ValueError("Loaded model is missing feature_names_in_.")

    X = cleaned_df[feature_names]
    y_true = cleaned_df["risk_score"].to_numpy(dtype=float)
    preds = model.predict(X)

    pearson_correlation = float(np.corrcoef(preds, y_true)[0, 1])
    r2 = float(r2_score(y_true, preds))
    mae = float(mean_absolute_error(y_true, preds))
    metadata_path = export_model_metadata(model=model, n_samples=len(y_true))

    cv_summary: dict[str, float | int | bool | None]
    if args.cv:
        cv_summary = _run_cross_validation(cleaned_df, args.folds)
    else:
        cv_summary = {
            "cv_enabled": False,
            "cv_folds": 0,
            "cv_r2_mean": None,
            "cv_r2_std": None,
            "cv_mae_mean": None,
            "cv_mae_std": None,
            "cv_pearson_mean": None,
            "cv_pearson_std": None,
        }

    validation_summary = {
        "dataset_version": DATASET_VERSION,
        "n_samples": int(len(y_true)),
        "pearson_correlation": pearson_correlation,
        "r2_score": r2,
        "mae": mae,
        **cv_summary,
    }

    with output_path.open("w", encoding="utf-8") as fh:
        json.dump(validation_summary, fh, indent=2)

    print("VALIDATION SUMMARY")
    print(json.dumps(validation_summary, indent=2))
    print(f"Wrote {output_path}")
    print(f"Wrote {metadata_path}")


if __name__ == "__main__":
    main()
