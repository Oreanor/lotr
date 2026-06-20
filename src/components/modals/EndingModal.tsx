import { useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Modal } from "@/components/ui/Modal";
import { LocationPreview } from "@/components/ui/LocationPreview";
import { iconVariant } from "@/game";
import type { Character } from "@/game";

export type Ending =
  | "victory"
  | "lord"
  | "starved"
  | "battle"
  | "nothing"
  | "rogueLord"
  | "sauron"
  | "valinorWest"
  | "valinorRing"
  | "valinorSink";

// Artwork for the endings that have it (in /public/endings). The two "Valar
// refuse" sea endings share the one painting.
const ENDING_IMAGE: Partial<Record<Ending, string>> = {
  victory: "/endings/ring_destroyed.jpg",
  sauron: "/endings/sauron.jpg",
  valinorWest: "/endings/to_valinor.jpg",
  valinorRing: "/endings/valar_refuse.jpg",
  valinorSink: "/endings/valar_refuse.jpg",
};

// Terminal game-over screen. The page passes the outcome and the bearer.
export function EndingModal({
  open,
  ending,
  bearer,
  bearerName,
  lordClaimed,
  doomBetrayal = false,
  onReplay,
  onViewStats,
  onContinue,
}: {
  open: boolean;
  ending: Ending;
  bearer: Character | undefined;
  bearerName: string;
  lordClaimed: boolean;
  doomBetrayal?: boolean;
  onReplay: () => void;
  onViewStats: () => void;
  // Victory only: dismiss the screen and keep wandering a Ring-free Middle-earth.
  onContinue?: () => void;
}) {
  const { t } = useTranslation();
  const [imageOpen, setImageOpen] = useState(false);
  const endingImage = ENDING_IMAGE[ending] ?? null;
  const borderClass =
    ending === "victory" || ending === "valinorWest"
      ? "border-emerald-700"
      : ending === "starved" ||
          ending === "battle" ||
          ending === "nothing" ||
          ending === "sauron" ||
          ending === "valinorRing" ||
          ending === "valinorSink"
        ? "border-red-800"
        : "border-amber-700";
  const darkPortrait = bearer && (
    <img
      src={iconVariant(bearer.icon, "dark")}
      alt=""
      className="mx-auto mb-3 size-28 border border-amber-800 object-cover"
    />
  );

  return (
    <Modal open={open} overlayClassName="bg-black/85" className={`w-full max-w-sm p-6 text-center ${borderClass}`}>
      {endingImage && (
        <LocationPreview key={endingImage} src={endingImage} alt="" onOpen={() => setImageOpen(true)} />
      )}

      {imageOpen &&
        endingImage &&
        createPortal(
          <div
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 p-4"
            onClick={() => setImageOpen(false)}
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
          >
            <div className="inline-flex max-h-[calc(100dvh-2rem)] max-w-[calc(100dvw-2rem)] overflow-hidden rounded border-2 border-amber-700 bg-neutral-950 p-1 shadow-2xl shadow-black/60">
              <img
                src={endingImage}
                alt=""
                draggable="false"
                className="max-h-[calc(100dvh-2.75rem)] max-w-[calc(100dvw-2.75rem)] select-none object-contain md:h-[calc(100dvh-2.75rem)] md:w-auto"
              />
            </div>
          </div>,
          document.body,
        )}

      {ending === "starved" ? (
          <>
            <h2 className="font-serif text-2xl text-red-400">{t("ending.starvedTitle")}</h2>
            <p className="mt-3 text-sm text-neutral-300">{t("ending.starvedText", { name: bearerName })}</p>
          </>
        ) : ending === "battle" ? (
          <>
            <h2 className="font-serif text-2xl text-red-400">{t("ending.battleTitle")}</h2>
            <p className="mt-3 text-sm text-neutral-300">{t("ending.battleText", { name: bearerName })}</p>
          </>
        ) : ending === "victory" ? (
          <>
            <h2 className="font-serif text-2xl text-emerald-400">{t("ending.victoryTitle")}</h2>
            <p className="mt-3 text-sm text-neutral-300">{t("ending.victoryText")}</p>
          </>
        ) : ending === "nothing" ? (
          <>
            <h2 className="font-serif text-2xl text-red-400">{t("ending.nothingTitle")}</h2>
            <p className="mt-3 text-sm text-neutral-300">{t("ending.nothingText", { name: bearerName })}</p>
          </>
        ) : ending === "sauron" ? (
          <>
            <h2 className="font-serif text-2xl text-red-400">{t("ending.sauronTitle")}</h2>
            <p className="mt-3 text-sm text-neutral-300">{t("ending.sauronText", { name: bearerName })}</p>
          </>
        ) : ending === "valinorWest" ? (
          <>
            <h2 className="font-serif text-2xl text-emerald-400">{t("ending.valinorWestTitle")}</h2>
            <p className="mt-3 text-sm text-neutral-300">{t("ending.valinorWestText")}</p>
          </>
        ) : ending === "valinorRing" ? (
          <>
            <h2 className="font-serif text-2xl text-red-400">{t("ending.valinorRingTitle")}</h2>
            <p className="mt-3 text-sm text-neutral-300">{t("ending.valinorRingText", { name: bearerName })}</p>
          </>
        ) : ending === "valinorSink" ? (
          <>
            <h2 className="font-serif text-2xl text-red-400">{t("ending.valinorSinkTitle")}</h2>
            <p className="mt-3 text-sm text-neutral-300">{t("ending.valinorSinkText")}</p>
          </>
        ) : ending === "rogueLord" ? (
          <>
            {darkPortrait}
            <h2 className="font-serif text-2xl text-amber-400">{t("ending.rogueLordTitle", { name: bearerName })}</h2>
            <p className="mt-3 text-sm text-neutral-300">{t("ending.rogueLordText", { name: bearerName })}</p>
          </>
        ) : doomBetrayal ? (
          <>
            {darkPortrait}
            <h2 className="font-serif text-2xl text-amber-400">{t("ending.betrayTitle", { name: bearerName })}</h2>
            <p className="mt-3 text-sm text-neutral-300">{t("ending.betrayText", { name: bearerName })}</p>
          </>
        ) : lordClaimed ? (
          <>
            {darkPortrait}
            <h2 className="font-serif text-2xl text-amber-400">{t("ending.claimTitle")}</h2>
            <p className="mt-3 text-sm text-neutral-300">{t("ending.claimText", { name: bearerName })}</p>
          </>
        ) : (
          <>
            {darkPortrait}
            <h2 className="font-serif text-2xl text-amber-400">{t("ending.lordTitle", { name: bearerName })}</h2>
            <p className="mt-3 text-sm text-neutral-300">{t("ending.lordText", { name: bearerName })}</p>
          </>
        )}
        <div className="mt-5 flex flex-col gap-2">
          {ending === "victory" && onContinue && (
            <button
              type="button"
              className="rounded border border-emerald-700 bg-emerald-900/40 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-900/70"
              onClick={onContinue}
            >
              {t("ending.wander")}
            </button>
          )}
          <button
            type="button"
            className="rounded border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700"
            onClick={onViewStats}
          >
            {t("ending.viewStats")}
          </button>
          <button
            type="button"
            className="rounded border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700"
            onClick={onReplay}
          >
            {t("ending.replay")}
          </button>
        </div>
    </Modal>
  );
}
