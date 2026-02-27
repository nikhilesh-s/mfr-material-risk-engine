"""FastAPI entrypoint for Phase 3 layered resistance inference."""

from __future__ import annotations

from typing import Any, Dict, Optional

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from phase3_coating_modifier import get_coating_modifier
from phase3_inference import (
    COMBUSTION_COLUMNS,
    RESISTANCE_NEGATIVE_COLUMNS,
    build_feature_vector,
    get_runtime_state,
    predict_material_resistance,
)
from model import (
    DATASET_VERSION,
    PHASE3_REFERENCE_PATH,
    compute_confidence,
    compute_training_variance_stats,
)


class Phase3Input(BaseModel):
    """Descriptor input schema for Phase 3 resistance prediction."""

    Density_g_cc: float
    Melting_Point_C: float
    Specific_Heat_J_g_C: float
    Thermal_Cond_W_mK: float
    CTE_um_m_C: float
    Flash_Point_C: float
    Autoignition_Temp_C: float
    UL94_Flammability: float
    Limiting_Oxygen_Index_pct: float
    Smoke_Density_Ds: float
    Char_Yield_pct: float
    Decomp_Temp_C: float
    Heat_of_Combustion_MJ_kg: float
    Flame_Spread_Index: float
    coating_code: Optional[str] = None


class DatasetOutput(BaseModel):
    version: str


class InterpretabilityOutput(BaseModel):
    prediction: float
    feature_contributions: Dict[str, float]
    top_3_drivers: list[dict[str, Any]]


class ConfidenceOutput(BaseModel):
    score: float
    label: str


class Phase3PredictResponse(BaseModel):
    resistanceScore: float
    effectiveResistance: float
    coatingModifier: Optional[float]
    dataset: DatasetOutput
    interpretability: InterpretabilityOutput
    confidence: ConfidenceOutput


