import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Driver } from '../types/index';

type Props = {
  drivers: Driver[];
};

function FeatureImportanceBarChart({ drivers }: Props) {
  const data = drivers.map((driver) => ({
    feature: driver.feature,
    contribution: Number(driver.abs_magnitude.toFixed(4)),
  }));

  return (
    <div className="dravix-card rounded-[1.75rem] p-4">
      <div className="mb-4 text-lg font-light text-[var(--dravix-ink)]">Feature importance</div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 16, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(118,33,35,0.08)" />
            <XAxis type="number" tick={{ fill: '#762123', fontSize: 12 }} />
            <YAxis type="category" dataKey="feature" width={150} tick={{ fill: '#762123', fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="contribution" fill="#E8967F" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default FeatureImportanceBarChart;
