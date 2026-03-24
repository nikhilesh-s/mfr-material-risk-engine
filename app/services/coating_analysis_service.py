"""Coating-analysis helper service."""

from __future__ import annotations

from typing import Any

import numpy as np

from src.phase3_coating_modifier import get_coating_modifier


def analyze_coating_effect(
    *,
    base_score: float,
    coating_code: str | None,
) -> dict[str, Any]:
    if not coating_code:
        return {
            "coating_code": None,
            "coating_modifier_index": None,
            "coating_modifier": None,
            "descriptor_count_used": 0,
            "effective_score": float(base_score),
        }

    coating_data = get_coating_modifier(str(coating_code))
    effective_score = float(np.clip(base_score * (1.0 + float(coating_data["coating_modifier"])), 0.0, 1.0))
    return {
        **coating_data,
        "effective_score": effective_score,
    }
