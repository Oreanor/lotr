// Tunable constants and lookup tables for the game. No logic, no React.
import type { StatBonus, TerrainType, TransportId } from "@/game/types";

// Static assets live in public/ and are served from the site root by URL.
export const mapImage = "/map.jpg";
export const terrainImage = "/map.gif";
// Selectable background maps, all sharing the terrain mask's projection. Add a
// file here to offer it in settings; the chosen index is remembered per browser.
export const MAP_VARIANTS = [mapImage, "/map2.jpg", "/map3.jpg"] as const;
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
export const TERRAIN_OVERLAY_OPACITY = 0.3;
// Remembers the terrain-layer toggle between sessions.
export const TERRAIN_PREF_KEY = "lotr-terrain";
// Remembers the chosen MAP_VARIANTS index between sessions.
export const MAP_PREF_KEY = "lotr-map";
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
export const HELMS_DEEP_ID = 17;
export const EDORAS_ID = 18;
export const FORLOND_ID = 6;
export const HARLOND_ID = 13;
export const DOL_AMROTH_ID = 26;
export const PELARGIR_ID = 27;
export const CORSAIRS_CITY_ID = 28;
export const BARAD_DUR_ID = 19;
export const ERECH_ID = 20;
export const ORODRUIN_ID = 21;
export const CIRITH_UNGOL_ID = 22;
export const MINAS_MORGUL_ID = 23;
export const MINAS_TIRITH_ID = 24;
export const OSGILIATH_ID = 25;
export const UMBAR_ID = 29;
export const BUCKLAND_ID = 30;
export const ESGAROTH_ID = 31;

