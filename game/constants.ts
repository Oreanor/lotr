// Tunable constants and lookup tables for the game. No logic, no React.
import type { StatBonus, TerrainType, TransportId } from "@/game/types";

// Static assets live in public/ and are served from the site root by URL.
export const mapImage = "/map.jpg";
export const terrainImage = "/map.gif";
export const ringImage = "/ring.png";

// View / camera.
export const DEFAULT_VIEW_SIZE = 480;
export const DEFAULT_ZOOM = 1;
// Max zoom is this many times the initial fit zoom; the min is derived per frame
// so the map always at least covers the viewport (no empty gaps).
export const MAX_ZOOM_FACTOR = 4;
export const ZOOM_STEP = 0.5;
// Roughly this share of the whole map area is visible by default.
export const DEFAULT_VISIBLE_FRACTION = 0.25;
// Start zoomed in a bit more than the plain fit (×1.5 closer).
export const DEFAULT_ZOOM_BOOST = 1.5;
export const SPEED_PX_PER_SECOND = 10;
export const ANIMATION_SPEEDS = [1, 2, 4];
export const SPEED_STORAGE_KEY = "lotr-speed";

// Travel / movement.
export const MILES_PER_DAY = 30;
export const INITIAL_FOOD_DAYS = 3;
export const PATH_SAMPLE_DISTANCE = 12;
export const MOVE_SUBSTEPS = 4;
// Deflection angles (deg) tried in order when the straight path is blocked, so
// the figure slides along walls toward the goal rather than stopping dead.
export const SLIDE_DEFLECTIONS = [0, 18, -18, 36, -36, 54, -54, 72, -72, 88, -88];
// Ring bearer picks up a left-behind companion within this map distance.
export const MEMBER_PICKUP_RANGE = 24;
export const TERRAIN_OVERLAY_OPACITY = 0.2;
// Narrow water (rivers) up to this many cells can be forded; wider water blocks.
export const MAX_WATER_CROSSING_CELLS = 2;
// The figure stays within this margin (share of viewport) from each edge.
export const FOLLOW_MARGIN_RATIO = 0.2;

// Location ids — must match data/locations.json.
export const EREBOR_ID = 2;
export const WOODLAND_REALM_ID = 3;
export const BEORN_ID = 5;
export const RIVENDELL_ID = 7;
export const BREE_ID = 8;
export const WEATHERTOP_ID = 9;
export const HOBBITON_ID = 10;
export const GREY_HAVENS_ID = 11;
export const OLD_FOREST_ID = 12;
export const MORIA_GATE_ID = 14;
export const LOTHLORIEN_ID = 15;
export const ISENGARD_ID = 16;
export const EDORAS_ID = 18;
export const BARAD_DUR_ID = 19;
export const ORODRUIN_ID = 21;
export const CIRITH_UNGOL_ID = 22;
export const MINAS_MORGUL_ID = 23;
export const MINAS_TIRITH_ID = 24;
export const UMBAR_ID = 29;
export const BUCKLAND_ID = 30;
export const ESGAROTH_ID = 31;

// Auto-play march: Buckland → Bree → Rivendell → Moria → Lothlórien → Rohan → Minas Tirith → Doom.
export const AUTO_ROUTE = [
  BUCKLAND_ID,
  BREE_ID,
  RIVENDELL_ID,
  MORIA_GATE_ID,
  LOTHLORIEN_ID,
  EDORAS_ID,
  MINAS_TIRITH_ID,
  ORODRUIN_ID,
] as const;
// When auto-play stops gaining ground on impassable terrain, back off and turn
// the heading (in 45° steps, widening and alternating sides) to find a way past.
export const AUTO_STALL_MS = 450;
export const AUTO_TURN_DEG = 45;
export const AUTO_MAX_TURN_STEPS = 4; // up to ±180° before flipping the turn side
export const AUTO_STORY_RECRUITS: Partial<Record<number, string[]>> = {
  [HOBBITON_ID]: ["sam"],
  [BUCKLAND_ID]: ["merry", "pippin"],
  [BREE_ID]: ["aragorn"],
  [RIVENDELL_ID]: ["elrond", "gandalf", "aragorn", "legolas", "gimli"],
};
export const AUTO_SKIP_RECRUITS = new Set([
  "bilbo",
  "gollum",
  "saruman",
  "bombadil",
  "arwen",
  "boromir",
]);

