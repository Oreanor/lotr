import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Heart } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { PortalBubble } from "@/components/ui/PortalBubble";
import { StatAllocator } from "@/components/ui/StatAllocator";
import { healthBarColorClass, healthBarWidthPct } from "@/components/ui/healthBar";
import { iconVariant, maxHpFromStats } from "@/game";
import type { Character, StatBonus } from "@/game";

// The remembered behaviour of the level-up split button. "random" spends only
// the open hero's points (the classic single roll); every *All mode spends the
// whole pending team in one click — randomly, or all into one stat.
export type LevelUpMode =
  | "random"
  | "randomAll"
  | "strengthAll"
  | "defenseAll"
  | "intelligenceAll"
  | "luckAll";

// Menu order; also the source of truth for which modes exist.
export const LEVELUP_MODES: LevelUpMode[] = [
  "random",
  "randomAll",
  "strengthAll",
  "defenseAll",
  "intelligenceAll",
  "luckAll",
];

const MODE_EMOJI: Record<LevelUpMode, string> = {
  random: "🎲",
  randomAll: "🎲",
  strengthAll: "⚔️",
  defenseAll: "🛡️",
  intelligenceAll: "✨",
  luckAll: "🍀",
};

// Spend the points earned on level-up across the hero's four stats.
export function LevelUpModal({
  hero,
  level,
  hp,
  existingBonus,
  draft,
  totalPoints,
  draftSpent,
  charName,
  onAdjust,
  mode,
  onMainAction,
  onPickMode,
  onConfirm,
  reaction,
}: {
  hero: Character | null;
  level: { level: number; intoLevel: number; nextLevelXp: number };
  // Stored current HP of the hero (undefined = full health).
  hp: number | undefined;
  existingBonus: StatBonus;
  draft: StatBonus;
  totalPoints: number;
  draftSpent: number;
  charName: (id: string) => string;
  onAdjust: (stat: keyof StatBonus, delta: number) => void;
  // The remembered button mode, the click on the main button (runs that mode),
  // and a pick from the chevron menu (remembers + runs the chosen mode).
  mode: LevelUpMode;
  onMainAction: () => void;
  onPickMode: (mode: LevelUpMode) => void;
  onConfirm: () => void;
  // A spoken line shown at the portrait just after committing (null = none).
  reaction?: string | null;
}) {
  const { t } = useTranslation();
  const portraitRef = useRef<HTMLDivElement>(null);
  // The chevron menu offering the other allocation modes.
  const [menuOpen, setMenuOpen] = useState(false);
  // Never strand the menu open across heroes (each swaps the modal's hero in).
  useEffect(() => setMenuOpen(false), [hero?.id]);
  // The hero beams for a beat when their level-up screen first appears.
  const [joy, setJoy] = useState(false);
  useEffect(() => {
    if (!hero) {
      return undefined;
    }
    setJoy(true);
    const id = window.setTimeout(() => setJoy(false), 300);
    return () => window.clearTimeout(id);
  }, [hero?.id]);
  // Beam on open, and again for as long as the spoken reaction bubble is up — so
  // the joy face and the bubble appear together.
  const heroIcon = hero ? (joy || reaction ? iconVariant(hero.icon, "joy") : hero.icon) : "";
  const maxHealth = hero
    ? maxHpFromStats(
        hero.strength + existingBonus.strength + draft.strength,
        hero.defense + existingBonus.defense + draft.defense,
      )
    : 0;
  // Current HP is what the hero carries in (wounds and all) — spending points
  // raises the max cap but heals nothing, so it stays put while the bar's max
  // grows. Drafted points are deliberately left out of this figure.
  const maxHealthNoDraft = hero
    ? maxHpFromStats(hero.strength + existingBonus.strength, hero.defense + existingBonus.defense)
    : 0;
  const health = hero ? Math.max(0, Math.min(maxHealthNoDraft, hp ?? maxHealthNoDraft)) : 0;
  return (
    <Modal
      open={hero !== null}
      z="z-[65]"
      overlayClassName="bg-black/85"
      className="w-full max-w-xs border-amber-800 p-4 sm:p-6 text-center"
    >
      {hero && (
        <>
          <h2 className="font-serif text-2xl text-neutral-100">{t("levelUp.title")}</h2>
          <div className="mx-auto mt-4 flex w-24 flex-col items-center gap-1">
            <div ref={portraitRef} className="size-20 border border-neutral-700 bg-parchment">
              <img
                src={heroIcon}
                alt=""
                draggable="false"
                className="size-full select-none object-cover"
              />
            </div>
            {reaction && (
              <PortalBubble
                getEl={() => portraitRef.current}
                text={reaction}
                tail="down"
                maxWClass="max-w-[15rem]"
              />
            )}
            <span className="w-full truncate text-center text-xs text-neutral-200">
              {charName(hero.id)}
            </span>
          </div>

          <div className="mt-3 text-left">
            <div className="mb-1 flex items-center justify-between text-xs text-neutral-400">
              <span>{t("character.level", { n: level.level })}</span>
              <span className="tabular-nums text-neutral-200">
                {t("character.xp", { into: level.intoLevel, next: level.nextLevelXp })}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded bg-neutral-800">
              <div
                className="h-full bg-amber-400"
                style={{ width: `${(level.intoLevel / level.nextLevelXp) * 100}%` }}
              />
            </div>
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

          {/* Split button: the wide half runs the remembered mode; the chevron
              opens the other modes, and picking one both runs and remembers it
              for future level-ups. */}
          <div className="relative mt-4 flex">
            <button
              type="button"
              onClick={onMainAction}
              className="flex-1 rounded-l border border-r-0 border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700"
            >
              {MODE_EMOJI[mode]} {t(`levelUp.${mode}`)}
            </button>
            <button
              type="button"
              aria-label={t("levelUp.moreModes")}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="flex items-center justify-center rounded-r border border-neutral-700 bg-neutral-800 px-2 text-neutral-100 transition hover:bg-neutral-700"
            >
              <ChevronDown className={`size-4 transition ${menuOpen ? "rotate-180" : ""}`} />
            </button>
            {menuOpen && (
              <>
                {/* Click-away backdrop so the menu closes on an outside tap. */}
                <button
                  type="button"
                  aria-hidden
                  tabIndex={-1}
                  className="fixed inset-0 z-[1] cursor-default"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute bottom-full left-0 z-[2] mb-1 w-full overflow-hidden rounded border border-neutral-700 bg-neutral-900 shadow-lg">
                  {LEVELUP_MODES.filter((m) => m !== mode).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onPickMode(m);
                      }}
                      className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-sm text-neutral-100 transition hover:bg-neutral-800"
                    >
                      <span className="w-4 text-center">{MODE_EMOJI[m]}</span>
                      {t(`levelUp.${m}`)}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
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
