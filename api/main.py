"""FastAPI entrypoint for Phase 3 layered resistance inference."""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.api_contract import (
    CoatingsOutput,
    ExportRequest,
    ExportResponse,
    FeatureSchemaResponse,
    LoginInput,
    LoginResponse,
    MaterialsOutput,
    ModelMetadataResponse,
    Phase3Input,
    Phase3PredictResponse,
    RankRequest,
    RankResponse,
    RuntimeStatusResponse,
    SimulationRequest,
    SimulationResponse,
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
    DATASET_BUILD_DATE,
    MODEL_ARTIFACT_PATH,
    MODEL_VERSION,
    PHASE3_REFERENCE_PATH,
    COATINGS_LOOKUP_PATH,
    MATERIALS_LOOKUP_PATH,
    compute_confidence,
    compute_feature_interpretability,
    compute_training_variance_stats,
    get_coating_names,
    get_material_descriptors,
    get_material_names,
    initialize_dataset_metadata,
    inspect_model_schema,
    load_coating_lookup,
    load_material_lookup,
)

ADMIN_EMAIL = "admin@dravix.ai"
ADMIN_PASSWORD = "Q9v$2mL!7xK@4pR#8tN^6dH"
MOCK_SESSION_TOKEN = "mock-session-token"
API_VERSION = "0.3.0"
BUILD_HASH = os.getenv("RENDER_GIT_COMMIT") or os.getenv("GIT_COMMIT") or "unknown"
LIMITATIONS_NOTICE = (
    "Dravix is an early-stage decision-support system. Results are deterministic screening "
    "signals and do not replace certification, standards testing, or engineering review."
)
USE_CASE_CONTEXTS = [
    "EV battery enclosure",
    "Fire-resistant building polymers",
    "Aerospace interior materials",
    "Industrial manufacturing materials",
]

logger = logging.getLogger("uvicorn.error")


