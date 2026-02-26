# Dravix Risk Engine v0.2-core

## Model Overview
Dravix Risk Engine provides deterministic fire-risk estimation from material fire-property inputs using a `RandomForestRegressor` served through a FastAPI backend.

Core outputs include:
- `riskScore` (rounded integer)
- `riskClass`
- `resistanceIndex`
- `interpretation` (deterministic template)
- `interpretability` (feature contributions, `top_5_features`, `top_3_drivers`)
- `confidence` (tree-variance normalized score + label)
- `dataset.version`

Engineering freeze scope:
- No changes to training logic
- No changes to inference math
- No changes to rounding logic
- No changes to API contract during freeze

## Dataset Version
Frozen dataset version tag:
- `v0.2-core`

Code references:
- `src/model.py` defaults `DATASET_VERSION` to `v0.2-core`
- `/predict` returns `dataset.version` for traceability

## Dataset Versioning Architecture
The repository now includes a versioned feature-construction scaffold for Phase 3 evolution without changing Phase 2 behavior.

Current status:
- `v0.2-core` remains the frozen default behavior
- `v0.3-layered` routing scaffold exists as a placeholder
- Version selection is controlled by `DRAVIX_DATASET_VERSION` (defaults to `v0.2-core`)

Implementation notes:
- `src/model.py` routes feature-matrix construction through a version-aware builder
- `src/feature_builders.py` contains the v0.2 builder and v0.3 placeholder
- `validation_runner.py` reports the dataset version used and fails cleanly for unimplemented `v0.3-layered`

## Validation Results
Validation is produced by the standalone reproducible pipeline (`validation_runner.py`) and exported to `validation_summary.json`.

Latest frozen metrics (`v0.2-core`):
- `n_samples`: `718`
- `pearson_correlation`: `0.9981853936236091`
- `r2_score`: `0.9963037863338758`
- `mae`: `0.17640771809835684`

## Determinism Guarantee
For identical inputs, the engine is expected to return identical outputs across repeated calls in the same build.

Deterministic properties verified in local validation:
- `riskScore` unchanged across repeated requests
- `interpretability.prediction` unchanged across repeated requests
- `interpretability` payload unchanged across repeated requests
- `confidence` payload unchanged across repeated requests
- `dataset.version` unchanged across repeated requests
- Full response JSON identical across repeated requests

Implementation notes:
- Inference uses a trained model loaded once at startup
- Interpretability and confidence scoring are deterministic functions of model outputs
- No runtime randomness is introduced in `/predict`

## Reproducibility
Run the standalone validation pipeline:

```bash
python validation_runner.py
```

What it does:
- Loads the same dataset used by the backend model startup
- Reuses the current model-loading path
- Generates predictions against ground-truth `risk_score`
- Computes Pearson correlation, R², and MAE
- Writes `validation_summary.json`

Generated artifact:
- `validation_summary.json` (indented JSON for versioned validation reporting)

## API Contract Stability
Phase 2 engineering freeze preserves the existing `/predict` response contract and rounding behavior.

Stability commitments during freeze:
- No removal of existing response fields
- No changes to risk score calculation or rounding
- No changes to interpretability math
- No changes to uncertainty/confidence math
- No new public debug endpoints

Production clarity updates applied:
- Startup diagnostic print utilities remain available for developer use but are not executed during API startup
