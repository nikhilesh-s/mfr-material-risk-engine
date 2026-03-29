import ConfidenceBadge from './ConfidenceBadge';
import MaterialCard from './MaterialCard';
import type { PredictionResponse } from '../types/index';

type Props = {
  prediction: PredictionResponse | null;
};

function PredictionResultCard({ prediction }: Props) {
  if (!prediction) {
    return (
      <MaterialCard
        title="Prediction result"
        subtitle="Run a material screen to populate score, confidence, subscores, and experiment guidance."
      />
    );
  }

  return (
    <MaterialCard title={prediction.material_name} subtitle={prediction.explanation}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[1.5rem] bg-gradient-to-r from-[#784F74] to-[#E8967F] p-4 text-white">
          <div className="text-xs uppercase tracking-[0.24em] text-white/70">DFRS</div>
          <div className="mt-2 text-3xl font-light">{prediction.DFRS?.toFixed(3) ?? 'n/a'}</div>
        </div>
        <div className="rounded-[1.5rem] bg-[#f8f8f8] p-4">
          <div className="text-xs uppercase tracking-[0.24em] text-[var(--dravix-ink-soft)]">Risk score</div>
          <div className="mt-2 text-3xl font-light text-[var(--dravix-ink)]">{prediction.risk_score.toFixed(1)}</div>
        </div>
        <div className="rounded-[1.5rem] bg-[#f8f8f8] p-4">
          <div className="text-xs uppercase tracking-[0.24em] text-[var(--dravix-ink-soft)]">Resistance index</div>
          <div className="mt-2 text-3xl font-light text-[var(--dravix-ink)]">{prediction.resistance_index.toFixed(1)}</div>
        </div>
        <div className="rounded-[1.5rem] bg-[#f8f8f8] p-4">
          <div className="text-xs uppercase tracking-[0.24em] text-[var(--dravix-ink-soft)]">Confidence</div>
          <div className="mt-3"><ConfidenceBadge confidence={prediction.confidence} /></div>
        </div>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-[1.5rem] border border-[var(--dravix-border)] p-4">
          <div className="text-sm text-[var(--dravix-ink-soft)]">Recommended tests</div>
          <ul className="mt-3 space-y-2 text-sm text-[var(--dravix-ink)]">
            {prediction.recommended_tests.map((item) => <li key={item}>• {item}</li>)}
          </ul>
        </div>
        <div className="rounded-[1.5rem] border border-[var(--dravix-border)] p-4">
          <div className="text-sm text-[var(--dravix-ink-soft)]">Design suggestions</div>
          <ul className="mt-3 space-y-2 text-sm text-[var(--dravix-ink)]">
            {prediction.counterfactual_suggestions.map((item) => <li key={item}>• {item}</li>)}
          </ul>
        </div>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {Object.entries(prediction.subscores ?? {}).slice(0, 3).map(([key, value]) => (
          <div key={key} className="rounded-[1.25rem] bg-[#f8f8f8] p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-[var(--dravix-ink-soft)]">{key.replaceAll('_', ' ')}</div>
            <div className="mt-2 text-2xl font-light text-[var(--dravix-ink)]">{Number(value).toFixed(2)}</div>
          </div>
        ))}
      </div>
    </MaterialCard>
  );
}

export default PredictionResultCard;
