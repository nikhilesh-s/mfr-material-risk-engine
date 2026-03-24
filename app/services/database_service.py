"""Mandatory Supabase-backed database service for Dravix platform persistence."""

from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any
from urllib import error, request

from app.core.config import SUPABASE_SERVICE_KEY, SUPABASE_URL
from app.core.logging import get_logger
from src.utils import repo_path

logger = get_logger("uvicorn.error")

REQUIRED_TABLES = (
    "custom_materials",
    "analysis_runs",
    "analysis_results",
    "simulation_logs",
    "dataset_materials",
    "model_registry",
)

SCHEMA_INIT_RPC_CANDIDATES = (
    "exec_sql",
    "execute_sql",
    "run_sql",
    "query",
)


def _require_supabase_credentials() -> tuple[str, str]:
    if not SUPABASE_URL or not SUPABASE_URL.strip():
        raise RuntimeError("SUPABASE_URL is required but not configured.")
    if not SUPABASE_SERVICE_KEY or not SUPABASE_SERVICE_KEY.strip():
        raise RuntimeError("SUPABASE_SERVICE_KEY is required but not configured.")
    return SUPABASE_URL.strip(), SUPABASE_SERVICE_KEY.strip()


def _schema_sql_path() -> Path:
    return repo_path("backend", "db", "ensure_schema.sql")


def _load_schema_sql() -> str:
    sql_path = _schema_sql_path()
    return sql_path.read_text(encoding="utf-8")


def _postgrest_rpc(url: str, key: str, rpc_name: str, sql_text: str) -> tuple[bool, str]:
    rpc_url = f"{url.rstrip('/')}/rest/v1/rpc/{rpc_name}"
    payload = json.dumps({"sql": sql_text}).encode("utf-8")
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    req = request.Request(rpc_url, data=payload, headers=headers, method="POST")
    try:
        with request.urlopen(req, timeout=30) as response:
            _ = response.read()
        return True, f"rpc:{rpc_name}"
    except error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="ignore")
        return False, f"{rpc_name}: {exc.code} {body}"
    except Exception as exc:  # pragma: no cover - network/runtime dependent
        return False, f"{rpc_name}: {exc}"


@dataclass(slots=True)
class DatabaseService:
    """Shared persistence service over Supabase tables used by the backend."""

    client: Any
    supabase_url: str
    supabase_key: str
    schema_verified: bool = False

    @staticmethod
    def _is_missing_table_error(exc: Exception) -> bool:
        error_text = str(exc)
        return (
            "PGRST205" in error_text
            or "schema cache" in error_text.lower()
            or "could not find the table" in error_text.lower()
        )

    def get_schema_status(self) -> dict[str, list[str]]:
        tables_found: list[str] = []
        tables_missing: list[str] = []
        for table_name in REQUIRED_TABLES:
            try:
                self.client.table(table_name).select("*").limit(1).execute()
                tables_found.append(table_name)
            except Exception as exc:
                if self._is_missing_table_error(exc):
                    tables_missing.append(table_name)
                    continue
                raise
        return {
            "tables_found": sorted(tables_found),
            "tables_missing": sorted(tables_missing),
        }

    def _run_schema_sql(self) -> str:
        sql_text = _load_schema_sql()
        errors_seen: list[str] = []
        for rpc_name in SCHEMA_INIT_RPC_CANDIDATES:
            ok, detail = _postgrest_rpc(self.supabase_url, self.supabase_key, rpc_name, sql_text)
            if ok:
                return detail
            errors_seen.append(detail)
        raise RuntimeError(
            "Automatic schema initialization failed. None of the SQL RPC endpoints succeeded: "
            + " | ".join(errors_seen)
        )

    def verify_required_tables(self) -> bool:
        status = self.get_schema_status()
        if not status["tables_missing"]:
            return True

        logger.warning(
            "[DRAVIX] Missing tables detected -> initializing schema (%s)",
            ", ".join(status["tables_missing"]),
        )
        try:
            init_detail = self._run_schema_sql()
            logger.info("[DRAVIX] Schema initialized")
            logger.info("[DRAVIX] Schema initialization detail: %s", init_detail)
        except Exception as exc:
            logger.warning("[DRAVIX] Automatic schema initialization unavailable: %s", exc)
            return False

        rechecked = self.get_schema_status()
        if rechecked["tables_missing"]:
            logger.warning(
                "[DRAVIX] Required tables still missing after initialization attempt: %s",
                ", ".join(rechecked["tables_missing"]),
            )
            return False
        return True

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
        return dict(payload)

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
        analysis_runs = (
            self.client.table("analysis_runs")
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
            self.client.table("analysis_results")
            .select("*")
            .eq("analysis_run_id", run_row["id"])
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
            "analysis": run_row,
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
    return DatabaseService(
        client=client,
        supabase_url=supabase_url,
        supabase_key=supabase_key,
    )


def initialize_database_service() -> DatabaseService:
    service = get_database_service()
    service.schema_verified = service.verify_required_tables()
    return service


def verify_schema() -> None:
    if not get_database_service().verify_required_tables():
        raise RuntimeError("Supabase schema verification failed.")


def get_schema_status() -> dict[str, list[str]]:
    return get_database_service().get_schema_status()


def build_prediction_log_payload(input_features: dict[str, Any], prediction_output: dict[str, Any]) -> dict[str, Any]:
    return {
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
    }
