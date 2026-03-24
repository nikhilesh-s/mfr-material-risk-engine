"""Optional remote prediction logging."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.services.database_service import get_database_service


def _to_payload(value: Any) -> dict[str, Any]:
    if hasattr(value, "model_dump"):
        return dict(value.model_dump(exclude_none=True))
    if hasattr(value, "dict"):
        return dict(value.dict(exclude_none=True))
    if isinstance(value, dict):
        return dict(value)
    return {}


def log_prediction(input_features: Any, prediction_output: dict[str, Any]) -> None:
    payload = _to_payload(input_features)
    log_row = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "material_name": prediction_output.get("material_name") or payload.get("material_name"),
        "input_features": payload,
        "predicted_score": prediction_output.get("DFRS", prediction_output.get("effectiveResistance")),
        "confidence": prediction_output.get("confidence"),
        "model_version": prediction_output.get("model_version"),
    }
    try:
        get_database_service().save_prediction_log(log_row)
    except Exception:
        return
