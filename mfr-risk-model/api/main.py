"""FastAPI entrypoint for Phase 2 live inference."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Optional

import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from src.model import predict_risk, train_model
from src.utils import clean_fire_properties


class FirePropertiesInput(BaseModel):
    """Minimal input schema for live inference."""

    material_name: Optional[str] = Field(default=None, alias="Material_Name")
    material: str = Field(..., alias="MATERIAL")
    orientation: Optional[str] = Field(default=None, alias="ORIENTATION")
    heat_flux: Optional[float] = Field(default=None, alias="HEAT FLUX")
    surf_area: Optional[float] = Field(default=None, alias="SURF AREA")
    c_factor: Optional[float] = Field(default=None, alias="C FACTOR")
    spec_holder_diff: Optional[float] = Field(default=None, alias="SPEC HOLDER DIFF")
    specimen_mass: Optional[float] = Field(default=None, alias="SPECIMEN MASS")
    scan_time: Optional[float] = Field(default=None, alias="SCAN TIME")
    o2_delay_time: Optional[float] = Field(default=None, alias="O2 DELAY TIME")
    co_delay_time: Optional[float] = Field(default=None, alias="CO DELAY TIME")
    co2_delay_time: Optional[float] = Field(default=None, alias="CO2 DELAY TIME")
    flow_factor: Optional[float] = Field(default=None, alias="FLOW FACTOR")
    scan_count: Optional[float] = Field(default=None, alias="SCAN COUNT")
    time_to_ign: Optional[float] = Field(default=None, alias="TIME TO IGN")
    end_of_test_scan: Optional[float] = Field(default=None, alias="END OF TEST SCAN")
    end_of_test_time: Optional[float] = Field(default=None, alias="END OF TEST TIME")
    test_status: Optional[float] = Field(default=None, alias="TEST STATUS")

    class Config:
        populate_by_name = True


app = FastAPI(title="MFR Risk API", version="0.1.0")

RAW_DATA_PATH = (
    Path(__file__).resolve().parents[1]
    / "data"
    / "raw"
    / "Fire_Properties_master_fire_properties.csv"
)


@app.on_event("startup")
def load_model() -> None:
    """Load data and train a Phase 1-equivalent model once at startup."""
    if not RAW_DATA_PATH.exists():
        raise FileNotFoundError(f"Missing dataset at {RAW_DATA_PATH}")

    raw_df = pd.read_csv(RAW_DATA_PATH)
    cleaned_df, _ = clean_fire_properties(raw_df)
    model, _ = train_model(cleaned_df)

    app.state.raw_df = raw_df
    app.state.model = model


@app.post("/predict")
def predict(payload: FirePropertiesInput) -> Dict[str, Any]:
    """Run cleaning + feature pipeline and return UI-ready risk outputs."""
    if not hasattr(app.state, "model") or not hasattr(app.state, "raw_df"):
        raise HTTPException(status_code=500, detail="Model is not initialized.")

    raw_df = app.state.raw_df
    model = app.state.model

    input_row = {col: None for col in raw_df.columns}
    for key, value in payload.dict(by_alias=True).items():
        input_row[key] = value

    combined = pd.concat([raw_df, pd.DataFrame([input_row])], ignore_index=True)
    cleaned_combined, _ = clean_fire_properties(combined)
    cleaned_row = cleaned_combined.iloc[-1].to_dict()

    result = predict_risk(model, cleaned_row)
    return {
        "riskScore": result["riskScore"],
        "riskClass": result["riskClass"],
        "resistanceIndex": result["resistanceIndex"],
        "interpretation": result["interpretation"],
    }
