import { useTranslation } from "react-i18next";
import { Modal } from "@/components/ui/Modal";
import { ZoomableImage } from "@/components/ui/ZoomableImage";
import { iconVariant } from "@/game";
import type { Character } from "@/game";

export type Ending =
  | "victory"
  // Gollum springs for the Precious at the brink and falls with it into the Fire
  // — the Ring unmade in spite of the bearer (as the tale truly ended).
  | "gollumFall"
  | "lord"
  | "starved"
  | "battle"
  | "nothing"
  | "rogueLord"
  | "sauron"
  | "valinorWest"
  | "valinorRing"
  | "valinorSink"
  // The bearer fell and only a companion who cannot truly carry the Ring is left;
  // each takes it to a different doom.
  | "sarumanLord"
  | "boromirGondor"
  | "bombadilLost"
  | "gollumHides"
  | "treebeardBuries"
  | "deadKeep";

// Artwork for the endings that have it (in /public/endings). The two "Valar
// refuse" sea endings share the one painting.
const ENDING_IMAGE: Partial<Record<Ending, string>> = {
  victory: "/endings/ring_destroyed.jpg",
  gollumFall: "/endings/ring_destroyed.jpg",
  sauron: "/endings/sauron.jpg",
  valinorWest: "/endings/to_valinor.jpg",
  valinorRing: "/endings/valar_refuse.jpg",
  valinorSink: "/endings/valar_refuse.jpg",
};

// One classification of each ending drives both the border and the title colour
// (win = green, claiming the Ring = amber, everything else = a red defeat).
type Tone = "win" | "lord" | "loss";
const ENDING_TONE: Record<Ending, Tone> = {
  victory: "win",
  gollumFall: "win",
  valinorWest: "win",
  lord: "lord",
  rogueLord: "lord",
  starved: "loss",
  battle: "loss",
  nothing: "loss",
  sauron: "loss",
  valinorRing: "loss",
  valinorSink: "loss",
  sarumanLord: "lord",
  boromirGondor: "loss",
  bombadilLost: "loss",
  gollumHides: "loss",
  treebeardBuries: "loss",
  deadKeep: "loss",
};
const TONE_BORDER: Record<Tone, string> = {
  win: "border-emerald-700",
  lord: "border-amber-700",
  loss: "border-red-800",
};
const TONE_TITLE: Record<Tone, string> = {
  win: "text-emerald-400",
  lord: "text-amber-400",
  loss: "text-red-400",
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
  const endingImage = ENDING_IMAGE[ending] ?? null;
  const tone = ENDING_TONE[ending];
  const borderClass = TONE_BORDER[tone];
  const titleClass = `font-serif text-2xl ${TONE_TITLE[tone]}`;
  const darkPortrait = bearer && (
    <img
      src={iconVariant(bearer.icon, "dark")}
      alt=""
      className="mx-auto mb-3 size-28 border border-amber-800 object-cover"
    />
  );

  return (
    <Modal open={open} overlayClassName="bg-black/85" className={`flex max-h-[90vh] w-full max-w-sm flex-col text-center ${borderClass}`}>
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
      {endingImage && <ZoomableImage key={endingImage} src={endingImage} alt="" />}

      {ending === "starved" ? (
          <>
            <h2 className={titleClass}>{t("ending.starvedTitle")}</h2>
            <p className="mt-3 text-sm text-neutral-300">{t("ending.starvedText", { name: bearerName })}</p>
          </>
        ) : ending === "battle" ? (
          <>
            <h2 className={titleClass}>{t("ending.battleTitle")}</h2>
            <p className="mt-3 text-sm text-neutral-300">{t("ending.battleText", { name: bearerName })}</p>
          </>
        ) : ending === "victory" ? (
          <>
            <h2 className={titleClass}>{t("ending.victoryTitle")}</h2>
            <p className="mt-3 text-sm text-neutral-300">{t("ending.victoryText")}</p>
          </>
        ) : ending === "gollumFall" ? (
          <>
            <h2 className={titleClass}>{t("ending.gollumFallTitle")}</h2>
            <p className="mt-3 text-sm text-neutral-300">{t("ending.gollumFallText", { name: bearerName })}</p>
          </>
        ) : ending === "nothing" ? (
          <>
            <h2 className={titleClass}>{t("ending.nothingTitle")}</h2>
            <p className="mt-3 text-sm text-neutral-300">{t("ending.nothingText", { name: bearerName })}</p>
          </>
        ) : ending === "sauron" ? (
          <>
            <h2 className={titleClass}>{t("ending.sauronTitle")}</h2>
            <p className="mt-3 text-sm text-neutral-300">{t("ending.sauronText", { name: bearerName })}</p>
          </>
        ) : ending === "valinorWest" ? (
          <>
            <h2 className={titleClass}>{t("ending.valinorWestTitle")}</h2>
            <p className="mt-3 text-sm text-neutral-300">{t("ending.valinorWestText")}</p>
          </>
        ) : ending === "valinorRing" ? (
          <>
            <h2 className={titleClass}>{t("ending.valinorRingTitle")}</h2>
            <p className="mt-3 text-sm text-neutral-300">{t("ending.valinorRingText", { name: bearerName })}</p>
          </>
        ) : ending === "valinorSink" ? (
          <>
            <h2 className={titleClass}>{t("ending.valinorSinkTitle")}</h2>
            <p className="mt-3 text-sm text-neutral-300">{t("ending.valinorSinkText")}</p>
          </>
        ) : ending === "sarumanLord" ||
          ending === "boromirGondor" ||
          ending === "bombadilLost" ||
          ending === "gollumHides" ||
          ending === "treebeardBuries" ||
          ending === "deadKeep" ? (
          <>
            <h2 className={titleClass}>{t(`ending.${ending}Title`)}</h2>
            <p className="mt-3 text-sm text-neutral-300">{t(`ending.${ending}Text`)}</p>
          </>
        ) : ending === "rogueLord" ? (
          <>
            {darkPortrait}
            <h2 className={titleClass}>{t("ending.rogueLordTitle", { name: bearerName })}</h2>
            <p className="mt-3 text-sm text-neutral-300">{t("ending.rogueLordText", { name: bearerName })}</p>
          </>
        ) : doomBetrayal ? (
          <>
            {darkPortrait}
            <h2 className={titleClass}>{t("ending.betrayTitle", { name: bearerName })}</h2>
            <p className="mt-3 text-sm text-neutral-300">{t("ending.betrayText", { name: bearerName })}</p>
          </>
        ) : lordClaimed ? (
          <>
            {darkPortrait}
            <h2 className={titleClass}>{t("ending.claimTitle")}</h2>
            <p className="mt-3 text-sm text-neutral-300">{t("ending.claimText", { name: bearerName })}</p>
          </>
        ) : (
          <>
            {darkPortrait}
            <h2 className={titleClass}>{t("ending.lordTitle", { name: bearerName })}</h2>
            <p className="mt-3 text-sm text-neutral-300">{t("ending.lordText", { name: bearerName })}</p>
          </>
        )}
        </div>
        <div className="border-t border-white/10 p-4">
        <div className="flex flex-col gap-2">
          {(ending === "victory" || ending === "gollumFall") && onContinue && (
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
        </div>
    </Modal>
  );
}
