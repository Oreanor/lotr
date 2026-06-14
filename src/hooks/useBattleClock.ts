import { useEffect, type Dispatch, type SetStateAction } from "react";
import { advanceBattleTick, BATTLE_TICK_MS } from "@/game";
import type { BattleState } from "@/game";

// Drives the auto-battle: one strike per tick (allies in turn, then the enemy),
// paced by battleSpeed. Paused while auto-play resolves fights instantly.
export function useBattleClock(
  battle: BattleState | null,
  battleSpeed: number,
  autoPlay: boolean,
  setBattle: Dispatch<SetStateAction<BattleState | null>>,
) {
  useEffect(() => {
    if (!battle || battle.outcome || autoPlay) {
      return undefined;
    }
    const timer = setTimeout(() => {
      setBattle((b) => (!b || b.outcome ? b : advanceBattleTick(b)));
    }, BATTLE_TICK_MS / battleSpeed);
    return () => clearTimeout(timer);
  }, [battle, battleSpeed, autoPlay, setBattle]);
}
