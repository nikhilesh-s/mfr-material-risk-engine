# Dravix Resistance Engine v0.3-stable

## Model Overview
`main` now serves a Phase 3 layered resistance engine from a persisted artifact (`models/model_v0.3-stable.pkl`) exposed as dataset version `v0.3-stable`.

Inference flow:
- Base material resistance is computed through `predict_material_resistance` (Phase 3 wrapper).
- Optional coating adjustment is applied via `get_coating_modifier` and bounded to `[0, 1]`.
- Confidence is derived from per-tree prediction variance calibrated against startup baseline variance statistics.

`/predict` response contract:
- `resistanceScore`
- `effectiveResistance`
- `coatingModifier`
- `dataset.version`
- `interpretability` (`prediction`, `feature_contributions`, `top_3_drivers`)
- `confidence` (`score`, `label`)

## Dataset Version
- Active version constant: `v0.3-stable` (`src/model.py`)
- Artifact loaded: `models/model_v0.3-stable.pkl`
- Phase 2 is preserved on branch: `archive/v0.2-core` at commit `538893b`

## Validation Results
Phase 3 validation artifacts are exported under `artifacts/phase3/`:
- `validation_summary.json`
- `validation_predictions.csv`
- `validation_residuals.csv`
- `plot_residual_hist.png`
- `plot_pred_vs_actual.png`
- `plot_confidence_distribution.png`
- `plot_top_features_global.png`
- `coating_impact_summary.csv`
- `api_contract_snapshot.json`

## Determinism Guarantee
For identical payloads, `/predict` is expected to return identical JSON in the same deployed build.

Determinism controls:
- Fixed artifact loading at startup (no retraining during inference)
- No stochastic runtime operations in `/predict`
- Random forest seeded during training (`random_state=42`) and used as a fixed artifact
- Confidence computed deterministically from tree variance and fixed calibration stats

Regression check:
```bash
python regression_test_predict.py
```

## API Contract Stability
`main` is now Phase 3 contract-first and no longer serves Phase 2 `riskScore` outputs.

Compatibility note:
- Phase 2 behavior is archived (not deleted) on `archive/v0.2-core`.
- `main` is dedicated to `v0.3-stable` layered resistance inference.
- Frozen API contract: `docs/API_CONTRACT_v0.3-stable.md`

## Deployment
- Backend deployment target (Render): repository root with `uvicorn api.main:app`.
- Frontend deployment target (Vercel): `frontend/` only.
- Legacy UI folders are retained for historical reference and are not deploy targets:
  - `mfr-risk-model/ui/`
  - `mfr-risk-model/dravix_updated_ui/`

## Model Freeze (Phase 3)
- Frozen dataset version: `v0.3-stable`
- Frozen artifact: `models/model_v0.3-stable.pkl`
- Runtime behavior: inference-only startup, no retraining
- Contract guarantee: `/predict` response fields remain stable for Phase 3 rollout
- Validation artifact set: `artifacts/phase3/` is the canonical export bundle for deck/reporting

## Phase 3 Freeze Manifest
- Model artifact: `models/model_v0.3-stable.pkl`
- Dataset file: `data/phase3_model/materials_phase3_with_target_v2.csv`
- Target column: `Base_Resistance_Target`
- Git tag: `v0.3-stable`
- Validation metrics:
  - Pearson correlation: `0.9971771555733013`
  - R²: `0.9942678879251557`
  - MAE: `0.0023332345282051823`
