"""Mandatory Supabase-backed database service for the canonical Dravix schema."""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from typing import Any

from app.core.config import SUPABASE_SERVICE_KEY, SUPABASE_URL

REQUIRED_TABLES = (
    "materials",
    "material_properties",
    "analysis_runs",
    "analysis_results",
    "advisor_insights",
    "dataset_materials",
)

MATERIAL_PROPERTY_FIELDS = (
    "density",
    "melting_point",
    "specific_heat",
    "thermal_conductivity",
    "cte",
    "flash_point",
    "autoignition_temp",
    "limiting_oxygen_index",
    "smoke_density",
    "char_yield",
    "decomposition_temp",
    "heat_of_combustion",
    "flame_spread_index",
)


def _require_supabase_credentials() -> tuple[str, str]:
    if not SUPABASE_URL or not SUPABASE_URL.strip():
        raise RuntimeError("SUPABASE_URL is required but not configured.")
    if not SUPABASE_SERVICE_KEY or not SUPABASE_SERVICE_KEY.strip():
        raise RuntimeError("SUPABASE_SERVICE_KEY is required but not configured.")
    return SUPABASE_URL.strip(), SUPABASE_SERVICE_KEY.strip()


def _confidence_to_text(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, dict):
        label = value.get("label")
        if label is not None:
            return str(label)
    return str(value)


def _extract_material_properties(payload: dict[str, Any]) -> dict[str, Any]:
    additional = dict(payload.get("additional_properties") or {})
    merged = {**additional, **payload}
    return {
        "density": merged.get("density", merged.get("Density_g_cc")),
        "melting_point": merged.get("melting_point", merged.get("Melting_Point_C")),
        "specific_heat": merged.get("specific_heat", merged.get("Specific_Heat_J_g_C")),
        "thermal_conductivity": merged.get(
            "thermal_conductivity",
            merged.get("Thermal_Cond_W_mK"),
        ),
        "cte": merged.get("cte", merged.get("CTE_um_m_C")),
        "flash_point": merged.get("flash_point", merged.get("Flash_Point_C")),
        "autoignition_temp": merged.get(
            "autoignition_temp",
            merged.get("Autoignition_Temp_C"),
        ),
        "limiting_oxygen_index": merged.get(
            "limiting_oxygen_index",
            merged.get("Limiting_Oxygen_Index_pct"),
        ),
        "smoke_density": merged.get("smoke_density", merged.get("Smoke_Density_Ds")),
        "char_yield": merged.get("char_yield", merged.get("Char_Yield_pct")),
        "decomposition_temp": merged.get(
            "decomposition_temp",
            merged.get("Decomp_Temp_C"),
        ),
        "heat_of_combustion": merged.get(
            "heat_of_combustion",
            merged.get("Heat_of_Combustion_MJ_kg"),
        ),
        "flame_spread_index": merged.get(
            "flame_spread_index",
            merged.get("Flame_Spread_Index"),
        ),
    }


