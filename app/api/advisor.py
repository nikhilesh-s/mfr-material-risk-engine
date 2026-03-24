"""Advisor API routes."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.services.advisor_service import build_advisor_response

router = APIRouter(tags=["advisor"])


@router.get("/advisor/{analysis_id}")
def advisor(analysis_id: str) -> dict:
    try:
        return build_advisor_response(analysis_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
