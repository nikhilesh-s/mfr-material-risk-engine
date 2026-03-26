"""Analysis API helpers and route scaffolding."""

from __future__ import annotations

import logging
from threading import Thread
from typing import Any

from fastapi import APIRouter, HTTPException

from app.services.analysis_logger import (
    get_analysis_by_id,
    list_recent_analyses,
    log_analysis_run,
)

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


@router.get("/analysis/recent")
def analysis_recent(limit: int = 10) -> dict[str, list[dict[str, Any]]]:
    return {"analyses": list_recent_analyses(limit=limit)}


@router.get("/analysis/{analysis_id}")
def analysis_by_id(analysis_id: str) -> dict[str, Any]:
    result = get_analysis_by_id(analysis_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return result


@router.get("/analysis/{analysis_id}/interactive")
def analysis_interactive(analysis_id: str) -> dict[str, Any]:
    result = get_analysis_by_id(analysis_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Analysis not found")

    prediction = ((result.get("result") or {}).get("prediction_json")) or {}
    return {
        "analysis_id": analysis_id,
        "top_drivers": prediction.get("top_drivers", []),
        "sensitivity_summary": prediction.get("sensitivity_summary", []),
        "counterfactual_suggestions": prediction.get("counterfactual_suggestions", []),
        "recommended_tests": prediction.get("recommended_tests", []),
        "recommended_test_details": prediction.get("recommended_test_details", []),
        "property_response_curves": prediction.get("property_response_curves", {}),
        "out_of_domain": prediction.get("out_of_domain", False),
        "out_of_domain_reasons": prediction.get("out_of_domain_reasons", []),
    }
