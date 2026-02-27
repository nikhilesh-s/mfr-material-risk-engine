import {
  Activity,
  BarChart3,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Flame,
  LogOut,
  Microscope,
  Shield,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import chemistryIcon from './assets/chemistry-svgrepo-com.svg';
import { demoProfiles } from './demoProfiles';
import { ApiError, getHealth, getMaterials, getVersion, predict } from './lib/api';
import type {
  ApiErrorDetail,
  HealthInfo,
  LookupPredictionPayload,
  ManualPredictionPayload,
  PredictionRequest,
  PredictionResponse,
  VersionInfo,
} from './types';

type ViewMode = 'results' | 'home' | 'inputs' | 'methodology';
type InputMode = 'lookup' | 'manual';

type FormState = {
  material_name: string;
  coating_code: string;
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
  material_name: 'Polyethylene (HDPE)',
  coating_code: '',
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

const THERMAL_FIELDS: Array<{ label: string; key: keyof FormState; unit: string }> = [
  { label: 'Melting Point', key: 'Melting_Point_C', unit: '°C' },
  { label: 'Decomposition Temperature', key: 'Decomp_Temp_C', unit: '°C' },
  { label: 'Heat of Combustion', key: 'Heat_of_Combustion_MJ_kg', unit: 'MJ/kg' },
  { label: 'Autoignition Temperature', key: 'Autoignition_Temp_C', unit: '°C' },
  { label: 'Flash Point', key: 'Flash_Point_C', unit: '°C' },
  { label: 'Limiting Oxygen Index', key: 'Limiting_Oxygen_Index_pct', unit: '%' },
  { label: 'Char Yield', key: 'Char_Yield_pct', unit: '%' },
  { label: 'Flame Spread Index', key: 'Flame_Spread_Index', unit: '' },
  { label: 'Smoke Density', key: 'Smoke_Density_Ds', unit: 'Ds' },
];

const PHYSICAL_FIELDS: Array<{ label: string; key: keyof FormState; unit: string }> = [
  { label: 'Thermal Conductivity', key: 'Thermal_Cond_W_mK', unit: 'W/(m·K)' },
  { label: 'Density', key: 'Density_g_cc', unit: 'g/cc' },
  { label: 'Specific Heat', key: 'Specific_Heat_J_g_C', unit: 'J/(g·°C)' },
  { label: 'Coefficient of Thermal Expansion', key: 'CTE_um_m_C', unit: 'μm/(m·°C)' },
  { label: 'UL94 Flammability Rating', key: 'UL94_Flammability', unit: '' },
];

type ManualNumericKey = Exclude<keyof ManualPredictionPayload, 'coating_code'>;

const REQUIRED_NUMERIC_KEYS: Array<ManualNumericKey> = [
  'Density_g_cc',
  'Melting_Point_C',
  'Specific_Heat_J_g_C',
  'Thermal_Cond_W_mK',
  'CTE_um_m_C',
  'Flash_Point_C',
  'Autoignition_Temp_C',
  'UL94_Flammability',
  'Limiting_Oxygen_Index_pct',
  'Smoke_Density_Ds',
  'Char_Yield_pct',
  'Decomp_Temp_C',
  'Heat_of_Combustion_MJ_kg',
  'Flame_Spread_Index',
];

const REQUIRED_PASSWORD = import.meta.env.VITE_APP_PASSWORD;

function isLookupPayload(payload: PredictionRequest): payload is LookupPredictionPayload {
  return 'material_name' in payload;
}

function toPercent(value: number | null | undefined): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, value * 100));
}

function prettyFeatureName(raw: string): string {
  return raw.split('_').join(' ');
}

function parse422Message(payload: unknown): string {
  const detail = (payload as { detail?: unknown })?.detail;
  if (!Array.isArray(detail)) {
    return 'Invalid input. Please review required fields.';
  }
  const fields = new Set<string>();
  const messages: string[] = [];
  for (const item of detail) {
    const row = item as ApiErrorDetail;
    if (Array.isArray(row.loc) && row.loc.length > 0) {
      const field = row.loc[row.loc.length - 1];
      if (typeof field === 'string' && field !== 'body') {
        fields.add(field);
      }
    }
    if (row.msg) {
      messages.push(row.msg);
    }
  }
  if (fields.size > 0) {
    return `Missing or invalid fields: ${Array.from(fields).join(', ')}`;
  }
  if (messages.length > 0) {
    return messages.join('; ');
  }
  return 'Invalid input. Please review required fields.';
}

