import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { RankedMaterial } from '../types/index';

type Props = {
  ranking: RankedMaterial[];
};

function LeaderboardChart({ ranking }: Props) {
  return (
    <div className="dravix-card rounded-[1.75rem] p-4">
      <div className="mb-4 text-lg font-light text-[var(--dravix-ink)]">Ranking leaderboard</div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={ranking} layout="vertical" margin={{ left: 20, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(118,33,35,0.08)" />
            <XAxis type="number" domain={[0, 100]} tick={{ fill: '#762123', fontSize: 12 }} />
            <YAxis type="category" dataKey="material_name" width={180} tick={{ fill: '#762123', fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="resistance_index" fill="#784F74" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default LeaderboardChart;
