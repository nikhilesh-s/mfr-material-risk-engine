import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type Props = {
  curves: Record<string, Array<{ x: number; y: number }>>;
};

function SensitivityChart({ curves }: Props) {
  const firstEntry = Object.entries(curves)[0];
  if (!firstEntry) {
    return (
      <div className="rounded-[1.5rem] border border-[var(--dravix-border)] bg-white p-4 shadow-[var(--dravix-shadow-soft)]">
        <div className="text-sm text-[var(--dravix-ink-soft)]">Run an analysis to view property response curves.</div>
      </div>
    );
  }

  const [featureName, values] = firstEntry;
  return (
    <div className="rounded-[1.5rem] border border-[var(--dravix-border)] bg-white p-4 shadow-[var(--dravix-shadow-soft)]">
      <div className="mb-4 text-lg font-light text-[var(--dravix-ink)]">Sensitivity response curve</div>
      <div className="text-sm text-[var(--dravix-ink-soft)]">{featureName}</div>
      <div className="mt-4 h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={values}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(118,33,35,0.1)" />
            <XAxis dataKey="x" />
            <YAxis dataKey="y" />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="y" stroke="#9E2A2A" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default SensitivityChart;
