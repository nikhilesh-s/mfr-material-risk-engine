import { Download, FileSpreadsheet, ListFilter, Trophy, Upload } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ApiError, exportRanking, rankMaterials } from '../lib/api';
import LeaderboardChart from './LeaderboardChart';
import { designSystem } from '../theme/designSystem';
import type { RankResponse } from '../types';
import { USE_CASES } from '../useCases';

type MaterialScreeningProps = {
  materials: string[];
};

function parseCandidateText(value: string): string[] {
  return value
    .split(/\r?\n|,/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeMaterialName(value: string): string {
  return value.trim().toLowerCase();
}

function MaterialScreening({ materials }: MaterialScreeningProps) {
  const [query, setQuery] = useState('');
  const [useCase, setUseCase] = useState<string>(USE_CASES[0]);
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [pastedCandidates, setPastedCandidates] = useState('');
  const [result, setResult] = useState<RankResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setSelectedMaterials((current) => current.filter((material) => materials.includes(material)));
  }, [materials]);

  const materialsByNormalized = useMemo(() => {
    const entries = materials.map((material) => [normalizeMaterialName(material), material] as const);
    return new Map<string, string>(entries);
  }, [materials]);

  const filteredMaterials = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return materials.slice(0, 240);
    }
    return materials.filter((material) => material.toLowerCase().includes(normalizedQuery)).slice(0, 240);
  }, [materials, query]);

  const importedCandidates = useMemo(() => parseCandidateText(pastedCandidates), [pastedCandidates]);
  const resolvedImportedCandidates = useMemo(() => {
    const valid: string[] = [];
    const invalid: string[] = [];
    for (const candidate of importedCandidates) {
      const resolved = materialsByNormalized.get(normalizeMaterialName(candidate));
      if (resolved) {
        valid.push(resolved);
      } else {
        invalid.push(candidate);
      }
    }
    return { valid, invalid };
  }, [importedCandidates, materialsByNormalized]);
  const allCandidates = useMemo(
    () => Array.from(new Set([...selectedMaterials, ...resolvedImportedCandidates.valid])),
    [resolvedImportedCandidates.valid, selectedMaterials],
  );

  const runScreening = async () => {
    if (allCandidates.length === 0) {
      setErrorMessage('Add at least one candidate material.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await rankMaterials({
        use_case: useCase,
        materials: allCandidates.map((material) => ({ material_name: material })),
      });
      setResult(response);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === 'TIMEOUT') {
          setErrorMessage(`${error.message} Candidate count: ${allCandidates.length}.`);
        } else {
          setErrorMessage(error.message);
        }
      } else if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Batch ranking failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const exportResults = async (format: 'csv' | 'json') => {
    if (allCandidates.length === 0) {
      return;
    }
    try {
      const response = await exportRanking({
        format,
        use_case: useCase,
        materials: allCandidates.map((material) => ({ material_name: material })),
      });
      const blob = new Blob([response.content], { type: response.content_type });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = response.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      if (error instanceof ApiError || error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Export failed.');
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const text = await file.text();
    setPastedCandidates(text);
  };

  const topCandidate = result?.ranking[0] ?? null;

  return (
    <section className="space-y-6">
      <div className="dravix-hero rounded-[2rem] border px-8 py-9 text-white" style={{ borderColor: designSystem.backgroundColors.border }}>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-3xl">
            <div className="text-xs uppercase tracking-[0.24em] text-white/60">Batch Prioritization</div>
            <h2 className="mt-3 text-4xl font-light">Rank candidate materials and export a recommended shortlist.</h2>
            <p className="mt-4 text-base leading-7 text-white/78">
              Dravix is functioning here as a prioritization engine: import candidates, screen them,
              compare risk and confidence, then export recommended test candidates.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-white/8 px-5 py-4 text-sm">
            <div className="text-white/62">Use case</div>
            <div className="mt-1 text-[#ffd88c]">{useCase}</div>
          </div>
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-2xl border border-[#cc8b60]/30 bg-[#fff1e8] px-4 py-3 text-sm text-[#8b3f14]">
          {errorMessage}
        </div>
      ) : null}
      {resolvedImportedCandidates.invalid.length > 0 ? (
        <div className="rounded-2xl border border-[#d4c5a8] bg-[#fff8ed] px-4 py-3 text-sm text-[#6d533d]">
          Ignoring {resolvedImportedCandidates.invalid.length} pasted name{resolvedImportedCandidates.invalid.length === 1 ? '' : 's'} not found in the live materials lookup.
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.05fr_1fr]">
        <div className="dravix-card space-y-6 rounded-[2rem] p-7">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-[#5f5042]">Use case context</label>
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
              <label className="mb-2 block text-sm text-[#5f5042]">Import candidate file</label>
              <label className="dravix-panel flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed px-4 py-3 text-sm text-[#4b3928]">
                <Upload className="h-4 w-4" />
                Upload CSV or TXT
                <input type="file" accept=".csv,.txt" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-[#5f5042]">
                <ListFilter className="h-4 w-4" />
                Search materials lookup
              </div>
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter known materials"
                className="dravix-panel w-full rounded-2xl px-4 py-3 text-sm text-[#231a14] outline-none"
              />
              <div className="dravix-panel mt-4 h-[24rem] overflow-y-auto rounded-[1.5rem] p-2">
                {filteredMaterials.map((material) => {
                  const active = selectedMaterials.includes(material);
                  return (
                    <button
                      key={material}
                      type="button"
                      onClick={() => setSelectedMaterials((current) => (
                        active ? current.filter((entry) => entry !== material) : [...current, material]
                      ))}
                      className={`mb-2 flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm ${
                        active ? 'text-[#232422]' : 'bg-white text-[#231a14] hover:bg-[#D0C7B5]'
                      }`}
                      style={active ? { background: designSystem.primaryGradient } : undefined}
                    >
                      <span>{material}</span>
                      <span>{active ? 'Added' : 'Add'}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2 text-sm text-[#5f5042]">
                <FileSpreadsheet className="h-4 w-4" />
                Paste candidate materials
              </div>
              <textarea
                value={pastedCandidates}
                onChange={(event) => setPastedCandidates(event.target.value)}
                placeholder={'Paste exact material names from the live lookup list'}
                className="dravix-panel h-[24rem] w-full rounded-[1.5rem] px-4 py-4 text-sm text-[#231a14] outline-none"
              />
              <div className="mt-2 text-xs text-[#7c6857]">
                Pasted candidates are matched against the live `/materials` list before ranking.
              </div>
            </div>
          </div>

          <div className="dravix-panel rounded-[1.5rem] px-5 py-5">
            <div className="text-sm text-[#5f5042]">Current candidate set</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {allCandidates.length > 0 ? allCandidates.map((material) => (
                <span key={material} className="rounded-full bg-white px-3 py-2 text-sm text-[#231a14]">
                  {material}
                </span>
              )) : (
                <span className="text-sm text-[#7c6857]">No candidates selected yet.</span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => { void runScreening(); }}
              disabled={loading}
              className="dravix-button-primary rounded-full px-6 py-3 text-sm font-medium transition hover:opacity-90 disabled:opacity-60"
            >
              {loading ? 'Ranking candidates...' : 'Run Dravix ranking'}
            </button>
            <button
              type="button"
              onClick={() => { void exportResults('csv'); }}
              className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm text-[#FEFEFE]"
              style={{ background: designSystem.accentGradient }}
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => { void exportResults('json'); }}
              className="rounded-full px-5 py-3 text-sm text-[#231a14] dravix-panel"
            >
              Export JSON
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="dravix-panel rounded-[2rem] p-7">
            <div className="mb-4 flex items-center gap-3">
              <Trophy className="h-5 w-5 text-[#8b4b1b]" />
              <h3 className="text-xl font-light text-[#231a14]">Recommended test candidate</h3>
            </div>
            {topCandidate ? (
              <div className="space-y-4">
                <div className="text-sm text-[#7c6857]">Best current low-risk candidate</div>
                <div className="text-4xl font-light text-[#231a14]">{topCandidate.material_name}</div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="dravix-card rounded-[1.5rem] px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-[#8b4b1b]">Risk score</div>
                    <div className="mt-2 text-3xl text-[#231a14]">{topCandidate.risk_score.toFixed(1)}</div>
                  </div>
                  <div className="dravix-card rounded-[1.5rem] px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-[#8b4b1b]">Confidence</div>
                    <div className="mt-2 text-3xl text-[#231a14]">{topCandidate.confidence}</div>
                  </div>
                </div>
                <div className="dravix-card rounded-[1.5rem] px-4 py-4 text-sm text-[#4b3928]">
                  {topCandidate.notes}
                </div>
              </div>
            ) : (
              <div className="dravix-card rounded-[1.5rem] px-4 py-8 text-sm text-[#6b5949]">
                Run a live ranking to surface the best candidate for testing.
              </div>
            )}
          </div>

          {result && result.ranking.length > 0 ? (
            <LeaderboardChart ranking={result.ranking} />
          ) : null}

          <div className="dravix-card rounded-[2rem] p-7">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-light text-[#231a14]">Ranked shortlist</h3>
                <p className="text-sm text-[#5f5042]">Sorted from lowest to highest fire-risk proxy.</p>
              </div>
              <span className="dravix-panel rounded-full px-3 py-2 text-sm text-[#4b3928]">
                {result?.ranking.length ?? 0} ranked
              </span>
            </div>

            {result && result.ranking.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-[#2b2118]/10 text-left text-[#7c6857]">
                      <th className="py-3 pr-3">Rank</th>
                      <th className="py-3 pr-3">Material</th>
                      <th className="py-3 pr-3">Risk Score</th>
                      <th className="py-3 pr-3">Confidence</th>
                      <th className="py-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.ranking.map((row) => (
                      <tr key={`${row.rank}-${row.material_name}`} className={row.rank === 1 ? 'bg-[#ecf7ee]' : 'border-b border-[#2b2118]/6'}>
                        <td className="py-3 pr-3 font-medium text-[#231a14]">{row.rank}</td>
                        <td className="py-3 pr-3 text-[#231a14]">{row.material_name}</td>
                        <td className="py-3 pr-3 text-[#231a14]">{row.risk_score.toFixed(1)}</td>
                        <td className="py-3 pr-3 text-[#4b3928]">{row.confidence}</td>
                        <td className="py-3 text-[#4b3928]">{row.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="dravix-panel rounded-[1.5rem] px-4 py-8 text-sm text-[#6b5949]">
                No batch ranking results yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default MaterialScreening;
