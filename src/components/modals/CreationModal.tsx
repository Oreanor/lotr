import { useTranslation } from "react-i18next";
import { Heart } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { StatAllocator } from "@/components/ui/StatAllocator";
import { healthBarColorClass, healthBarWidthPct } from "@/components/ui/healthBar";
import { CREATION_POINTS, maxHpFromStats } from "@/game";
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
  const { t, i18n } = useTranslation();
  const maxHealth = maxHpFromStats(hero.strength + bonus.strength, hero.defense + bonus.defense);
  return (
    <Modal open={open} z="z-[60]" overlayClassName="bg-black/85" className="relative w-full max-w-xs border-amber-800 p-6 text-center">
      {/* Pick the language right here, before the journey begins. */}
      <button
        type="button"
        onClick={() => i18n.changeLanguage(i18n.language === "en" ? "ru" : "en")}
        aria-label="Language"
        className="absolute right-3 top-3 flex h-8 min-w-8 items-center justify-center rounded border border-neutral-700 bg-neutral-900/90 px-2 text-xs font-bold text-neutral-200 transition hover:bg-neutral-800"
      >
        {i18n.language === "en" ? "RU" : "EN"}
      </button>
      <h2 className="font-serif text-2xl text-neutral-100">{t("creation.title")}</h2>
      <div className="mx-auto mt-4 flex w-24 flex-col items-center gap-1">
        <div className="size-20 border border-neutral-700 bg-parchment">
          <img
            src={hero.icon}
            alt=""
            draggable="false"
            className="size-full select-none object-cover"
          />
        </div>
        <span className="w-full truncate text-center text-xs text-neutral-200">{heroName}</span>
      </div>

      <div className="mt-3 text-left">
        <div className="mb-1 flex items-center justify-between text-xs text-neutral-400">
          <span className="flex items-center gap-1">
            <Heart className="size-3.5 text-emerald-500" />
            {t("character.health")}
          </span>
          <span className="tabular-nums text-neutral-200">
            {maxHealth}/{maxHealth}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded bg-neutral-800">
          <div
            className={`h-full ${healthBarColorClass(maxHealth, maxHealth)}`}
            style={{ width: `${healthBarWidthPct(maxHealth, maxHealth)}%` }}
          />
        </div>
      </div>

      <StatAllocator
        statValue={(stat) => hero[stat] + bonus[stat]}
        onAdjust={onAdjust}
        canDecrement={(stat) => bonus[stat] > 0}
        canIncrement={spent < CREATION_POINTS}
        maxHealth={maxHealth}
        showHealth={false}
      />
      <p className="my-4 text-center text-xs text-amber-300">
        {t("creation.pointsLeft", { n: CREATION_POINTS - spent })}
      </p>

      <button
        type="button"
        onClick={onRandomize}
        className="w-full rounded border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700"
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
      <button
        type="button"
        onClick={onAutoPlay}
        className="mt-8 w-full rounded border border-emerald-700 bg-emerald-900/40 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-900/70"
      >
        {t("creation.autoPlay")}
      </button>
    </Modal>
  );
}
