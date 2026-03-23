import { designSystem } from '../theme/designSystem';
import type { SimulationFieldKey } from '../types';

export type SliderFieldConfig = {
  key: SimulationFieldKey;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
};

type SensitivitySlidersProps = {
  values: Record<SimulationFieldKey, number>;
  onChange: (key: SimulationFieldKey, value: number) => void;
  disabled?: boolean;
};

export const SLIDER_FIELDS: SliderFieldConfig[] = [
  { key: 'Limiting_Oxygen_Index_pct', label: 'Limiting Oxygen Index', min: -40, max: 40, step: 1, unit: '%' },
  { key: 'Char_Yield_pct', label: 'Char Yield', min: -40, max: 40, step: 1, unit: '%' },
  { key: 'Thermal_Cond_W_mK', label: 'Thermal Conductivity', min: -30, max: 30, step: 1, unit: '%' },
  { key: 'Heat_of_Combustion_MJ_kg', label: 'Heat of Combustion', min: -30, max: 30, step: 1, unit: '%' },
];

function formatDelta(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(0)}%`;
}

function SensitivitySliders({ values, onChange, disabled = false }: SensitivitySlidersProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {SLIDER_FIELDS.map((field) => (
        <label key={field.key} className="dravix-panel rounded-[1.5rem] px-4 py-4">
          <div className="flex items-start justify-between gap-4">
            <span className="block text-sm text-[#5f5042]">{field.label}</span>
            <span
              className="rounded-full px-3 py-1 text-xs font-medium"
              style={{
                background: designSystem.primaryGradient,
                color: designSystem.backgroundColors.text,
              }}
            >
              {formatDelta(values[field.key])}
            </span>
          </div>
          <input
            type="range"
            min={field.min}
            max={field.max}
            step={field.step}
            value={values[field.key]}
            disabled={disabled}
            onChange={(event) => onChange(field.key, Number.parseFloat(event.target.value))}
            className="mt-5 h-2 w-full cursor-pointer appearance-none rounded-full bg-[#FEFEFE]"
            style={{
              accentColor: designSystem.backgroundColors.accentCoral,
            }}
          />
          <div className="mt-3 flex items-center justify-between text-xs text-[#8a7562]">
            <span>{field.min}%</span>
            <span>Relative change from baseline</span>
            <span>{field.max}%</span>
          </div>
        </label>
      ))}
    </div>
  );
}

export default SensitivitySliders;
