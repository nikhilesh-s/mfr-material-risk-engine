# Inference Pipeline

## Overview

Dravix v0.3.0 uses a deterministic inference pipeline. For a fixed input payload and a fixed deployed build, the same output is expected every time.

## Step-By-Step Flow

### 1. Input Ingestion

The service receives a prediction request through `POST /predict`.

Accepted modes:
- direct descriptor entry,
- material lookup followed by descriptor retrieval.

The request is parsed into a structured payload before any model logic is executed.

### 2. Schema Validation

The payload is checked for:
- required fields,
- supported types,
- lookup validity,
- structurally complete descriptor sets,
- request-shape consistency.

Invalid inputs are rejected before feature construction.

### 3. Feature Normalization

Selected numeric descriptors are normalized using fixed preprocessing rules. This prevents raw unit scales from dominating the model and ensures the runtime feature orientation matches the training artifact.

### 4. Feature Engineering

Derived screening features are computed from the validated input.

Typical operations include:
- thermal load construction,
- severity synthesis,
- orientation of inverse-risk variables,
- encoding of material class indicators,
- alignment to the frozen feature order.

### 5. Model Inference

The transformed feature vector is passed to the tree-based ensemble model. The model returns a deterministic proxy score that represents relative fire-risk screening behavior in the release framing.

### 6. Risk Contextualization

The raw model score is contextualized into a screening-oriented response. This may include:
- bounded score formatting,
- relative class labeling,
- confidence band assignment,
- optional comparison semantics used by the client.

### 7. Interpretability Generation

Local explanation logic computes per-feature contribution values and identifies the strongest drivers for the individual prediction. Uncertainty signals are calculated alongside the score so the caller can assess how stable the model appears for that sample.

### 8. Output Generation

The final JSON response is assembled with:
- score,
- class or band,
- confidence indicator,
- interpretation summary,
- feature contributions,
- version metadata where appropriate.

## Determinism Guarantees

The pipeline is deterministic because:
- the model artifact is frozen at startup,
- runtime retraining is disabled,
- preprocessing rules are fixed,
- requests are handled statelessly,
- no stochastic post-processing is applied per request.

## Diagram Placeholder

Insert release architecture and pipeline diagram here.

```text
[Request]
   |
   v
[1. Input Ingestion]
   |
   v
[2. Schema Validation]
   |
   v
[3. Feature Normalization]
   |
   v
[4. Feature Engineering]
   |
   v
[5. Tree-Based Model Inference]
   |
   +--> [7. Interpretability Generation]
   |
   v
[6. Risk Contextualization]
   |
   v
[8. Output Generation]
   |
   v
[Response]
```
