# Dravix Backend Testing Payloads

The current route handlers are defined in [api/main.py](/Users/niks/Documents/GitHub/mfr-material-risk-engine/api/main.py), and the request models are defined in [src/api_contract.py](/Users/niks/Documents/GitHub/mfr-material-risk-engine/src/api_contract.py).

There is no separate `PredictRequest` class in the codebase. The endpoints currently use:

- `/predict` -> `Phase3Input`
- `/rank` -> `RankRequest`
- `/simulate` -> `SimulationRequest`

Relevant real dataset materials confirmed in the repo:

- `ABS (FR Grade)`
- `Aluminum (6061-T6)`
- `Acrylic Sheet (PMMA)`

## Predict Test Using material_name

Minimal valid JSON:

```json
{
  "material_name": "ABS (FR Grade)"
}
```

Alternative valid materials:

```json
{
  "material_name": "Aluminum (6061-T6)"
}
```

```json
{
  "material_name": "Acrylic Sheet (PMMA)"
}
```

curl:

```bash
curl -X POST https://mfr-material-risk-engine.onrender.com/predict \
  -H "Content-Type: application/json" \
  -d '{
    "material_name": "ABS (FR Grade)"
  }'
```

## Predict Test Using Custom Material

This works with clean snake_case aliases as well as the legacy request field names.

```json
{
  "material_name": "Custom Flame Polymer A",
  "density": 1.22,
  "melting_point": 240,
  "specific_heat": 1.35,
  "thermal_conductivity": 0.19,
  "cte": 72,
  "flash_point": 365,
  "autoignition_temp": 430,
  "ul94_flammability": 1,
  "limiting_oxygen_index": 28,
  "smoke_density": 95,
  "char_yield": 24,
  "decomposition_temp": 340,
  "heat_of_combustion": 27,
  "flame_spread_index": 32
}
```

```bash
curl -X POST https://mfr-material-risk-engine.onrender.com/predict \
  -H "Content-Type: application/json" \
  -d '{
    "material_name": "Custom Flame Polymer A",
    "density": 1.22,
    "melting_point": 240,
    "specific_heat": 1.35,
    "thermal_conductivity": 0.19,
    "cte": 72,
    "flash_point": 365,
    "autoignition_temp": 430,
    "ul94_flammability": 1,
    "limiting_oxygen_index": 28,
    "smoke_density": 95,
    "char_yield": 24,
    "decomposition_temp": 340,
    "heat_of_combustion": 27,
    "flame_spread_index": 32
  }'
```

## Rank Test

`/rank` expects an object with a `materials` array, and each array item must itself be a `Phase3Input` object. Passing strings directly will fail validation.

Minimal valid JSON:

```json
{
  "materials": [
    { "material_name": "ABS (FR Grade)" },
    { "material_name": "Aluminum (6061-T6)" },
    { "material_name": "Acrylic Sheet (PMMA)" }
  ]
}
```

Optional use-case form:

```json
{
  "materials": [
    { "material_name": "ABS (FR Grade)" },
    { "material_name": "Aluminum (6061-T6)" },
    { "material_name": "Acrylic Sheet (PMMA)" }
  ],
  "use_case": "Fire-resistant building polymers"
}
```

curl:

```bash
curl -X POST https://mfr-material-risk-engine.onrender.com/rank \
  -H "Content-Type: application/json" \
  -d '{
    "materials": [
      { "material_name": "ABS (FR Grade)" },
      { "material_name": "Aluminum (6061-T6)" },
      { "material_name": "Acrylic Sheet (PMMA)" }
    ]
  }'
```

## Simulate Test

`/simulate` does not accept `material_name` at the top level. It requires:

- `base_material`: a full `Phase3Input` object
- `modifications`: an object keyed by request field names such as `Limiting_Oxygen_Index_pct`, `Decomp_Temp_C`, `Thermal_Cond_W_mK`

Minimal valid JSON:

```json
{
  "base_material": {
    "material_name": "ABS (FR Grade)"
  },
  "modifications": {
    "Limiting_Oxygen_Index_pct": 33
  }
}
```

Another valid example:

```json
{
  "base_material": {
    "material_name": "Acrylic Sheet (PMMA)"
  },
  "modifications": {
    "Heat_of_Combustion_MJ_kg": 24
  }
}
```

curl:

```bash
curl -X POST https://mfr-material-risk-engine.onrender.com/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "base_material": {
      "material_name": "ABS (FR Grade)"
    },
    "modifications": {
      "Limiting_Oxygen_Index_pct": 33
    }
  }'
```

## Coating Analysis Test

The active backend path supports coating evaluation by passing `coating_code` through `/predict`.

```json
{
  "material_name": "ABS (FR Grade)",
  "coating_code": "193-MAT-001"
}
```

```bash
curl -X POST https://mfr-material-risk-engine.onrender.com/predict \
  -H "Content-Type: application/json" \
  -d '{
    "material_name": "ABS (FR Grade)",
    "coating_code": "193-MAT-001"
  }'
```

## Clusters Test

`/clusters` is a GET endpoint. The default cluster count is 6.

```bash
curl "https://mfr-material-risk-engine.onrender.com/clusters"
```

Optional custom cluster count:

```bash
curl "https://mfr-material-risk-engine.onrender.com/clusters?n_clusters=6"
```

## Dataset Search Test

`/dataset/search` is a GET endpoint with optional filters.

```bash
curl "https://mfr-material-risk-engine.onrender.com/dataset/search?material_name=ABS"
```

```bash
curl "https://mfr-material-risk-engine.onrender.com/dataset/search?density_min=1.0&density_max=1.5&melting_point_min=150"
```

## Optimize Test

`/optimize` accepts the same payload shape as `/predict`.

```json
{
  "material_name": "ABS (FR Grade)"
}
```

```bash
curl -X POST https://mfr-material-risk-engine.onrender.com/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "material_name": "ABS (FR Grade)"
  }'
```

Custom optimize example:

```json
{
  "material_name": "Custom Flame Polymer B",
  "density": 1.18,
  "melting_point": 215,
  "specific_heat": 1.42,
  "thermal_conductivity": 0.24,
  "cte": 81,
  "flash_point": 335,
  "autoignition_temp": 455,
  "ul94_flammability": 1,
  "limiting_oxygen_index": 27,
  "smoke_density": 102,
  "char_yield": 21,
  "decomposition_temp": 325,
  "heat_of_combustion": 26,
  "flame_spread_index": 29
}
```

## TDS PDF Test

Use an `analysis_id` returned from `/predict`.

```bash
curl -L "https://mfr-material-risk-engine.onrender.com/tds/DRX-20260328-1234/pdf" -o dravix_tds.pdf
```

## Contract Notes

- Inconsistency: `/predict` accepts `Phase3Input` directly, while `/simulate` wraps the same type inside `base_material`, and `/rank` wraps a list of the same type inside `materials`.
- Shared normalized material input model:
  - Internally, `Phase3Input` is normalized to a common descriptor payload using the same material fields across `/predict`, `/rank`, and `/simulate`.
  - Accepted aliases now include both legacy keys such as `Density_g_cc` and snake_case keys such as `density`.
- This is valid but not fully uniform. A cleaner contract would keep all analysis endpoints under a shared envelope pattern, for example:
  - `/predict`: `{ "material": { ...Phase3Input... } }`
  - `/rank`: `{ "materials": [ ...Phase3Input... ] }`
  - `/simulate`: `{ "base_material": { ...Phase3Input... }, "modifications": { ... } }`
- For current testing, use the payloads above exactly as written.
