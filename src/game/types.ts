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
  impassable?: boolean; // a hard wall (Mordor's black mountains) — only Eagles cross
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

// Voice/personality used to pick which flavour of reaction line a companion
// speaks: playful (comic, earthy), plain (grounded), or lofty (high, solemn).
export type Temperament = "playful" | "plain" | "lofty";

export interface Character {
  id: string;
  name: string;
  icon: string;
  // Base RPG stats (1-10).
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
  strength: number; // drives both HP (×10) and attack damage, same as heroes
  defense: number;
  intelligence: number;
  luck: number; // low luck = whiffs often and easily dodged; see hitChance
  // If set, defeating this foe may recruit the given character.
  recruitId?: string;
  // Habitats this foe roams; undefined = anywhere (still tier-gated).
  regions?: RegionCode[];
}

// A special item a character can carry, found by exploring or gifted by NPCs.
// Flat stat bonuses are always on; stealth/speed are party-wide multipliers
// applied while anyone carries the item.
export interface Item {
  id: string;
  icon: string; // emoji glyph
  holders?: string[]; // if set, only these characters can carry it
  strength?: number;
  defense?: number;
  intelligence?: number;
  luck?: number;
  strengthVsUndead?: number; // bonus attack vs undead foes (wraiths/wights) only
  strengthVsOrcs?: number; // bonus attack vs orc-kin only
  stealth?: number; // multiplier on the random-encounter chance (e.g. 0.5)
  speed?: number; // multiplier on travel speed (e.g. 1.5)
}

export interface EncounterState {
  monster: Monster;
  dangerous: boolean;
  solo: boolean;
  pack: Monster[];
  // Set in the Minas Morgul lair: the wraiths fight to the death instead of
  // recoiling at half strength as they do elsewhere.
  wraithsStand?: boolean;
  // Saruman at Isengard with a mercy advocate (Gandalf/Treebeard) along: the
  // fight pauses at half HP to offer sparing him.
  sarumanParley?: boolean;
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
  strength: number; // drives max HP
  attack: number; // damage stat; equals strength for heroes, boosted for monsters
  defense: number;
  luck: number; // to-hit / dodge duel and escape odds
  intelligence: number; // target choice (focus vs. flail) and crit frequency
  level?: number; // hero level — foes prefer the most seasoned of the party
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
  crit?: boolean; // the last strike was a (meaningful) crit — show a double sweep
  bearerKey: string | null; // the ring bearer among the allies, if present
  ringOn: boolean; // bearer wears the Ring: invisible & untargetable
  fleeUsed: boolean; // the single in-battle escape attempt has been spent
  recruitId: string | null; // character who may join if this foe is defeated
  enemyBeast: boolean; // foes are beasts (Grimbeorn hits them harder)
  ringIneffective: boolean; // wraiths and the Balrog see through the Ring's invisibility
  betrayalBy: string | null; // a companion turned on the bearer (1v1 for the Ring)
  gandalfOnly: boolean; // only Gandalf can wound this foe (the Balrog)
  rogueId: string | null; // the fled ring-bearer being hunted (reclaim the Ring on win)
  invisibleEnemy: boolean; // foe wears the Ring — most strikes against it miss
  phialBlinded: boolean; // Shelob recoiled from the Phial — her strength is halved
  wraithsStand?: boolean; // Minas Morgul: wraiths fight to the death, not flee at half
  enemyNazgul?: boolean; // foes include a Ringwraith — Éowyn hits them harder
  enemyOrc?: boolean; // foes include orc-kin — Haldir hits them harder
  // Saruman at Isengard with Gandalf/Treebeard along: at half HP the fight pauses
  // to offer mercy. `pendingParley` holds the fight while the choice is made;
  // `parleyDeclined` (chose to fight on) removes the half-floor so he can be slain.
  sarumanParley?: boolean;
  pendingParley?: boolean;
  parleyDeclined?: boolean;
  noEnemyCrit?: boolean; // Arwen in the party — foes cannot land crits
  allyCritMult?: number; // Théoden in the party — allies crit this much more often
  // Spoken aftermath lines shown at 1-2 allies' portraits on the win screen
  // (keyed by ally key). Filled once the fight is resolved.
  reactions?: { key: string; text: string }[];
}

export type TransportId = "pony" | "horse" | "ship" | "eagle";

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

export interface RecruitRefusalNotice {
  message: string;
  characterId?: string;
}
