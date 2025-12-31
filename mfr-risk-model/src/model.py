"""Model training and inference helpers for the MFR risk model."""

from __future__ import annotations

from typing import Dict, Tuple

import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split

from .features import FEATURE_COLUMNS, add_derived_features, prepare_feature_frame
from .utils import clean_fire_properties


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
    if score < 35:
        return "Low"
    if score < 65:
        return "Medium"
    return "High"


def predict_risk(
    model: RandomForestRegressor, example: Dict[str, float]
) -> Dict[str, object]:
    """Run inference for ``example`` and return UI-ready risk outputs."""
    feature_frame = prepare_feature_frame(example)
    score = float(model.predict(feature_frame)[0])
    score = max(0.0, min(100.0, score))
    risk_score = int(round(score))
    risk_class = classify_risk(risk_score)
    resistance_index = int(round(100 - risk_score))

    material_label = str(example.get("material_type", "material"))
    if risk_class == "Low":
        comparison = (
            f"Performs better than baseline {material_label} samples at this heat exposure."
        )
        interpretation = (
            "Ignition is unlikely during the specified exposure period, and thermal "
            "degradation should remain limited under these conditions."
        )
    elif risk_class == "Medium":
        comparison = (
            f"Performs in line with typical {material_label} behavior under similar exposure."
        )
        interpretation = (
            "Ignition is possible with sustained exposure. Expect moderate thermal "
            "degradation during the test window."
        )
    else:
        comparison = (
            f"Shows elevated risk compared to more fire-resistant {material_label} options."
        )
        interpretation = (
            "Ignition is likely under the specified exposure conditions, and rapid "
            "material degradation is expected."
        )

    return {
        "riskScore": risk_score,
        "riskClass": risk_class,
        "resistanceIndex": resistance_index,
        "comparison": comparison,
        "interpretation": interpretation,
    }


def train_risk_score_model(
    df: pd.DataFrame, random_state: int = 42
) -> Tuple[RandomForestRegressor, Dict[str, float], pd.DataFrame]:
    """Train a RandomForestRegressor to predict the proxy risk score."""
    cleaned, _ = clean_fire_properties(df)
    if "risk_score" not in cleaned.columns:
        raise ValueError("risk_score is missing from the cleaned dataset.")

    feature_cols = [col for col in cleaned.columns if col != "risk_score"]
    X = cleaned[feature_cols]
    y = cleaned["risk_score"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=random_state
    )
    model = RandomForestRegressor(random_state=random_state)
    model.fit(X_train, y_train)

    metrics = {
        "train_r2": model.score(X_train, y_train),
        "test_r2": model.score(X_test, y_test),
    }

    importances = pd.DataFrame(
        {
            "feature": feature_cols,
            "importance": model.feature_importances_,
        }
    ).sort_values("importance", ascending=False)

    return model, metrics, importances
