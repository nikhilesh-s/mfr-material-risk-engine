import { useEffect, useState } from 'react';
import FeatureImportanceTable from '../components/FeatureImportanceTable';
import MaterialCard from '../components/MaterialCard';
import PageContainer from '../layout/PageContainer';
import { analysisService } from '../services/analysisService';
import type { AnalysisByIdResponse, InteractiveAnalysisResponse } from '../types/index';

function HistoryPage() {
  const [recent, setRecent] = useState<Array<{ analysis_id: string; material_name: string; created_at: string }>>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [analysis, setAnalysis] = useState<AnalysisByIdResponse | null>(null);
  const [interactive, setInteractive] = useState<InteractiveAnalysisResponse | null>(null);

  useEffect(() => {
    void analysisService.getRecentAnalyses().then((res) => {
      setRecent(res.analyses);
      if (res.analyses[0]?.analysis_id) setSelectedId(res.analyses[0].analysis_id);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    void Promise.allSettled([
      analysisService.getAnalysisById(selectedId),
      analysisService.getInteractiveAnalysis(selectedId),
    ]).then(([a, i]) => {
      if (a.status === 'fulfilled') setAnalysis(a.value);
      if (i.status === 'fulfilled') setInteractive(i.value);
    });
  }, [selectedId]);

  return (
    <PageContainer eyebrow="History" title="Analysis history" description="Review persisted analyses, drill into a selected run, and inspect the stored interactive explanation payload.">
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <MaterialCard title="Recent analyses">
          <div className="space-y-3">
            {recent.map((item) => (
              <button key={item.analysis_id} onClick={() => setSelectedId(item.analysis_id)} className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm ${selectedId === item.analysis_id ? 'border-transparent bg-[var(--dravix-gradient-primary)] text-white' : 'border-[var(--dravix-border)] bg-[var(--dravix-panel)] text-[var(--dravix-ink)]'}`}>
                <span>{item.material_name}</span>
                <span>{item.analysis_id}</span>
              </button>
            ))}
          </div>
        </MaterialCard>
        <MaterialCard title="Analysis detail" subtitle={selectedId || 'Select a recent analysis'}>
          <pre className="max-h-80 overflow-auto rounded-2xl bg-[var(--dravix-panel)] p-4 text-xs">{JSON.stringify(analysis?.prediction_json ?? {}, null, 2)}</pre>
        </MaterialCard>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <FeatureImportanceTable drivers={interactive?.top_drivers ?? []} />
        <MaterialCard title="Interactive panel">
          <div className="space-y-4 text-sm">
            <div>
              <div className="text-[var(--dravix-ink-soft)]">Recommended tests</div>
              <ul className="mt-2 space-y-1 text-[var(--dravix-ink)]">{(interactive?.recommended_tests ?? []).map((item) => <li key={item}>• {item}</li>)}</ul>
            </div>
            <div>
              <div className="text-[var(--dravix-ink-soft)]">Counterfactual suggestions</div>
              <ul className="mt-2 space-y-1 text-[var(--dravix-ink)]">{(interactive?.counterfactual_suggestions ?? []).map((item) => <li key={item}>• {item}</li>)}</ul>
            </div>
          </div>
        </MaterialCard>
      </div>
    </PageContainer>
  );
}

export default HistoryPage;
