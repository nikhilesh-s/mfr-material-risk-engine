# Dravix v0.3.1 System Documentation

## 1. System Overview

Dravix is an upstream fire-risk screening platform for candidate materials. It is designed to help engineering teams compare and prioritize materials earlier in the development pipeline, before committing to expensive physical fire testing, standards certification work, or later-stage prototype validation. The system uses material descriptor inputs such as limiting oxygen index, char yield, decomposition temperature, and heat of combustion to generate a deterministic fire-risk proxy.

The platform is intended as decision support rather than certification. Its value is in screening, ranking, and sensitivity exploration: engineers can evaluate a single material, rank multiple candidates, and test how selected property changes affect predicted fire-risk behavior. Deterministic inference is central to the design because repeatable outputs are required for technical review, engineering comparison, and competition judging.

## 2. System Architecture

Dravix is organized as a layered application:

- User Interface
  - browser-based workflow for screening, ranking, simulation, and export
- Frontend
  - React + Vite application in `frontend/`
- Backend API
  - FastAPI service in `api/main.py`
- ML inference engine
  - model runtime, feature engineering, confidence, and interpretability logic in `src/`
- Datasets
  - versioned materials and coatings datasets in `data/`
- Model artifact
  - serialized scikit-learn pipeline in `models/`

High-level flow:

`user input -> frontend form/chart UI -> FastAPI request -> descriptor resolution + preprocessing -> model inference -> confidence/explainability -> API response -> frontend visualization/export`

Supported product flows:

- single prediction
- batch ranking
- sensitivity simulation
- shortlist export

## 3. Repository Structure

- `api/`
  - FastAPI application and route definitions.
  - Main runtime entrypoint is `api/main.py`.
- `src/`
  - Core backend logic.
  - Contains model loading, dataset lookup helpers, feature vector construction, confidence scoring, and interpretability utilities.
- `data/`
  - Versioned datasets for materials and coatings.
  - Also contains legacy raw/processed data and validation outputs.
- `models/`
  - Serialized model artifacts and artifact metadata.
  - Includes the active stable model and newer retrained artifacts.
- `tests/`
  - Regression and verification tests for API behavior, determinism, version routing, and simulation behavior.
- `frontend/`
  - React/Vite user interface.
  - Contains pages, shared components, charting, simulation controls, API client, and design system tokens.

These folders exist to separate runtime concerns cleanly: HTTP service in `api/`, ML logic in `src/`, datasets in `data/`, artifacts in `models/`, verification in `tests/`, and UI in `frontend/`.

## 4. Backend Architecture

The backend is a FastAPI service defined in `api/main.py`. At startup it initializes the model runtime, loads the active reference dataset and lookup tables, computes confidence calibration statistics, and stores shared runtime objects in `app.state`.

Startup initialization includes:

- loading the active model artifact
- loading the materials lookup dataset
- loading the coatings lookup dataset
- loading the active reference dataset
- inspecting feature schema
- computing training variance statistics for confidence labeling
- storing row counts, active paths, and timestamps

`app.state` is used as the in-memory runtime cache for:

- `model`
- `feature_names`
- `reference_frame`
- `materials` and `coatings` lookup state
- confidence thresholds and variance statistics
- runtime metadata such as `model_loaded`, `lookup_loaded`, and active file paths

Request flow:

`request -> pydantic validation -> material lookup or manual descriptor parsing -> feature vector construction -> model.predict() -> confidence + interpretability -> response formatting`

The backend exposes dedicated endpoints for health, metadata, single prediction, batch ranking, simulation, and export.

## 5. Model System

The current ML system is a scikit-learn pipeline composed of:

- `SimpleImputer(strategy="median")`
- `RandomForestRegressor`

The active stable production artifact is:

- `models/model_v0.3-stable.pkl`

The repository also contains a retrained artifact:

- `models/model_v0.4.pkl`

Runtime model selection is versioned and environment-controlled, but the default stable runtime remains on `v0.3-stable`.

Deterministic inference is enforced through:

- fixed serialized model artifacts
- no runtime retraining
- fixed feature ordering
- stable preprocessing
- fixed random state during training

