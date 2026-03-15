import { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, FlaskConical, Minus } from 'lucide-react';
import { ApiError, simulateMaterial } from '../lib/api';
import type {
  SimulationFieldKey,
  SimulationRequest,
  SimulationResponse,
} from '../types';

type MaterialSimulationProps = {
  materials: string[];
};

type AdjustmentState = Record<SimulationFieldKey, string>;

const ADJUSTMENT_FIELDS: Array<{
  key: SimulationFieldKey;
  label: string;
  placeholder: string;
}> = [
  {
    key: 'Limiting_Oxygen_Index_pct',
    label: 'Limiting Oxygen Index (%)',
    placeholder: '24 or +15%',
  },
  {
    key: 'Thermal_Cond_W_mK',
    label: 'Thermal Conductivity (W/m·K)',
    placeholder: '0.28 or -10%',
  },
  {
    key: 'Char_Yield_pct',
    label: 'Char Yield (%)',
    placeholder: '18 or +12%',
  },
  {
    key: 'Decomp_Temp_C',
    label: 'Decomposition Temperature (°C)',
    placeholder: '340 or +8%',
  },
];

const INITIAL_ADJUSTMENTS: AdjustmentState = {
  Limiting_Oxygen_Index_pct: '',
  Thermal_Cond_W_mK: '',
  Char_Yield_pct: '',
  Decomp_Temp_C: '',
};

function buildSimulationPayload(
  material: string,
  adjustments: AdjustmentState,
): SimulationRequest {
  const modifications: SimulationRequest['modifications'] = {};

  for (const field of ADJUSTMENT_FIELDS) {
    const raw = adjustments[field.key].trim();
    if (!raw) {
      continue;
    }

    if (raw.endsWith('%')) {
      modifications[field.key] = raw;
      continue;
    }

    const numericValue = Number.parseFloat(raw);
    if (Number.isNaN(numericValue)) {
      throw new Error(`Invalid adjustment for ${field.label}`);
    }
    modifications[field.key] = numericValue;
  }

  return {
    base_material: { material_name: material },
    modifications,
  };
}

