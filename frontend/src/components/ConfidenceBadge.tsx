type Props = {
  confidence: string | { label?: string | null; score?: number | null } | null | undefined;
};

function ConfidenceBadge({ confidence }: Props) {
  const label = typeof confidence === 'string' ? confidence : confidence?.label || 'Unknown';
  const tone =
    label.toLowerCase() === 'high'
      ? 'bg-[#eef7f2] text-[#2f7a5c]'
      : label.toLowerCase() === 'medium'
        ? 'bg-[#fff4e8] text-[#a65a1f]'
        : 'bg-[#fff1f1] text-[#9E2A2A]';
  return <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${tone}`}>{label} confidence</span>;
}

export default ConfidenceBadge;
