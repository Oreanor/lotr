import { HoverHint } from "@/components/ui/HoverHint";

// Horizontal labelled stat bar (strength/defense/…) used in the details panel.
// An optional `hint` turns the label into a hover tip explaining the stat.
export function StatBar({
  label,
  value,
  max,
  color,
  hint,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  hint?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="text-left">
      <div className="mb-1 flex justify-between text-xs text-neutral-400">
        {hint ? (
          <HoverHint label={hint}>
            <span className="cursor-help underline decoration-dotted decoration-neutral-600 underline-offset-2">
              {label}
            </span>
          </HoverHint>
        ) : (
          <span>{label}</span>
        )}
        <span className="text-neutral-200">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded bg-neutral-800">
        <div className={`h-full rounded ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
