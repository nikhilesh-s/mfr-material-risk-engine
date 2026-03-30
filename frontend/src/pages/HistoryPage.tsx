import { useEffect, useState } from 'react';
import FeatureImportanceTable from '../components/FeatureImportanceTable';
import MaterialCard from '../components/MaterialCard';
import PageContainer from '../layout/PageContainer';
import { analysisService } from '../services/analysisService';
import type { AnalysisByIdResponse, PredictionResponse } from '../types/index';

function HistoryPage() {
  const [recent, setRecent] = useState<Array<{ analysis_id: string; material_name: string; created_at: string }>>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [analysis, setAnalysis] = useState<AnalysisByIdResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void analysisService.getRecentAnalyses().then((res) => {
      setRecent(res.analyses);
      if (res.analyses[0]?.analysis_id) setSelectedId(res.analyses[0].analysis_id);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    void analysisService.getAnalysisById(selectedId)
      .then((result) => setAnalysis(result))
      .finally(() => setLoading(false));
  }, [selectedId]);

  const prediction = (analysis?.prediction_json ?? null) as PredictionResponse | null;

  return (
    <PageContainer eyebrow="History" title="Analysis review">
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <MaterialCard title="Recent analyses">
          <div className="space-y-3">
            {recent.map((item) => (
              <button key={item.analysis_id} onClick={() => setSelectedId(item.analysis_id)} className={`flex w-full items-center justify-between rounded-[1.25rem] border px-4 py-3 text-left text-sm ${selectedId === item.analysis_id ? 'border-transparent bg-gradient-to-r from-[#784F74] to-[#E8967F] text-white' : 'border-[var(--dravix-border)] bg-[#f8f8f8] text-[var(--dravix-ink)]'}`}>
                <span>{item.material_name}</span>
                <span>{item.analysis_id}</span>
              </button>
            ))}
          </div>
        </MaterialCard>
        <MaterialCard title="Analysis detail" subtitle={selectedId || 'Select a recent analysis'}>
          {loading ? (
            <div className="rounded-[1.25rem] bg-[#f8f8f8] p-4 text-sm text-[var(--dravix-ink-soft)]">Loading analysis…</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.25rem] bg-[#f8f8f8] p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-[var(--dravix-ink-soft)]">Material</div>
                <div className="mt-2 text-xl font-light text-[var(--dravix-ink)]">{prediction?.material_name ?? 'n/a'}</div>
              </div>
              <div className="rounded-[1.25rem] bg-[#f8f8f8] p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-[var(--dravix-ink-soft)]">DFRS</div>
                <div className="mt-2 text-xl font-light text-[var(--dravix-ink)]">{prediction?.DFRS?.toFixed(3) ?? 'n/a'}</div>
              </div>
              <div className="rounded-[1.25rem] bg-[#f8f8f8] p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-[var(--dravix-ink-soft)]">Confidence</div>
                <div className="mt-2 text-xl font-light text-[var(--dravix-ink)]">
                  {typeof prediction?.confidence === 'string' ? prediction.confidence : prediction?.confidence?.label ?? 'n/a'}
                </div>
              </div>
              <div className="rounded-[1.25rem] bg-[#f8f8f8] p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-[var(--dravix-ink-soft)]">Risk score</div>
                <div className="mt-2 text-xl font-light text-[var(--dravix-ink)]">{prediction?.risk_score?.toFixed(1) ?? 'n/a'}</div>
              </div>
              <div className="rounded-[1.25rem] bg-[#f8f8f8] p-4 md:col-span-2">
                <div className="text-xs uppercase tracking-[0.2em] text-[var(--dravix-ink-soft)]">Summary</div>
                <div className="mt-2 text-sm leading-7 text-[var(--dravix-ink-soft)]">{prediction?.explanation ?? 'No stored summary available.'}</div>
              </div>
            </div>
          )}
        </MaterialCard>
      </div>
      <FeatureImportanceTable drivers={prediction?.top_drivers ?? prediction?.interpretability?.top_3_drivers ?? []} />
    </PageContainer>
  );
}

export default HistoryPage;
