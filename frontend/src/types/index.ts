export interface Phase3Input {
  material_name?: string;
  coating_code?: string;
  use_case?: string;
  Density_g_cc?: number;
  Melting_Point_C?: number;
  Specific_Heat_J_g_C?: number;
  Thermal_Cond_W_mK?: number;
  CTE_um_m_C?: number;
  Flash_Point_C?: number;
  Autoignition_Temp_C?: number;
  UL94_Flammability?: number;
  Limiting_Oxygen_Index_pct?: number;
  Smoke_Density_Ds?: number;
  Char_Yield_pct?: number;
  Decomp_Temp_C?: number;
  Heat_of_Combustion_MJ_kg?: number;
  Flame_Spread_Index?: number;
}

export interface HealthResponse {
  status: string;
  engine: string;
}

export interface VersionInfo {
  service?: string;
  version: string;
  api_version: string;
  dataset_version: string;
  model_artifact: string;
  build_hash?: string;
  timestamp_utc: string;
}

export interface RuntimeStatus {
  model_loaded: boolean;
  dataset_loaded: boolean;
  materials_count: number;
  coatings_count: number;
  feature_count: number;
  supabase_connected: boolean;
}

export interface ModelMetadata {
  model_type: string;
  feature_count: number;
  feature_names: string[];
  training_dataset: string;
  model_version: string;
  dataset_version?: string | null;
  dataset_build_date?: string | null;
  deterministic: boolean;
  row_counts: Record<string, number>;
  active_paths: Record<string, string>;
  timestamp_utc: string;
  service?: string | null;
  api_version?: string | null;
  model_artifact?: string | null;
}

export interface SchemaStatus {
  tables_found: string[];
  tables_missing: string[];
}

export interface DatabaseStatus {
  database_connected: boolean;
  tables: string[];
  last_model_registered: string | null;
}

export interface Driver {
  feature: string;
  contribution: number;
  direction: string;
  abs_magnitude: number;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
}

export interface Confidence {
  score: number;
  label: string;
}

export interface PredictionResponse {
  material_name: string;
  analysis_id?: string | null;
  custom_material?: boolean;
  use_case?: string | null;
  DFRS?: number | null;
  ignition_resistance?: number | null;
  thermal_persistence?: number | null;
  decomposition_margin?: number | null;
  heat_propagation_risk?: number | null;
  risk_score: number;
  resistance_index: number;
  top_drivers: Driver[];
  feature_importances: FeatureImportance[];
  model_version?: string | null;
  subscores: Record<string, number>;
  sensitivity_map: Record<string, number>;
  sensitivity_summary: Array<Record<string, unknown>>;
  property_response_curves: Record<string, Array<{ x: number; y: number }>>;
  recommended_tests: string[];
  recommended_test_details: Array<{ test: string; reason: string; priority: string }>;
  counterfactual_suggestions: string[];
  out_of_domain: boolean;
  out_of_domain_reasons: string[];
  explanation: string;
  notes: string[];
  limitations_notice: string;
  resistanceScore: number;
  effectiveResistance: number;
  coatingModifier?: number | null;
  coating_analysis?: Record<string, unknown> | null;
  dataset: {
    version: string;
  };
  interpretability: {
    prediction: number;
    feature_contributions: Record<string, number>;
    top_3_drivers: Driver[];
    display_names?: Record<string, string>;
  };
  confidence: Confidence;
}

export interface OptimizationResponse {
  baseline_score: number;
  optimized_score_estimate: number;
  property_targets: Record<string, string>;
}

export interface RankedMaterial {
  rank: number;
  material: string;
  material_name: string;
  resistanceScore: number;
  resistance_index: number;
  risk_score: number;
  confidence: string;
  notes: string;
}

export interface RankResponse {
  use_case?: string | null;
  ranking: RankedMaterial[];
  errors: Array<{ material: string; error: string }>;
}

export interface ComparisonMaterial {
  material_name: string;
  resistance_score: number;
  risk_score: number;
  confidence: string;
  top_drivers?: Driver[];
  counterfactual_suggestions?: string[];
  recommended_test_details?: Array<{ test: string; reason: string; priority: string }>;
  out_of_domain?: boolean;
}

export interface ComparisonResponse {
  materials: ComparisonMaterial[];
  best_material: ComparisonMaterial | null;
  comparison_summary: string;
  design_tradeoffs: string[];
  counterfactual_suggestions: string[];
  recommended_test_details: Array<{ test: string; reason: string; priority: string }>;
  dominant_property_differences: Array<{
    property: string;
    min: number;
    max: number;
    spread: number;
  }>;
}

