# Architecture

## Overview

Dravix v0.3.0 is organized as a stateless inference service with a single prediction endpoint. The backend loads a frozen model artifact at startup, validates incoming inputs, transforms descriptors into the model feature space, runs deterministic inference, computes interpretability outputs, and returns a formatted response.

## System Components

### Input Layer

The input layer accepts structured material information in one of two modes:
- direct descriptor submission, where users provide numeric or categorical properties,
- lookup-assisted submission, where a material identifier is resolved to a stored descriptor set.

Input data typically includes:
- material properties,
- thermal indicators,
- combustion-related descriptors,
- coarse material metadata, and
- optional contextual fields used for screening interpretation.

### Validation Layer

The validation layer is responsible for:
- schema enforcement,
- required-field checks,
- type coercion,
- range and completeness checks where applicable,
- lookup miss detection,
- deterministic rejection of malformed payloads.

The objective is to ensure that only structurally valid inputs reach feature transformation and inference.

### Feature Transformation Layer

The feature transformation layer converts raw material descriptors into the model-aligned feature vector.

Key responsibilities:
- column alignment,
- handling of missing values through fixed preprocessing rules,
- normalization of selected combustion-related fields,
- orientation of features so that the model sees a consistent directional meaning,
- deterministic derived-feature construction.

This layer is release-frozen for v0.3.0. Runtime requests do not modify the transformation logic.

### Inference Engine

The inference engine is a tree-based ML model executed from a persisted artifact loaded at application startup.

Characteristics:
- tree-ensemble inference,
- deterministic behavior for identical inputs within the same deployed build,
- no online learning,
- no runtime retraining,
- fixed feature ordering.

The model returns a screening-oriented output that is later contextualized for API consumers.

### Interpretability Layer

The interpretability layer computes local prediction explanations for each request.

Outputs include:
- per-feature contribution estimates,
- ranked driver summary,
- directional effect indicators,
- confidence or uncertainty signaling derived from internal model behavior.

Interpretability is part of the release design, not an optional afterthought.

### Output Formatting

The output formatter constructs the final response object used by downstream consumers.

Responsibilities:
- stable numeric formatting,
- risk or score contextualization,
- confidence labeling,
- interpretability packaging,
- predictable JSON shape for client applications.

## Deployment Model

### FastAPI Backend

The production backend is a FastAPI service deployed as a web application. It exposes an HTTP interface suitable for frontend integration, programmatic invocation, and lightweight health monitoring.

### Stateless Inference

Requests are handled independently. The service does not maintain user-specific inference state between calls.

Stateless behavior provides:
- simpler scaling,
- lower operational complexity,
- deterministic request handling,
- reduced coupling between callers.

### Single Prediction Endpoint

The primary integration surface for inference is a single synchronous prediction endpoint:
- `POST /predict`

Supporting service endpoints such as health and version checks may exist, but the release architecture centers the system around a single model-serving action.

## Logical Flow

```text
Client Input
   |
   v
Validation Layer
   |
   v
Feature Transformation
   |
   v
Tree-Based Inference Engine
   |
   +--> Interpretability Layer
   |
   v
Output Formatting
   |
   v
Prediction Response
```

## Architectural Constraints

The current architecture intentionally excludes:
- streaming inference,
- real-time sensor ingestion,
- distributed training,
- adaptive online learning,
- autonomous actuation.

This keeps the release aligned with its intended use case: deterministic early-stage material screening.
