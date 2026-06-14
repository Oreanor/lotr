import { useCallback, useState } from "react";
import { ANIMATION_SPEEDS, readSavedSpeed, writeSavedSpeed } from "@/game";

// Travel and battle animation speeds, cycled through ANIMATION_SPEEDS and
// persisted to localStorage.
export function useSpeedSettings() {
  const [animationSpeed, setAnimationSpeed] = useState(() => readSavedSpeed("travel"));
  const [battleSpeed, setBattleSpeed] = useState(() => readSavedSpeed("battle"));

  const cycle = useCallback(
    (kind: "travel" | "battle", setter: (updater: (prev: number) => number) => void) => {
      setter((prev) => {
        const index = ANIMATION_SPEEDS.indexOf(prev);
        const next = ANIMATION_SPEEDS[(index + 1) % ANIMATION_SPEEDS.length];
        writeSavedSpeed(kind, next);
        return next;
      });
    },
    [],
  );

  const cycleSpeed = useCallback(() => cycle("travel", setAnimationSpeed), [cycle]);
  const cycleBattleSpeed = useCallback(() => cycle("battle", setBattleSpeed), [cycle]);

  return { animationSpeed, battleSpeed, cycleSpeed, cycleBattleSpeed };
}
