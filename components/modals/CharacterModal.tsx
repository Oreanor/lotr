import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Flame, Heart } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { StatBar } from "@/components/ui/StatBar";
import { ABILITIES, ringImage } from "@/game";
import type { Character, CharacterStats } from "@/game";

// Hero details: portrait, level/XP, health, ring corruption, stat bars, ability,
// and contextual actions (become lord / make bearer / call back / close).
export function CharacterModal({
  character,
  stats,
  paging,
  level,
  deadInBattle,
  canMakeBearer,
  isLeftBehind,
  charName,
  iconFor,
  onPrev,
  onNext,
  onClaimLord,
  onMakeBearer,
  onCall,
  onClose,
}: {
  character: Character | null;
  stats: CharacterStats | null;
  paging: boolean;
  level: { level: number; intoLevel: number; nextLevelXp: number };
  deadInBattle: boolean;
  canMakeBearer: boolean;
  isLeftBehind: boolean;
  charName: (id: string) => string;
  iconFor: (c: Character) => string;
  onPrev: () => void;
  onNext: () => void;
  onClaimLord: () => void;
  onMakeBearer: () => void;
  onCall: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal
      open={character !== null && stats !== null}
      overlayClassName="overflow-hidden bg-black/60"
      className="flex h-fit w-full max-w-xs shrink-0 flex-col gap-3 border-neutral-700 p-4"
    >
      {character && stats && (
        <>
          <div className="flex h-14 items-center gap-2">
            {paging ? (
              <button
                type="button"
                onClick={onPrev}
                aria-label={t("character.prev")}
                className="flex size-7 shrink-0 items-center justify-center rounded text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-100"
              >
                <ChevronLeft className="size-5" />
              </button>
            ) : (
              <span className="size-7 shrink-0" aria-hidden="true" />
            )}
            <img
              src={iconFor(character)}
              alt=""
              className="size-12 shrink-0 border border-neutral-700 bg-parchment object-cover"
            />
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-serif text-xl text-neutral-100">{charName(character.id)}</h2>
              <p className="flex h-4 items-center gap-1 text-xs text-amber-400">
                {stats.isBearer && (
                  <>
                    <img
                      src={ringImage}
                      alt=""
                      draggable="false"
                      className="size-3.5 select-none object-contain"
                    />
                    {t("character.bearer")}
                  </>
                )}
              </p>
            </div>
            {paging ? (
              <button
                type="button"
                onClick={onNext}
                aria-label={t("character.next")}
                className="flex size-7 shrink-0 items-center justify-center rounded text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-100"
              >
                <ChevronRight className="size-5" />
              </button>
            ) : (
              <span className="size-7 shrink-0" aria-hidden="true" />
            )}
          </div>

          {stats.dead && (
            <p className="text-center text-sm font-semibold text-red-400">
              {t(deadInBattle ? "character.deadBattle" : "character.deadHunger")}
            </p>
          )}

          {!stats.dead && (
            <div className="rounded border border-neutral-800 bg-neutral-950/60 p-2.5">
              <div className="mb-1 flex justify-between text-xs text-neutral-400">
                <span>{t("character.level", { n: level.level })}</span>
                <span className="text-neutral-200">
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
          )}

          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-neutral-400">
              <span className="flex items-center gap-1">
                <Heart className="size-3.5 text-emerald-500" />
                {t("character.health")}
              </span>
              <span className="tabular-nums text-neutral-200">
                {stats.health}/{stats.maxHealth}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded bg-neutral-800">
              <div
                className="h-full bg-green-500"
                style={{ width: `${Math.max(0, (stats.health / stats.maxHealth) * 100)}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1 text-yellow-500">
              <Flame className="size-4" />
              {t("character.ringPower")}
            </span>
            <span className="font-semibold tabular-nums text-yellow-400">{stats.corruption}%</span>
          </div>

          <div className="space-y-1.5">
            <StatBar label={t("character.strength")} value={stats.strength} max={10} color="bg-red-500" />
            <StatBar label={t("character.defense")} value={stats.defense} max={10} color="bg-sky-500" />
            <StatBar label={t("character.intelligence")} value={stats.intelligence} max={10} color="bg-violet-500" />
            <StatBar label={t("character.luck")} value={stats.luck} max={10} color="bg-lime-500" />
          </div>

          <div className="rounded border border-amber-800/60 bg-amber-950/30 px-3 py-2 text-left">
            <p className="text-[10px] uppercase tracking-wide text-amber-500/80">{t("character.ability")}</p>
            <p className="text-sm text-amber-200">
              {ABILITIES[character.id] ? t(`ability.${character.id}`) : t("character.noAbility")}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {stats.isBearer && (
              <button
                type="button"
                className="w-full rounded border border-amber-700 bg-amber-900/40 px-4 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-900/70"
                onClick={onClaimLord}
              >
                {t("character.becomeLord")}
              </button>
            )}
            {canMakeBearer && (
              <button
                type="button"
                className="flex w-full items-center justify-center gap-2 rounded border border-amber-700 bg-amber-900/40 px-4 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-900/70"
                onClick={onMakeBearer}
              >
                <img src={ringImage} alt="" draggable="false" className="size-4 select-none object-contain" />
                {t("character.makeBearer")}
              </button>
            )}
            {isLeftBehind && (
              <button
                type="button"
                className="w-full rounded border border-amber-700 bg-amber-900/40 px-4 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-900/70"
                onClick={onCall}
              >
                {t("recruit.call")}
              </button>
            )}
            <button
              type="button"
              className="w-full rounded border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700"
              onClick={onClose}
            >
              {t("character.close")}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
