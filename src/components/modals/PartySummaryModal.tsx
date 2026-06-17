import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "@/components/ui/Modal";
import { ringImage } from "@/game";
import type { CharacterStats } from "@/game";

export interface PartySummaryRow {
  id: string;
  icon: string;
  level: number;
  stats: CharacterStats;
}

// Roster overview for the active group: one row per member, columns for every
// stat. Two flavours of the same table:
//  • "inspect" — tapping a row drills into that hero's full panel.
//  • "bearer"  — a forced choice of who carries the Ring next: tap to select,
//    then confirm. The corruption column makes it an informed pick.
export function PartySummaryModal({
  open,
  rows,
  bearerId,
  charName,
  onSelect,
  onClose,
  variant = "inspect",
}: {
  open: boolean;
  rows: PartySummaryRow[];
  bearerId: string;
  charName: (id: string) => string;
  onSelect: (id: string) => void;
  onClose: () => void;
  variant?: "inspect" | "bearer";
}) {
  const { t } = useTranslation();
  const bearerMode = variant === "bearer";
  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => {
    if (!open) {
      setSelectedId(null);
    }
  }, [open]);

  const cols: { key: string; label: string; title: string }[] = [
    { key: "lvl", label: t("partyTable.colLvl"), title: t("partyTable.level") },
    { key: "hp", label: t("partyTable.colHp"), title: t("character.health") },
    { key: "str", label: t("partyTable.colStr"), title: t("character.strength") },
    { key: "def", label: t("partyTable.colDef"), title: t("character.defense") },
    { key: "int", label: t("partyTable.colInt"), title: t("character.intelligence") },
    { key: "lck", label: t("partyTable.colLck"), title: t("character.luck") },
    { key: "ring", label: t("partyTable.colRing"), title: t("character.ringPower") },
  ];

  const selected = selectedId ? (rows.find((row) => row.id === selectedId) ?? null) : null;

  const handleRow = (row: PartySummaryRow) => {
    if (bearerMode) {
      if (!row.stats.dead) {
        setSelectedId(row.id);
      }
      return;
    }
    onSelect(row.id);
  };

  return (
    <Modal
      open={open}
      overlayClassName={bearerMode ? "bg-black/85" : "bg-black/70"}
      className={`w-full max-w-lg p-5 ${bearerMode ? "border-amber-700" : "border-neutral-700"}`}
    >
      {bearerMode && <img src={ringImage} alt="" className="mx-auto mb-2 size-10 object-contain" />}
      <h2
        className={`font-serif text-xl ${
          bearerMode ? "text-center text-amber-400" : "text-neutral-100"
        }`}
      >
        {bearerMode ? t("rogue.chooseNewTitle") : t("partyTable.title")}
      </h2>
      <p className={`mt-1 text-xs ${bearerMode ? "text-center text-amber-500/80" : "text-neutral-500"}`}>
        {bearerMode ? t("rogue.chooseNewBearer") : t("partyTable.hint")}
      </p>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-700 text-xs text-neutral-400">
              <th className="py-1.5 pr-2 text-left font-medium">{t("partyTable.member")}</th>
              {cols.map((col) => (
                <th key={col.key} title={col.title} className="px-1.5 py-1.5 text-center font-medium">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isSelected = bearerMode && row.id === selectedId;
              const disabled = bearerMode && row.stats.dead;
              return (
                <tr
                  key={row.id}
                  onClick={() => handleRow(row)}
                  className={`border-b border-neutral-800 transition ${
                    disabled
                      ? "cursor-default opacity-40"
                      : "cursor-pointer hover:bg-neutral-800"
                  } ${isSelected ? "bg-amber-950/40 ring-1 ring-inset ring-amber-500" : ""} ${
                    !bearerMode && row.stats.dead ? "opacity-50" : ""
                  }`}
                >
                  <td className="py-1.5 pr-2">
                    <span className="flex items-center gap-2">
                      <img
                        src={row.icon}
                        alt=""
                        draggable={false}
                        className="size-8 shrink-0 select-none border border-neutral-700 bg-parchment object-cover"
                      />
                      <span className="flex min-w-0 items-center gap-1">
                        <span className="truncate text-neutral-100">{charName(row.id)}</span>
                        {row.id === bearerId && (
                          <img
                            src={ringImage}
                            alt={t("character.bearer")}
                            title={t("character.bearer")}
                            draggable={false}
                            className="size-3.5 shrink-0 select-none object-contain"
                          />
                        )}
                      </span>
                    </span>
                  </td>
                  <td className="px-1.5 text-center tabular-nums text-neutral-200">
                    {row.stats.dead ? "—" : row.level}
                  </td>
                  <td className="px-1.5 text-center tabular-nums text-neutral-200">
                    {row.stats.dead ? "†" : `${row.stats.health}/${row.stats.maxHealth}`}
                  </td>
                  <td className="px-1.5 text-center tabular-nums text-neutral-200">{row.stats.strength}</td>
                  <td className="px-1.5 text-center tabular-nums text-neutral-200">{row.stats.defense}</td>
                  <td className="px-1.5 text-center tabular-nums text-neutral-200">{row.stats.intelligence}</td>
                  <td className="px-1.5 text-center tabular-nums text-neutral-200">{row.stats.luck}</td>
                  <td className="px-1.5 text-center tabular-nums text-yellow-400">{row.stats.corruption}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {bearerMode ? (
        <button
          type="button"
          disabled={!selected}
          onClick={() => selected && onSelect(selected.id)}
          className="mt-4 w-full rounded border border-amber-700 bg-amber-900/40 px-4 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-900/70 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-amber-900/40"
        >
          {selected ? t("rogue.giveRing", { name: charName(selected.id) }) : t("rogue.chooseNewBearer")}
        </button>
      ) : (
        <button
          type="button"
          className="mt-4 w-full rounded border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700"
          onClick={onClose}
        >
          {t("partyTable.close")}
        </button>
      )}
    </Modal>
  );
}
