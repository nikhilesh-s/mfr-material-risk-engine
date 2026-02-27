"""Export deterministic Phase 3 validation and presentation artifacts."""

from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path
from typing import Any

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from treeinterpreter import treeinterpreter as ti

# Ensure repository root is on import path when executed as a script.
REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from src.api_contract import Phase3Input, Phase3PredictResponse
from src.model import DATASET_VERSION, PHASE3_REFERENCE_PATH, load_phase3_model
from src.phase3_coating_modifier import get_coating_modifier_table
from src.utils import repo_path

ARTIFACT_DIR = repo_path("artifacts", "phase3")
SUMMARY_PATH = ARTIFACT_DIR / "validation_summary.json"
PREDICTIONS_PATH = ARTIFACT_DIR / "validation_predictions.csv"
RESIDUALS_PATH = ARTIFACT_DIR / "validation_residuals.csv"
RESIDUAL_HIST_PATH = ARTIFACT_DIR / "plot_residual_hist.png"
PRED_ACTUAL_PATH = ARTIFACT_DIR / "plot_pred_vs_actual.png"
CONFIDENCE_DIST_PATH = ARTIFACT_DIR / "plot_confidence_distribution.png"
TOP_FEATURES_PLOT_PATH = ARTIFACT_DIR / "plot_top_features_global.png"
COATING_IMPACT_PATH = ARTIFACT_DIR / "coating_impact_summary.csv"
API_CONTRACT_SNAPSHOT_PATH = ARTIFACT_DIR / "api_contract_snapshot.json"


def _detect_target_column(
    dataframe: pd.DataFrame,
    feature_names: list[str],
) -> str | None:
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
        return None

    variances = dataframe[numeric_non_feature_columns].var(ddof=0, numeric_only=True)
    return str(variances.sort_values(ascending=False).index[0])


