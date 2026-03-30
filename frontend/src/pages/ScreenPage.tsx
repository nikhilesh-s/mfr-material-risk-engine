import { useEffect, useState } from 'react';
import ClusterScatterPlot from '../charts/ClusterScatterPlot';
import LeaderboardChart from '../charts/LeaderboardChart';
import MaterialCard from '../components/MaterialCard';
import SectionBanner from '../components/SectionBanner';
import DatasetSearchForm from '../forms/DatasetSearchForm';
import type { DatasetSearchState } from '../forms/DatasetSearchForm';
import PageContainer from '../layout/PageContainer';
import { analysisService } from '../services/analysisService';
import { datasetService } from '../services/datasetService';
import { exampleMaterialNames, useCases } from '../styles/tokens';
import type {
  ClustersResponse,
  DatasetSearchResponse,
  MaterialsResponse,
  Phase3Input,
  RankResponse,
} from '../types/index';

const initialSearchState: DatasetSearchState = {
  material_name: 'ABS',
  density_min: '',
  density_max: '',
  melting_point_min: '',
  melting_point_max: '',
};

function ScreenPage() {
  const [materialsResponse, setMaterialsResponse] = useState<MaterialsResponse | null>(null);
  const [clusters, setClusters] = useState<ClustersResponse | null>(null);
  const [searchState, setSearchState] = useState<DatasetSearchState>(initialSearchState);
  const [searchResult, setSearchResult] = useState<DatasetSearchResponse | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const [materialsText, setMaterialsText] = useState(exampleMaterialNames.join('\n'));
  const [useCase, setUseCase] = useState(useCases[0]);
  const [rankingResult, setRankingResult] = useState<RankResponse | null>(null);
  const [exportContent, setExportContent] = useState<string | null>(null);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    void Promise.allSettled([datasetService.getMaterials(), datasetService.getClusters()]).then(([m, c]) => {
      if (m.status === 'fulfilled') setMaterialsResponse(m.value);
      if (c.status === 'fulfilled') setClusters(c.value);
    });
  }, []);

  const runSearch = async () => {
    setSearchLoading(true);
    try {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(searchState)) {
        if (value.trim()) params.set(key, value.trim());
      }
      setSearchResult(await datasetService.searchDataset(params));
    } finally {
      setSearchLoading(false);
    }
  };

  const materialPayload = (): Phase3Input[] =>
    materialsText
      .split('\n')
      .map((value) => value.trim())
      .filter(Boolean)
      .map((material_name) => ({ material_name }));

  const runRanking = async () => {
    setRankingLoading(true);
    try {
      setRankingResult(await analysisService.rankMaterials({ materials: materialPayload(), use_case: useCase }));
    } finally {
      setRankingLoading(false);
    }
  };

  const runExport = async () => {
    setExportLoading(true);
    try {
      const exportResult = await analysisService.exportRanking({
        materials: materialPayload(),
        use_case: useCase,
        format: 'csv',
      });
      setExportContent(exportResult.content);
    } finally {
      setExportLoading(false);
    }
  };

  const describeSearchRow = (row: Record<string, unknown>) => {
    const name =
      row['material_name'] ??
      row['Material Name'] ??
      row['material'] ??
      row['name'] ??
      'Unknown material';
    const density = row['density'] ?? row['Density (g/cc)'] ?? 'n/a';
    const meltingPoint = row['melting_point'] ?? row['Melting Point (°C)'] ?? 'n/a';
    const thermal = row['thermal_conductivity'] ?? row['Thermal Cond. (W/m-K)'] ?? 'n/a';
    return {
      name: String(name),
      detail: `Density ${String(density)} • Melting point ${String(meltingPoint)} • Thermal cond. ${String(thermal)}`,
    };
  };

  return (
    <PageContainer
      eyebrow="Screen"
      title="Screen"
    >
      <SectionBanner title="Dataset search" subtitle="Filter the in-memory material set first, then screen candidates." />
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <DatasetSearchForm state={searchState} onChange={setSearchState} onSubmit={runSearch} loading={searchLoading} />
        <MaterialCard title="Materials inventory" subtitle={`Loaded materials: ${materialsResponse?.materials.length ?? 0}`}>
          <div className="grid max-h-72 gap-2 overflow-auto text-sm">
            {(materialsResponse?.materials ?? []).slice(0, 24).map((material) => (
              <div key={material} className="rounded-[1rem] bg-[#f8f8f8] px-3 py-2 text-[var(--dravix-ink)]">
                {material}
              </div>
            ))}
          </div>
        </MaterialCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <MaterialCard title={`Search results (${searchResult?.count ?? 0})`}>
          <div className="space-y-2">
            {(searchResult?.results ?? []).slice(0, 10).map((row, index) => (
              <div key={`${describeSearchRow(row).name}-${index}`} className="rounded-[1rem] bg-[#f8f8f8] px-4 py-3 text-sm">
                <div className="font-medium text-[var(--dravix-ink)]">{describeSearchRow(row).name}</div>
                <div className="mt-1 text-[var(--dravix-ink-soft)]">{describeSearchRow(row).detail}</div>
              </div>
            ))}
          </div>
        </MaterialCard>
        <ClusterScatterPlot clusters={clusters?.clusters ?? []} />
      </div>

      <SectionBanner title="Ranking" subtitle="Rank a shortlist and read the output as a continuous leaderboard curve." />
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <MaterialCard title="Ranking input table" subtitle="One material name per line. Demo values are preloaded.">
          <select
            value={useCase}
            onChange={(event) => setUseCase(event.target.value)}
            className="mb-4 w-full rounded-xl border border-[#762123]/10 bg-[#f8f8f8] px-4 py-3 text-sm"
          >
            {useCases.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <textarea
            value={materialsText}
            onChange={(event) => setMaterialsText(event.target.value)}
            rows={8}
            className="w-full rounded-xl border border-[#762123]/10 bg-[#f8f8f8] px-4 py-3 text-sm"
          />
          <div className="mt-4 flex gap-3">
            <button
              onClick={runRanking}
              disabled={rankingLoading}
              className="rounded-full bg-gradient-to-r from-[#784F74] to-[#E8967F] px-4 py-2 text-sm text-white disabled:opacity-60"
            >
              {rankingLoading ? 'Ranking…' : 'Run ranking'}
            </button>
            <button
              onClick={runExport}
              disabled={exportLoading}
              className="rounded-full border border-[var(--dravix-border)] px-4 py-2 text-sm text-[var(--dravix-ink)] disabled:opacity-60"
            >
              {exportLoading ? 'Exporting…' : 'Export ranking'}
            </button>
          </div>
          {exportContent ? <pre className="mt-4 max-h-48 overflow-auto rounded-[1.25rem] bg-[#f8f8f8] p-4 text-xs">{exportContent}</pre> : null}
        </MaterialCard>

        <LeaderboardChart ranking={rankingResult?.ranking ?? []} />
      </div>

      <MaterialCard title="Ranked materials">
        <div className="space-y-3">
          {(rankingResult?.ranking ?? []).map((row) => (
            <div key={row.rank} className="flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] border border-[var(--dravix-border)] p-4">
              <div>
                <div className="text-sm text-[var(--dravix-ink-soft)]">#{row.rank}</div>
                <div className="text-lg text-[var(--dravix-ink)]">{row.material_name}</div>
              </div>
              <div className="text-sm text-[var(--dravix-ink-soft)]">
                Risk {row.risk_score.toFixed(1)} • Resistance {row.resistance_index.toFixed(1)} • {row.confidence}
              </div>
            </div>
          ))}
        </div>
      </MaterialCard>
    </PageContainer>
  );
}

export default ScreenPage;
