import { useTranslation } from "react-i18next";
import { Modal } from "@/components/ui/Modal";
import type { Character } from "@/game";

// Offer to invite a defeated/waiting companion into the party.
export function RecruitOfferModal({
  offered,
  waiting,
  peaceful = false,
  charName,
  onAccept,
  onDecline,
}: {
  offered: Character | null;
  waiting: boolean;
  peaceful?: boolean;
  charName: (id: string) => string;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const { t } = useTranslation();
  const headingKey = peaceful ? "recruit.joins" : waiting ? "recruit.waiting" : "recruit.defeated";
  return (
    <Modal open={offered !== null} overlayClassName="bg-black/60" className="w-full max-w-xs border-neutral-700 p-6 text-center">
      {offered && (
        <>
          <img
            src={offered.icon}
            alt=""
            className="mx-auto size-16 border border-neutral-700 bg-parchment object-cover"
          />
          <h2 className="mt-3 font-serif text-xl text-neutral-100">
            {t(headingKey, { name: charName(offered.id) })}
          </h2>
          <p className="mt-1 text-sm text-neutral-300">{t("recruit.invitePrompt")}</p>
          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              className="rounded border border-emerald-700 bg-emerald-900/40 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-900/70"
              onClick={onAccept}
            >
              {t("recruit.invite")}
            </button>
            <button
              type="button"
              className="rounded border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700"
              onClick={onDecline}
            >
              {t("recruit.decline")}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