app = FastAPI(
    title="Dravix Phase 3 Resistance API",
    version="0.3.0",
    docs_url="/docs",
    openapi_url="/openapi.json",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://mfr-material-risk-engine.vercel.app",
        "http://localhost:5173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _stable_float(value: float, digits: int = 12) -> float:
    return float(round(float(value), digits))


def _payload_dict(payload: Phase3Input) -> dict[str, Any]:
    if hasattr(payload, "model_dump"):
        raw = payload.model_dump(exclude_none=True)
    else:
        raw = payload.dict(exclude_none=True)
    return {
        "Density (g/cc)": raw["Density_g_cc"],
        "Melting Point (°C)": raw["Melting_Point_C"],
        "Specific Heat (J/g-°C)": raw["Specific_Heat_J_g_C"],
        "Thermal Cond. (W/m-K)": raw["Thermal_Cond_W_mK"],
        "CTE (µm/m-°C)": raw["CTE_um_m_C"],
        "Flash Point (°C)": raw["Flash_Point_C"],
        "Autoignition Temp (°C)": raw["Autoignition_Temp_C"],
        "UL94 Flammability": raw["UL94_Flammability"],
        "Limiting Oxygen Index (%)": raw["Limiting_Oxygen_Index_pct"],
        "Smoke Density (Ds)": raw["Smoke_Density_Ds"],
        "Char Yield (%)": raw["Char_Yield_pct"],
        "Decomp. Temp (°C)": raw["Decomp_Temp_C"],
        "Heat of Combustion (MJ/kg)": raw["Heat_of_Combustion_MJ_kg"],
        "Flame Spread Index": raw["Flame_Spread_Index"],
        "coating_code": raw.get("coating_code"),
    }


def _build_oriented_feature_frame(
    raw_df: pd.DataFrame,
    feature_names: list[str],
    bounds: dict[str, dict[str, float]],
) -> pd.DataFrame:
    oriented = pd.DataFrame(index=raw_df.index)
    for feature in feature_names:
        if feature in raw_df.columns:
            series = pd.to_numeric(raw_df[feature], errors="coerce")
        else:
            series = pd.Series(np.nan, index=raw_df.index, dtype=float)

        if feature in COMBUSTION_COLUMNS:
            min_value = bounds[feature]["min"]
            max_value = bounds[feature]["max"]
            normalized = pd.Series(np.nan, index=series.index, dtype=float)
            valid = series.notna()
            if np.isclose(max_value, min_value):
                normalized.loc[valid] = 0.0
            else:
                normalized.loc[valid] = (series.loc[valid] - min_value) / (
                    max_value - min_value
                )
            if feature in RESISTANCE_NEGATIVE_COLUMNS:
                oriented[feature] = 1.0 - normalized
            else:
                oriented[feature] = normalized
        else:
            oriented[feature] = series

    return oriented.reindex(columns=feature_names)


@app.on_event("startup")
def load_phase3_runtime() -> None:
    runtime = get_runtime_state()
    model = runtime["model"]
    feature_names = runtime["feature_names"]
    bounds = runtime["bounds"]

    if not PHASE3_REFERENCE_PATH.exists():
        raise FileNotFoundError(
            f"Missing Phase 3 reference dataset: {PHASE3_REFERENCE_PATH}"
        )

    raw_reference = pd.read_csv(PHASE3_REFERENCE_PATH, low_memory=False)
    reference_feature_frame = _build_oriented_feature_frame(
        raw_df=raw_reference,
        feature_names=feature_names,
        bounds=bounds,
    )
    variance_stats = compute_training_variance_stats(model, reference_feature_frame)

    app.state.model = model
    app.state.feature_names = feature_names
    app.state.training_variance_mean = variance_stats["training_variance_mean"]
    app.state.training_variance_std = variance_stats["training_variance_std"]

    print("=== PHASE 3 STARTUP CHECK ===")
    print("Dataset version:", DATASET_VERSION)
    print("Reference dataset path:", PHASE3_REFERENCE_PATH)
    print("Model loaded successfully")


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.get("/version")
def version() -> Dict[str, str]:
    return {
        "service": "Dravix Phase 3 Resistance API",
        "version": "0.3.0",
        "dataset_version": DATASET_VERSION,
    }


@app.post("/predict", response_model=Phase3PredictResponse)
def predict(input: Phase3Input) -> Dict[str, Any]:
    if not hasattr(app.state, "model"):
        raise HTTPException(status_code=500, detail="Model runtime is not initialized.")

    payload_data = _payload_dict(input)
    coating_code = payload_data.pop("coating_code", None)

    base_result = predict_material_resistance(payload_data)
    base_resistance = float(base_result["resistance_score"])

    feature_vector = build_feature_vector(payload_data)
    confidence = compute_confidence(
        model=app.state.model,
        feature_frame=feature_vector,
        training_variance_mean=float(app.state.training_variance_mean),
        training_variance_std=float(app.state.training_variance_std),
    )

    coating_modifier: float | None = None
    effective_resistance = base_resistance
    if coating_code is not None:
        try:
            coating_data = get_coating_modifier(str(coating_code))
        except KeyError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        coating_modifier = float(coating_data["coating_modifier"])
        effective_resistance = float(
            np.clip(base_resistance * (1.0 + coating_modifier), 0.0, 1.0)
        )

    stable_base = _stable_float(base_resistance)
    stable_effective = _stable_float(effective_resistance)
    stable_modifier = None if coating_modifier is None else _stable_float(coating_modifier)

    return {
        "resistanceScore": stable_base,
        "effectiveResistance": stable_effective,
        "coatingModifier": stable_modifier,
        "dataset": {"version": DATASET_VERSION},
        "interpretability": {
            "prediction": stable_base,
            "feature_contributions": {},
            "top_3_drivers": [],
        },
        "confidence": {
            "score": _stable_float(float(confidence["score"])),
            "label": str(confidence["label"]),
        },
    }