// RPG model. Max health = 10×strength.
export const HEALTH_PER_STR = 10;
export const RING_BEARER_ID = "frodo";
export const DEFAULT_PARTY = ["frodo"];
// Terrain mask is 192 px wide; one "cell" of map = mapWidth / this.
export const MAP_GRID_COLS = 192;

// Food.
export const FOOD_DAYS_BASE = 30;
export const FOOD_DAYS_PONY = 50;
export const FOOD_DAYS_HORSE = 60;
// Double rations (2 food/day) heal this much health per day while damaged.
export const HEAL_PER_DAY = 10;

// Encounters & difficulty gradient (distance to Mordor, south-east).
export const ENCOUNTER_CHANCE_PER_DAY = 1 / 3;
export const MORDOR_POINT = { x: 1332, y: 1130 };
export const ENCOUNTER_TIER_SPAN = 1100; // px over which the tier falls from 5 to 0
export const DANGEROUS_ENCOUNTER_CHANCE = 0.15;

// Region grid thresholds (habitats).
export const REGION_X = 1080;
export const REGION_Y_NORTH = 870;
export const REGION_Y_SOUTH = 1290;

// Per-companion ability tuning.
export const GANDALF_HEAL_MULTIPLIER = 1.5;
export const ARAGORN_ENCOUNTER_MULTIPLIER = 0.5;
export const EOMER_SPEED_MULTIPLIER = 1.5;
export const SAM_FARM_BONUS = 3;
export const GRIMBEORN_BEAST_BONUS = 4;

// Roaming specials.
export const EDORAS_POINT = { x: 909, y: 1062 };
export const ROHAN_RADIUS = 280;
export const GOLLUM_ENCOUNTER_CHANCE = 0.05;
export const EOMER_ENCOUNTER_CHANCE = 0.2;
export const ROAMING_RECRUIT_IDS = new Set(["gollum", "eomer"]);
export const BOMBADIL_LEAVE_CHANCE = 1 / 40;

// Betrayal: a traitor must travel with the party a while before the Ring works
// on them, then it's a low per-encounter roll (betrayal ~1-3 months after joining).
export const TRAITORS = new Set(["bilbo", "boromir", "gollum", "saruman"]);
export const BETRAYAL_GRACE_DAYS = 30;
export const BETRAYAL_CHANCE = 0.06;

// Leveling.
export const LEVEL_BASE_XP = 300; // xp from level 1 to 2
export const LEVEL_XP_STEP = 120; // each further level needs this much more
// Points the player distributes over Frodo's four stats at game start.
export const CREATION_POINTS = 10;
export const ZERO_BONUS: StatBonus = { strength: 0, defense: 0, intelligence: 0, luck: 0 };

// Battle.
export const BATTLE_TICK_MS = 550;
// Four sweep directions for the hit-stripe, indexed by BattleState.hitDir.
export const SWEEP_ANGLES = ["-45deg", "45deg", "135deg", "-135deg"];

// Races / combat affinities.
export const HOBBIT_IDS = new Set(["frodo", "sam", "merry", "pippin", "bilbo"]);
export const DWARF_IDS = new Set(["gimli"]);
// Elves who refuse to march with a dwarf in the party (Legolas excepted).
export const ELF_IDS = new Set([
  "elrond",
  "arwen",
  "galadriel",
  "celeborn",
  "haldir",
  "thranduil",
  "cirdan",
  "galdor",
]);
// Wraith/undead foes see the bearer even with the Ring on (no invisibility).
export const WRAITH_FOES = new Set(["Умертвие", "Назгул", "Король-чародей"]);
export const BALROG_NAME = "Балрог";
// Supernatural foes that pierce the Ring's invisibility (wraiths and the Balrog).
export const RING_PIERCING_FOES = new Set([...WRAITH_FOES, BALROG_NAME]);
// Only these beings can wound the Balrog.
export const BALROG_DAMAGERS = new Set(["gandalf", "bombadil", "saruman"]);
// Beast-type foes (Grimbeorn hits them harder).
export const BEAST_MONSTERS = new Set([
  "Лис",
  "Крыса-переросток",
  "Волк",
  "Гигантский паук",
  "Варг",
  "Мумак",
]);