app = FastAPI(
    title="Dravix Phase 3 Resistance API",
    version=API_VERSION,
    docs_url="/docs",
    openapi_url="/openapi.json",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://dravix-engine.materiamse.com",
        "https://mfr-material-risk-engine.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _stable_float(value: float, digits: int = 12) -> float:
    return float(round(float(value), digits))


def _to_resistance_index(value: float) -> float:
    return _stable_float(np.clip(float(value), 0.0, 1.0) * 100.0)


def _to_risk_score(value: float) -> float:
    return _stable_float((1.0 - np.clip(float(value), 0.0, 1.0)) * 100.0)


def _feature_display_name(feature_name: str, interpretability: dict[str, Any] | None = None) -> str:
    if interpretability is not None:
        display_names = interpretability.get("display_names") or {}
        if feature_name in display_names:
            return str(display_names[feature_name])
    return str(feature_name)


def _driver_note(driver: dict[str, Any], interpretability: dict[str, Any] | None = None) -> str:
    feature_name = _feature_display_name(str(driver["feature"]), interpretability)
    if str(driver["direction"]) == "increases_resistance":
        return f"{feature_name} supports lower fire-risk proxy."
    return f"{feature_name} increases fire-risk pressure."


def _build_prediction_notes(
    confidence_label: str,
    top_drivers: list[dict[str, Any]],
    interpretability: dict[str, Any] | None,
    coating_code: str | None,
    use_case: str | None,
) -> list[str]:
    notes = [f"{confidence_label} confidence screening output."]
    if top_drivers:
        notes.append(_driver_note(top_drivers[0], interpretability))
    if coating_code:
        notes.append(f"Coating adjustment applied using {coating_code}.")
    if use_case:
        notes.append(f"Use-case framing applied for {use_case}.")
    notes.append("Use Dravix to prioritize testing, not to certify materials.")
    return notes


def _build_prediction_explanation(
    material_name: str,
    risk_score: float,
    confidence_label: str,
    top_drivers: list[dict[str, Any]],
    interpretability: dict[str, Any] | None,
    use_case: str | None,
) -> str:
    context_prefix = (
        f"For the {use_case} workflow, "
        if use_case
        else ""
    )
    if not top_drivers:
        return (
            f"{context_prefix}{material_name} produced a Dravix fire-risk proxy score of "
            f"{risk_score:.1f} with {confidence_label.lower()} confidence."
        )

    top_driver = top_drivers[0]
    driver_name = _feature_display_name(str(top_driver["feature"]), interpretability)
    if str(top_driver["direction"]) == "increases_resistance":
        driver_effect = "supported lower risk"
    else:
        driver_effect = "pushed the risk score upward"
    return (
        f"{context_prefix}{material_name} produced a Dravix fire-risk proxy score of "
        f"{risk_score:.1f} with {confidence_label.lower()} confidence. "
        f"The strongest driver was {driver_name}, which {driver_effect}."
    )


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


def _rank_material_label(payload: Phase3Input, index: int) -> str:
    if payload.material_name is not None and payload.material_name.strip():
        return payload.material_name.strip()
    return f"manual_input_{index}"


def _extract_rank_error_message(response: JSONResponse) -> str:
    try:
        payload = json.loads(response.body.decode("utf-8"))
    except (AttributeError, UnicodeDecodeError, json.JSONDecodeError):
        return "prediction failed"

    if isinstance(payload, dict):
        error_value = payload.get("error")
        if isinstance(error_value, str) and error_value.strip():
            return error_value
        detail_value = payload.get("detail")
        if isinstance(detail_value, str) and detail_value.strip():
            return detail_value
    return "prediction failed"


def _effective_use_case(request_use_case: str | None, payload_use_case: str | None) -> str | None:
    candidate = request_use_case or payload_use_case
    if candidate is None:
        return None
    cleaned = candidate.strip()
    return cleaned or None


def _resolve_phase3_payload(payload: Phase3Input) -> dict[str, Any]:
    if not hasattr(app.state, "model"):
        raise HTTPException(status_code=500, detail="Model runtime is not initialized.")

    if payload.material_name is not None and payload.material_name.strip():
        payload_data = get_material_descriptors(
            payload.material_name,
            feature_names=list(app.state.feature_names),
        )
        if payload_data is None:
            raise HTTPException(status_code=404, detail="Material not found in database")
        return payload_data

    return _manual_payload_dict(payload)


def _predict_resistance_and_confidence(payload_data: dict[str, Any]) -> tuple[float, str]:
    prediction = predict_material_resistance(payload_data)
    resistance_score = float(prediction["resistance_score"])
    feature_vector = build_feature_vector(payload_data)
    confidence = compute_confidence(
        model=app.state.model,
        feature_frame=feature_vector,
        training_variance_mean=float(app.state.training_variance_mean),
        training_variance_std=float(app.state.training_variance_std),
        training_variance_p25=float(app.state.training_variance_p25),
        training_variance_p75=float(app.state.training_variance_p75),
    )
    return resistance_score, str(confidence["label"])


def _predict_batch_resistance_and_confidence(
    payloads_data: list[dict[str, Any]],
) -> tuple[list[float], list[str]]:
    if not payloads_data:
        return [], []

    feature_frames = [build_feature_vector(payload_data) for payload_data in payloads_data]
    batch_feature_frame = pd.concat(feature_frames, ignore_index=True)
    model = app.state.model
    predictions = [float(value) for value in model.predict(batch_feature_frame)]

    confidence_labels: list[str] = []
    for row_index in range(len(payloads_data)):
        row_feature_frame = batch_feature_frame.iloc[[row_index]]
        confidence = compute_confidence(
            model=model,
            feature_frame=row_feature_frame,
            training_variance_mean=float(app.state.training_variance_mean),
            training_variance_std=float(app.state.training_variance_std),
            training_variance_p25=float(app.state.training_variance_p25),
            training_variance_p75=float(app.state.training_variance_p75),
        )
        confidence_labels.append(str(confidence["label"]))

    return predictions, confidence_labels


def _material_name_for_response(payload: Phase3Input, payload_data: dict[str, Any]) -> str:
    if payload.material_name is not None and payload.material_name.strip():
        return payload.material_name.strip()
    inferred = payload_data.get("Material Name")
    if isinstance(inferred, str) and inferred.strip():
        return inferred.strip()
    inferred = payload_data.get("Material")
    if isinstance(inferred, str) and inferred.strip():
        return inferred.strip()
    return "Manual input"


def _dominant_modified_feature(
    payload_data: dict[str, Any],
    modifications: dict[str, float | str],
) -> str:
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

    best_feature = "descriptor update"
    best_magnitude = -1.0

    for source_field, raw_change in modifications.items():
        feature_name = source_to_feature.get(source_field)
        if feature_name is None:
            continue
        baseline_value = payload_data.get(feature_name)
        if isinstance(raw_change, str) and raw_change.strip().endswith("%"):
            try:
                magnitude = abs(float(raw_change.strip()[:-1]))
            except ValueError:
                magnitude = 0.0
        else:
            try:
                changed_value = float(raw_change)
            except (TypeError, ValueError):
                magnitude = 0.0
            else:
                if baseline_value is None or pd.isna(baseline_value):
                    magnitude = abs(changed_value)
                elif np.isclose(float(baseline_value), 0.0):
                    magnitude = abs(changed_value - float(baseline_value))
                else:
                    magnitude = abs((changed_value - float(baseline_value)) / float(baseline_value)) * 100.0

        if magnitude > best_magnitude:
            best_magnitude = magnitude
            best_feature = feature_name

    return best_feature


def _predict_response_payload(input: Phase3Input, use_case: str | None = None) -> dict[str, Any]:
    if not hasattr(app.state, "model"):
        raise HTTPException(status_code=500, detail="Model runtime is not initialized.")

    coating_code = input.coating_code.strip() if input.coating_code else None
    payload_data = _resolve_phase3_payload(input)
    material_name = _material_name_for_response(input, payload_data)

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
            for feature_name, display_name in interpretability_data.get("display_names", {}).items()
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
        effective_resistance = float(np.clip(base_resistance * (1.0 + coating_modifier), 0.0, 1.0))

    stable_base = _stable_float(base_resistance)
    stable_effective = _stable_float(effective_resistance)
    stable_modifier = None if coating_modifier is None else _stable_float(coating_modifier)
    risk_score = _to_risk_score(stable_effective)
    resistance_index = _to_resistance_index(stable_effective)
    top_drivers = list(interpretability["top_3_drivers"])
    effective_use_case = _effective_use_case(use_case, input.use_case)
    notes = _build_prediction_notes(
        confidence_label=str(confidence["label"]),
        top_drivers=top_drivers,
        interpretability=interpretability,
        coating_code=coating_code,
        use_case=effective_use_case,
    )

    return {
        "material_name": material_name,
        "use_case": effective_use_case,
        "risk_score": risk_score,
        "resistance_index": resistance_index,
        "top_drivers": top_drivers,
        "explanation": _build_prediction_explanation(
            material_name=material_name,
            risk_score=risk_score,
            confidence_label=str(confidence["label"]),
            top_drivers=top_drivers,
            interpretability=interpretability,
            use_case=effective_use_case,
        ),
        "notes": notes,
        "limitations_notice": LIMITATIONS_NOTICE,
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


def _apply_simulation_modifications(
    payload_data: dict[str, Any],
    modifications: dict[str, float | str],
) -> dict[str, Any]:
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

    modified_payload = dict(payload_data)
    for source_field, raw_change in modifications.items():
        if source_field not in source_to_feature:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported modification field: {source_field}",
            )

        feature_name = source_to_feature[source_field]
        if isinstance(raw_change, str):
            change_str = raw_change.strip()
            if not change_str.endswith("%"):
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid percentage adjustment for {source_field}",
                )
            try:
                percent_delta = float(change_str[:-1])
            except ValueError as exc:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid percentage adjustment for {source_field}",
                ) from exc

            current_value = modified_payload.get(feature_name)
            if current_value is None or pd.isna(current_value):
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Cannot apply percentage adjustment to missing field: {source_field}"
                    ),
                )
            modified_payload[feature_name] = float(current_value) * (
                1.0 + percent_delta / 100.0
            )
        else:
            try:
                modified_payload[feature_name] = float(raw_change)
            except (TypeError, ValueError) as exc:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid modification value for {source_field}",
                ) from exc

    return modified_payload


