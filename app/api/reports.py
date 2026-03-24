"""Reports API routes."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.services.tds_service import generate_tds

router = APIRouter(tags=["reports"])


@router.get("/tds/{analysis_id}")
def tds(analysis_id: str) -> dict:
    try:
        return generate_tds(analysis_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
