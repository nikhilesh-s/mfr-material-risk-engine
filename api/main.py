"""FastAPI entrypoint for Phase 3 layered resistance inference."""

from __future__ import annotations

import json
import logging
from uuid import uuid4
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.core.dataset_loader import (
    COATINGS_DATASET_PATH,
    MATERIALS_DATASET_PATH,
    load_datasets,
)
from backend.core.material_input import has_custom_descriptors, normalize_material_payload
from backend.core.model_loader import MODEL_PATH, load_model
from backend.core.version import API_VERSION, DATASET_VERSION, MODEL_ARTIFACT
from backend.routes.system import router as system_router
from backend.services.prediction_logger import log_prediction
from backend.services.supabase_client import get_supabase_status
from app.api.advisor import router as advisor_router
from app.api.analysis import router as analysis_router
from app.api.analysis import schedule_analysis_logging
from app.api.coatings import router as coatings_router
from app.api.comparison import router as comparison_router
from app.api.datasets import router as datasets_router
from app.api.ranking import router as ranking_router
from app.api.reports import router as reports_router
from app.core.config import SUPABASE_URL
from app.services.coating_analysis_service import analyze_coating_effect
from app.services.counterfactual_engine import suggest_counterfactuals
from app.services.database_service import initialize_database_service
from app.services.dataset_learning_service import log_simulation_modification
from app.services.experiment_recommender import recommend_experiments
from app.services.scoring_engine import compute_subscores
from app.services.sensitivity_engine import compute_sensitivity_map, summarize_sensitivity
from app.training.feature_engineering import (
    DERIVED_FEATURE_COLUMNS,
    STANDARD_FEATURE_COLUMNS,
    build_feature_frame as build_training_feature_frame,
)
from app.ml.model_loader import (
    DATASET_BUILD_DATE,
    PHASE3_REFERENCE_PATH,
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
from app.ml.predictor import (
    COMBUSTION_COLUMNS,
    RESISTANCE_NEGATIVE_COLUMNS,
    build_feature_vector,
    get_runtime_state,
)
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

ADMIN_EMAIL = "admin@dravix.ai"
ADMIN_PASSWORD = "Q9v$2mL!7xK@4pR#8tN^6dH"
MOCK_SESSION_TOKEN = "mock-session-token"
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

SIMULATION_SOURCE_TO_FEATURE = {
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
DISPLAY_TO_STANDARD_REFERENCE = {
    "Density (g/cc)": "density",
    "Melting Point (°C)": "melting_point",
    "Thermal Cond. (W/m-K)": "thermal_conductivity",
    "Specific Heat (J/g-°C)": "specific_heat",
    "Decomp. Temp (°C)": "decomposition_temp",
    "Glass Transition Temp (°C)": "glass_transition_temp",
}


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
app.include_router(system_router)
app.include_router(analysis_router)
app.include_router(ranking_router)
app.include_router(comparison_router)
app.include_router(coatings_router)
app.include_router(datasets_router)
app.include_router(advisor_router)
app.include_router(reports_router)


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
    return normalize_material_payload(payload)


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


def _resolve_phase3_payload(
    payload: Phase3Input,
    *,
    analysis_id: str | None = None,
) -> dict[str, Any]:
    if not hasattr(app.state, "model"):
        raise HTTPException(status_code=500, detail="Model runtime is not initialized.")

    if payload.material_name is not None and payload.material_name.strip():
        if has_custom_descriptors(payload):
            return normalize_material_payload(payload, fallback_material_name=payload.material_name)
        payload_data = get_material_descriptors(payload.material_name)
        if payload_data is None:
            if has_custom_descriptors(payload):
                return normalize_material_payload(payload, fallback_material_name=payload.material_name)
            raise HTTPException(status_code=404, detail="Material not found in database")
        return payload_data

    fallback_material_name = (
        None
        if analysis_id is None
        else f"Custom Material {analysis_id}"
    )
    return normalize_material_payload(payload, fallback_material_name=fallback_material_name)


def _generate_analysis_id(now: datetime | None = None) -> str:
    timestamp = now or datetime.now(timezone.utc)
    suffix = uuid4().int % 10000
    return f"DRX-{timestamp.strftime('%Y%m%d')}-{suffix:04d}"


def _predict_model_score(payload_data: dict[str, Any]) -> float:
    feature_vector = build_feature_vector(payload_data)
    return float(app.state.model.predict(feature_vector)[0])


def _predict_composite_dfrs(payload_data: dict[str, Any]) -> float:
    raw_score = _predict_model_score(payload_data)
    return float(compute_subscores(payload_data, raw_score)["DFRS"])


def _is_out_of_distribution(payload_data: dict[str, Any], feature_vector: pd.DataFrame) -> bool:
    if feature_vector.isna().any(axis=None):
        return True
    for feature in COMBUSTION_COLUMNS:
        if feature not in payload_data:
            continue
        raw_value = payload_data.get(feature)
        try:
            numeric_value = float(raw_value)
        except (TypeError, ValueError):
            continue
        bounds = getattr(app.state, "bounds", None)
        if bounds is None:
            continue
        if feature in bounds and (
            numeric_value < float(bounds[feature]["min"]) or numeric_value > float(bounds[feature]["max"])
        ):
            return True
    return False


def _build_enriched_analysis(
    payload_data: dict[str, Any],
    *,
    coating_code: str | None,
    use_case: str | None,
    material_name: str,
    is_custom_material: bool = False,
    include_sensitivity: bool = True,
    analysis_id: str | None = None,
) -> dict[str, Any]:
    base_resistance = _predict_model_score(payload_data)
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

    subscores = compute_subscores(payload_data, base_resistance)
    effective_dfrs = float(subscores["DFRS"])
    try:
        coating_analysis = analyze_coating_effect(
            base_score=effective_dfrs,
            coating_code=coating_code,
        )
    except KeyError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    coating_modifier = coating_analysis["coating_modifier"]
    effective_dfrs = float(coating_analysis["effective_score"])

    stable_base = _stable_float(base_resistance)
    stable_effective = _stable_float(effective_dfrs)
    stable_modifier = None if coating_modifier is None else _stable_float(coating_modifier)
    risk_score = _to_risk_score(stable_effective)
    resistance_index = _to_resistance_index(stable_effective)
    top_drivers = list(interpretability["top_3_drivers"])

    sensitivity_map: dict[str, float] = {}
    sensitivity_summary: list[dict[str, Any]] = []
    counterfactual_suggestions: list[str] = []
    if include_sensitivity:
        sensitivity_map = compute_sensitivity_map(
            payload=payload_data,
            predict_fn=_predict_composite_dfrs,
            baseline_score=effective_dfrs,
        )
        sensitivity_summary = summarize_sensitivity(sensitivity_map)
        counterfactual_suggestions = suggest_counterfactuals(
            payload=payload_data,
            sensitivity_map=sensitivity_map,
        )["suggestions"]

    out_of_distribution = _is_out_of_distribution(payload_data, feature_vector)
    recommended_tests = recommend_experiments(
        confidence_score=float(confidence["score"]),
        dfrs=stable_effective,
        out_of_distribution=out_of_distribution,
        sensitivity_summary=sensitivity_summary,
        subscores={
            "ignition_resistance": float(subscores["ignition_resistance"]),
            "thermal_persistence": float(subscores["thermal_persistence"]),
            "decomposition_margin": float(subscores["decomposition_margin"]),
            "heat_propagation_risk": float(subscores["heat_propagation_risk"]),
        },
        top_drivers=top_drivers,
    )
    notes = _build_prediction_notes(
        confidence_label=str(confidence["label"]),
        top_drivers=top_drivers,
        interpretability=interpretability,
        coating_code=coating_code,
        use_case=use_case,
    )

    return {
        "analysis_id": analysis_id or _generate_analysis_id(),
        "material_name": material_name,
        "custom_material": is_custom_material,
        "use_case": use_case,
        "DFRS": stable_effective,
        "ignition_resistance": _stable_float(subscores["ignition_resistance"]),
        "thermal_persistence": _stable_float(subscores["thermal_persistence"]),
        "decomposition_margin": _stable_float(subscores["decomposition_margin"]),
        "heat_propagation_risk": _stable_float(subscores["heat_propagation_risk"]),
        "risk_score": risk_score,
        "resistance_index": resistance_index,
        "top_drivers": top_drivers,
        "feature_importances": list(getattr(app.state, "top_feature_importances", [])),
        "model_version": str(getattr(app.state, "model_version", API_VERSION)),
        "subscores": {
            "ignition_resistance": _stable_float(subscores["ignition_resistance"]),
            "thermal_persistence": _stable_float(subscores["thermal_persistence"]),
            "decomposition_margin": _stable_float(subscores["decomposition_margin"]),
            "heat_propagation_risk": _stable_float(subscores["heat_propagation_risk"]),
        },
        "sensitivity_map": {
            property_name: _stable_float(impact)
            for property_name, impact in sensitivity_map.items()
        },
        "sensitivity_summary": sensitivity_summary,
        "recommended_tests": recommended_tests["recommended_tests"],
        "recommended_test_details": recommended_tests["recommended_test_details"],
        "counterfactual_suggestions": counterfactual_suggestions,
        "explanation": _build_prediction_explanation(
            material_name=material_name,
            risk_score=risk_score,
            confidence_label=str(confidence["label"]),
            top_drivers=top_drivers,
            interpretability=interpretability,
            use_case=use_case,
        ),
        "notes": notes,
        "limitations_notice": LIMITATIONS_NOTICE,
        "resistanceScore": stable_base,
        "effectiveResistance": stable_effective,
        "coatingModifier": stable_modifier,
        "coating_analysis": coating_analysis,
        "dataset": {"version": str(getattr(app.state, "dataset_version", DATASET_VERSION))},
        "interpretability": interpretability,
        "confidence": {
            "score": _stable_float(float(confidence["score"])),
            "label": str(confidence["label"]),
        },
    }


def _predict_resistance_and_confidence(payload_data: dict[str, Any]) -> tuple[float, str]:
    resistance_score = _predict_model_score(payload_data)
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
    best_feature = "descriptor update"
    best_magnitude = -1.0

    for source_field, raw_change in modifications.items():
        feature_name = SIMULATION_SOURCE_TO_FEATURE.get(source_field)
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


def _describe_simulation_change(
    feature_name: str,
    baseline_value: Any,
    modified_value: Any,
) -> str:
    friendly_map = {
        "Limiting Oxygen Index (%)": "LOI increase improves ignition resistance",
        "Char Yield (%)": "Higher char yield improves thermal shielding",
        "Thermal Cond. (W/m-K)": "Thermal conductivity shifts heat transfer behavior",
        "Heat of Combustion (MJ/kg)": "Heat of combustion changes the available fuel energy",
        "Decomp. Temp (°C)": "Decomposition temperature changes thermal stability",
        "Melting Point (°C)": "Melting point changes high-temperature stability",
        "Autoignition Temp (°C)": "Autoignition temperature changes ignition sensitivity",
        "Flash Point (°C)": "Flash point changes ignition onset behavior",
        "Smoke Density (Ds)": "Smoke density changes combustion byproduct severity",
        "Flame Spread Index": "Flame spread index changes surface flame propagation behavior",
    }
    if feature_name in friendly_map:
        return friendly_map[feature_name]

    if baseline_value is None or pd.isna(baseline_value):
        return f"{feature_name} was introduced for the simulation scenario"
    if modified_value is None or pd.isna(modified_value):
        return f"{feature_name} was cleared for the simulation scenario"

    try:
        baseline_float = float(baseline_value)
        modified_float = float(modified_value)
    except (TypeError, ValueError):
        return f"{feature_name} changed from {baseline_value} to {modified_value}"

    direction = "increased" if modified_float > baseline_float else "decreased"
    return f"{feature_name} {direction} from {baseline_float:g} to {modified_float:g}"


def _simulation_driver_analysis(
    base_payload: dict[str, Any],
    modified_payload: dict[str, Any],
    modifications: dict[str, float | str],
) -> list[str]:
    analysis: list[str] = []
    for source_field in modifications:
        feature_name = SIMULATION_SOURCE_TO_FEATURE.get(source_field)
        if feature_name is None:
            continue
        analysis.append(
            _describe_simulation_change(
                feature_name=feature_name,
                baseline_value=base_payload.get(feature_name),
                modified_value=modified_payload.get(feature_name),
            )
        )
    return analysis


def _simulation_changed_feature_names(modifications: dict[str, float | str]) -> list[str]:
    feature_names: list[str] = []
    for source_field in modifications:
        feature_name = SIMULATION_SOURCE_TO_FEATURE.get(source_field)
        if feature_name is not None:
            feature_names.append(feature_name)
    return feature_names


def _predict_response_payload(input: Phase3Input, use_case: str | None = None) -> dict[str, Any]:
    if not hasattr(app.state, "model"):
        raise HTTPException(status_code=500, detail="Model runtime is not initialized.")

    analysis_id = _generate_analysis_id()
    coating_code = input.coating_code.strip() if input.coating_code else None
    payload_data = _resolve_phase3_payload(input, analysis_id=analysis_id)
    material_name = _material_name_for_response(input, payload_data)
    is_custom_material = bool(has_custom_descriptors(input) or material_name.startswith("Custom Material "))

    effective_use_case = _effective_use_case(use_case, input.use_case)
    return _build_enriched_analysis(
        payload_data=payload_data,
        coating_code=coating_code,
        use_case=effective_use_case,
        material_name=material_name,
        is_custom_material=is_custom_material,
        analysis_id=analysis_id,
    )


def _apply_simulation_modifications(
    payload_data: dict[str, Any],
    modifications: dict[str, float | str],
) -> dict[str, Any]:
    modified_payload = dict(payload_data)
    for source_field, raw_change in modifications.items():
        if source_field not in SIMULATION_SOURCE_TO_FEATURE:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported modification field: {source_field}",
            )

        feature_name = SIMULATION_SOURCE_TO_FEATURE[source_field]
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
    for source_field in modifications:
        feature_name = SIMULATION_SOURCE_TO_FEATURE.get(source_field)
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
    standardized_reference = pd.DataFrame(index=raw_df.index)
    for display_name, standard_name in DISPLAY_TO_STANDARD_REFERENCE.items():
        if display_name in raw_df.columns:
            standardized_reference[standard_name] = pd.to_numeric(raw_df[display_name], errors="coerce")
        else:
            standardized_reference[standard_name] = pd.Series(np.nan, index=raw_df.index, dtype=float)
    training_feature_frame = build_training_feature_frame(standardized_reference)

    oriented = pd.DataFrame(index=raw_df.index)
    for feature in feature_names:
        if feature in STANDARD_FEATURE_COLUMNS or feature in DERIVED_FEATURE_COLUMNS:
            oriented[feature] = pd.to_numeric(training_feature_frame[feature], errors="coerce")
            continue
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
    if SUPABASE_URL:
        logger.info("[DRAVIX] Supabase detected")
    logger.info("[DRAVIX] Checking schema")
    try:
        database_service = initialize_database_service()
    except Exception:
        logger.exception("[DRAVIX] Schema verification failed")
        raise
    if getattr(database_service, "schema_verified", False):
        logger.info("[DRAVIX] Schema verification successful")
    else:
        logger.warning("[DRAVIX] Schema verification incomplete; continuing with limited database features")
    runtime = get_runtime_state()
    model = load_model()
    feature_names = list(model.feature_names_in_)
    bounds = runtime["bounds"]
    material_dataset, coating_dataset = load_datasets()

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
    app.state.bounds = bounds
    app.state.top_feature_importances = list(runtime.get("top_feature_importances", []))
    app.state.training_variance_mean = variance_stats["training_variance_mean"]
    app.state.training_variance_std = variance_stats["training_variance_std"]
    app.state.training_variance_p25 = variance_stats["training_variance_p25"]
    app.state.training_variance_p50 = variance_stats["training_variance_p50"]
    app.state.training_variance_p75 = variance_stats["training_variance_p75"]
    app.state.dataset_metadata = metadata
    app.state.training_dataset = MATERIALS_DATASET_PATH.name
    app.state.model_version = "phase3"
    app.state.dataset_version = DATASET_VERSION
    app.state.model_artifact_name = MODEL_ARTIFACT
    app.state.model_loaded = True
    app.state.dataset_loaded = True
    app.state.lookup_loaded = len(get_material_names()) > 0
    app.state.started_at_utc = datetime.now(timezone.utc).isoformat()
    app.state.reference_row_count = int(len(material_dataset))
    app.state.materials_count = int(len(material_dataset))
    app.state.coatings_count = int(len(coating_dataset))
    app.state.feature_count = int(len(feature_names))
    app.state.material_lookup_row_count = int(len(get_material_names()))
    app.state.coating_lookup_row_count = int(len(get_coating_names()))
    app.state.active_paths = {
        "reference_dataset": str(MATERIALS_DATASET_PATH),
        "coatings_dataset": str(COATINGS_DATASET_PATH),
        "model_artifact": str(MODEL_PATH),
    }
    supabase_status = get_supabase_status()
    supabase_connected = bool(supabase_status["connected"])
    logger.info("--------------------------------")
    logger.info("Dravix Phase 3 Engine Boot")
    logger.info("Model loaded: true")
    logger.info("Dataset loaded: true")
    logger.info("Material count: %d", app.state.materials_count)
    logger.info("Feature count: %d", app.state.feature_count)
    logger.info("Supabase connected: %s", str(supabase_connected).lower())
    logger.info("--------------------------------")


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
    prediction = _predict_response_payload(input)
    try:
        log_prediction(input, prediction)
    except Exception:
        logger.exception("Prediction logging failed.")
    schedule_analysis_logging(input, prediction)
    return prediction


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
            effective_resistance = float(compute_subscores(payload_data, base_resistance)["DFRS"])

            if coating_code is not None:
                try:
                    coating_data = analyze_coating_effect(
                        base_score=effective_resistance,
                        coating_code=str(coating_code),
                    )
                except KeyError as exc:
                    errors.append({"material": material_label, "error": str(exc)})
                    continue
                effective_resistance = float(coating_data["effective_score"])

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

    effective_use_case = _effective_use_case(request.use_case, request.base_material.use_case)
    material_name = _material_name_for_response(request.base_material, base_payload)
    baseline_analysis = _build_enriched_analysis(
        payload_data=base_payload,
        coating_code=request.base_material.coating_code.strip() if request.base_material.coating_code else None,
        use_case=effective_use_case,
        material_name=material_name,
        is_custom_material=bool(has_custom_descriptors(request.base_material) or material_name.startswith("Custom Material ")),
        include_sensitivity=False,
    )
    modified_analysis = _build_enriched_analysis(
        payload_data=modified_payload,
        coating_code=request.base_material.coating_code.strip() if request.base_material.coating_code else None,
        use_case=effective_use_case,
        material_name=material_name,
        is_custom_material=bool(has_custom_descriptors(request.base_material) or material_name.startswith("Custom Material ")),
        include_sensitivity=False,
    )
    baseline_score = float(baseline_analysis["DFRS"])
    modified_score = float(modified_analysis["DFRS"])
    baseline_confidence = str(baseline_analysis["confidence"]["label"])
    modified_confidence = str(modified_analysis["confidence"]["label"])

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
    driver_analysis = _simulation_driver_analysis(
        base_payload=base_payload,
        modified_payload=modified_payload,
        modifications=request.modifications,
    )
    changed_features = _simulation_changed_feature_names(request.modifications)
    changed_feature_summary = ", ".join(changed_features[:2]) if changed_features else "the requested descriptors"
    if np.isclose(risk_delta, 0.0):
        outcome_phrase = (
            "accepted the requested descriptor update, but the current model region "
            "did not materially change the fire-risk proxy"
        )
        simulation_summary = (
            "Material properties changed but the model prediction remained in the same decision region."
        )
    elif risk_delta < 0:
        outcome_phrase = "reduced the fire-risk proxy"
        simulation_summary = (
            f"Changing {changed_feature_summary} reduced the predicted fire-risk proxy."
            if changed_features
            else "The simulation reduced the predicted fire-risk proxy."
        )
    else:
        outcome_phrase = "increased the fire-risk proxy"
        simulation_summary = (
            f"Changing {changed_feature_summary} increased the predicted fire-risk proxy."
            if changed_features
            else "The simulation increased the predicted fire-risk proxy."
        )

    response_payload = {
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
        "simulation_summary": simulation_summary,
        "driver_analysis": driver_analysis,
        "limitations_notice": LIMITATIONS_NOTICE,
    }
    try:
        log_simulation_modification(
            analysis_id=baseline_analysis.get("analysis_id"),
            material_name=material_name,
            base_material=base_payload,
            modifications=request.modifications,
            simulation_output=response_payload,
        )
    except Exception:
        logger.exception("Simulation logging failed.")
    return response_payload


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
