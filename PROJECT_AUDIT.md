# Project Audit

This audit reflects the current checked-out state of the Dravix repository as inspected from code, data files, scripts, and local verification. This report is intentionally descriptive, not aspirational.

## 1. Repository Architecture

### Active runtime and product directories

- `api/`
  - Contains the active FastAPI service entrypoint.
  - Primary file: `api/main.py`.
  - This is the deployed backend surface for health, lookup, prediction, ranking, simulation, schema, metadata, and export.

- `src/`
  - Contains the active inference/runtime logic.
  - Includes model loading, dataset lookup helpers, confidence scoring, interpretability, coating modifier logic, and feature orientation.
  - Key files:
    - `src/model.py`
    - `src/phase3_inference.py`
    - `src/phase3_coating_modifier.py`
    - `src/api_contract.py`

- `frontend/`
  - Active React/Vite frontend.
  - Contains the current branded workflow UI and live API client.
  - Key areas:
    - `frontend/src/pages/`
    - `frontend/src/components/`
    - `frontend/src/lib/api.ts`

- `data/`
  - Current dataset root.
  - Versioned into:
    - `data/materials/`
    - `data/coatings/`
  - Also contains legacy supporting subfolders:
    - `data/processed/`
    - `data/raw/`
    - `data/phase3_model/`
    - `data/phase3_clean/`
  - Important current state:
    - active runtime now reads `data/materials/v0.3/materials_dataset.csv`
    - active runtime now reads `data/coatings/v0.3/coatings_dataset.csv`
    - cleaned validation outputs exist for `v0.3.1`

- `models/`
  - Contains frozen model artifacts used by inference.
  - Active artifact:
    - `models/model_v0.3-stable.pkl`

- `scripts/`
  - Utility scripts, not production request handlers.
  - Important current scripts:
    - `scripts/validate_and_prepare_datasets.py`
    - `scripts/export_phase3_artifacts.py`
  - Archived scripts moved to:
    - `scripts/archive/`

- `tests/`
  - Current automated verification.
  - Covers:
    - endpoint contract checks
    - deterministic behavior
    - version/path checks

- `docs/`
  - Product, architecture, and API documentation.
  - Includes historical v0.3 docs plus newer endpoint overview.

- `demo_assets/`
  - Demo input/output examples for product walkthroughs and Conrad presentation support.

### Historical or likely inactive directories

- `mfr-risk-model/`
  - Historical workspace with archived UI versions, notebooks, and old environment folders.
  - Useful as an asset/reference source, but not part of the active runtime path.

- `metadata/`
  - Contains older metadata snapshots.
  - Not the active metadata source for the current runtime.

- `validation/` and root validation artifacts
  - Historical validation outputs and supporting files.
  - Useful reference artifacts, not the active API runtime.

### Interaction map

- Frontend calls backend through `frontend/src/lib/api.ts`.
- Backend loads model and lookup/reference data on startup.
- `api/main.py` delegates scoring/orientation logic into `src/`.
- `src/model.py` and `src/phase3_inference.py` load the frozen artifact and align request inputs to the model feature schema.
- `scripts/validate_and_prepare_datasets.py` prepares future datasets, but those cleaned `v0.3.1` outputs are not yet the active inference dataset.

## 2. Backend Status

### Classification summary

| Item | Status | Notes |
| --- | --- | --- |
| Model loading | WORKING | Startup loads `model_v0.3-stable.pkl` successfully. |
| Model training code | MISSING | No active training pipeline is present in the current repo runtime path. |
| Dataset pipeline | PARTIAL | Validation/cleaning script exists, but active inference still uses `v0.3` reference data. |
| Inference pipeline | WORKING | Real deterministic inference is implemented and locally verified. |
| API endpoints | WORKING | Core endpoints are implemented and tested. |
| Feature engineering | WORKING | Runtime feature orientation and bounds normalization are implemented. |
| Explainability logic | WORKING | Tree-based contribution logic exists via `treeinterpreter`. |
| Batch prediction capability | WORKING | `/rank` is live and returns ranked results. |
| Dataset versioning | PARTIAL | Versioned folders exist, but runtime selection is effectively hard-coded to `v0.3`. |
| Error handling | PARTIAL | Basic HTTP errors are descriptive, but observability/logging is thin. |

### Detailed backend notes

#### Model loading: WORKING

- `api/main.py` startup loads the model through `src/phase3_inference.py` and `src/model.py`.
- Local verification showed startup completes successfully.
- Automated tests passed after runtime path alignment.

