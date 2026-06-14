import { useTranslation } from "react-i18next";
import { Modal } from "@/components/ui/Modal";
import type { DeathCause } from "@/game";

// Simple "voiced refusal" popup when a companion declines to join.
export function RecruitRefusalModal({
  message,
  onClose,
}: {
  message: string | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal open={message !== null} overlayClassName="bg-black/60" className="w-full max-w-xs border-neutral-700 p-6 text-center">
      <p className="text-sm text-neutral-200">{message}</p>
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

// Result of foraging for food (`farmed` is null while closed).
export function FarmResultModal({ farmed, onClose }: { farmed: number | null; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Modal open={farmed !== null} overlayClassName="bg-black/60" className="w-full max-w-xs border-amber-800 p-6 text-center">
      <div className="text-4xl">🍞</div>
      <h2 className="mt-2 font-serif text-xl text-amber-200">
        {(farmed ?? 0) > 0 ? t("farmResult.got", { n: farmed ?? 0 }) : t("farmResult.full")}
      </h2>
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

// A companion died (hunger or battle). `notice` carries comma-joined ids + cause.
export function DeathNoticeModal({
  notice,
  charName,
  onContinue,
}: {
  notice: { ids: string; cause: DeathCause } | null;
  charName: (id: string) => string;
  onContinue: () => void;
}) {
  const { t } = useTranslation();
  const names = notice
    ? notice.ids
        .split(",")
        .map((id) => charName(id))
        .join(", ")
    : "";
  return (
    <Modal open={notice !== null} className="w-full max-w-sm border-red-800 p-6 text-center">
      <h2 className="font-serif text-2xl text-red-400">{t("death.title", { names })}</h2>
      <p className="mt-3 text-sm text-neutral-300">
        {t(notice?.cause === "battle" ? "death.battleText" : "death.text", {
          count: notice ? notice.ids.split(",").length : 1,
          names,
        })}
      </p>
      <button
        type="button"
        className="mt-5 rounded border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700"
        onClick={onContinue}
      >
        {t("death.continue")}
      </button>
    </Modal>
  );
}
