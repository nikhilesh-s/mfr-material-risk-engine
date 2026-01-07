"""FastAPI entrypoint for Phase 2 live inference."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from src.model import predict_risk, train_model
from src.utils import DROP_COLUMNS, META_COLUMNS, TEXT_HEAVY_COLUMNS, clean_fire_properties, map_material_type


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
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

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
    training_stats = _build_training_stats(raw_df)
    feature_cols = cleaned_df.drop(columns=["risk_score"]).columns.tolist()

    app.state.training_stats = training_stats
    app.state.feature_cols = feature_cols
    app.state.model = model


def _build_training_stats(raw_df: pd.DataFrame) -> Dict[str, Any]:
    """Capture preprocessing stats from training data for inference-time transforms."""
    base = raw_df.drop(columns=DROP_COLUMNS, errors="ignore")
    base = base.drop(columns=TEXT_HEAVY_COLUMNS, errors="ignore")
    base = base.drop(columns=META_COLUMNS, errors="ignore")
    base["material_type"] = base["MATERIAL"].map(map_material_type)

    numeric_cols = base.select_dtypes(include=["number"]).columns.tolist()
    categorical_cols = [
        col for col in base.select_dtypes(include=["object"]).columns if col != "MATERIAL"
    ]

    medians = base[numeric_cols].median()
    base[numeric_cols] = base[numeric_cols].fillna(medians)
    base[categorical_cols] = base[categorical_cols].fillna("unknown")

    category_levels = {
        col: list(base[col].astype("category").cat.categories) for col in categorical_cols
    }

    minmax: Dict[str, Tuple[float, float]] = {}
    for col in numeric_cols:
        minmax[col] = (float(base[col].min()), float(base[col].max()))

    encoded = pd.get_dummies(base.drop(columns=["MATERIAL"], errors="ignore"), drop_first=True)

    return {
        "numeric_cols": numeric_cols,
        "categorical_cols": categorical_cols,
        "medians": medians,
        "minmax": minmax,
        "category_levels": category_levels,
        "dummy_columns": encoded.columns.tolist(),
    }


def _transform_input(
    raw_row: Dict[str, Any],
    stats: Dict[str, Any],
    feature_cols: List[str],
) -> pd.DataFrame:
    """Transform a single raw input row using training-time statistics."""
    base = pd.DataFrame([raw_row])
    base = base.drop(columns=DROP_COLUMNS, errors="ignore")
    base = base.drop(columns=TEXT_HEAVY_COLUMNS, errors="ignore")
    base = base.drop(columns=META_COLUMNS, errors="ignore")

    if "MATERIAL" not in base.columns or base["MATERIAL"].isna().all():
        raise HTTPException(status_code=400, detail="MATERIAL is required for inference.")

    base["material_type"] = base["MATERIAL"].map(map_material_type)
    material_type = base["material_type"].iloc[0]
    representative = {
        "polymer": "PMMA",
        "composite": "Composite_Deck_Board",
        "generic": "Masonite_Board",
    }.get(material_type)
    if representative:
        if "Material_Name" not in base.columns:
            base["Material_Name"] = np.nan
        if base["Material_Name"].isna().all():
            base["Material_Name"] = representative

    for col in stats["numeric_cols"]:
        if col not in base.columns:
            base[col] = np.nan
        base[col] = pd.to_numeric(base[col], errors="coerce")
        base[col] = base[col].fillna(stats["medians"][col])
    for col in stats["categorical_cols"]:
        if col not in base.columns:
            base[col] = np.nan
        base[col] = base[col].fillna("unknown")
        base[col] = pd.Categorical(base[col], categories=stats["category_levels"][col])

    ui_ranges = {
        "HEAT FLUX": (0.0, 2000.0),
        "TIME TO IGN": (1.0, 480.0),
    }
    for col, (ui_min, ui_max) in ui_ranges.items():
        if col in base.columns and pd.notna(base[col].iloc[0]) and ui_max > ui_min:
            col_min, col_max = stats["minmax"][col]
            value = float(base[col].iloc[0])
            scaled = col_min + ((value - ui_min) / (ui_max - ui_min)) * (col_max - col_min)
            base[col] = scaled

    heat_factor = {
        "polymer": 1.2,
        "composite": 1.0,
        "generic": 0.8,
    }.get(material_type, 1.0)
    time_factor = {
        "polymer": 2.0,
        "composite": 1.0,
        "generic": 0.5,
    }.get(material_type, 1.0)
    if "HEAT FLUX" in base.columns and pd.notna(base["HEAT FLUX"].iloc[0]):
        base["HEAT FLUX"] = base["HEAT FLUX"] * heat_factor
    if "TIME TO IGN" in base.columns and pd.notna(base["TIME TO IGN"].iloc[0]):
        base["TIME TO IGN"] = base["TIME TO IGN"] * (1 / time_factor)

    for col in ("HEAT FLUX", "TIME TO IGN"):
        if col in base.columns and pd.notna(base[col].iloc[0]):
            col_min, col_max = stats["minmax"][col]
            base[col] = float(np.clip(base[col].iloc[0], col_min, col_max))

    encoded = pd.get_dummies(base.drop(columns=["MATERIAL"], errors="ignore"), drop_first=True)
    for col in stats["dummy_columns"]:
        if col not in encoded.columns:
            encoded[col] = 0.0
    encoded = encoded[stats["dummy_columns"]]

    for col in stats["numeric_cols"]:
        col_min, col_max = stats["minmax"][col]
        if col_min == col_max:
            encoded[col] = 0.0
        else:
            encoded[col] = (encoded[col] - col_min) / (col_max - col_min)

    encoded = encoded.reindex(columns=feature_cols, fill_value=0.0)
    return encoded


@app.post("/predict")
def predict(payload: FirePropertiesInput) -> Dict[str, Any]:
    """Run cleaning + feature pipeline and return UI-ready risk outputs."""
    if not hasattr(app.state, "model") or not hasattr(app.state, "raw_df"):
        raise HTTPException(status_code=500, detail="Model is not initialized.")

    model = app.state.model
    stats = app.state.training_stats
    feature_cols = app.state.feature_cols

    input_row = {col: None for col in stats["numeric_cols"] + stats["categorical_cols"] + ["MATERIAL"]}
    payload_data = payload.dict(by_alias=True)
    for key, value in payload_data.items():
        input_row[key] = value

    feature_frame = _transform_input(input_row, stats, feature_cols)

    result = predict_risk(model, feature_frame.iloc[0].to_dict())
    return {
        "riskScore": result["riskScore"],
        "riskClass": result["riskClass"],
        "resistanceIndex": result["resistanceIndex"],
        "interpretation": result["interpretation"],
    }
