import { useTranslation } from "react-i18next";
import { itemFamilyId } from "@/game";
import type { Item } from "@/game";

// One item "card" — icon, name (with an optional ×count for a batch of the same
// kind) and effect — matching how items read in the inventory picker, so a found
// item is recognisable later.
export function ItemTile({ item, count = 1 }: { item: Item; count?: number }) {
  const { t } = useTranslation();
  const family = itemFamilyId(item.id);
  return (
    <div className="flex w-24 flex-col items-center gap-1 rounded border border-sky-800/70 bg-sky-900/30 px-2 py-2 text-center">
      <span className="text-3xl leading-none">{item.icon}</span>
      <span className="text-xs font-semibold text-sky-100">
        {t(`item.${family}.name`)}
        {count > 1 ? ` ×${count}` : ""}
      </span>
      <span className="text-[11px] leading-tight text-sky-300/80">{t(`item.${family}.desc`)}</span>
    </div>
  );
}
