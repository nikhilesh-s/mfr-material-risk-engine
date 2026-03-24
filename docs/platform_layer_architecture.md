# Dravix Platform Layer Architecture

## Overview

Dravix v0.3.2 now splits the platform layer into deterministic inference and Supabase-backed post-analysis services.

Core runtime flow:

1. FastAPI startup initializes the Supabase database service.
2. Required tables are verified before the API starts serving traffic.
3. The Phase 3 model and datasets load once at startup.
4. Inference endpoints remain deterministic.
5. Platform services reuse stored analysis history and custom material records.

## Database Schema

Primary tables used by the platform layer:

- `analysis_runs`
  - Stores analysis metadata, material identity, and descriptor payloads.
- `analysis_results`
  - Stores DFRS outputs, confidence, feature importance, and the full prediction JSON.
- `custom_materials`
  - Stores custom material descriptor submissions tied to `analysis_id`.
- `prediction_logs`
  - Stores direct `/predict` request logs for runtime auditing.
- `simulation_logs`
  - Stores descriptor modifications and simulation outputs for later dataset learning.
- `dataset_materials`
  - Stores curated training and clustering materials.
- `model_registry`
  - Stores trained model metadata and artifact references.

## Advisor Flow

1. `GET /advisor/{analysis_id}` loads stored analysis history from Supabase.
2. Dravix assembles a prompt using:
   - prediction output
   - top drivers
   - subscores
   - sensitivity summary
   - counterfactual suggestions
   - recommended tests
3. If `OPENAI_API_KEY` and the OpenAI SDK are available, the advisor generates structured JSON guidance.
4. If OpenAI fails, Dravix returns a deterministic fallback advisory response instead of failing the API.

## TDS Generation Flow

1. `GET /tds/{analysis_id}` loads the stored analysis bundle.
2. The TDS service extracts the prediction summary and normalizes it into a structured datasheet.
3. The response includes:
   - material name
   - resistance score
   - risk score
   - confidence
   - top drivers
   - recommended tests
   - design suggestions
   - analysis summary

## Comparison Flow

1. `POST /compare` accepts the same material list structure used by `/rank`.
2. Each material is passed through the active deterministic prediction path.
3. The comparison engine returns:
   - per-material scores
   - best material
   - comparison summary
   - dominant property differences

## Clustering Pipeline

1. `GET /clusters` loads `dataset_materials` and `custom_materials`.
2. Descriptor vectors are normalized into a shared numeric frame.
3. KMeans groups the materials into descriptor neighborhoods.
4. Each cluster returns:
   - cluster ID
   - cluster center properties
   - materials in cluster
   - representative material

## Dataset Learning Flow

1. Custom material submissions are stored during background analysis logging.
2. Simulation modifications are stored after `/simulate`.
3. `GET /dataset/export` exports:
   - custom materials
   - simulation logs
   - training-ready flattened records

## Operational Notes

- Supabase is required infrastructure for platform-layer startup.
- Required backend env vars:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_KEY`
- Optional advisor env var:
  - `OPENAI_API_KEY`
- OpenAI is optional for advisor generation.
- Inference remains deterministic and does not depend on the advisor service.
- Database writes use a shared database service with grouped persistence helpers and rollback of partial grouped writes where possible.
