# Phase 3 Dataset Intake Checklist (v0.3-layered)

## Scope
- `v0.2-core` is frozen and remains the production-compatible baseline.
- `v0.3-layered` is an expansion path for descriptor-rich layered material inputs.
- No synthetic data is permitted in dataset intake or validation.

## Column Naming Conventions (Required)
- Base layer descriptors must use `base_` prefix.
- Coating layer descriptors must use `coating_` prefix.
- Additive descriptors must use `additive_` prefix.
- Use lowercase snake_case after the prefix (example: `base_density_g_cm3`).
- Avoid spaces, mixed units in one column, or ambiguous abbreviations.

## Units Policy (Must Be Explicit)
- Every numeric descriptor must have a documented unit in the dataset specification.
- Temperature units must be explicitly specified (`Celsius` vs `Kelvin`) and consistent per column.
- Thickness units must be explicit and consistent (for example `mm` vs `um`).
- Density, heat capacity, conductivity, and flux units must be declared in the data dictionary.
- Unit conversions must be performed upstream and documented before model training.

## Missing Values Policy (Must Be Declared Per Column)
- For each column, define one of:
  - `required` (rows dropped if missing)
  - `impute` (method specified, e.g. median/mode/constant)
  - `not_applicable` (allowed by design with explicit semantics)
- Missing value strategy must be identical between training and validation pipelines.
- Do not silently coerce missing values without documenting the rule.

## Allowed Descriptor Types
- Numerical descriptors:
  - Continuous physical properties (density, conductivity, thickness, heat capacity, etc.)
  - Measured test conditions with declared units
- Categorical descriptors:
  - Controlled vocabularies only (material family, coating class, additive class)
  - Enumerations must be versioned and documented
- Free-text descriptors are not valid model inputs until explicitly encoded in a versioned builder.

## No Synthetic Data Rule
- Do not fabricate rows, layer combinations, or proxy descriptor values.
- Do not backfill unavailable descriptors with guessed values for training inclusion.
- Placeholder columns for future modeling are not allowed in production training datasets.

## Versioning Rules
- Set `DRAVIX_DATASET_VERSION` to select the feature builder path (`v0.2-core` or `v0.3-layered`).
- The API response field `dataset.version` must continue reflecting the active dataset version.
- Any new dataset schema requires a new version tag before training/inference changes are enabled.

## Validation Requirements for v0.3
- Deterministic train/test split validation (document seed and split ratio).
- Deterministic K-fold cross-validation (default target: 5 folds, fixed random state).
- Report Pearson correlation, R², and MAE for both holdout and CV summaries.
- Export versioned validation outputs and model metadata snapshot artifacts.

## Rollout Guardrails
- `v0.2-core` compatibility must remain intact while `v0.3-layered` is under implementation.
- `v0.3-layered` should remain disabled/placeholder until real descriptor data is approved.
- Any activation of `v0.3-layered` requires updated feature builder tests and validation baselines.
