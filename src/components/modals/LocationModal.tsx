import { useTranslation } from "react-i18next";
import { Hourglass } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { LocationPreview } from "@/components/ui/LocationPreview";
import { ScrollRow } from "@/components/ui/ScrollRow";
import { TransportIcon } from "@/components/ui/TransportIcon";
import type { Character, MapLocation, Monster, TransportId } from "@/game";

// Town/place screen: artwork, optional boss fight, recruits, supplies, cloaks,
// transport, wait, leave. All decisions are pre-computed by the page; this is
// pure presentation + callbacks.
export function LocationModal({
  location,
  locationName,
  imageSrc,
  imageInitiallyLoaded,
  boss,
  monsterName,
  recruits,
  party,
  iconFor,
  charName,
  canRestock,
  food,
  foodCapacity,
  transportOffer,
  transportActive,
  isMoving,
  refusalOpen,
  canExplore,
  exploreLocked,
  onExplore,
  onFightBoss,
  onViewStats,
  onRecruit,
  onTalk,
  hasGifts,
  onTakeSupplies,
  onTakeTransport,
  onWait,
  onLeave,
  note,
}: {
  location: MapLocation | null;
  locationName: string;
  imageSrc: string | null;
  imageInitiallyLoaded: boolean;
  boss: Monster | null;
  monsterName: (icon: string) => string;
  recruits: Character[];
  party: string[];
  iconFor: (c: Character) => string;
  charName: (id: string) => string;
  canRestock: boolean;
  food: number;
  foodCapacity: number;
  transportOffer: TransportId | null;
  transportActive: boolean;
  isMoving: boolean;
  refusalOpen: boolean;
  canExplore: boolean;
  exploreLocked: boolean;
  onExplore: () => void;
  onFightBoss: () => void;
  onViewStats: (id: string) => void;
  onRecruit: (c: Character) => void;
  onTalk: (c: Character) => void;
  hasGifts: (id: string) => boolean;
  onTakeSupplies: () => void;
  onTakeTransport: () => void;
  onWait: () => void;
  onLeave: () => void;
  note?: string | null;
}) {
  const { t } = useTranslation();
  const blocked = refusalOpen ? " pointer-events-none" : "";
  return (
    <Modal
      open={location !== null}
      overlayClassName={`bg-black/60${blocked}`}
      className={`max-h-[88vh] w-full max-w-sm overflow-y-auto border-neutral-700 p-5 text-center${blocked}`}
    >
      {location && (
        <div data-location-modal>
          <h2 className="font-serif text-2xl text-neutral-100">{locationName}</h2>

          {imageSrc && (
            <LocationPreview
              key={imageSrc}
              src={imageSrc}
              alt={locationName}
              initiallyLoaded={imageInitiallyLoaded}
            />
          )}

          {note && <p className="mt-3 text-sm text-neutral-400">{note}</p>}

          {boss && (
            <button
              type="button"
              onClick={onFightBoss}
              className="mt-4 w-full rounded border border-red-800 bg-red-900/40 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-900/70"
            >
              {t("location.fight", { name: monsterName(boss.icon) })}
            </button>
          )}

          {recruits.length > 0 && (
            <div data-recruit-portraits>
              <ScrollRow>
              {recruits.map((character) => {
                const inParty = party.includes(character.id);
                return (
                  <div key={character.id} className="flex w-24 shrink-0 flex-col items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onViewStats(character.id)}
                      title={t("recruit.statsAria", { name: charName(character.id) })}
                      aria-label={t("recruit.statsAria", { name: charName(character.id) })}
                      data-character-portrait={character.id}
                      className="size-20 border border-neutral-700 bg-parchment transition hover:brightness-95"
                    >
                      <img src={iconFor(character)} alt="" draggable={false} className="size-full object-cover" />
                    </button>
                    <span className="w-full truncate text-center text-xs text-neutral-200">
                      {charName(character.id)}
                    </span>
                    {hasGifts(character.id) ? (
                      <button
                        type="button"
                        onClick={() => onTalk(character)}
                        className="w-full rounded border border-sky-800 bg-sky-900/30 px-2 py-1 text-xs font-semibold text-sky-200 transition hover:bg-sky-900/60"
                      >
                        {t("character.talk")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={inParty}
                        onClick={() => onRecruit(character)}
                        className="w-full rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs font-semibold text-neutral-100 transition hover:bg-neutral-700 disabled:cursor-default disabled:opacity-50 disabled:hover:bg-neutral-800"
                      >
                        {inParty ? t("recruit.inParty") : t("recruit.call")}
                      </button>
                    )}
                  </div>
                );
              })}
              </ScrollRow>
            </div>
          )}

          {canRestock && (
            <button
              type="button"
              disabled={food >= foodCapacity}
              onClick={onTakeSupplies}
              className="mt-4 w-full rounded border border-amber-800 bg-amber-900/30 px-4 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-900/60 disabled:cursor-default disabled:opacity-50 disabled:hover:bg-amber-900/30"
            >
              {food >= foodCapacity
                ? t("location.suppliesFull", { n: foodCapacity })
                : t("location.supplies", { n: foodCapacity })}
            </button>
          )}

          {transportOffer && (
            <button
              type="button"
              disabled={transportActive}
              onClick={onTakeTransport}
              className="mt-4 flex w-full items-center justify-center gap-2.5 rounded border border-emerald-800 bg-emerald-900/30 px-4 py-2.5 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-900/60 disabled:cursor-default disabled:opacity-50 disabled:hover:bg-emerald-900/30"
            >
              <TransportIcon transport={transportOffer} className="size-6 shrink-0 object-contain" />
              {transportActive
                ? t("transport.active", { name: t(`transport.${transportOffer}`) })
                : `${t(`transport.take${transportOffer.charAt(0).toUpperCase()}${transportOffer.slice(1)}`)} (${t(`transport.effect.${transportOffer}`)})`}
            </button>
          )}

          {canExplore && (
            <button
              type="button"
              onClick={onExplore}
              disabled={isMoving || exploreLocked}
              title={exploreLocked ? t("location.exploreLocked") : undefined}
              className="mt-4 w-full rounded border border-sky-800 bg-sky-900/30 px-4 py-2 text-sm font-semibold text-sky-200 transition hover:bg-sky-900/60 disabled:cursor-default disabled:opacity-50 disabled:hover:bg-sky-900/30"
            >
              {t("location.explore")}
            </button>
          )}

          <button
            type="button"
            onClick={onWait}
            disabled={isMoving}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700 disabled:cursor-default disabled:opacity-50 disabled:hover:bg-neutral-800"
          >
            <Hourglass className="size-4 shrink-0" />
            {t("location.waitDay")}
          </button>

          <button
            type="button"
            className="mt-3 w-full rounded border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700"
            onClick={onLeave}
          >
            {t("location.leave")}
          </button>
        </div>
      )}
    </Modal>
  );
}