#### Model training code: MISSING

- The repository contains a frozen artifact and validation/export utilities.
- It does not currently contain an active end-to-end training script or reproducible training workflow in the main runtime tree.
- Documentation references training history, but active code is inference-focused.

#### Dataset pipeline: PARTIAL

- The repository has a real dataset validation script:
  - `scripts/validate_and_prepare_datasets.py`
- That script:
  - detects CSV or XLSX
  - assigns headers for headerless spreadsheets
  - removes duplicates
  - coerces numeric columns
  - drops materials rows with more than 30% missing required data
  - writes clean outputs and validation reports
- Limitation:
  - current inference does not automatically switch to `v0.3.1` cleaned datasets
  - active runtime remains pinned to `v0.3`

#### Inference pipeline: WORKING

- Implemented in:
  - `src/phase3_inference.py`
  - `src/model.py`
- Flow:
  - load model
  - load reference dataset for feature bounds
  - normalize combustion-related features
  - build feature frame aligned to `model.feature_names_in_`
  - run prediction
  - compute confidence from tree variance
  - compute top drivers from feature contributions

#### API endpoints: WORKING

- Implemented endpoints:
  - `GET /health`
  - `GET /version`
  - `GET /schema`
  - `GET /model-metadata`
  - `GET /materials`
  - `GET /coatings`
  - `POST /predict`
  - `POST /rank`
  - `POST /simulate`
  - `POST /export/ranking`
  - `POST /login`
- HTTP endpoint tests passed locally against a running server.

#### Feature engineering: WORKING

- Runtime orientation logic exists in `src/phase3_inference.py`.
- Combustion-related variables are min-max scaled against dataset bounds.
- Negative-direction fire-risk variables are inverted where appropriate.
- Note:
  - runtime uses 13 actual model features
  - `UL94 Flammability` exists in request payloads but is not part of the active model feature list

#### Explainability logic: WORKING

- `src/model.py` uses `treeinterpreter`.
- Outputs include:
  - full feature contribution map
  - top 3 drivers
  - fallback interpretability response if contribution generation fails

#### Batch prediction capability: WORKING

- `/rank` performs repeated live prediction calls and sorts outputs by `risk_score`.
- Response includes:
  - rank
  - material label
  - material name
  - risk score
  - resistance index
  - confidence
  - notes
- This is real backend logic, not mocked.

#### Dataset versioning: PARTIAL

- Versioned layout exists:
  - `data/materials/v0.3`
  - `data/materials/v0.3.1`
  - `data/materials/v0.4`
  - `data/coatings/v0.3`
  - `data/coatings/v0.3.1`
  - `data/coatings/v0.4`
- Current limitation:
  - active runtime is pinned in code to `v0.3`
  - no runtime selector or environment-based version switching exists

#### Error handling: PARTIAL

- Backend returns meaningful HTTP messages for:
  - material not found
  - invalid modification fields
  - invalid percentage strings
  - missing runtime/model paths
- Weaknesses:
  - limited structured logging
  - generic catch-all paths in `/rank`
  - startup still relies on deprecated FastAPI `on_event`

## 3. Frontend Status

### Pages/screens present

- `DashboardPage`
- `SingleMaterialPage`
- `ScreeningPage`
- `SimulatorPage`
- `MethodologyPage`

### Frontend feature classification

| Feature | Status | Notes |
| --- | --- | --- |
| Single material evaluation | WORKING | Live `/predict` integration with lookup and manual modes. |
| Batch material ranking | WORKING | Live `/rank` integration plus export flow. |
| Sensitivity exploration | WORKING | Live `/simulate` integration with before/after output. |
| Interpretability visualization | WORKING | Top drivers and explanation text are rendered in single-screen flow. |
| Industry/use-case selection | WORKING | Use-case selector is present in single, batch, and sensitivity modes. |
| AI explanation | PARTIAL | Plain-language explanation exists, but it is deterministic template logic, not LLM-generated. |
| Workflow/shortlist framing | WORKING | Dashboard and batch screen frame shortlist and export workflow. |
| Methodology / limitations view | WORKING | Separate methodology screen exists. |
| Static placeholder screens | MISSING | No major active screen is placeholder-only anymore. |

### Live API connectivity