function MaterialSimulation({ materials }: MaterialSimulationProps) {
  const [baseMaterial, setBaseMaterial] = useState('');
  const [adjustments, setAdjustments] = useState<AdjustmentState>(INITIAL_ADJUSTMENTS);
  const [result, setResult] = useState<SimulationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const delta = result?.change.delta ?? 0;
  const isImprovement = delta > 0;
  const isDegradation = delta < 0;
  const changeDisplay = useMemo(() => {
    if (!result) {
      return 'No simulation yet';
    }
    if (result.change.percent_change == null) {
      return 'Change unavailable';
    }
    const sign = result.change.percent_change > 0 ? '+' : '';
    return `${sign}${result.change.percent_change.toFixed(1)}%`;
  }, [result]);

  const runSimulation = async () => {
    if (!baseMaterial.trim()) {
      setErrorMessage('Select a base material first.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const payload = buildSimulationPayload(baseMaterial, adjustments);
      const response = await simulateMaterial(payload);
      setResult(response);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Simulation failed. Please retry.');
      }
    } finally {
      setLoading(false);
    }
  };

  const changeIndicator = result ? (
    isImprovement ? (
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#DDEED8] text-[#1C5E20] text-sm">
        <ArrowUpRight className="w-4 h-4" />
        Improvement
      </div>
    ) : isDegradation ? (
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FDE7E7] text-[#7F1D1D] text-sm">
        <ArrowDownRight className="w-4 h-4" />
        Degradation
      </div>
    ) : (
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ECE4D8] text-[#232422] text-sm">
        <Minus className="w-4 h-4" />
        No change
      </div>
    )
  ) : null;

  return (
    <section className="mt-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-[#24262E] rounded-xl flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-[#FFDC6A]" />
            </div>
            <h2 className="text-3xl font-light text-[#232422]">Material Improvement Simulator</h2>
          </div>
          <p className="text-[#232422]/60 max-w-2xl">
            Test how descriptor changes may improve or reduce predicted fire resistance.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-6 bg-[#FEFEFE] rounded-3xl p-6">
          <h3 className="text-lg font-light text-[#232422] mb-4">Base Material</h3>
          <select
            value={baseMaterial}
            onChange={(e) => setBaseMaterial(e.target.value)}
            className="w-full px-4 py-3 bg-[#F5F1EC] rounded-2xl text-sm text-[#232422] focus:outline-none focus:ring-2 focus:ring-[#FFDC6A]"
          >
            <option value="">Select material</option>
            {materials.map((material) => (
              <option key={material} value={material}>
                {material}
              </option>
            ))}
          </select>

          <div className="mt-6 space-y-4">
            {ADJUSTMENT_FIELDS.map((field) => (
              <div key={field.key}>
                <label className="block text-sm text-[#232422]/80 mb-2">{field.label}</label>
                <input
                  type="text"
                  value={adjustments[field.key]}
                  onChange={(e) => {
                    const value = e.target.value;
                    setAdjustments((current) => ({ ...current, [field.key]: value }));
                  }}
                  placeholder={field.placeholder}
                  className="w-full px-4 py-3 bg-[#F5F1EC] rounded-2xl text-sm text-[#232422] focus:outline-none focus:ring-2 focus:ring-[#FFDC6A]"
                />
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                void runSimulation();
              }}
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-[#FFDC6A] to-[#FF8D7C] text-[#232422] rounded-full font-medium hover:opacity-90 disabled:opacity-60 transition-opacity inline-flex items-center gap-2"
            >
              {loading ? <span className="w-4 h-4 border-2 border-[#232422] border-t-transparent rounded-full animate-spin" /> : null}
              {loading ? 'Running...' : 'Run simulation'}
            </button>
            <button
              type="button"
              onClick={() => {
                setAdjustments(INITIAL_ADJUSTMENTS);
                setResult(null);
                setErrorMessage(null);
              }}
              className="px-5 py-3 bg-[#232422] text-[#FEFEFE] rounded-full font-medium hover:opacity-90 transition-opacity"
            >
              Reset
            </button>
          </div>

          {errorMessage && (
            <div className="mt-4 px-4 py-3 rounded-2xl bg-[#FDE7E7] text-[#7F1D1D] text-sm">
              {errorMessage}
            </div>
          )}
        </div>

        <div className="col-span-6 space-y-6">
          <div className="bg-[#24262E] rounded-3xl p-6">
            <div className="text-sm uppercase tracking-[0.18em] text-[#FEFEFE]/45 mb-3">Predicted Change</div>
            {result ? (
              <div>
                <div className="text-5xl font-light text-[#FFDC6A]">{changeDisplay}</div>
                <div className="mt-4">{changeIndicator}</div>
                <div className="mt-5 grid grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-[#FEFEFE]/10 px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.14em] text-[#FEFEFE]/45">Baseline</div>
                    <div className="text-lg text-[#FEFEFE] mt-2">{result.baseline.resistanceScore.toFixed(3)}</div>
                  </div>
                  <div className="rounded-2xl bg-[#FEFEFE]/10 px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.14em] text-[#FEFEFE]/45">Modified</div>
                    <div className="text-lg text-[#FEFEFE] mt-2">{result.modified.resistanceScore.toFixed(3)}</div>
                  </div>
                  <div className="rounded-2xl bg-[#FEFEFE]/10 px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.14em] text-[#FEFEFE]/45">Percent Change</div>
                    <div className="text-lg text-[#FEFEFE] mt-2">{changeDisplay}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="text-5xl font-light text-[#FFDC6A]">No simulation yet</div>
                <p className="mt-4 text-[#FEFEFE]/60">
                  Run a descriptor scenario to estimate whether the change is likely to improve or degrade predicted fire resistance.
                </p>
              </div>
            )}
          </div>

          <div className="bg-[#FEFEFE] rounded-3xl p-6">
            <h3 className="text-xl font-light text-[#232422] mb-4">Simulation Results</h3>

            {result ? (
              <div className="space-y-4">
                <div className="rounded-2xl bg-[#F5F1EC] px-4 py-4">
                  <div className="text-sm text-[#232422]/60">Baseline Resistance</div>
                  <div className="text-3xl font-light text-[#232422] mt-1">
                    {result.baseline.resistanceScore.toFixed(3)}
                  </div>
                  <div className="text-sm text-[#232422]/55 mt-1">
                    Confidence {result.baseline.confidence}
                  </div>
                </div>

                <div className="rounded-2xl bg-[#F5F1EC] px-4 py-4">
                  <div className="text-sm text-[#232422]/60">Modified Resistance</div>
                  <div className="text-3xl font-light text-[#232422] mt-1">
                    {result.modified.resistanceScore.toFixed(3)}
                  </div>
                  <div className="text-sm text-[#232422]/55 mt-1">
                    Confidence {result.modified.confidence}
                  </div>
                </div>

                <div className="rounded-2xl bg-[#FFF7E2] px-4 py-4">
                  <div className="text-sm text-[#6B4E00]/70">Change</div>
                  <div className="text-3xl font-light text-[#6B4E00] mt-1">
                    {changeDisplay}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-[#F5F1EC] px-4 py-10 text-center text-[#232422]/55">
                Select a base material, enter one or more adjustments, and run a simulation.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default MaterialSimulation;