function toFormStateFromPayload(payload: PredictionRequest, current: FormState): FormState {
  const next: FormState = { ...current };
  if (isLookupPayload(payload)) {
    next.material_name = payload.material_name;
    next.coating_code = payload.coating_code ?? '';
    return next;
  }
  for (const key of REQUIRED_NUMERIC_KEYS) {
    next[key] = String(payload[key]);
  }
  next.coating_code = payload.coating_code ?? '';
  return next;
}

function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('results');
  const [isExpanded, setIsExpanded] = useState(true);
  const [inputMode, setInputMode] = useState<InputMode>('manual');
  const [formData, setFormData] = useState<FormState>(INITIAL_FORM);

  const [materials, setMaterials] = useState<string[]>([]);
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [version, setVersion] = useState<VersionInfo | null>(null);
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [showInitializing, setShowInitializing] = useState(true);
  const [startupMessage, setStartupMessage] = useState<string>('Checking backend health...');
  const [healthWarning, setHealthWarning] = useState<string | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [interpretabilityNotice, setInterpretabilityNotice] = useState<string | null>(null);
  const [lastSubmissionSummary, setLastSubmissionSummary] = useState<string>('No prediction yet');

  const refreshSystemState = async () => {
    setIsBootstrapping(true);
    setShowInitializing(true);
    setStartupMessage('Checking backend health...');
    setHealthWarning(null);
    setHealthError(null);

    let healthSoftTimedOut = false;
    const healthSoftTimeoutId = window.setTimeout(() => {
      healthSoftTimedOut = true;
      setIsBootstrapping(false);
      setShowInitializing(false);
      setHealthWarning('Health check is taking longer than expected. You can continue and retry.');
    }, 8000);

    const [healthRes, versionRes, materialsRes] = await Promise.allSettled([
      getHealth(),
      getVersion(),
      getMaterials(),
    ]);
    window.clearTimeout(healthSoftTimeoutId);

    if (healthRes.status === 'fulfilled') {
      const data = healthRes.value;
      setHealth(data);
      if (!data || data.status !== 'ok') {
        setShowInitializing(true);
        setStartupMessage('System initializing');
        setHealthError('Health check returned non-ready status.');
      } else {
        setShowInitializing(false);
        setHealthError(null);
        setHealthWarning(null);
      }
    } else {
      setHealth(null);
      setHealthError('Unable to reach backend health endpoint. Please retry.');
      setStartupMessage('Health check failed.');
      if (!healthSoftTimedOut) {
        setShowInitializing(true);
      }
    }

    if (versionRes.status === 'fulfilled') {
      setVersion(versionRes.value);
    }

    if (materialsRes.status === 'fulfilled') {
      setMaterials(materialsRes.value.materials ?? []);
    }
    setIsBootstrapping(false);
  };

  useEffect(() => {
    void refreshSystemState();
  }, []);

  const handleLogin = () => {
    if (REQUIRED_PASSWORD && passwordInput === REQUIRED_PASSWORD) {
      setAuthenticated(true);
      setAuthError(null);
      setPasswordInput('');
      return;
    }
    setAuthError('Invalid credentials');
  };

  const handleLogout = () => {
    setAuthenticated(false);
    setAuthError(null);
    setPasswordInput('');
  };

  const handleInputChange = (key: keyof FormState, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const buildPayloadFromForm = (): PredictionRequest => {
    const coatingCode = formData.coating_code.trim();

    if (inputMode === 'lookup') {
      const materialName = formData.material_name.trim();
      if (!materialName) {
        throw new Error('Please provide a material name for lookup mode.');
      }
      return {
        material_name: materialName,
        ...(coatingCode ? { coating_code: coatingCode } : {}),
      };
    }

    const missing: string[] = [];
    const payload: Partial<Record<ManualNumericKey, number>> = {};

    for (const key of REQUIRED_NUMERIC_KEYS) {
      const parsed = Number.parseFloat(formData[key]);
      if (Number.isNaN(parsed)) {
        missing.push(key);
      } else {
        payload[key] = parsed;
      }
    }

    if (missing.length > 0) {
      throw new Error(`Missing or invalid fields: ${missing.join(', ')}`);
    }

    return {
      ...(payload as ManualPredictionPayload),
      ...(coatingCode ? { coating_code: coatingCode } : {}),
    };
  };

  const summarizePayload = (payload: PredictionRequest): string => {
    if (isLookupPayload(payload)) {
      return payload.coating_code
        ? `${payload.material_name} with ${payload.coating_code}`
        : payload.material_name;
    }
    return payload.coating_code ? `Manual descriptors with ${payload.coating_code}` : 'Manual descriptors';
  };

  const runPrediction = async (overridePayload?: PredictionRequest) => {
    setLoading(true);
    setErrorMessage(null);
    setInterpretabilityNotice(null);

    try {
      const payload = overridePayload ?? buildPayloadFromForm();
      const prediction = await predict(payload);
      setResult(prediction);
      setLastSubmissionSummary(summarizePayload(payload));
      setCurrentView('results');

      if (prediction.interpretability.error) {
        setInterpretabilityNotice(
          `Interpretability fallback in use: ${prediction.interpretability.error.message}`,
        );
      }
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 'TIMEOUT' || error.status === 408) {
          setErrorMessage('Backend timeout — retry');
        } else if (error.status === 404) {
          setErrorMessage('Material not found in database');
        } else if (error.status === 422) {
          setErrorMessage(parse422Message(error.payload));
        } else {
          setErrorMessage(error.message);
        }
      } else if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Prediction failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoClick = (profileId: string) => {
    const profile = demoProfiles.find((item) => item.id === profileId);
    if (!profile) {
      return;
    }
    setInputMode(profile.mode);
    setFormData((prev) => toFormStateFromPayload(profile.payload, prev));
    void runPrediction(profile.payload);
  };

  const effectiveResistancePercent = toPercent(result?.effectiveResistance);
  const resistanceScorePercent = toPercent(result?.resistanceScore);
  const coatingModifierPercent = result?.coatingModifier == null ? null : result.coatingModifier * 100;

  const topDrivers = result?.interpretability.top_3_drivers ?? [];
  const maxDriverMagnitude = Math.max(
    1e-12,
    ...topDrivers.map((driver) => Math.max(Math.abs(driver.abs_magnitude), 1e-12)),
  );

  const contributionRows = useMemo(() => {
    if (!result?.interpretability.feature_contributions) {
      return [];
    }
    const displayNames = result.interpretability.display_names ?? {};
    return Object.entries(result.interpretability.feature_contributions)
      .map(([feature, contribution]) => {
        const absMagnitude = Math.abs(contribution);
        return {
          feature,
          displayName: displayNames[feature] ?? prettyFeatureName(feature),
          contribution,
          absMagnitude,
          direction: contribution >= 0 ? 'increases_resistance' : 'decreases_resistance',
        };
      })
      .sort((a, b) => b.absMagnitude - a.absMagnitude);
  }, [result]);

  if ((isBootstrapping && showInitializing) || showInitializing) {
    return (
      <div className="min-h-screen bg-[#F5F1EC] flex items-center justify-center p-8">
        <div className="max-w-xl w-full bg-[#FEFEFE] rounded-3xl shadow-sm p-10 text-center">
          <div className="w-14 h-14 mx-auto rounded-full border-4 border-[#FFDC6A] border-t-transparent animate-spin" />
          <h1 className="text-3xl font-light text-[#232422] mt-6">System initializing</h1>
          <p className="text-[#232422]/60 mt-3">
            {startupMessage}
          </p>
          {healthError && (
            <p className="text-sm text-[#7F1D1D] mt-3">{healthError}</p>
          )}
          <p className="text-sm text-[#232422]/50 mt-4">
            Dataset: {health?.dataset_version ?? version?.dataset_version ?? 'unknown'}
          </p>
          {!isBootstrapping && (
            <button
              onClick={() => {
                void refreshSystemState();
              }}
              className="mt-6 px-6 py-2 bg-[#232422] text-[#FEFEFE] rounded-full text-sm hover:opacity-90 transition-opacity"
            >
              Retry health check
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#F5F1EC] flex items-center justify-center p-8">
        <div className="max-w-xl w-full bg-[#FEFEFE] rounded-3xl shadow-sm p-10 text-center">
          <h1 className="text-5xl font-light text-[#232422]">Dravix</h1>
          <p className="text-[#232422]/60 mt-3">Phase 3 Research Platform</p>
          <div className="mt-8 space-y-4">
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => {
                setPasswordInput(e.target.value);
                if (authError) {
                  setAuthError(null);
                }
              }}
              placeholder="Enter access password"
              className="w-full px-4 py-3 bg-[#F5F1EC] rounded-xl text-sm text-[#232422] focus:outline-none focus:ring-2 focus:ring-[#FFDC6A]"
            />
            {authError && (
              <p className="text-sm text-[#7F1D1D]">{authError}</p>
            )}
            <button
              onClick={handleLogin}
              className="w-full px-6 py-3 bg-gradient-to-r from-[#FFDC6A] to-[#FF8D7C] text-[#232422] rounded-full font-medium hover:opacity-90 transition-opacity"
            >
              Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F1EC] flex">
      <aside className="w-20 bg-[#FEFEFE] flex flex-col items-center py-8 gap-8 rounded-r-3xl shadow-sm">
        <button
          onClick={() => setCurrentView('home')}
          className="w-12 h-12 bg-[#232422] rounded-2xl flex items-center justify-center hover:opacity-90 transition-opacity"
        >
          <img src={chemistryIcon} alt="Dravix" className="w-6 h-6" />
        </button>

        <nav className="flex flex-col gap-6 mt-8">
          <button
            onClick={() => setCurrentView('inputs')}
            className={`w-12 h-12 rounded-xl transition-colors flex items-center justify-center group ${
              currentView === 'inputs' ? 'bg-[#F5F1EC]' : 'hover:bg-[#F5F1EC]'
            }`}
          >
            <img
              src={chemistryIcon}
              alt="Chemistry"
              className={`w-5 h-5 ${
                currentView === 'inputs' ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'
              }`}
              style={{
                filter:
                  currentView === 'inputs'
                    ? 'invert(48%) sepia(89%) saturate(614%) hue-rotate(313deg) brightness(102%) contrast(101%)'
                    : '',
              }}
            />
          </button>
          <button
            onClick={() => setCurrentView('results')}
            className={`w-12 h-12 rounded-xl transition-colors flex items-center justify-center group ${
              currentView === 'results' ? 'bg-[#F5F1EC]' : 'hover:bg-[#F5F1EC]'
            }`}
          >
            <BarChart3
              className={`w-5 h-5 ${
                currentView === 'results' ? 'text-[#FF8D7C]' : 'text-[#232422] group-hover:text-[#FF8D7C]'
              }`}
            />
          </button>
          <button
            onClick={() => setCurrentView('methodology')}
            className={`w-12 h-12 rounded-xl transition-colors flex items-center justify-center group ${
              currentView === 'methodology' ? 'bg-[#F5F1EC]' : 'hover:bg-[#F5F1EC]'
            }`}
            title="Methodology"
          >
            <BookOpen
              className={`w-5 h-5 ${
                currentView === 'methodology' ? 'text-[#FF8D7C]' : 'text-[#232422] group-hover:text-[#FF8D7C]'
              }`}
            />
          </button>
        </nav>
      </aside>

      <main className="flex-1 p-8">
        {healthWarning && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-[#FFF2D8] text-[#6B4E00] text-sm flex items-center justify-between">
            <span>{healthWarning}</span>
            <button
              onClick={() => {
                void refreshSystemState();
              }}
              className="ml-4 px-3 py-1 bg-[#232422] text-[#FEFEFE] rounded-full text-xs hover:opacity-90 transition-opacity"
            >
              Retry health check
            </button>
          </div>
        )}

        {healthError && !showInitializing && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-[#FDE7E7] text-[#7F1D1D] text-sm">
            {healthError}
          </div>
        )}

        <div className="flex justify-end mb-4 gap-2">
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs bg-[#232422] text-[#FEFEFE] hover:opacity-90 transition-opacity"
          >
            <LogOut className="w-3 h-3" />
            Logout
          </button>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs bg-[#232422] text-[#FEFEFE]">
            Phase 3 – Research Build
          </div>
          <div
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs ${
              health?.model_loaded ? 'bg-[#DDEED8] text-[#1C5E20]' : 'bg-[#F7E2E2] text-[#7F1D1D]'
            }`}
          >
            <Activity className="w-3 h-3" />
            <span>{health?.model_loaded ? 'Model Ready' : 'Model Not Ready'}</span>
            <span>•</span>
            <span>{health?.dataset_version ?? 'dataset unknown'}</span>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-[#FDE7E7] text-[#7F1D1D] text-sm">{errorMessage}</div>
        )}

        {currentView === 'home' ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <img src={chemistryIcon} alt="Dravix" className="w-32 h-32 mx-auto" />
              <h1 className="text-5xl font-light text-[#232422] mt-8">Dravix</h1>
              <p className="text-[#232422]/60 mt-4">Fire Risk Assessment Platform</p>
            </div>
          </div>
        ) : currentView === 'methodology' ? (
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#FF8D7C] rounded-xl flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-[#FEFEFE]" />
                </div>
                <h1 className="text-4xl font-light text-[#232422]">Methodology</h1>
              </div>
              <p className="text-[#232422]/60">Phase 3 research methodology and metadata reference</p>
            </div>

            <div className="bg-[#FEFEFE] rounded-3xl p-8 max-h-[72vh] overflow-y-auto space-y-8">
              <section>
                <h2 className="text-xl font-light text-[#232422] mb-2">A. Resistance Score</h2>
                <p className="text-[#232422]/70 leading-relaxed">
                  Resistance score is a relative predictive proxy derived from structured material descriptors.
                  It supports comparative screening across materials and coating conditions and is not a
                  regulatory certification outcome.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-light text-[#232422] mb-2">B. Confidence Score</h2>
                <p className="text-[#232422]/70 leading-relaxed">
                  Confidence is computed from tree-level variance characteristics relative to the training
                  variance distribution. High, Medium, and Low labels are derived from calibrated percentile
                  bands to provide uncertainty-aware inference context.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-light text-[#232422] mb-2">C. Interpretability</h2>
                <p className="text-[#232422]/70 leading-relaxed">
                  Interpretability is generated through tree-based contribution extraction and ranked into
                  `top_3_drivers` by absolute contribution magnitude. Positive contributions indicate increasing
                  resistance influence, while negative contributions indicate decreasing resistance influence.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-light text-[#232422] mb-3">D. Dataset Metadata</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="p-4 rounded-xl bg-[#F5F1EC]">
                    <div className="text-[#232422]/60">Dataset Version</div>
                    <div className="text-[#232422] mt-1">{version?.dataset_version ?? health?.dataset_version ?? 'Unknown'}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-[#F5F1EC]">
                    <div className="text-[#232422]/60">Feature Count</div>
                    <div className="text-[#232422] mt-1">
                      {(version as VersionInfo & { feature_count?: number } | null)?.feature_count ?? 'Not exposed by API'}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-[#F5F1EC]">
                    <div className="text-[#232422]/60">Target Column</div>
                    <div className="text-[#232422] mt-1">
                      {(version as VersionInfo & { target_column?: string } | null)?.target_column ?? 'Not exposed by API'}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-[#F5F1EC]">
                    <div className="text-[#232422]/60">Build Timestamp</div>
                    <div className="text-[#232422] mt-1">{version?.timestamp_utc ?? 'Unknown'}</div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        ) : currentView === 'inputs' ? (
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <img src={chemistryIcon} alt="Chemistry" className="w-10 h-10" />
                <h1 className="text-4xl font-light text-[#232422]">Material Properties Input</h1>
              </div>
              <p className="text-[#232422]/60">Enter material properties for fire risk assessment</p>
            </div>

            <div className="mb-6 bg-[#24262E] rounded-3xl p-6">
              <h3 className="text-sm font-medium text-[#FEFEFE] mb-4">Input Mode</h3>
              <div className="flex gap-3">
                <button
                  onClick={() => setInputMode('lookup')}
                  className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    inputMode === 'lookup'
                      ? 'bg-gradient-to-r from-[#FFDC6A] to-[#FF8D7C] text-[#232422]'
                      : 'bg-[#FEFEFE]/10 text-[#FEFEFE] hover:bg-[#FEFEFE]/20'
                  }`}
                >
                  Material Lookup
                </button>
                <button
                  onClick={() => setInputMode('manual')}
                  className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    inputMode === 'manual'
                      ? 'bg-gradient-to-r from-[#FFDC6A] to-[#FF8D7C] text-[#232422]'
                      : 'bg-[#FEFEFE]/10 text-[#FEFEFE] hover:bg-[#FEFEFE]/20'
                  }`}
                >
                  Manual Entry
                </button>
              </div>
            </div>

            {inputMode === 'lookup' ? (
              <div className="mb-6 bg-[#FEFEFE] rounded-3xl p-6">
                <h3 className="text-lg font-light text-[#232422] mb-4">Material Lookup</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-[#232422]/80 mb-2">Material Name</label>
                    <input
                      type="text"
                      value={formData.material_name}
                      onChange={(e) => handleInputChange('material_name', e.target.value)}
                      placeholder="e.g., Polyethylene (HDPE)"
                      list="material-options"
                      className="w-full px-4 py-2 bg-[#F5F1EC] rounded-xl text-sm text-[#232422] focus:outline-none focus:ring-2 focus:ring-[#FFDC6A]"
                    />
                    <datalist id="material-options">
                      {materials.map((material) => (
                        <option key={material} value={material} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-sm text-[#232422]/80 mb-2">Coating Code (Optional)</label>
                    <input
                      type="text"
                      value={formData.coating_code}
                      onChange={(e) => handleInputChange('coating_code', e.target.value)}
                      placeholder="e.g., 193-MAT-001"
                      className="w-full px-4 py-2 bg-[#F5F1EC] rounded-xl text-sm text-[#232422] focus:outline-none focus:ring-2 focus:ring-[#FFDC6A]"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-6 bg-[#FEFEFE] rounded-3xl p-8">
                  <h2 className="text-2xl font-light text-[#232422] mb-6">Thermal / Fire Behavior</h2>
                  <div className="space-y-4">
                    {THERMAL_FIELDS.map((field) => (
                      <div key={field.key} className="flex items-center gap-4">
                        <label className="flex-1 text-sm text-[#232422]/80">{field.label}</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={formData[field.key]}
                            onChange={(e) => handleInputChange(field.key, e.target.value)}
                            className="w-32 px-4 py-2 bg-[#F5F1EC] rounded-xl text-sm text-[#232422] text-right focus:outline-none focus:ring-2 focus:ring-[#FFDC6A]"
                          />
                          {field.unit && <span className="text-xs text-[#232422]/50 w-12">{field.unit}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="col-span-6 bg-[#FEFEFE] rounded-3xl p-8">
                  <h2 className="text-2xl font-light text-[#232422] mb-6">Physical Properties</h2>
                  <div className="space-y-4">
                    {PHYSICAL_FIELDS.map((field) => (
                      <div key={field.key} className="flex items-center gap-4">
                        <label className="flex-1 text-sm text-[#232422]/80">{field.label}</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={formData[field.key]}
                            onChange={(e) => handleInputChange(field.key, e.target.value)}
                            className="w-32 px-4 py-2 bg-[#F5F1EC] rounded-xl text-sm text-[#232422] text-right focus:outline-none focus:ring-2 focus:ring-[#FFDC6A]"
                          />
                          {field.unit && <span className="text-xs text-[#232422]/50 w-24">{field.unit}</span>}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 pt-8 border-t border-[#232422]/10">
                    <h3 className="text-lg font-light text-[#232422] mb-4">Optional Coating</h3>
                    <div className="flex items-center gap-4">
                      <label className="flex-1 text-sm text-[#232422]/80">Coating Code</label>
                      <input
                        type="text"
                        value={formData.coating_code}
                        onChange={(e) => handleInputChange('coating_code', e.target.value)}
                        className="w-40 px-4 py-2 bg-[#F5F1EC] rounded-xl text-sm text-[#232422] text-right focus:outline-none focus:ring-2 focus:ring-[#FFDC6A]"
                      />
                    </div>
                    <p className="text-xs text-[#232422]/50 mt-2">Leave empty for base material analysis only</p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 bg-[#FEFEFE] rounded-3xl p-6">
              <h3 className="text-sm font-medium text-[#232422] mb-4">Quick Load Demo Materials</h3>
              <div className="grid grid-cols-3 gap-3">
                {demoProfiles.map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => handleDemoClick(profile.id)}
                    disabled={loading}
                    className="px-4 py-3 bg-[#F5F1EC] hover:bg-[#D0C7B5] disabled:opacity-50 rounded-xl text-sm text-[#232422] transition-colors text-left"
                  >
                    <div className="font-medium">{profile.label}</div>
                    <div className="text-xs text-[#232422]/60 mt-1">{profile.subtitle}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 bg-[#24262E] rounded-3xl p-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-light text-[#FEFEFE] mb-2">Ready to Analyze</h3>
                  <p className="text-sm text-[#FEFEFE]/60">
                    {inputMode === 'lookup'
                      ? 'Lookup material and optional coating, then run'
                      : 'Manual descriptors entered, then run'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    void runPrediction();
                  }}
                  disabled={loading}
                  className="px-8 py-3 bg-gradient-to-r from-[#FFDC6A] to-[#FF8D7C] text-[#232422] rounded-full font-medium hover:opacity-90 disabled:opacity-60 transition-opacity inline-flex items-center gap-2"
                >
                  {loading ? <span className="w-4 h-4 border-2 border-[#232422] border-t-transparent rounded-full animate-spin" /> : null}
                  {loading ? 'Running...' : 'Run Fire Risk Assessment'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#FF8D7C] rounded-xl flex items-center justify-center">
                  <Flame className="w-5 h-5 text-[#FEFEFE]" />
                </div>
                <h1 className="text-4xl font-light text-[#232422]">Fire Risk Assessment</h1>
              </div>
              <p className="text-[#232422]/60">Material: {lastSubmissionSummary}</p>
            </div>

            {interpretabilityNotice && (
              <div className="mb-6 px-4 py-3 rounded-xl bg-[#FFF2D8] text-[#6B4E00] text-sm">{interpretabilityNotice}</div>
            )}

            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-8 bg-[#D0C7B5] rounded-3xl p-8 relative overflow-hidden min-h-[320px]">
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-light text-[#232422]">Effective Fire Resistance</h2>
                    <div className="px-4 py-2 bg-[#232422] text-[#FFDC6A] text-sm rounded-full font-medium">
                      {result?.confidence.label ?? 'N/A'} Confidence
                    </div>
                  </div>

                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-[#FFDC6A] to-[#FF8D7C] rounded-full blur-3xl opacity-40" />

                  <div className="relative mt-8">
                    <div className="text-8xl font-light text-[#232422] mb-4">{effectiveResistancePercent.toFixed(1)}</div>
                    <div className="text-[#232422]/60 text-lg mb-8">Effective Resistance (0-100 scale)</div>

                    <div className="flex items-center gap-4">
                      <div className="flex-1 h-3 bg-[#232422]/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#FFDC6A] to-[#FF8D7C] rounded-full"
                          style={{ width: `${effectiveResistancePercent}%` }}
                        />
                      </div>
                      <span className="text-sm text-[#232422]/70 font-medium">{result?.confidence.label ?? 'N/A'}</span>
                    </div>
                  </div>

                  <div className="flex gap-6 mt-8">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#FFDC6A]" />
                      <span className="text-sm text-[#232422]/70">Confidence: {(result?.confidence.score ?? 0).toFixed(3)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#FF8D7C]" />
                      <span className="text-sm text-[#232422]/70">
                        API: {version?.api_version ?? '0.3.0'} / Dataset: {result?.dataset.version ?? health?.dataset_version ?? 'unknown'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-span-4 bg-[#24262E] rounded-3xl p-6 min-h-[320px]">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-light text-[#FEFEFE]">Key Drivers</h3>
                  <span className="text-sm text-[#FEFEFE]/60">Top 3</span>
                </div>

                <div className="space-y-4">
                  {topDrivers.map((driver) => {
                    const width = (Math.abs(driver.abs_magnitude) / maxDriverMagnitude) * 100;
                    return (
                      <div key={driver.feature} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[#FEFEFE] truncate pr-2">{prettyFeatureName(driver.feature)}</span>
                          <span className="text-sm text-[#FFDC6A] font-medium">{driver.contribution.toFixed(6)}</span>
                        </div>
                        <div className="h-2 bg-[#FEFEFE]/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#FFDC6A] to-[#FF8D7C] rounded-full"
                            style={{ width: `${width}%` }}
                          />
                        </div>
                        <div className="text-xs text-[#FEFEFE]/60">{driver.direction}</div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 pt-6 border-t border-[#FEFEFE]/10">
                  <div className="text-xs text-[#FEFEFE]/60">Top contributors from tree-based local explanation</div>
                </div>
              </div>

              <div className="col-span-6 bg-[#FEFEFE] rounded-3xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#FFDC6A] to-[#FF8D7C] rounded-xl flex items-center justify-center">
                    <Shield className="w-5 h-5 text-[#FEFEFE]" />
                  </div>
                  <span className="text-xs text-[#232422]/40">Coating Applied</span>
                </div>
                <div className="text-4xl font-light text-[#232422] mb-1">
                  {coatingModifierPercent == null ? 'N/A' : `${coatingModifierPercent.toFixed(2)}%`}
                </div>
                <div className="text-sm text-[#232422]/60">Coating Modifier</div>
                <div className="mt-2 text-xs text-[#232422]/50">{formData.coating_code || 'No coating code'}</div>

                <div className="mt-4 h-1.5 bg-[#F5F1EC] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#FFDC6A] rounded-full"
                    style={{ width: `${Math.min(100, Math.abs(coatingModifierPercent ?? 0))}%` }}
                  />
                </div>
              </div>

              <div className="col-span-6 bg-[#FEFEFE] rounded-3xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#FFDC6A] to-[#FF8D7C] rounded-xl flex items-center justify-center">
                    <Microscope className="w-5 h-5 text-[#FEFEFE]" />
                  </div>
                  <span className="text-xs text-[#232422]/40">Base Material</span>
                </div>
                <div className="text-4xl font-light text-[#232422] mb-1">{resistanceScorePercent.toFixed(1)}</div>
                <div className="text-sm text-[#232422]/60">Base Resistance Score</div>
                <div className="mt-2 text-xs text-[#232422]/50">Without coating adjustment</div>

                <div className="mt-4 h-1.5 bg-[#F5F1EC] rounded-full overflow-hidden">
                  <div className="h-full bg-[#FF8D7C] rounded-full" style={{ width: `${resistanceScorePercent}%` }} />
                </div>
              </div>

              <div className="col-span-12 bg-[#FEFEFE] rounded-3xl p-8 relative overflow-hidden">
                <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-gradient-to-tl from-[#FFDC6A] to-[#FF8D7C] rounded-full blur-3xl opacity-20" />

                <div className="relative z-10">
                  <button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full flex items-center justify-between mb-6 group cursor-pointer"
                  >
                    <h3 className="text-xl font-light text-[#232422]">Complete Feature Contributions</h3>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-[#232422]/60">{contributionRows.length} features analyzed</span>
                      <div className="px-4 py-2 bg-[#232422] text-[#FEFEFE] text-sm rounded-full group-hover:bg-[#232422]/90 transition-colors flex items-center gap-2">
                        {isExpanded ? 'Collapse Contributions' : 'Expand Contributions'}
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="relative overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-[#232422]/60 border-b border-[#232422]/10">
                            <th className="py-2 pr-4">Feature</th>
                            <th className="py-2 pr-4">Contribution</th>
                            <th className="py-2 pr-4">Direction</th>
                            <th className="py-2 pr-4">Abs Magnitude</th>
                          </tr>
                        </thead>
                        <tbody>
                          {contributionRows.map((row) => (
                            <tr key={row.feature} className="border-b border-[#232422]/5">
                              <td className="py-2 pr-4 text-[#232422]">{row.displayName}</td>
                              <td className="py-2 pr-4 text-[#232422]">{row.contribution.toFixed(8)}</td>
                              <td className="py-2 pr-4 text-[#232422]/70">{row.direction}</td>
                              <td className="py-2 pr-4 text-[#232422]/70">{row.absMagnitude.toFixed(8)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <div className="mt-6 pt-6 border-t border-[#232422]/10">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[#232422]/60">Dataset Version</span>
                          <span className="text-[#232422] font-medium">{result?.dataset.version ?? health?.dataset_version ?? 'unknown'}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm mt-2">
                          <span className="text-[#232422]/60">API Version</span>
                          <span className="text-[#232422] font-medium">
                            {version?.api_version ?? '0.3.0'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm mt-2">
                          <span className="text-[#232422]/60">Build Hash</span>
                          <span className="text-[#232422] font-medium">
                            {version?.build_hash ?? 'unknown'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