def _payload_value_changed(
    baseline_value: Any,
    modified_value: Any,
) -> bool:
    if baseline_value is None and modified_value is None:
        return False
    if baseline_value is None or modified_value is None:
        return True
    if pd.isna(baseline_value) and pd.isna(modified_value):
        return False
    if pd.isna(baseline_value) or pd.isna(modified_value):
        return True
    try:
        return not np.isclose(float(baseline_value), float(modified_value))
    except (TypeError, ValueError):
        return baseline_value != modified_value


def _simulation_payload_changed(
    base_payload: dict[str, Any],
    modified_payload: dict[str, Any],
    modifications: dict[str, float | str],
) -> bool:
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
    for source_field in modifications:
        feature_name = source_to_feature.get(source_field)
        if feature_name is None:
            continue
        if _payload_value_changed(
            base_payload.get(feature_name),
            modified_payload.get(feature_name),
        ):
            return True
    return False


def _feature_vector_changed(
    base_payload: dict[str, Any],
    modified_payload: dict[str, Any],
) -> bool:
    base_vector = build_feature_vector(base_payload)
    modified_vector = build_feature_vector(modified_payload)
    base_row = base_vector.iloc[0].to_numpy(dtype=float, na_value=np.nan)
    modified_row = modified_vector.iloc[0].to_numpy(dtype=float, na_value=np.nan)
    return not np.allclose(base_row, modified_row, equal_nan=True)


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
    load_coating_lookup()
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
    app.state.reference_row_count = int(len(raw_reference))
    app.state.material_lookup_row_count = int(len(get_material_names()))
    app.state.coating_lookup_row_count = int(len(get_coating_names()))
    app.state.active_paths = {
        "reference_dataset": str(PHASE3_REFERENCE_PATH),
        "materials_lookup": str(MATERIALS_LOOKUP_PATH),
        "coatings_lookup": str(COATINGS_LOOKUP_PATH),
        "model_artifact": str(MODEL_ARTIFACT_PATH),
    }
    logger.info("Dravix runtime starting")
    logger.info("Model artifact: %s", MODEL_ARTIFACT_PATH)
    logger.info("Reference dataset: %s", PHASE3_REFERENCE_PATH)
    logger.info("Model version: %s", MODEL_VERSION)
    logger.info("Dataset version: %s", DATASET_VERSION)
    logger.info("Feature count: %d", len(feature_names))


