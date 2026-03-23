"""Recommend validation experiments for a material analysis."""

from __future__ import annotations

from typing import Any


def recommend_experiments(
    *,
    confidence_score: float,
    dfrs: float,
    out_of_distribution: bool,
    sensitivity_summary: list[dict[str, Any]] | None = None,
) -> dict[str, list[str]]:
    tests: list[str] = []
    if confidence_score < 0.5:
        tests.append("validation testing")
    if dfrs > 0.7:
        tests.append("fire resistance testing")
    if out_of_distribution:
        tests.append("additional characterization")

    if confidence_score < 0.5:
        tests.append("cone calorimetry (ASTM E1354)")
    if dfrs > 0.7 or out_of_distribution:
        tests.append("thermogravimetric analysis")
    if sensitivity_summary:
        tests.append("SEM microstructure analysis")

    deduped: list[str] = []
    for test in tests:
        if test not in deduped:
            deduped.append(test)
    return {"recommended_tests": deduped}
