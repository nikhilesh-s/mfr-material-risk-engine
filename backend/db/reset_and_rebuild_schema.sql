-- Dravix Supabase schema reset and rebuild script.
-- Run this in the Supabase SQL Editor to rebuild the backend persistence schema
-- so it matches the fields used by the current Dravix logging layer.

DROP TABLE IF EXISTS analysis_runs CASCADE;
DROP TABLE IF EXISTS analysis_results CASCADE;
DROP TABLE IF EXISTS custom_materials CASCADE;
DROP TABLE IF EXISTS simulation_logs CASCADE;
DROP TABLE IF EXISTS dataset_materials CASCADE;
DROP TABLE IF EXISTS model_registry CASCADE;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE analysis_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id TEXT UNIQUE NOT NULL,
    material_name TEXT,
    use_case TEXT,
    model_version TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    additional_properties JSONB
);

CREATE TABLE analysis_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_run_id TEXT,
    analysis_id TEXT,
    resistance_score DOUBLE PRECISION,
    risk_score DOUBLE PRECISION,
    confidence TEXT,
    prediction_json JSONB,
    drivers_json JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE custom_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id TEXT,
    material_name TEXT,
    descriptor_payload JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE simulation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id TEXT,
    modifications_json JSONB,
    baseline_score DOUBLE PRECISION,
    modified_score DOUBLE PRECISION,
    delta DOUBLE PRECISION,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE dataset_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_name TEXT,
    density DOUBLE PRECISION,
    melting_point DOUBLE PRECISION,
    thermal_conductivity DOUBLE PRECISION,
    specific_heat DOUBLE PRECISION,
    decomposition_temp DOUBLE PRECISION,
    glass_transition_temp DOUBLE PRECISION,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE model_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_version TEXT,
    dataset_version TEXT,
    model_artifact TEXT,
    registered_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analysis_runs_analysis_id
    ON analysis_runs(analysis_id);

CREATE INDEX IF NOT EXISTS idx_analysis_results_analysis_id
    ON analysis_results(analysis_id);

CREATE INDEX IF NOT EXISTS idx_custom_materials_analysis_id
    ON custom_materials(analysis_id);

-- Logging-layer compatibility notes:
-- - insert_analysis_run uses: analysis_id, material_name, use_case, model_version, created_at/ timestamp fallback, additional_properties fallback.
-- - insert_analysis_result uses: analysis_id, resistance_score, risk_score, confidence, prediction_json, drivers_json.
-- - insert_custom_material uses: analysis_id, material_name, descriptor_payload.
-- - insert_simulation_log uses: analysis_id, modifications_json, baseline_score, modified_score, delta.
-- - register_model_version uses: model_version, dataset_version, model_artifact/ artifact-path equivalent.
