import { useState } from 'react';
import LeaderboardChart from '../charts/LeaderboardChart';
import MaterialCard from '../components/MaterialCard';
import PageContainer from '../layout/PageContainer';
import { analysisService } from '../services/analysisService';
import { exampleMaterialNames, useCases } from '../styles/tokens';
import type { Phase3Input, RankResponse } from '../types/index';

function RankingPage() {
  const [materialsText, setMaterialsText] = useState(exampleMaterialNames.join('\n'));
  const [useCase, setUseCase] = useState(useCases[0]);
  const [result, setResult] = useState<RankResponse | null>(null);
  const [exportContent, setExportContent] = useState<string | null>(null);

  const materialPayload = (): Phase3Input[] =>
    materialsText
      .split('\n')
      .map((value) => value.trim())
      .filter(Boolean)
      .map((material_name) => ({ material_name }));

  const runRanking = async () => {
    setResult(await analysisService.rankMaterials({ materials: materialPayload(), use_case: useCase }));
  };

  const runExport = async () => {
    const exportResult = await analysisService.exportRanking({ materials: materialPayload(), use_case: useCase, format: 'csv' });
    setExportContent(exportResult.content);
  };

  return (
    <PageContainer eyebrow="Discovery Lab" title="Candidate ranking workspace" description="Build a shortlist, rank it against the live backend, and export a clean leaderboard for research review.">
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <MaterialCard title="Ranking input table" subtitle="One material name per line. Demo values are preloaded.">
          <select value={useCase} onChange={(e) => setUseCase(e.target.value)} className="mb-4 w-full rounded-xl border border-[#762123]/10 bg-[#f8f8f8] px-4 py-3 text-sm">
            {useCases.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <textarea value={materialsText} onChange={(e) => setMaterialsText(e.target.value)} rows={8} className="w-full rounded-xl border border-[#762123]/10 bg-[#f8f8f8] px-4 py-3 text-sm" />
          <div className="mt-4 flex gap-3">
            <button onClick={runRanking} className="rounded-full bg-gradient-to-r from-[#784F74] to-[#E8967F] px-4 py-2 text-sm text-white">Run ranking</button>
            <button onClick={runExport} className="rounded-full border border-[var(--dravix-border)] px-4 py-2 text-sm text-[var(--dravix-ink)]">Export ranking</button>
          </div>
          {exportContent ? <pre className="mt-4 max-h-48 overflow-auto rounded-[1.25rem] bg-[#f8f8f8] p-4 text-xs">{exportContent}</pre> : null}
        </MaterialCard>
        <LeaderboardChart ranking={result?.ranking ?? []} />
      </div>
      <MaterialCard title="Ranked materials">
        <div className="space-y-3">
          {(result?.ranking ?? []).map((row) => (
            <div key={row.rank} className="flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] border border-[var(--dravix-border)] p-4">
              <div>
                <div className="text-sm text-[var(--dravix-ink-soft)]">#{row.rank}</div>
                <div className="text-lg text-[var(--dravix-ink)]">{row.material_name}</div>
              </div>
              <div className="text-sm text-[var(--dravix-ink-soft)]">Risk {row.risk_score.toFixed(1)} • Resistance {row.resistance_index.toFixed(1)} • {row.confidence}</div>
            </div>
          ))}
        </div>
      </MaterialCard>
    </PageContainer>
  );
}

export default RankingPage;
