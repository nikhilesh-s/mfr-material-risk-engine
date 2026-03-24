"""Runtime diagnostics routes for deployed Dravix backends."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request

from backend.core.version import API_VERSION, SERVICE_NAME, get_version_info
from backend.services.supabase_client import get_supabase_status

router = APIRouter(tags=["system"])


@router.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "engine": "dravix-phase3",
    }


@router.get("/version")
def version() -> dict[str, str]:
    return get_version_info()


@router.get("/runtime-status")
def runtime_status(request: Request) -> dict[str, Any]:
    state = request.app.state
    supabase_status = get_supabase_status()

    return {
        "model_loaded": bool(getattr(state, "model_loaded", False)),
        "dataset_loaded": bool(getattr(state, "dataset_loaded", False)),
        "materials_count": int(getattr(state, "materials_count", 0)),
        "coatings_count": int(getattr(state, "coatings_count", 0)),
        "feature_count": int(getattr(state, "feature_count", 0)),
        "supabase_connected": bool(supabase_status["connected"]),
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
    return {
        "model_type": estimator.__class__.__name__ if estimator is not None else "unknown",
        "feature_count": len(feature_names),
        "feature_names": feature_names,
        "training_dataset": str(getattr(state, "training_dataset", "materials_phase3_ready.csv")),
        "model_version": "phase3",
        "dataset_version": str(getattr(state, "dataset_version", "v0.3-stable")),
        "dataset_build_date": str(getattr(state, "started_at_utc", "unknown")),
        "deterministic": True,
        "row_counts": {
            "reference_dataset_rows": int(getattr(state, "materials_count", 0)),
            "materials_lookup_rows": int(getattr(state, "materials_count", 0)),
            "coatings_lookup_rows": int(getattr(state, "coatings_count", 0)),
        },
        "active_paths": dict(getattr(state, "active_paths", {})),
        "timestamp_utc": str(getattr(state, "started_at_utc", "unknown")),
        "service": SERVICE_NAME,
        "api_version": API_VERSION,
        "model_artifact": str(getattr(state, "model_artifact_name", "model_v0.3-stable.pkl")),
    }
