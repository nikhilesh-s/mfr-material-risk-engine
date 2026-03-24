#!/usr/bin/env python3
"""Quick validation harness for deployed Dravix platform endpoints."""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request
from typing import Any

BASE_URL = os.getenv("DRAVIX_BASE_URL", "https://mfr-material-risk-engine.onrender.com").rstrip("/")
JSON_HEADERS = {"Content-Type": "application/json"}

CUSTOM_MATERIAL = {
    "material_name": "Custom Validation Polymer",
    "Density_g_cc": 1.24,
    "Melting_Point_C": 228.0,
    "Specific_Heat_J_g_C": 1.42,
    "Thermal_Cond_W_mK": 0.21,
    "CTE_um_m_C": 81.0,
    "Flash_Point_C": 335.0,
    "Autoignition_Temp_C": 462.0,
    "UL94_Flammability": 1.0,
    "Limiting_Oxygen_Index_pct": 29.0,
    "Smoke_Density_Ds": 118.0,
    "Char_Yield_pct": 18.0,
    "Decomp_Temp_C": 341.0,
    "Heat_of_Combustion_MJ_kg": 26.5,
    "Flame_Spread_Index": 32.0,
}


def request_json(method: str, path: str, payload: dict[str, Any] | None = None) -> tuple[bool, int, Any]:
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=data,
        headers=JSON_HEADERS,
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            body = response.read().decode("utf-8")
            return True, response.status, json.loads(body) if body else {}
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="ignore")
        try:
            parsed = json.loads(body) if body else {}
        except json.JSONDecodeError:
            parsed = {"raw": body}
        return False, exc.code, parsed
    except Exception as exc:
        return False, 0, {"error": str(exc)}


def report(name: str, ok: bool, status: int, payload: Any) -> None:
    verdict = "PASS" if ok else "FAIL"
    print(f"[{verdict}] {name} status={status}")
    print(json.dumps(payload, indent=2, default=str)[:1200])
    print("-" * 60)


def main() -> int:
    health_ok, health_status, health_payload = request_json("GET", "/health")
    report("/health", health_ok, health_status, health_payload)

    predict_ok, predict_status, predict_payload = request_json("POST", "/predict", CUSTOM_MATERIAL)
    report("/predict", predict_ok, predict_status, predict_payload)
    analysis_id = predict_payload.get("analysis_id") if isinstance(predict_payload, dict) else None

    if analysis_id:
        time.sleep(2)
        tds_ok, tds_status, tds_payload = request_json("GET", f"/tds/{analysis_id}")
        report("/tds/{analysis_id}", tds_ok, tds_status, tds_payload)

        advisor_ok, advisor_status, advisor_payload = request_json("GET", f"/advisor/{analysis_id}")
        report("/advisor/{analysis_id}", advisor_ok, advisor_status, advisor_payload)
    else:
        print("[FAIL] analysis-dependent endpoints skipped because /predict returned no analysis_id")
        print("-" * 60)
        tds_ok = advisor_ok = False

    clusters_ok, clusters_status, clusters_payload = request_json("GET", "/clusters")
    report("/clusters", clusters_ok, clusters_status, clusters_payload)

    export_ok, export_status, export_payload = request_json("GET", "/dataset/export")
    report("/dataset/export", export_ok, export_status, export_payload)

    rank_payload = {
        "materials": [
            {"material_name": "ABS (FR Grade)"},
            {"material_name": "Acrylic Sheet (PMMA)"},
            CUSTOM_MATERIAL,
        ],
        "use_case": "Fire-resistant building polymers",
    }
    rank_ok, rank_status, rank_response = request_json("POST", "/rank", rank_payload)
    report("/rank", rank_ok, rank_status, rank_response)

    compare_ok, compare_status, compare_payload = request_json("POST", "/compare", rank_payload)
    report("/compare", compare_ok, compare_status, compare_payload)

    overall_ok = all(
        [
            health_ok,
            predict_ok,
            clusters_ok,
            export_ok,
            rank_ok,
            compare_ok,
            tds_ok,
            advisor_ok,
        ]
    )
    return 0 if overall_ok else 1


if __name__ == "__main__":
    sys.exit(main())
