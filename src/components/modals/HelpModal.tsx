import { useTranslation } from "react-i18next";
import { Modal } from "@/components/ui/Modal";

// "How to play" overlay. Pure presentation — the page just toggles it.
export function HelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Modal open={open} className="max-h-[85vh] w-full max-w-md overflow-y-auto border-neutral-700 p-6">
      <h2 className="font-serif text-2xl text-neutral-100">{t("help.title")}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-neutral-300">
        <p>{t("help.p1")}</p>
        <p>{t("help.p2")}</p>
        <p>{t("help.p3")}</p>
      </div>
      <button
        type="button"
        className="mt-5 w-full rounded border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700"
        onClick={onClose}
      >
        {t("help.ok")}
      </button>
    </Modal>
  );
}
