# Dravix API Payload Examples

The live Phase 3 runtime reports these model features via `/model-metadata`:

1. `Density (g/cc)`
2. `Melting Point (°C)`
3. `Specific Heat (J/g-°C)`
4. `Thermal Cond. (W/m-K)`
5. `CTE (µm/m-°C)`
6. `Flash Point (°C)`
7. `Autoignition Temp (°C)`
8. `Limiting Oxygen Index (%)`
9. `Smoke Density (Ds)`
10. `Char Yield (%)`
11. `Decomp. Temp (°C)`
12. `Heat of Combustion (MJ/kg)`
13. `Flame Spread Index`

The API request model accepts these values through the contract keys in `Phase3Input`. Use the legacy request keys below or the snake_case aliases described in the schema.

## POST /predict

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
    {
      "material_name": "ABS (FR Grade)"
    },
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
    {
      "material_name": "ABS (FR Grade)"
    },
    {
      "material_name": "Acrylic Sheet (PMMA)"
    },
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

## Snake Case Equivalent

The same custom payload also works with snake_case aliases:

```json
{
  "material_name": "Custom Validation Polymer",
  "density": 1.24,
  "melting_point": 228.0,
  "specific_heat": 1.42,
  "thermal_conductivity": 0.21,
  "cte": 81.0,
  "flash_point": 335.0,
  "autoignition_temp": 462.0,
  "ul94_flammability": 1.0,
  "limiting_oxygen_index": 29.0,
  "smoke_density": 118.0,
  "char_yield": 18.0,
  "decomposition_temp": 341.0,
  "heat_of_combustion": 26.5,
  "flame_spread_index": 32.0
}
```
