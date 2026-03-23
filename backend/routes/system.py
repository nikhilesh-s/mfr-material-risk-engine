"""Runtime diagnostics routes for deployed Dravix backends."""

from __future__ import annotations

import os
from typing import Any

from fastapi import APIRouter, Request

from backend.services.supabase_client import get_supabase_client, is_supabase_enabled

router = APIRouter(tags=["system"])


def _environment_name() -> str:
    if os.getenv("RENDER") or os.getenv("RENDER_SERVICE_ID"):
        return "render"
    return "local"


@router.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "engine": "dravix-phase3",
    }


@router.get("/version")
def version() -> dict[str, str]:
    return {
        "engine": "dravix",
        "version": "0.3.2",
        "environment": _environment_name(),
    }


@router.get("/runtime-status")
def runtime_status(request: Request) -> dict[str, Any]:
    state = request.app.state
    supabase_connected = False
    if is_supabase_enabled():
        supabase_connected = get_supabase_client() is not None

    return {
        "model_loaded": bool(getattr(state, "model_loaded", False)),
        "dataset_loaded": bool(getattr(state, "lookup_loaded", False)),
        "supabase_connected": supabase_connected,
        "features": int(len(getattr(state, "feature_names", []))),
        "materials_count": int(getattr(state, "material_lookup_row_count", 0)),
        "build_time": str(getattr(state, "started_at_utc", "unknown")),
        "model_version": str(getattr(state, "model_version", "unknown")),
        "dataset_version": str(getattr(state, "dataset_version", "unknown")),
        "dataset_rows": int(getattr(state, "reference_row_count", 0)),
        "lookup_loaded": bool(getattr(state, "lookup_loaded", False)),
    }


@router.get("/model-metadata")
def model_metadata(request: Request) -> dict[str, Any]:
    state = request.app.state
    model = getattr(state, "model", None)
    estimator = None
    if model is not None and hasattr(model, "named_steps") and "model" in model.named_steps:
        estimator = model.named_steps["model"]
    elif model is not None:
        estimator = model

    feature_names = list(getattr(state, "feature_names", []))
    dataset_metadata = dict(getattr(state, "dataset_metadata", {}))
    return {
        "model_type": estimator.__class__.__name__ if estimator is not None else "unknown",
        "feature_count": len(feature_names),
        "feature_names": feature_names,
        "training_dataset": str(dataset_metadata.get("version", "unknown")),
        "model_version": str(getattr(state, "model_version", "phase3")),
        "dataset_version": str(getattr(state, "dataset_version", "unknown")),
        "dataset_build_date": str(dataset_metadata.get("build_date", getattr(state, "started_at_utc", "unknown"))),
        "deterministic": True,
        "row_counts": {
            "reference_dataset_rows": int(getattr(state, "reference_row_count", 0)),
            "materials_lookup_rows": int(getattr(state, "material_lookup_row_count", 0)),
            "coatings_lookup_rows": int(getattr(state, "coating_lookup_row_count", 0)),
        },
        "active_paths": dict(getattr(state, "active_paths", {})),
        "timestamp_utc": str(getattr(state, "started_at_utc", "unknown")),
        "service": "Dravix Phase 3 Resistance API",
        "api_version": "0.3.2",
        "model_artifact": str(getattr(state, "model_artifact_name", "unknown")),
    }
