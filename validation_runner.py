"""Standalone validation pipeline for reproducible regression metrics export."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from sklearn.metrics import mean_absolute_error, r2_score

from api.main import RAW_DATA_PATH, app, load_model
from src.model import DATASET_VERSION, SUPPORTED_DATASET_VERSIONS
from src.utils import clean_fire_properties


OUTPUT_PATH = Path("validation_summary.json")


def main() -> None:
    """Run deterministic validation and export summary metrics."""
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

    validation_summary = {
        "dataset_version": DATASET_VERSION,
        "n_samples": int(len(y_true)),
        "pearson_correlation": pearson_correlation,
        "r2_score": r2,
        "mae": mae,
    }

    with OUTPUT_PATH.open("w", encoding="utf-8") as fh:
        json.dump(validation_summary, fh, indent=2)

    print("VALIDATION SUMMARY")
    print(json.dumps(validation_summary, indent=2))
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
