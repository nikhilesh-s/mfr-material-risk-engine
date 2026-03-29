type Props = {
  confidence: string | { label?: string | null; score?: number | null } | null | undefined;
};

function ConfidenceBadge({ confidence }: Props) {
  const label = typeof confidence === 'string' ? confidence : confidence?.label || 'Unknown';
  const tone =
    label.toLowerCase() === 'high'
      ? 'bg-emerald-100 text-emerald-800'
      : label.toLowerCase() === 'medium'
        ? 'bg-amber-100 text-amber-800'
        : 'bg-rose-100 text-rose-800';
  return <span className={`rounded-full px-3 py-1 text-xs font-medium ${tone}`}>{label} confidence</span>;
}

export default ConfidenceBadge;
