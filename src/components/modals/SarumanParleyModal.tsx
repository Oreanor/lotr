import { useTranslation } from "react-i18next";
import { Modal } from "@/components/ui/Modal";

// Saruman beaten to half with a mercy advocate along: after the companions have
// pleaded/objected as battle bubbles, the bearer makes the final spare/fight
// call. Pure presentation — the page decides what each choice does.
export function SarumanParleyModal({
  open,
  onSpare,
  onFight,
}: {
  open: boolean;
  onSpare: () => void;
  onFight: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal
      open={open}
      z="z-[60]"
      overlayClassName="bg-black/70"
      className="w-full max-w-xs border-amber-800 p-6 text-center"
    >
      <p className="text-sm text-neutral-200">{t("sarumanParley.prompt")}</p>
      <div className="mt-5 flex flex-col gap-2">
        <button
          type="button"
          onClick={onSpare}
          className="rounded border border-emerald-700 bg-emerald-900/40 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-900/70"
        >
          {t("sarumanParley.spare")}
        </button>
        <button
          type="button"
          onClick={onFight}
          className="rounded border border-red-800 bg-red-900/40 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-900/70"
        >
          {t("sarumanParley.fight")}
        </button>
      </div>
    </Modal>
  );
}
