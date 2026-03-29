import { useState } from 'react';
import MaterialCard from '../components/MaterialCard';
import PageContainer from '../layout/PageContainer';
import { reportsService } from '../services/reportsService';
import type { ExportResponse, TdsResponse } from '../types/index';

function ReportsPage() {
  const [analysisId, setAnalysisId] = useState('');
  const [tds, setTds] = useState<TdsResponse | null>(null);
  const [report, setReport] = useState<ExportResponse | null>(null);

  const downloadPdf = async () => {
    const blob = await reportsService.downloadTdsPdf(analysisId);
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <PageContainer eyebrow="Reports" title="Technical datasheets and exports" description="Load technical datasheets, download PDFs, and export report payloads from persisted analyses.">
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <MaterialCard title="Report controls">
          <div className="grid gap-4">
            <input value={analysisId} onChange={(e) => setAnalysisId(e.target.value)} placeholder="DRX-20260328-1234" className="rounded-2xl border border-[var(--dravix-border)] bg-[var(--dravix-panel)] px-4 py-3 text-sm" />
            <div className="flex flex-wrap gap-3">
              <button onClick={() => reportsService.getTds(analysisId).then(setTds)} className="rounded-full bg-[var(--dravix-gradient-primary)] px-4 py-2 text-sm text-white">Load TDS</button>
              <button onClick={downloadPdf} className="rounded-full border border-[var(--dravix-border)] px-4 py-2 text-sm text-[var(--dravix-ink)]">Download PDF</button>
              <button onClick={() => reportsService.downloadReport(analysisId, 'json').then(setReport)} className="rounded-full border border-[var(--dravix-border)] px-4 py-2 text-sm text-[var(--dravix-ink)]">Export report</button>
            </div>
          </div>
        </MaterialCard>
        <MaterialCard title="Technical datasheet">
          <pre className="max-h-96 overflow-auto rounded-2xl bg-[var(--dravix-panel)] p-4 text-xs">{JSON.stringify(tds ?? {}, null, 2)}</pre>
        </MaterialCard>
      </div>
      <MaterialCard title="Export payload">
        <pre className="max-h-96 overflow-auto rounded-2xl bg-[var(--dravix-panel)] p-4 text-xs">{report?.content ?? 'Export a report to populate this panel.'}</pre>
      </MaterialCard>
    </PageContainer>
  );
}

export default ReportsPage;