@app.get("/health")
def health() -> Dict[str, Any]:
    return {
        "status": "ok",
        "dataset_version": DATASET_VERSION,
        "model_loaded": bool(getattr(app.state, "model_loaded", False)),
        "lookup_loaded": bool(getattr(app.state, "lookup_loaded", False)),
    }


@app.get("/runtime-status", response_model=RuntimeStatusResponse)
def runtime_status() -> Dict[str, Any]:
    return {
        "model_version": MODEL_VERSION,
        "dataset_version": DATASET_VERSION,
        "dataset_rows": int(getattr(app.state, "reference_row_count", 0)),
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


@app.get("/schema", response_model=FeatureSchemaResponse)
def schema() -> Dict[str, list[str]]:
    return {
        "model_features": list(getattr(app.state, "feature_names", [])),
        "accepted_request_fields": [
            "material_name",
            "coating_code",
            "use_case",
            "Density_g_cc",
            "Melting_Point_C",
            "Specific_Heat_J_g_C",
            "Thermal_Cond_W_mK",
            "CTE_um_m_C",
            "Flash_Point_C",
            "Autoignition_Temp_C",
            "UL94_Flammability",
            "Limiting_Oxygen_Index_pct",
            "Smoke_Density_Ds",
            "Char_Yield_pct",
            "Decomp_Temp_C",
            "Heat_of_Combustion_MJ_kg",
            "Flame_Spread_Index",
        ],
    }


@app.get("/model-metadata", response_model=ModelMetadataResponse)
def model_metadata() -> Dict[str, Any]:
    return {
        "service": "Dravix Phase 3 Resistance API",
        "api_version": API_VERSION,
        "model_type": "RandomForestRegressor pipeline",
        "model_artifact": MODEL_ARTIFACT_PATH.name,
        "model_version": MODEL_VERSION,
        "dataset_version": DATASET_VERSION,
        "dataset_build_date": DATASET_BUILD_DATE,
        "deterministic": True,
        "feature_names": list(getattr(app.state, "feature_names", [])),
        "feature_count": int(len(getattr(app.state, "feature_names", []))),
        "row_counts": {
            "reference_dataset_rows": int(getattr(app.state, "reference_row_count", 0)),
            "materials_lookup_rows": int(getattr(app.state, "material_lookup_row_count", 0)),
            "coatings_lookup_rows": int(getattr(app.state, "coating_lookup_row_count", 0)),
        },
        "active_paths": dict(getattr(app.state, "active_paths", {})),
        "timestamp_utc": str(getattr(app.state, "started_at_utc", "unknown")),
    }


@app.get("/materials", response_model=MaterialsOutput)
def materials() -> Dict[str, list[str]]:
    return {"materials": get_material_names()}


@app.get("/coatings", response_model=CoatingsOutput)
def coatings() -> Dict[str, list[str]]:
    return {"coatings": get_coating_names()}


@app.post("/login", response_model=LoginResponse)
def login(credentials: LoginInput) -> Dict[str, str]:
    if credentials.email != ADMIN_EMAIL or credentials.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail={"error": "Invalid credentials"})
    return {"token": MOCK_SESSION_TOKEN}


