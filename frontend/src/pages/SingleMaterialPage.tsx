import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Flame,
  Microscope,
  Shield,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { demoProfiles } from '../demoProfiles';
import { ApiError, getCoatings, getHealth, getMaterials, getVersion, predict } from '../lib/api';
import type {
  ApiErrorDetail,
  HealthInfo,
  LookupPredictionPayload,
  ManualPredictionPayload,
  PredictionRequest,
  PredictionResponse,
  VersionInfo,
} from '../types';

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
  material_name: '',
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

function summarizePayload(payload: PredictionRequest): string {
  if (isLookupPayload(payload)) {
    return payload.coating_code
      ? `${payload.material_name} with ${payload.coating_code}`
      : payload.material_name;
  }
  return payload.coating_code ? 'Manual descriptors with coating' : 'Manual descriptors';
}

function SingleMaterialPage() {
  const [inputMode, setInputMode] = useState<InputMode>('manual');
  const [formData, setFormData] = useState<FormState>(INITIAL_FORM);

  const [materials, setMaterials] = useState<string[]>([]);
  const [coatings, setCoatings] = useState<string[]>([]);
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [version, setVersion] = useState<VersionInfo | null>(null);
  const [result, setResult] = useState<PredictionResponse | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [interpretabilityNotice, setInterpretabilityNotice] = useState<string | null>(null);
  const [materialsWarning, setMaterialsWarning] = useState<string | null>(null);
  const [coatingsWarning, setCoatingsWarning] = useState<string | null>(null);
  const [lastSubmissionSummary, setLastSubmissionSummary] = useState<string>('No prediction yet');
  const [lastPayload, setLastPayload] = useState<PredictionRequest | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    void (async () => {
      const [materialsRes, coatingsRes, healthRes, versionRes] = await Promise.allSettled([
        getMaterials(),
        getCoatings(),
        getHealth(),
        getVersion(),
      ]);

      if (materialsRes.status === 'fulfilled') {
        setMaterials(materialsRes.value.materials ?? []);
        setMaterialsWarning(null);
      } else {
        setMaterials([]);
        setMaterialsWarning('Material lookup is temporarily unavailable. Manual mode remains available.');
      }

      if (coatingsRes.status === 'fulfilled') {
        setCoatings(coatingsRes.value.coatings ?? []);
        setCoatingsWarning(null);
      } else {
        setCoatings([]);
        setCoatingsWarning('Coating lookup is temporarily unavailable.');
      }

      if (healthRes.status === 'fulfilled' && healthRes.value && typeof healthRes.value === 'object' && 'status' in healthRes.value) {
        const payload = healthRes.value as HealthInfo;
        setHealth(payload);
      }

      if (versionRes.status === 'fulfilled') {
        setVersion(versionRes.value);
      }
    })();
  }, []);

  const handleInputChange = (key: keyof FormState, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const buildPayloadFromForm = (): PredictionRequest => {
    const materialName = formData.material_name.trim();
    const coatingCode = formData.coating_code.trim();

    if (materialName) {
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

  const runPrediction = async (overridePayload?: PredictionRequest) => {
    setLoading(true);
    setErrorMessage(null);
    setInterpretabilityNotice(null);

    try {
      const payload = overridePayload ?? buildPayloadFromForm();
      const prediction = await predict(payload);
      setResult(prediction);
      setLastPayload(payload);
      setLastSubmissionSummary(summarizePayload(payload));

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

  const exportCsv = () => {
    if (!result) {
      return;
    }
    const material = lastPayload && isLookupPayload(lastPayload)
      ? lastPayload.material_name
      : 'Manual descriptors';
    const header = ['material', 'resistanceScore', 'confidence'];
    const row = [
      material,
      String(result.resistanceScore),
      result.confidence.label,
    ];
    const csvContent = [header, row].map((entry) => entry.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'dravix_single_material.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const effectiveResistancePercent = toPercent(result?.effectiveResistance);
  const resistanceScorePercent = toPercent(result?.resistanceScore);
  const coatingModifierPercent = result?.coatingModifier == null ? null : result.coatingModifier * 100;
  const hasMaterialSelection = formData.material_name.trim().length > 0;
  const showCoatingDropdown = !coatingsWarning;
  const interpretabilityDisplayNames = result?.interpretability.display_names ?? {};

  const topDrivers = useMemo(
    () => result?.interpretability.top_3_drivers ?? [],
    [result],
  );

  const explanationText = useMemo(() => {
    if (topDrivers.length === 0) {
      return 'The predicted fire-resistance profile is primarily influenced by available model descriptors.';
    }

    const driverNames = topDrivers.slice(0, 3).map((driver) => (
      interpretabilityDisplayNames[driver.feature] ?? prettyFeatureName(driver.feature)
    ));
    let driverList = driverNames[0];
    if (driverNames.length === 2) {
      driverList = `${driverNames[0]} and ${driverNames[1]}`;
    } else if (driverNames.length >= 3) {
      driverList = `${driverNames[0]}, ${driverNames[1]}, and ${driverNames[2]}`;
    }

    const topDriver = topDrivers[0];
    const topDriverDirection = topDriver.direction === 'increases_resistance' ? 'increasing' : 'decreasing';
    const topDriverName = interpretabilityDisplayNames[topDriver.feature] ?? prettyFeatureName(topDriver.feature);
    return `The predicted fire-resistance profile is primarily influenced by ${driverList}, with ${topDriverName} contributing most significantly in a ${topDriverDirection} direction.`;
  }, [interpretabilityDisplayNames, topDrivers]);

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

  return (
    <div className="max-w-7xl mx-auto">
      {errorMessage && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-[#FDE7E7] text-[#7F1D1D] text-sm">{errorMessage}</div>
      )}

      {materialsWarning && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-[#FFF2D8] text-[#6B4E00] text-sm">
          {materialsWarning}
        </div>
      )}

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Flame className="w-10 h-10 text-[#FF8D7C]" />
          <h1 className="text-4xl font-light text-[#232422]">Single Material Analysis</h1>
        </div>
        <p className="text-[#232422]/60">Material: {lastSubmissionSummary}</p>
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
              <select
                value={formData.material_name}
                onChange={(e) => {
                  const selectedMaterial = e.target.value;
                  handleInputChange('material_name', selectedMaterial);
                  if (selectedMaterial.trim()) {
                    setInputMode('lookup');
                  } else {
                    setInputMode('manual');
                  }
                }}
                disabled={materials.length === 0}
                className="w-full px-4 py-2 bg-[#F5F1EC] rounded-xl text-sm text-[#232422] focus:outline-none focus:ring-2 focus:ring-[#FFDC6A] disabled:opacity-50"
              >
                <option value="">Select material</option>
                {materials.map((material) => (
                  <option key={material} value={material}>
                    {material}
                  </option>
                ))}
              </select>
            </div>
            {showCoatingDropdown && (
              <div>
                <label className="block text-sm text-[#232422]/80 mb-2">Coating Code (Optional)</label>
                <select
                  value={formData.coating_code}
                  onChange={(e) => handleInputChange('coating_code', e.target.value)}
                  className="w-full px-4 py-2 bg-[#F5F1EC] rounded-xl text-sm text-[#232422] focus:outline-none focus:ring-2 focus:ring-[#FFDC6A]"
                >
                  <option value="">No coating</option>
                  {coatings.map((coating) => (
                    <option key={coating} value={coating}>
                      {coating}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-6">
          <div className={`col-span-6 bg-[#FEFEFE] rounded-3xl p-8 ${hasMaterialSelection ? 'opacity-60' : ''}`}>
            <h2 className="text-2xl font-light text-[#232422] mb-6">Thermal / Fire Behavior</h2>
            {hasMaterialSelection && (
              <p className="text-xs text-[#232422]/60 mb-4">
                Clear material selection in lookup mode to enable manual numeric input.
              </p>
            )}
            <div className="space-y-4">
              {THERMAL_FIELDS.map((field) => (
                <div key={field.key} className="flex items-center gap-4">
                  <label className="flex-1 text-sm text-[#232422]/80">{field.label}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={formData[field.key]}
                      onChange={(e) => handleInputChange(field.key, e.target.value)}
                      disabled={hasMaterialSelection}
                      className="w-32 px-4 py-2 bg-[#F5F1EC] rounded-xl text-sm text-[#232422] text-right focus:outline-none focus:ring-2 focus:ring-[#FFDC6A] disabled:opacity-60"
                    />
                    {field.unit && <span className="text-xs text-[#232422]/50 w-12">{field.unit}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`col-span-6 bg-[#FEFEFE] rounded-3xl p-8 ${hasMaterialSelection ? 'opacity-60' : ''}`}>
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
                      disabled={hasMaterialSelection}
                      className="w-32 px-4 py-2 bg-[#F5F1EC] rounded-xl text-sm text-[#232422] text-right focus:outline-none focus:ring-2 focus:ring-[#FFDC6A] disabled:opacity-60"
                    />
                    {field.unit && <span className="text-xs text-[#232422]/50 w-24">{field.unit}</span>}
                  </div>
                </div>
              ))}
            </div>

            {showCoatingDropdown && (
              <div className="mt-8 pt-8 border-t border-[#232422]/10">
                <h3 className="text-lg font-light text-[#232422] mb-4">Optional Coating</h3>
                <div className="flex items-center gap-4">
                  <label className="flex-1 text-sm text-[#232422]/80">Coating Code</label>
                  <select
                    value={formData.coating_code}
                    onChange={(e) => handleInputChange('coating_code', e.target.value)}
                    className="w-52 px-4 py-2 bg-[#F5F1EC] rounded-xl text-sm text-[#232422] text-right focus:outline-none focus:ring-2 focus:ring-[#FFDC6A]"
                  >
                    <option value="">No coating</option>
                    {coatings.map((coating) => (
                      <option key={coating} value={coating}>
                        {coating}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-[#232422]/50 mt-2">Leave empty for base material analysis only</p>
              </div>
            )}
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
              {hasMaterialSelection
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

      {interpretabilityNotice && (
        <div className="mt-6 px-4 py-3 rounded-xl bg-[#FFF2D8] text-[#6B4E00] text-sm">{interpretabilityNotice}</div>
      )}

      {!result && (
        <div className="mt-8 bg-[#FEFEFE] rounded-3xl p-8 border border-[#232422]/10">
          <h3 className="text-xl font-light text-[#232422]">No prediction yet</h3>
          <p className="mt-3 text-sm text-[#232422]/60">
            Select a material or enter manual descriptors, then run Fire Risk Assessment to view resistance, confidence, and interpretability results.
          </p>
        </div>
      )}

      {result && (
        <div className="mt-8">
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-8 bg-[#D0C7B5] rounded-3xl p-8 relative overflow-hidden min-h-[320px]">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-light text-[#232422]">Effective Fire Resistance</h2>
                  <div className="px-4 py-2 bg-[#232422] text-[#FFDC6A] text-sm rounded-full font-medium">
                    {result.confidence.label} Confidence
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
                    <span className="text-sm text-[#232422]/70 font-medium">{result.confidence.label}</span>
                  </div>
                </div>

                <div className="flex gap-6 mt-8">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#FFDC6A]" />
                    <span className="text-sm text-[#232422]/70">Confidence: {result.confidence.score.toFixed(3)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#FF8D7C]" />
                    <span className="text-sm text-[#232422]/70">
                      API: {version?.api_version ?? '0.3.0'} / Dataset: {result.dataset.version ?? health?.dataset_version ?? 'unknown'}
                    </span>
                  </div>
                </div>
                <div className="mt-5 text-sm text-[#232422]/75 leading-relaxed max-w-3xl">
                  {explanationText}
                </div>
              </div>
            </div>

            <div className="col-span-4 bg-[#24262E] rounded-3xl p-6 min-h-[320px]">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-light text-[#FEFEFE]">Top Drivers of Fire Resistance</h3>
                  <div className="text-sm text-[#FEFEFE]/55 mt-1">Visualized from the live local explanation payload</div>
                </div>
                <span className="text-sm text-[#FEFEFE]/60">Top 3</span>
              </div>

              <div className="space-y-4">
                {topDrivers.map((driver) => {
                  const width = (Math.abs(driver.abs_magnitude) / maxDriverMagnitude) * 100;
                  const isPositive = driver.direction === 'increases_resistance' || driver.contribution >= 0;
                  const displayName = interpretabilityDisplayNames[driver.feature] ?? prettyFeatureName(driver.feature);
                  const effectLabel = isPositive
                    ? (width >= 75 ? 'strong positive effect' : 'positive effect')
                    : (width >= 75 ? 'strong negative effect' : 'increases fire risk');
                  return (
                    <div
                      key={driver.feature}
                      className={`space-y-2 rounded-2xl px-4 py-4 ${
                        isPositive ? 'bg-[#DDEED8] text-[#1C5E20]' : 'bg-[#FDE7E7] text-[#7F1D1D]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          {isPositive ? <ArrowUpRight className="w-4 h-4 shrink-0" /> : <ArrowDownRight className="w-4 h-4 shrink-0" />}
                          <span className="text-sm font-medium truncate pr-2">{displayName}</span>
                        </div>
                        <span className="text-sm font-medium">{driver.contribution.toFixed(6)}</span>
                      </div>
                      <div className="h-2 bg-black/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isPositive ? 'bg-[#2E7D32]' : 'bg-[#C0392B]'}`}
                          style={{ width: `${width}%` }}
                        />
                      </div>
                      <div className="text-xs opacity-80">{effectLabel}</div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 pt-6 border-t border-[#FEFEFE]/10">
                <div className="text-xs text-[#FEFEFE]/60">Positive drivers support predicted resistance; negative drivers indicate added fire-risk pressure.</div>
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
                        <span className="text-[#232422] font-medium">{result.dataset.version ?? health?.dataset_version ?? 'unknown'}</span>
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

          <div className="mt-4">
            <button
              type="button"
              onClick={exportCsv}
              className="px-4 py-2 rounded-full text-sm bg-[#232422] text-[#FEFEFE] hover:opacity-90 transition-opacity"
            >
              Export CSV
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SingleMaterialPage;
