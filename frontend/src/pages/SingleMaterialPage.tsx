import { AlertTriangle, BarChart3, Flame, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { demoProfiles } from '../demoProfiles';
import { ApiError, getCoatings, getMaterials, predict } from '../lib/api';
import { designSystem } from '../theme/designSystem';
import type {
  ManualPredictionPayload,
  PredictionRequest,
  PredictionResponse,
} from '../types';
import { USE_CASES } from '../useCases';

type InputMode = 'lookup' | 'manual';

type FormState = {
  material_name: string;
  coating_code: string;
  use_case: string;
  Density_g_cc: string;
  Melting_Point_C: string;
  Specific_Heat_J_g_C: string;
  Thermal_Cond_W_mK: string;
  CTE_um_m_C: string;
  Flash_Point_C: string;
  Autoignition_Temp_C: string;
  UL94_Flammability: string;
  Limiting_Oxygen_Index_pct: string;
  Smoke_Density_Ds: string;
  Char_Yield_pct: string;
  Decomp_Temp_C: string;
  Heat_of_Combustion_MJ_kg: string;
  Flame_Spread_Index: string;
};

const INITIAL_FORM: FormState = {
  material_name: '',
  coating_code: '',
  use_case: USE_CASES[0],
  Density_g_cc: '1.25',
  Melting_Point_C: '220',
  Specific_Heat_J_g_C: '1.5',
  Thermal_Cond_W_mK: '0.21',
  CTE_um_m_C: '95',
  Flash_Point_C: '320',
  Autoignition_Temp_C: '450',
  UL94_Flammability: '1',
  Limiting_Oxygen_Index_pct: '19',
  Smoke_Density_Ds: '120',
  Char_Yield_pct: '12',
  Decomp_Temp_C: '300',
  Heat_of_Combustion_MJ_kg: '28',
  Flame_Spread_Index: '40',
};

const NUMERIC_FIELDS: Array<{ key: keyof ManualPredictionPayload; label: string; unit: string }> = [
  { key: 'Density_g_cc', label: 'Density', unit: 'g/cc' },
  { key: 'Melting_Point_C', label: 'Melting Point', unit: '°C' },
  { key: 'Specific_Heat_J_g_C', label: 'Specific Heat', unit: 'J/g-°C' },
  { key: 'Thermal_Cond_W_mK', label: 'Thermal Conductivity', unit: 'W/m-K' },
  { key: 'CTE_um_m_C', label: 'CTE', unit: 'µm/m-°C' },
  { key: 'Flash_Point_C', label: 'Flash Point', unit: '°C' },
  { key: 'Autoignition_Temp_C', label: 'Autoignition Temp', unit: '°C' },
  { key: 'UL94_Flammability', label: 'UL94 Flammability', unit: 'rating' },
  { key: 'Limiting_Oxygen_Index_pct', label: 'LOI', unit: '%' },
  { key: 'Smoke_Density_Ds', label: 'Smoke Density', unit: 'Ds' },
  { key: 'Char_Yield_pct', label: 'Char Yield', unit: '%' },
  { key: 'Decomp_Temp_C', label: 'Decomposition Temp', unit: '°C' },
  { key: 'Heat_of_Combustion_MJ_kg', label: 'Heat of Combustion', unit: 'MJ/kg' },
  { key: 'Flame_Spread_Index', label: 'Flame Spread Index', unit: 'index' },
];

function buildPayload(form: FormState, inputMode: InputMode): PredictionRequest {
  const use_case = form.use_case.trim();
  if (inputMode === 'lookup' && form.material_name.trim()) {
    return {
      material_name: form.material_name.trim(),
      coating_code: form.coating_code.trim() || undefined,
      use_case: use_case || undefined,
    };
  }

  const numericPayload: Record<string, number> = {};
  for (const field of NUMERIC_FIELDS) {
    const raw = form[field.key].trim();
    const parsed = Number.parseFloat(raw);
    if (Number.isNaN(parsed)) {
      throw new Error(`Invalid ${field.label}`);
    }
    numericPayload[field.key] = parsed;
  }

  return {
    ...(numericPayload as unknown as ManualPredictionPayload),
    coating_code: form.coating_code.trim() || undefined,
    use_case: use_case || undefined,
  };
}

function applyDemo(payload: PredictionRequest, current: FormState): FormState {
  const next = { ...current };
  if ('material_name' in payload) {
    next.material_name = payload.material_name;
    next.coating_code = payload.coating_code ?? '';
    next.use_case = payload.use_case ?? next.use_case;
    return next;
  }
  for (const field of NUMERIC_FIELDS) {
    next[field.key] = String(payload[field.key]);
  }
  next.coating_code = payload.coating_code ?? '';
  next.use_case = payload.use_case ?? next.use_case;
  return next;
}

function SingleMaterialPage() {
  const [inputMode, setInputMode] = useState<InputMode>('lookup');
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [materials, setMaterials] = useState<string[]>([]);
  const [coatings, setCoatings] = useState<string[]>([]);
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [materialsRes, coatingsRes] = await Promise.allSettled([
        getMaterials(),
        getCoatings(),
      ]);
      if (materialsRes.status === 'fulfilled') {
        setMaterials(materialsRes.value.materials ?? []);
      }
      if (coatingsRes.status === 'fulfilled') {
        setCoatings(coatingsRes.value.coatings ?? []);
      }
    })();
  }, []);

  const runPrediction = async (overridePayload?: PredictionRequest) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const payload = overridePayload ?? buildPayload(form, inputMode);
      const response = await predict(payload);
      setResult(response);
    } catch (error) {
      if (error instanceof ApiError || error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Prediction failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const topDrivers = useMemo(() => result?.top_drivers ?? [], [result]);

  return (
    <div className="space-y-6">
      <section className="dravix-hero rounded-[2rem] border px-8 py-9 text-white" style={{ borderColor: designSystem.backgroundColors.border }}>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-3xl">
            <div className="text-xs uppercase tracking-[0.24em] text-white/62">Single Material Screening</div>
            <h1 className="mt-3 text-4xl font-light">Screen one candidate material with live Dravix inference.</h1>
            <p className="mt-4 text-base leading-7 text-white/78">
              Use material lookup or manual descriptors, then review the fire-risk proxy, confidence,
              top drivers, plain-language explanation, and limitations notice.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-white/8 px-5 py-4 text-sm">
            <div className="text-white/62">Workflow context</div>
            <div className="mt-1 text-[#ffd88c]">{form.use_case}</div>
          </div>
        </div>
      </section>

      {errorMessage ? (
        <div className="rounded-2xl border border-[#cc8b60]/30 bg-[#fff1e8] px-4 py-3 text-sm text-[#8b3f14]">
          {errorMessage}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.05fr_1fr]">
        <div className="dravix-card space-y-6 rounded-[2rem] p-7">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setInputMode('lookup')}
              className={`rounded-full px-4 py-2 text-sm ${inputMode === 'lookup' ? 'text-[#232422]' : 'bg-[#F5F1EC] text-[#4b3928]'}`}
              style={inputMode === 'lookup' ? { background: designSystem.primaryGradient } : undefined}
            >
              Lookup mode
            </button>
            <button
              type="button"
              onClick={() => setInputMode('manual')}
              className={`rounded-full px-4 py-2 text-sm ${inputMode === 'manual' ? 'text-[#232422]' : 'bg-[#F5F1EC] text-[#4b3928]'}`}
              style={inputMode === 'manual' ? { background: designSystem.primaryGradient } : undefined}
            >
              Manual mode
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-[#5f5042]">Use case</label>
              <select
                value={form.use_case}
                onChange={(event) => setForm((current) => ({ ...current, use_case: event.target.value }))}
                className="w-full rounded-2xl border px-4 py-3 text-sm text-[#231a14] outline-none dravix-panel"
              >
                {USE_CASES.map((useCase) => (
                  <option key={useCase} value={useCase}>{useCase}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-[#5f5042]">Optional coating</label>
              <select
                value={form.coating_code}
                onChange={(event) => setForm((current) => ({ ...current, coating_code: event.target.value }))}
                className="w-full rounded-2xl border px-4 py-3 text-sm text-[#231a14] outline-none dravix-panel"
              >
                <option value="">No coating</option>
                {coatings.map((coating) => (
                  <option key={coating} value={coating}>{coating}</option>
                ))}
              </select>
            </div>
          </div>

          {inputMode === 'lookup' ? (
            <div>
              <label className="mb-2 block text-sm text-[#5f5042]">Material</label>
              <select
                value={form.material_name}
                onChange={(event) => setForm((current) => ({ ...current, material_name: event.target.value }))}
                className="w-full rounded-2xl border px-4 py-3 text-sm text-[#231a14] outline-none dravix-panel"
              >
                <option value="">Select a material</option>
                {materials.map((material) => (
                  <option key={material} value={material}>{material}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {NUMERIC_FIELDS.map((field) => (
                <label key={field.key} className="dravix-panel block rounded-[1.5rem] px-4 py-4">
                  <span className="block text-sm text-[#5f5042]">{field.label}</span>
                  <input
                    type="number"
                    value={form[field.key]}
                    onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
                    className="mt-3 w-full bg-transparent text-lg text-[#231a14] outline-none"
                  />
                  <span className="text-xs text-[#8a7562]">{field.unit}</span>
                </label>
              ))}
            </div>
          )}

          <div>
            <div className="mb-3 text-sm text-[#5f5042]">Quick demo profiles</div>
            <div className="grid gap-3 md:grid-cols-3">
              {demoProfiles.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => {
                    setInputMode(profile.mode);
                    const nextForm = applyDemo(profile.payload, form);
                    setForm(nextForm);
                    void runPrediction({ ...profile.payload, use_case: nextForm.use_case });
                  }}
                  className="dravix-panel rounded-[1.25rem] px-4 py-4 text-left text-sm text-[#231a14] transition hover:bg-[#D0C7B5]"
                >
                  <div className="font-medium">{profile.label}</div>
                  <div className="mt-1 text-xs text-[#6b5949]">{profile.subtitle}</div>
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => { void runPrediction(); }}
            disabled={loading}
            className="dravix-button-primary inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition hover:opacity-90 disabled:opacity-60"
          >
            <Flame className="h-4 w-4" />
            {loading ? 'Running screening...' : 'Run Dravix screening'}
          </button>
        </div>

          <div className="space-y-6">
          <div className="dravix-panel rounded-[2rem] p-7">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-[#8b4b1b]">Screening output</div>
                <h2 className="mt-2 text-2xl font-light text-[#231a14]">{result?.material_name ?? 'No material screened yet'}</h2>
              </div>
              <div className="rounded-full px-4 py-2 text-sm text-[#232422]" style={{ background: designSystem.primaryGradient }}>
                {result?.confidence.label ?? 'Waiting'}
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="dravix-card rounded-[1.5rem] px-5 py-5">
                <div className="text-sm text-[#7c6857]">Risk score</div>
                <div className="mt-2 text-5xl font-light text-[#231a14]">
                  {result ? result.risk_score.toFixed(1) : '--'}
                </div>
                <div className="mt-2 text-sm text-[#5f5042]">Lower is better for shortlist prioritization.</div>
              </div>
              <div className="dravix-card rounded-[1.5rem] px-5 py-5">
                <div className="text-sm text-[#7c6857]">Resistance index</div>
                <div className="mt-2 text-5xl font-light text-[#231a14]">
                  {result ? result.resistance_index.toFixed(1) : '--'}
                </div>
                <div className="mt-2 text-sm text-[#5f5042]">Higher suggests stronger fire resistance proxy.</div>
              </div>
            </div>

            <p className="mt-6 text-sm leading-7 text-[#4b3928]">
              {result?.explanation ?? 'Run a live screening to view model-backed explanation text.'}
            </p>
          </div>

          <div className="dravix-card rounded-[2rem] p-7">
            <div className="mb-4 flex items-center gap-3">
              <BarChart3 className="h-5 w-5" style={{ color: designSystem.backgroundColors.accentCoral }} />
              <h3 className="text-xl font-light text-[#231a14]">Top Drivers of Fire Risk</h3>
            </div>
            <div className="space-y-4">
              {topDrivers.length > 0 ? topDrivers.map((driver) => {
                const positive = driver.direction === 'increases_resistance';
                return (
                  <div key={`${driver.feature}-${driver.contribution}`} className="dravix-panel rounded-[1.5rem] px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm text-[#231a14]">{driver.feature}</div>
                      <div className={`text-sm ${positive ? 'text-[#2b7a45]' : 'text-[#b14c2d]'}`}>
                        {positive ? 'supports lower risk' : 'increases risk'}
                      </div>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                      <div
                        className={`h-full rounded-full ${positive ? 'bg-[#4ca867]' : 'bg-[#d97950]'}`}
                        style={{ width: `${Math.min(100, Math.abs(driver.abs_magnitude) * 1000)}%` }}
                      />
                    </div>
                  </div>
                );
              }) : (
                <div className="dravix-panel rounded-[1.5rem] px-4 py-6 text-sm text-[#6b5949]">
                  No interpretability output yet.
                </div>
              )}
            </div>
          </div>

          <div className="dravix-card rounded-[2rem] p-7">
            <div className="mb-4 flex items-center gap-3">
              <ShieldCheck className="h-5 w-5" style={{ color: designSystem.backgroundColors.accentCoral }} />
              <h3 className="text-xl font-light text-[#231a14]">Decision notes</h3>
            </div>
            <div className="space-y-3">
              {(result?.notes ?? ['Use case framing, confidence, and driver notes will appear here.']).map((note) => (
                <div key={note} className="dravix-panel rounded-[1.25rem] px-4 py-3 text-sm text-[#4b3928]">
                  {note}
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-[1.5rem] border border-[#cc8b60]/20 bg-[#fff3e8] px-4 py-4 text-sm leading-6 text-[#8b3f14]">
              <div className="mb-2 flex items-center gap-2 font-medium">
                <AlertTriangle className="h-4 w-4" />
                Limitations notice
              </div>
              {result?.limitations_notice ?? 'Dravix is intended for screening and prioritization, not certification.'}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default SingleMaterialPage;
