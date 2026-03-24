CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.custom_materials (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id text UNIQUE,
    material_name text NOT NULL,
    density double precision,
    melting_point double precision,
    thermal_conductivity double precision,
    descriptor_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.analysis_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id text UNIQUE,
    material_name text NOT NULL,
    material_class text,
    density double precision,
    melting_point double precision,
    thermal_conductivity double precision,
    additional_properties jsonb NOT NULL DEFAULT '{}'::jsonb,
    model_version text,
    dataset_version text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.analysis_results (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_run_id uuid NOT NULL REFERENCES public.analysis_runs(id) ON DELETE CASCADE,
    dfrs double precision,
    confidence jsonb,
    feature_importance jsonb NOT NULL DEFAULT '{}'::jsonb,
    prediction_json jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.simulation_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id text,
    material_name text NOT NULL,
    base_material jsonb NOT NULL DEFAULT '{}'::jsonb,
    modifications jsonb NOT NULL DEFAULT '{}'::jsonb,
    simulation_output jsonb NOT NULL DEFAULT '{}'::jsonb,
    experiment_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dataset_materials (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    material_name text,
    density double precision,
    melting_point double precision,
    thermal_conductivity double precision,
    specific_heat double precision,
    decomposition_temp double precision,
    glass_transition_temp double precision,
    properties jsonb NOT NULL DEFAULT '{}'::jsonb,
    source text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.model_registry (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name text NOT NULL,
    model_version text NOT NULL,
    training_dataset text NOT NULL,
    rmse double precision,
    r2 double precision,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    model_path text,
    created_at timestamptz NOT NULL DEFAULT now()
);
