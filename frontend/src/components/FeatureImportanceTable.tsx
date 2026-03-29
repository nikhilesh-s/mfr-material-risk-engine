import type { Driver } from '../types/index';

type Props = {
  drivers: Driver[];
};

function FeatureImportanceTable({ drivers }: Props) {
  if (!drivers.length) {
    return (
      <div className="dravix-card rounded-[1.75rem] p-6">
        <div className="text-lg font-light text-[var(--dravix-ink)]">Driver breakdown</div>
        <div className="mt-4 text-sm text-[var(--dravix-ink-soft)]">Run an analysis to inspect feature-level contributions.</div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-[var(--dravix-border)] bg-white shadow-[var(--dravix-shadow-card)]">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-[#f8f8f8] text-[var(--dravix-ink-soft)]">
          <tr>
            <th className="px-4 py-3 font-medium">Feature</th>
            <th className="px-4 py-3 font-medium">Contribution</th>
            <th className="px-4 py-3 font-medium">Direction</th>
          </tr>
        </thead>
        <tbody>
          {drivers.map((driver) => (
            <tr key={driver.feature} className="border-t border-[var(--dravix-border)]">
              <td className="px-4 py-3 text-[var(--dravix-ink)]">{driver.feature}</td>
              <td className="px-4 py-3 text-[var(--dravix-ink)]">{driver.abs_magnitude.toFixed(4)}</td>
              <td className="px-4 py-3 text-[var(--dravix-ink-soft)]">{driver.direction}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default FeatureImportanceTable;
