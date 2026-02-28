# API Contract v0.3-stable

Service: Dravix Phase 3 Resistance API  
API version: `0.3.0`  
Dataset version: `v0.3-stable`

## Endpoints
- `GET /health`
- `GET /version`
- `GET /materials`
- `GET /coatings`
- `POST /predict`

## Request Schema (`POST /predict`)
`Phase3Input`

Fields:
- `Density_g_cc: float | null`
- `Melting_Point_C: float | null`
- `Specific_Heat_J_g_C: float | null`
- `Thermal_Cond_W_mK: float | null`
- `CTE_um_m_C: float | null`
- `Flash_Point_C: float | null`
- `Autoignition_Temp_C: float | null`
- `UL94_Flammability: float | null`
- `Limiting_Oxygen_Index_pct: float | null`
- `Smoke_Density_Ds: float | null`
- `Char_Yield_pct: float | null`
- `Decomp_Temp_C: float | null`
- `Heat_of_Combustion_MJ_kg: float | null`
- `Flame_Spread_Index: float | null`
- `material_name: string | null`
- `coating_code: string | null` (optional)

Validation rules:
- If `material_name` is present and non-empty: lookup mode is used.
- If `material_name` is absent/empty: all numeric descriptor fields above are required.
- `coating_code` remains optional in both modes.

## Response Schema (`POST /predict`)
`Phase3PredictResponse`

Top-level fields:
- `resistanceScore: number`
- `effectiveResistance: number`
- `coatingModifier: number | null`
- `dataset: { version: string }`
- `interpretability:`
  - `prediction: number`
  - `feature_contributions: Record<string, number>`
  - `top_3_drivers: Array<{ feature: string, contribution: number, direction: string, abs_magnitude: number }>`
  - `display_names?: Record<string, string>`
  - `error?: { type: string, message: string }`
- `confidence: { score: number, label: string }`

## Error Cases
- `422 Unprocessable Entity`
  - Trigger: invalid request shape (for example, missing numeric fields when `material_name` is not provided).
- `404 Not Found`
  - Trigger: `material_name` lookup miss.
  - Body: `{ "error": "Material not found in database" }`

## Example Payloads

Manual mode:
```json
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
  "coating_code": "193-MAT-001"
}
```

Lookup mode:
```json
{
  "material_name": "Polyethylene (HDPE)",
  "coating_code": "193-MAT-001"
}
```

## Example Response
```json
{
  "resistanceScore": 0.409350587069,
  "effectiveResistance": 0.409350587069,
  "coatingModifier": null,
  "dataset": {
    "version": "v0.3-stable"
  },
  "interpretability": {
    "prediction": 0.409350587069,
    "feature_contributions": {
      "Density (g/cc)": -0.0123,
      "Melting Point (°C)": 0.0211
    },
    "top_3_drivers": [
      {
        "feature": "Melting Point (°C)",
        "contribution": 0.0211,
        "direction": "increases_resistance",
        "abs_magnitude": 0.0211
      },
      {
        "feature": "Density (g/cc)",
        "contribution": -0.0123,
        "direction": "decreases_resistance",
        "abs_magnitude": 0.0123
      },
      {
        "feature": "Flash Point (°C)",
        "contribution": 0.0082,
        "direction": "increases_resistance",
        "abs_magnitude": 0.0082
      }
    ]
  },
  "confidence": {
    "score": 0.683269209561,
    "label": "Medium"
  }
}
```
