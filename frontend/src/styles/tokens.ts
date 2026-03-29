import type { FormDescriptorState } from '../types/index';

export const designTokens = {
  colors: {
    ink: '#762123',
    inkSoft: 'rgba(118, 33, 35, 0.68)',
    canvas: '#f8f8f8',
    surface: '#ffffff',
    panel: '#f4f2f0',
    border: 'rgba(118, 33, 35, 0.12)',
    coral: '#E8967F',
    berry: '#784F74',
    red: '#9E2A2A',
    success: '#2f7a5c',
    warning: '#a65a1f',
    dark: '#20181a',
  },
  gradients: {
    primary: 'linear-gradient(90deg, #784F74 0%, #E8967F 100%)',
    hero: 'linear-gradient(135deg, #20181a 0%, #762123 55%, #9E2A2A 100%)',
  },
  radius: {
    xl: '1.5rem',
    xxl: '2rem',
    pill: '9999px',
  },
  shadows: {
    soft: '0 18px 60px rgba(118, 33, 35, 0.08)',
  },
  font: {
    sans: '"Avenir Next", "Segoe UI", "Helvetica Neue", sans-serif',
  },
};

export const useCases = [
  'EV battery enclosure',
  'Fire-resistant building polymers',
  'Aerospace interior materials',
  'Industrial manufacturing materials',
];

export const exampleMaterialNames = [
  'ABS (FR Grade)',
  'Aluminum (6061-T6)',
  'Acrylic Sheet (PMMA)',
];

export const exampleManualMaterial: FormDescriptorState = {
  material_name: 'Custom Flame Polymer A',
  coating_code: '',
  use_case: useCases[0],
  Density_g_cc: '1.22',
  Melting_Point_C: '240',
  Specific_Heat_J_g_C: '1.35',
  Thermal_Cond_W_mK: '0.19',
  CTE_um_m_C: '72',
  Flash_Point_C: '365',
  Autoignition_Temp_C: '430',
  UL94_Flammability: '1',
  Limiting_Oxygen_Index_pct: '28',
  Smoke_Density_Ds: '95',
  Char_Yield_pct: '24',
  Decomp_Temp_C: '340',
  Heat_of_Combustion_MJ_kg: '27',
  Flame_Spread_Index: '32',
};
