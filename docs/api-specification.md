# API Specification

## Scope

This document describes the release-level prediction interface for Dravix v0.3.0.

Primary inference endpoint:
- `POST /predict`

Implementation note:
The deployed FastAPI service may also expose auxiliary endpoints such as health, version, materials, and coatings. This document focuses on the prediction contract used for screening.

Field-naming note:
The current frozen backend implementation in this repository still contains internal `resistance`-oriented field names in some runtime artifacts. This document presents the v0.3.0 release-facing screening semantics for technical review. If needed, integration teams should maintain a small translation layer between release documentation terms such as `risk_score` and implementation-specific fields preserved from the internal freeze branch.

## Endpoint

### `POST /predict`

Submits a material descriptor payload and returns a relative fire-risk screening result.

## Request Schema

A request must provide either:
- a resolvable `material_name`, or
- a complete descriptor set sufficient for deterministic feature construction.

Representative request schema:

```json
{
  "material_class": "polymer",
  "material_name": "Example Polymer A",
  "density": 1.25,
  "specific_heat": 1.50,
  "thermal_conductivity": 0.21,
  "external_heat_flux": 35.0,
  "time_to_ignition": 42.0,
  "flash_point": 320.0,
  "autoignition_temperature": 450.0,
  "limiting_oxygen_index": 19.0,
  "char_yield": 12.0,
  "heat_of_combustion": 28.0,
  "flame_spread_index": 40.0,
  "smoke_density": 120.0,
  "temperature": 300.0,
  "exposure_time": 12.0,
  "environment_factor": 1.10
}
```

## Response Fields

Expected response fields:
- `risk_score`: relative screening score
- `risk_class`: qualitative screening band
- `confidence_indicator`: model-confidence or uncertainty label
- `interpretation`: human-readable explanation summary
- `feature_contributions`: per-feature contribution map

## Example Response

```json
{
  "risk_score": 0.64,
  "risk_class": "elevated",
  "confidence_indicator": "medium",
  "interpretation": "External heat flux and heat-of-combustion-related features increased the relative screening score, while longer time to ignition reduced it.",
  "feature_contributions": {
    "external_heat_flux": 0.18,
    "time_to_ignition": -0.11,
    "heat_of_combustion": 0.09,
    "char_yield": -0.04,
    "smoke_density": 0.03
  }
}
```

## Response Semantics

### `risk_score`

A relative score for comparing candidate materials in the same decision context. It is not a certification metric.

### `risk_class`

A qualitative label derived from the score or from downstream contextualization logic. Example classes may include `low`, `moderate`, and `elevated`.

### `confidence_indicator`

A compact uncertainty signal intended to help reviewers identify cases where model behavior appears less stable relative to the training distribution.

### `interpretation`

A concise summary that explains the primary drivers of the returned score in plain engineering language.

### `feature_contributions`

A map of signed contribution values used to explain which features increased or decreased the screening score for the individual prediction.

## Example JSON

```json
{
  "risk_score": 0.64,
  "risk_class": "elevated",
  "confidence_indicator": "medium",
  "interpretation": "External heat flux and shorter ignition time are the primary drivers of the current screening result.",
  "feature_contributions": {
    "external_heat_flux": 0.18,
    "time_to_ignition": -0.11,
    "heat_of_combustion": 0.09,
    "char_yield": -0.04,
    "smoke_density": 0.03
  }
}
```

## Error Behavior

Representative error cases:
- `400 Bad Request`: malformed payload or unsupported field combination
- `404 Not Found`: lookup-based material identifier not found
- `422 Unprocessable Entity`: schema-valid JSON with missing required descriptor content
- `500 Internal Server Error`: runtime initialization or model-serving failure

## Example cURL

```bash
curl -X POST "https://mfr-material-risk-engine.onrender.com/predict" \
  -H "Content-Type: application/json" \
  -d '{
    "material_class": "polymer",
    "specific_heat": 1.50,
    "thermal_conductivity": 0.21,
    "density": 1.25,
    "external_heat_flux": 35.0,
    "time_to_ignition": 42.0,
    "flash_point": 320.0,
    "autoignition_temperature": 450.0,
    "limiting_oxygen_index": 19.0,
    "char_yield": 12.0,
    "heat_of_combustion": 28.0,
    "flame_spread_index": 40.0,
    "smoke_density": 120.0,
    "temperature": 300.0,
    "exposure_time": 12.0,
    "environment_factor": 1.10
  }'
```

## Integration Guidance

Consumers should:
- treat the output as comparative only,
- persist input payloads with version metadata for reproducibility,
- display confidence and interpretation alongside the score,
- avoid converting the response into an autonomous pass/fail decision.
