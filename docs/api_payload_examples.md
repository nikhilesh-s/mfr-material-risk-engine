# Dravix API Payload Examples

Shared normalized material input model:

- `material_name` for dataset lookup
- or full descriptor input using the same `Phase3Input` fields across `/predict`, `/rank`, `/simulate`, and `/compare`
- accepted forms:
  - legacy request keys such as `Density_g_cc`
  - snake_case aliases such as `density`

Canonical custom material payload:

```json
{
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
  "Flame_Spread_Index": 32.0
}
```

## POST /predict

```json
{
  "material_name": "ABS (FR Grade)"
}
```

```json
{
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
  "Flame_Spread_Index": 32.0
}
```

## POST /rank

```json
{
  "materials": [
    { "material_name": "ABS (FR Grade)" },
    { "material_name": "Acrylic Sheet (PMMA)" },
    {
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
      "Flame_Spread_Index": 32.0
    }
  ],
  "use_case": "Fire-resistant building polymers"
}
```

## POST /simulate

```json
{
  "base_material": {
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
    "Flame_Spread_Index": 32.0
  },
  "modifications": {
    "Limiting_Oxygen_Index_pct": 33.0,
    "Decomp_Temp_C": 356.0
  },
  "use_case": "Fire-resistant building polymers"
}
```

## POST /compare

```json
{
  "materials": [
    { "material_name": "ABS (FR Grade)" },
    { "material_name": "Acrylic Sheet (PMMA)" },
    {
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
      "Flame_Spread_Index": 32.0
    }
  ],
  "use_case": "Fire-resistant building polymers"
}
```

## POST /dataset/upload

Use `multipart/form-data` with a CSV file field named `file`.

Example CSV:

```csv
material_name,density,melting_point,thermal_conductivity,specific_heat,decomposition_temp,glass_transition_temp
Validation Material A,1.24,228,0.21,1.42,341,118
Validation Material B,1.87,660,167,0.90,620,120
```

## POST /export/ranking

```json
{
  "materials": [
    { "material_name": "ABS (FR Grade)" },
    { "material_name": "Acrylic Sheet (PMMA)" }
  ],
  "use_case": "Fire-resistant building polymers",
  "format": "json"
}
```

## POST /advisor/chat

```json
{
  "analysis_id": "DRX-20260325-0001",
  "user_question": "What property changes would most likely improve fire resistance without increasing uncertainty?"
}
```
