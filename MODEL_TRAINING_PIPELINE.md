# Model Training Pipeline

This document defines the offline lifecycle used to move Dravix from raw datasets to a versioned model artifact without changing runtime determinism.

## Lifecycle

raw dataset  
-> validation script  
-> clean dataset  
-> training pipeline  
-> versioned model artifact  
-> inference API

## 1. Dataset Validation

- Place new materials and coatings spreadsheets into versioned folders under `data/materials/<version>/` and `data/coatings/<version>/`.
- Run [scripts/validate_and_prepare_datasets.py](/Users/niks/Documents/GitHub/mfr-material-risk-engine/scripts/validate_and_prepare_datasets.py).
- The script:
  - detects CSV or XLSX inputs
  - converts XLSX to CSV when needed
  - validates expected schema
  - removes duplicates
  - coerces numeric columns
  - drops materials rows with more than 30% missing required values
  - writes clean outputs and validation reports

Validated outputs for the current next iteration are:
- [data/materials/v0.3.1/materials_dataset_clean.csv](/Users/niks/Documents/GitHub/mfr-material-risk-engine/data/materials/v0.3.1/materials_dataset_clean.csv)
- [data/coatings/v0.3.1/coatings_dataset_clean.csv](/Users/niks/Documents/GitHub/mfr-material-risk-engine/data/coatings/v0.3.1/coatings_dataset_clean.csv)

## 2. Training Step

Run:

```bash
.venv/bin/python scripts/train_model_pipeline.py
```

The training script:
- loads `data/materials/v0.3.1/materials_dataset_clean.csv`
- uses the active 13-feature materials descriptor set
- trains the same sklearn structure used by the current production artifact:
  - `SimpleImputer(strategy="median")`
  - `RandomForestRegressor(n_estimators=300, random_state=42, n_jobs=-1)`
- fits deterministically

## 3. Target Lineage

The current `v0.3.1` clean materials dataset is feature-clean but does not yet contain `Base_Resistance_Target`.

To preserve continuity with the active model family, the training pipeline performs a deterministic lineage join:
- labels are taken from [data/materials/v0.3/materials_dataset.csv](/Users/niks/Documents/GitHub/mfr-material-risk-engine/data/materials/v0.3/materials_dataset.csv)
- the join key is a normalized material name
- only rows with a resolved `Base_Resistance_Target` are used for training

This keeps the retraining flow honest:
- no synthetic targets are generated
- no runtime relabeling occurs
- the lineage is recorded in metadata

## 4. Artifact Generation

Training writes:
- [models/model_v0.4.pkl](/Users/niks/Documents/GitHub/mfr-material-risk-engine/models/model_v0.4.pkl)
- [models/model_v0.4_metadata.json](/Users/niks/Documents/GitHub/mfr-material-risk-engine/models/model_v0.4_metadata.json)

The metadata file records:
- model version
- dataset version
- training rows
- training columns
- feature list
- training timestamp
- random state
- deterministic flag
- lineage details for target recovery

## 5. Inference Compatibility

Runtime inference remains artifact-based.

- Default runtime artifact: `model_v0.3-stable.pkl`
- Select retrained artifact: set `DRAVIX_MODEL_VERSION=v0.4` before starting the API

Compatibility rules:
- the request contract does not change
- the trained pipeline must expose `feature_names_in_`
- inference aligns request data to `model.feature_names_in_`
- `/predict`, `/rank`, and `/simulate` continue to operate against the selected artifact

## 6. Operational Notes

- Retraining is offline only.
- The API never retrains at startup.
- Older artifacts remain available for reproducibility.
- Coatings lookup remains on the stable `v0.3` dataset until a `v0.4`-compatible coating modifier dataset is defined.
