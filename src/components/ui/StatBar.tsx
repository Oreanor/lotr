// Horizontal labelled stat bar (strength/defense/…) used in the details panel.
export function StatBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="text-left">
      <div className="mb-1 flex justify-between text-xs text-neutral-400">
        <span>{label}</span>
        <span className="text-neutral-200">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded bg-neutral-800">
        <div className={`h-full rounded ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
