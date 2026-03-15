"""Shared Phase 3 API request/response schemas."""

from __future__ import annotations

from typing import Any, Dict, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator


class Phase3Input(BaseModel):
    """Descriptor input schema for Phase 3 resistance prediction."""

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "Density_g_cc": 1.25,
                    "Melting_Point_C": 220.0,
                    "Specific_Heat_J_g_C": 1.5,
                    "Thermal_Cond_W_mK": 0.21,
                    "CTE_um_m_C": 95.0,
                    "Flash_Point_C": 320.0,
                    "Autoignition_Temp_C": 450.0,
                    "UL94_Flammability": 1.0,
                    "Limiting_Oxygen_Index_pct": 19.0,
                    "Smoke_Density_Ds": 120.0,
                    "Char_Yield_pct": 12.0,
                    "Decomp_Temp_C": 300.0,
                    "Heat_of_Combustion_MJ_kg": 28.0,
                    "Flame_Spread_Index": 40.0,
                    "coating_code": "COAT-001",
                },
                {
                    "material_name": "Polyethylene (HDPE)",
                    "coating_code": "COAT-001",
                },
            ]
        }
    )

    Density_g_cc: Optional[float] = Field(default=None)
    Melting_Point_C: Optional[float] = Field(default=None)
    Specific_Heat_J_g_C: Optional[float] = Field(default=None)
    Thermal_Cond_W_mK: Optional[float] = Field(default=None)
    CTE_um_m_C: Optional[float] = Field(default=None)
    Flash_Point_C: Optional[float] = Field(default=None)
    Autoignition_Temp_C: Optional[float] = Field(default=None)
    UL94_Flammability: Optional[float] = Field(default=None)
    Limiting_Oxygen_Index_pct: Optional[float] = Field(default=None)
    Smoke_Density_Ds: Optional[float] = Field(default=None)
    Char_Yield_pct: Optional[float] = Field(default=None)
    Decomp_Temp_C: Optional[float] = Field(default=None)
    Heat_of_Combustion_MJ_kg: Optional[float] = Field(default=None)
    Flame_Spread_Index: Optional[float] = Field(default=None)
    material_name: Optional[str] = Field(default=None)
    coating_code: Optional[str] = Field(default=None)

    @model_validator(mode="after")
    def validate_input_mode(self) -> "Phase3Input":
        if self.material_name is not None and self.material_name.strip():
            return self

        numeric_fields = [
            "Density_g_cc",
            "Melting_Point_C",
            "Specific_Heat_J_g_C",
            "Thermal_Cond_W_mK",
            "CTE_um_m_C",
            "Flash_Point_C",
            "Autoignition_Temp_C",
            "UL94_Flammability",
            "Limiting_Oxygen_Index_pct",
            "Smoke_Density_Ds",
            "Char_Yield_pct",
            "Decomp_Temp_C",
            "Heat_of_Combustion_MJ_kg",
            "Flame_Spread_Index",
        ]
        missing = [name for name in numeric_fields if getattr(self, name) is None]
        if missing:
            raise ValueError(
                "All numeric descriptor fields are required when material_name is not provided."
            )
        return self


class DatasetOutput(BaseModel):
    version: str


class TopDriverOutput(BaseModel):
    feature: str
    contribution: float
    direction: str
    abs_magnitude: float


class InterpretabilityOutput(BaseModel):
    prediction: float
    feature_contributions: Dict[str, float]
    top_3_drivers: list[TopDriverOutput]
    display_names: Optional[Dict[str, str]] = None
    error: Optional[Dict[str, str]] = None


class ConfidenceOutput(BaseModel):
    score: float
    label: str


class MaterialsOutput(BaseModel):
    materials: list[str]


class CoatingsOutput(BaseModel):
    coatings: list[str]


class Phase3PredictResponse(BaseModel):
    resistanceScore: float
    effectiveResistance: float
    coatingModifier: Optional[float]
    dataset: DatasetOutput
    interpretability: InterpretabilityOutput
    confidence: ConfidenceOutput


class RankRequest(BaseModel):
    materials: list[Phase3Input]


class RankedMaterial(BaseModel):
    rank: int
    material: str
    resistanceScore: float
    confidence: str


class RankError(BaseModel):
    material: str
    error: str


class RankResponse(BaseModel):
    ranking: list[RankedMaterial]
    errors: list[RankError] = Field(default_factory=list)


class SimulationRequest(BaseModel):
    base_material: Phase3Input
    modifications: Dict[str, float | str]


class SimulationPredictionOutput(BaseModel):
    resistanceScore: float
    confidence: str


class SimulationChangeOutput(BaseModel):
    delta: float
    percent_change: Optional[float]


class SimulationResponse(BaseModel):
    baseline: SimulationPredictionOutput
    modified: SimulationPredictionOutput
    change: SimulationChangeOutput


class LoginInput(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    token: str
