// Tunable constants and lookup tables for the game. No logic, no React.
import type { StatBonus, TerrainType, TransportId } from "@/game/types";

// Static assets live in public/ and are served from the site root by URL.
export const mapImage = "/map.jpg";
export const terrainImage = "/map.gif";
export const ringImage = "/ring.png";

export const TRANSPORT_ICONS: Record<TransportId, string> = {
  pony: "/ui/pony.png",
  horse: "/ui/horse.png",
  ship: "/ui/ship.png",
  eagle: "/ui/eagle.png",
};
export const ON_FOOT_ICON = "/ui/foot.png";

export function transportIconSrc(transport: TransportId | null, sailingWithCirdan = false): string {
  if (transport) {
    return TRANSPORT_ICONS[transport];
  }
  if (sailingWithCirdan) {
    return TRANSPORT_ICONS.ship;
  }
  return ON_FOOT_ICON;
}

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
export const SAM_CATCH_UP_FOOD_DAYS = 14;
// Trail is stored as line segments: a new vertex is added only when the heading
// changes (dot of consecutive directions ≤ PATH_COLLINEAR_DOT). Sub-pixel moves
// are ignored. On touch devices the vertex count is capped (MAX_PATH_POINTS).
export const PATH_MIN_STEP = 2;
export const PATH_COLLINEAR_DOT = 0.999; // ~2.5° — straighter than this just extends
export const MAX_PATH_POINTS = 400;
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
export const CARN_DUM_ID = 1;
export const EREBOR_ID = 2;
export const WOODLAND_REALM_ID = 3;
export const FORNOST_ID = 4;
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
export const ERECH_ID = 20;
export const ORODRUIN_ID = 21;
export const CIRITH_UNGOL_ID = 22;
export const MINAS_MORGUL_ID = 23;
export const MINAS_TIRITH_ID = 24;
export const UMBAR_ID = 29;
export const BUCKLAND_ID = 30;
export const ESGAROTH_ID = 31;

// Locations that can be searched for a hidden item (location id → item id).
// Isengard's palantír only turns up once Saruman is beaten there.
export const EXPLORE_ITEM_BY_LOCATION: Record<number, string> = {
  [FORNOST_ID]: "numenor_dagger",
  [ISENGARD_ID]: "palantir",
  [EREBOR_ID]: "mithril_helmet",
  [OLD_FOREST_ID]: "numenor_blade",
};

