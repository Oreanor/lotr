import { useTranslation } from "react-i18next";
import { Modal } from "@/components/ui/Modal";
import { uniquePackTypes } from "@/game";
import type { EncounterState } from "@/game";

// Pre-fight screen: shows the (possibly mixed) pack and accept/flee choices.
export function EncounterModal({
  encounter,
  monsterName,
  onAccept,
  onFlee,
}: {
  encounter: EncounterState | null;
  monsterName: (icon: string) => string;
  onAccept: () => void;
  onFlee: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal open={encounter !== null} className="w-full max-w-sm border-red-800 p-6 text-center">
      {encounter && (
        <>
      <h2 className="font-serif text-2xl text-red-300">{t("encounter.title")}</h2>
        <div className="mt-3 flex flex-wrap justify-center gap-3">
          {uniquePackTypes(encounter.pack).map((mm) => (
            <div key={mm.icon} className="flex w-24 flex-col items-center gap-1">
              <img
                src={mm.icon}
                alt=""
                draggable="false"
                className="size-20 select-none border border-neutral-700 bg-parchment object-cover"
              />
              <span className="w-full truncate text-center text-[10px] leading-tight text-neutral-300">
                {monsterName(mm.icon)}
              </span>
            </div>
          ))}
        </div>
        {encounter.pack.length === 1 && (
          <p className="mt-2 text-xs text-neutral-400">
            {t("encounter.stats", {
              str: encounter.pack[0].strength,
              def: encounter.pack[0].defense,
            })}
          </p>
        )}
        {encounter.dangerous && (
          <p className="mt-2 text-sm font-semibold text-amber-400">{t("encounter.dangerous")}</p>
        )}
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            className="w-full rounded border border-red-800 bg-red-900/40 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-900/70"
            onClick={onAccept}
          >
            {t("encounter.accept")}
          </button>
          <button
            type="button"
            className="w-full rounded border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700"
            onClick={onFlee}
          >
            {t("encounter.flee")}
          </button>
        </div>
        </>
      )}
    </Modal>
  );
}
