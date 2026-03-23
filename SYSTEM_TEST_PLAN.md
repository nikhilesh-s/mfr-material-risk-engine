# System Test Plan

This plan is for manual verification of the current Dravix system state before further development.

## Preconditions

1. Create and activate a Python environment.
2. Install backend dependencies.
3. Install frontend dependencies.

Recommended setup:

```bash
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
npm --prefix frontend install
```

## Test 1 — Backend Startup

Purpose:
- Confirm the API server launches successfully and loads the runtime.

Command:

```bash
uvicorn api.main:app --reload
```

Expected:
- Server starts without crashing.
- Startup completes.
- No missing dataset/model path error appears.

## Test 2 — Health Check

Purpose:
- Confirm the API reports a healthy runtime.

Command:

```bash
curl http://127.0.0.1:8000/health
```

Expected:
- JSON response with:
  - `status: "ok"`
  - `model_loaded: true`
  - `lookup_loaded: true`

## Test 3 — Model Metadata

Purpose:
- Confirm model/schema metadata is exposed.

Command:

```bash
curl http://127.0.0.1:8000/model-metadata
curl http://127.0.0.1:8000/schema
```

Expected:
- `/model-metadata` returns model type, feature list, row counts, and deterministic status.
- `/schema` returns accepted request fields and model features.

## Test 4 — Single Material Inference by Lookup

Purpose:
- Confirm lookup-mode scoring works.

Command:

```bash
curl -X POST http://127.0.0.1:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"material_name":"ABS","use_case":"EV battery enclosure"}'
```

Expected:
- JSON response with:
  - `material_name`
  - `risk_score`
  - `resistance_index`
  - `confidence`
  - `top_drivers`
  - `explanation`
  - `limitations_notice`

## Test 5 — Single Material Inference by Manual Descriptors

Purpose:
- Confirm manual mode works.

Command:

```bash
curl -X POST http://127.0.0.1:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
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
    "Flame_Spread_Index": 40.0
  }'
```

Expected:
- Valid prediction response with score, confidence, interpretability, and explanation fields.

## Test 6 — Batch Ranking

Purpose:
- Confirm multiple materials can be ranked live.

Command:

```bash
curl -X POST http://127.0.0.1:8000/rank \
  -H "Content-Type: application/json" \
  -d '{
    "use_case":"EV battery enclosure",
    "materials":[
      {"material_name":"PEEK"},
      {"material_name":"Polycarbonate"},
      {"material_name":"ABS"}
    ]
  }'
```

Expected:
- JSON response with `ranking`.
- Results sorted from lowest to highest `risk_score`.

## Test 7 — Sensitivity Exploration

Purpose:
- Confirm what-if exploration works.

Command:

```bash
curl -X POST http://127.0.0.1:8000/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "use_case":"EV battery enclosure",
    "base_material":{"material_name":"ABS"},
    "modifications":{
      "Limiting_Oxygen_Index_pct":24,
      "Thermal_Cond_W_mK":"+15%"
    }
  }'
```

Expected:
- JSON response with:
  - `baseline`
  - `modified`
  - `change`
  - `dominant_driver`
  - `explanation`

## Test 8 — Ranking Export

Purpose:
- Confirm backend export works.

Command:

```bash
curl -X POST http://127.0.0.1:8000/export/ranking \
  -H "Content-Type: application/json" \
  -d '{
    "format":"csv",
    "use_case":"EV battery enclosure",
    "materials":[
      {"material_name":"PEEK"},
      {"material_name":"Polycarbonate"},
      {"material_name":"ABS"}
    ]
  }'
```

Expected:
- JSON response containing:
  - `filename`
  - `content_type`
  - serialized CSV content

## Test 9 — Frontend Startup

Purpose:
- Confirm the frontend builds and runs locally.

Command:

```bash
npm --prefix frontend run dev
```

Expected:
- Frontend starts successfully.
- The app loads with Dravix branding, workflow navigation, and no blank screen.

## Test 10 — Frontend Single Screening Flow

Purpose:
- Confirm frontend-to-backend integration for single screening.

Steps:
1. Open the frontend.
2. Go to `Single Screening`.
3. Select `ABS` or use a demo profile.
4. Run screening.

Expected:
- Screen displays:
  - risk score
  - resistance index
  - confidence
  - explanation
  - top drivers
  - limitations notice

## Test 11 — Frontend Batch Ranking Flow

Purpose:
- Confirm batch ranking UI works.

Steps:
1. Open `Batch Ranking`.
2. Add candidates from search or paste list.
3. Run Dravix ranking.

Expected:
- Ranked shortlist appears.
- Top recommended candidate card updates.
- Export buttons work.

## Test 12 — Frontend Sensitivity Flow

Purpose:
- Confirm sensitivity UI works.

Steps:
1. Open `Sensitivity`.
2. Select a base material.
3. Add one or more descriptor changes.
4. Run the scenario.

Expected:
- Before/after cards update.
- Risk change appears.
- Dominant driver and explanation appear.

## Test 13 — Dataset Validation Script

Purpose:
- Confirm the dataset validation/preparation script runs.

Command:

```bash
python scripts/validate_and_prepare_datasets.py
```

Expected:
- Script detects `v0.3.1` uploaded datasets.
- Writes:
  - `data/materials/v0.3.1/materials_dataset_clean.csv`
  - `data/coatings/v0.3.1/coatings_dataset_clean.csv`
  - validation reports

## Test 14 — Error Handling: Unknown Material

Purpose:
- Confirm a useful error is returned for invalid lookup input.

Command:

```bash
curl -X POST http://127.0.0.1:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"material_name":"NOT_A_REAL_MATERIAL"}'
```

Expected:
- Non-200 response with descriptive error text such as `Material not found in database`.

## Test 15 — Error Handling: Bad Simulation Input

Purpose:
- Confirm simulation input validation is descriptive.

Command:

```bash
curl -X POST http://127.0.0.1:8000/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "base_material":{"material_name":"ABS"},
    "modifications":{"Unsupported_Field": 10}
  }'
```

Expected:
- Non-200 response with descriptive message for unsupported modification field.

## Test 16 — Automated Verification

Purpose:
- Confirm current automated checks pass.

Commands:

```bash
npm --prefix frontend run typecheck
npm --prefix frontend run build
.venv/bin/pytest tests/test_api_endpoints.py tests/test_predict_determinism.py tests/test_version_routing.py -q
```

Expected:
- Typecheck passes.
- Frontend production build passes.
- Pytest suite passes when the API is reachable for endpoint tests.
