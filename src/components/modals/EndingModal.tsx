import { useTranslation } from "react-i18next";
import { Modal } from "@/components/ui/Modal";
import { iconVariant } from "@/game";
import type { Character } from "@/game";

export type Ending = "victory" | "lord" | "starved" | "battle" | "nothing" | "rogueLord" | "sauron";

// Terminal game-over screen. The page passes the outcome and the bearer.
export function EndingModal({
  open,
  ending,
  bearer,
  bearerName,
  lordClaimed,
  doomBetrayal = false,
  onReplay,
}: {
  open: boolean;
  ending: Ending;
  bearer: Character | undefined;
  bearerName: string;
  lordClaimed: boolean;
  doomBetrayal?: boolean;
  onReplay: () => void;
}) {
  const { t } = useTranslation();
  const borderClass =
    ending === "victory"
      ? "border-emerald-700"
      : ending === "starved" || ending === "battle" || ending === "nothing" || ending === "sauron"
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
        <button
          type="button"
          className="mt-5 rounded border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700"
          onClick={onReplay}
        >
          {t("ending.replay")}
        </button>
    </Modal>
  );
}
