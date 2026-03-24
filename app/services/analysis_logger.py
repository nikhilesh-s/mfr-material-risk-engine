"""Persistence helpers for completed analysis runs."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from pydantic import ValidationError

from app.core.logging import get_logger
from app.schemas.analysis_schema import AnalysisResult
from app.schemas.material_schema import MaterialInput
from backend.services.supabase_client import get_supabase_client

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
        supabase = get_supabase_client()
        if supabase is None:
            return

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
        if bool(prediction_output.get("custom_material")):
            custom_material_payload = {
                "analysis_id": analysis_record.analysis_id,
                "material_name": material_record.material_name,
                "density": material_record.density,
                "melting_point": material_record.melting_point,
                "thermal_conductivity": material_record.thermal_conductivity,
                "descriptor_payload": material_record.additional_properties,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
            supabase.table("custom_materials").insert(custom_material_payload).execute()
        analysis_run_response = supabase.table("analysis_runs").insert(
            analysis_runs_payload
        ).execute()
        analysis_rows = analysis_run_response.data or []
        analysis_run_id = analysis_rows[0].get("id") if analysis_rows else None
        if analysis_run_id is None:
            logger.warning("Supabase analysis_runs insert returned no id.")
            return

        analysis_results_payload = {
            "analysis_run_id": analysis_run_id,
            "dfrs": analysis_record.DFRS,
            "confidence": analysis_record.confidence,
            "feature_importance": analysis_record.feature_importance,
            "prediction_json": analysis_record.prediction_json,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        supabase.table("analysis_results").insert(analysis_results_payload).execute()
    except (ValidationError, TypeError, ValueError) as exc:
        logger.warning("Skipping analysis logging due to invalid payload: %s", exc)
    except Exception as exc:
        logger.warning("Supabase logging skipped because persistence failed: %s", exc)


def get_analysis_by_id(analysis_id: str) -> dict[str, Any] | None:
    supabase = get_supabase_client()
    if supabase is None:
        return None

    try:
        analysis_runs = (
            supabase.table("analysis_runs")
            .select("*")
            .eq("analysis_id", analysis_id)
            .limit(1)
            .execute()
        )
        run_rows = analysis_runs.data or []
        if not run_rows:
            return None
        run_row = dict(run_rows[0])
        result_rows = (
            supabase.table("analysis_results")
            .select("*")
            .eq("analysis_run_id", run_row["id"])
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        ).data or []
        return {
            "analysis": run_row,
            "result": dict(result_rows[0]) if result_rows else None,
        }
    except Exception as exc:
        logger.warning("Analysis lookup failed: %s", exc)
        return None


def list_recent_analyses(limit: int = 10) -> list[dict[str, Any]]:
    supabase = get_supabase_client()
    if supabase is None:
        return []

    try:
        rows = (
            supabase.table("analysis_runs")
            .select("analysis_id, material_name, created_at")
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        ).data or []
        return [dict(row) for row in rows]
    except Exception as exc:
        logger.warning("Recent analyses lookup failed: %s", exc)
        return []
