import { useTranslation } from "react-i18next";
import { Modal } from "@/components/ui/Modal";
import { iconVariant, ringImage } from "@/game";
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
            src={iconVariant(fled.icon, "dark")}
            alt=""
            className="mx-auto mb-3 size-24 border border-amber-800 object-cover"
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

// After beating the rogue and reclaiming the Ring: pick who carries it now.
export function BearerChooserModal({
  fromId,
  candidates,
  charName,
  iconFor,
  onChoose,
}: {
  fromId: string | null;
  candidates: Character[];
  charName: (id: string) => string;
  iconFor: (c: Character) => string;
  onChoose: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal
      open={fromId !== null}
      overlayClassName="bg-black/85"
      className="w-full max-w-sm border-amber-700 p-6 text-center"
    >
      {fromId && (
        <>
          <img src={ringImage} alt="" className="mx-auto mb-3 size-12 object-contain" />
          <h2 className="font-serif text-2xl text-amber-400">{t("rogue.reclaimedTitle")}</h2>
          <p className="mt-2 text-sm text-neutral-300">
            {t("rogue.reclaimedText", { name: charName(fromId) })}
          </p>
          <p className="mt-3 text-xs uppercase tracking-wide text-amber-500/80">
            {t("rogue.chooseBearer")}
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {candidates.map((character) => (
              <button
                key={character.id}
                type="button"
                onClick={() => onChoose(character.id)}
                className="flex items-center gap-3 rounded border border-neutral-700 bg-neutral-800 px-3 py-2 text-left transition hover:bg-neutral-700"
              >
                <img
                  src={iconFor(character)}
                  alt=""
                  className="size-10 shrink-0 border border-neutral-600 bg-parchment object-cover"
                />
                <span className="text-sm font-semibold text-neutral-100">{charName(character.id)}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}
