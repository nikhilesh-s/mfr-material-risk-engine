# ML Model

## Model Type

Dravix v0.3.0 uses a tree-based ensemble model in the random-forest style for inference.

The model is used as a frozen artifact at runtime. Training is performed offline, and the deployed system only serves inference.

## Why This Model Was Chosen

### Interpretability

Tree ensembles support local contribution analysis in a way that is practical for engineering review. This makes it possible to show which descriptors pushed a prediction upward or downward for a given material.

### Non-Linear Relationships

Fire-related screening signals are rarely linear. Descriptor interactions can be conditional, thresholded, or regime-dependent. Tree-based models handle these effects without requiring the system to assume a simple global linear relationship.

### Robustness With Small Datasets

Early-stage engineering datasets are often limited in size, heterogeneous in source quality, and not uniformly distributed across material classes. Tree ensembles are comparatively robust under those conditions when the system goal is stable ranking rather than high-frequency adaptation.

## Input Feature Vector

The release feature space is approximately 95 engineered descriptors after cleaning, encoding, and derived-feature construction.

These descriptors include combinations of:
- material-class indicators,
- thermal exposure variables,
- ignition-related variables,
- specimen and geometry fields,
- composition or category markers,
- engineered summary variables.

In implementation terms, the deployed backend may accept a narrower set of user-facing descriptor fields and then map them into the frozen model feature space.

## Output

The model produces a relative fire-risk proxy.

This output is intended to answer a ranking question:
- given two or more candidate materials described in a comparable way, which ones appear more concerning and should be prioritized for further evaluation?

It is not intended to answer an absolute qualification question.

## Proxy Modeling For Fire Behavior

Dravix uses proxy modeling rather than first-principles simulation.

That means the model does not solve combustion physics directly. Instead, it learns a stable relationship between available material descriptors and a screening-oriented target signal derived from historical engineering data and feature construction rules.

Proxy modeling is appropriate when the objective is:
- early comparison,
- prioritization,
- reproducible triage,
- interpretable relative ranking.

Proxy modeling is not equivalent to:
- full fire dynamics simulation,
- standards certification,
- direct prediction of all fire outcomes across all environments.

## Runtime Characteristics

At inference time, the model is:
- loaded from a persisted artifact,
- used without retraining,
- applied with fixed preprocessing assumptions,
- deterministic for identical inputs in the same build.

## Review Considerations

Technical reviewers should assess the model in terms of:
- ranking usefulness,
- behavioral alignment with known fire-response trends,
- input coverage,
- calibration of uncertainty signals,
- interpretability quality,
- boundary clarity.

Those criteria are more appropriate for Dravix than certification-style accuracy claims.
