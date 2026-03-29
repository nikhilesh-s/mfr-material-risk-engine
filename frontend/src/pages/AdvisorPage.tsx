import { useState } from 'react';
import MaterialCard from '../components/MaterialCard';
import PageContainer from '../layout/PageContainer';
import { advisorService } from '../services/advisorService';
import type { AdvisorChatResponse, AdvisorResponse } from '../types/index';

function AdvisorPage() {
  const [analysisId, setAnalysisId] = useState('');
  const [question, setQuestion] = useState('What property tradeoffs matter most for this material?');
  const [advisor, setAdvisor] = useState<AdvisorResponse | null>(null);
  const [chat, setChat] = useState<AdvisorChatResponse | null>(null);

  return (
    <PageContainer eyebrow="Advisor" title="Grounded AI material advisor" description="Retrieve stored advisor guidance for an analysis or ask a grounded follow-up question against the persisted result.">
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <MaterialCard title="Advisor query">
          <div className="grid gap-4">
            <input value={analysisId} onChange={(e) => setAnalysisId(e.target.value)} placeholder="DRX-20260328-1234" className="rounded-2xl border border-[var(--dravix-border)] bg-[var(--dravix-panel)] px-4 py-3 text-sm" />
            <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={4} className="rounded-2xl border border-[var(--dravix-border)] bg-[var(--dravix-panel)] px-4 py-3 text-sm" />
            <div className="flex gap-3">
              <button onClick={() => advisorService.getAdvisor(analysisId).then(setAdvisor)} className="rounded-full bg-[var(--dravix-gradient-primary)] px-4 py-2 text-sm text-white">Load advisor</button>
              <button onClick={() => advisorService.chatAdvisor({ analysis_id: analysisId, user_question: question }).then(setChat)} className="rounded-full border border-[var(--dravix-border)] px-4 py-2 text-sm text-[var(--dravix-ink)]">Ask question</button>
            </div>
          </div>
        </MaterialCard>
        <MaterialCard title="Advisor output">
          <div className="space-y-4 text-sm">
            <div>{advisor?.advisor_summary ?? 'Load an advisor response to populate this panel.'}</div>
            <ul className="space-y-2">{(advisor?.design_tradeoffs ?? []).map((item) => <li key={item}>• {item}</li>)}</ul>
            <pre className="rounded-2xl bg-[var(--dravix-panel)] p-4 text-xs">{JSON.stringify(advisor?.property_targets ?? {}, null, 2)}</pre>
          </div>
        </MaterialCard>
      </div>
      <MaterialCard title="Advisor chat">
        <div className="text-sm text-[var(--dravix-ink)]">{chat?.answer ?? 'Ask a grounded question to populate this panel.'}</div>
        {chat ? <div className="mt-3 text-xs text-[var(--dravix-ink-soft)]">Sources: {chat.grounded_sources.join(', ')}</div> : null}
      </MaterialCard>
    </PageContainer>
  );
}

export default AdvisorPage;
