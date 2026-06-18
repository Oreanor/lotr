import { useTranslation } from "react-i18next";
import { Heart } from "lucide-react";
import { HoverHint } from "@/components/ui/HoverHint";
import type { StatBonus } from "@/game";

const STATS: (keyof StatBonus)[] = ["strength", "defense", "intelligence", "luck"];

// Shared −/value/+ stat distribution used by hero creation and level-up. The
// caller decides each stat's displayed value and whether buttons are enabled.
export function StatAllocator({
  statValue,
  onAdjust,
  canDecrement,
  canIncrement,
  maxHealth,
  showHealth = true,
}: {
  statValue: (stat: keyof StatBonus) => number;
  onAdjust: (stat: keyof StatBonus, delta: number) => void;
  canDecrement: (stat: keyof StatBonus) => boolean;
  canIncrement: boolean;
  maxHealth: number;
  showHealth?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <>
      <div className="mt-3 space-y-2">
        {STATS.map((stat) => (
          <div key={stat} className="flex items-center justify-between gap-2">
            <HoverHint label={t(`character.${stat}Hint`)}>
              <span className="cursor-help text-sm text-neutral-300 underline decoration-dotted decoration-neutral-600 underline-offset-2">
                {t(`character.${stat}`)}
              </span>
            </HoverHint>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onAdjust(stat, -1)}
                disabled={!canDecrement(stat)}
                aria-label={`-${t(`character.${stat}`)}`}
                className="flex size-7 items-center justify-center rounded border border-neutral-700 bg-neutral-800 text-base font-semibold text-neutral-100 transition hover:bg-neutral-700 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-neutral-800"
              >
                −
              </button>
              <span className="w-6 text-center text-base font-semibold tabular-nums text-neutral-100">
                {statValue(stat)}
              </span>
              <button
                type="button"
                onClick={() => onAdjust(stat, 1)}
                disabled={!canIncrement}
                aria-label={`+${t(`character.${stat}`)}`}
                className="flex size-7 items-center justify-center rounded border border-neutral-700 bg-neutral-800 text-base font-semibold text-neutral-100 transition hover:bg-neutral-700 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-neutral-800"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>
      {showHealth && (
        <p className="mt-3 flex items-center justify-center gap-1 text-xs text-neutral-400">
          <Heart className="size-3 text-emerald-500" />
          {maxHealth}
        </p>
      )}
    </>
  );
}
