"""Centralized dataset loading for runtime diagnostics."""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from src.utils import repo_path

MATERIALS_DATASET_PATH = repo_path("data", "phase3_model", "materials_phase3_ready.csv")
COATINGS_DATASET_PATH = repo_path("data", "coatings", "v0.3.1", "coatings_dataset_clean.csv")

MATERIAL_DATASET: pd.DataFrame | None = None
COATING_DATASET: pd.DataFrame | None = None


def load_datasets() -> tuple[pd.DataFrame, pd.DataFrame]:
    global MATERIAL_DATASET
    global COATING_DATASET

    if MATERIAL_DATASET is None:
        MATERIAL_DATASET = pd.read_csv(Path(MATERIALS_DATASET_PATH), low_memory=False)
    if COATING_DATASET is None:
        COATING_DATASET = pd.read_csv(Path(COATINGS_DATASET_PATH), low_memory=False)

    return MATERIAL_DATASET, COATING_DATASET