def _pearson(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    if len(y_true) < 2:
        return float("nan")
    if np.isclose(float(np.std(y_true)), 0.0) or np.isclose(float(np.std(y_pred)), 0.0):
        return float("nan")
    return float(np.corrcoef(y_pred, y_true)[0, 1])


def _extract_estimator(model: Any) -> Any:
    if hasattr(model, "named_steps") and "model" in model.named_steps:
        return model.named_steps["model"]
    return model


def _transform_features(model: Any, feature_frame: pd.DataFrame) -> np.ndarray:
    aligned = feature_frame.reindex(columns=list(model.feature_names_in_))
    if hasattr(model, "named_steps") and "imputer" in model.named_steps:
        return np.asarray(model.named_steps["imputer"].transform(aligned))
    return np.asarray(aligned.to_numpy(dtype=float))


def _build_validation_frames(
    reference_df: pd.DataFrame,
    feature_names: list[str],
    preds: np.ndarray,
    target_column: str | None,
) -> tuple[pd.DataFrame, pd.DataFrame, dict[str, Any], np.ndarray | None]:
    material_names = (
        reference_df["Material Name"].astype(str)
        if "Material Name" in reference_df.columns
        else pd.Series(reference_df.index.astype(str))
    )

    if target_column is None:
        predictions_df = pd.DataFrame(
            {
                "Material Name": material_names,
                "y_pred": preds,
            }
        )
        residuals_df = pd.DataFrame(columns=["Material Name", "residual", "absolute_residual"])
        summary = {
            "target_column": None,
            "pearson_correlation": None,
            "r2_score": None,
            "mae": None,
            "mse": None,
            "residual_distribution": {
                "mean": None,
                "std": None,
                "min": None,
                "max": None,
            },
        }
        return predictions_df, residuals_df, summary, None

    y_all = pd.to_numeric(reference_df[target_column], errors="coerce")
    valid_mask = y_all.notna()
    y_true = y_all.loc[valid_mask].to_numpy(dtype=float)
    preds_valid = preds[valid_mask.to_numpy()]
    abs_error = np.abs(y_true - preds_valid)
    residuals = y_true - preds_valid

    predictions_df = pd.DataFrame(
        {
            "Material Name": material_names.loc[valid_mask].to_numpy(),
            "y_true": y_true,
            "y_pred": preds_valid,
            "absolute_error": abs_error,
        }
    )
    residuals_df = pd.DataFrame(
        {
            "Material Name": material_names.loc[valid_mask].to_numpy(),
            "residual": residuals,
            "absolute_residual": np.abs(residuals),
        }
    )
    summary = {
        "target_column": target_column,
        "pearson_correlation": _pearson(y_true, preds_valid),
        "r2_score": float(r2_score(y_true, preds_valid)),
        "mae": float(mean_absolute_error(y_true, preds_valid)),
        "mse": float(mean_squared_error(y_true, preds_valid)),
        "residual_distribution": {
            "mean": float(np.mean(residuals)),
            "std": float(np.std(residuals)),
            "min": float(np.min(residuals)),
            "max": float(np.max(residuals)),
        },
    }
    return predictions_df, residuals_df, summary, y_true


def _export_plots(
    predictions_df: pd.DataFrame,
    residuals_df: pd.DataFrame,
    y_true: np.ndarray | None,
    tree_variances: np.ndarray,
    feature_names: list[str],
    contributions: np.ndarray,
) -> list[Path]:
    created: list[Path] = []

    if not residuals_df.empty:
        plt.figure(figsize=(8, 5))
        plt.hist(residuals_df["residual"], bins=30, edgecolor="black")
        plt.title("Residual Distribution")
        plt.xlabel("Residual (y_true - y_pred)")
        plt.ylabel("Count")
        plt.tight_layout()
        plt.savefig(RESIDUAL_HIST_PATH, dpi=200)
        plt.close()
        created.append(RESIDUAL_HIST_PATH)
    else:
        plt.figure(figsize=(8, 5))
        plt.text(0.5, 0.5, "Residual plot unavailable: target column missing.", ha="center", va="center")
        plt.axis("off")
        plt.tight_layout()
        plt.savefig(RESIDUAL_HIST_PATH, dpi=200)
        plt.close()
        created.append(RESIDUAL_HIST_PATH)

    if y_true is not None and {"y_true", "y_pred"}.issubset(predictions_df.columns):
        plt.figure(figsize=(6, 6))
        plt.scatter(predictions_df["y_true"], predictions_df["y_pred"], alpha=0.5, s=12)
        limits = [
            float(min(predictions_df["y_true"].min(), predictions_df["y_pred"].min())),
            float(max(predictions_df["y_true"].max(), predictions_df["y_pred"].max())),
        ]
        plt.plot(limits, limits, linestyle="--")
        plt.title("Predicted vs Actual")
        plt.xlabel("Actual")
        plt.ylabel("Predicted")
        plt.tight_layout()
        plt.savefig(PRED_ACTUAL_PATH, dpi=200)
        plt.close()
        created.append(PRED_ACTUAL_PATH)

    plt.figure(figsize=(8, 5))
    plt.hist(tree_variances, bins=30, edgecolor="black")
    plt.title("Confidence Calibration Variance Distribution")
    plt.xlabel("Per-sample tree variance")
    plt.ylabel("Count")
    plt.tight_layout()
    plt.savefig(CONFIDENCE_DIST_PATH, dpi=200)
    plt.close()
    created.append(CONFIDENCE_DIST_PATH)

    mean_abs_contributions = np.mean(np.abs(contributions), axis=0)
    contribution_series = pd.Series(mean_abs_contributions, index=feature_names).sort_values(
        ascending=False
    )
    top_series = contribution_series.head(10)
    plt.figure(figsize=(9, 5))
    plt.barh(top_series.index[::-1], top_series.values[::-1])
    plt.title("Top Global Features by Mean Absolute Contribution")
    plt.xlabel("Mean absolute contribution")
    plt.tight_layout()
    plt.savefig(TOP_FEATURES_PLOT_PATH, dpi=200)
    plt.close()
    created.append(TOP_FEATURES_PLOT_PATH)

    return created


def _export_coating_summary() -> Path:
    precomputed = repo_path("validation", "phase3", "coating_impact_summary_v0.3-alpha.csv")
    if precomputed.exists():
        shutil.copyfile(precomputed, COATING_IMPACT_PATH)
        return COATING_IMPACT_PATH

    table = get_coating_modifier_table()
    columns = [col for col in ["Coating_Code", "Coating_Modifier", "descriptor_count_used"] if col in table.columns]
    fallback = table.loc[:, columns].copy()
    fallback = fallback.rename(
        columns={
            "Coating_Code": "coating_code",
            "Coating_Modifier": "coating_modifier",
            "descriptor_count_used": "descriptor_count_used",
        }
    )
    fallback.to_csv(COATING_IMPACT_PATH, index=False)
    return COATING_IMPACT_PATH


def main() -> None:
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)

    model = load_phase3_model()
    if not PHASE3_REFERENCE_PATH.exists():
        raise FileNotFoundError(f"Missing reference dataset: {PHASE3_REFERENCE_PATH}")

    reference_df = pd.read_csv(PHASE3_REFERENCE_PATH, low_memory=False)
    feature_names = list(model.feature_names_in_)
    missing_features = [name for name in feature_names if name not in reference_df.columns]
    if missing_features:
        raise ValueError(
            "Reference dataset missing model feature columns: "
            + ", ".join(missing_features)
        )

    X = reference_df.loc[:, feature_names]
    preds = model.predict(X)

    target_column = _detect_target_column(reference_df, feature_names)
    predictions_df, residuals_df, metric_summary, y_true = _build_validation_frames(
        reference_df=reference_df,
        feature_names=feature_names,
        preds=np.asarray(preds, dtype=float),
        target_column=target_column,
    )

    transformed = _transform_features(model, X)
    estimator = _extract_estimator(model)
    tree_matrix = np.vstack([tree.predict(transformed) for tree in estimator.estimators_])
    tree_variances = np.var(tree_matrix, axis=0)
    _, _, contributions = ti.predict(estimator, transformed)

    summary_payload = {
        "dataset_version": DATASET_VERSION,
        "reference_dataset": str(PHASE3_REFERENCE_PATH),
        "model_artifact": str(repo_path("models", "model_v0.3-stable.pkl")),
        "n_samples": int(len(X)),
        "metrics": metric_summary,
        "variance_distribution": {
            "mean": float(np.mean(tree_variances)),
            "std": float(np.std(tree_variances)),
            "p25": float(np.percentile(tree_variances, 25)),
            "p50": float(np.percentile(tree_variances, 50)),
            "p75": float(np.percentile(tree_variances, 75)),
        },
    }

    with SUMMARY_PATH.open("w", encoding="utf-8") as handle:
        json.dump(summary_payload, handle, indent=2)
    predictions_df.to_csv(PREDICTIONS_PATH, index=False)
    residuals_df.to_csv(RESIDUALS_PATH, index=False)

    created_paths: list[Path] = [SUMMARY_PATH, PREDICTIONS_PATH, RESIDUALS_PATH]
    created_paths.extend(
        _export_plots(
            predictions_df=predictions_df,
            residuals_df=residuals_df,
            y_true=y_true,
            tree_variances=tree_variances,
            feature_names=feature_names,
            contributions=np.asarray(contributions, dtype=float),
        )
    )
    created_paths.append(_export_coating_summary())

    contract_snapshot = {
        "dataset_version": DATASET_VERSION,
        "request_schema": Phase3Input.model_json_schema(),
        "response_schema": Phase3PredictResponse.model_json_schema(),
    }
    with API_CONTRACT_SNAPSHOT_PATH.open("w", encoding="utf-8") as handle:
        json.dump(contract_snapshot, handle, indent=2)
    created_paths.append(API_CONTRACT_SNAPSHOT_PATH)

    print("=== PHASE 3 ARTIFACT EXPORT COMPLETE ===")
    if target_column is None:
        print("Target column not found; pred-vs-actual plot was skipped safely.")
    for path in created_paths:
        print(path)


if __name__ == "__main__":
    main()
