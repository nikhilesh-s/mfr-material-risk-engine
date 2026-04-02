import { useMemo, useState } from 'react';
import MaterialCard from '../components/MaterialCard';
import PageContainer from '../layout/PageContainer';
import { advisorService } from '../services/advisorService';
import type { AdvisorChatResponse, AdvisorResponse } from '../types/index';

type ChatItem = {
  role: 'assistant' | 'user';
  body: string;
  meta?: string;
};

function AdvisorPage() {
  const [analysisId, setAnalysisId] = useState('');
  const [question, setQuestion] = useState('What property tradeoffs matter most for this material?');
  const [advisor, setAdvisor] = useState<AdvisorResponse | null>(null);
  const [chat, setChat] = useState<AdvisorChatResponse | null>(null);
  const [advisorLoading, setAdvisorLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);

  const messages = useMemo<ChatItem[]>(() => {
    const items: ChatItem[] = [];

    if (advisor) {
      const metaParts: string[] = [];
      if (advisor.design_tradeoffs?.length) {
        metaParts.push(`Tradeoffs: ${advisor.design_tradeoffs.join(' | ')}`);
      }
      if (advisor.recommended_tests?.length) {
        metaParts.push(`Recommended tests: ${advisor.recommended_tests.join(', ')}`);
      }
      items.push({
        role: 'assistant',
        body: advisor.advisor_summary,
        meta: metaParts.join('\n') || undefined,
      });
    }

    if (chat && question.trim()) {
      items.push({
        role: 'user',
        body: question.trim(),
      });
      items.push({
        role: 'assistant',
        body: chat.answer,
        meta: chat.grounded_sources.length ? `Sources: ${chat.grounded_sources.join(', ')}` : undefined,
      });
    }

    return items;
  }, [advisor, chat, question]);

  const loadAdvisor = async () => {
    setAdvisorLoading(true);
    try {
      setAdvisor(await advisorService.getAdvisor(analysisId));
      setChat(null);
    } finally {
      setAdvisorLoading(false);
    }
  };

  const askQuestion = async () => {
    setChatLoading(true);
    try {
      setChat(
        await advisorService.chatAdvisor({
          analysis_id: analysisId,
          user_question: question,
        }),
      );
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <PageContainer eyebrow="Advisor" title="Advisor">
      <MaterialCard title="Advisor chat">
        <div className="grid gap-4">
          <input
            value={analysisId}
            onChange={(e) => setAnalysisId(e.target.value)}
            placeholder="DRX-20260328-1234"
            className="rounded-xl border border-[#762123]/10 bg-[#f8f8f8] px-4 py-3 text-sm"
          />
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={4}
            className="rounded-xl border border-[#762123]/10 bg-[#f8f8f8] px-4 py-3 text-sm"
          />
          <div className="flex flex-wrap gap-3">
            <button
              onClick={loadAdvisor}
              disabled={advisorLoading}
              className="rounded-full bg-gradient-to-r from-[#784F74] to-[#E8967F] px-4 py-2 text-sm text-white disabled:opacity-60"
            >
              {advisorLoading ? 'Loading…' : 'Load advisor'}
            </button>
            <button
              onClick={askQuestion}
              disabled={chatLoading}
              className="rounded-full border border-[var(--dravix-border)] px-4 py-2 text-sm text-[var(--dravix-ink)] disabled:opacity-60"
            >
              {chatLoading ? 'Thinking…' : 'Ask'}
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {messages.length ? (
            messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`max-w-[88%] rounded-[1.5rem] px-4 py-4 text-sm leading-7 ${
                  message.role === 'user'
                    ? 'ml-auto bg-gradient-to-r from-[#784F74] to-[#E8967F] text-white'
                    : 'bg-[#f8f8f8] text-[var(--dravix-ink)]'
                }`}
              >
                <div>{message.body}</div>
                {message.meta ? (
                  <div
                    className={`mt-3 whitespace-pre-line text-xs ${
                      message.role === 'user' ? 'text-white/72' : 'text-[var(--dravix-ink-soft)]'
                    }`}
                  >
                    {message.meta}
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <div className="rounded-[1.5rem] bg-[#f8f8f8] px-4 py-6 text-sm text-[var(--dravix-ink-soft)]">
              Load an analysis, then ask a question.
            </div>
          )}
          {chatLoading ? (
            <div className="max-w-[88%] rounded-[1.5rem] bg-[#f8f8f8] px-4 py-4 text-sm text-[var(--dravix-ink-soft)]">
              Advisor is generating a response…
            </div>
          ) : null}
        </div>
      </MaterialCard>
    </PageContainer>
  );
}

export default AdvisorPage;
