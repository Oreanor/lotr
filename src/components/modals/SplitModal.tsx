import { useTranslation } from "react-i18next";
import { Modal } from "@/components/ui/Modal";
import type { Character } from "@/game";

// Leave a companion on the map (re-callable) or dismiss them for good.
export function SplitModal({
  open,
  members,
  charName,
  onLeave,
  onDismiss,
  onClose,
}: {
  open: boolean;
  members: Character[];
  charName: (id: string) => string;
  onLeave: (id: string) => void;
  onDismiss: (id: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal
      open={open}
      overlayClassName="bg-black/60"
      className="flex max-h-[80vh] w-full max-w-sm flex-col border-neutral-700"
    >
      <div className="border-b border-neutral-800 px-5 py-4">
        <h2 className="font-serif text-xl text-neutral-100">{t("split.title")}</h2>
        <p className="mt-1 text-xs text-neutral-500">{t("split.hint")}</p>
      </div>
      <ul className="overflow-y-auto px-5 py-3">
        {members.map((character) => (
          <li
            key={character.id}
            className="flex items-center gap-3 border-b border-neutral-800 py-2 last:border-b-0"
          >
            <img
              src={character.icon}
              alt=""
              className="size-12 border border-neutral-700 bg-parchment object-cover"
            />
            <span className="flex-1 text-sm text-neutral-200">{charName(character.id)}</span>
            <button
              type="button"
              onClick={() => onLeave(character.id)}
              className="rounded border border-amber-700 bg-amber-900/30 px-2 py-1 text-xs font-semibold text-amber-200 transition hover:bg-amber-900/60"
            >
              {t("split.leave")}
            </button>
            <button
              type="button"
              onClick={() => onDismiss(character.id)}
              className="rounded border border-red-800 bg-red-900/30 px-2 py-1 text-xs font-semibold text-red-200 transition hover:bg-red-900/60"
            >
              {t("split.dismiss")}
            </button>
          </li>
        ))}
        {members.length === 0 && (
          <li className="py-3 text-center text-sm text-neutral-500">{t("split.empty")}</li>
        )}
      </ul>
      <div className="border-t border-neutral-800 px-5 py-4">
        <button
          type="button"
          className="w-full rounded border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700"
          onClick={onClose}
        >
          {t("split.done")}
        </button>
      </div>
    </Modal>
  );
}
