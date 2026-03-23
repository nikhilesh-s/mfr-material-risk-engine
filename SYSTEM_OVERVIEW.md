# Dravix System Overview

Dravix is a deterministic Phase-3 engineering decision-support platform for early-stage materials fire-risk screening.

## Product Modes

- Single material screening
- Batch material prioritization
- Sensitivity / what-if exploration
- Workflow shortlist export
- Interpretability / top-driver review

## System Flow

1. Select a use-case context such as EV battery enclosure or aerospace interiors.
2. Screen one material or submit a candidate batch.
3. Generate deterministic model-backed outputs:
   - risk score
   - resistance index
   - confidence
   - notes
   - top drivers
4. Review ranked shortlist recommendations.
5. Export recommended test candidates for downstream engineering work.

## Backend

- FastAPI inference service in [api/main.py](/Users/niks/Documents/GitHub/mfr-material-risk-engine/api/main.py)
- Random-forest pipeline artifact in [models/model_v0.3-stable.pkl](/Users/niks/Documents/GitHub/mfr-material-risk-engine/models/model_v0.3-stable.pkl)
- Deterministic confidence scoring and tree-based interpretability in [src/model.py](/Users/niks/Documents/GitHub/mfr-material-risk-engine/src/model.py)
- Dataset-backed lookup and screening logic using versioned data folders

## Dataset Validation And Retraining

1. Raw candidate spreadsheets are placed into versioned dataset folders under `data/materials/` and `data/coatings/`.
2. [scripts/validate_and_prepare_datasets.py](/Users/niks/Documents/GitHub/mfr-material-risk-engine/scripts/validate_and_prepare_datasets.py) converts CSV/XLSX inputs, validates schema, removes duplicates, handles missing data, and writes clean dataset outputs.
3. [scripts/train_model_pipeline.py](/Users/niks/Documents/GitHub/mfr-material-risk-engine/scripts/train_model_pipeline.py) trains a deterministic sklearn pipeline against the validated materials dataset and saves a versioned model artifact plus metadata.
4. Runtime inference remains artifact-based and does not retrain during serving.

## Model Versioning

- `models/model_v0.3-stable.pkl` remains the default runtime artifact.
- `models/model_v0.4.pkl` is the retrained artifact built from the validated `materials v0.3.1` dataset.
- `models/model_v0.4_metadata.json` records training rows, feature list, timestamp, and lineage details.
- Set `DRAVIX_MODEL_VERSION=v0.4` before starting the API to serve the new artifact while preserving older artifacts for reproducibility.

## Frontend

- Workflow landing / overview
- Single material screening page
- Batch ranking page
- Sensitivity exploration page
- Methodology page

## Boundaries

Dravix is a screening and prioritization tool. It does not replace certification, formal standards testing, or engineering signoff.
