import { ArrowLeftRight, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ApiError, simulateMaterial } from '../lib/api';
import SensitivitySliders, { SLIDER_FIELDS } from './SensitivitySliders';
import SimulationDeltaIndicator from './SimulationDeltaIndicator';
import { designSystem } from '../theme/designSystem';
import type { SimulationFieldKey, SimulationRequest, SimulationResponse } from '../types';
import { USE_CASES } from '../useCases';

type MaterialSimulationProps = {
  materials: string[];
};

type SliderState = Record<SimulationFieldKey, number>;

const INITIAL_SLIDER_STATE: SliderState = {
  Limiting_Oxygen_Index_pct: 0,
  Thermal_Cond_W_mK: 0,
  Heat_of_Combustion_MJ_kg: 0,
  Char_Yield_pct: 0,
  Decomp_Temp_C: 0,
};

function buildSimulationPayload(
  material: string,
  useCase: string,
  adjustments: SliderState,
): SimulationRequest {
  const modifications: SimulationRequest['modifications'] = {};
  for (const field of SLIDER_FIELDS) {
    const delta = adjustments[field.key];
    if (delta === 0) {
      continue;
    }
    modifications[field.key] = `${delta}%`;
  }
  return {
    use_case: useCase,
    base_material: { material_name: material, use_case: useCase },
    modifications,
  };
}

