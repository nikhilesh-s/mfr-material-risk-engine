import { useEffect, useMemo, useState } from 'react';
import { Copy, Layers3, Trophy } from 'lucide-react';
import { ApiError, rankMaterials } from '../lib/api';
import type { RankResponse } from '../types';

type MaterialScreeningProps = {
  materials: string[];
};

const DEMO_MATERIALS = [
  'ABS',
  'Polycarbonate',
  'Nylon 6',
  'PEEK',
  'Glass Fiber Reinforced PC',
];

function MaterialScreening({ materials }: MaterialScreeningProps) {
  const [query, setQuery] = useState('');
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [result, setResult] = useState<RankResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  useEffect(() => {
    setSelectedMaterials((current) => current.filter((material) => materials.includes(material)));
  }, [materials]);

  useEffect(() => {
    if (!copyMessage) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setCopyMessage(null);
    }, 1400);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [copyMessage]);

  const filteredMaterials = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return materials;
    }
    return materials.filter((material) => material.toLowerCase().includes(normalizedQuery));
  }, [materials, query]);

  const topCandidate = result?.ranking[0] ?? null;

  const loadDemoMaterials = () => {
    const availableDemoMaterials = DEMO_MATERIALS.filter((material) => materials.includes(material));
    setSelectedMaterials(availableDemoMaterials);
    setErrorMessage(null);
  };

  const toggleMaterial = (material: string) => {
    setSelectedMaterials((current) => (
      current.includes(material)
        ? current.filter((entry) => entry !== material)
        : [...current, material]
    ));
  };

  const runScreening = async () => {
    if (selectedMaterials.length === 0) {
      setErrorMessage('Select at least one material to screen.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await rankMaterials({
        materials: selectedMaterials.map((material) => ({ material_name: material })),
      });
      setResult(response);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Screening failed. Please retry.');
      }
    } finally {
      setLoading(false);
    }
  };

  const copyShortlist = async () => {
    if (!result || result.ranking.length === 0) {
      return;
    }

    const lines = [
      'Dravix Material Screening Shortlist',
      ...result.ranking.map((row) => (
        `${row.rank}. ${row.material} | Resistance: ${row.resistanceScore.toFixed(3)} | Confidence: ${row.confidence}`
      )),
    ];

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopyMessage('Shortlist copied');
    } catch {
      setErrorMessage('Clipboard copy failed. Please retry.');
    }
  };

  const exportCSV = () => {
    if (!result || result.ranking.length === 0) {
      return;
    }

    const header = ['rank', 'material', 'resistance', 'confidence'];
    const rows = result.ranking.map((row) => [
      row.rank,
      row.material,
      row.resistanceScore,
      row.confidence,
    ]);

    const csvContent = [header, ...rows]
      .map((entry) => entry.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'dravix_shortlist.csv';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <section className="mt-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-[#24262E] rounded-xl flex items-center justify-center">
              <Layers3 className="w-5 h-5 text-[#FFDC6A]" />
            </div>
            <h2 className="text-3xl font-light text-[#232422]">Candidate Material Screening</h2>
          </div>
          <p className="text-[#232422]/60 max-w-2xl">
            Rank candidate materials by predicted fire resistance before lab testing.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#FEFEFE] rounded-full text-sm text-[#232422]/70 border border-[#232422]/10">
          <span>{selectedMaterials.length}</span>
          <span>selected</span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-5 bg-[#FEFEFE] rounded-3xl p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-lg font-light text-[#232422]">Candidate Materials</h3>
            <button
              type="button"
              onClick={() => setSelectedMaterials([])}
              disabled={selectedMaterials.length === 0}
              className="px-3 py-1 rounded-full text-xs bg-[#232422]/8 text-[#232422] hover:bg-[#232422]/12 disabled:opacity-40 transition-colors"
            >
              Clear All
            </button>
          </div>

          <button
            type="button"
            onClick={loadDemoMaterials}
            className="mb-3 px-4 py-2 rounded-full bg-[#F5F1EC] text-sm text-[#232422] hover:bg-[#E8E0D3] transition-colors"
          >
            Load Demo Materials
          </button>

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter materials"
            className="w-full px-4 py-3 bg-[#F5F1EC] rounded-2xl text-sm text-[#232422] focus:outline-none focus:ring-2 focus:ring-[#FFDC6A]"
          />

          <div className="mt-4 h-[26rem] overflow-y-auto rounded-2xl border border-[#232422]/10 bg-[#F9F6F1] p-2">
            {filteredMaterials.length === 0 ? (
              <div className="px-4 py-6 text-sm text-[#232422]/55">No materials match the current filter.</div>
            ) : (
              <div className="space-y-1">
                {filteredMaterials.map((material) => {
                  const isSelected = selectedMaterials.includes(material);
                  return (
                    <label
                      key={material}
                      className={`flex items-center gap-3 rounded-2xl px-4 py-3 cursor-pointer transition-colors ${
                        isSelected ? 'bg-[#232422] text-[#FEFEFE]' : 'hover:bg-[#ECE4D8] text-[#232422]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleMaterial(material)}
                        className="h-4 w-4 rounded border-[#232422]/30 text-[#FF8D7C] focus:ring-[#FFDC6A]"
                      />
                      <span className="text-sm">{material}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                void runScreening();
              }}
              disabled={loading || selectedMaterials.length === 0}
              className="px-6 py-3 bg-gradient-to-r from-[#FFDC6A] to-[#FF8D7C] text-[#232422] rounded-full font-medium hover:opacity-90 disabled:opacity-60 transition-opacity inline-flex items-center gap-2"
            >
              {loading ? <span className="w-4 h-4 border-2 border-[#232422] border-t-transparent rounded-full animate-spin" /> : null}
              {loading ? 'Running...' : 'Run Dravix Screening'}
            </button>
            <button
              type="button"
              onClick={() => {
                void copyShortlist();
              }}
              disabled={!result || result.ranking.length === 0}
              className="px-5 py-3 bg-[#232422] text-[#FEFEFE] rounded-full font-medium hover:opacity-90 disabled:opacity-50 transition-opacity inline-flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              Copy shortlist
            </button>
          </div>

          {errorMessage && (
            <div className="mt-4 px-4 py-3 rounded-2xl bg-[#FDE7E7] text-[#7F1D1D] text-sm">
              {errorMessage}
            </div>
          )}

          {copyMessage && (
            <div className="mt-4 px-4 py-3 rounded-2xl bg-[#DDEED8] text-[#1C5E20] text-sm">
              {copyMessage}
            </div>
          )}
        </div>

        <div className="col-span-7 space-y-6">
          <div className="bg-[#24262E] rounded-3xl p-6 min-h-[10rem]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#FEFEFE]/10 rounded-xl flex items-center justify-center">
                <Trophy className="w-5 h-5 text-[#FFDC6A]" />
              </div>
              <div>
                <div className="text-sm uppercase tracking-[0.18em] text-[#FEFEFE]/45">Top Recommended Candidate</div>
                <h3 className="text-2xl font-light text-[#FEFEFE]">Current Best Screening Outcome</h3>
              </div>
            </div>

            {topCandidate ? (
              <div>
                <div className="text-sm text-[#FEFEFE]/55">Top recommended material</div>
                <div className="text-5xl font-light text-[#FFDC6A] mt-2">{topCandidate.material}</div>
                <div className="mt-5 grid grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-[#FEFEFE]/10 px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.14em] text-[#FEFEFE]/45">Material</div>
                    <div className="text-lg text-[#FEFEFE] mt-2">{topCandidate.material}</div>
                  </div>
                  <div className="rounded-2xl bg-[#FEFEFE]/10 px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.14em] text-[#FEFEFE]/45">Resistance Score</div>
                    <div className="text-lg text-[#FEFEFE] mt-2">{topCandidate.resistanceScore.toFixed(3)}</div>
                  </div>
                  <div className="rounded-2xl bg-[#FEFEFE]/10 px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.14em] text-[#FEFEFE]/45">Confidence</div>
                    <div className="text-lg text-[#FEFEFE] mt-2">{topCandidate.confidence}</div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-[#FEFEFE]/60 leading-relaxed">
                Select multiple materials and run screening to rank candidates and surface the best current option.
              </p>
            )}
          </div>

          <div className="bg-[#FEFEFE] rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-light text-[#232422]">Screening Results</h3>
              <span className="text-sm text-[#232422]/50">
                {result?.ranking.length ?? 0} ranked
              </span>
            </div>

            <button
              type="button"
              onClick={exportCSV}
              disabled={!result || result.ranking.length === 0}
              className="mb-4 px-4 py-2 rounded-full bg-[#F5F1EC] text-sm text-[#232422] hover:bg-[#E8E0D3] disabled:opacity-45 disabled:hover:bg-[#F5F1EC] transition-colors"
            >
              Export Recommended Candidates
            </button>

            {result && result.ranking.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[#232422]/60 border-b border-[#232422]/10">
                      <th className="py-3 pr-4">Rank</th>
                      <th className="py-3 pr-4">Material</th>
                      <th className="py-3 pr-4">Resistance</th>
                      <th className="py-3 pr-4">Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.ranking.map((row) => (
                      <tr
                        key={`${row.rank}-${row.material}`}
                        className={`border-b border-[#232422]/5 ${
                          row.rank === 1 ? 'bg-[#ECFDF5]' : ''
                        }`}
                      >
                        <td className="py-3 pr-4 text-[#232422] font-medium">{row.rank}</td>
                        <td className="py-3 pr-4 text-[#232422]">{row.material}</td>
                        <td className="py-3 pr-4 text-[#232422]">{row.resistanceScore.toFixed(3)}</td>
                        <td className="py-3 pr-4 text-[#232422]/80">{row.confidence}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-2xl bg-[#F5F1EC] px-4 py-10 text-center text-[#232422]/55">
                No screening results yet.
              </div>
            )}

            {result && result.errors.length > 0 && (
              <div className="mt-6 rounded-2xl bg-[#FFF2D8] px-4 py-4">
                <div className="text-sm font-medium text-[#6B4E00] mb-2">Skipped Materials</div>
                <div className="space-y-1 text-sm text-[#6B4E00]">
                  {result.errors.map((entry) => (
                    <div key={`${entry.material}-${entry.error}`}>
                      {entry.material}: {entry.error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default MaterialScreening;
