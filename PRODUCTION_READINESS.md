# Dravix Phase 3 Production Readiness

## Backend Version
- Service: `Dravix Phase 3 Resistance API`
- API version: `0.3.0`
- Dataset version: `v0.3-stable`
- Model artifact: `model_v0.3-stable.pkl`
- Build hash: `acf61006c150e0d68e5149c7eff141cdef56261e` (latest observed from `/version`)

## Frontend Deployment URL
- Vercel: `https://mfr-material-risk-engine.vercel.app`

## Dataset Version
- Runtime dataset: `v0.3-stable`
- Reference data: `data/phase3_model/materials_phase3_with_target_v2.csv`

## Validation Metrics
Source: `artifacts/phase3/validation_summary.json`

- Samples: `1771`
- Pearson correlation: `0.9971771555733013`
- R²: `0.9942678879251557`
- MAE: `0.0023332345282051836`
- MSE: `4.0220332200153085e-05`
- Residual mean/std: `0.000245509253198671 / 0.006337196336452494`

## Demo Scenarios
Configured in `frontend/src/demoProfiles.ts`:

1. `Manual Polymer`
   - Mode: Manual descriptors
   - Payload: polymer-like numeric descriptor set
2. `Lookup HDPE`
   - Mode: Material lookup
   - Payload: `{ "material_name": "Polyethylene (HDPE)" }`
3. `Manual + Coating`
   - Mode: Manual descriptors + coating
   - Payload: manual polymer-like set plus `coating_code = "193-MAT-001"`

## Artifact Export Presence
Required Phase 3 artifacts confirmed in `artifacts/phase3/`:

- `validation_summary.json`
- `validation_predictions.csv`
- `validation_residuals.csv`
- `plot_residual_hist.png`
- `plot_pred_vs_actual.png`
- `plot_confidence_distribution.png`
- `plot_top_features_global.png`
- `coating_impact_summary.csv`
- `api_contract_snapshot.json`

## Known Limitations
- Validation remains in-sample against the current reference dataset and is not external certification.
- Confidence labels are model-variance based and should be interpreted as internal uncertainty guidance.
- Build hash can change after each deployment; `/version` should be used as source of truth for live commit identity.
