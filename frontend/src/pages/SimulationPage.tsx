import { useEffect, useState } from 'react';
import SensitivityChart from '../charts/SensitivityChart';
import MaterialCard from '../components/MaterialCard';
import SimulationForm, { buildSimulationPayload } from '../forms/SimulationForm';
import PageContainer from '../layout/PageContainer';
import { analysisService } from '../services/analysisService';
import { datasetService } from '../services/datasetService';
import type { PredictionResponse, SimulationResponse } from '../types/index';

function SimulationPage() {
  const [materials, setMaterials] = useState<string[]>([]);
  const [materialName, setMaterialName] = useState('ABS (FR Grade)');
  const [modifications, setModifications] = useState<Record<string, string>>({ Limiting_Oxygen_Index_pct: '33' });
  const [result, setResult] = useState<SimulationResponse | null>(null);
  const [analysis, setAnalysis] = useState<PredictionResponse | null>(null);

  useEffect(() => {
    void datasetService.getMaterials().then((res) => setMaterials(res.materials)).catch(() => undefined);
  }, []);

  const runSimulation = async () => {
    const next = await analysisService.simulateSensitivity(buildSimulationPayload(materialName, modifications));
    setResult(next);
    setAnalysis(await analysisService.predictMaterial({ material_name: materialName }));
  };

  return (
    <PageContainer eyebrow="Simulation" title="Sensitivity simulation" description="Change descriptor values and inspect how the fire-risk proxy moves relative to the baseline material.">
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <SimulationForm materials={materials} materialName={materialName} setMaterialName={setMaterialName} modifications={modifications} setModifications={setModifications} onSubmit={runSimulation} />
        <MaterialCard title="Simulation result" subtitle={result?.simulation_summary ?? 'Run a simulation to populate this panel.'}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-[var(--dravix-panel)] p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--dravix-ink-soft)]">Baseline</div>
              <div className="mt-2 text-3xl font-light text-[var(--dravix-ink)]">{result?.baseline.resistanceScore.toFixed(3) ?? 'n/a'}</div>
            </div>
            <div className="rounded-2xl bg-[var(--dravix-panel)] p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--dravix-ink-soft)]">Modified</div>
              <div className="mt-2 text-3xl font-light text-[var(--dravix-ink)]">{result?.modified.resistanceScore.toFixed(3) ?? 'n/a'}</div>
            </div>
          </div>
          <div className="mt-4 text-sm text-[var(--dravix-ink-soft)]">Delta {result?.change.delta?.toFixed(4) ?? 'n/a'} • Dominant driver {result?.dominant_driver ?? 'n/a'}</div>
        </MaterialCard>
      </div>
      <SensitivityChart curves={analysis?.property_response_curves ?? {}} />
    </PageContainer>
  );
}

export default SimulationPage;
