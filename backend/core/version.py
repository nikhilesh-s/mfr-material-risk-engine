"""Centralized backend version metadata."""

from __future__ import annotations

import os
from datetime import datetime, timezone

SERVICE_NAME = "Dravix Phase 3 Resistance API"
ENGINE_VERSION = "0.3.2"
API_VERSION = "0.3.2"
DATASET_VERSION = "v0.3-stable"
MODEL_ARTIFACT = "model_v0.3-stable.pkl"


def get_version_info() -> dict[str, str]:
    return {
        "service": SERVICE_NAME,
        "version": ENGINE_VERSION,
        "api_version": API_VERSION,
        "dataset_version": DATASET_VERSION,
        "model_artifact": MODEL_ARTIFACT,
        "build_hash": os.getenv("RENDER_GIT_COMMIT") or os.getenv("GIT_COMMIT") or "unknown",
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
    }
