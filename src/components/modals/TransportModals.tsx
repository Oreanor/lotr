import { useTranslation } from "react-i18next";
import { Modal } from "@/components/ui/Modal";
import { TransportIcon } from "@/components/ui/TransportIcon";
import type { TransportId } from "@/game";

// Confirm replacing the current transport with a newly offered one.
export function TransportConfirmModal({
  from,
  to,
  onConfirm,
  onCancel,
}: {
  from: TransportId | null;
  to: TransportId | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal open={to !== null} overlayClassName="bg-black/60" className="w-full max-w-xs border-neutral-700 p-4 sm:p-6 text-center">
      {to && (
        <div className="mb-4 flex items-center justify-center gap-3">
          <TransportIcon transport={from} className="size-8 object-contain opacity-80" />
          <span className="text-lg text-neutral-500">→</span>
          <TransportIcon transport={to} className="size-8 object-contain" />
        </div>
      )}
      <p className="text-sm text-neutral-200">
        {t("transport.switchPrompt", {
          from: from ? t(`transport.${from}`) : "",
          to: to ? t(`transport.${to}`) : "",
        })}
      </p>
      <div className="mt-5 flex flex-col gap-2">
        <button
          type="button"
          className="rounded border border-emerald-700 bg-emerald-900/40 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-900/70"
          onClick={onConfirm}
        >
          {t("transport.switchYes")}
        </button>
        <button
          type="button"
          className="rounded border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700"
          onClick={onCancel}
        >
          {t("transport.switchNo")}
        </button>
      </div>
    </Modal>
  );
}

// The eagles of Manwë grew tired and flew off.
export function EaglesLeftModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Modal open={open} overlayClassName="bg-black/60" className="w-full max-w-xs border-amber-800 p-4 sm:p-6 text-center">
      <TransportIcon transport="eagle" className="mx-auto size-12 object-contain" />
      <h2 className="mt-2 font-serif text-xl text-amber-200">{t("transport.eaglesLeftTitle")}</h2>
      <p className="mt-2 text-sm text-neutral-300">{t("transport.eaglesLeftText")}</p>
      <button
        type="button"
        className="mt-5 rounded border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700"
        onClick={onClose}
      >
        {t("farmResult.ok")}
      </button>
    </Modal>
  );
}
