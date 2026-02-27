"""Phase 3 layered resistance engine prototype (standalone, no API integration)."""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from phase3_coating_modifier import get_coating_modifier
from phase3_inference import MODEL_VERSION, predict_material_resistance


COATINGS_PATH = Path("data/phase3_clean/coatings_clean.csv")
MATERIALS_PATH = Path("data/phase3_model/materials_phase3_ready.csv")


def predict_effective_resistance(
    material_input: dict[str, Any], coating_code: str | None = None
) -> dict[str, Any]:
    """Predict base/effective resistance with optional coating adjustment."""
    base_result = predict_material_resistance(material_input)
    base_score = float(base_result["resistance_score"])

    if coating_code is None:
        return {
            "base_resistance": base_score,
            "effective_resistance": base_score,
            "coating_applied": False,
            "model_version": MODEL_VERSION,
        }

    coating_result = get_coating_modifier(coating_code)
    modifier = float(coating_result["coating_modifier"])
    effective_score = float(np.clip(base_score * (1.0 + modifier), 0.0, 1.0))

    return {
        "base_resistance": base_score,
        "coating_modifier": modifier,
        "effective_resistance": effective_score,
        "coating_applied": True,
        "model_version": MODEL_VERSION,
    }


def _build_example_material_input() -> dict[str, Any]:
    if not MATERIALS_PATH.exists():
        raise FileNotFoundError(f"Missing materials dataset: {MATERIALS_PATH}")
    materials_df = pd.read_csv(MATERIALS_PATH, low_memory=False)
    if materials_df.empty:
        raise ValueError("Materials dataset is empty.")
    return materials_df.iloc[0].to_dict()


def _get_example_coating_code() -> str:
    if not COATINGS_PATH.exists():
        raise FileNotFoundError(f"Missing coatings dataset: {COATINGS_PATH}")
    coatings_df = pd.read_csv(COATINGS_PATH, low_memory=False)
    if "Coating_Code" not in coatings_df.columns:
        raise ValueError("Coating_Code column missing from coatings dataset.")
    if coatings_df.empty:
        raise ValueError("Coatings dataset is empty.")
    return str(coatings_df.iloc[0]["Coating_Code"])


def main() -> None:
    example_material_input = _build_example_material_input()
    example_coating_code = _get_example_coating_code()

    without_coating = predict_effective_resistance(example_material_input, coating_code=None)
    with_coating = predict_effective_resistance(
        example_material_input, coating_code=example_coating_code
    )

    print("=== PHASE 3 LAYERED ENGINE FLAG ===")
    print("Example without coating:")
    print(without_coating)
    print("Example with coating:")
    print(with_coating)
    print(f"Timestamp: {datetime.now(timezone.utc).isoformat()}")


if __name__ == "__main__":
    main()
