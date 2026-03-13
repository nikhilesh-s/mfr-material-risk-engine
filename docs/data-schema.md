# Data Schema

## Purpose

This document describes the logical input data model used by Dravix v0.3.0 for fire-risk screening.

The schema is organized around material descriptors that can be validated, transformed, and converted into a model-ready feature vector.

## Logical Input Groups

### Material Classification

Core classification fields provide coarse context for the screening model.

Representative fields:
- `material_class`: `polymer | composite | generic`
- `material_name`: human-readable material identifier
- `source_id`: optional dataset or catalog reference
- `notes`: optional engineering comment field retained outside the model path

### Physical Properties

Physical properties describe the specimen or material in a way that can influence thermal response and combustion behavior.

Representative fields:
- `density`
- `specimen_mass`
- `surface_area`
- `specific_heat`
- `thermal_conductivity`
- `coefficient_of_thermal_expansion`

### Thermal Indicators

Thermal indicators describe the imposed exposure or the material response under thermal loading.

Representative fields:
- `external_heat_flux`
- `temperature`
- `exposure_time`
- `time_to_ignition`
- `flash_point`
- `autoignition_temperature`
- `decomposition_temperature`
- `end_of_test_time`

### Composition And Combustion Descriptors

These fields describe chemistry-adjacent or fire-response-relevant properties used by the model.

Representative fields:
- `limiting_oxygen_index`
- `char_yield`
- `heat_of_combustion`
- `flame_spread_index`
- `smoke_density`
- `ul94_flammability`
- optional filler, resin, coating, or composite-family descriptors when available

### Metadata

Metadata may be retained for traceability even if it is excluded from the inference vector.

Representative fields:
- `laboratory`
- `test_identifier`
- `operator`
- `source_file`
- `dataset_version`

## Requiredness

At minimum, Dravix requires enough structured descriptors to construct the frozen feature vector deterministically.

Depending on the integration mode, this can happen in one of two ways:
- explicit descriptor submission, where required numeric fields are provided directly,
- lookup mode, where `material_name` resolves to a stored descriptor set.

## Canonical Example

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

## Feature Engineering Transformations

Before inference, raw inputs may be converted into derived variables that better capture screening severity.

Representative transformations:
- `thermal_load = temperature * exposure_time`
- `severity_index = thermal_load * environment_factor`
- inverse orientation of selected variables where lower raw values imply higher concern
- one-hot or binary encoding of material categories
- min-max or bounded normalization for selected thermal and combustion features

These transformations are fixed in the release pipeline so that identical raw inputs produce identical model features.

## Class Handling

The current release documentation uses three coarse material classes:
- `polymer`
- `composite`
- `generic`

These classes are not regulatory categories. They are screening-oriented bins used to help organize materials with different descriptor distributions.

## Data Quality Expectations

Preferred input characteristics:
- numeric fields expressed in consistent engineering units,
- traceable origin for descriptor values,
- minimal missingness in high-signal thermal and ignition features,
- stable naming for lookup-driven submissions.

Poorly specified descriptors may still yield a response if the schema is structurally valid, but the interpretability and confidence outputs should be reviewed carefully in those cases.
