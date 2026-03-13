# System Boundaries

## Purpose

This document states what Dravix v0.3.0 does not do. These limits are part of the release definition and should be communicated whenever the system is demonstrated or reviewed.

## Dravix Does Not

Dravix does not:
- certify fire resistance,
- replace ASTM testing,
- provide absolute safety guarantees,
- perform autonomous decision-making,
- replace cone calorimeter or other physical fire testing,
- make regulatory decisions,
- perform real-time sensing,
- retrain automatically in production.

## Intended Operating Scope

Dravix is limited to:
- structured-input inference,
- deterministic scoring,
- early-stage material comparison,
- interpretability-assisted review,
- engineering prioritization before physical testing.

## Why These Boundaries Matter

Without explicit boundaries, a screening system can be misused as if it were a certification or compliance engine. That would be technically incorrect and operationally risky.

The v0.3.0 release is deliberately narrower:
- it supports prioritization,
- it does not grant approval,
- it informs judgment,
- it does not replace judgment.

## Usage Rule

Any high-impact material decision should be validated by physical testing and formal engineering review, regardless of the Dravix score.
