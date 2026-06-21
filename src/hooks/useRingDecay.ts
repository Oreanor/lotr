import { useEffect, useRef } from "react";

// The Ring's corruption accrues for whoever currently carries it: one day per
// day travelled, plus one per day it was worn in battle (`ringWear`). It freezes
// while the Ring is fled (a chase) or once it's been unmade (freeplay) — both
// folded into `carrying`. Each counter's last-seen value is tracked so only the
// new delta is added to the bearer's tally.
export function useRingDecay({
  journeyDay,
  ringWear,
  bearerId,
  carrying,
  addRingDays,
}: {
  journeyDay: number;
  ringWear: number;
  bearerId: string | null;
  carrying: boolean;
  addRingDays: (bearerId: string, delta: number) => void;
}) {
  const prevDay = useRef(journeyDay);
  const prevWear = useRef(ringWear);

  useEffect(() => {
    const delta = journeyDay - prevDay.current;
    prevDay.current = journeyDay;
    if (delta > 0 && bearerId && carrying) {
      addRingDays(bearerId, delta);
    }
  }, [journeyDay, bearerId, carrying, addRingDays]);

  useEffect(() => {
    const delta = ringWear - prevWear.current;
    prevWear.current = ringWear;
    if (delta > 0 && bearerId && carrying) {
      addRingDays(bearerId, delta);
    }
  }, [ringWear, bearerId, carrying, addRingDays]);
}
