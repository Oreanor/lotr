import { useTranslation } from "react-i18next";
import { Modal } from "@/components/ui/Modal";

// Shown when a flee attempt fails — the luck roll came up short and there's no
// slipping away this time.
export function EscapeFailedModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Modal
      open={open}
      overlayClassName="bg-black/85"
      z="z-[60]"
      className="w-full max-w-sm border-red-800 p-6 text-center"
    >
      <h2 className="font-serif text-2xl text-red-300">{t("escape.failedTitle")}</h2>
      <p className="mt-3 text-sm text-neutral-300">{t("escape.failedText")}</p>
      <button
        type="button"
        className="mt-5 rounded border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700"
        onClick={onClose}
      >
        {t("escape.close")}
      </button>
    </Modal>
  );
}
