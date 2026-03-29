"""Descriptor-level analysis caching for deterministic custom material requests."""

from __future__ import annotations

import hashlib
import json
from typing import Any, Callable

from app.core.logging import get_logger
from app.services.database_service import get_database_service
from backend.core.material_input import has_custom_descriptors, raw_phase3_payload
from src.api_contract import Phase3Input

logger = get_logger("uvicorn.error")


def descriptor_hash_for_input(payload: Phase3Input) -> str | None:
    """Build a stable hash for full custom-material requests."""
    if not has_custom_descriptors(payload):
        return None

    raw_payload = raw_phase3_payload(payload)
    relevant_payload = {
        key: raw_payload.get(key)
        for key in sorted(raw_payload)
        if raw_payload.get(key) is not None
    }
    encoded = json.dumps(relevant_payload, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def _stored_descriptor_hash(descriptor_payload: dict[str, Any]) -> str | None:
    meta = descriptor_payload.get("_meta") or {}
    if meta.get("descriptor_hash"):
        return str(meta["descriptor_hash"])
    flattened = {key: value for key, value in descriptor_payload.items() if key != "_meta"}
    if not flattened:
        return None
    encoded = json.dumps(flattened, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def get_or_create_analysis(
    payload: Phase3Input,
    *,
    compute_fn: Callable[[Phase3Input], dict[str, Any]],
) -> tuple[dict[str, Any], bool, str | None]:
    """Return a cached prediction for identical custom inputs when available."""
    descriptor_hash = descriptor_hash_for_input(payload)
    if descriptor_hash is None:
        return compute_fn(payload), False, None

    try:
        database = get_database_service()
        for row in database.get_custom_materials():
            descriptor_payload = dict(row.get("descriptor_payload") or {})
            if _stored_descriptor_hash(descriptor_payload) != descriptor_hash:
                continue
            analysis_id = row.get("analysis_id")
            if not analysis_id:
                continue
            stored = database.get_analysis(str(analysis_id))
            prediction = ((stored or {}).get("result") or {}).get("prediction_json")
            if isinstance(prediction, dict) and prediction:
                logger.info("Analysis cache hit for %s", analysis_id)
                return dict(prediction), True, descriptor_hash
    except Exception:
        logger.warning("Analysis cache lookup skipped.", exc_info=True)

    return compute_fn(payload), False, descriptor_hash
