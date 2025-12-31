# MFR Risk Model

This project estimates the fire failure risk and resistance of materials
(polymers, composites, and generic materials) under defined thermal exposure
conditions using a simplified ML-based framework.

## MVP Objective
Given material type and fire exposure parameters, output:
- Numerical risk score (0–100)
- Categorical risk class (Low / Medium / High)
- Resistance index (relative scale)

This repository contains the Phase 0–1 model logic and prototype.

## How It Works
Raw fire property records are cleaned and normalized, categorical fields are
encoded, and a lightweight proxy `risk_score` is computed from key thermal and
specimen properties. A RandomForestRegressor is then trained to predict this
proxy score, and inference returns risk score, class, and resistance index.

Note: `risk_score` is a modeled proxy in Phase 1, not a ground-truth outcome.

## Project Structure

- `/src` — Core ML logic and models
- `/notebooks` — Experiments and prototyping
- `/ui` — Frontend interface (bolt.new generated)

The UI currently uses mocked inference outputs.
ML–UI integration will occur in Phase 2.

Test Separation

Ask:

Can UI run without ML? ✅

Can ML notebook run without UI? ✅

If yes → architecture is clean.
