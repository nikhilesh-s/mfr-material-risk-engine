from __future__ import annotations

from api.main import load_phase3_runtime, predict
from src.api_contract import Phase3Input


def _initialize_runtime() -> None:
    load_phase3_runtime()


def test_numeric_payload_is_deterministic() -> None:
    _initialize_runtime()
    payload = Phase3Input(
        Density_g_cc=1.25,
        Melting_Point_C=220.0,
        Specific_Heat_J_g_C=1.5,
        Thermal_Cond_W_mK=0.21,
        CTE_um_m_C=95.0,
        Flash_Point_C=320.0,
        Autoignition_Temp_C=450.0,
        UL94_Flammability=1.0,
        Limiting_Oxygen_Index_pct=19.0,
        Smoke_Density_Ds=120.0,
        Char_Yield_pct=12.0,
        Decomp_Temp_C=300.0,
        Heat_of_Combustion_MJ_kg=28.0,
        Flame_Spread_Index=40.0,
        coating_code=None,
    )
    result_one = predict(payload)
    result_two = predict(payload)
    assert result_one == result_two


def test_material_name_payload_is_deterministic() -> None:
    _initialize_runtime()
    payload = Phase3Input(material_name="Polyethylene (HDPE)")
    result_one = predict(payload)
    result_two = predict(payload)
    assert result_one == result_two
