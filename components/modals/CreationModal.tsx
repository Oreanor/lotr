import { useTranslation } from "react-i18next";
import { Modal } from "@/components/ui/Modal";
import { StatAllocator } from "@/components/ui/StatAllocator";
import { CREATION_POINTS } from "@/game";
import type { Character, StatBonus } from "@/game";

// Opening hero-creation: distribute CREATION_POINTS over Frodo's stats (or
// hand off to auto-play). Shown until the player begins the journey.
export function CreationModal({
  open,
  hero,
  heroName,
  bonus,
  spent,
  onAdjust,
  onRandomize,
  onConfirm,
  onAutoPlay,
}: {
  open: boolean;
  hero: Character;
  heroName: string;
  bonus: StatBonus;
  spent: number;
  onAdjust: (stat: keyof StatBonus, delta: number) => void;
  onRandomize: () => void;
  onConfirm: () => void;
  onAutoPlay: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal open={open} z="z-[60]" overlayClassName="bg-black/85" className="w-full max-w-xs border-amber-800 p-6 text-center">
      <img
        src={hero.icon}
        alt=""
        draggable="false"
        className="mx-auto size-20 select-none border border-neutral-700 bg-parchment object-cover"
      />
      <h2 className="mt-3 font-serif text-2xl text-neutral-100">{t("creation.title")}</h2>
      <p className="mt-1 text-sm text-neutral-300">{heroName}</p>
      <p className="mt-3 text-xs text-amber-300">
        {t("creation.pointsLeft", { n: CREATION_POINTS - spent })}
      </p>

      <StatAllocator
        statValue={(stat) => hero[stat] + bonus[stat]}
        onAdjust={onAdjust}
        canDecrement={(stat) => bonus[stat] > 0}
        canIncrement={spent < CREATION_POINTS}
        strengthValue={hero.strength + bonus.strength}
      />

      <button
        type="button"
        onClick={onAutoPlay}
        className="mt-4 w-full rounded border border-emerald-700 bg-emerald-900/40 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-900/70"
      >
        {t("creation.autoPlay")}
      </button>
      <button
        type="button"
        onClick={onRandomize}
        className="mt-4 w-full rounded border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700"
      >
        🎲 {t("creation.random")}
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={spent < CREATION_POINTS}
        className="mt-2 w-full rounded border border-amber-700 bg-amber-900/40 px-4 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-900/70 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-amber-900/40"
      >
        {t("creation.start")}
      </button>
    </Modal>
  );
}
