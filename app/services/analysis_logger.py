"""Persistence helpers for completed analysis runs."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from pydantic import ValidationError

from app.core.logging import get_logger
from app.schemas.analysis_schema import AnalysisResult
from app.schemas.material_schema import MaterialInput
from app.services.database_service import get_database_service

logger = get_logger("uvicorn.error")


def _to_dict(model_or_mapping: Any) -> dict[str, Any]:
    if model_or_mapping is None:
        return {}
    if hasattr(model_or_mapping, "model_dump"):
        return dict(model_or_mapping.model_dump(exclude_none=True))
    if hasattr(model_or_mapping, "dict"):
        return dict(model_or_mapping.dict(exclude_none=True))
    if isinstance(model_or_mapping, dict):
        return dict(model_or_mapping)
    return {"value": model_or_mapping}


def _build_material_schema(material_input: Any, prediction_output: dict[str, Any]) -> MaterialInput:
    raw_input = _to_dict(material_input)
    additional_properties = dict(raw_input)

    material_name = raw_input.get("material_name") or prediction_output.get("material_name") or "Manual input"
    material_class = (
        raw_input.get("material_class")
        or raw_input.get("Material Class")
        or raw_input.get("material_type")
    )
    density = raw_input.get("density", raw_input.get("Density_g_cc"))
    melting_point = raw_input.get("melting_point", raw_input.get("Melting_Point_C"))
    thermal_conductivity = raw_input.get(
        "thermal_conductivity",
        raw_input.get("Thermal_Cond_W_mK"),
    )

    return MaterialInput(
        material_name=str(material_name),
        material_class=None if material_class is None else str(material_class),
        density=None if density is None else float(density),
        melting_point=None if melting_point is None else float(melting_point),
        thermal_conductivity=(
            None if thermal_conductivity is None else float(thermal_conductivity)
        ),
        additional_properties=additional_properties,
    )


def _build_analysis_schema(prediction_output: dict[str, Any]) -> AnalysisResult:
    confidence = prediction_output.get("confidence")
    interpretability = prediction_output.get("interpretability") or {}

    return AnalysisResult(
        DFRS=float(
            prediction_output.get(
                "DFRS",
                prediction_output.get(
                    "effectiveResistance",
                    prediction_output.get("resistanceScore", 0.0),
                ),
            )
        ),
        analysis_id=(
            None
            if prediction_output.get("analysis_id") is None
            else str(prediction_output.get("analysis_id"))
        ),
        confidence=confidence,
        feature_importance=interpretability,
        prediction_json=prediction_output,
    )


def log_analysis_run(material_input: Any, prediction_output: dict[str, Any]) -> None:
    """Persist a successful analysis run without affecting inference on failure."""
    try:
        material_record = _build_material_schema(material_input, prediction_output)
        analysis_record = _build_analysis_schema(prediction_output)
        database = get_database_service()

        analysis_runs_payload = {
            "analysis_id": analysis_record.analysis_id,
            "material_name": material_record.material_name,
            "material_class": material_record.material_class,
            "density": material_record.density,
            "melting_point": material_record.melting_point,
            "thermal_conductivity": material_record.thermal_conductivity,
            "additional_properties": material_record.additional_properties,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        analysis_results_payload = {
            "dfrs": analysis_record.DFRS,
            "confidence": analysis_record.confidence,
            "feature_importance": analysis_record.feature_importance,
            "prediction_json": analysis_record.prediction_json,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        custom_material_payload = None
        if bool(prediction_output.get("custom_material")):
            confidence_payload = prediction_output.get("confidence") or {}
            confidence_score = None
            if isinstance(confidence_payload, dict) and confidence_payload.get("score") is not None:
                try:
                    confidence_score = float(confidence_payload["score"])
                except (TypeError, ValueError):
                    confidence_score = None
            custom_material_payload = {
                "analysis_id": analysis_record.analysis_id,
                "material_name": material_record.material_name,
                "properties": material_record.additional_properties,
                "resistance_score": analysis_record.DFRS,
                "confidence": confidence_score,
                "density": material_record.density,
                "melting_point": material_record.melting_point,
                "thermal_conductivity": material_record.thermal_conductivity,
                "descriptor_payload": material_record.additional_properties,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        database.save_analysis_bundle(
            material_payload=custom_material_payload,
            analysis_payload=analysis_runs_payload,
            results_payload=analysis_results_payload,
        )
    except (ValidationError, TypeError, ValueError) as exc:
        logger.warning("Skipping analysis logging due to invalid payload: %s", exc)
    except Exception as exc:
        logger.warning("Supabase logging skipped because persistence failed: %s", exc)


def get_analysis_by_id(analysis_id: str) -> dict[str, Any] | None:
    try:
        return get_database_service().get_analysis(analysis_id)
    except Exception as exc:
        logger.warning("Analysis lookup failed: %s", exc)
        return None


def list_recent_analyses(limit: int = 10) -> list[dict[str, Any]]:
    try:
        return get_database_service().get_recent_analyses(limit=limit)
    except Exception as exc:
        logger.warning("Recent analyses lookup failed: %s", exc)
        return []
