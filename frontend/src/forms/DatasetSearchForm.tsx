import type { FormEvent } from 'react';

export type DatasetSearchState = {
  material_name: string;
  density_min: string;
  density_max: string;
  melting_point_min: string;
  melting_point_max: string;
};

type Props = {
  state: DatasetSearchState;
  onChange: (state: DatasetSearchState) => void;
  onSubmit: () => void;
};

function DatasetSearchForm({ state, onChange, onSubmit }: Props) {
  const setField = (key: keyof DatasetSearchState, value: string) => onChange({ ...state, [key]: value });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={submit} className="rounded-[1.5rem] border border-[var(--dravix-border)] bg-white p-5 shadow-[var(--dravix-shadow-soft)]">
      <div className="text-lg font-light text-[var(--dravix-ink)]">Dataset search</div>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <input value={state.material_name} onChange={(e) => setField('material_name', e.target.value)} placeholder="Material name" className="rounded-2xl border border-[var(--dravix-border)] bg-[var(--dravix-panel)] px-4 py-3 text-sm" />
        <input value={state.density_min} onChange={(e) => setField('density_min', e.target.value)} placeholder="Density min" className="rounded-2xl border border-[var(--dravix-border)] bg-[var(--dravix-panel)] px-4 py-3 text-sm" />
        <input value={state.density_max} onChange={(e) => setField('density_max', e.target.value)} placeholder="Density max" className="rounded-2xl border border-[var(--dravix-border)] bg-[var(--dravix-panel)] px-4 py-3 text-sm" />
        <input value={state.melting_point_min} onChange={(e) => setField('melting_point_min', e.target.value)} placeholder="Melting point min" className="rounded-2xl border border-[var(--dravix-border)] bg-[var(--dravix-panel)] px-4 py-3 text-sm" />
        <input value={state.melting_point_max} onChange={(e) => setField('melting_point_max', e.target.value)} placeholder="Melting point max" className="rounded-2xl border border-[var(--dravix-border)] bg-[var(--dravix-panel)] px-4 py-3 text-sm" />
      </div>
      <button type="submit" className="mt-4 rounded-full bg-[var(--dravix-gradient-primary)] px-4 py-2 text-sm text-white">Search dataset</button>
    </form>
  );
}

export default DatasetSearchForm;
