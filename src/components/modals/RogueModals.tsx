import { useTranslation } from "react-i18next";
import { Modal } from "@/components/ui/Modal";
import type { Character } from "@/game";

// Shown once when a companion succumbs to the Ring (or a betrayer wins) and bolts
// for Mount Doom with it — the party is now ringless and must hunt him down.
export function RogueFledModal({
  fled,
  charName,
  onContinue,
}: {
  fled: Character | null;
  charName: (id: string) => string;
  onContinue: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal open={fled !== null} overlayClassName="bg-black/85" className="w-full max-w-sm border-amber-700 p-6 text-center">
      {fled && (
        <>
          <img
            src={fled.icon}
            alt=""
            className="mx-auto mb-3 size-24 border border-amber-800 bg-parchment object-cover"
          />
          <h2 className="font-serif text-2xl text-amber-400">{t("rogue.fledTitle")}</h2>
          <p className="mt-3 text-sm text-neutral-300">
            {t("rogue.fledText", { name: charName(fled.id) })}
          </p>
          <button
            type="button"
            className="mt-5 rounded border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700"
            onClick={onContinue}
          >
            {t("rogue.fledContinue")}
          </button>
        </>
      )}
    </Modal>
  );
}
