"""Recommend validation experiments for a material analysis."""

from __future__ import annotations

from typing import Any


def recommend_experiments(
    *,
    confidence_score: float,
    dfrs: float,
    out_of_distribution: bool,
    sensitivity_summary: list[dict[str, Any]] | None = None,
    subscores: dict[str, float] | None = None,
    top_drivers: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    tests: list[str] = []
    recommendations: list[dict[str, Any]] = []

    def add_recommendation(name: str, reason: str, priority: str) -> None:
        tests.append(name)
        recommendations.append(
            {
                "test": name,
                "reason": reason,
                "priority": priority,
            }
        )

    if confidence_score < 0.5:
        add_recommendation(
            "validation testing",
            "Prediction confidence is below the screening threshold.",
            "high",
        )
    if dfrs > 0.7:
        add_recommendation(
            "fire resistance testing",
            "The material screens as a strong fire-resistance candidate and warrants validation.",
            "high",
        )
    if out_of_distribution:
        add_recommendation(
            "additional characterization",
            "The descriptor profile appears outside the reference training distribution.",
            "high",
        )

    if confidence_score < 0.5:
        add_recommendation(
            "cone calorimetry (ASTM E1354)",
            "Low confidence warrants a direct heat release and ignition validation measurement.",
            "high",
        )
    if dfrs > 0.7 or out_of_distribution:
        add_recommendation(
            "thermogravimetric analysis",
            "Thermal stability and decomposition behavior should be measured directly.",
            "medium",
        )
    if sensitivity_summary:
        dominant_sensitive = ", ".join(
            str(item.get("property"))
            for item in sensitivity_summary[:2]
            if item.get("property")
        ) or "sensitive properties"
        add_recommendation(
            "SEM microstructure analysis",
            f"Microstructure review can help explain the behavior of {dominant_sensitive}.",
            "medium",
        )
    if subscores and float(subscores.get("decomposition_margin", 1.0)) < 0.45:
        add_recommendation(
            "dynamic mechanical analysis",
            "Low decomposition-margin performance suggests a need to characterize thermal transition behavior.",
            "medium",
        )
    if top_drivers:
        driver_names = ", ".join(
            str(item.get("feature"))
            for item in top_drivers[:2]
            if item.get("feature")
        )
        if driver_names:
            add_recommendation(
                "targeted descriptor verification",
                f"Verify the most influential driver inputs: {driver_names}.",
                "low",
            )

    deduped: list[str] = []
    deduped_details: list[dict[str, Any]] = []
    for test in tests:
        if test not in deduped:
            deduped.append(test)
    for recommendation in recommendations:
        if recommendation["test"] not in {item["test"] for item in deduped_details}:
            deduped_details.append(recommendation)
    return {
        "recommended_tests": deduped,
        "recommended_test_details": deduped_details,
    }
