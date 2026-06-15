import { useTranslation } from "react-i18next";
import { Modal } from "@/components/ui/Modal";
import { ITEM_BY_ID } from "@/game";

export type ExploreResult = { found: boolean; itemId?: string; message?: string };

// Shown after searching a location: the found item (icon + name + effect), or a
// "nothing found" note.
export function ExploreResultModal({
  result,
  onClose,
}: {
  result: ExploreResult | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const item = result?.itemId ? ITEM_BY_ID[result.itemId] : undefined;
  return (
    <Modal
      open={result !== null}
      z="z-[60]"
      overlayClassName="bg-black/70"
      className="w-full max-w-xs border-sky-800 p-6 text-center"
    >
      {result?.message ? (
        <>
          <div className="text-5xl leading-none">💀</div>
          <p className="mt-3 text-sm text-sky-100">{t(result.message)}</p>
        </>
      ) : result?.found && item ? (
        <>
          <div className="text-5xl leading-none">{item.icon}</div>
          <h2 className="mt-3 font-serif text-lg text-sky-200">{t("location.exploreFound")}</h2>
          <p className="mt-2 text-sm font-semibold text-sky-100">{t(`item.${item.id}.name`)}</p>
          <p className="mt-1 text-xs text-sky-300/80">{t(`item.${item.id}.desc`)}</p>
        </>
      ) : (
        <>
          <div className="text-5xl leading-none">🔍</div>
          <h2 className="mt-3 font-serif text-lg text-neutral-300">{t("location.exploreEmpty")}</h2>
        </>
      )}
      <button
        type="button"
        onClick={onClose}
        className="mt-5 rounded border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700"
      >
        {t("escape.close")}
      </button>
    </Modal>
  );
}
