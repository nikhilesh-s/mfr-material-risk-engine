"""Model artifact persistence and registry helpers."""

from __future__ import annotations

import json
import pickle
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.core.logging import get_logger
from app.db.supabase_client import get_supabase
from src.utils import repo_path

logger = get_logger("uvicorn.error")


def save_model_artifact(
    model: Any,
    model_version: str,
    metadata: dict[str, Any],
) -> tuple[Path, Path]:
    models_dir = repo_path("models")
    models_dir.mkdir(parents=True, exist_ok=True)

    artifact_path = models_dir / f"dravix_model_{model_version}.pkl"
    metadata_path = models_dir / f"dravix_model_{model_version}.json"

    with artifact_path.open("wb") as handle:
        pickle.dump(model, handle)
    metadata_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    return artifact_path, metadata_path


def register_model(
    *,
    model_name: str,
    model_version: str,
    training_dataset: str,
    rmse: float,
    r2: float,
    model_path: str,
) -> None:
    payload = {
        "model_version": model_version,
        "dataset_version": training_dataset,
        "model_artifact": model_path,
        "registered_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        get_supabase().table("model_registry").insert(payload).execute()
    except Exception as exc:
        logger.warning("Model registry update skipped: %s", exc)


def get_latest_registered_model() -> dict[str, Any] | None:
    try:
        response = (
            get_supabase()
            .table("model_registry")
            .select("*")
            .order("registered_at", desc=True)
            .limit(1)
            .execute()
        )
    except Exception as exc:
        logger.warning("Model registry lookup skipped: %s", exc)
        return None

    rows = response.data or []
    if not rows:
        return None
    return dict(rows[0])
