# Run tests with:
# pytest tests/test_api_endpoints.py

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from typing import Any


API_BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8000").rstrip("/")


def _get_json(route: str) -> dict[str, Any]:
    request = urllib.request.Request(
        url=f"{API_BASE_URL}{route}",
        method="GET",
    )

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        response_body = exc.read().decode("utf-8", errors="replace")
        raise AssertionError(
            f"{route} returned HTTP {exc.code}: {response_body}"
        ) from exc
    except urllib.error.URLError as exc:
        raise AssertionError(
            f"Could not reach running API at {API_BASE_URL}: {exc.reason}"
        ) from exc


def _post_json(route: str, payload: dict[str, Any]) -> dict[str, Any]:
    body = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        url=f"{API_BASE_URL}{route}",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        response_body = exc.read().decode("utf-8", errors="replace")
        raise AssertionError(
            f"{route} returned HTTP {exc.code}: {response_body}"
        ) from exc
    except urllib.error.URLError as exc:
        raise AssertionError(
            f"Could not reach running API at {API_BASE_URL}: {exc.reason}"
        ) from exc


def _assert_has_path(payload: dict[str, Any], *path: str) -> Any:
    current: Any = payload
    for key in path:
        assert isinstance(current, dict), f"Expected dict while resolving {'.'.join(path)}"
        assert key in current, f"Missing field: {'.'.join(path)}"
        current = current[key]
    return current


def test_predict_endpoint_returns_contract_fields() -> None:
    response = _post_json("/predict", {"material_name": "ABS"})

    _assert_has_path(response, "resistanceScore")
    _assert_has_path(response, "risk_score")
    _assert_has_path(response, "resistance_index")
    _assert_has_path(response, "material_name")
    _assert_has_path(response, "top_drivers")
    _assert_has_path(response, "explanation")
    _assert_has_path(response, "limitations_notice")
    _assert_has_path(response, "confidence")
    _assert_has_path(response, "interpretability")
    dataset_version = _assert_has_path(response, "dataset", "version")

    assert dataset_version


def test_rank_endpoint_returns_ranked_materials() -> None:
    response = _post_json(
        "/rank",
        {
            "materials": [
                {"material_name": "ABS"},
                {"material_name": "Polycarbonate"},
                {"material_name": "PEEK"},
            ]
        },
    )

    ranking = _assert_has_path(response, "ranking")
    assert isinstance(ranking, list), "ranking must be a list"
    assert len(ranking) > 0, "ranking must contain at least one result"

    first = ranking[0]
    assert isinstance(first, dict), "ranking entries must be objects"
    _assert_has_path(first, "rank")
    _assert_has_path(first, "material")
    _assert_has_path(first, "material_name")
    _assert_has_path(first, "risk_score")
    _assert_has_path(first, "resistance_index")
    _assert_has_path(first, "resistanceScore")
    _assert_has_path(first, "confidence")
    _assert_has_path(first, "notes")


def test_simulate_endpoint_returns_baseline_modified_and_change() -> None:
    response = _post_json(
        "/simulate",
        {
            "base_material": {
                "material_name": "ABS",
            },
            "modifications": {
                "Limiting_Oxygen_Index_pct": 24,
            },
        },
    )

    _assert_has_path(response, "baseline", "resistanceScore")
    _assert_has_path(response, "baseline", "risk_score")
    _assert_has_path(response, "modified", "resistanceScore")
    _assert_has_path(response, "modified", "risk_score")
    _assert_has_path(response, "change", "delta")
    _assert_has_path(response, "change", "risk_delta")
    _assert_has_path(response, "dominant_driver")
    _assert_has_path(response, "explanation")
    _assert_has_path(response, "simulation_summary")
    driver_analysis = _assert_has_path(response, "driver_analysis")
    assert isinstance(driver_analysis, list)


def test_model_metadata_endpoint_returns_feature_list() -> None:
    response = _get_json("/model-metadata")
    _assert_has_path(response, "model_type")
    _assert_has_path(response, "model_version")
    _assert_has_path(response, "dataset_version")
    feature_names = _assert_has_path(response, "feature_names")
    assert isinstance(feature_names, list)
    assert len(feature_names) > 0


def test_runtime_status_endpoint_returns_runtime_fields() -> None:
    response = _get_json("/runtime-status")
    _assert_has_path(response, "model_version")
    _assert_has_path(response, "dataset_version")
    _assert_has_path(response, "dataset_rows")
    _assert_has_path(response, "model_loaded")
    _assert_has_path(response, "lookup_loaded")
