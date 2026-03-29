import type { Driver } from '../types/index';

type Props = {
  drivers: Driver[];
};

function FeatureImportanceTable({ drivers }: Props) {
  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-[var(--dravix-border)] bg-white shadow-[var(--dravix-shadow-soft)]">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-[var(--dravix-panel)] text-[var(--dravix-ink-soft)]">
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
              <td className="px-4 py-3 text-[var(--dravix-ink)]">{driver.contribution.toFixed(4)}</td>
              <td className="px-4 py-3 text-[var(--dravix-ink-soft)]">{driver.direction}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default FeatureImportanceTable;
