import { useEffect, useRef } from "react";
import { writeSave, type GameSave } from "@/game/save";

type SaveData = Omit<GameSave, "version">;

// Persist the whole game whenever it changes — but only at a clean rest point
// (`atRest`), so a reload resumes from a stop/town, never mid-move, mid-battle,
// or mid-chase.
//
// Instead of a 40-entry dependency array (one per field, easy to forget when a
// new field is added), it diffs a JSON snapshot of the save and writes only when
// something actually changed. While not at rest the snapshot isn't even built,
// so the travel/RAF hot path pays nothing.
export function useGameAutosave(atRest: boolean, data: SaveData) {
  const lastSnapshot = useRef<string | null>(null);
  const snapshot = atRest ? JSON.stringify(data) : null;

  useEffect(() => {
    if (snapshot === null || snapshot === lastSnapshot.current) {
      return;
    }
    lastSnapshot.current = snapshot;
    writeSave(data);
    // `snapshot` is a complete serialization of `data`; it alone captures every
    // field that should trigger a write.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot]);
}
