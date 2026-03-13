# System Overview

## What Dravix Is

Dravix v0.3.0 is a decision-support system for early-stage material fire-risk screening. It accepts structured material descriptors, processes them through a deterministic inference pipeline, and returns a relative fire-risk screening signal that can be used to rank or triage candidate materials.

The system is designed for comparative analysis. It does not claim to predict full-scale fire behavior, certify compliance, or replace laboratory fire testing.

## Why Early-Stage Fire-Risk Screening Matters

Material selection often happens before a program has time, budget, or sample maturity for full physical testing. At that stage, engineering teams still need a disciplined way to:
- compare candidate materials,
- identify combinations that warrant deeper investigation,
- remove clearly unfavorable options early, and
- focus test resources on the most informative samples.

A screening tool is useful when it is consistent, reproducible, and explicit about uncertainty. That is the role Dravix is intended to fill.

## Problem Statement

Early material screening workflows are commonly constrained by:
- incomplete experimental data,
- heterogeneous descriptor quality,
- inconsistent expert heuristics,
- long iteration cycles between design and test, and
- difficulty explaining why one material was prioritized over another.

Dravix addresses this by converting structured descriptors into a repeatable ranking signal with model-based interpretability. The result is a more systematic way to compare materials before destructive or standards-based testing.

## Where Dravix Fits In The Materials Workflow

Dravix is positioned upstream of formal validation and certification.

Typical workflow placement:
1. Candidate materials are proposed from design, procurement, or materials research.
2. Structured descriptors are assembled from known properties, reference data, or engineering estimates.
3. Dravix produces a relative screening score and supporting interpretation.
4. Engineering teams prioritize which materials should proceed to bench, cone calorimeter, ASTM, or other physical testing.
5. Physical test results remain the authority for qualification decisions.

## Nature Of The Output

The Dravix output is a relative fire-risk screening signal.

It should be interpreted as:
- a comparative score,
- a prioritization aid,
- a proxy derived from descriptor-based inference, and
- an input to engineering judgment.

It should not be interpreted as:
- a certification result,
- a direct physical measurement,
- an absolute safety guarantee, or
- a regulatory determination.

## Release Intent

The v0.3.0 release freezes Dravix as a deterministic inference system focused on early-stage screening and interpretability. Its value is in disciplined comparison, not autonomous decision-making.
