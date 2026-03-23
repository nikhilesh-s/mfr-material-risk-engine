"""Analysis API helpers and route scaffolding."""

from __future__ import annotations

import logging
from threading import Thread
from typing import Any

from fastapi import APIRouter

from app.services.analysis_logger import log_analysis_run

router = APIRouter(tags=["analysis"])

logger = logging.getLogger("uvicorn.error")


def schedule_analysis_logging(material_input: Any, prediction_output: dict[str, Any]) -> None:
    """Log a completed analysis in the background without blocking inference."""

    def _runner() -> None:
        try:
            log_analysis_run(material_input, prediction_output)
        except Exception:
            logger.exception("Analysis logging failed.")

    try:
        Thread(target=_runner, daemon=True).start()
    except Exception:
        logger.exception("Failed to start background analysis logging thread.")
