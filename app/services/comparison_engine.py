"""Interface contract for future material comparison workflows."""

from __future__ import annotations

from typing import Any, TypedDict


class ComparisonResult(TypedDict):
    left_analysis_id: str
    right_analysis_id: str
    summary: str
    score_delta: float


def compare_analyses(left_analysis_id: str, right_analysis_id: str) -> ComparisonResult:
    """Compare two stored analyses using analysis history and Supabase-backed results."""
    raise NotImplementedError("Comparison engine is not implemented yet.")
