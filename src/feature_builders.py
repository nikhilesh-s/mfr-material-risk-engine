"""Versioned feature matrix builders for dataset evolution scaffolding."""

from __future__ import annotations

import pandas as pd


def build_features_v02(dataframe: pd.DataFrame) -> pd.DataFrame:
    """Return the current v0.2 feature matrix (all columns except target)."""
    feature_cols = [col for col in dataframe.columns if col != "risk_score"]
    return dataframe[feature_cols]


def build_features_v03(dataframe: pd.DataFrame) -> pd.DataFrame:
    """Placeholder for Phase 3 descriptor-based feature construction."""
    raise NotImplementedError("v0.3-layered not yet implemented")
