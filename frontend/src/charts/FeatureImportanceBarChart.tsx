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
    <div className="rounded-[1.5rem] border border-[var(--dravix-border)] bg-white p-4 shadow-[var(--dravix-shadow-soft)]">
      <div className="mb-4 text-lg font-light text-[var(--dravix-ink)]">Feature importance</div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 16, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(118,33,35,0.1)" />
            <XAxis type="number" />
            <YAxis type="category" dataKey="feature" width={150} />
            <Tooltip />
            <Bar dataKey="contribution" fill="#E8967F" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default FeatureImportanceBarChart;
