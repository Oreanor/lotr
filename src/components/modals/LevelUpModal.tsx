import { useTranslation } from "react-i18next";
import { Heart } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { StatAllocator } from "@/components/ui/StatAllocator";
import { healthBarColorClass, healthBarWidthPct } from "@/components/ui/healthBar";
import { maxHpFromStats } from "@/game";
import type { Character, StatBonus } from "@/game";

// Spend the points earned on level-up across the hero's four stats.
export function LevelUpModal({
  hero,
  level,
  damage,
  existingBonus,
  draft,
  totalPoints,
  draftSpent,
  charName,
  onAdjust,
  onRandomize,
  onConfirm,
}: {
  hero: Character | null;
  level: number;
  damage: number;
  existingBonus: StatBonus;
  draft: StatBonus;
  totalPoints: number;
  draftSpent: number;
  charName: (id: string) => string;
  onAdjust: (stat: keyof StatBonus, delta: number) => void;
  onRandomize: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();
  const maxHealth = hero
    ? maxHpFromStats(
        hero.strength + existingBonus.strength + draft.strength,
        hero.defense + existingBonus.defense + draft.defense,
      )
    : 0;
  // Current HP is what the hero carries in (wounds and all) — spending points
  // raises the max cap but heals nothing, so it stays put while the bar's max
  // grows. Drafted points are deliberately left out of this figure.
  const health = hero
    ? Math.max(
        0,
        maxHpFromStats(hero.strength + existingBonus.strength, hero.defense + existingBonus.defense) -
          damage,
      )
    : 0;
  return (
    <Modal
      open={hero !== null}
      z="z-[65]"
      overlayClassName="bg-black/85"
      className="w-full max-w-xs border-amber-800 p-6 text-center"
    >
      {hero && (
        <>
          <h2 className="font-serif text-2xl text-neutral-100">{t("levelUp.title")}</h2>
          <div className="mx-auto mt-4 flex w-24 flex-col items-center gap-1">
            <div className="size-20 border border-neutral-700 bg-parchment">
              <img
                src={hero.icon}
                alt=""
                draggable="false"
                className="size-full select-none object-cover"
              />
            </div>
            <span className="w-full truncate text-center text-xs text-neutral-200">
              {charName(hero.id)}
            </span>
            <span className="w-full truncate text-center text-[10px] leading-tight text-neutral-400">
              {t("character.level", { n: level })}
            </span>
          </div>

          <div className="mt-3 text-left">
            <div className="mb-1 flex items-center justify-between text-xs text-neutral-400">
              <span className="flex items-center gap-1">
                <Heart className="size-3.5 text-emerald-500" />
                {t("character.health")}
              </span>
              <span className="tabular-nums text-neutral-200">
                {health}/{maxHealth}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded bg-neutral-800">
              <div
                className={`h-full ${healthBarColorClass(health, maxHealth)}`}
                style={{ width: `${healthBarWidthPct(health, maxHealth)}%` }}
              />
            </div>
          </div>

          <StatAllocator
            statValue={(stat) => hero[stat] + existingBonus[stat] + draft[stat]}
            onAdjust={onAdjust}
            canDecrement={(stat) => draft[stat] > 0}
            canIncrement={draftSpent < totalPoints}
            maxHealth={maxHealth}
            showHealth={false}
          />
          <p className="my-4 text-center text-xs text-amber-300">
            {t("levelUp.pointsLeft", { n: totalPoints - draftSpent })}
          </p>

          <button
            type="button"
            onClick={onRandomize}
            className="mt-4 w-full rounded border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700"
          >
            🎲 {t("levelUp.random")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={draftSpent < totalPoints}
            className="mt-2 w-full rounded border border-amber-700 bg-amber-900/40 px-4 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-900/70 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-amber-900/40"
          >
            {t("levelUp.confirm")}
          </button>
        </>
      )}
    </Modal>
  );
}
