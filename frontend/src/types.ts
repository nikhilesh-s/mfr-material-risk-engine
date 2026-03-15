export interface ManualPredictionPayload {
  Density_g_cc: number;
  Melting_Point_C: number;
  Specific_Heat_J_g_C: number;
  Thermal_Cond_W_mK: number;
  CTE_um_m_C: number;
  Flash_Point_C: number;
  Autoignition_Temp_C: number;
  UL94_Flammability: number;
  Limiting_Oxygen_Index_pct: number;
  Smoke_Density_Ds: number;
  Char_Yield_pct: number;
  Decomp_Temp_C: number;
  Heat_of_Combustion_MJ_kg: number;
  Flame_Spread_Index: number;
  coating_code?: string;
}

export interface LookupPredictionPayload {
  material_name: string;
  coating_code?: string;
}

export type PredictionRequest = ManualPredictionPayload | LookupPredictionPayload;

export interface RankRequest {
  materials: Array<LookupPredictionPayload | ManualPredictionPayload>;
}

export interface RankedMaterial {
  rank: number;
  material: string;
  resistanceScore: number;
  confidence: string;
}

export interface RankError {
  material: string;
  error: string;
}

export interface RankResponse {
  ranking: RankedMaterial[];
  errors: RankError[];
}

export type SimulationFieldKey =
  | 'Limiting_Oxygen_Index_pct'
  | 'Thermal_Cond_W_mK'
  | 'Char_Yield_pct'
  | 'Decomp_Temp_C';

export interface SimulationRequest {
  base_material: LookupPredictionPayload | ManualPredictionPayload;
  modifications: Partial<Record<SimulationFieldKey, number | string>>;
}

export interface SimulationPrediction {
  resistanceScore: number;
  confidence: string;
}

export interface SimulationChange {
  delta: number;
  percent_change: number | null;
}

export interface SimulationResponse {
  baseline: SimulationPrediction;
  modified: SimulationPrediction;
  change: SimulationChange;
}

export interface Driver {
  feature: string;
  contribution: number;
  direction: string;
  abs_magnitude: number;
}

export interface Interpretability {
  prediction: number;
  top_3_drivers: Driver[];
  feature_contributions: Record<string, number>;
  display_names?: Record<string, string>;
  error?: {
    type: string;
    message: string;
  };
}

export interface Confidence {
  score: number;
  label: string;
}

export interface Dataset {
  version: string;
}

export interface PredictionResponse {
  resistanceScore: number;
  effectiveResistance: number;
  coatingModifier: number | null;
  confidence: Confidence;
  interpretability: Interpretability;
  dataset: Dataset;
}

export interface VersionInfo {
  service: string;
  version: string;
  api_version: string;
  dataset_version: string;
  model_artifact: string;
  build_hash: string;
  timestamp_utc: string;
}

export interface HealthInfo {
  status: string;
  dataset_version: string;
  model_loaded: boolean;
  lookup_loaded: boolean;
}

export interface MaterialsInfo {
  materials: string[];
}

export interface CoatingsInfo {
  coatings: string[];
}

export interface ApiErrorDetail {
  loc?: Array<string | number>;
  msg?: string;
  type?: string;
}