// Auto-play march: Buckland → Bree → Rivendell → Moria → Lothlórien → Rohan → Minas Tirith → Doom.
export const AUTO_ROUTE = [
  BUCKLAND_ID,
  BREE_ID,
  RIVENDELL_ID,
  MORIA_GATE_ID,
  LOTHLORIEN_ID,
  EDORAS_ID,
  MINAS_TIRITH_ID,
  MINAS_MORGUL_ID,
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
// Combat is on equal terms: attack = strength and defense subtracts the same
// for heroes and foes alike. Enemies are a threat through their stats and
// numbers, not a hidden damage multiplier.
//
// A landed blow always deals at least this fraction of its attack, even against
// very high defense. Without it, attack ≈ defense collapses to 1 damage and
// fights turn into 100-swing grinds; with it, defense still cuts damage by up to
// two-thirds but can never fully nullify a hit.
export const MIN_DAMAGE_FRACTION = 0.34;
// A landed blow can crit for double damage; the chance climbs with the
// attacker's luck (~1 in 10 for a luck-9 hero, capped at CRIT_MAX_CHANCE), and
// is nil at or below CRIT_LUCK_FLOOR. Rewards luck-built / leveled heroes; most
// foes have low luck and rarely crit.
export const CRIT_LUCK_FLOOR = 4;
export const CRIT_PER_LUCK = 0.02;
export const CRIT_MAX_CHANCE = 0.2;
export const RING_BEARER_ID = "frodo";
export const DEFAULT_PARTY = ["frodo"];
// Hard cap on enemies in a single encounter pack.
export const MAX_PACK_SIZE = 9;
// Terrain mask is 192 px wide; one "cell" of map = mapWidth / this.
export const MAP_GRID_COLS = 192;

// Food.
export const FOOD_DAYS_BASE = 30;
export const FOOD_DAYS_PONY = 50;
export const FOOD_DAYS_HORSE = 60;
// Double rations (2 food/day) heal this much health per day while damaged.
export const HEAL_PER_DAY = 10;
// Starvation damage per day as a share of each character's max health.
export const HUNGER_DAMAGE_FRACTION = 0.05;

// Encounters & difficulty gradient (distance to Mordor, south-east).
export const ENCOUNTER_CHANCE_PER_DAY = 1 / 6;
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
// Bombadil dawdles — the march takes 1.5× as long while he travels along.
export const BOMBADIL_SLOW_FACTOR = 1.5;
export const SAM_FARM_BONUS = 3;
export const GRIMBEORN_BEAST_BONUS = 4;

// Roaming specials.
export const EDORAS_POINT = { x: 909, y: 1062 };
export const ROHAN_RADIUS = 280;
export const GOLLUM_ENCOUNTER_CHANCE = 0.033;
export const EOMER_ENCOUNTER_CHANCE = 0.2;
// Rare roaming Nazgul patrols: about one in five road encounters.
export const NAZGUL_ENCOUNTER_CHANCE = 0.2;
export const NAZGUL_PACK_MAX = 3;
export const ROAMING_RECRUIT_IDS = new Set(["gollum", "eomer"]);
export const BOMBADIL_LEAVE_CHANCE = 1 / 40;

// Betrayal: a traitor must travel with the party a while before the Ring works
// on them, then it's a low per-encounter roll (betrayal ~1-3 months after joining).
export const TRAITORS = new Set(["bilbo", "boromir", "gollum", "saruman", "denethor"]);
export const BETRAYAL_GRACE_DAYS = 30;
export const BETRAYAL_CHANCE = 0.06;

// If the Ring leaves your hands (the bearer breaks at 100% corruption, or a
// betrayer wins and takes it), you have this many days to hunt the rogue down
// before he reaches Mount Doom and crowns himself. He's invisible — only about
// ROGUE_HIT_CHANCE of strikes against him land — and only shows up on the trail
// after ROGUE_MIN_CHASE_DAYS of marching, then rarely each day after.
export const ROGUE_CHASE_DAYS = 60;
export const ROGUE_HIT_CHANCE = 0.25;
// No encounter rolls until the party has chased at least this long (~a month
// of travel before the first cornering is even possible).
export const ROGUE_MIN_CHASE_DAYS = 25;
// Per travel day once the minimum is met; ~12 more days on average to catch him.
export const ROGUE_ENCOUNTER_CHANCE = 0.08;

// Leveling.
export const LEVEL_BASE_XP = 300; // xp from level 1 to 2
export const LEVEL_XP_STEP = 120; // each further level needs this much more
// Points the player distributes over Frodo's four stats at game start.
export const CREATION_POINTS = 10;
export const ZERO_BONUS: StatBonus = { strength: 0, defense: 0, intelligence: 0, luck: 0 };

// Battle. Base tick is 1.5× faster than before; the 1×/2×/4× speed control still
// divides this further.
export const BATTLE_TICK_MS = 367;
// Four sweep directions for the hit-stripe, indexed by BattleState.hitDir.
export const SWEEP_ANGLES = ["-45deg", "45deg", "135deg", "-135deg"];

// Races / combat affinities.
export const HOBBIT_IDS = new Set(["frodo", "sam", "merry", "pippin", "bilbo"]);
export const DWARF_IDS = new Set(["gimli"]);
// Lofty speakers (elves, wizards, Bombadil) — they greet in a grander register.
export const LOFTY_TALKERS = new Set([
  "elrond",
  "galadriel",
  "celeborn",
  "arwen",
  "cirdan",
  "galdor",
  "haldir",
  "thranduil",
  "gandalf",
  "bombadil",
  "saruman",
  "king_dead",
]);
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
export const NAZGUL_NAME = "Назгул";
export const WRAITH_FOES = new Set(["Умертвие", NAZGUL_NAME, "Король-чародей"]);
// Nazgul are driven off at half strength instead of slain outright.
export const FLEE_AT_HALF_FOES = new Set([NAZGUL_NAME]);
// Orc-kin — targets of the elven arrows' bonus.
export const ORC_FOES = new Set(["Гоблин", "Орк-разведчик", "Орк", "Урук-хай"]);
// Shelob recoils from the Phial of Galadriel — her strength is halved.
export const SHELOB_NAME = "Шелоб";
// Barrow-wights — they stop assailing the party once Aragorn rouses the Dead.
export const WIGHT_NAME = "Умертвие";
export const BALROG_NAME = "Балрог";
// Supernatural foes that pierce the Ring's invisibility (wraiths and the Balrog).
export const RING_PIERCING_FOES = new Set([...WRAITH_FOES, BALROG_NAME]);
// Only these beings can wound the Balrog.
export const BALROG_DAMAGERS = new Set(["gandalf", "bombadil", "saruman"]);
// Everyone can hit the Balrog now, but only these three land a serious blow —
// enough to have a chance one-on-one.
export const BALROG_DAMAGER_BONUS = 10;
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
  EDORAS_ID,
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
  [MINAS_TIRITH_ID]: ["faramir", "denethor"],
};
// Characters who are only sometimes home; rolled once per visit.
export const RANDOM_PRESENCE: Record<string, number> = {
  bombadil: 1 / 5,
  grimbeorn: 1 / 2,
};
// The One Ring has no hold on these — they can never become its bearer.
export const NON_BEARERS = new Set<string>(["bombadil", "boromir", "saruman", "gollum", "king_dead"]);
// Bilbo only relents after much pestering — he gives in on this many tries.
// Reluctant recruits who only relent after this many pestering attempts.
export const RELUCTANT_RECRUIT_ATTEMPTS: Record<string, number> = {
  bilbo: 7,
  denethor: 5,
};

