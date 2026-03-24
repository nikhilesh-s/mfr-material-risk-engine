"""Mandatory Supabase-backed database service for platform persistence."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from functools import lru_cache
from typing import Any

from app.core.config import SUPABASE_SERVICE_KEY, SUPABASE_URL

REQUIRED_TABLES = (
    "analysis_runs",
    "analysis_results",
    "custom_materials",
    "prediction_logs",
    "dataset_materials",
    "simulation_logs",
    "model_registry",
)


def _utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


def _require_supabase_credentials() -> tuple[str, str]:
    if not SUPABASE_URL or not SUPABASE_URL.strip():
        raise RuntimeError("SUPABASE_URL is required but not configured.")
    if not SUPABASE_SERVICE_KEY or not SUPABASE_SERVICE_KEY.strip():
        raise RuntimeError("SUPABASE_SERVICE_KEY is required but not configured.")
    return SUPABASE_URL.strip(), SUPABASE_SERVICE_KEY.strip()


@dataclass(slots=True)
class DatabaseService:
    """Small service layer over Supabase tables used by the platform runtime."""

    client: Any

    def verify_required_tables(self) -> None:
        for table_name in REQUIRED_TABLES:
            self.client.table(table_name).select("*").limit(1).execute()

    def save_material(self, payload: dict[str, Any]) -> dict[str, Any]:
        response = self.client.table("custom_materials").insert(payload).execute()
        rows = response.data or []
        if not rows:
            raise RuntimeError("custom_materials insert returned no rows.")
        return dict(rows[0])

    def save_analysis(self, payload: dict[str, Any]) -> dict[str, Any]:
        response = self.client.table("analysis_runs").insert(payload).execute()
        rows = response.data or []
        if not rows:
            raise RuntimeError("analysis_runs insert returned no rows.")
        return dict(rows[0])

    def save_results(self, payload: dict[str, Any]) -> dict[str, Any]:
        response = self.client.table("analysis_results").insert(payload).execute()
        rows = response.data or []
        if not rows:
            raise RuntimeError("analysis_results insert returned no rows.")
        return dict(rows[0])

    def save_prediction_log(self, payload: dict[str, Any]) -> dict[str, Any]:
        response = self.client.table("prediction_logs").insert(payload).execute()
        rows = response.data or []
        return dict(rows[0]) if rows else payload

    def save_simulation_log(self, payload: dict[str, Any]) -> dict[str, Any]:
        response = self.client.table("simulation_logs").insert(payload).execute()
        rows = response.data or []
        return dict(rows[0]) if rows else payload

    def save_analysis_bundle(
        self,
        *,
        material_payload: dict[str, Any] | None,
        analysis_payload: dict[str, Any],
        results_payload: dict[str, Any],
        prediction_log_payload: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Persist a logically grouped analysis write with compensating rollback on failure."""
        saved_material: dict[str, Any] | None = None
        saved_analysis: dict[str, Any] | None = None
        saved_result: dict[str, Any] | None = None
        saved_prediction_log: dict[str, Any] | None = None
        try:
            if material_payload is not None:
                saved_material = self.save_material(material_payload)
            saved_analysis = self.save_analysis(analysis_payload)
            saved_result = self.save_results(
                {
                    **results_payload,
                    "analysis_run_id": saved_analysis["id"],
                }
            )
            if prediction_log_payload is not None:
                saved_prediction_log = self.save_prediction_log(prediction_log_payload)
        except Exception:
            if saved_prediction_log and saved_prediction_log.get("id") is not None:
                self.client.table("prediction_logs").delete().eq("id", saved_prediction_log["id"]).execute()
            if saved_analysis and saved_analysis.get("id") is not None:
                self.client.table("analysis_runs").delete().eq("id", saved_analysis["id"]).execute()
            if saved_material and saved_material.get("id") is not None:
                self.client.table("custom_materials").delete().eq("id", saved_material["id"]).execute()
            raise

        return {
            "material": saved_material,
            "analysis": saved_analysis,
            "result": saved_result,
            "prediction_log": saved_prediction_log,
        }

    def get_analysis(self, analysis_id: str) -> dict[str, Any] | None:
        run_rows = (
            self.client.table("analysis_runs")
            .select("*")
            .eq("analysis_id", analysis_id)
            .limit(1)
            .execute()
        ).data or []
        if not run_rows:
            return None
        analysis_row = dict(run_rows[0])
        result_rows = (
            self.client.table("analysis_results")
            .select("*")
            .eq("analysis_run_id", analysis_row["id"])
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        ).data or []
        custom_rows = (
            self.client.table("custom_materials")
            .select("*")
            .eq("analysis_id", analysis_id)
            .limit(1)
            .execute()
        ).data or []
        return {
            "analysis": analysis_row,
            "result": dict(result_rows[0]) if result_rows else None,
            "custom_material": dict(custom_rows[0]) if custom_rows else None,
        }

    def get_recent_analyses(self, limit: int = 10) -> list[dict[str, Any]]:
        rows = (
            self.client.table("analysis_runs")
            .select("analysis_id, material_name, created_at")
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        ).data or []
        return [dict(row) for row in rows]

    def get_dataset_materials(self) -> list[dict[str, Any]]:
        rows = self.client.table("dataset_materials").select("*").execute().data or []
        return [dict(row) for row in rows]

    def get_custom_materials(self) -> list[dict[str, Any]]:
        rows = self.client.table("custom_materials").select("*").execute().data or []
        return [dict(row) for row in rows]

    def get_simulation_logs(self, limit: int | None = None) -> list[dict[str, Any]]:
        query = self.client.table("simulation_logs").select("*").order("created_at", desc=True)
        if limit is not None:
            query = query.limit(limit)
        rows = query.execute().data or []
        return [dict(row) for row in rows]


@lru_cache(maxsize=1)
def get_database_service() -> DatabaseService:
    supabase_url, supabase_key = _require_supabase_credentials()
    try:
        from supabase import create_client
    except ImportError as exc:  # pragma: no cover
        raise RuntimeError("supabase package is not installed.") from exc

    client = create_client(supabase_url, supabase_key)
    service = DatabaseService(client=client)
    return service


def initialize_database_service() -> DatabaseService:
    service = get_database_service()
    service.verify_required_tables()
    return service


def build_prediction_log_payload(input_features: dict[str, Any], prediction_output: dict[str, Any]) -> dict[str, Any]:
    return {
        "timestamp": _utcnow(),
        "material_name": prediction_output.get("material_name") or input_features.get("material_name"),
        "input_features": input_features,
        "predicted_score": prediction_output.get("DFRS", prediction_output.get("effectiveResistance")),
        "confidence": prediction_output.get("confidence"),
        "model_version": prediction_output.get("model_version"),
    }


def build_simulation_log_payload(
    *,
    analysis_id: str | None,
    material_name: str,
    base_material: dict[str, Any],
    modifications: dict[str, Any],
    simulation_output: dict[str, Any],
) -> dict[str, Any]:
    return {
        "analysis_id": analysis_id,
        "material_name": material_name,
        "base_material": base_material,
        "modifications": modifications,
        "simulation_output": simulation_output,
        "created_at": _utcnow(),
    }
