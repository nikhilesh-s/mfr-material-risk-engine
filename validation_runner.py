"""Standalone Phase 3 validation metrics exporter (isolated from API startup)."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, r2_score

from src.model import DATASET_VERSION, PHASE3_REFERENCE_PATH, load_phase3_model

VALIDATION_OUTPUT_PATH = Path("validation_summary.json")


def _detect_target_column(
    dataframe: pd.DataFrame,
    feature_names: list[str],
) -> str:
    preferred_targets = ["Base_Resistance_Target", "risk_score"]
    for target in preferred_targets:
        if target in dataframe.columns and target not in feature_names:
            return target

    numeric_non_feature_columns = [
        column
        for column in dataframe.select_dtypes(include=["number"]).columns
        if column not in set(feature_names)
    ]
    if not numeric_non_feature_columns:
        raise ValueError("Unable to detect target column from reference dataset.")

    variances = dataframe[numeric_non_feature_columns].var(ddof=0, numeric_only=True)
    return str(variances.sort_values(ascending=False).index[0])


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

    target_column = _detect_target_column(reference_df, feature_names)
    y_all = pd.to_numeric(reference_df[target_column], errors="coerce")
    valid_mask = y_all.notna()

    X = reference_df.loc[valid_mask, feature_names]
    y_true = y_all.loc[valid_mask].to_numpy(dtype=float)
    if len(y_true) == 0:
        raise ValueError("No valid target rows available for validation metrics.")

    preds = model.predict(X)

    validation_summary = {
        "dataset_version": DATASET_VERSION,
        "n_samples": int(len(y_true)),
        "target_column": target_column,
        "pearson_correlation": _pearson(y_true, preds),
        "r2_score": float(r2_score(y_true, preds)),
        "mae": float(mean_absolute_error(y_true, preds)),
    }

    with VALIDATION_OUTPUT_PATH.open("w", encoding="utf-8") as output_file:
        json.dump(validation_summary, output_file, indent=2)

    print(json.dumps(validation_summary, indent=2))
    print(f"Wrote {VALIDATION_OUTPUT_PATH}")


if __name__ == "__main__":
    main()
