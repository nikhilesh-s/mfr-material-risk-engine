import type { FormEvent } from 'react';
import type { FormDescriptorState, Phase3Input } from '../types/index';
import { exampleManualMaterial, exampleMaterialNames, useCases } from '../styles/tokens';

export const descriptorFields: Array<{ key: keyof FormDescriptorState; label: string; unit?: string }> = [
  { key: 'Density_g_cc', label: 'Density', unit: 'g/cc' },
  { key: 'Melting_Point_C', label: 'Melting Point', unit: '°C' },
  { key: 'Specific_Heat_J_g_C', label: 'Specific Heat', unit: 'J/g-°C' },
  { key: 'Thermal_Cond_W_mK', label: 'Thermal Conductivity', unit: 'W/m-K' },
  { key: 'CTE_um_m_C', label: 'CTE', unit: 'µm/m-°C' },
  { key: 'Flash_Point_C', label: 'Flash Point', unit: '°C' },
  { key: 'Autoignition_Temp_C', label: 'Autoignition Temp', unit: '°C' },
  { key: 'UL94_Flammability', label: 'UL94 Flammability' },
  { key: 'Limiting_Oxygen_Index_pct', label: 'Limiting Oxygen Index', unit: '%' },
  { key: 'Smoke_Density_Ds', label: 'Smoke Density', unit: 'Ds' },
  { key: 'Char_Yield_pct', label: 'Char Yield', unit: '%' },
  { key: 'Decomp_Temp_C', label: 'Decomposition Temp', unit: '°C' },
  { key: 'Heat_of_Combustion_MJ_kg', label: 'Heat of Combustion', unit: 'MJ/kg' },
  { key: 'Flame_Spread_Index', label: 'Flame Spread Index' },
];

type Props = {
  mode: 'lookup' | 'custom';
  setMode: (mode: 'lookup' | 'custom') => void;
  materials: string[];
  coatings?: string[];
  form: FormDescriptorState;
  onChange: (next: FormDescriptorState) => void;
  onSubmit: () => void;
  submitLabel?: string;
  loading?: boolean;
};

export function buildPhase3Payload(form: FormDescriptorState, mode: 'lookup' | 'custom'): Phase3Input {
  if (mode === 'lookup') {
    return {
      material_name: form.material_name,
      coating_code: form.coating_code || undefined,
      use_case: form.use_case || undefined,
    };
  }
  const payload: Phase3Input = {
    material_name: form.material_name || undefined,
    coating_code: form.coating_code || undefined,
    use_case: form.use_case || undefined,
  };
  for (const field of descriptorFields) {
    payload[field.key as keyof Phase3Input] = Number.parseFloat(form[field.key]) as never;
  }
  return payload;
}

function MaterialInputForm({ mode, setMode, materials, coatings = [], form, onChange, onSubmit, submitLabel = 'Run analysis', loading = false }: Props) {
  const setField = (key: keyof FormDescriptorState, value: string) => onChange({ ...form, [key]: value });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={submit} className="rounded-[1.5rem] border border-[var(--dravix-border)] bg-white p-6 shadow-[var(--dravix-shadow-soft)]">
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => setMode('lookup')} className={`rounded-full px-4 py-2 text-sm ${mode === 'lookup' ? 'bg-[var(--dravix-gradient-primary)] text-white' : 'bg-[var(--dravix-panel)] text-[var(--dravix-ink)]'}`}>Material lookup</button>
        <button type="button" onClick={() => setMode('custom')} className={`rounded-full px-4 py-2 text-sm ${mode === 'custom' ? 'bg-[var(--dravix-gradient-primary)] text-white' : 'bg-[var(--dravix-panel)] text-[var(--dravix-ink)]'}`}>Custom descriptors</button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {exampleMaterialNames.map((name) => (
          <button key={name} type="button" onClick={() => { setMode('lookup'); onChange({ ...form, material_name: name }); }} className="rounded-full border border-[var(--dravix-border)] px-3 py-1 text-xs text-[var(--dravix-ink)]">
            {name}
          </button>
        ))}
        <button type="button" onClick={() => { setMode('custom'); onChange(exampleManualMaterial); }} className="rounded-full border border-[var(--dravix-border)] px-3 py-1 text-xs text-[var(--dravix-ink)]">
          Demo custom
        </button>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm text-[var(--dravix-ink-soft)]">Use case</label>
          <select value={form.use_case} onChange={(e) => setField('use_case', e.target.value)} className="w-full rounded-2xl border border-[var(--dravix-border)] bg-[var(--dravix-panel)] px-4 py-3 text-sm">
            {useCases.map((useCase) => <option key={useCase} value={useCase}>{useCase}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-2 block text-sm text-[var(--dravix-ink-soft)]">Coating</label>
          <select value={form.coating_code} onChange={(e) => setField('coating_code', e.target.value)} className="w-full rounded-2xl border border-[var(--dravix-border)] bg-[var(--dravix-panel)] px-4 py-3 text-sm">
            <option value="">None</option>
            {coatings.map((coating) => <option key={coating} value={coating}>{coating}</option>)}
          </select>
        </div>
      </div>
      <div className="mt-4">
        <label className="mb-2 block text-sm text-[var(--dravix-ink-soft)]">Material name</label>
        {mode === 'lookup' ? (
          <input list="material-options" value={form.material_name} onChange={(e) => setField('material_name', e.target.value)} className="w-full rounded-2xl border border-[var(--dravix-border)] bg-[var(--dravix-panel)] px-4 py-3 text-sm" placeholder="ABS (FR Grade)" />
        ) : (
          <input value={form.material_name} onChange={(e) => setField('material_name', e.target.value)} className="w-full rounded-2xl border border-[var(--dravix-border)] bg-[var(--dravix-panel)] px-4 py-3 text-sm" placeholder="Custom Flame Polymer A" />
        )}
        <datalist id="material-options">
          {materials.map((material) => <option key={material} value={material} />)}
        </datalist>
      </div>
      {mode === 'custom' ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {descriptorFields.map((field) => (
            <div key={field.key}>
              <label className="mb-2 block text-sm text-[var(--dravix-ink-soft)]">{field.label}</label>
              <input value={form[field.key]} onChange={(e) => setField(field.key, e.target.value)} className="w-full rounded-2xl border border-[var(--dravix-border)] bg-[var(--dravix-panel)] px-4 py-3 text-sm" placeholder={field.unit || 'value'} />
            </div>
          ))}
        </div>
      ) : null}
      <button type="submit" disabled={loading} className="mt-6 rounded-full bg-[var(--dravix-gradient-primary)] px-5 py-3 text-sm text-white disabled:opacity-60">
        {loading ? 'Loading…' : submitLabel}
      </button>
    </form>
  );
}

export default MaterialInputForm;