- Frontend uses `frontend/src/lib/api.ts`.
- Default API base points to deployed backend unless overridden by `VITE_API_BASE_URL`.
- Active screens use real backend calls:
  - dashboard: `/health`, `/version`, `/model-metadata`
  - single screen: `/materials`, `/coatings`, `/predict`
  - batch screen: `/rank`, `/export/ranking`
  - simulator: `/simulate`
  - methodology: `/schema`, `/model-metadata`

### Real vs mocked behavior

- Real:
  - predictions
  - ranking
  - simulation
  - export
  - metadata
  - schema display
- Not truly AI:
  - explanation text is rule/template based, not generated by a language model
- Demo profiles exist:
  - they prefill forms and trigger live calls
  - they are not fake-result mocks

## 4. Dataset Pipeline

### Dataset locations

- Active runtime datasets:
  - `data/materials/v0.3/materials_dataset.csv`
  - `data/coatings/v0.3/coatings_dataset.csv`
- Newer validated datasets:
  - `data/materials/v0.3.1/materials_dataset_clean.csv`
  - `data/coatings/v0.3.1/coatings_dataset_clean.csv`

### Dataset counts

- `data/materials/v0.3/materials_dataset.csv`
  - 1771 rows
  - 17 columns
- `data/coatings/v0.3/coatings_dataset.csv`
  - 187 rows
  - 9 columns
- `data/materials/v0.3.1/materials_dataset_clean.csv`
  - 1981 rows
  - 16 columns
- `data/coatings/v0.3.1/coatings_dataset_clean.csv`
  - 449 rows
  - 8 columns

### Validation process

- Script:
  - `scripts/validate_and_prepare_datasets.py`
- Supports:
  - CSV and XLSX detection
  - XLSX to CSV conversion when needed
  - headerless spreadsheet schema inference
  - duplicate removal
  - numeric coercion
  - missing-value reporting
  - row dropping for materials when more than 30% of required data is missing
  - clean CSV output
  - text validation reports

### Missing data and duplicate handling

From current `v0.3.1` validation reports:

- Materials:
  - original rows: 3426
  - duplicates removed: 556
  - rows removed for >30% missing required data: 889
  - cleaned rows: 1981
- Coatings:
  - original rows: 457
  - duplicates removed: 8
  - cleaned rows: 449

### Schema handling status

- Materials source is headerless and gets inferred into expected columns.
- Coatings source is also headerless and gets inferred.
- Limitation:
  - clean outputs retain extra inferred columns like `Additional Column 1` or `Additional Column 2/3` when source files carry extra data

### Is the model using the cleaned dataset?

- No.
- Current runtime uses `data/materials/v0.3/materials_dataset.csv`, not `data/materials/v0.3.1/materials_dataset_clean.csv`.
- Current coating modifier logic uses `data/coatings/v0.3/coatings_dataset.csv`, not the `v0.3.1` cleaned coatings output.

## 5. Model Pipeline

### Model type

- Real scikit-learn pipeline:
  - `imputer`
  - `RandomForestRegressor`

### Features used

Active model feature list:

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

### Target variable

- `Base_Resistance_Target`

### Dataset used for active inference

- `data/materials/v0.3/materials_dataset.csv`

### Prediction flow

Input -> Feature Engineering -> Model -> Output

Detailed runtime path:

1. Input arrives through `Phase3Input`.
2. Request is resolved either by:
   - material lookup from active dataset, or
   - manual numeric descriptor payload.
3. Feature frame is built in `src/phase3_inference.py`.
4. Combustion-related variables are normalized using bounds from the active reference dataset.
5. Negative-direction features are inverted for resistance orientation.
6. Aligned feature frame is passed to the model.
7. Model returns a resistance score.
8. Backend converts that into:
   - `resistance_index`
   - `risk_score`
9. Confidence is derived from per-sample tree variance against the reference distribution.
10. Interpretability is derived from per-feature contributions.
11. API returns structured response including explanation, notes, and limitations notice.

### Explainability support

- Implemented with `treeinterpreter`.
- Supports local feature contributions and top drivers.
- Frontend surfaces those results in the single-material screen.

### Deterministic behavior

- Deterministic at runtime.
- No online training or stochastic mutation during serving.
- Automated determinism tests pass.

## 6. UI Design State

### Design assets present

- Dedicated Dravix SVG logo:
  - `frontend/src/assets/dravix_brand.svg`
- Older chemistry/materials SVG still present:
  - `frontend/src/assets/chemistry-svgrepo-com.svg`
- Archived earlier Dravix logo sources also still exist under `mfr-risk-model/`.

### Visual style assessment