@dataclass(slots=True)
class DatabaseService:
    """Small service layer over the canonical Supabase tables used by Dravix."""

    client: Any

    def get_schema_status(self) -> dict[str, list[str]]:
        schema_client = self.client.schema("information_schema")
        rows = (
            schema_client.table("tables")
            .select("table_name")
            .eq("table_schema", "public")
            .execute()
        ).data or []
        tables_found = sorted({str(row["table_name"]) for row in rows if row.get("table_name")})
        tables_missing = sorted(set(REQUIRED_TABLES) - set(tables_found))
        return {
            "tables_found": tables_found,
            "tables_missing": tables_missing,
        }

    def verify_schema(self) -> None:
        status = self.get_schema_status()
        if status["tables_missing"]:
            raise RuntimeError(
                "Missing required Supabase tables: " + ", ".join(status["tables_missing"])
            )

    def save_material(self, payload: dict[str, Any]) -> dict[str, Any]:
        material_name = payload.get("material_name") or "Unnamed material"
        source = payload.get("source") or "custom_input"
        is_custom = bool(payload.get("is_custom", True))
        material_row = (
            self.client.table("materials")
            .insert(
                {
                    "material_name": material_name,
                    "is_custom": is_custom,
                    "source": source,
                }
            )
            .execute()
        ).data or []
        if not material_row:
            raise RuntimeError("materials insert returned no rows.")
        material = dict(material_row[0])

        property_payload = {
            "material_id": material["id"],
            **_extract_material_properties(payload),
        }
        self.client.table("material_properties").upsert(property_payload).execute()
        return material

    def save_analysis(self, payload: dict[str, Any]) -> dict[str, Any]:
        material = self.save_material(
            {
                "material_name": payload.get("material_name"),
                "source": payload.get("source") or "prediction",
                "is_custom": bool(payload.get("is_custom", False)),
                **_extract_material_properties(payload),
            }
        )
        analysis_row = (
            self.client.table("analysis_runs")
            .insert(
                {
                    "analysis_id": payload["analysis_id"],
                    "material_id": material["id"],
                    "timestamp": payload.get("created_at"),
                    "model_version": payload.get("model_version"),
                    "dataset_version": payload.get("dataset_version"),
                }
            )
            .execute()
        ).data or []
        if not analysis_row:
            raise RuntimeError("analysis_runs insert returned no rows.")
        saved = dict(analysis_row[0])
        saved["material"] = material
        return saved

    def save_results(self, payload: dict[str, Any]) -> dict[str, Any]:
        prediction_json = dict(payload.get("prediction_json") or {})
        top_drivers = prediction_json.get("top_drivers") or []
        dominant_driver = None
        if top_drivers:
            dominant_driver = top_drivers[0].get("feature")
        result_row = (
            self.client.table("analysis_results")
            .insert(
                {
                    "analysis_id": payload["analysis_id"],
                    "resistance_score": payload.get("dfrs"),
                    "risk_score": prediction_json.get("risk_score"),
                    "confidence": _confidence_to_text(payload.get("confidence")),
                    "dominant_driver": dominant_driver,
                    "explanation": prediction_json.get("explanation"),
                }
            )
            .execute()
        ).data or []
        if not result_row:
            raise RuntimeError("analysis_results insert returned no rows.")
        return dict(result_row[0])

    def save_prediction_log(self, payload: dict[str, Any]) -> dict[str, Any]:
        return dict(payload)

    def save_simulation_log(self, payload: dict[str, Any]) -> dict[str, Any]:
        return dict(payload)

    def save_analysis_bundle(
        self,
        *,
        material_payload: dict[str, Any] | None,
        analysis_payload: dict[str, Any],
        results_payload: dict[str, Any],
        prediction_log_payload: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        saved_analysis = self.save_analysis(
            {
                **analysis_payload,
                "is_custom": material_payload is not None,
                "source": (
                    material_payload.get("source")
                    if material_payload is not None
                    else analysis_payload.get("source")
                ),
            }
        )
        saved_result = self.save_results(
            {
                **results_payload,
                "analysis_id": analysis_payload["analysis_id"],
            }
        )
        saved_prediction_log = None
        if prediction_log_payload is not None:
            saved_prediction_log = self.save_prediction_log(prediction_log_payload)
        return {
            "material": saved_analysis.get("material"),
            "analysis": saved_analysis,
            "result": saved_result,
            "prediction_log": saved_prediction_log,
        }

    def get_analysis(self, analysis_id: str) -> dict[str, Any] | None:
        analysis_rows = (
            self.client.table("analysis_runs")
            .select("analysis_id, timestamp, model_version, dataset_version, material_id")
            .eq("analysis_id", analysis_id)
            .limit(1)
            .execute()
        ).data or []
        if not analysis_rows:
            return None
        analysis = dict(analysis_rows[0])

        material_rows = (
            self.client.table("materials")
            .select("*")
            .eq("id", analysis["material_id"])
            .limit(1)
            .execute()
        ).data or []
        properties_rows = (
            self.client.table("material_properties")
            .select("*")
            .eq("material_id", analysis["material_id"])
            .limit(1)
            .execute()
        ).data or []
        result_rows = (
            self.client.table("analysis_results")
            .select("*")
            .eq("analysis_id", analysis_id)
            .limit(1)
            .execute()
        ).data or []

        material = dict(material_rows[0]) if material_rows else None
        properties = dict(properties_rows[0]) if properties_rows else None
        if material and properties:
            material["properties"] = properties

        return {
            "analysis": analysis,
            "result": dict(result_rows[0]) if result_rows else None,
            "material": material,
        }

    def get_recent_analyses(self, limit: int = 10) -> list[dict[str, Any]]:
        rows = (
            self.client.table("analysis_runs")
            .select("analysis_id, timestamp, model_version, dataset_version, material_id")
            .order("timestamp", desc=True)
            .limit(limit)
            .execute()
        ).data or []
        analyses: list[dict[str, Any]] = []
        for row in rows:
            material_rows = (
                self.client.table("materials")
                .select("material_name")
                .eq("id", row["material_id"])
                .limit(1)
                .execute()
            ).data or []
            analyses.append(
                {
                    "analysis_id": row.get("analysis_id"),
                    "material_name": material_rows[0].get("material_name") if material_rows else None,
                    "created_at": row.get("timestamp"),
                    "model_version": row.get("model_version"),
                    "dataset_version": row.get("dataset_version"),
                }
            )
        return analyses

    def get_dataset_materials(self) -> list[dict[str, Any]]:
        rows = self.client.table("dataset_materials").select("*").execute().data or []
        return [dict(row) for row in rows]

    def get_custom_materials(self) -> list[dict[str, Any]]:
        rows = (
            self.client.table("materials")
            .select("*")
            .eq("is_custom", True)
            .execute()
        ).data or []
        materials: list[dict[str, Any]] = []
        for row in rows:
            material = dict(row)
            properties_rows = (
                self.client.table("material_properties")
                .select("*")
                .eq("material_id", material["id"])
                .limit(1)
                .execute()
            ).data or []
            properties = dict(properties_rows[0]) if properties_rows else {}
            material["descriptor_payload"] = {
                field: properties.get(field)
                for field in MATERIAL_PROPERTY_FIELDS
                if properties.get(field) is not None
            }
            materials.append(material)
        return materials

    def get_simulation_logs(self, limit: int | None = None) -> list[dict[str, Any]]:
        return []


@lru_cache(maxsize=1)
def get_database_service() -> DatabaseService:
    supabase_url, supabase_key = _require_supabase_credentials()
    try:
        from supabase import create_client
    except ImportError as exc:  # pragma: no cover
        raise RuntimeError("supabase package is not installed.") from exc

    return DatabaseService(client=create_client(supabase_url, supabase_key))


def initialize_database_service() -> DatabaseService:
    service = get_database_service()
    service.verify_schema()
    return service


def verify_schema() -> None:
    get_database_service().verify_schema()


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
