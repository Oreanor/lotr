import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Flame, Heart } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { PortalBubble } from "@/components/ui/PortalBubble";
import { StatBar } from "@/components/ui/StatBar";
import { healthBarColorClass, healthBarWidthPct } from "@/components/ui/healthBar";
import { ABILITIES, itemFamilyId, ringImage } from "@/game";
import type { Character, CharacterStats, Item } from "@/game";

// Hero details: portrait, level/XP, health, ring corruption, stat bars, ability,
// and contextual actions (become lord / make bearer / call back / close).
export function CharacterModal({
  character,
  stats,
  paging,
  level,
  deadInBattle,
  isInParty,
  canMakeBearer,
  isLeftBehind,
  equippedItem,
  itemOptions,
  onEquipItem,
  charName,
  iconFor,
  onPrev,
  onNext,
  onMakeBearer,
  onCall,
  onClose,
  reaction,
  ringDestroyed = false,
  z,
}: {
  character: Character | null;
  stats: CharacterStats | null;
  paging: boolean;
  level: { level: number; intoLevel: number; nextLevelXp: number };
  deadInBattle: boolean;
  isInParty: boolean;
  canMakeBearer: boolean;
  isLeftBehind: boolean;
  equippedItem: Item | null;
  itemOptions: Item[];
  onEquipItem: (itemId: string | null) => void;
  charName: (id: string) => string;
  iconFor: (c: Character) => string;
  onPrev: () => void;
  onNext: () => void;
  onMakeBearer: () => void;
  onCall: () => void;
  onClose: () => void;
  // A spoken item reaction shown at this hero's portrait (null = none).
  reaction?: string | null;
  // Freeplay: the Ring is gone — hide all bearer/Ring UI.
  ringDestroyed?: boolean;
  // Stacking layer (defaults to the Modal default); raised when shown over Stats.
  z?: string;
}) {
  const { t } = useTranslation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const itemListRef = useRef<HTMLDivElement>(null);
  const portraitRef = useRef<HTMLImageElement>(null);
  const suppressItemClick = useRef(false);
  // Close the item picker when switching to another character.
  useEffect(() => {
    setPickerOpen(false);
  }, [character?.id, isInParty]);

  const startItemListDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const el = itemListRef.current;
    if (!el) {
      return;
    }
    const startY = event.clientY;
    const startScroll = el.scrollTop;
    let moved = false;
    const onMove = (ev: PointerEvent) => {
      const dy = ev.clientY - startY;
      if (Math.abs(dy) > 4) {
        moved = true;
      }
      el.scrollTop = startScroll - dy;
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove, true);
      window.removeEventListener("pointerup", onUp, true);
      window.removeEventListener("pointercancel", onUp, true);
      if (moved) {
        suppressItemClick.current = true;
      }
    };
    window.addEventListener("pointermove", onMove, true);
    window.addEventListener("pointerup", onUp, true);
    window.addEventListener("pointercancel", onUp, true);
  };

  return (
    <Modal
      open={character !== null && stats !== null}
      onClose={onClose}
      z={z}
      overlayClassName="overflow-hidden bg-black/60"
      className="flex max-h-[90vh] w-full max-w-xs shrink-0 flex-col border-neutral-700"
    >
      {character && stats && (
        <>
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
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
              ref={portraitRef}
              src={iconFor(character)}
              alt=""
              className="mr-2 size-14 shrink-0 border border-neutral-700 bg-parchment object-cover"
            />
            {reaction && (
              <PortalBubble
                getEl={() => portraitRef.current}
                text={reaction}
                tail="down"
                maxWClass="max-w-[18rem]"
              />
            )}
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-serif text-xl text-neutral-100">{charName(character.id)}</h2>
              <p className="flex h-4 items-center gap-1 text-xs text-amber-400">
                {stats.isBearer && !ringDestroyed && (
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
            <p className="flex items-center justify-center gap-1.5 text-sm font-semibold text-red-400">
              <img src="/ui/skull.png" alt="" className="size-4 object-contain" />
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
                className={`h-full ${healthBarColorClass(stats.health, stats.maxHealth)}`}
                style={{ width: `${healthBarWidthPct(stats.health, stats.maxHealth)}%` }}
              />
            </div>
          </div>

          {!ringDestroyed && (
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1 text-yellow-500">
                <Flame className="size-4" />
                {t("character.ringPower")}
              </span>
              <span className="font-semibold tabular-nums text-yellow-400">{stats.corruption}%</span>
            </div>
          )}

          <div className="space-y-1.5">
            <StatBar label={t("character.strength")} hint={t("character.strengthHint")} value={stats.strength} max={10} color="bg-red-500" />
            <StatBar label={t("character.defense")} hint={t("character.defenseHint")} value={stats.defense} max={10} color="bg-sky-500" />
            <StatBar label={t("character.intelligence")} hint={t("character.intelligenceHint")} value={stats.intelligence} max={10} color="bg-violet-500" />
            <StatBar label={t("character.luck")} hint={t("character.luckHint")} value={stats.luck} max={10} color="bg-lime-500" />
          </div>

          <div className="rounded border border-amber-800/60 bg-amber-950/30 px-3 py-2 text-left">
            <p className="text-[10px] uppercase tracking-wide text-amber-500/80">{t("character.ability")}</p>
            <p className="text-sm text-amber-200">
              {ABILITIES[character.id] ? t(`ability.${character.id}`) : t("character.noAbility")}
            </p>
          </div>

          {isInParty && (
            <div className="rounded border border-sky-800/60 bg-sky-950/30 px-3 py-2 text-left">
              <p className="text-[10px] uppercase tracking-wide text-sky-400/80">{t("character.item")}</p>
              <div className="mt-1 flex min-h-[40px] items-center">
                {equippedItem ? (
                  <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    className="flex w-full items-center gap-2 rounded text-left transition hover:opacity-80"
                  >
                    <img
                      src={equippedItem.icon}
                      alt=""
                      draggable={false}
                      className="size-8 shrink-0 object-contain"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-sky-100">{t(`item.${itemFamilyId(equippedItem.id)}.name`)}</p>
                      <p className="text-[11px] leading-tight text-sky-300/80">{t(`item.${itemFamilyId(equippedItem.id)}.desc`)}</p>
                    </div>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    className="w-full rounded border border-sky-800/70 bg-sky-900/40 px-3 py-1.5 text-sm font-semibold text-sky-200 transition hover:bg-sky-800/60"
                  >
                    {t("character.chooseItem")}
                  </button>
                )}
              </div>
            </div>
          )}
          </div>

          <Modal
            open={pickerOpen}
            z="z-[60]"
            overlayClassName="bg-black/70"
            className="w-full max-w-xs border-sky-800 p-4 sm:p-5 text-center"
          >
            <h2 className="font-serif text-xl text-sky-200">{t("item.chooseTitle")}</h2>
            <div
              ref={itemListRef}
              onPointerDown={startItemListDrag}
              onDragStart={(event) => event.preventDefault()}
              onClickCapture={(event) => {
                if (suppressItemClick.current) {
                  event.preventDefault();
                  event.stopPropagation();
                  suppressItemClick.current = false;
                }
              }}
              className="mt-4 max-h-80 cursor-grab select-none overflow-y-auto overscroll-contain active:cursor-grabbing"
            >
              <div className="flex flex-col gap-2 pr-1">
                {itemOptions.length === 0 && !equippedItem && (
                  <p className="text-sm text-neutral-400">{t("character.noItems")}</p>
                )}
                {itemOptions.map((item) => {
                  // Treebeard is an Ent — he bears no weapons, helmets or armour
                  // (anything that lends strength or defense).
                  const isGear =
                    !!item.strength ||
                    !!item.defense ||
                    !!item.strengthVsUndead ||
                    !!item.strengthVsOrcs;
                  const disabled =
                    (!!item.holders && !item.holders.includes(character.id)) ||
                    (character.id === "treebeard" && isGear);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        if (disabled) {
                          return;
                        }
                        onEquipItem(item.id);
                        setPickerOpen(false);
                      }}
                      className={`flex flex-col items-center gap-1 rounded border px-3 py-2 transition ${
                        equippedItem?.id === item.id
                          ? "border-sky-500 bg-sky-900/50"
                          : "border-sky-800/70 bg-sky-900/30 hover:bg-sky-800/50"
                      } disabled:cursor-default disabled:opacity-35 disabled:hover:bg-sky-900/30`}
                    >
                      <img
                        src={item.icon}
                        alt=""
                        draggable={false}
                        className="size-12 object-contain"
                      />
                      <span className="text-sm font-semibold text-sky-100">{t(`item.${itemFamilyId(item.id)}.name`)}</span>
                      <span className="text-xs text-sky-300/80">{t(`item.${itemFamilyId(item.id)}.desc`)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            {equippedItem && (
              <button
                type="button"
                onClick={() => {
                  onEquipItem(null);
                  setPickerOpen(false);
                }}
                className="mt-3 w-full rounded border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700"
              >
                {t("character.itemRemove")}
              </button>
            )}
            <button
              type="button"
              onClick={() => setPickerOpen(false)}
              className="mt-4 w-full rounded border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700"
            >
              {t("character.close")}
            </button>
          </Modal>

          <div className="border-t border-neutral-800 p-4">
          <div className="flex flex-col gap-2">
            {isInParty && !ringDestroyed && (
              <button
                type="button"
                disabled={!canMakeBearer}
                className="flex w-full items-center justify-center gap-2 rounded border border-amber-700 bg-amber-900/40 px-4 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-900/70 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-amber-900/40"
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
          </div>
        </>
      )}
    </Modal>
  );
}