export interface SimulationResponse {
  use_case?: string | null;
  baseline: {
    resistanceScore: number;
    confidence: string;
    risk_score: number;
    resistance_index: number;
  };
  modified: {
    resistanceScore: number;
    confidence: string;
    risk_score: number;
    resistance_index: number;
  };
  change: {
    delta: number;
    percent_change: number | null;
    risk_delta: number;
    risk_percent_change: number | null;
  };
  dominant_driver: string;
  explanation: string;
  simulation_summary: string;
  driver_analysis: string[];
  limitations_notice: string;
}

export interface AnalysisRecentResponse {
  analyses: Array<{
    analysis_id: string;
    material_name: string;
    created_at: string;
  }>;
}

export interface AnalysisByIdResponse {
  analysis_id: string;
  analysis: Record<string, unknown> | null;
  prediction_json: PredictionResponse | Record<string, unknown>;
}

export interface InteractiveAnalysisResponse {
  analysis_id: string;
  top_drivers: Driver[];
  sensitivity_summary: Array<Record<string, unknown>>;
  counterfactual_suggestions: string[];
  recommended_tests: string[];
  recommended_test_details: Array<{ test: string; reason: string; priority: string }>;
  property_response_curves: Record<string, Array<{ x: number; y: number }>>;
  out_of_domain: boolean;
  out_of_domain_reasons: string[];
}

export interface CoatingsResponse {
  coatings: string[];
}

export interface CoatingAnalysisResponse {
  material_name: string;
  coating_code: string;
  coating_modifier?: number | null;
  effective_score?: number | null;
  coating_compatibility_summary: string;
  coating_analysis: Record<string, unknown>;
}

export interface MaterialsResponse {
  materials: string[];
}

export interface ClusterRecord {
  cluster_id: number;
  material_count: number;
  centroid: Record<string, number>;
  example_materials: string[];
  materials_in_cluster?: string[];
  representative_material?: string | null;
}

export interface ClustersResponse {
  cluster_count: number;
  clusters: ClusterRecord[];
}

export interface DatasetSearchResponse {
  results: Array<Record<string, unknown>>;
  count: number;
}

export interface DatasetExportResponse {
  custom_materials: Array<Record<string, unknown>>;
  simulation_logs: Array<Record<string, unknown>>;
  training_ready_records: Array<Record<string, unknown>>;
  counts: Record<string, number>;
}

export interface DatasetUploadResponse {
  rows_accepted: number;
  rows_rejected: number;
  clustering_availability: boolean;
  feature_coverage: Record<string, number>;
}

export interface AdvisorResponse {
  advisor_summary: string;
  design_tradeoffs?: string[];
  design_improvement_suggestions: string[];
  recommended_tests: string[];
  property_targets?: Record<string, string>;
  risk_mitigation_strategies?: string[];
  material_family_recommendations?: string[];
}

export interface AdvisorChatResponse {
  analysis_id: string;
  answer: string;
  grounded_sources: string[];
}

export interface TdsResponse {
  analysis_id: string;
  material_name: string;
  predicted_fire_resistance?: number | null;
  resistance_score?: number | null;
  risk_score?: number | null;
  property_summary: Record<string, unknown>;
  confidence: Confidence | string | null;
  coating_compatibility?: Record<string, unknown> | null;
  top_drivers: Driver[];
  recommended_tests: string[];
  design_suggestions: string[];
  analysis_summary: string;
  subscores: Record<string, number>;
  sensitivity_summary: Array<Record<string, unknown>>;
  limitations_notice?: string | null;
}

export interface ExportResponse {
  filename: string;
  content_type: string;
  content: string;
}

export interface FormDescriptorState {
  material_name: string;
  coating_code: string;
  use_case: string;
  Density_g_cc: string;
  Melting_Point_C: string;
  Specific_Heat_J_g_C: string;
  Thermal_Cond_W_mK: string;
  CTE_um_m_C: string;
  Flash_Point_C: string;
  Autoignition_Temp_C: string;
  UL94_Flammability: string;
  Limiting_Oxygen_Index_pct: string;
  Smoke_Density_Ds: string;
  Char_Yield_pct: string;
  Decomp_Temp_C: string;
  Heat_of_Combustion_MJ_kg: string;
  Flame_Spread_Index: string;
}