@app.post("/predict", response_model=Phase3PredictResponse)
def predict(input: Phase3Input) -> Dict[str, Any]:
    return _predict_response_payload(input)


@app.post("/rank", response_model=RankResponse)
def rank(request: RankRequest) -> Dict[str, Any]:
    ranking_rows: list[dict[str, Any]] = []
    errors: list[dict[str, str]] = []
    effective_use_case = _effective_use_case(request.use_case, None)
    resolved_batch: list[tuple[str, Phase3Input, dict[str, Any]]] = []

    for index, material_input in enumerate(request.materials, start=1):
        material_label = _rank_material_label(material_input, index)

        try:
            payload_data = _resolve_phase3_payload(material_input)
        except HTTPException as exc:
            detail = exc.detail
            if isinstance(detail, str) and detail.strip():
                error_message = detail
            else:
                error_message = "prediction failed"
            errors.append({"material": material_label, "error": error_message})
            continue
        except Exception:
            errors.append({"material": material_label, "error": "prediction failed"})
            continue

        resolved_batch.append((material_label, material_input, payload_data))

    if resolved_batch:
        batch_payloads = [payload_data for _, _, payload_data in resolved_batch]
        batch_predictions, batch_confidences = _predict_batch_resistance_and_confidence(
            batch_payloads
        )

        for row_index, (material_label, material_input, payload_data) in enumerate(resolved_batch):
            base_resistance = float(batch_predictions[row_index])
            confidence_label = str(batch_confidences[row_index])
            coating_code = material_input.coating_code.strip() if material_input.coating_code else None
            effective_resistance = base_resistance

            if coating_code is not None:
                try:
                    coating_data = get_coating_modifier(str(coating_code))
                except KeyError as exc:
                    errors.append({"material": material_label, "error": str(exc)})
                    continue
                coating_modifier = float(coating_data["coating_modifier"])
                effective_resistance = float(
                    np.clip(base_resistance * (1.0 + coating_modifier), 0.0, 1.0)
                )

            stable_effective = _stable_float(effective_resistance)
            ranking_rows.append(
                {
                    "material": material_label,
                    "material_name": _material_name_for_response(material_input, payload_data),
                    "resistanceScore": stable_effective,
                    "resistance_index": _to_resistance_index(stable_effective),
                    "risk_score": _to_risk_score(stable_effective),
                    "confidence": confidence_label,
                    "notes": f"{confidence_label} confidence screening output.",
                }
            )

    ranking_rows.sort(key=lambda item: (item["risk_score"], item["material_name"]))
    ranking = [
        {"rank": rank_index, **row}
        for rank_index, row in enumerate(ranking_rows, start=1)
    ]

    return {
        "use_case": effective_use_case,
        "ranking": ranking,
        "errors": errors,
    }


