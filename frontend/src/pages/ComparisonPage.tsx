import { useState } from 'react';
import MaterialCard from '../components/MaterialCard';
import PageContainer from '../layout/PageContainer';
import { analysisService } from '../services/analysisService';
import { exampleMaterialNames, useCases } from '../styles/tokens';
import type { ComparisonResponse, Phase3Input } from '../types/index';

function ComparisonPage() {
  const [materialsText, setMaterialsText] = useState(exampleMaterialNames.join('\n'));
  const [useCase, setUseCase] = useState(useCases[0]);
  const [result, setResult] = useState<ComparisonResponse | null>(null);

  const payload = (): Phase3Input[] =>
    materialsText.split('\n').map((value) => value.trim()).filter(Boolean).map((material_name) => ({ material_name }));

  return (
    <PageContainer eyebrow="Comparison" title="Material comparison engine" description="Compare candidate materials side-by-side and inspect the property spreads that drive tradeoffs.">
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <MaterialCard title="Comparison input" subtitle="Provide two or more materials.">
          <select value={useCase} onChange={(e) => setUseCase(e.target.value)} className="mb-4 w-full rounded-2xl border border-[var(--dravix-border)] bg-[var(--dravix-panel)] px-4 py-3 text-sm">
            {useCases.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <textarea value={materialsText} onChange={(e) => setMaterialsText(e.target.value)} rows={8} className="w-full rounded-2xl border border-[var(--dravix-border)] bg-[var(--dravix-panel)] px-4 py-3 text-sm" />
          <button onClick={() => analysisService.compareMaterials({ materials: payload(), use_case: useCase }).then(setResult)} className="mt-4 rounded-full bg-[var(--dravix-gradient-primary)] px-4 py-2 text-sm text-white">
            Compare materials
          </button>
        </MaterialCard>
        <MaterialCard title="Comparison summary" subtitle={result?.comparison_summary ?? 'Run a comparison to populate this panel.'}>
          <div className="space-y-3">
            <div className="text-sm text-[var(--dravix-ink-soft)]">Best material</div>
            <div className="text-2xl font-light text-[var(--dravix-ink)]">{result?.best_material?.material_name ?? 'n/a'}</div>
            <ul className="space-y-2 text-sm text-[var(--dravix-ink)]">
              {(result?.design_tradeoffs ?? []).map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </div>
        </MaterialCard>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <MaterialCard title="Side-by-side results">
          <div className="space-y-3">
            {(result?.materials ?? []).map((item) => (
              <div key={item.material_name} className="rounded-2xl border border-[var(--dravix-border)] p-4">
                <div className="text-lg text-[var(--dravix-ink)]">{item.material_name}</div>
                <div className="mt-2 text-sm text-[var(--dravix-ink-soft)]">Resistance {item.resistance_score.toFixed(3)} • Risk {item.risk_score.toFixed(1)} • {item.confidence}</div>
              </div>
            ))}
          </div>
        </MaterialCard>
        <MaterialCard title="Dominant property differences">
          <div className="space-y-3">
            {(result?.dominant_property_differences ?? []).map((item) => (
              <div key={item.property} className="flex justify-between gap-4 rounded-2xl border border-[var(--dravix-border)] p-4 text-sm">
                <span className="text-[var(--dravix-ink)]">{item.property}</span>
                <span className="text-[var(--dravix-ink-soft)]">spread {item.spread.toFixed(3)}</span>
              </div>
            ))}
          </div>
        </MaterialCard>
      </div>
    </PageContainer>
  );
}

export default ComparisonPage;
