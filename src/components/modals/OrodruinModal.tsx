import { useTranslation } from "react-i18next";
import { Modal } from "@/components/ui/Modal";

// The final choice at Mount Doom: destroy the Ring or claim it.
export function OrodruinModal({
  open,
  onDestroy,
  onClaim,
}: {
  open: boolean;
  onDestroy: () => void;
  onClaim: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal open={open} className="w-full max-w-sm border-amber-700 p-6 text-center">
      <h2 className="font-serif text-2xl text-neutral-100">{t("orodruin.title")}</h2>
      <p className="mt-3 text-sm text-neutral-300">{t("orodruin.text")}</p>
      <div className="mt-5 flex flex-col gap-2">
        <button
          type="button"
          className="rounded border border-emerald-700 bg-emerald-900/40 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-900/70"
          onClick={onDestroy}
        >
          {t("orodruin.destroy")}
        </button>
        <button
          type="button"
          className="rounded border border-amber-700 bg-amber-900/40 px-4 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-900/70"
          onClick={onClaim}
        >
          {t("orodruin.claim")}
        </button>
      </div>
    </Modal>
  );
}
