"""Comparison API routes."""

from __future__ import annotations

from fastapi import APIRouter

from app.services.comparison_engine import compare_materials
from src.api_contract import RankRequest

router = APIRouter(tags=["comparison"])


@router.post("/compare")
def compare(request: RankRequest) -> dict:
    return compare_materials(request.materials, use_case=request.use_case)
