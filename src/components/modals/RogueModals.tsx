import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Flame } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { healthBarColorClass, healthBarWidthPct } from "@/components/ui/healthBar";
import { iconVariant, ringImage } from "@/game";
import type { Character, CharacterStats } from "@/game";

// Shown once when a companion succumbs to the Ring (or a betrayer wins) and bolts
// for Mount Doom with it — the party is now ringless and must hunt him down.
export function RogueFledModal({
  fled,
  charName,
  onContinue,
}: {
  fled: Character | null;
  charName: (id: string) => string;
  onContinue: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal open={fled !== null} overlayClassName="bg-black/85" className="w-full max-w-sm border-amber-700 p-6 text-center">
      {fled && (
        <>
          <img
            src={iconVariant(fled.icon, "dark")}
            alt=""
            className="mx-auto mb-3 size-24 border border-amber-800 object-cover"
          />
          <h2 className="font-serif text-2xl text-amber-400">{t("rogue.fledTitle")}</h2>
          <p className="mt-3 text-sm text-neutral-300">
            {t("rogue.fledText", { name: charName(fled.id) })}
          </p>
          <button
            type="button"
            className="mt-5 rounded border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700"
            onClick={onContinue}
          >
            {t("rogue.fledContinue")}
          </button>
        </>
      )}
    </Modal>
  );
}

// After beating the rogue and reclaiming the Ring: pick who carries it now.
export function BearerChooserModal({
  open,
  candidates,
  charName,
  iconFor,
  getStats,
  onChoose,
}: {
  open: boolean;
  candidates: Character[];
  charName: (id: string) => string;
  iconFor: (c: Character) => string;
  getStats: (id: string) => CharacterStats;
  onChoose: (id: string) => void;
}) {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => {
    if (!open) {
      setSelectedId(null);
    }
  }, [open]);

  const selected = selectedId ? (candidates.find((c) => c.id === selectedId) ?? null) : null;
  return (
    <Modal
      open={open}
      overlayClassName="bg-black/85"
      className="w-full max-w-md border-amber-700 p-6 text-center"
    >
      {open && (
        <>
          <img src={ringImage} alt="" className="mx-auto mb-3 size-12 object-contain" />
          <h2 className="font-serif text-2xl text-amber-400">{t("rogue.chooseNewTitle")}</h2>
          <p className="mt-3 text-xs uppercase tracking-wide text-amber-500/80">
            {t("rogue.chooseNewBearer")}
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-3">
            {candidates.map((character) => {
              const stats = getStats(character.id);
              const hpPct = healthBarWidthPct(stats.health, stats.maxHealth);
              return (
                <button
                  key={character.id}
                  type="button"
                  onClick={() => setSelectedId(character.id)}
                  className="flex w-20 flex-col items-center gap-1"
                >
                  <div
                    className={`relative size-16 overflow-hidden border bg-parchment transition sm:size-20 ${
                      selectedId === character.id
                        ? "border-amber-400 ring-2 ring-amber-400"
                        : "border-neutral-600 hover:brightness-95"
                    }`}
                  >
                    <img src={iconFor(character)} alt="" className="size-full object-cover" />
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1.5 bg-black/50">
                      <span
                        className={`block h-full ${healthBarColorClass(stats.health, stats.maxHealth)}`}
                        style={{ width: `${hpPct}%` }}
                      />
                    </span>
                  </div>
                  <span className="w-full truncate text-center text-[10px] leading-tight text-neutral-200">
                    {charName(character.id)}
                  </span>
                  <span className="flex items-center justify-center gap-1 text-[10px] tabular-nums text-yellow-400">
                    <Flame className="size-3.5 shrink-0 text-yellow-500" />
                    {stats.corruption}%
                  </span>
                </button>
              );
            })}
          </div>
          {selected && (
            <button
              type="button"
              onClick={() => onChoose(selected.id)}
              className="mt-5 w-full rounded border border-amber-700 bg-amber-900/40 px-4 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-900/70"
            >
              {t("rogue.giveRing", { name: charName(selected.id) })}
            </button>
          )}
        </>
      )}
    </Modal>
  );
}