// Towns where provisions can be restocked.
export const FOOD_SUPPLY_LOCATION_IDS = new Set<number>([
  HOBBITON_ID,
  RIVENDELL_ID,
  MINAS_TIRITH_ID,
  LOTHLORIEN_ID,
  ESGAROTH_ID,
]);
// Always available at these locations (no schedule in recruitment.json).
export const RECRUITS_BY_LOCATION: Record<number, string[]> = {
  [HOBBITON_ID]: ["sam"],
  [BUCKLAND_ID]: ["merry", "pippin"],
  [WOODLAND_REALM_ID]: ["thranduil"],
  [BEORN_ID]: ["grimbeorn"],
  [GREY_HAVENS_ID]: ["cirdan"],
  [RIVENDELL_ID]: ["elrond", "arwen", "bilbo"],
  [OLD_FOREST_ID]: ["bombadil"],
  [LOTHLORIEN_ID]: ["galadriel", "celeborn", "haldir"],
  [ISENGARD_ID]: ["saruman"],
  [EDORAS_ID]: ["theoden", "eowyn"],
  [MINAS_TIRITH_ID]: ["faramir"],
};
// Characters who are only sometimes home; rolled once per visit.
export const RANDOM_PRESENCE: Record<string, number> = {
  bombadil: 1 / 5,
  grimbeorn: 1 / 2,
};
// The One Ring has no hold on these — they can never become its bearer.
export const NON_BEARERS = new Set<string>(["bombadil", "boromir", "saruman", "gollum"]);
// Bilbo only relents after much pestering: each attempt has this success chance.
export const BILBO_RECRUIT_CHANCE = 0.05;

export const TRANSPORT_BY_LOCATION: Record<number, TransportId> = {
  [BREE_ID]: "pony",
  [EDORAS_ID]: "horse",
  [GREY_HAVENS_ID]: "ship",
  [UMBAR_ID]: "ship",
};

export const RECRUITMENT_PLACE_IDS: Record<string, number> = {
  hobbiton: HOBBITON_ID,
  bucklebury: BUCKLAND_ID,
  bree: BREE_ID,
  weathertop: WEATHERTOP_ID,
  rivendell: RIVENDELL_ID,
  grey_havens: GREY_HAVENS_ID,
  wood_elves: WOODLAND_REALM_ID,
  erebor: EREBOR_ID,
  minas_tirith: MINAS_TIRITH_ID,
};

// Terrain types indexed by id; id is the value stored in the precomputed grid.
export const TERRAIN_TYPES: TerrainType[] = [
  { name: "plain", cost: 1 },
  { name: "slow", cost: 1.5 },
  { name: "forest", cost: 1.5 },
  { name: "road", cost: 0.5 },
  { name: "mountain", cost: 4 }, // passable, but four times slower than plains
  { name: "water", cost: 2 },
];
export const TERRAIN = {
  plain: TERRAIN_TYPES[0],
  slow: TERRAIN_TYPES[1],
  forest: TERRAIN_TYPES[2],
  road: TERRAIN_TYPES[3],
  mountain: TERRAIN_TYPES[4],
  water: TERRAIN_TYPES[5],
};
// map.gif is an 8-color indexed image; every color maps to one terrain type.
export const TERRAIN_PALETTE: { rgb: [number, number, number]; id: number }[] = [
  { rgb: [255, 255, 255], id: 0 }, // white  -> plain (land/background)
  { rgb: [221, 154, 99], id: 1 }, //  tan    -> slow (hills)
  { rgb: [0, 205, 13], id: 2 }, //    green  -> forest
  { rgb: [255, 255, 0], id: 3 }, //   yellow -> road
  { rgb: [116, 48, 48], id: 4 }, //   brown  -> mountain
  { rgb: [48, 48, 209], id: 5 }, //   blue   -> water
];
