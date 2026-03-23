# API Endpoints

## Core Runtime

- `GET /health`
  - Returns runtime health and dataset load status.
- `GET /version`
  - Returns service version, dataset version, and artifact metadata.
- `GET /schema`
  - Returns model feature names and accepted request fields.
- `GET /model-metadata`
  - Returns model type, dataset version, feature list, row counts, active paths, and deterministic status.

## Lookup

- `GET /materials`
  - Returns available material names for lookup-mode screening.
- `GET /coatings`
  - Returns available coating codes for coating adjustment.

## Screening

- `POST /predict`
  - Input:
    - `material_name` for lookup mode, or
    - numeric descriptor fields for manual mode
    - optional `coating_code`
    - optional `use_case`
  - Output:
    - `risk_score`
    - `resistance_index`
    - `confidence`
    - `top_drivers`
    - `explanation`
    - `notes`
    - `limitations_notice`
    - legacy compatibility fields including `resistanceScore` and `effectiveResistance`

- `POST /rank`
  - Input:
    - `materials`: list of candidate materials
    - optional `use_case`
  - Output:
    - ranked shortlist sorted from lowest to highest fire-risk proxy
    - confidence and note per row

- `POST /simulate`
  - Input:
    - `base_material`
    - `modifications`
    - optional `use_case`
  - Output:
    - baseline and modified scores
    - risk delta and percent change
    - dominant driver
    - explanation
    - limitations notice

## Export

- `POST /export/ranking`
  - Input:
    - `materials`
    - optional `use_case`
    - `format`: `csv` or `json`
  - Output:
    - `filename`
    - `content_type`
    - serialized export content

## Notes

- All live product screens are expected to use real API responses, not fake demo scores.
- Dravix remains deterministic and does not retrain itself at runtime.
