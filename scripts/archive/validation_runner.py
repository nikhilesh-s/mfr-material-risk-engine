"""Standalone Phase 3 validation metrics exporter (isolated from API startup)."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from src.model import DATASET_VERSION, PHASE3_REFERENCE_PATH, load_phase3_model

VALIDATION_OUTPUT_PATH = Path("validation_summary.json")
VALIDATION_PREDICTIONS_PATH = Path("validation_predictions.csv")
VALIDATION_RESIDUALS_PATH = Path("validation_residuals.csv")
FROZEN_TARGET_COLUMN = "Base_Resistance_Target"


def _rank_candidate_target_columns(
    dataframe: pd.DataFrame,
    feature_names: list[str],
) -> list[str]:
    numeric_non_feature_columns = [
        column
        for column in dataframe.select_dtypes(include=["number"]).columns
        if column not in set(feature_names)
    ]
    if not numeric_non_feature_columns:
        return []

    variances = dataframe[numeric_non_feature_columns].var(ddof=0, numeric_only=True)
    return variances.sort_values(ascending=False).index.astype(str).tolist()


def _pearson(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    if len(y_true) < 2:
        return float("nan")
    if np.isclose(float(np.std(y_true)), 0.0) or np.isclose(float(np.std(y_pred)), 0.0):
        return float("nan")
    return float(np.corrcoef(y_pred, y_true)[0, 1])


def main() -> None:
    model = load_phase3_model()
    if not PHASE3_REFERENCE_PATH.exists():
        raise FileNotFoundError(f"Missing reference dataset: {PHASE3_REFERENCE_PATH}")

    reference_df = pd.read_csv(PHASE3_REFERENCE_PATH, low_memory=False)
    feature_names = list(model.feature_names_in_)
    missing_feature_columns = [name for name in feature_names if name not in reference_df.columns]
    if missing_feature_columns:
        raise ValueError(
            "Reference dataset missing model feature columns: "
            + ", ".join(missing_feature_columns)
        )

    candidate_targets = _rank_candidate_target_columns(reference_df, feature_names)
    if FROZEN_TARGET_COLUMN not in reference_df.columns:
        top_candidates = ", ".join(candidate_targets[:5]) if candidate_targets else "none"
        raise ValueError(
            "Frozen target column is missing from reference dataset: "
            f"{FROZEN_TARGET_COLUMN}. Top candidate numeric columns: {top_candidates}"
        )

    y_all = pd.to_numeric(reference_df[FROZEN_TARGET_COLUMN], errors="coerce")
    valid_mask = y_all.notna()

    X = reference_df.loc[valid_mask, feature_names]
    y_true = y_all.loc[valid_mask].to_numpy(dtype=float)
    if len(y_true) == 0:
        raise ValueError("No valid target rows available for validation metrics.")

    preds = model.predict(X)
    residuals = y_true - preds

    validation_summary = {
        "dataset_version": DATASET_VERSION,
        "n_samples": int(len(y_true)),
        "target_column": FROZEN_TARGET_COLUMN,
        "candidate_target_columns": candidate_targets[:5],
        "pearson_correlation": _pearson(y_true, preds),
        "r2_score": float(r2_score(y_true, preds)),
        "mae": float(mean_absolute_error(y_true, preds)),
        "mse": float(mean_squared_error(y_true, preds)),
        "residual_distribution": {
            "mean": float(np.mean(residuals)),
            "std": float(np.std(residuals)),
            "min": float(np.min(residuals)),
            "max": float(np.max(residuals)),
        },
    }

    predictions_df = pd.DataFrame(
        {
            "y_true": y_true,
            "y_pred": preds,
        }
    )
    predictions_df.to_csv(VALIDATION_PREDICTIONS_PATH, index=False)

    residuals_df = pd.DataFrame(
        {
            "residual": residuals,
            "absolute_residual": np.abs(residuals),
        }
    )
    residuals_df.to_csv(VALIDATION_RESIDUALS_PATH, index=False)

    with VALIDATION_OUTPUT_PATH.open("w", encoding="utf-8") as output_file:
        json.dump(validation_summary, output_file, indent=2)

    print(json.dumps(validation_summary, indent=2))
    print(f"Wrote {VALIDATION_OUTPUT_PATH}")
    print(f"Wrote {VALIDATION_PREDICTIONS_PATH}")
    print(f"Wrote {VALIDATION_RESIDUALS_PATH}")


if __name__ == "__main__":
    main()
