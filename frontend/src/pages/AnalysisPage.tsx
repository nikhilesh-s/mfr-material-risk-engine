import { useEffect, useState } from 'react';
import FeatureImportanceBarChart from '../charts/FeatureImportanceBarChart';
import FeatureImportanceTable from '../components/FeatureImportanceTable';
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
    <PageContainer eyebrow="Analysis" title="Single material analysis" description="Screen a lookup material or full custom descriptor set against the live Dravix inference engine.">
      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <MaterialInputForm mode={mode} setMode={setMode} materials={materials} coatings={coatings} form={form} onChange={setForm} onSubmit={runPrediction} loading={loading} />
        <PredictionResultCard prediction={prediction} />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <FeatureImportanceBarChart drivers={prediction?.top_drivers ?? []} />
        <FeatureImportanceTable drivers={prediction?.top_drivers ?? []} />
      </div>
    </PageContainer>
  );
}

export default AnalysisPage;
