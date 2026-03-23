"""Model evaluation helpers."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from app.training.feature_engineering import build_feature_frame


def evaluate_predictions(y_true: pd.Series, y_pred: Any) -> dict[str, float]:
    return {
        "rmse": float(mean_squared_error(y_true, y_pred) ** 0.5),
        "mae": float(mean_absolute_error(y_true, y_pred)),
        "r2": float(r2_score(y_true, y_pred)),
    }


def evaluate_benchmark_set(model: Any, benchmark_path: Path) -> list[dict[str, Any]]:
    benchmark_df = pd.read_csv(benchmark_path)
    feature_frame = build_feature_frame(benchmark_df)
    predictions = model.predict(feature_frame)
    rows: list[dict[str, Any]] = []
    for row, prediction in zip(benchmark_df.to_dict(orient="records"), predictions, strict=False):
        rows.append(
            {
                "material_name": row.get("material_name"),
                "predicted_dfrs": float(prediction),
                "target_dfrs": (
                    None
                    if pd.isna(row.get("target_dfrs"))
                    else float(row["target_dfrs"])
                ),
            }
        )
    return rows
