# Run tests with:
# pytest tests/test_api_endpoints.py

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from typing import Any


API_BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8000").rstrip("/")


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
    _assert_has_path(first, "resistanceScore")
    _assert_has_path(first, "confidence")


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
    _assert_has_path(response, "modified", "resistanceScore")
    _assert_has_path(response, "change", "delta")
