import type { FormEvent } from 'react';
import type { Phase3Input } from '../types/index';

type Props = {
  materials: string[];
  materialName: string;
  setMaterialName: (value: string) => void;
  modifications: Record<string, string>;
  setModifications: (value: Record<string, string>) => void;
  onSubmit: () => void;
  loading?: boolean;
};

const fields = [
  { key: 'Limiting_Oxygen_Index_pct', label: 'Limiting Oxygen Index' },
  { key: 'Thermal_Cond_W_mK', label: 'Thermal Conductivity' },
  { key: 'Heat_of_Combustion_MJ_kg', label: 'Heat of Combustion' },
  { key: 'Char_Yield_pct', label: 'Char Yield' },
  { key: 'Decomp_Temp_C', label: 'Decomposition Temp' },
];

export function buildSimulationPayload(materialName: string, modifications: Record<string, string>): { base_material: Phase3Input; modifications: Record<string, number> } {
  const payload: Record<string, number> = {};
  for (const [key, value] of Object.entries(modifications)) {
    if (!value.trim()) continue;
    payload[key] = Number.parseFloat(value);
  }
  return {
    base_material: { material_name: materialName },
    modifications: payload,
  };
}

function SimulationForm({ materials, materialName, setMaterialName, modifications, setModifications, onSubmit, loading = false }: Props) {
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={submit} className="rounded-[1.5rem] border border-[var(--dravix-border)] bg-white p-6 shadow-[var(--dravix-shadow-soft)]">
      <div className="text-lg font-light text-[var(--dravix-ink)]">Sensitivity simulation</div>
      <div className="mt-4">
        <input list="simulation-materials" value={materialName} onChange={(e) => setMaterialName(e.target.value)} placeholder="ABS (FR Grade)" className="w-full rounded-2xl border border-[var(--dravix-border)] bg-[var(--dravix-panel)] px-4 py-3 text-sm" />
        <datalist id="simulation-materials">
          {materials.map((material) => <option key={material} value={material} />)}
        </datalist>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {fields.map((field) => (
          <div key={field.key}>
            <label className="mb-2 block text-sm text-[var(--dravix-ink-soft)]">{field.label}</label>
            <input value={modifications[field.key] || ''} onChange={(e) => setModifications({ ...modifications, [field.key]: e.target.value })} placeholder="New value" className="w-full rounded-2xl border border-[var(--dravix-border)] bg-[var(--dravix-panel)] px-4 py-3 text-sm" />
          </div>
        ))}
      </div>
      <button type="submit" disabled={loading} className="mt-6 rounded-full bg-[var(--dravix-gradient-primary)] px-5 py-3 text-sm text-white disabled:opacity-60">
        {loading ? 'Simulating…' : 'Run simulation'}
      </button>
    </form>
  );
}

export default SimulationForm;
