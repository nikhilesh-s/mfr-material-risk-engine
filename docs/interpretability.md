# Interpretability

## Purpose

Dravix v0.3.0 is intentionally designed to expose model reasoning rather than return an unexplained score.

Interpretability is necessary because the system is used in engineering screening workflows where reviewers need to understand why a material was ranked in a certain way and how much trust to place in the result.

## Feature Contribution Analysis

For each prediction, Dravix computes local feature contribution values.

These values are used to answer:
- which descriptors increased the predicted screening score,
- which descriptors decreased it,
- which features had the strongest local effect for the current sample.

The contribution view is local, not global. It explains the current prediction rather than the entire model behavior across all possible samples.

## Confidence Indicators

Dravix includes a confidence indicator with each result.

The confidence output is used to summarize how stable the model appears for the given sample relative to its training-time behavior. In the current system design, confidence is derived from internal model behavior rather than from an external safety guarantee.

This signal is intended to help reviewers distinguish between:
- cases where the model is behaving in a familiar region of feature space,
- cases where the model appears less stable or less certain.

## Uncertainty Signaling

Uncertainty is surfaced explicitly.

The system does not suppress uncertainty in order to make outputs appear cleaner or more definitive. Instead, the API is expected to return confidence or uncertainty context together with the score and explanation.

This is important because Dravix is used upstream of physical testing. Overstating certainty at the screening stage would be technically misleading.

## Design Philosophy

The interpretability philosophy for Dravix is simple:
- uncertainty is surfaced, not hidden,
- explanations are attached to individual predictions,
- output confidence does not replace engineering review,
- interpretability supports prioritization, not certification.

## What Interpretability Can And Cannot Do

Interpretability can:
- identify local drivers,
- improve reviewer confidence in ranking logic,
- expose dominant input factors,
- support auditability of a prediction.

Interpretability cannot:
- prove physical causality,
- guarantee correctness under unseen conditions,
- convert a proxy score into a certified safety conclusion.

## Recommended Reviewer Practice

When reviewing a prediction:
1. inspect the relative score,
2. inspect the top positive and negative feature contributions,
3. check the confidence indicator,
4. verify that the dominant drivers are physically plausible,
5. escalate low-confidence or high-impact cases to physical testing.
