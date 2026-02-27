from __future__ import annotations

from src.model import (
    DATASET_VERSION,
    MATERIALS_LOOKUP_PATH,
    MODEL_ARTIFACT_PATH,
    PHASE3_REFERENCE_PATH,
    SUPPORTED_DATASET_VERSIONS,
)


def test_dataset_version_is_v03_stable() -> None:
    assert DATASET_VERSION == "v0.3-stable"


def test_supported_versions_include_active_version() -> None:
    assert DATASET_VERSION in SUPPORTED_DATASET_VERSIONS


def test_runtime_paths_exist() -> None:
    assert MODEL_ARTIFACT_PATH.exists()
    assert PHASE3_REFERENCE_PATH.exists()
    assert MATERIALS_LOOKUP_PATH.exists()