The model expects 13 features:

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

These features are aligned to `model.feature_names_in_` and are passed into the pipeline as a model-aligned DataFrame.

## 6. Dataset System

Dravix uses versioned datasets stored under `data/materials/` and `data/coatings/`.

Materials datasets:

- active stable reference dataset:
  - `data/materials/v0.3/materials_dataset.csv`
  - 1771 rows, 17 columns
- validated clean dataset:
  - `data/materials/v0.3.1/materials_dataset_clean.csv`
  - 1981 rows, 16 columns

Coatings datasets:

- active stable coatings lookup:
  - `data/coatings/v0.3/coatings_dataset.csv`
  - 187 rows, 9 columns
- validated clean coatings dataset:
  - `data/coatings/v0.3.1/coatings_dataset_clean.csv`
  - 449 rows, 8 columns

Supporting behavior:

- materials dataset supports descriptor lookup for prediction and ranking
- coatings dataset supports coating modifier lookup
- reference dataset is also used to derive normalization bounds for combustion-related features

Feature normalization is handled in the inference layer. Selected combustion-relevant columns are min-max scaled against bounds derived from the active reference dataset, and resistance-negative features are inverted so the model sees a consistent orientation.

## 7. API Endpoints

### `/predict`

- Purpose:
  - evaluate one material or one manually specified descriptor set
- Inputs:
  - `material_name` lookup request, or a full descriptor payload
  - optional `coating_code`
  - optional `use_case`
- Outputs:
  - `risk_score`
  - `resistance_index`
  - `confidence`
  - `top_drivers`
  - `explanation`
  - `notes`
  - `limitations_notice`
  - interpretability payload

### `/rank`

- Purpose:
  - rank multiple candidate materials from lowest to highest fire-risk proxy
- Inputs:
  - list of material lookup entries or manual descriptor payloads
  - optional `use_case`
- Outputs:
  - ordered `ranking`
  - per-row `risk_score`
  - per-row `confidence`
  - `notes`
  - `errors` for unresolved candidates

### `/simulate`

- Purpose:
  - compare baseline material prediction against a modified descriptor scenario
- Inputs:
  - `base_material`
  - `modifications`
  - optional `use_case`
- Outputs:
  - baseline prediction block
  - modified prediction block
  - `change` object
  - `dominant_driver`
  - `explanation`
  - `simulation_summary`
  - `driver_analysis`

### `/runtime-status`

- Purpose:
  - lightweight operational runtime check
- Inputs:
  - none
- Outputs:
  - `model_version`
  - `dataset_version`
  - `dataset_rows`
  - `model_loaded`
  - `lookup_loaded`

### `/model-metadata`

- Purpose:
  - expose model provenance and active runtime metadata
- Inputs:
  - none
- Outputs:
  - `model_version`
  - `dataset_version`
  - `model_type`
  - `model_artifact`
  - `dataset_build_date`
  - `deterministic`
  - `feature_names`
  - `feature_count`
  - row counts and active paths

### `/materials`

- Purpose:
  - list available materials for lookup-driven prediction and ranking
- Inputs:
  - none
- Outputs:
  - `materials` list

### `/coatings`

- Purpose:
  - list available coatings for modifier lookup
- Inputs:
  - none
- Outputs:
  - `coatings` list

### `/export/ranking`

- Purpose:
  - export ranked shortlist results
- Inputs:
  - ranked candidate request payload
  - `format` of `csv` or `json`
- Outputs:
  - filename
  - content type
  - serialized file content

## 8. Ranking Engine

Batch ranking is implemented as a vectorized inference workflow.

Flow:

- resolve each candidate into a descriptor payload
- build a batch feature matrix
- call `model.predict(X_batch)` once
- compute confidence for each result
- convert resistance output into risk score
- sort ascending by risk score

Key behaviors:

- lower risk scores rank higher
- confidence is returned for each ranked material
- unresolved inputs are reported in `errors`
- the frontend renders ranked results both as a table and as a leaderboard chart

This vectorized design avoids repeated single-item prediction calls and improves endpoint latency.

## 9. Simulation Engine

The simulation system performs a baseline-versus-modified comparison for one material.