// No ship at the Grey Havens — Cirdan grants passage by sea there. The southern
// haven (Umbar) still hires out ships.
export const TRANSPORT_BY_LOCATION: Record<number, TransportId> = {
  [CARN_DUM_ID]: "eagle",
  [BREE_ID]: "pony",
  [EDORAS_ID]: "horse",
  [UMBAR_ID]: "ship",
};
// Eagles of Manwë only happen to be at Carn Dûm on some visits, and tire of
// carrying you after this many days.
export const EAGLE_PRESENCE_CHANCE = 0.25;
export const EAGLE_STAY_DAYS = 30;

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
  // The black-painted Mordor mountain wall: a hard barrier nothing crosses on
  // foot — only the Eagles fly over it.
  { name: "barrier", cost: 4, impassable: true },
];
export const TERRAIN = {
  plain: TERRAIN_TYPES[0],
  slow: TERRAIN_TYPES[1],
  forest: TERRAIN_TYPES[2],
  road: TERRAIN_TYPES[3],
  mountain: TERRAIN_TYPES[4],
  water: TERRAIN_TYPES[5],
  barrier: TERRAIN_TYPES[6],
};
// map.gif is an 8-color indexed image; every color maps to one terrain type.
export const TERRAIN_PALETTE: { rgb: [number, number, number]; id: number }[] = [
  { rgb: [255, 255, 255], id: 0 }, // white  -> plain (land/background)
  { rgb: [221, 154, 99], id: 1 }, //  tan    -> slow (hills)
  { rgb: [0, 205, 13], id: 2 }, //    green  -> forest
  { rgb: [255, 255, 0], id: 3 }, //   yellow -> road
  { rgb: [116, 48, 48], id: 4 }, //   brown  -> mountain
  { rgb: [48, 48, 209], id: 5 }, //   blue   -> water
  { rgb: [0, 0, 0], id: 6 }, //       black  -> barrier (Mordor wall)
];
