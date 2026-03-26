"""Failure-tolerant Supabase logging helpers for the Dravix API."""

from __future__ import annotations

from datetime import datetime, timezone
from functools import lru_cache
from typing import Any
from uuid import uuid4

from app.core.config import SUPABASE_SERVICE_ROLE_KEY, SUPABASE_SERVICE_KEY, SUPABASE_URL
from app.core.logging import get_logger

logger = get_logger("uvicorn.error")

TRACKED_TABLES = [
    "analysis_runs",
    "analysis_results",
    "dataset_materials",
    "custom_materials",
    "model_registry",
    "simulation_logs",
]


def _utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


def _service_key() -> str | None:
    return SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY


@lru_cache(maxsize=1)
def get_db() -> Any | None:
    if not SUPABASE_URL or not _service_key():
        return None
    try:
        from supabase import create_client
    except Exception as exc:  # pragma: no cover
        logger.warning("Supabase client unavailable: %s", exc)
        return None

    try:
        return create_client(SUPABASE_URL, _service_key())
    except Exception as exc:
        logger.warning("Supabase connection failed: %s", exc)
        return None


def generate_analysis_id() -> str:
    timestamp = datetime.now(timezone.utc)
    return f"DRX-{timestamp.strftime('%Y%m%d')}-{uuid4().int % 10000:04d}"


def _insert(table: str, payload: dict[str, Any]) -> dict[str, Any] | None:
    db = get_db()
    if db is None:
        raise RuntimeError("Supabase client is unavailable")
    response = db.table(table).insert(payload).execute()
    response_error = getattr(response, "error", None)
    if response_error:
        raise RuntimeError(str(response_error))
    rows = response.data or []
    return dict(rows[0]) if rows else {}


def _confidence_label(value: Any) -> Any:
    if isinstance(value, dict):
        return value.get("label", value)
    return value


def insert_analysis_run(
    *,
    analysis_id: str | None,
    endpoint: str,
    material_name: str,
    use_case: str | None,
    model_version: str | None,
    dataset_version: str | None,
    timestamp: str | None = None,
) -> dict[str, Any] | None:
    analysis_id = analysis_id or generate_analysis_id()
    timestamp = timestamp or _utcnow()
    primary_payload = {
        "analysis_id": analysis_id,
        "material_name": material_name,
        "use_case": use_case,
        "timestamp": timestamp,
        "model_version": model_version,
    }
    try:
        return _insert("analysis_runs", primary_payload)
    except Exception:
        pass

    legacy_payload = {
        "analysis_id": analysis_id,
        "material_name": material_name,
        "material_class": endpoint,
        "additional_properties": {
            "endpoint": endpoint,
            "use_case": use_case,
        },
        "model_version": model_version,
        "dataset_version": dataset_version,
        "created_at": timestamp,
    }
    return _insert("analysis_runs", legacy_payload)


def insert_analysis_result(
    *,
    analysis_id: str,
    material_name: str,
    resistance_score: float | None,
    risk_score: float | None,
    confidence: Any,
    top_driver: str | None,
    dataset_version: str | None,
    model_version: str | None,
    prediction_output: dict[str, Any] | None = None,
    analysis_run_id: str | None = None,
) -> dict[str, Any] | None:
    primary_payload = {
        "analysis_id": analysis_id,
        "resistance_score": resistance_score,
        "risk_score": risk_score,
        "confidence": _confidence_label(confidence),
        "drivers_json": {"top_driver": top_driver},
        "prediction_json": prediction_output or {},
        "dataset_version": dataset_version,
        "model_version": model_version,
    }
    try:
        return _insert("analysis_results", primary_payload)
    except Exception:
        pass

    legacy_payload = {
        "analysis_run_id": analysis_run_id,
        "dfrs": (prediction_output or {}).get("DFRS", (prediction_output or {}).get("effectiveResistance")),
        "confidence": confidence,
        "feature_importance": (prediction_output or {}).get("interpretability", {}),
        "prediction_json": prediction_output or {},
        "created_at": _utcnow(),
    }
    return _insert("analysis_results", legacy_payload)


