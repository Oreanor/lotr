import { useTranslation } from "react-i18next";
import { Modal } from "@/components/ui/Modal";
import { ItemTile } from "@/components/ui/ItemTile";
import { ITEM_BY_ID, itemFamilyId } from "@/game";

export type ExploreResult = {
  found: boolean;
  itemId?: string;
  itemIds?: string[];
  message?: string;
  messageParams?: Record<string, number>;
  emoji?: string;
};

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
  // Several found at once (e.g. an armoury cache) — group identical kinds so a
  // batch reads as one "×N" tile rather than a dozen copies.
  const grouped = (() => {
    const out: { item: (typeof ITEM_BY_ID)[string]; count: number }[] = [];
    const byFamily = new Map<string, number>();
    for (const id of result?.itemIds ?? []) {
      const it = ITEM_BY_ID[id];
      if (!it) continue;
      const fam = itemFamilyId(id);
      if (!byFamily.has(fam)) {
        byFamily.set(fam, out.length);
        out.push({ item: it, count: 1 });
      } else {
        out[byFamily.get(fam)!].count += 1;
      }
    }
    return out;
  })();
  return (
    <Modal
      open={result !== null}
      z="z-[60]"
      overlayClassName="bg-black/70"
      className="w-full max-w-xs border-sky-800 p-6 text-center"
    >
      {grouped.length > 0 ? (
        <>
          <h2 className="font-serif text-lg text-sky-200">{t("location.exploreFound")}</h2>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {grouped.map(({ item: it, count }) => (
              <ItemTile key={it.id} item={it} count={count} />
            ))}
          </div>
        </>
      ) : result?.message ? (
        <>
          <div className="text-5xl leading-none">{result.emoji ?? "💀"}</div>
          <p className="mt-3 text-sm text-sky-100">{t(result.message, result.messageParams)}</p>
        </>
      ) : result?.found && item ? (
        <>
          <h2 className="font-serif text-lg text-sky-200">{t("location.exploreFound")}</h2>
          <div className="mt-3 flex justify-center">
            <ItemTile item={item} />
          </div>
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
