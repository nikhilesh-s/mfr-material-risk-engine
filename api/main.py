"""FastAPI entrypoint for Phase 3 layered resistance inference."""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.api_contract import (
    LoginInput,
    LoginResponse,
    MaterialsOutput,
    Phase3Input,
    Phase3PredictResponse,
)

from src.phase3_coating_modifier import get_coating_modifier
from src.phase3_inference import (
    COMBUSTION_COLUMNS,
    RESISTANCE_NEGATIVE_COLUMNS,
    build_feature_vector,
    get_runtime_state,
    predict_material_resistance,
)
from src.model import (
    DATASET_VERSION,
    MODEL_ARTIFACT_PATH,
    PHASE3_REFERENCE_PATH,
    compute_confidence,
    compute_feature_interpretability,
    compute_training_variance_stats,
    get_material_descriptors,
    get_material_names,
    initialize_dataset_metadata,
    inspect_model_schema,
    load_material_lookup,
)

ADMIN_EMAIL = "admin@dravix.ai"
ADMIN_PASSWORD = "Q9v$2mL!7xK@4pR#8tN^6dH"
MOCK_SESSION_TOKEN = "mock-session-token"
API_VERSION = "0.3.0"
BUILD_HASH = os.getenv("RENDER_GIT_COMMIT") or os.getenv("GIT_COMMIT") or "unknown"


