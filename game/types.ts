// Shared domain types for the Middle-earth map game. No runtime code lives here.

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface MapLocation {
  id: number;
  name: string;
  name_ru?: string;
  point: Point;
}

export interface LocationData {
  meta: { map: Size };
  locations: MapLocation[];
}

export interface TerrainType {
  name: string;
  cost: number;
}

export interface TerrainSample extends TerrainType {
  cellKey: string | null;
}

export interface TerrainGrid {
  width: number;
  height: number;
  grid: Uint8Array;
}

export interface DragState {
  active: boolean;
  moved: boolean;
  pointerId: number | null;
  startX: number;
  startY: number;
  startOffset: Point;
}

export interface WaterRun {
  cellKey: string | null;
  count: number;
}

export interface Character {
  id: string;
  name: string;
  icon: string;
  // Base RPG stats (1-10). Hunger scales strength/defense/intelligence down.
  strength: number;
  defense: number;
  intelligence: number;
  // Luck (1-10): feeds hit rolls (future combat) and gates finding some
  // characters. Innate trait — not reduced by hunger.
  luck: number;
  // Days carrying the Ring before succumbing to it ("срыв"), starting from
  // accumulated exposure. Corruption% = ringExposure×100 + bearerDays/resilience×100.
  resilience: number;
  // Accumulated Ring corruption (0..1) from past possession — Bilbo, Gollum.
  ringExposure?: number;
}

export interface CharacterStats {
  strength: number;
  defense: number;
  intelligence: number;
  health: number;
  maxHealth: number;
  luck: number;
  isBearer: boolean;
  corruption: number;
  dead: boolean;
}

export type DeathCause = "hunger" | "battle";

export type SavedSpeeds = { travel?: number; battle?: number };

// The map is split into six rough habitats (west/east of REGION_X; north / mid
// / south by the Y bands): NW Eriador · NE Wilderland/Mirkwood · MW Rohan/Isengard
// · ME Mordor/Gondor · SW/SE the far south (Harad & Umbar).
export type RegionCode = "NW" | "NE" | "MW" | "ME" | "SW" | "SE";

export interface Monster {
  name: string;
  icon: string;
  tier: number;
  strength: number;
  defense: number;
  intelligence: number;
  luck: number;
  // If set, defeating this foe may recruit the given character.
  recruitId?: string;
  // Habitats this foe roams; undefined = anywhere (still tier-gated).
  regions?: RegionCode[];
}

export interface EncounterState {
  monster: Monster;
  dangerous: boolean;
  solo: boolean;
  pack: Monster[];
}

export interface StatBonus {
  strength: number;
  defense: number;
  intelligence: number;
  luck: number;
}

export interface HeroInitialProgress {
  exp: number;
  bonus: StatBonus;
}

export interface Combatant {
  key: string;
  name: string;
  icon: string | null;
  hp: number;
  maxHp: number;
  strength: number;
  defense: number;
}

export interface BattleState {
  allies: Combatant[];
  enemies: Combatant[];
  exp: number;
  turn: "allies" | "enemies";
  index: number;
  outcome: "win" | "lose" | null;
  lastHit: string | null; // key of the combatant struck this tick (for the flash)
  attacker: string | null; // key of the combatant striking this tick (outlined)
  tick: number; // increments on every strike so the flash re-triggers
  hitDir: number; // 0–3: which of four directions the hit-sweep stripe runs
  bearerKey: string | null; // the ring bearer among the allies, if present
  ringOn: boolean; // bearer wears the Ring: invisible & untargetable
  recruitId: string | null; // character who may join if this foe is defeated
  enemyBeast: boolean; // foes are beasts (Grimbeorn hits them harder)
  ringIneffective: boolean; // wraiths see through the Ring's invisibility
  betrayalBy: string | null; // a companion turned on the bearer (1v1 for the Ring)
  gandalfOnly: boolean; // only Gandalf can wound this foe (the Balrog)
}

export type TransportId = "pony" | "horse" | "ship";

export interface Transport {
  name: string;
  speed: number;
  sea: boolean;
  action: string;
}

export interface RecruitmentWindow {
  locationId: number;
  fromDay: number;
  toDay: number | null;
  note?: string;
}

export interface RawRecruitmentEntry {
  from: string;
  to: string | null;
  place: string;
  time?: string;
  source?: string;
}

export interface RecruitmentCalendarEntry {
  character: Character;
  locationLabel: string;
  periodLabel: string;
  fromDay: number;
  isActive: boolean;
}
