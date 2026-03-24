"""Interface contract for future TDS/report generation."""

from __future__ import annotations

from typing import TypedDict


class TDSResult(TypedDict):
    analysis_id: str
    document_url: str | None
    status: str


def generate_tds(analysis_id: str) -> TDSResult:
    """Generate a TDS/report from stored analysis history and Supabase-backed metadata."""
    raise NotImplementedError("TDS generation is not implemented yet.")
