import { useEffect, useState } from 'react';
import FeatureImportanceBarChart from '../charts/FeatureImportanceBarChart';
import SensitivityChart from '../charts/SensitivityChart';
import FeatureImportanceTable from '../components/FeatureImportanceTable';
import MaterialCard from '../components/MaterialCard';
import PredictionResultCard from '../components/PredictionResultCard';
import SectionBanner from '../components/SectionBanner';
import MaterialInputForm, { buildPhase3Payload } from '../forms/MaterialInputForm';
import SimulationForm, { buildSimulationPayload } from '../forms/SimulationForm';
import PageContainer from '../layout/PageContainer';
import { analysisService } from '../services/analysisService';
import { datasetService } from '../services/datasetService';
import { exampleManualMaterial, exampleMaterialNames, useCases } from '../styles/tokens';
import type {
  CoatingAnalysisResponse,
  ComparisonResponse,
  FormDescriptorState,
  OptimizationResponse,
  Phase3Input,
  PredictionResponse,
  SimulationResponse,
} from '../types/index';

const initialForm: FormDescriptorState = {
  ...exampleManualMaterial,
  material_name: 'ABS (FR Grade)',
  use_case: useCases[0],
};

function AnalyzePage() {
  const [materials, setMaterials] = useState<string[]>([]);
  const [coatings, setCoatings] = useState<string[]>([]);

  const [mode, setMode] = useState<'lookup' | 'custom'>('lookup');
  const [form, setForm] = useState<FormDescriptorState>(initialForm);
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [predictionLoading, setPredictionLoading] = useState(false);

  const [optimizationMode, setOptimizationMode] = useState<'lookup' | 'custom'>('lookup');
  const [optimizationForm, setOptimizationForm] = useState<FormDescriptorState>(initialForm);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResponse | null>(null);
  const [optimizationLoading, setOptimizationLoading] = useState(false);

  const [simulationMaterialName, setSimulationMaterialName] = useState('ABS (FR Grade)');
  const [modifications, setModifications] = useState<Record<string, string>>({ Limiting_Oxygen_Index_pct: '33' });
  const [simulationResult, setSimulationResult] = useState<SimulationResponse | null>(null);
  const [simulationLoading, setSimulationLoading] = useState(false);

  const [comparisonMaterialsText, setComparisonMaterialsText] = useState(exampleMaterialNames.join('\n'));
  const [comparisonUseCase, setComparisonUseCase] = useState(useCases[0]);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResponse | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);

  const [coatingMaterialName, setCoatingMaterialName] = useState(exampleMaterialNames[0]);
  const [coatingCode, setCoatingCode] = useState('');
  const [coatingResult, setCoatingResult] = useState<CoatingAnalysisResponse | null>(null);
  const [coatingLoading, setCoatingLoading] = useState(false);

  useEffect(() => {
    void Promise.allSettled([datasetService.getMaterials(), datasetService.getCoatings()]).then(([m, c]) => {
      if (m.status === 'fulfilled') {
        setMaterials(m.value.materials);
        if (!simulationMaterialName) setSimulationMaterialName(m.value.materials[0] ?? 'ABS (FR Grade)');
      }
      if (c.status === 'fulfilled') {
        setCoatings(c.value.coatings);
        setCoatingCode(c.value.coatings[0] ?? '');
      }
    });
  }, [simulationMaterialName]);

  const runPrediction = async () => {
    setPredictionLoading(true);
    try {
      const next = await analysisService.predictMaterial(buildPhase3Payload(form, mode));
      setPrediction(next);
      if (mode === 'lookup' && form.material_name) {
        setSimulationMaterialName(form.material_name);
        setCoatingMaterialName(form.material_name);
      }
    } finally {
      setPredictionLoading(false);
    }
  };

  const runOptimization = async () => {
    setOptimizationLoading(true);
    try {
      setOptimizationResult(await analysisService.optimizeMaterial(buildPhase3Payload(optimizationForm, optimizationMode)));
    } finally {
      setOptimizationLoading(false);
    }
  };

  const runSimulation = async () => {
    setSimulationLoading(true);
    try {
      const next = await analysisService.simulateSensitivity(
        buildSimulationPayload(simulationMaterialName, modifications),
      );
      setSimulationResult(next);
    } finally {
      setSimulationLoading(false);
    }
  };

  const comparisonPayload = (): Phase3Input[] =>
    comparisonMaterialsText
      .split('\n')
      .map((value) => value.trim())
      .filter(Boolean)
      .map((material_name) => ({ material_name }));

  const runComparison = async () => {
    setComparisonLoading(true);
    try {
      setComparisonResult(
        await analysisService.compareMaterials({
          materials: comparisonPayload(),
          use_case: comparisonUseCase,
        }),
      );
    } finally {
      setComparisonLoading(false);
    }
  };

  const runCoatingAnalysis = async () => {
    setCoatingLoading(true);
    try {
      setCoatingResult(
        await datasetService.analyzeCoating({
          base_material: { material_name: coatingMaterialName },
          coating_code: coatingCode,
        }),
      );
    } finally {
      setCoatingLoading(false);
    }
  };

  return (
    <PageContainer
      eyebrow="Analyze"
      title="Analyze"
    >
      <SectionBanner title="Single-material screening" subtitle="Predict one material and inspect the core result." />
      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <MaterialInputForm
          mode={mode}
          setMode={setMode}
          materials={materials}
          coatings={coatings}
          form={form}
          onChange={setForm}
          onSubmit={runPrediction}
          loading={predictionLoading}
        />
        <PredictionResultCard prediction={prediction} />
      </div>

      <SectionBanner title="Driver view" subtitle="Read the strongest variables behind the current prediction." />
      <div className="grid gap-6 xl:grid-cols-2">
        <FeatureImportanceBarChart drivers={prediction?.top_drivers ?? []} />
        <FeatureImportanceTable drivers={prediction?.top_drivers ?? []} />
      </div>

      <SectionBanner title="Coating analysis" subtitle="Check the same material with a coating immediately after screening." />
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <MaterialCard title="Coating setup">
          <div className="grid gap-4">
            <select
              value={coatingMaterialName}
              onChange={(event) => setCoatingMaterialName(event.target.value)}
              className="rounded-xl border border-[#762123]/10 bg-[#f8f8f8] px-4 py-3 text-sm"
            >
              {exampleMaterialNames.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <select
              value={coatingCode}
              onChange={(event) => setCoatingCode(event.target.value)}
              className="rounded-xl border border-[#762123]/10 bg-[#f8f8f8] px-4 py-3 text-sm"
            >
              {coatings.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <button
              onClick={runCoatingAnalysis}
              disabled={coatingLoading}
              className="rounded-full bg-gradient-to-r from-[#784F74] to-[#E8967F] px-4 py-2 text-sm text-white disabled:opacity-60"
            >
              {coatingLoading ? 'Analyzing…' : 'Analyze coating'}
            </button>
          </div>
        </MaterialCard>

        <MaterialCard title="Coating result" subtitle={coatingResult?.coating_compatibility_summary ?? 'Run coating analysis to populate this panel.'}>
          <div className="grid gap-3 text-sm">
            <div>Material: {coatingResult?.material_name ?? 'n/a'}</div>
            <div>Coating: {coatingResult?.coating_code ?? 'n/a'}</div>
            <div>Modifier: {coatingResult?.coating_modifier ?? 'n/a'}</div>
            <div>Effective score: {coatingResult?.effective_score ?? 'n/a'}</div>
          </div>
        </MaterialCard>
      </div>

      <SectionBanner title="Sensitivity simulation" subtitle="Perturb a few properties and inspect the delta with proper loading feedback." />
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <SimulationForm
          materials={materials}
          materialName={simulationMaterialName}
          setMaterialName={setSimulationMaterialName}
          modifications={modifications}
          setModifications={setModifications}
          onSubmit={runSimulation}
          loading={simulationLoading}
        />
        <MaterialCard title="Simulation result" subtitle={simulationResult?.simulation_summary ?? 'Run a simulation to populate this panel.'}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.5rem] bg-[#f8f8f8] p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--dravix-ink-soft)]">Baseline</div>
              <div className="mt-2 text-3xl font-light text-[var(--dravix-ink)]">
                {simulationResult?.baseline.resistanceScore.toFixed(3) ?? 'n/a'}
              </div>
            </div>
            <div className="rounded-[1.5rem] bg-[#f8f8f8] p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--dravix-ink-soft)]">Modified</div>
              <div className="mt-2 text-3xl font-light text-[var(--dravix-ink)]">
                {simulationResult?.modified.resistanceScore.toFixed(3) ?? 'n/a'}
              </div>
            </div>
          </div>
          <div className="mt-4 text-sm text-[var(--dravix-ink-soft)]">
            Delta {simulationResult?.change.delta?.toFixed(4) ?? 'n/a'} • Dominant driver {simulationResult?.dominant_driver ?? 'n/a'}
          </div>
        </MaterialCard>
      </div>

      <SensitivityChart curves={prediction?.property_response_curves ?? {}} />

      <SectionBanner title="Optimization" subtitle="Estimate stronger property targets without changing the inference model." />
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <MaterialInputForm
          mode={optimizationMode}
          setMode={setOptimizationMode}
          materials={materials}
          coatings={coatings}
          form={optimizationForm}
          onChange={setOptimizationForm}
          onSubmit={runOptimization}
          submitLabel="Estimate optimization"
          loading={optimizationLoading}
        />
        <MaterialCard title="Optimization output" subtitle="Deterministic local search using lightweight descriptor perturbations.">
          <div className="grid gap-4">
            <div className="rounded-[1.5rem] bg-[#f8f8f8] p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--dravix-ink-soft)]">Baseline score</div>
              <div className="mt-2 text-3xl font-light text-[var(--dravix-ink)]">
                {optimizationResult?.baseline_score?.toFixed(3) ?? 'n/a'}
              </div>
            </div>
            <div className="rounded-[1.5rem] bg-[#f8f8f8] p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--dravix-ink-soft)]">Optimized estimate</div>
              <div className="mt-2 text-3xl font-light text-[var(--dravix-ink)]">
                {optimizationResult?.optimized_score_estimate?.toFixed(3) ?? 'n/a'}
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-[var(--dravix-border)] p-4">
              <div className="text-sm text-[var(--dravix-ink-soft)]">Property targets</div>
              <div className="mt-3 grid gap-2 text-sm">
                {Object.entries(optimizationResult?.property_targets ?? {}).map(([key, value]) => (
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

      <SectionBanner title="Comparison" subtitle="Place a small candidate set side by side in the same analysis tab." />
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <MaterialCard title="Comparison input">
          <select
            value={comparisonUseCase}
            onChange={(event) => setComparisonUseCase(event.target.value)}
            className="mb-4 w-full rounded-xl border border-[#762123]/10 bg-[#f8f8f8] px-4 py-3 text-sm"
          >
            {useCases.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <textarea
            value={comparisonMaterialsText}
            onChange={(event) => setComparisonMaterialsText(event.target.value)}
            rows={8}
            className="w-full rounded-xl border border-[#762123]/10 bg-[#f8f8f8] px-4 py-3 text-sm"
          />
          <button
            onClick={runComparison}
            disabled={comparisonLoading}
            className="mt-4 rounded-full bg-gradient-to-r from-[#784F74] to-[#E8967F] px-4 py-2 text-sm text-white disabled:opacity-60"
          >
            {comparisonLoading ? 'Comparing…' : 'Compare materials'}
          </button>
        </MaterialCard>

        <MaterialCard title="Comparison summary" subtitle={comparisonResult?.comparison_summary ?? 'Run a comparison to populate this panel.'}>
          <div className="space-y-3">
            <div className="text-sm text-[var(--dravix-ink-soft)]">Best material</div>
            <div className="text-2xl font-light text-[var(--dravix-ink)]">
              {comparisonResult?.best_material?.material_name ?? 'n/a'}
            </div>
            <ul className="space-y-2 text-sm text-[var(--dravix-ink)]">
              {(comparisonResult?.design_tradeoffs ?? []).map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
        </MaterialCard>
      </div>
    </PageContainer>
  );
}

export default AnalyzePage;
