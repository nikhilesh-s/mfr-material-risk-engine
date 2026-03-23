"""Train a deterministic Dravix model artifact from versioned clean datasets."""

from __future__ import annotations

import json
import pickle
import re
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline


REPO_ROOT = Path(__file__).resolve().parents[1]
TRAINING_DATASET_PATH = (
    REPO_ROOT / "data" / "materials" / "v0.3.1" / "materials_dataset_clean.csv"
)
LEGACY_LABEL_SOURCE_PATH = (
    REPO_ROOT / "data" / "materials" / "v0.3" / "materials_dataset.csv"
)
MODEL_OUTPUT_PATH = REPO_ROOT / "models" / "model_v0.4.pkl"
METADATA_OUTPUT_PATH = REPO_ROOT / "models" / "model_v0.4_metadata.json"

MODEL_VERSION = "v0.4"
TRAINING_DATASET_VERSION = "materials v0.3.1"
TARGET_COLUMN = "Base_Resistance_Target"
RANDOM_STATE = 42

FEATURE_COLUMNS = [
    "Density (g/cc)",
    "Melting Point (°C)",
    "Specific Heat (J/g-°C)",
    "Thermal Cond. (W/m-K)",
    "CTE (µm/m-°C)",
    "Flash Point (°C)",
    "Autoignition Temp (°C)",
    "Limiting Oxygen Index (%)",
    "Smoke Density (Ds)",
    "Char Yield (%)",
    "Decomp. Temp (°C)",
    "Heat of Combustion (MJ/kg)",
    "Flame Spread Index",
]


def _normalize_material_name(value: object) -> str:
    text = str(value).strip().lower()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _load_training_frame() -> tuple[pd.DataFrame, dict[str, int]]:
    if not TRAINING_DATASET_PATH.exists():
        raise FileNotFoundError(f"Missing training dataset: {TRAINING_DATASET_PATH}")
    if not LEGACY_LABEL_SOURCE_PATH.exists():
        raise FileNotFoundError(f"Missing legacy label source: {LEGACY_LABEL_SOURCE_PATH}")

    clean_df = pd.read_csv(TRAINING_DATASET_PATH, low_memory=False)
    missing_features = [column for column in FEATURE_COLUMNS if column not in clean_df.columns]
    if missing_features:
        raise ValueError(
            "Training dataset is missing required feature columns: "
            + ", ".join(missing_features)
        )

    if TARGET_COLUMN in clean_df.columns:
        working_df = clean_df.copy()
        lineage = {
            "clean_rows_loaded": int(len(clean_df)),
            "legacy_rows_loaded": 0,
            "target_rows_from_clean_dataset": int(
                pd.to_numeric(clean_df[TARGET_COLUMN], errors="coerce").notna().sum()
            ),
            "target_rows_from_legacy_join": 0,
            "rows_dropped_missing_target": 0,
        }
        return working_df, lineage

    legacy_df = pd.read_csv(LEGACY_LABEL_SOURCE_PATH, low_memory=False)
    if "Material Name" not in legacy_df.columns or TARGET_COLUMN not in legacy_df.columns:
        raise ValueError(
            "Legacy label source must contain 'Material Name' and "
            f"'{TARGET_COLUMN}' columns."
        )

    legacy_targets = (
        legacy_df.assign(
            _material_key=legacy_df["Material Name"].map(_normalize_material_name),
            **{TARGET_COLUMN: pd.to_numeric(legacy_df[TARGET_COLUMN], errors="coerce")},
        )[["_material_key", TARGET_COLUMN]]
        .dropna(subset=["_material_key", TARGET_COLUMN])
        .drop_duplicates(subset=["_material_key"], keep="first")
    )

    working_df = clean_df.copy()
    working_df["_material_key"] = working_df["Material"].map(_normalize_material_name)
    working_df = working_df.merge(legacy_targets, on="_material_key", how="left")

    target_rows = int(working_df[TARGET_COLUMN].notna().sum())
    dropped_rows = int(len(working_df) - target_rows)
    lineage = {
        "clean_rows_loaded": int(len(clean_df)),
        "legacy_rows_loaded": int(len(legacy_df)),
        "target_rows_from_clean_dataset": 0,
        "target_rows_from_legacy_join": target_rows,
        "rows_dropped_missing_target": dropped_rows,
    }
    return working_df, lineage


def _prepare_training_matrices(training_df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series, int]:
    working_df = training_df.copy()
    for column in FEATURE_COLUMNS:
        working_df[column] = pd.to_numeric(working_df[column], errors="coerce")
    working_df[TARGET_COLUMN] = pd.to_numeric(working_df[TARGET_COLUMN], errors="coerce")

    aligned = working_df[FEATURE_COLUMNS + [TARGET_COLUMN]].dropna(subset=[TARGET_COLUMN]).copy()
    dropped_missing_target = int(len(working_df) - len(aligned))
    if aligned.empty:
        raise ValueError("No labeled training rows were available after target alignment.")

    features = aligned[FEATURE_COLUMNS]
    target = aligned[TARGET_COLUMN]
    return features, target, dropped_missing_target


def train_model() -> dict[str, object]:
    training_df, lineage = _load_training_frame()
    features, target, dropped_missing_target = _prepare_training_matrices(training_df)
    lineage["rows_dropped_missing_target"] = dropped_missing_target

    pipeline = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            (
                "model",
                RandomForestRegressor(
                    n_estimators=300,
                    random_state=RANDOM_STATE,
                    n_jobs=-1,
                ),
            ),
        ]
    )
    pipeline.fit(features, target)

    MODEL_OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with MODEL_OUTPUT_PATH.open("wb") as handle:
        pickle.dump(pipeline, handle)

    training_timestamp = datetime.now(timezone.utc).isoformat()
    metadata = {
        "model_version": MODEL_VERSION,
        "training_dataset": TRAINING_DATASET_VERSION,
        "training_dataset_version": "v0.3.1",
        "training_dataset_path": str(TRAINING_DATASET_PATH.relative_to(REPO_ROOT)),
        "target_column": TARGET_COLUMN,
        "target_source": "legacy_join_from_materials_v0.3"
        if lineage["target_rows_from_legacy_join"] > 0
        else "embedded_in_clean_dataset",
        "target_source_path": str(LEGACY_LABEL_SOURCE_PATH.relative_to(REPO_ROOT)),
        "training_rows": int(len(features)),
        "training_columns": int(len(features.columns)),
        "feature_count": int(len(FEATURE_COLUMNS)),
        "feature_list": FEATURE_COLUMNS,
        "training_timestamp": training_timestamp,
        "random_state": RANDOM_STATE,
        "deterministic": True,
        "lineage": lineage,
        "artifact_path": str(MODEL_OUTPUT_PATH.relative_to(REPO_ROOT)),
    }
    METADATA_OUTPUT_PATH.write_text(json.dumps(metadata, indent=2), encoding="utf-8")

    return metadata


def main() -> None:
    metadata = train_model()
    print("Trained Dravix model artifact")
    print(f"  model_version: {metadata['model_version']}")
    print(f"  training_dataset: {metadata['training_dataset']}")
    print(f"  training_rows: {metadata['training_rows']}")
    print(f"  feature_count: {metadata['feature_count']}")
    print(f"  artifact_path: {metadata['artifact_path']}")
    print(f"  metadata_path: {METADATA_OUTPUT_PATH.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