- Modern: yes
- Minimal: partly, but no longer flat/generic
- Generic dashboard: no longer primarily generic
- Research-grade tool: mostly yes

### Current style characteristics

- warm research-lab palette
- gradients in shell and hero sections
- branded logo in active sidebar
- workflow framing in navigation and landing/dashboard
- cleaner product hierarchy than a plain internal admin panel

### Overall UI status

- The active frontend now reads as a branded engineering tool rather than a placeholder dashboard.
- It is still more presentation/demo-oriented than enterprise-hardened, but it is clearly positioned as a research/engineering screening product.

## 7. Error Handling

### Backend

- Descriptive `HTTPException` usage exists for:
  - missing model/runtime
  - unknown materials
  - unknown coating code
  - invalid modification inputs
  - unsupported modification fields
- Weaknesses:
  - limited structured logging
  - no centralized exception middleware
  - `/rank` collapses some errors into generic `"prediction failed"`

### Frontend

- Frontend catches `ApiError` and surfaces messages in the UI.
- Errors shown are generally meaningful:
  - material not found
  - invalid adjustment
  - timeout
  - generic request failure
- Weaknesses:
  - no retry UX beyond message text
  - no detailed field-level error mapping for all screens
  - no backend health banner beyond dashboard metadata cards

## 8. Current Capabilities

Dravix can currently do the following right now:

- start a FastAPI backend locally
- load a real frozen model artifact
- load active materials and coatings lookup datasets
- evaluate a single material by lookup name
- evaluate a single material by manual descriptor entry
- compute a resistance score and derived risk score
- compute confidence from ensemble variance
- compute top-driver interpretability
- rank multiple candidate materials live
- run supported sensitivity / what-if exploration
- export ranked shortlist data as CSV or JSON
- display live results in the frontend
- show a branded workflow-oriented UI
- show model metadata and schema information in the UI
- run deterministic tests successfully

## 9. Missing Capabilities

Dravix cannot currently do the following, or cannot do them fully:

- retrain the model from the new validated `v0.3.1` datasets within the active repo flow
- switch active inference datasets dynamically between versions
- use the cleaned `v0.3.1` datasets for production inference today
- provide true LLM-based AI explanations
- upload structured batch spreadsheets with schema mapping in the UI
- support full multi-property engineering optimization beyond current fire-risk proxy
- provide robust production logging/monitoring
- provide certification-grade or standards-grade reasoning

## 10. Recommended Next Steps

1. Decide whether `v0.3.1` should remain validation-only or become the next active training/inference dataset.
2. Add an explicit offline retraining pipeline that consumes versioned clean datasets and produces a versioned model artifact plus metadata.
3. Add runtime dataset/model version selection rather than keeping `v0.3` hard-coded.
4. Improve batch import UX for spreadsheet-driven candidate sets.
5. Decide whether the “AI explanation” requirement means:
   - better deterministic explanation templates, or
   - actual LLM integration.
6. Add centralized logging and more structured error reporting if deployment reliability matters.

## Feature Gap Table

| Feature | Status | Notes |
| --- | --- | --- |
| Single material evaluation | WORKING | API endpoint exists and active UI is connected. |
| Manual descriptor screening | WORKING | Single-screen manual mode calls live backend. |
| Material lookup screening | WORKING | Lookup dropdown uses live `/materials` data. |
| Batch material ranking | WORKING | `/rank` is live and batch UI is connected. |
| Batch CSV/TXT import | PARTIAL | File text import exists, but not full spreadsheet mapping. |
| Sensitivity simulation | WORKING | `/simulate` is live and UI is connected. |
| Fire-risk interpretability UI | WORKING | Top drivers are visualized on the single-screen page. |
| Model metadata endpoint | WORKING | `/model-metadata` exists and is used by UI. |
| Feature/schema endpoint | WORKING | `/schema` exists and is used by methodology screen. |
| Export shortlist | WORKING | `/export/ranking` returns CSV or JSON. |
| Industry/use-case framing | WORKING | Use-case selectors are present in active UI flows. |
| AI explanation layer | PARTIAL | Explanation exists, but it is template-based rather than LLM-based. |
| Dataset versioning | PARTIAL | Versioned folders exist, but active runtime is pinned to `v0.3`. |
| Cleaned dataset usage in model | MISSING | Active runtime does not use `v0.3.1` clean datasets. |
| Offline retraining pipeline | MISSING | No active training workflow is implemented in the current repo. |
| Production-grade logging | PARTIAL | Basic errors exist, but observability is limited. |