Flow:

- resolve the baseline material or manual payload
- generate baseline feature vector
- apply requested descriptor modifications
- rebuild modified feature vector
- verify the modification actually changes model inputs
- infer baseline and modified predictions
- compute deltas and summaries

Returned comparison fields include:

- baseline score
- modified score
- absolute delta
- percent delta
- dominant changed driver
- summary sentence
- driver analysis list

Simulation can legitimately return zero delta when the feature vector changes but the random forest prediction remains in the same effective decision region. In that case the modification is real, but the model output does not move enough to cross a different ensemble outcome. This is expected behavior for tree-based models.

## 10. Frontend Architecture

The frontend is a React application built with Vite.

Main structure:

- `frontend/src/App.tsx`
  - app shell and route definitions
- `frontend/src/pages/`
  - page-level routes
- `frontend/src/components/`
  - reusable prediction, ranking, simulation, chart, and metadata components
- `frontend/src/lib/api.ts`
  - typed API communication layer
- `frontend/src/types.ts`
  - shared frontend request/response types
- `frontend/src/theme/designSystem.ts`
  - centralized design tokens

Current routed pages:

- dashboard / workflow landing
- single material screening
- batch ranking
- sensitivity simulation
- methodology

State management is local React state with effect-based data fetching. There is no global store library; most interactions are page- or component-scoped.

## 11. Visualization System

Current visualization features include:

- leaderboard visualization
  - horizontal bar chart for ranked materials
- sensitivity sliders
  - interactive controls for selected simulation descriptors
- delta indicator
  - visual before/after change signal on the simulation output
- model provenance panel
  - compact research-style card populated from `/model-metadata`

These components are themed through the shared design system and operate on live backend responses.

## 12. Deployment Architecture

Backend deployment:

- Render-hosted FastAPI service
- `render.yaml` starts `uvicorn api.main:app --host 0.0.0.0 --port $PORT`

Frontend deployment:

- Vercel-hosted React/Vite frontend
- frontend API base can be overridden with `VITE_API_BASE_URL`

Environment variables:

- `VITE_API_BASE_URL`
  - frontend backend URL override
- `DRAVIX_MODEL_VERSION`
  - backend model artifact selection
- Render also exposes build commit metadata used in `/version`

API routing:

- frontend calls the backend over HTTPS
- CORS is configured for the production frontend domains and local dev hosts

## 13. Runtime Snapshot

Current default deployed runtime state:

- model version:
  - `v0.3-stable`
- dataset version:
  - `v0.3-stable`
- active reference materials dataset:
  - `data/materials/v0.3/materials_dataset.csv`
  - 1771 rows
- active coatings lookup dataset:
  - `data/coatings/v0.3/coatings_dataset.csv`
  - 187 rows
- deterministic inference:
  - enabled

Available features in the current runtime:

- single-material screening
- batch ranking
- sensitivity simulation
- model metadata inspection
- runtime status inspection
- materials/coatings lookup
- shortlist export
- frontend leaderboard and simulation visualizations

Repository state relevant to v0.3.1:

- validated `v0.3.1` materials and coatings datasets exist in `data/`
- retraining pipeline exists in `scripts/`
- newer `model_v0.4.pkl` artifact exists in `models/`
- default stable deployment has not been switched to the newer artifact

## 14. Known Limitations

- The default deployed runtime still serves the stable `v0.3-stable` model rather than the newer validated `v0.3.1` data path.
- The cleaned `v0.3.1` materials dataset does not include the target column used by the original model, so retraining requires label alignment.
- Simulation deltas may remain zero for legitimate tree-model reasons even when descriptors change.
- The system is a screening engine, not a certification or compliance tool.
- Frontend state management is local and lightweight rather than a larger-scale app architecture.

## 15. Summary

Dravix v0.3.1 represents a transition point from a single-model demo into a structured engineering decision-support platform with versioned datasets, explicit runtime metadata, batch ranking, sensitivity exploration, and live frontend visualizations. The repository now supports cleaner model/data lineage and stronger technical presentation while preserving the stable `v0.3-stable` runtime for reproducibility and deployment safety.
