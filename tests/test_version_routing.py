from __future__ import annotations

import importlib

import src.model as model_module
from src.model import (
    DATASET_VERSION,
    MATERIALS_LOOKUP_PATH,
    MODEL_ARTIFACT_PATH,
    MODEL_VERSION,
    PHASE3_REFERENCE_PATH,
    SUPPORTED_DATASET_VERSIONS,
    SUPPORTED_MODEL_VERSIONS,
)


def test_active_model_version_is_supported() -> None:
    assert MODEL_VERSION in SUPPORTED_MODEL_VERSIONS


def test_supported_versions_include_active_version() -> None:
    assert DATASET_VERSION in SUPPORTED_DATASET_VERSIONS


def test_runtime_paths_exist() -> None:
    assert MODEL_ARTIFACT_PATH.exists()
    assert PHASE3_REFERENCE_PATH.exists()
    assert MATERIALS_LOOKUP_PATH.exists()


def test_env_can_select_v04(monkeypatch) -> None:
    monkeypatch.setenv("DRAVIX_MODEL_VERSION", "v0.4")
    reloaded = importlib.reload(model_module)
    try:
        assert reloaded.MODEL_VERSION == "v0.4"
        assert reloaded.MODEL_ARTIFACT_PATH.name == "model_v0.4.pkl"
        assert reloaded.PHASE3_REFERENCE_PATH.name == "materials_dataset_clean.csv"
    finally:
        monkeypatch.delenv("DRAVIX_MODEL_VERSION", raising=False)
        importlib.reload(model_module)
