import importlib

import pandas as pd
import pytest

import model as model_module


def _reload_model_module():
    return importlib.reload(model_module)


def test_default_dataset_version_is_v02_core(monkeypatch):
    monkeypatch.delenv("DRAVIX_DATASET_VERSION", raising=False)
    module = _reload_model_module()
    assert module.DATASET_VERSION == "v0.2-core"


def test_env_selects_v03_layered(monkeypatch):
    monkeypatch.setenv("DRAVIX_DATASET_VERSION", "v0.3-layered")
    module = _reload_model_module()
    assert module.DATASET_VERSION == "v0.3-layered"


def test_v03_builder_placeholder_raises(monkeypatch):
    monkeypatch.setenv("DRAVIX_DATASET_VERSION", "v0.3-layered")
    module = _reload_model_module()
    sample = pd.DataFrame({"risk_score": [1.0]})
    with pytest.raises(NotImplementedError, match="v0.3-layered not yet implemented"):
        module.build_feature_matrix(sample)
