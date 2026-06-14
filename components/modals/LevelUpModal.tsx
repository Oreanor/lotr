import { useTranslation } from "react-i18next";
import { Modal } from "@/components/ui/Modal";
import { StatAllocator } from "@/components/ui/StatAllocator";
import type { Character, StatBonus } from "@/game";

// Spend the points earned on level-up across the hero's four stats.
export function LevelUpModal({
  hero,
  level,
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
  return (
    <Modal
      open={hero !== null}
      z="z-[65]"
      overlayClassName="bg-black/85"
      className="w-full max-w-xs border-amber-800 p-6 text-center"
    >
      {hero && (
        <>
          <img
            src={hero.icon}
            alt=""
            draggable="false"
            className="mx-auto size-20 select-none border border-neutral-700 bg-parchment object-cover"
          />
          <h2 className="mt-3 font-serif text-2xl text-neutral-100">{t("levelUp.title")}</h2>
          <p className="mt-1 text-sm text-neutral-300">
            {charName(hero.id)} · {t("character.level", { n: level })}
          </p>
          <p className="mt-3 text-xs text-amber-300">
            {t("levelUp.pointsLeft", { n: totalPoints - draftSpent })}
          </p>

          <StatAllocator
            statValue={(stat) => hero[stat] + existingBonus[stat] + draft[stat]}
            onAdjust={onAdjust}
            canDecrement={(stat) => draft[stat] > 0}
            canIncrement={draftSpent < totalPoints}
            strengthValue={hero.strength + existingBonus.strength + draft.strength}
          />

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
