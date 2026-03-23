"""Centralized model loading for the deployed backend."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from src.model import load_phase3_model
from src.utils import repo_path

MODEL_PATH = repo_path("models", "model_v0.3-stable.pkl")
MODEL: Any | None = None
FEATURE_NAMES: list[str] = []


def load_model() -> Any:
    global MODEL
    global FEATURE_NAMES

    if MODEL is not None:
        return MODEL

    model = load_phase3_model(Path(MODEL_PATH))
    MODEL = model
    FEATURE_NAMES = list(model.feature_names_in_)
    return MODEL
