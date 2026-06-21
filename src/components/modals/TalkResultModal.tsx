import { useTranslation } from "react-i18next";
import { Modal } from "@/components/ui/Modal";
import { ItemTile } from "@/components/ui/ItemTile";
import { ITEM_BY_ID } from "@/game";

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
      className="w-full max-w-xs border-sky-800 p-4 sm:p-6 text-center"
    >
      {items.length > 0 || cloaks ? (
        <>
          <h2 className="font-serif text-lg text-sky-200">{t("talk.giftTitle", { name })}</h2>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {items.map((it) => (
              <ItemTile key={it.id} item={it} />
            ))}
            {cloaks && (
              <div className="flex w-24 flex-col items-center gap-1 rounded border border-sky-800/70 bg-sky-900/30 px-2 py-2 text-center">
                <img src="/ui/cloak.png" alt="" className="size-12 object-contain" />
                <span className="text-xs font-semibold text-sky-100">{t("talk.cloaksName")}</span>
                <span className="text-[11px] leading-tight text-sky-300/80">{t("talk.cloaksDesc")}</span>
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