app = FastAPI(
    title="Dravix Phase 3 Resistance API",
    version=API_VERSION,
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


def _fallback_interpretability(
    prediction: float,
    feature_names: list[str],
    error_message: str,
) -> dict[str, Any]:
    feature_contributions = {feature_name: 0.0 for feature_name in feature_names}
    if not feature_contributions:
        feature_contributions = {"_unavailable": 0.0}
    display_names = {
        feature_name: feature_name for feature_name in feature_contributions
    }

    top_3_drivers = [
        {
            "feature": feature_name,
            "contribution": 0.0,
            "direction": "increases_resistance",
            "abs_magnitude": 0.0,
        }
        for feature_name in list(feature_contributions.keys())[:3]
    ]
    while len(top_3_drivers) < 3:
        top_3_drivers.append(
            {
                "feature": "_unavailable",
                "contribution": 0.0,
                "direction": "increases_resistance",
                "abs_magnitude": 0.0,
            }
        )

    return {
        "prediction": _stable_float(prediction),
        "feature_contributions": feature_contributions,
        "top_3_drivers": top_3_drivers,
        "display_names": display_names,
        "error": {
            "type": "interpretability_error",
            "message": error_message,
        },
    }


def _manual_payload_dict(payload: Phase3Input) -> dict[str, Any]:
    if hasattr(payload, "model_dump"):
        raw = payload.model_dump(exclude_none=True)
    else:
        raw = payload.dict(exclude_none=True)
    source_to_feature = {
        "Density_g_cc": "Density (g/cc)",
        "Melting_Point_C": "Melting Point (°C)",
        "Specific_Heat_J_g_C": "Specific Heat (J/g-°C)",
        "Thermal_Cond_W_mK": "Thermal Cond. (W/m-K)",
        "CTE_um_m_C": "CTE (µm/m-°C)",
        "Flash_Point_C": "Flash Point (°C)",
        "Autoignition_Temp_C": "Autoignition Temp (°C)",
        "UL94_Flammability": "UL94 Flammability",
        "Limiting_Oxygen_Index_pct": "Limiting Oxygen Index (%)",
        "Smoke_Density_Ds": "Smoke Density (Ds)",
        "Char_Yield_pct": "Char Yield (%)",
        "Decomp_Temp_C": "Decomp. Temp (°C)",
        "Heat_of_Combustion_MJ_kg": "Heat of Combustion (MJ/kg)",
        "Flame_Spread_Index": "Flame Spread Index",
    }
    return {
        feature_name: raw[source_name]
        for source_name, feature_name in source_to_feature.items()
        if source_name in raw
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
    load_material_lookup()
    variance_stats = compute_training_variance_stats(model, reference_feature_frame)
    schema_info = inspect_model_schema(model, reference_df=raw_reference)
    metadata = initialize_dataset_metadata(
        model,
        schema_info=schema_info,
        variance_stats=variance_stats,
    )

    app.state.model = model
    app.state.feature_names = feature_names
    app.state.training_variance_mean = variance_stats["training_variance_mean"]
    app.state.training_variance_std = variance_stats["training_variance_std"]
    app.state.training_variance_p25 = variance_stats["training_variance_p25"]
    app.state.training_variance_p50 = variance_stats["training_variance_p50"]
    app.state.training_variance_p75 = variance_stats["training_variance_p75"]
    app.state.dataset_metadata = metadata
    app.state.model_loaded = True
    app.state.lookup_loaded = len(get_material_names()) > 0
    app.state.started_at_utc = datetime.now(timezone.utc).isoformat()


@app.get("/health")
def health() -> Dict[str, Any]:
    return {
        "status": "ok",
        "dataset_version": DATASET_VERSION,
        "model_loaded": bool(getattr(app.state, "model_loaded", False)),
        "lookup_loaded": bool(getattr(app.state, "lookup_loaded", False)),
    }


@app.get("/version")
def version() -> Dict[str, str]:
    return {
        "service": "Dravix Phase 3 Resistance API",
        "version": API_VERSION,
        "api_version": API_VERSION,
        "dataset_version": DATASET_VERSION,
        "model_artifact": MODEL_ARTIFACT_PATH.name,
        "build_hash": BUILD_HASH,
        "timestamp_utc": str(getattr(app.state, "started_at_utc", "unknown")),
    }


@app.get("/materials", response_model=MaterialsOutput)
def materials() -> Dict[str, list[str]]:
    return {"materials": get_material_names()}


@app.post("/login", response_model=LoginResponse)
def login(credentials: LoginInput) -> Dict[str, str]:
    if credentials.email != ADMIN_EMAIL or credentials.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail={"error": "Invalid credentials"})
    return {"token": MOCK_SESSION_TOKEN}


@app.post("/predict", response_model=Phase3PredictResponse)
def predict(input: Phase3Input) -> Dict[str, Any]:
    if not hasattr(app.state, "model"):
        raise HTTPException(status_code=500, detail="Model runtime is not initialized.")

    coating_code = input.coating_code
    if input.material_name is not None and input.material_name.strip():
        payload_data = get_material_descriptors(
            input.material_name,
            feature_names=list(app.state.feature_names),
        )
        if payload_data is None:
            return JSONResponse(
                status_code=404,
                content={"error": "Material not found in database"},
            )
    else:
        payload_data = _manual_payload_dict(input)

    base_result = predict_material_resistance(payload_data)
    base_resistance = float(base_result["resistance_score"])

    feature_vector = build_feature_vector(payload_data)
    try:
        interpretability_data = compute_feature_interpretability(
            model=app.state.model,
            feature_frame=feature_vector,
        )
        feature_contributions = {
            feature_name: _stable_float(contribution)
            for feature_name, contribution in interpretability_data["feature_contributions"].items()
        }
        display_names = {
            str(feature_name): str(display_name)
            for feature_name, display_name in interpretability_data.get(
                "display_names",
                {},
            ).items()
        }
        top_3_drivers = [
            {
                "feature": str(driver["feature"]),
                "contribution": _stable_float(driver["contribution"]),
                "direction": str(driver["direction"]),
                "abs_magnitude": _stable_float(driver["abs_magnitude"]),
            }
            for driver in interpretability_data["top_3_drivers"]
        ]
        interpretability = {
            "prediction": _stable_float(base_resistance),
            "feature_contributions": feature_contributions,
            "top_3_drivers": top_3_drivers,
            "display_names": display_names,
        }
    except Exception as exc:
        interpretability = _fallback_interpretability(
            prediction=base_resistance,
            feature_names=list(app.state.feature_names),
            error_message=str(exc),
        )

    confidence = compute_confidence(
        model=app.state.model,
        feature_frame=feature_vector,
        training_variance_mean=float(app.state.training_variance_mean),
        training_variance_std=float(app.state.training_variance_std),
        training_variance_p25=float(app.state.training_variance_p25),
        training_variance_p75=float(app.state.training_variance_p75),
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
        "interpretability": interpretability,
        "confidence": {
            "score": _stable_float(float(confidence["score"])),
            "label": str(confidence["label"]),
        },
    }
