import type { PredictionRequest } from './types';

export interface DemoProfile {
  id: string;
  label: string;
  subtitle: string;
  mode: 'lookup' | 'manual';
  payload: PredictionRequest;
}

const manualPolymerLike = {
  Density_g_cc: 1.25,
  Melting_Point_C: 220,
  Specific_Heat_J_g_C: 1.5,
  Thermal_Cond_W_mK: 0.21,
  CTE_um_m_C: 95,
  Flash_Point_C: 320,
  Autoignition_Temp_C: 450,
  UL94_Flammability: 1,
  Limiting_Oxygen_Index_pct: 19,
  Smoke_Density_Ds: 120,
  Char_Yield_pct: 12,
  Decomp_Temp_C: 300,
  Heat_of_Combustion_MJ_kg: 28,
  Flame_Spread_Index: 40,
};

export const demoProfiles: DemoProfile[] = [
  {
    id: 'manual-polymer',
    label: 'Manual Polymer',
    subtitle: 'Polymer-like manual descriptor set',
    mode: 'manual',
    payload: manualPolymerLike,
  },
  {
    id: 'lookup-hdpe',
    label: 'Lookup HDPE',
    subtitle: 'Material lookup: Polyethylene (HDPE)',
    mode: 'lookup',
    payload: { material_name: 'Polyethylene (HDPE)' },
  },
  {
    id: 'manual-polymer-coated',
    label: 'Manual + Coating',
    subtitle: 'Same manual input with coating modifier',
    mode: 'manual',
    payload: { ...manualPolymerLike, coating_code: '193-MAT-001' },
  },
];
