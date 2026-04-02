import { useMemo, useState } from 'react';
import MaterialCard from '../components/MaterialCard';
import PageContainer from '../layout/PageContainer';
import { advisorService } from '../services/advisorService';
import type { AdvisorChatResponse, AdvisorResponse } from '../types/index';

type AssistantPayload = {
  summary: string;
  tradeoffs: string[];
  recommendedTests: string[];
  propertyTargets: Array<{ key: string; value: string }>;
  sources?: string[];
};

type ChatItem = {
  role: 'assistant' | 'user';
  body: string | AssistantPayload;
};

function normalizeStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : String(item ?? '').trim()))
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  return [];
}

function normalizePropertyTargets(value: unknown): Array<{ key: string; value: string }> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return [];
  }
  return Object.entries(value as Record<string, unknown>)
    .map(([key, rawValue]) => ({
      key,
      value: String(rawValue ?? '').trim(),
    }))
    .filter((item) => item.value);
}

function AdvisorPage() {
  const [analysisId, setAnalysisId] = useState('');
  const [question, setQuestion] = useState('What property tradeoffs matter most for this material?');
  const [advisor, setAdvisor] = useState<AdvisorResponse | null>(null);
  const [chat, setChat] = useState<AdvisorChatResponse | null>(null);
  const [advisorLoading, setAdvisorLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messages = useMemo<ChatItem[]>(() => {
    const items: ChatItem[] = [];

    if (advisor) {
      const tradeoffs = normalizeStringList(advisor.design_tradeoffs);
      const recommendedTests = normalizeStringList(advisor.recommended_tests);
      const propertyTargets = normalizePropertyTargets(advisor.property_targets);
      items.push({
        role: 'assistant',
        body: {
          summary: advisor.advisor_summary,
          tradeoffs,
          recommendedTests,
          propertyTargets,
        },
      });
    }

    if (chat && question.trim()) {
      items.push({
        role: 'user',
        body: question.trim(),
      });
      items.push({
        role: 'assistant',
        body: {
          summary: chat.answer,
          tradeoffs: [],
          recommendedTests: [],
          propertyTargets: [],
          sources: normalizeStringList(chat.grounded_sources),
        },
      });
    }

    return items;
  }, [advisor, chat, question]);

  const loadAdvisor = async () => {
    setAdvisorLoading(true);
    setError(null);
    try {
      setAdvisor(await advisorService.getAdvisor(analysisId));
      setChat(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load advisor');
    } finally {
      setAdvisorLoading(false);
    }
  };

  const askQuestion = async () => {
    setChatLoading(true);
    setError(null);
    try {
      setChat(
        await advisorService.chatAdvisor({
          analysis_id: analysisId,
          user_question: question,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get advisor response');
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <PageContainer eyebrow="Advisor" title="Advisor">
      <MaterialCard title="Advisor">
        <div className="grid gap-4">
          <div className="rounded-[1.5rem] border border-[var(--dravix-border)] bg-[#f8f8f8] p-4">
            <div className="mb-3 text-xs uppercase tracking-[0.18em] text-[var(--dravix-ink-soft)]">
              Input analysis ID
            </div>
            <div className="flex flex-wrap gap-3">
              <input
                value={analysisId}
                onChange={(e) => setAnalysisId(e.target.value)}
                placeholder="DRX-20260328-1234"
                className="min-w-[18rem] flex-1 rounded-xl border border-[#762123]/10 bg-white px-4 py-3 text-sm"
              />
              <button
                onClick={loadAdvisor}
                disabled={advisorLoading || !analysisId.trim()}
                className="rounded-full bg-gradient-to-r from-[#784F74] to-[#E8967F] px-4 py-2 text-sm text-white disabled:opacity-60"
              >
                {advisorLoading ? 'Opening…' : 'Open analysis'}
              </button>
            </div>
          </div>

          {advisor ? (
            <div className="rounded-[1.5rem] border border-[var(--dravix-border)] bg-[#f8f8f8] p-4">
              <div className="mb-3 text-xs uppercase tracking-[0.18em] text-[var(--dravix-ink-soft)]">
                Ask advisor
              </div>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-[#762123]/10 bg-white px-4 py-3 text-sm"
              />
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  onClick={askQuestion}
                  disabled={chatLoading || !question.trim()}
                  className="rounded-full border border-[var(--dravix-border)] px-4 py-2 text-sm text-[var(--dravix-ink)] disabled:opacity-60"
                >
                  {chatLoading ? 'Thinking…' : 'Ask'}
                </button>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            {advisor ? (
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--dravix-ink-soft)]">
                Analysis loaded: {analysisId}
              </div>
            ) : null}
          </div>
          {error ? <div className="text-sm text-[#9E2A2A]">{error}</div> : null}
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
                {typeof message.body === 'string' ? (
                  <div>{message.body}</div>
                ) : (
                  <div className="space-y-4">
                    <div>{message.body.summary}</div>
                    {message.body.tradeoffs.length ? (
                      <div>
                        <div className="mb-2 text-xs uppercase tracking-[0.18em] text-[var(--dravix-ink-soft)]">Tradeoffs</div>
                        <ul className="space-y-2">
                          {message.body.tradeoffs.map((item) => (
                            <li key={item} className="text-sm leading-6">• {item}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {message.body.recommendedTests.length ? (
                      <div>
                        <div className="mb-2 text-xs uppercase tracking-[0.18em] text-[var(--dravix-ink-soft)]">Recommended tests</div>
                        <ul className="space-y-2">
                          {message.body.recommendedTests.map((item) => (
                            <li key={item} className="text-sm leading-6">• {item}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {message.body.propertyTargets.length ? (
                      <div>
                        <div className="mb-2 text-xs uppercase tracking-[0.18em] text-[var(--dravix-ink-soft)]">Property targets</div>
                        <div className="grid gap-2 md:grid-cols-2">
                          {message.body.propertyTargets.map((item) => (
                            <div key={item.key} className="rounded-[1rem] border border-[#762123]/10 bg-white/60 px-3 py-2 text-sm">
                              <div className="text-[var(--dravix-ink-soft)]">{item.key}</div>
                              <div className="mt-1 text-[var(--dravix-ink)]">{item.value}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {message.body.sources?.length ? (
                      <div className="text-xs text-[var(--dravix-ink-soft)]">
                        Sources: {message.body.sources.join(', ')}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="rounded-[1.5rem] bg-[#f8f8f8] px-4 py-6 text-sm text-[var(--dravix-ink-soft)]">
              Open an analysis ID to begin the conversation.
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