def insert_custom_material(
    *,
    analysis_id: str,
    material_name: str,
    features: dict[str, Any],
    resistance_score: float | None = None,
    confidence: float | None = None,
) -> dict[str, Any] | None:
    primary_payload = {
        "analysis_id": analysis_id,
        "material_name": material_name,
        "input_properties_json": features,
        "density": features.get("Density_g_cc"),
        "melting_point": features.get("Melting_Point_C"),
        "specific_heat": features.get("Specific_Heat_J_g_C"),
        "thermal_conductivity": features.get("Thermal_Cond_W_mK"),
        "cte": features.get("CTE_um_m_C"),
        "flash_point": features.get("Flash_Point_C"),
        "autoignition_temp": features.get("Autoignition_Temp_C"),
        "limiting_oxygen_index": features.get("Limiting_Oxygen_Index_pct"),
        "smoke_density": features.get("Smoke_Density_Ds"),
        "char_yield": features.get("Char_Yield_pct"),
        "decomposition_temp": features.get("Decomp_Temp_C"),
        "heat_of_combustion": features.get("Heat_of_Combustion_MJ_kg"),
        "flame_spread_index": features.get("Flame_Spread_Index"),
        "properties": features,
        "resistance_score": resistance_score,
        "confidence": confidence,
        "created_at": _utcnow(),
    }
    try:
        return _insert("custom_materials", primary_payload)
    except Exception:
        pass

    legacy_payload = {
        "analysis_id": analysis_id,
        "material_name": material_name,
        "density": features.get("Density_g_cc"),
        "melting_point": features.get("Melting_Point_C"),
        "thermal_conductivity": features.get("Thermal_Cond_W_mK"),
        "descriptor_payload": features,
        "created_at": _utcnow(),
    }
    return _insert("custom_materials", legacy_payload)


def insert_simulation_log(
    *,
    analysis_id: str | None,
    material_name: str,
    baseline_score: float | None,
    modified_score: float | None,
    delta_score: float | None,
    use_case: str | None,
    modifications_json: dict[str, Any] | None = None,
    simulation_output: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    primary_payload = {
        "analysis_id": analysis_id,
        "baseline_score": baseline_score,
        "modified_score": modified_score,
        "delta": {"delta_score": delta_score},
        "delta_score": delta_score,
        "modifications_json": modifications_json or {},
        "material_name": material_name,
        "use_case": use_case,
        "created_at": _utcnow(),
    }
    try:
        return _insert("simulation_logs", primary_payload)
    except Exception:
        pass

    legacy_payload = {
        "analysis_id": analysis_id,
        "material_name": material_name,
        "baseline_score": baseline_score,
        "modified_score": modified_score,
        "delta": {"delta_score": delta_score},
        "simulation_output": simulation_output or {},
        "created_at": _utcnow(),
    }
    return _insert("simulation_logs", legacy_payload)


def register_model_version(
    *,
    model_name: str,
    model_version: str,
    dataset_version: str | None,
    artifact_path: str,
    feature_count: int,
) -> dict[str, Any] | None:
    db = get_db()
    if db is None:
        return None
    try:
        existing = (
            db.table("model_registry")
            .select("*")
            .eq("model_version", model_version)
            .limit(1)
            .execute()
        ).data or []
        if existing:
            return dict(existing[0])
    except Exception as exc:
        logger.warning("Model registry lookup skipped: %s", exc)
        return None

    payload = {
        "model_name": model_name,
        "model_version": model_version,
        "dataset_version": dataset_version,
        "artifact_path": artifact_path,
        "feature_count": feature_count,
        "created_at": _utcnow(),
    }
    inserted = _insert("model_registry", payload)
    if inserted is not None:
        return inserted

    fallback_payload = {
        "model_name": model_name,
        "model_version": model_version,
        "dataset_version": dataset_version,
        "notes": f"artifact_path={artifact_path}; feature_count={feature_count}",
        "created_at": _utcnow(),
    }
    return _insert("model_registry", fallback_payload)


def db_status() -> dict[str, Any]:
    db = get_db()
    if db is None:
        return {
            "database_connected": False,
            "tables": [],
            "last_model_registered": None,
        }

    tables: list[str] = []
    for table_name in TRACKED_TABLES:
        try:
            db.table(table_name).select("*").limit(1).execute()
            tables.append(table_name)
        except Exception:
            continue

    last_model_registered = None
    try:
        rows = (
            db.table("model_registry")
            .select("*")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        ).data or []
        if rows:
            last_model_registered = rows[0].get("model_version")
    except Exception:
        pass

    return {
        "database_connected": True,
        "tables": tables,
        "last_model_registered": last_model_registered,
    }
