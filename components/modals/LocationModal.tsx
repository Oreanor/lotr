import { useTranslation } from "react-i18next";
import { Hourglass } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { LocationPreview } from "@/components/ui/LocationPreview";
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
  showCloaks,
  hasCloaks,
  transportOffer,
  transportActive,
  isMoving,
  onFightBoss,
  onViewStats,
  onRecruit,
  onTakeSupplies,
  onTakeCloaks,
  onTakeTransport,
  onWait,
  onLeave,
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
  showCloaks: boolean;
  hasCloaks: boolean;
  transportOffer: TransportId | null;
  transportActive: boolean;
  isMoving: boolean;
  onFightBoss: () => void;
  onViewStats: (id: string) => void;
  onRecruit: (c: Character) => void;
  onTakeSupplies: () => void;
  onTakeCloaks: () => void;
  onTakeTransport: () => void;
  onWait: () => void;
  onLeave: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal
      open={location !== null}
      overlayClassName="bg-black/60"
      className="max-h-[88vh] w-full max-w-sm overflow-y-auto border-neutral-700 p-5 text-center"
    >
      {location && (
        <>
          <h2 className="font-serif text-2xl text-neutral-100">{locationName}</h2>

          {imageSrc && (
            <LocationPreview
              key={imageSrc}
              src={imageSrc}
              alt={locationName}
              initiallyLoaded={imageInitiallyLoaded}
            />
          )}

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
            <ul className="mt-4 space-y-2 text-left">
              {recruits.map((character) => {
                const inParty = party.includes(character.id);
                return (
                  <li key={character.id} className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onViewStats(character.id)}
                      title={t("recruit.statsAria", { name: charName(character.id) })}
                      aria-label={t("recruit.statsAria", { name: charName(character.id) })}
                      className="size-12 shrink-0 border border-neutral-700 bg-parchment transition hover:brightness-95"
                    >
                      <img src={iconFor(character)} alt="" className="size-full object-cover" />
                    </button>
                    <span className="flex-1 text-sm text-neutral-200">{charName(character.id)}</span>
                    <button
                      type="button"
                      disabled={inParty}
                      onClick={() => onRecruit(character)}
                      className="rounded border border-neutral-700 bg-neutral-800 px-3 py-1 text-xs font-semibold text-neutral-100 transition hover:bg-neutral-700 disabled:cursor-default disabled:opacity-50 disabled:hover:bg-neutral-800"
                    >
                      {inParty ? t("recruit.inParty") : t("recruit.call")}
                    </button>
                  </li>
                );
              })}
            </ul>
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

          {showCloaks && (
            <button
              type="button"
              disabled={hasCloaks}
              onClick={onTakeCloaks}
              className="mt-4 w-full rounded border border-emerald-800 bg-emerald-900/30 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-900/60 disabled:cursor-default disabled:opacity-50 disabled:hover:bg-emerald-900/30"
            >
              {hasCloaks ? t("location.cloaksHave") : t("location.cloaksTake")}
            </button>
          )}

          {transportOffer && (
            <button
              type="button"
              disabled={transportActive}
              onClick={onTakeTransport}
              className="mt-4 w-full rounded border border-emerald-800 bg-emerald-900/30 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-900/60 disabled:cursor-default disabled:opacity-50 disabled:hover:bg-emerald-900/30"
            >
              {transportActive
                ? t("transport.active", { name: t(`transport.${transportOffer}`) })
                : t(`transport.take${transportOffer.charAt(0).toUpperCase()}${transportOffer.slice(1)}`)}
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
        </>
      )}
    </Modal>
  );
}
