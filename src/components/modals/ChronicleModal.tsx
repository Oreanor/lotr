import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import type { ChronicleEntry } from "@/game";
import { buildChronicle } from "@/components/chronicleNarrative";
import { Modal } from "@/components/ui/Modal";

export function ChronicleModal({
  open,
  onClose,
  entries,
  months,
}: {
  open: boolean;
  onClose: () => void;
  entries: ChronicleEntry[];
  months: string[];
}) {
  const { t, i18n } = useTranslation();
  const blocks = useMemo(
    () => buildChronicle(entries, i18n.language, months),
    [entries, i18n.language, months],
  );
  return (
    <Modal
      open={open}
      onClose={onClose}
      align="top"
      z="z-[70]"
      className="flex max-h-[85vh] w-full max-w-lg flex-col border-neutral-700"
    >
      <div className="flex items-center justify-between gap-2 border-b border-neutral-800 px-4 py-3">
        <h2 className="font-serif text-lg text-neutral-100">{t("ui.chronicle")}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("ui.close")}
          title={t("ui.close")}
          className="flex size-8 shrink-0 items-center justify-center rounded text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-200"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="overflow-y-auto px-5 py-4">
        {blocks.length === 0 ? (
          <p className="py-8 text-center text-sm text-neutral-500">{t("chronicle.empty")}</p>
        ) : (
          <div className="flex flex-col gap-5">
            {blocks.map((block, i) => (
              <section key={i} className="flex flex-col gap-1.5">
                <h3 className="font-serif text-sm font-semibold text-amber-300/90">{block.title}</h3>
                {block.paragraphs.map((para, j) => (
                  <p key={j} className="text-sm leading-relaxed text-neutral-200">
                    {para}
                  </p>
                ))}
              </section>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
