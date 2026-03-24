"""Dataset-learning hooks for exported analysis and simulation data."""

from __future__ import annotations

from typing import Any

import pandas as pd

from app.services.database_service import (
    build_simulation_log_payload,
    get_database_service,
)


def log_simulation_modification(
    *,
    analysis_id: str | None,
    material_name: str,
    base_material: dict[str, Any],
    modifications: dict[str, Any],
    simulation_output: dict[str, Any],
) -> None:
    """Persist simulation modifications for future training and replay workflows."""
    payload = build_simulation_log_payload(
        analysis_id=analysis_id,
        material_name=material_name,
        base_material=base_material,
        modifications=modifications,
        simulation_output=simulation_output,
    )
    get_database_service().save_simulation_log(payload)


def export_learning_dataset() -> dict[str, Any]:
    """Export custom materials and simulation history for downstream dataset workflows."""
    database = get_database_service()
    custom_materials = database.get_custom_materials()
    simulation_logs = database.get_simulation_logs()
    training_ready = prepare_training_ready_dataset(custom_materials, simulation_logs)
    return {
        "custom_materials": custom_materials,
        "simulation_logs": simulation_logs,
        "training_ready_records": training_ready.to_dict(orient="records"),
        "counts": {
            "custom_materials": len(custom_materials),
            "simulation_logs": len(simulation_logs),
            "training_ready_records": int(len(training_ready)),
        },
    }


def prepare_training_ready_dataset(
    custom_materials: list[dict[str, Any]] | None = None,
    simulation_logs: list[dict[str, Any]] | None = None,
) -> pd.DataFrame:
    """Prepare a flat dataframe from stored custom materials and simulation logs."""
    if custom_materials is None or simulation_logs is None:
        database = get_database_service()
        if custom_materials is None:
            custom_materials = database.get_custom_materials()
        if simulation_logs is None:
            simulation_logs = database.get_simulation_logs()

    custom_rows: list[dict[str, Any]] = []
    for row in custom_materials:
        descriptor_payload = dict(row.get("descriptor_payload") or row.get("properties") or {})
        custom_rows.append(
            {
                "analysis_id": row.get("analysis_id"),
                "material_name": row.get("material_name"),
                "source": "custom_material",
                **descriptor_payload,
            }
        )

    simulation_rows: list[dict[str, Any]] = []
    for row in simulation_logs:
        base_material = dict(row.get("base_material") or {})
        modifications = dict(row.get("modifications") or {})
        simulation_rows.append(
            {
                "analysis_id": row.get("analysis_id"),
                "material_name": row.get("material_name"),
                "source": "simulation",
                **base_material,
                **{f"simulation__{key}": value for key, value in modifications.items()},
            }
        )

    dataframe = pd.DataFrame(custom_rows + simulation_rows)
    if dataframe.empty:
        return dataframe

    dataframe = dataframe.where(pd.notna(dataframe), None)
    return dataframe
