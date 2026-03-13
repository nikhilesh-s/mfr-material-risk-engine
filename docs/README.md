# Dravix v0.3.0 Documentation

## Purpose

This directory contains the release documentation set for Dravix v0.3.0.

Dravix is a deterministic decision-support system for early-stage material fire-risk screening. It computes a relative screening score from structured material descriptors using a tree-based machine learning inference pipeline. The score is intended to help engineering teams compare candidate materials before physical fire testing.

This documentation is written for engineers, technical reviewers, competition judges, and future collaborators who need a clear description of the system architecture, inference behavior, model scope, and operational constraints.

## Release Scope

Version: `v0.3.0`

Release framing used in this documentation:
- Early-stage fire-risk screening
- Deterministic inference only
- No automatic retraining
- Interpretability and uncertainty surfaced in every prediction workflow

Implementation note:
Some internal source files and legacy notes in this repository still use `Phase 3` and `resistance` terminology. This documentation standardizes the external release language around fire-risk screening for the v0.3.0 freeze.

## External Links

- Backend repository: <https://github.com/nikhilesh-s/mfr-material-risk-engine>
- Frontend repository: <https://github.com/nikhilesh-s/mfr-material-risk-engine/tree/main/frontend>
- Live API: <https://mfr-material-risk-engine.onrender.com>
- Demo interface: <https://mfr-material-risk-engine.vercel.app>

## Document Map

- [System Overview](system-overview.md)
- [Architecture](architecture.md)
- [ML Model](ml-model.md)
- [Data Schema](data-schema.md)
- [Inference Pipeline](inference-pipeline.md)
- [API Specification](api-specification.md)
- [Interpretability](interpretability.md)
- [Validation Summary](validation-summary.md)
- [System Boundaries](system-boundaries.md)
- [Roadmap](roadmap.md)
- [Version History](version-history.md)

## How To Read This Set

Recommended reading order:
1. Start with [System Overview](system-overview.md).
2. Use [Architecture](architecture.md) and [Inference Pipeline](inference-pipeline.md) to understand runtime behavior.
3. Read [ML Model](ml-model.md), [Interpretability](interpretability.md), and [Validation Summary](validation-summary.md) for model review.
4. Use [API Specification](api-specification.md) and [Data Schema](data-schema.md) for integration work.
5. Review [System Boundaries](system-boundaries.md) before presenting or deploying the system.
