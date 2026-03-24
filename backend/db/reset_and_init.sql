DROP TABLE IF EXISTS advisor_insights CASCADE;
DROP TABLE IF EXISTS analysis_results CASCADE;
DROP TABLE IF EXISTS analysis_runs CASCADE;
DROP TABLE IF EXISTS material_properties CASCADE;
DROP TABLE IF EXISTS materials CASCADE;
DROP TABLE IF EXISTS dataset_materials CASCADE;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE materials (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    material_name text NOT NULL,
    is_custom boolean DEFAULT false,
    source text,
    created_at timestamp DEFAULT now()
);

CREATE TABLE material_properties (
    material_id uuid PRIMARY KEY REFERENCES materials(id) ON DELETE CASCADE,
    density float,
    melting_point float,
    specific_heat float,
    thermal_conductivity float,
    cte float,
    flash_point float,
    autoignition_temp float,
    limiting_oxygen_index float,
    smoke_density float,
    char_yield float,
    decomposition_temp float,
    heat_of_combustion float,
    flame_spread_index float
);

CREATE TABLE analysis_runs (
    analysis_id text PRIMARY KEY,
    material_id uuid REFERENCES materials(id) ON DELETE CASCADE,
    timestamp timestamp DEFAULT now(),
    model_version text,
    dataset_version text
);

CREATE TABLE analysis_results (
    analysis_id text PRIMARY KEY REFERENCES analysis_runs(analysis_id) ON DELETE CASCADE,
    resistance_score float,
    risk_score float,
    confidence text,
    dominant_driver text,
    explanation text
);

CREATE TABLE advisor_insights (
    analysis_id text PRIMARY KEY REFERENCES analysis_runs(analysis_id) ON DELETE CASCADE,
    advisor_summary text,
    recommended_tests jsonb,
    design_suggestions jsonb,
    created_at timestamp DEFAULT now()
);

CREATE TABLE dataset_materials (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    material_name text,
    density float,
    melting_point float,
    specific_heat float,
    thermal_conductivity float,
    cte float,
    flash_point float,
    autoignition_temp float,
    limiting_oxygen_index float,
    smoke_density float,
    char_yield float,
    decomposition_temp float,
    heat_of_combustion float,
    flame_spread_index float,
    source text,
    created_at timestamp DEFAULT now()
);
