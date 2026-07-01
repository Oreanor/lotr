// Persisted game state so an accidental reload resumes from the last stable
// point (a stop or a town) — never mid-move or mid-battle.
import type { DeathCause, Point, StatBonus, TransportId } from "@/game/types";

const SAVE_KEY = "lotr-save";
// v4: per-character HP is now stored as current health (`hpById`) instead of
// accumulated damage, so a shrinking max (e.g. losing an aura-granting companion)
// no longer retroactively wounds survivors. Older saves are dropped on load.
const SAVE_VERSION = 4;

// A splinter group waiting on the map: its members travel together and can be
// taken control of via the squad switcher.
export interface Squad {
  id: string;
  members: string[];
  point: Point;
}

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
  // Current HP per character; a missing entry means full health.
  hpById: Record<string, number>;
  deathCauseById: Record<string, DeathCause>;
  expById: Record<string, number>;
  statBonusById: Record<string, StatBonus>;
  ringWear: number;
  bearerRingDays: number;
  ringDaysById?: Record<string, number>;
  hasCloaks: boolean;
  defeatedBosses: string[];
  slainRoamingRecruits: string[];
  banishedTraitors?: string[];
  squads?: Squad[];
  /** @deprecated legacy per-companion drop points; migrated into `squads`. */
  leftBehind?: { id: string; point: Point }[];
  joinDay: Record<string, number>;
  recruitAttempts: Record<string, number>;
  foundItems?: string[];
  equippedItems?: Record<string, string>;
  deadSummoned?: boolean;
  samCaughtUp?: boolean;
  grimaFled?: boolean;
  grimaSlain?: boolean;
  osgiliathCacheFound?: boolean;
  denethorMourned?: boolean;
  // Lifetime tallies for the statistics panel. All optional so older saves
  // (same version) load cleanly and simply start these counters from scratch.
  visitedLocationIds?: number[];
  enemiesKilled?: number;
  defeatedEnemyIcons?: string[];
  maxPartySize?: number;
  // Everyone the party has met — recruited or not — for the "found" tally.
  metCharacterIds?: string[];
  // The Corsair captain has granted safe passage — no more corsair sea raids.
  corsairPeace?: boolean;
  // The Ring has been cast into the fire — the party roams a freed Middle-earth.
  ringDestroyed?: boolean;
  // Dol Guldur's three wraiths were slain — Minas Morgul musters six, not nine.
  dolGuldurNazgulSlain?: boolean;
  // Saruman was spared at Isengard — alive, roaming the NW; two months on he
  // holds the Shire (the Scouring). `sarumanSparedDay` is the journey day he was
  // let go, for that countdown.
  sarumanSpared?: boolean;
  sarumanSparedDay?: number;
  // Set once the party has left Hobbiton during the Scouring — only then does the
  // art turn to the ruined village (the first time, Saruman has just arrived).
  hobbitonScoured?: boolean;
  // Set once Treebeard has been brought to fallen Isengard and settled to rule it.
  treebeardAtIsengard?: boolean;
  // Journey day the Grey Gandalf fell in battle — gates when Gandalf the White
  // may be met (a month on). Null/absent until he falls.
  gandalfFellDay?: number;
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
