import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { designSystem } from '../theme/designSystem';
import type { RankedMaterial } from '../types';

type LeaderboardChartProps = {
  ranking: RankedMaterial[];
};

type LeaderboardDatum = {
  material_name: string;
  risk_score: number;
  confidence: string;
  rank: number;
};

const CONFIDENCE_COLORS: Record<string, string> = {
  High: '#232422',
  Medium: '#FF8D7C',
  Low: '#D0C7B5',
};

function TooltipContent({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: LeaderboardDatum }>;
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const datum = payload[0].payload;
  return (
    <div
      className="rounded-[1rem] border px-4 py-3 text-sm shadow-[0_12px_30px_rgba(35,36,34,0.14)]"
      style={{
        background: designSystem.backgroundColors.surface,
        borderColor: designSystem.backgroundColors.border,
        color: designSystem.backgroundColors.text,
      }}
    >
      <div className="font-medium">{datum.material_name}</div>
      <div className="mt-1">Risk score: {datum.risk_score.toFixed(1)}</div>
      <div>Confidence: {datum.confidence}</div>
      <div>Rank: {datum.rank}</div>
    </div>
  );
}

function LeaderboardChart({ ranking }: LeaderboardChartProps) {
  const data: LeaderboardDatum[] = ranking.map((row) => ({
    material_name: row.material_name,
    risk_score: row.risk_score,
    confidence: row.confidence,
    rank: row.rank,
  }));

  if (data.length === 0) {
    return null;
  }

  const chartHeight = Math.max(280, data.length * 54);

  return (
    <div className="dravix-card rounded-[2rem] p-6">
      <div className="mb-5">
        <div className="text-xs uppercase tracking-[0.22em]" style={{ color: designSystem.backgroundColors.accentCoral }}>
          Material Leaderboard
        </div>
        <h3 className="mt-2 text-2xl font-light text-[#231a14]">Lowest-risk candidates rise to the top.</h3>
        <p className="mt-2 text-sm text-[#5f5042]">
          Bar length shows fire-risk score. Lower-risk materials appear higher on the leaderboard.
        </p>
      </div>
      <div style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 8, right: 36, left: 32, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(35,36,34,0.08)" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: designSystem.backgroundColors.textMuted, fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              domain={[0, 100]}
            />
            <YAxis
              type="category"
              dataKey="material_name"
              width={140}
              tick={{ fill: designSystem.backgroundColors.text, fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<TooltipContent />} cursor={{ fill: 'rgba(255,220,106,0.08)' }} />
            <Bar dataKey="risk_score" radius={[0, 12, 12, 0]}>
              {data.map((entry) => (
                <Cell
                  key={entry.material_name}
                  fill={CONFIDENCE_COLORS[entry.confidence] ?? designSystem.backgroundColors.accentCoral}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-[#5f5042]">
        <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 dravix-panel">
          <span className="inline-flex h-2.5 w-2.5 rounded-full" style={{ background: CONFIDENCE_COLORS.High }} />
          High confidence
        </span>
        <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 dravix-panel">
          <span className="inline-flex h-2.5 w-2.5 rounded-full" style={{ background: CONFIDENCE_COLORS.Medium }} />
          Medium confidence
        </span>
        <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 dravix-panel">
          <span className="inline-flex h-2.5 w-2.5 rounded-full" style={{ background: CONFIDENCE_COLORS.Low }} />
          Low confidence
        </span>
      </div>
    </div>
  );
}

export default LeaderboardChart;
