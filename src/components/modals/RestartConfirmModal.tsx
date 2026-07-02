import { useTranslation } from "react-i18next";
import { Modal } from "@/components/ui/Modal";

// "Start over?" confirmation. Pure presentation — the page owns the flag and the
// actual restart.
export function RestartConfirmModal({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal open={open} className="w-full max-w-sm border-neutral-700 p-5">
      <h2 className="text-center font-serif text-xl text-neutral-100">{t("ui.restartConfirmTitle")}</h2>
      <p className="mt-3 text-center text-sm text-neutral-300">{t("ui.restartConfirmText")}</p>
      <div className="mt-5 flex justify-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700"
        >
          {t("ui.cancel")}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded border border-red-800 bg-red-900/60 px-4 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-900"
        >
          {t("ui.restartConfirm")}
        </button>
      </div>
    </Modal>
  );
}
