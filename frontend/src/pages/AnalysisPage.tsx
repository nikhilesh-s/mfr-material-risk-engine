import { useEffect, useState } from 'react';
import FeatureImportanceBarChart from '../charts/FeatureImportanceBarChart';
import FeatureImportanceTable from '../components/FeatureImportanceTable';
import MaterialCard from '../components/MaterialCard';
import PredictionResultCard from '../components/PredictionResultCard';
import MaterialInputForm, { buildPhase3Payload } from '../forms/MaterialInputForm';
import PageContainer from '../layout/PageContainer';
import { analysisService } from '../services/analysisService';
import { datasetService } from '../services/datasetService';
import { exampleManualMaterial, useCases } from '../styles/tokens';
import type { FormDescriptorState, PredictionResponse } from '../types/index';

const initialForm: FormDescriptorState = {
  ...exampleManualMaterial,
  material_name: 'ABS (FR Grade)',
  use_case: useCases[0],
};

function AnalysisPage() {
  const [mode, setMode] = useState<'lookup' | 'custom'>('lookup');
  const [form, setForm] = useState<FormDescriptorState>(initialForm);
  const [materials, setMaterials] = useState<string[]>([]);
  const [coatings, setCoatings] = useState<string[]>([]);
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void Promise.allSettled([datasetService.getMaterials(), datasetService.getCoatings()]).then(([m, c]) => {
      if (m.status === 'fulfilled') setMaterials(m.value.materials);
      if (c.status === 'fulfilled') setCoatings(c.value.coatings);
    });
  }, []);

  const runPrediction = async () => {
    setLoading(true);
    try {
      const next = await analysisService.predictMaterial(buildPhase3Payload(form, mode));
      setPrediction(next);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer eyebrow="Discovery Lab" title="Material screening workspace" description="A cleaner interpretation-first flow for screening one material, understanding confidence, and inspecting dominant fire-risk drivers.">
      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <MaterialInputForm mode={mode} setMode={setMode} materials={materials} coatings={coatings} form={form} onChange={setForm} onSubmit={runPrediction} loading={loading} />
        <PredictionResultCard prediction={prediction} />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <FeatureImportanceBarChart drivers={prediction?.top_drivers ?? []} />
        <FeatureImportanceTable drivers={prediction?.top_drivers ?? []} />
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <MaterialCard title="Top drivers">
          <div className="space-y-2 text-sm">
            {(prediction?.top_drivers ?? []).slice(0, 4).map((driver) => (
              <div key={driver.feature} className="flex items-center justify-between gap-3 rounded-xl bg-[#f8f8f8] px-3 py-2">
                <span>{driver.feature}</span>
                <span className="text-[var(--dravix-ink-soft)]">{driver.abs_magnitude.toFixed(3)}</span>
              </div>
            ))}
          </div>
        </MaterialCard>
        <MaterialCard title="Recommended tests">
          <ul className="space-y-2 text-sm text-[var(--dravix-ink)]">
            {(prediction?.recommended_tests ?? []).map((item) => <li key={item}>• {item}</li>)}
          </ul>
        </MaterialCard>
        <MaterialCard title="Limitations notice">
          <div className="text-sm text-[var(--dravix-ink-soft)]">{prediction?.limitations_notice ?? 'Awaiting analysis output.'}</div>
        </MaterialCard>
      </div>
    </PageContainer>
  );
}

export default AnalysisPage;
