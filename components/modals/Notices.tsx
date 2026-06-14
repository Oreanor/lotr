import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "@/components/ui/Modal";
import type { DeathCause, RecruitRefusalNotice } from "@/game";

const REFUSAL_GAP_PX = 12;

function topAbovePortraitRow(viewport: HTMLElement, gap = REFUSAL_GAP_PX): number | null {
  const locationModal = viewport.querySelector<HTMLElement>("[data-location-modal]");
  // Inside a location modal: anchor above its recruit row, or centre (null) when
  // there isn't one — don't jump up to the party panel at the top of the screen.
  // On the open map (no location modal): anchor above the party portraits.
  const row = locationModal
    ? locationModal.querySelector<HTMLElement>("[data-recruit-portraits]")
    : viewport.querySelector<HTMLElement>("[data-party-portraits]");
  if (!row) {
    return null;
  }
  const portrait = row.querySelector<HTMLElement>("[data-character-portrait]");
  if (!portrait) {
    return null;
  }
  const portraitRect = portrait.getBoundingClientRect();
  const viewportRect = viewport.getBoundingClientRect();
  return portraitRect.top - viewportRect.top - gap;
}

// Voiced refusal bubble — quote only, centered above the portrait row.
export function RecruitRefusalModal({
  notice,
  viewportRef,
  onClose,
}: {
  notice: RecruitRefusalNotice | null;
  viewportRef: RefObject<HTMLElement | null>;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(notice !== null);
  const [shown, setShown] = useState(false);
  const [top, setTop] = useState<number | null>(null);
  const lastNotice = useRef<RecruitRefusalNotice | null>(null);
  if (notice) {
    lastNotice.current = notice;
  }

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || (!notice && !lastNotice.current)) {
      setTop(null);
      return;
    }
    const measure = () => setTop(topAbovePortraitRow(viewport));
    measure();
    const id = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(id);
  }, [notice, viewportRef]);

  useEffect(() => {
    if (notice) {
      setMounted(true);
      const id = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(id);
    }
    setShown(false);
    const id = window.setTimeout(() => setMounted(false), 150);
    return () => window.clearTimeout(id);
  }, [notice]);

  if (!mounted || !lastNotice.current) {
    return null;
  }

  const handleClose = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.preventDefault();
    onClose();
  };

  const anchored = top !== null;

  return (
    <div
      className="absolute inset-0 z-[60]"
      onPointerDown={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`absolute left-1/2 w-full max-w-xs rounded border border-neutral-700 bg-neutral-900 p-4 text-center shadow-2xl transition duration-150 ${
          anchored ? "-translate-x-1/2 -translate-y-full" : "-translate-x-1/2 -translate-y-1/2"
        } ${shown ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
        style={anchored ? { top } : { top: "50%" }}
      >
        <p className="text-sm text-neutral-200">{lastNotice.current.message}</p>
        <button
          type="button"
          className="mt-3 rounded border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700"
          onClick={handleClose}
        >
          {t("farmResult.ok")}
        </button>
      </div>
    </div>
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