// Locations that can be searched for a hidden item (location id → item id).
// Isengard's palantír only turns up once Saruman is beaten there.
export const EXPLORE_ITEM_BY_LOCATION: Record<number, string> = {
  [FORNOST_ID]: "numenor_dagger",
  [ISENGARD_ID]: "palantir",
  [EREBOR_ID]: "mithril_helmet",
  [MORIA_GATE_ID]: "book_of_mazarbul",
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

// RPG model. Max health is split evenly between brawn and guard:
// 5×strength + 5×defense. So strength still buys HP (plus damage) while defense
// now buys HP too (plus its mitigation) — a real tank build, not just a stat tax.
export const HEALTH_PER_STR = 5;
export const HEALTH_PER_DEF = 5;
// Combat is on equal terms: attack = strength and defense subtracts the same
// for heroes and foes alike. Enemies are a threat through their stats and
// numbers, not a hidden damage multiplier.
//
// A landed blow always deals at least this fraction of its attack, even against
// very high defense. Without it, attack ≈ defense collapses to 1 damage and
// fights turn into 100-swing grinds; with it, defense still cuts damage by up to
// two-thirds but can never fully nullify a hit.
export const MIN_DAMAGE_FRACTION = 0.34;
// Crits are wits, not luck: a landed blow crits for a flat CRIT_MULTIPLIER, and
// how OFTEN it crits climbs with the attacker's intelligence — chance =
// (intelligence − CRIT_INT_FLOOR) × CRIT_PER_INT, capped at CRIT_MAX_CHANCE, nil
// at or below the floor. The bite is constant so intelligence only sets
// frequency (no double-dipping freq × size); most foes are dull and rarely crit.
export const CRIT_INT_FLOOR = 3;
export const CRIT_PER_INT = 0.03;
export const CRIT_MAX_CHANCE = 0.2;
export const CRIT_MULTIPLIER = 1.5;
// Whom a fighter strikes depends on wits: focus the most dangerous foe with
// probability (intelligence − FOCUS_INT_FLOOR) × FOCUS_PER_INT (capped), else
// flail at a random target. The dimmer the fighter, the wilder the swing.
// Whom a foe strikes among the party scales with its wits: the dumbest lash out
// at anyone with equal odds (top-level chance = 1/N), the smartest single out the
// party's most seasoned hero up to ENEMY_TARGET_TOP_MAX_CHANCE — linearly between
// these intelligence bounds.
export const ENEMY_TARGET_TOP_MAX_CHANCE = 0.75;
export const ENEMY_TARGET_INT_FLOOR = 2; // at/below this int → fully random
export const ENEMY_TARGET_INT_CEIL = 10; // at/above this int → max focus
export const FOCUS_INT_FLOOR = 2;
export const FOCUS_PER_INT = 0.12;
export const FOCUS_MAX_CHANCE = 0.95;
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
export const CLOAKS_ENCOUNTER_MULTIPLIER = 0.55;
export const ARAGORN_ENCOUNTER_MULTIPLIER = 5 / 6;
// A generally clever party travels more warily: its average intelligence above
// PARTY_INT_STEALTH_BASELINE trims the daily encounter chance by PER_POINT each,
// down to FLOOR. Gentle, and separate from a wise Ring-bearer picking safe paths.
export const PARTY_INT_STEALTH_BASELINE = 4;
export const PARTY_INT_STEALTH_PER_POINT = 0.03;
export const PARTY_INT_STEALTH_FLOOR = 0.65;
// Party size shifts the encounter chance around a neutral size: each member off
// PARTY_STEALTH_NEUTRAL_SIZE moves it by PARTY_STEALTH_PER_MEMBER, between FLOOR
// and CEIL. Small bands draw only mildly fewer eyes (so early-game, naturally
// small and cloakless, isn't gutted — cloaks are the real lever); a big host
// (7-8+) is markedly easier to spot and largely cancels its own cloaks.
export const PARTY_STEALTH_NEUTRAL_SIZE = 4;
export const PARTY_STEALTH_PER_MEMBER = 0.15;
export const PARTY_STEALTH_FLOOR = 0.7;
export const PARTY_STEALTH_CEIL = 1.7;
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
// A masterless Gríma skulks the wilds if Isengard fell before he fled there —
// uncommon, and no real threat to a couple of stout hobbits.
export const GRIMA_ENCOUNTER_CHANCE = 0.04;
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
export const WITCHKING_NAME = "Король-чародей";
export const WRAITH_FOES = new Set(["Умертвие", NAZGUL_NAME, WITCHKING_NAME]);
// The Ringwraiths are driven off at half strength instead of slain — at
// Weathertop and on the open road. Only in Minas Morgul, the seat of their
// power, do they stand and fight to the death (the battle sets `wraithsStand`).
export const FLEE_AT_HALF_FOES = new Set([NAZGUL_NAME, WITCHKING_NAME]);
// The Ringwraiths — Éowyn, no living man, strikes them a touch harder.
export const RINGWRAITH_FOES = new Set([NAZGUL_NAME, WITCHKING_NAME]);
export const EOWYN_NAZGUL_BONUS = 3;
// Haldir, marchwarden, lands heavier blows on orc-kin; Thranduil crits trolls
// far more often. Both are secondary-elf combat abilities.
export const HALDIR_ORC_BONUS = 3;
export const TROLL_FOES = new Set(["Горный тролль", "Тролль Горгорота"]);
export const THRANDUIL_TROLL_CRIT_BONUS = 0.2;
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
  [EDORAS_ID]: ["theoden", "eowyn", "grima"],
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
// Harbours — the whole class of seaside havens. A ship can be boarded at any of
// them, and they are the only coast a ship may put back ashore at (it's lost
// when it does). Boarding drops the figure onto the open water beside the haven.
export const HARBOR_IDS = new Set([
  GREY_HAVENS_ID,
  FORLOND_ID,
  HARLOND_ID,
  DOL_AMROTH_ID,
  PELARGIR_ID,
  CORSAIRS_CITY_ID,
  UMBAR_ID,
]);
export const TRANSPORT_BY_LOCATION: Record<number, TransportId> = {
  [CARN_DUM_ID]: "eagle",
  [BREE_ID]: "pony",
  [EDORAS_ID]: "horse",
  [GREY_HAVENS_ID]: "ship",
  [FORLOND_ID]: "ship",
  [HARLOND_ID]: "ship",
  [DOL_AMROTH_ID]: "ship",
  [PELARGIR_ID]: "ship",
  [CORSAIRS_CITY_ID]: "ship",
  [UMBAR_ID]: "ship",
};
// Preferred water cell beside a harbour (a hint; boarding falls back to scanning
// the harbour's neighbours for sea if this isn't water).
export const SHIP_BOARD_OFFSET: Record<number, { x: number; y: number }> = {
  [GREY_HAVENS_ID]: { x: -10, y: -10 }, // a cell up-and-left
  [FORLOND_ID]: { x: 10, y: 0 }, // a cell east
  [UMBAR_ID]: { x: 0, y: -10 }, // a cell north
};
// A ship isn't always in port — its presence is rolled each visit and each day
// waited (per harbour). Umbar's corsair haven is busiest, the Grey Havens less
// so, the rest rarer still — landing roughly between every couple of days and
// once a week.
export const SHIP_PRESENCE_CHANCE: Record<number, number> = {
  [UMBAR_ID]: 0.5,
  [CORSAIRS_CITY_ID]: 0.5,
  [GREY_HAVENS_ID]: 0.3,
  [DOL_AMROTH_ID]: 0.22,
  [PELARGIR_ID]: 0.2,
  [FORLOND_ID]: 0.16,
  [HARLOND_ID]: 0.16,
};
// Círdan the Shipwright doubles the party's pace at sea.
export const CIRDAN_SEA_SPEED = 2;
// Corsair raids at sea grow likelier the further south you sail — chance per day
// = MAX × (latitude fraction)^POWER. The steep power keeps them all but absent at
// the Grey Havens' latitude, ramping to a middling chance off Harad.
export const CORSAIR_SEA_MAX = 0.25;
export const CORSAIR_SEA_POWER = 3;
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
