import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { designSystem } from '../theme/designSystem';

type SimulationDeltaIndicatorProps = {
  percentChange: number | null;
};

function SimulationDeltaIndicator({ percentChange }: SimulationDeltaIndicatorProps) {
  if (percentChange == null) {
    return (
      <div className="dravix-card flex items-center gap-3 rounded-[1.5rem] px-4 py-4 text-sm text-[#5f5042]">
        <Minus className="h-4 w-4" />
        <span>Risk Change Indicator unavailable</span>
      </div>
    );
  }

  const isImprovement = percentChange < 0;
  const Icon = isImprovement ? ArrowDownRight : ArrowUpRight;
  const toneColor = isImprovement ? '#2F8F5B' : '#C75B4A';
  const label = isImprovement ? 'improvement' : 'worse';

  return (
    <div className="dravix-card flex items-center justify-between gap-4 rounded-[1.5rem] px-4 py-4">
      <div>
        <div className="text-sm text-[#7c6857]">Risk Change Indicator</div>
        <div className="mt-1 text-xs text-[#5f5042]">Baseline vs modified fire-risk proxy</div>
      </div>
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{
            background: isImprovement ? 'rgba(47,143,91,0.12)' : 'rgba(199,91,74,0.12)',
            color: toneColor,
          }}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-right">
          <div className="text-2xl font-light" style={{ color: toneColor }}>
            {percentChange > 0 ? '+' : ''}{percentChange.toFixed(1)}%
          </div>
          <div className="text-xs uppercase tracking-[0.18em]" style={{ color: designSystem.backgroundColors.textMuted }}>
            {label}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SimulationDeltaIndicator;
