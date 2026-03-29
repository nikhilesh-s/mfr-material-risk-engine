import { useEffect, useState } from 'react';
import MaterialCard from '../components/MaterialCard';
import MaterialInputForm, { buildPhase3Payload } from '../forms/MaterialInputForm';
import PageContainer from '../layout/PageContainer';
import { analysisService } from '../services/analysisService';
import { datasetService } from '../services/datasetService';
import { exampleManualMaterial, useCases } from '../styles/tokens';
import type { FormDescriptorState, OptimizationResponse } from '../types/index';

const initialForm: FormDescriptorState = {
  ...exampleManualMaterial,
  material_name: 'ABS (FR Grade)',
  use_case: useCases[0],
};

function OptimizationPage() {
  const [mode, setMode] = useState<'lookup' | 'custom'>('lookup');
  const [form, setForm] = useState<FormDescriptorState>(initialForm);
  const [materials, setMaterials] = useState<string[]>([]);
  const [result, setResult] = useState<OptimizationResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void datasetService.getMaterials().then((res) => setMaterials(res.materials)).catch(() => undefined);
  }, []);

  const runOptimization = async () => {
    setLoading(true);
    try {
      setResult(await analysisService.optimizeMaterial(buildPhase3Payload(form, mode)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer eyebrow="Optimization Lab" title="Descriptor target explorer" description="Estimate property shifts that move a material toward stronger fire resistance without changing the deterministic backend logic.">
      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <MaterialInputForm mode={mode} setMode={setMode} materials={materials} form={form} onChange={setForm} onSubmit={runOptimization} submitLabel="Estimate optimization" loading={loading} />
        <MaterialCard title="Optimization output" subtitle="Deterministic local search using lightweight descriptor perturbations.">
          <div className="grid gap-4">
            <div className="rounded-2xl bg-[var(--dravix-panel)] p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--dravix-ink-soft)]">Baseline score</div>
              <div className="mt-2 text-3xl font-light text-[var(--dravix-ink)]">{result?.baseline_score?.toFixed(3) ?? 'n/a'}</div>
            </div>
            <div className="rounded-2xl bg-[var(--dravix-panel)] p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--dravix-ink-soft)]">Optimized estimate</div>
              <div className="mt-2 text-3xl font-light text-[var(--dravix-ink)]">{result?.optimized_score_estimate?.toFixed(3) ?? 'n/a'}</div>
            </div>
            <div className="rounded-2xl border border-[var(--dravix-border)] p-4">
              <div className="text-sm text-[var(--dravix-ink-soft)]">Property targets</div>
              <div className="mt-3 grid gap-2 text-sm">
                {Object.entries(result?.property_targets ?? {}).map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-4">
                    <span className="text-[var(--dravix-ink)]">{key}</span>
                    <span className="text-[var(--dravix-ink-soft)]">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </MaterialCard>
      </div>
    </PageContainer>
  );
}

export default OptimizationPage;
