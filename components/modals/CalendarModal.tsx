import { useTranslation } from "react-i18next";
import { Modal } from "@/components/ui/Modal";
import type { RecruitmentCalendarEntry } from "@/game";

// Scrollable list of who can be recruited where and when.
export function CalendarModal({
  open,
  entries,
  journeyDate,
  charName,
  onClose,
}: {
  open: boolean;
  entries: RecruitmentCalendarEntry[];
  journeyDate: string;
  charName: (id: string) => string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal
      open={open}
      overlayClassName="bg-black/60"
      className="flex max-h-[80vh] w-full max-w-md flex-col border-neutral-700"
    >
      <div className="border-b border-neutral-800 px-5 py-4">
        <h2 className="font-serif text-xl text-neutral-100">{t("calendar.title")}</h2>
        <p className="mt-1 text-xs text-neutral-500">{t("calendar.today", { date: journeyDate })}</p>
      </div>

      <ul className="overflow-y-auto px-5 py-3">
        {entries.map((entry) => (
          <li
            key={`${entry.character.id}-${entry.locationLabel}-${entry.fromDay}-${entry.periodLabel}`}
            className={`flex items-center gap-3 border-b border-neutral-800 py-3 last:border-b-0 ${
              entry.isActive ? "text-neutral-100" : "text-neutral-400"
            }`}
          >
            <img
              src={entry.character.icon}
              alt=""
              className="size-9 shrink-0 rounded-full border-2 border-[#4a2a13] bg-parchment object-cover"
            />
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-medium">{charName(entry.character.id)}</p>
              <p className="truncate text-xs text-neutral-500">{entry.locationLabel}</p>
            </div>
            <div className="shrink-0 text-right text-xs">
              <p>{entry.periodLabel}</p>
              {entry.isActive && <p className="text-emerald-500">{t("calendar.now")}</p>}
            </div>
          </li>
        ))}
      </ul>

      <div className="border-t border-neutral-800 px-5 py-4">
        <button
          type="button"
          className="w-full rounded border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700"
          onClick={onClose}
        >
          {t("calendar.close")}
        </button>
      </div>
    </Modal>
  );
}
