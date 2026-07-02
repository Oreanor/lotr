import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import { levelForExp } from "@/game/rules";
import type { ChronicleEntry, TransportId } from "@/game/types";

// How many chronicle entries the save carries; the oldest fall off past this so a
// long or looping playthrough never bloats localStorage.
const CHRONICLE_MAX = 1000;

// Owns the journey chronicle: the log itself, where the party is currently
// stationed (for tagging events town-vs-road), and the self-contained watchers
// that log transport changes and average-level milestones. The game code just
// calls `chronicleRef.current(key, params)` at the moment each event happens.
export function useChronicle(opts: {
  journeyDayRef: MutableRefObject<number>;
  initialChronicle?: ChronicleEntry[];
  transport: TransportId | null;
  expById: Record<string, number>;
  party: string[];
}) {
  const { journeyDayRef, initialChronicle, transport, expById, party } = opts;

  const [chronicle, setChronicle] = useState<ChronicleEntry[]>(() => initialChronicle ?? []);

  // Seed the stationed town and last arrival from the saved log so a resume
  // doesn't mislabel events "on the road" or re-announce the town you loaded in.
  const savedArrivals = initialChronicle?.filter(
    (e) => e.key === "arrive" && typeof e.at === "number",
  );
  const lastSavedArrival = savedArrivals?.[savedArrivals.length - 1];
  const stationedTownRef = useRef<number | null>(lastSavedArrival?.at ?? null);
  const lastArrivalRef = useRef<{ id: number; day: number } | null>(
    lastSavedArrival ? { id: lastSavedArrival.at as number, day: lastSavedArrival.day } : null,
  );

  const log = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      setChronicle((prev) => {
        const entry: ChronicleEntry = {
          day: journeyDayRef.current,
          key,
          params,
          at: stationedTownRef.current ?? undefined,
        };
        return prev.length >= CHRONICLE_MAX
          ? [...prev.slice(prev.length - CHRONICLE_MAX + 1), entry]
          : [...prev, entry];
      });
    },
    [journeyDayRef],
  );
  // A stable ref so the many call-sites can log from callbacks with empty deps
  // without churning their identity.
  const chronicleRef = useRef(log);
  chronicleRef.current = log;

  // Reaching a town: from now events happen "at" it; and unless it's a mere
  // re-open of the town we're already in, chronicle the arrival with days in
  // transit (the narrator draws the leg's fights/losses from the events between).
  const noteArrival = useCallback(
    (locationId: number, place: string) => {
      stationedTownRef.current = locationId;
      const prev = lastArrivalRef.current;
      if (!prev || prev.id !== locationId) {
        const days = prev ? Math.max(0, journeyDayRef.current - prev.day) : 0;
        chronicleRef.current("arrive", { place, days });
        lastArrivalRef.current = { id: locationId, day: journeyDayRef.current };
      }
    },
    [journeyDayRef],
  );

  // Setting out for a new destination — no longer stationed anywhere.
  const clearStationed = useCallback(() => {
    stationedTownRef.current = null;
  }, []);

  // Transport changes in one place: boarding a ship, mounting up, taking to the
  // Eagles — and setting foot back on the road when it ends.
  const prevTransportRef = useRef(transport);
  useEffect(() => {
    const prev = prevTransportRef.current;
    if (prev === transport) {
      return;
    }
    prevTransportRef.current = transport;
    if (transport) {
      chronicleRef.current(`board_${transport}`);
    } else if (prev === "ship") {
      chronicleRef.current("disembark");
    } else if (prev === "eagle") {
      chronicleRef.current("landEagle");
    } else {
      chronicleRef.current("dismount");
    }
  }, [transport]);

  // Average-party-level crossing a fresh decade (10th, 20th, …). The first pass
  // only sets the baseline so a resumed save doesn't re-announce.
  const levelMilestoneRef = useRef(0);
  const milestoneReadyRef = useRef(false);
  useEffect(() => {
    if (party.length === 0) {
      return;
    }
    const avg =
      party.reduce((sum, id) => sum + levelForExp(expById[id] ?? 0).level, 0) / party.length;
    const decade = Math.floor(avg / 10) * 10;
    if (!milestoneReadyRef.current) {
      milestoneReadyRef.current = true;
      levelMilestoneRef.current = decade;
      return;
    }
    if (decade >= 10 && decade > levelMilestoneRef.current) {
      levelMilestoneRef.current = decade;
      chronicleRef.current("levelMilestone", { level: decade });
    }
  }, [expById, party]);

  return { chronicle, chronicleRef, noteArrival, clearStationed };
}
