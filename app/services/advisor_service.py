"""Interface contract for future advisor workflows."""

from __future__ import annotations

from typing import TypedDict


class AdvisorResult(TypedDict):
    analysis_id: str
    summary: str
    recommendations: list[str]


def build_advisor_response(analysis_id: str) -> AdvisorResult:
    """Build an advisor response from stored analysis history and Supabase-backed context."""
    raise NotImplementedError("Advisor service is not implemented yet.")
