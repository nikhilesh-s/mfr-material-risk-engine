"""Pydantic schema for stored analysis outputs."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class AnalysisResult(BaseModel):
    DFRS: float
    analysis_id: str | None = None
    confidence: Any = None
    feature_importance: dict[str, Any] = Field(default_factory=dict)
    prediction_json: dict[str, Any] = Field(default_factory=dict)