@app.post("/simulate", response_model=SimulationResponse)
def simulate(request: SimulationRequest) -> Dict[str, Any]:
    base_payload = _resolve_phase3_payload(request.base_material)
    modified_payload = _apply_simulation_modifications(
        payload_data=base_payload,
        modifications=request.modifications,
    )
    payload_changed = _simulation_payload_changed(
        base_payload=base_payload,
        modified_payload=modified_payload,
        modifications=request.modifications,
    )
    if not payload_changed:
        raise HTTPException(
            status_code=400,
            detail="Simulation modifications did not change the base material values.",
        )

    feature_vector_changed = _feature_vector_changed(
        base_payload=base_payload,
        modified_payload=modified_payload,
    )
    if not feature_vector_changed:
        raise HTTPException(
            status_code=400,
            detail="Simulation modifications did not produce a new model feature vector.",
        )

    baseline_score, baseline_confidence = _predict_resistance_and_confidence(base_payload)
    modified_score, modified_confidence = _predict_resistance_and_confidence(
        modified_payload
    )

    delta = modified_score - baseline_score
    if np.isclose(baseline_score, 0.0):
        percent_change: float | None = None
    else:
        percent_change = (delta / baseline_score) * 100.0

    baseline_risk_raw = (1.0 - np.clip(float(baseline_score), 0.0, 1.0)) * 100.0
    modified_risk_raw = (1.0 - np.clip(float(modified_score), 0.0, 1.0)) * 100.0
    baseline_risk = _stable_float(baseline_risk_raw)
    modified_risk = _stable_float(modified_risk_raw)
    risk_delta = modified_risk_raw - baseline_risk_raw
    if np.isclose(baseline_risk_raw, 0.0):
        risk_percent_change: float | None = None
    else:
        risk_percent_change = (risk_delta / baseline_risk_raw) * 100.0

    dominant_driver = _dominant_modified_feature(base_payload, request.modifications)
    effective_use_case = _effective_use_case(request.use_case, request.base_material.use_case)
    material_name = _material_name_for_response(request.base_material, base_payload)
    if np.isclose(risk_delta, 0.0):
        outcome_phrase = (
            "accepted the requested descriptor update, but the current model region "
            "did not materially change the fire-risk proxy"
        )
    elif risk_delta < 0:
        outcome_phrase = "reduced the fire-risk proxy"
    else:
        outcome_phrase = "increased the fire-risk proxy"

    return {
        "use_case": effective_use_case,
        "baseline": {
            "resistanceScore": _stable_float(baseline_score),
            "confidence": baseline_confidence,
            "risk_score": baseline_risk,
            "resistance_index": _to_resistance_index(baseline_score),
        },
        "modified": {
            "resistanceScore": _stable_float(modified_score),
            "confidence": modified_confidence,
            "risk_score": modified_risk,
            "resistance_index": _to_resistance_index(modified_score),
        },
        "change": {
            "delta": _stable_float(delta),
            "percent_change": (
                None
                if percent_change is None
                else _stable_float(percent_change)
            ),
            "risk_delta": _stable_float(risk_delta),
            "risk_percent_change": (
                None
                if risk_percent_change is None
                else _stable_float(risk_percent_change)
            ),
        },
        "dominant_driver": dominant_driver,
        "explanation": (
            f"{material_name} {outcome_phrase}. The largest requested change was {dominant_driver}."
            f" Baseline score: {_stable_float(baseline_score)}."
            f" Modified score: {_stable_float(modified_score)}."
            f" Delta: {_stable_float(delta)}."
            + (
                f" Workflow context: {effective_use_case}."
                if effective_use_case
                else ""
            )
        ),
        "limitations_notice": LIMITATIONS_NOTICE,
    }


@app.post("/export/ranking", response_model=ExportResponse)
def export_ranking(request: ExportRequest) -> Dict[str, str]:
    ranking_payload = rank(RankRequest(materials=request.materials, use_case=request.use_case))
    filename_base = "dravix_recommended_test_candidates"
    if request.format == "json":
        return {
            "filename": f"{filename_base}.json",
            "content_type": "application/json",
            "content": json.dumps(ranking_payload, indent=2),
        }

    header = ["rank", "material_name", "risk_score", "resistance_index", "confidence", "notes"]
    rows = [",".join(header)]
    for row in ranking_payload["ranking"]:
        material_name = str(row["material_name"]).replace('"', '""')
        notes = str(row["notes"]).replace('"', '""')
        rows.append(
            ",".join(
                [
                    str(row["rank"]),
                    f"\"{material_name}\"",
                    str(row["risk_score"]),
                    str(row["resistance_index"]),
                    str(row["confidence"]),
                    f"\"{notes}\"",
                ]
            )
        )
    return {
        "filename": f"{filename_base}.csv",
        "content_type": "text/csv",
        "content": "\n".join(rows),
    }
