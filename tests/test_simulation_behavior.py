from __future__ import annotations

import pytest
from fastapi import HTTPException

from api.main import (
    _apply_simulation_modifications,
    _feature_vector_changed,
    _resolve_phase3_payload,
    load_phase3_runtime,
    simulate,
)
from src.api_contract import Phase3Input, SimulationRequest


def _initialize_runtime() -> None:
    load_phase3_runtime()


def test_simulation_modification_changes_feature_vector() -> None:
    _initialize_runtime()
    base_payload = _resolve_phase3_payload(Phase3Input(material_name="ABS"))
    modified_payload = _apply_simulation_modifications(
        payload_data=base_payload,
        modifications={"Limiting_Oxygen_Index_pct": 24},
    )

    assert base_payload["Limiting Oxygen Index (%)"] == 30.0
    assert modified_payload["Limiting Oxygen Index (%)"] == 24.0
    assert _feature_vector_changed(base_payload, modified_payload) is True


def test_simulation_rejects_no_op_changes() -> None:
    _initialize_runtime()
    request = SimulationRequest(
        base_material=Phase3Input(material_name="ABS"),
        modifications={"Limiting_Oxygen_Index_pct": 30},
    )

    with pytest.raises(HTTPException) as exc_info:
        simulate(request)

    assert exc_info.value.status_code == 400
    assert "did not change the base material values" in str(exc_info.value.detail)


def test_simulation_explains_when_model_output_does_not_change() -> None:
    _initialize_runtime()
    request = SimulationRequest(
        base_material=Phase3Input(material_name="ABS"),
        modifications={"Limiting_Oxygen_Index_pct": 24},
    )

    response = simulate(request)

    assert response["dominant_driver"] == "Limiting Oxygen Index (%)"
    assert "accepted the requested descriptor update" in response["explanation"]
