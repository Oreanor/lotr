import { useTranslation } from "react-i18next";
import { Modal } from "@/components/ui/Modal";
import { ITEM_BY_ID, itemFamilyId } from "@/game";

export type TalkResult = {
  charId: string;
  itemIds: string[];
  greeting: string | null;
  place?: string;
  cloaks?: boolean;
};

// Result of talking to a companion: either a handed-over gift of items (icons +
// names + effects) or a one-line greeting.
export function TalkResultModal({
  result,
  charName,
  onClose,
}: {
  result: TalkResult | null;
  charName: (id: string) => string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const name = result ? charName(result.charId) : "";
  const items = result ? result.itemIds.map((id) => ITEM_BY_ID[id]).filter(Boolean) : [];
  const cloaks = result?.cloaks ?? false;
  return (
    <Modal
      open={result !== null}
      z="z-[60]"
      overlayClassName="bg-black/70"
      className="w-full max-w-xs border-sky-800 p-6 text-center"
    >
      {items.length > 0 || cloaks ? (
        <>
          <div className="flex justify-center gap-3 text-4xl leading-none">
            {items.map((it) => (
              <span key={it.id}>{it.icon}</span>
            ))}
            {cloaks && <span>🧥</span>}
          </div>
          <h2 className="mt-3 font-serif text-lg text-sky-200">{t("talk.giftTitle", { name })}</h2>
          <div className="mt-3 flex flex-col gap-2">
            {items.map((it) => (
              <div key={it.id}>
                <p className="text-sm font-semibold text-sky-100">{t(`item.${itemFamilyId(it.id)}.name`)}</p>
                <p className="text-xs text-sky-300/80">{t(`item.${itemFamilyId(it.id)}.desc`)}</p>
              </div>
            ))}
            {cloaks && (
              <div>
                <p className="text-sm font-semibold text-sky-100">{t("talk.cloaksName")}</p>
                <p className="text-xs text-sky-300/80">{t("talk.cloaksDesc")}</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <p className="text-sm italic text-neutral-200">
          «{result?.greeting ? t(result.greeting, { name, place: result.place ?? "" }) : ""}»
        </p>
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
