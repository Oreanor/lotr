// Persisted game state so an accidental reload resumes from the last stable
// point (a stop or a town) — never mid-move or mid-battle.
import type { DeathCause, Point, StatBonus, TransportId } from "@/game/types";

const SAVE_KEY = "lotr-save";
const SAVE_VERSION = 3;

export interface GameSave {
  version: number;
  player: Point;
  journeyDay: number;
  journeyMiles: number;
  party: string[];
  bearerId: string;
  transport: TransportId | null;
  eagleSince: number | null;
  food: number;
  damageById: Record<string, number>;
  deathCauseById: Record<string, DeathCause>;
  expById: Record<string, number>;
  statBonusById: Record<string, StatBonus>;
  ringWear: number;
  bearerRingDays: number;
  hasCloaks: boolean;
  defeatedBosses: string[];
  slainRoamingRecruits: string[];
  leftBehind: { id: string; point: Point }[];
  joinDay: Record<string, number>;
  recruitAttempts: Record<string, number>;
  foundItems?: string[];
  equippedItems?: Record<string, string>;
  deadSummoned?: boolean;
}

export function loadSave(): GameSave | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      return null;
    }
    const save = JSON.parse(raw) as GameSave;
    return save.version === SAVE_VERSION ? save : null;
  } catch {
    return null;
  }
}

export function writeSave(save: Omit<GameSave, "version">): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, ...save }));
  } catch {
    // ignore storage errors (private mode, quota, …)
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // ignore storage errors
  }
}