function MaterialSimulation({ materials }: MaterialSimulationProps) {
  const [baseMaterial, setBaseMaterial] = useState('');
  const [useCase, setUseCase] = useState<string>(USE_CASES[0]);
  const [adjustments, setAdjustments] = useState<SliderState>(INITIAL_SLIDER_STATE);
  const [result, setResult] = useState<SimulationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const runSimulation = async () => {
    if (!baseMaterial.trim()) {
      setErrorMessage('Select a base material first.');
      return;
    }
    setLoading(true);
    setErrorMessage(null);
    try {
      const payload = buildSimulationPayload(baseMaterial, useCase, adjustments);
      if (Object.keys(payload.modifications).length === 0) {
        setResult(null);
        setLoading(false);
        return;
      }
      const response = await simulateMaterial(payload);
      setResult(response);
    } catch (error) {
      if (error instanceof ApiError || error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Sensitivity exploration failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!baseMaterial.trim()) {
      return;
    }

    const hasAnyChange = Object.values(adjustments).some((value) => value !== 0);
    if (!hasAnyChange) {
      setResult(null);
      setErrorMessage(null);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void runSimulation();
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [adjustments, baseMaterial, useCase]);

  return (
    <section className="space-y-6">
      <div className="dravix-hero rounded-[2rem] border px-8 py-9 text-white" style={{ borderColor: designSystem.backgroundColors.border }}>
        <div className="max-w-3xl">
          <div className="text-xs uppercase tracking-[0.24em] text-white/60">Sensitivity Exploration</div>
          <h2 className="mt-3 text-4xl font-light">Explore what-if changes before committing to physical testing.</h2>
          <p className="mt-4 text-base leading-7 text-white/78">
            This mode is for early-stage exploration only. Adjust supported descriptors, compare before vs after,
            and identify the dominant driver of change.
          </p>
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-[#cc8b60]/30 bg-[#fff1e8] px-4 py-3 text-sm text-[#8b3f14]">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.05fr_1fr]">
        <div className="dravix-card space-y-6 rounded-[2rem] p-7">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-[#5f5042]">Use case</label>
              <select
                value={useCase}
                onChange={(event) => setUseCase(event.target.value)}
                className="dravix-panel w-full rounded-2xl px-4 py-3 text-sm text-[#231a14] outline-none"
              >
                {USE_CASES.map((entry) => (
                  <option key={entry} value={entry}>{entry}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm text-[#5f5042]">Base material</label>
              <select
                value={baseMaterial}
                onChange={(event) => setBaseMaterial(event.target.value)}
                className="dravix-panel w-full rounded-2xl px-4 py-3 text-sm text-[#231a14] outline-none"
              >
                <option value="">Select material</option>
                {materials.map((material) => (
                  <option key={material} value={material}>{material}</option>
                ))}
              </select>
            </div>
          </div>

          <SensitivitySliders
            values={adjustments}
            disabled={!baseMaterial.trim()}
            onChange={(key, value) => {
              setAdjustments((current) => ({ ...current, [key]: value }));
            }}
          />

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => { void runSimulation(); }}
              disabled={loading || !baseMaterial.trim()}
              className="dravix-button-primary rounded-full px-6 py-3 text-sm font-medium transition hover:opacity-90 disabled:opacity-60"
            >
              {loading ? 'Running scenario...' : 'Run sensitivity check'}
            </button>
            <button
              type="button"
              onClick={() => {
                setAdjustments(INITIAL_SLIDER_STATE);
                setResult(null);
                setErrorMessage(null);
              }}
              className="dravix-panel rounded-full px-5 py-3 text-sm text-[#231a14]"
            >
              Reset scenario
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="dravix-panel rounded-[2rem] p-7">
            <div className="mb-4 flex items-center gap-3">
              <ArrowLeftRight className="h-5 w-5" style={{ color: designSystem.backgroundColors.accentCoral }} />
              <h3 className="text-xl font-light text-[#231a14]">Before vs After</h3>
            </div>
            {result ? (
              <div className="grid gap-4 md:grid-cols-3">
                <div className="dravix-card rounded-[1.5rem] px-4 py-4">
                  <div className="text-sm text-[#7c6857]">Baseline Score</div>
                  <div className="mt-2 text-4xl font-light text-[#231a14]">{result.baseline.risk_score.toFixed(1)}</div>
                  <div className="mt-2 text-sm text-[#5f5042]">Confidence {result.baseline.confidence}</div>
                </div>
                <div className="dravix-card rounded-[1.5rem] px-4 py-4">
                  <div className="text-sm text-[#7c6857]">Modified Score</div>
                  <div className="mt-2 text-4xl font-light text-[#231a14]">{result.modified.risk_score.toFixed(1)}</div>
                  <div className="mt-2 text-sm text-[#5f5042]">Confidence {result.modified.confidence}</div>
                </div>
                <div className="dravix-card rounded-[1.5rem] px-4 py-4">
                  <div className="text-sm text-[#7c6857]">Change (%)</div>
                  <div className="mt-2 text-4xl font-light text-[#231a14]">
                    {result.change.risk_percent_change == null
                      ? 'N/A'
                      : `${result.change.risk_percent_change > 0 ? '+' : ''}${result.change.risk_percent_change.toFixed(1)}%`}
                  </div>
                  <div className="mt-2 text-sm text-[#5f5042]">Driver {result.dominant_driver}</div>
                </div>
              </div>
            ) : (
              <div className="dravix-card rounded-[1.5rem] px-4 py-8 text-sm text-[#6b5949]">
                Run a scenario to compare original and modified screening outputs.
              </div>
            )}
          </div>

          <div className="dravix-card rounded-[2rem] p-7">
            <div className="mb-4 flex items-center gap-3">
              <Sparkles className="h-5 w-5" style={{ color: designSystem.backgroundColors.accentCoral }} />
              <h3 className="text-xl font-light text-[#231a14]">Scenario interpretation</h3>
            </div>
            {result ? (
              <div className="space-y-4">
                <SimulationDeltaIndicator percentChange={result.change.risk_percent_change} />
                <div className="rounded-[1.5rem] px-4 py-4 text-[#232422]" style={{ background: designSystem.primaryGradient }}>
                  <div className="text-sm text-[#232422]/70">Simulation Summary</div>
                  <div className="mt-2 text-xl font-light text-[#232422]">{result.simulation_summary}</div>
                </div>
                <div className="dravix-panel rounded-[1.5rem] px-4 py-4 text-sm leading-6 text-[#4b3928]">
                  {result.explanation}
                </div>
                <div className="dravix-panel rounded-[1.5rem] px-4 py-4">
                  <div className="mb-3 text-sm text-[#7c6857]">Driver Analysis</div>
                  <div className="space-y-3">
                    {result.driver_analysis.map((entry) => (
                      <div key={entry} className="dravix-card flex items-center gap-3 rounded-[1.25rem] px-4 py-3 text-sm text-[#4b3928]">
                        <span className="inline-flex h-2.5 w-2.5 rounded-full" style={{ background: designSystem.primaryGradient }} />
                        <span>{entry}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-[1.5rem] border border-[#cc8b60]/20 bg-[#fff3e8] px-4 py-4 text-sm leading-6 text-[#8b3f14]">
                  {result.limitations_notice}
                </div>
              </div>
            ) : (
              <div className="dravix-panel rounded-[1.5rem] px-4 py-8 text-sm text-[#6b5949]">
                Dominant driver and explanation appear after a live scenario run.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default MaterialSimulation;
