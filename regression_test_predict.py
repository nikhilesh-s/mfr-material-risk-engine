"""Determinism regression test for the /predict API endpoint."""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from typing import Any


API_BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8000").rstrip("/")
PREDICT_URL = f"{API_BASE_URL}/predict"
PAYLOAD = {
    "MATERIAL": "PMMA",
}


def _post_json(url: str, payload: dict[str, Any]) -> dict[str, Any]:
    body = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        url=url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def _required_path_values() -> list[tuple[str, ...]]:
    return [
        ("riskScore",),
        ("riskClass",),
        ("resistanceIndex",),
        ("interpretation",),
        ("interpretability",),
        ("interpretability", "prediction"),
        ("interpretability", "bias"),
        ("interpretability", "feature_contributions"),
        ("interpretability", "top_5_features"),
        ("interpretability", "top_3_drivers"),
        ("confidence",),
        ("confidence", "score"),
        ("confidence", "label"),
        ("dataset",),
        ("dataset", "version"),
    ]


def _missing_paths(payload: dict[str, Any]) -> list[str]:
    missing: list[str] = []
    for path in _required_path_values():
        current: Any = payload
        path_ok = True
        for key in path:
            if not isinstance(current, dict) or key not in current:
                path_ok = False
                break
            current = current[key]
        if not path_ok:
            missing.append(".".join(path))
    return missing


def _first_diff(left: Any, right: Any, path: str = "$") -> str | None:
    if type(left) is not type(right):
        return f"{path}: type mismatch ({type(left).__name__} != {type(right).__name__})"
    if isinstance(left, dict):
        left_keys = set(left.keys())
        right_keys = set(right.keys())
        if left_keys != right_keys:
            return f"{path}: key mismatch ({sorted(left_keys)} != {sorted(right_keys)})"
        for key in sorted(left.keys()):
            diff = _first_diff(left[key], right[key], f"{path}.{key}")
            if diff:
                return diff
        return None
    if isinstance(left, list):
        if len(left) != len(right):
            return f"{path}: length mismatch ({len(left)} != {len(right)})"
        for idx, (l_item, r_item) in enumerate(zip(left, right)):
            diff = _first_diff(l_item, r_item, f"{path}[{idx}]")
            if diff:
                return diff
        return None
    if left != right:
        return f"{path}: value mismatch ({left!r} != {right!r})"
    return None


def main() -> int:
    print(f"Running determinism regression against {PREDICT_URL}")
    try:
        response_one = _post_json(PREDICT_URL, PAYLOAD)
        response_two = _post_json(PREDICT_URL, PAYLOAD)
    except urllib.error.HTTPError as exc:
        print(f"FAIL: HTTP error {exc.code} calling {PREDICT_URL}")
        try:
            print(exc.read().decode("utf-8"))
        except Exception:
            pass
        return 1
    except Exception as exc:
        print(f"FAIL: request execution error: {exc}")
        return 1

    missing_one = _missing_paths(response_one)
    missing_two = _missing_paths(response_two)
    if missing_one or missing_two:
        print("FAIL: required response fields missing")
        if missing_one:
            print(f"Response 1 missing: {missing_one}")
        if missing_two:
            print(f"Response 2 missing: {missing_two}")
        return 1

    if response_one != response_two:
        print("FAIL: repeated /predict responses are not identical")
        diff = _first_diff(response_one, response_two)
        if diff:
            print(f"First difference: {diff}")
        return 1

    print("PASS: repeated /predict responses are identical")
    print(
        json.dumps(
            {
                "riskScore": response_one.get("riskScore"),
                "riskClass": response_one.get("riskClass"),
                "dataset_version": response_one.get("dataset", {}).get("version"),
                "confidence": response_one.get("confidence"),
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
