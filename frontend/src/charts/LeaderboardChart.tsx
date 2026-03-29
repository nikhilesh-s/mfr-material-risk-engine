import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { RankedMaterial } from '../types/index';

type Props = {
  ranking: RankedMaterial[];
};

function LeaderboardChart({ ranking }: Props) {
  return (
    <div className="rounded-[1.5rem] border border-[var(--dravix-border)] bg-white p-4 shadow-[var(--dravix-shadow-soft)]">
      <div className="mb-4 text-lg font-light text-[var(--dravix-ink)]">Ranking leaderboard</div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={ranking} layout="vertical" margin={{ left: 20, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(118,33,35,0.1)" />
            <XAxis type="number" domain={[0, 100]} />
            <YAxis type="category" dataKey="material_name" width={180} />
            <Tooltip />
            <Bar dataKey="resistance_index" fill="#784F74" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default LeaderboardChart;
