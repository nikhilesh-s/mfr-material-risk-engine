# Dravix Phase 3 Technical Notes (v0.3-stable)

## 1) What Changed In This Pass
- Hardened runtime path resolution to repository-root anchored paths via `src/utils.py` (`repo_path(...)`) and applied it to runtime-critical loaders:
  - `src/model.py` (model artifact, reference dataset, materials lookup)
  - `src/phase3_inference.py` (model + bounds source)
  - `src/phase3_coating_modifier.py` (coatings dataset)
- Cleaned API metadata endpoints without breaking `/predict`:
  - `/health` now returns `status`, `dataset_version`, `model_loaded`, `lookup_loaded`
  - `/version` now returns `service`, `api_version`, `dataset_version`, `model_artifact`, `build_hash`, `timestamp_utc`
- Upgraded API docs request examples for `Phase3Input` so Swagger reflects current field names.
- Standardized interpretability payload quality:
  - `top_3_drivers` now includes `feature`, `contribution`, `direction`, `abs_magnitude`
  - Added `display_names` mapping while preserving `feature_contributions`
- Added shared schema module `src/api_contract.py` to keep request/response schemas reusable outside API runtime.
- Added deterministic artifact export pipeline: `scripts/export_phase3_artifacts.py`.
- Added deterministic core prediction tests:
  - `tests/test_predict_determinism.py`
  - updated `tests/test_version_routing.py` for v0.3-stable runtime checks.

## 2) Why It Matters
- Improves deployment reliability on Render by removing working-directory sensitivity.
- Improves reproducibility and communication quality for investor/research materials with deterministic artifact generation.
- Improves interpretability usability for UI and technical review without altering model prediction math.
- Maintains compatibility and stability of the active Phase 3 API contract.

## 3) Artifacts Exported
| Artifact | Type | Path | Purpose | Slide Use |
|---|---|---|---|---|
| validation_summary.json | JSON | `artifacts/phase3/validation_summary.json` | Core validation metrics + residual stats + variance summary | Model quality summary |
| validation_predictions.csv | CSV | `artifacts/phase3/validation_predictions.csv` | Per-sample truth vs prediction (when target available) | Appendix / error table |
| validation_residuals.csv | CSV | `artifacts/phase3/validation_residuals.csv` | Residual and absolute residual distributions | Error analysis slide |
| plot_residual_hist.png | PNG | `artifacts/phase3/plot_residual_hist.png` | Residual distribution visual | Calibration / reliability slide |
| plot_pred_vs_actual.png | PNG | `artifacts/phase3/plot_pred_vs_actual.png` | Predicted vs actual scatter (if target exists) | Fit quality slide |
| plot_confidence_distribution.png | PNG | `artifacts/phase3/plot_confidence_distribution.png` | Per-sample tree-variance distribution used for confidence | Confidence methodology slide |
| plot_top_features_global.png | PNG | `artifacts/phase3/plot_top_features_global.png` | Mean absolute contribution ranking | Explainability slide |
| coating_impact_summary.csv | CSV | `artifacts/phase3/coating_impact_summary.csv` | Coating impact summary for layered analysis | Coating impact slide |
| api_contract_snapshot.json | JSON | `artifacts/phase3/api_contract_snapshot.json` | Request/response schema snapshot from Pydantic models | API contract appendix |

## 4) Visuals Now Available For Deck
- Residual histogram: demonstrates error concentration and outlier behavior.
- Predicted vs actual scatter: demonstrates fit strength and calibration.
- Confidence distribution (tree variance): demonstrates uncertainty calibration basis.
- Global top-feature contribution bar chart: demonstrates explainability and driver concentration.
- Coating impact summary table: demonstrates optional layered-effect analysis.

## 5) Deployment Checklist
- `DATASET_VERSION` locked to `v0.3-stable`.
- Runtime files tracked in Git:
  - `models/model_v0.3-stable.pkl`
  - `data/phase3_model/materials_phase3_ready.csv`
  - `data/phase3_model/materials_phase3_with_target_v2.csv`
  - `data/phase3_clean/coatings_clean.csv`
- Runtime import paths package-based and stable.
- No retraining or stochastic operations during API startup.
- `/predict` contract preserved.
- Determinism tests pass locally.

## 6) Known Limitations
- Validation currently reflects in-repository reference data and should be treated as model QA, not certification evidence.
- Regulatory/fire safety certification requires external lab protocols and formal standard-specific testing beyond current ML validation artifacts.
- Confidence labels are model-variance based and should be interpreted as internal uncertainty indicators, not external risk guarantees.
