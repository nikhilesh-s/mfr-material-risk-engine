"""Model training and inference helpers for the MFR risk model."""

from __future__ import annotations

from typing import Dict, Tuple

import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split

from .features import FEATURE_COLUMNS, add_derived_features, prepare_feature_frame


def train_risk_model(
    df: pd.DataFrame, random_state: int = 42
) -> Tuple[RandomForestRegressor, Tuple[pd.DataFrame, pd.Series]]:
    """Fit a RandomForestRegressor on the provided dataset and return the model."""
    dataset = add_derived_features(df)
    X = dataset[FEATURE_COLUMNS]
    y = dataset["risk_score"]
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=random_state
    )
    model = RandomForestRegressor(random_state=random_state)
    model.fit(X_train, y_train)
    return model, (X_test, y_test)


def classify_risk(score: float) -> str:
    """Map a numeric risk score to Low, Medium, or High."""
    if score <= 33:
        return "Low"
    if score <= 66:
        return "Medium"
    return "High"


def predict_risk(
    model: RandomForestRegressor, example: Dict[str, float]
) -> Dict[str, object]:
    """Run inference for ``example`` and return risk and resistance metrics."""
    feature_frame = prepare_feature_frame(example)
    score = float(model.predict(feature_frame)[0])
    risk_class = classify_risk(score)
    resistance_index = 100 - score
    return {
        "input": example,
        "risk_score": round(score, 2),
        "risk_class": risk_class,
        "resistance_index": round(resistance_index, 2),
    }
