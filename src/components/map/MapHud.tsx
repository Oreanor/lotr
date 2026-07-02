import { useTranslation } from "react-i18next";
import { LocateFixed, Split, Square, Users, Wheat, ZoomIn } from "lucide-react";
import * as G from "@/game";
import type { Character, StatBonus, TransportId } from "@/game";
import { HoverHint } from "@/components/ui/HoverHint";
import { TransportIcon } from "@/components/ui/TransportIcon";
import { ReactionBubble } from "@/components/ui/ReactionBubble";
import { healthBarColorClass, healthBarWidthPct } from "@/components/ui/healthBar";

// Top-left heads-up display floating over the map: the current date, the food /
// transport / cloak readout, the march controls, and the party portraits with
// their health bars and flavour bubbles. Pure presentation — every action is a
// callback and every value comes in as a prop.
export function MapHud({
  journeyDate,
  food,
  foodChange,
  transport,
  hasCloaks,
  anyHurt,
  zoom,
  baseZoom,
  target,
  isMoving,
  partyLength,
  canSwitchSquads,
  onStop,
  onFarm,
  onSplit,
  onSwitchSquad,
  onCenter,
  onCycleZoom,
  partyCharacters,
  totalBonusFor,
  hpById,
  bearerId,
  ringDestroyed,
  reaction,
  charName,
  iconFor,
  onOpenCharacter,
}: {
  journeyDate: string;
  food: number;
  foodChange: { gain: number; eaten: number; key: number } | null;
  transport: TransportId | null;
  hasCloaks: boolean;
  anyHurt: boolean;
  zoom: number;
  baseZoom: number;
  target: unknown | null;
  isMoving: boolean;
  partyLength: number;
  canSwitchSquads: boolean;
  onStop: () => void;
  onFarm: () => void;
  onSplit: () => void;
  onSwitchSquad: () => void;
  onCenter: () => void;
  onCycleZoom: () => void;
  partyCharacters: Character[];
  totalBonusFor: (character: Character) => StatBonus;
  hpById: Record<string, number>;
  bearerId: string;
  ringDestroyed: boolean;
  reaction: { charId: string; text: string } | null;
  charName: (id: string) => string;
  iconFor: (character: { id: string; icon: string }) => string;
  onOpenCharacter: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="pointer-events-none absolute left-0 top-0 z-40 flex flex-col gap-3 p-4 text-neutral-200">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <h1 className="flex h-9 w-[150px] items-center justify-center whitespace-nowrap rounded border border-neutral-700 bg-neutral-900/90 px-2.5 font-serif text-sm leading-none text-neutral-100 sm:w-[172px] sm:text-base">
            {journeyDate}
          </h1>
          {/* Food + transport, kept beside the date (also on mobile). */}
          <div className="relative h-9 w-fit">
            <div
              onPointerDown={(event) => event.stopPropagation()}
              onPointerUp={(event) => event.stopPropagation()}
              className="pointer-events-auto flex h-9 w-fit items-center gap-2 rounded border border-neutral-700 bg-neutral-900/90 px-2 text-sm text-neutral-200"
            >
              <HoverHint label={t("ui.foodTitle")} className="relative inline-flex items-center gap-1">
                <img src="/ui/food.png" alt="" className="size-5 object-contain" />
                <span className="tabular-nums">{food}</span>
                {foodChange && (
                  <span
                    key={foodChange.key}
                    className="food-float pointer-events-none absolute -top-4 left-0 flex gap-1 text-sm font-bold [text-shadow:0_0_2px_#fff,0_0_3px_#fff,0_1px_1px_#fff]"
                  >
                    <span className="text-emerald-600">+{foodChange.gain}</span>
                    {foodChange.eaten > 0 && <span className="text-red-600">−{foodChange.eaten}</span>}
                  </span>
                )}
              </HoverHint>
              <HoverHint
                label={transport ? t(`transport.${transport}`) : t("ui.onFoot")}
                className="inline-flex items-center"
              >
                <TransportIcon transport={transport} className="size-5 select-none object-contain" />
              </HoverHint>
              {hasCloaks && (
                <HoverHint label={t("ui.cloaksTitle")} className="inline-flex items-center">
                  <img src="/ui/cloak_sm.png" alt="" className="size-5 object-contain" />
                </HoverHint>
              )}
            </div>
            {food === 0 && (
              <span
                className="pointer-events-auto absolute left-0 top-full z-10 mt-0.5 w-full"
                onPointerDown={(event) => event.stopPropagation()}
                onPointerUp={(event) => event.stopPropagation()}
              >
                <HoverHint
                  label={t("ui.hungryTitle")}
                  className="w-full animate-pulse justify-center rounded border border-red-800 bg-red-950/85 px-1.5 py-1 text-[11px] font-semibold leading-none text-red-300 shadow-lg"
                >
                  {t("ui.hungry")}
                </HoverHint>
              </span>
            )}
            {anyHurt && food >= 2 && (
              <span
                className="pointer-events-auto absolute left-0 top-full z-10 mt-0.5 w-full"
                onPointerDown={(event) => event.stopPropagation()}
                onPointerUp={(event) => event.stopPropagation()}
              >
                <HoverHint
                  label={t("ui.healingTitle")}
                  className="w-full animate-pulse justify-center rounded border border-emerald-800 bg-emerald-950/85 px-1.5 py-1 text-[11px] font-semibold leading-none text-emerald-300 shadow-lg"
                >
                  {t("ui.healing")}
                </HoverHint>
              </span>
            )}
          </div>
        </div>
        <div
          className="pointer-events-auto flex flex-wrap items-center gap-2 text-sm"
          onPointerDown={(event) => event.stopPropagation()}
          onPointerUp={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={onStop}
            disabled={!target}
            aria-label={t("ui.stop")}
            title={t("ui.stop")}
            className="flex size-9 items-center justify-center rounded border border-neutral-700 bg-neutral-900/90 text-neutral-200 transition hover:bg-neutral-800 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-neutral-900/90"
          >
            <Square className="size-4" />
          </button>
          <button
            type="button"
            onClick={onFarm}
            disabled={isMoving}
            aria-label={t("ui.farmAria")}
            title={isMoving ? t("ui.farmBlocked") : t("ui.farm")}
            className="flex size-9 items-center justify-center rounded border border-neutral-700 bg-neutral-900/90 text-neutral-200 transition hover:bg-neutral-800 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-neutral-900/90"
          >
            <Wheat className="size-4" />
          </button>
          <button
            type="button"
            onClick={onSplit}
            disabled={partyLength <= 1 || isMoving}
            aria-label={t("ui.split")}
            title={t("ui.split")}
            className="flex size-9 items-center justify-center rounded border border-neutral-700 bg-neutral-900/90 text-neutral-200 transition hover:bg-neutral-800 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-neutral-900/90"
          >
            <Split className="size-4" />
          </button>
          <button
            type="button"
            onClick={onSwitchSquad}
            disabled={!canSwitchSquads}
            aria-label={t("ui.switchSquad")}
            title={t("ui.switchSquad")}
            className="flex size-9 items-center justify-center rounded border border-neutral-700 bg-neutral-900/90 text-neutral-200 transition hover:bg-neutral-800 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-neutral-900/90"
          >
            <Users className="size-4" />
          </button>
          <button
            type="button"
            onClick={onCenter}
            aria-label={t("ui.center")}
            title={t("ui.center")}
            className="flex size-9 items-center justify-center rounded border border-neutral-700 bg-neutral-900/90 text-neutral-200 transition hover:bg-neutral-800"
          >
            <LocateFixed className="size-4" />
          </button>
          <button
            type="button"
            onClick={onCycleZoom}
            aria-label={t("ui.zoom")}
            title={t("ui.zoom")}
            className="relative flex size-9 items-center justify-center rounded border border-neutral-700 bg-neutral-900/90 text-neutral-200 transition hover:bg-neutral-800"
          >
            <ZoomIn className="size-4 -translate-x-[3px] -translate-y-[3px]" />
            <span className="pointer-events-none absolute bottom-[3px] right-[5px] text-[10px] font-bold leading-none [text-shadow:0_0_2px_#000,0_0_2px_#000]">
              {(zoom / (baseZoom || 1)).toFixed(1)}
            </span>
          </button>
        </div>
      </div>

      <div
        className="pointer-events-auto flex w-fit flex-col gap-1"
        onPointerDown={(event) => event.stopPropagation()}
        onPointerUp={(event) => event.stopPropagation()}
      >
        <div data-party-portraits className="grid grid-flow-col grid-rows-[repeat(9,auto)] gap-1">
          {partyCharacters.map((character) => {
            const es = G.effectiveStats(character, totalBonusFor(character));
            const maxHp = G.maxHpFromStats(es.strength, es.defense);
            const hp = G.currentHp(maxHp, hpById[character.id]);
            return (
              <button
                key={character.id}
                type="button"
                onClick={() => onOpenCharacter(character.id)}
                aria-label={t("recruit.statsAria", { name: charName(character.id) })}
                data-character-portrait={character.id}
                className={`group relative size-[52px] border border-neutral-700 bg-parchment transition hover:brightness-95 sm:size-16 ${
                  reaction?.charId === character.id ? "z-50" : "z-0 hover:z-50"
                }`}
              >
                <img
                  src={iconFor(character)}
                  alt=""
                  draggable="false"
                  className="size-full select-none object-cover"
                />
                {reaction?.charId === character.id && (
                  <span
                    className="pointer-events-none absolute left-full top-1/2 z-50"
                    style={{ transform: "translate(-16px, calc(-50% + 20px))" }}
                  >
                    <ReactionBubble text={reaction.text} />
                  </span>
                )}
                {/* Touch devices have no hover, so caption the name on the
                    portrait (mobile only); desktop keeps the hover tooltip. */}
                <span className="pointer-events-none absolute inset-x-0 bottom-1 truncate px-0.5 text-center text-[9px] font-semibold leading-tight text-white [text-shadow:0_1px_2px_#000,0_0_2px_#000] sm:hidden">
                  {charName(character.id)}
                </span>
                <span className="pointer-events-none absolute left-0 top-full z-50 mt-1 hidden w-max max-w-[60vw] whitespace-nowrap rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs font-normal text-neutral-200 shadow-lg group-hover:block">
                  {charName(character.id)}
                </span>
                {character.id === bearerId && !ringDestroyed && (
                  <span
                    className="pointer-events-none absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full border border-amber-700 bg-neutral-900"
                    title={t("character.bearer")}
                  >
                    <img
                      src={G.ringImage}
                      alt=""
                      draggable="false"
                      className="size-3.5 select-none object-contain"
                    />
                  </span>
                )}
                <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-black/50">
                  <span
                    className={`block h-full ${healthBarColorClass(hp, maxHp)}`}
                    style={{ width: `${healthBarWidthPct(hp, maxHp)}%` }}
                  />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
