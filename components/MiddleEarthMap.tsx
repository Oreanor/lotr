import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Flame,
  Gauge,
  Heart,
  Hourglass,
  LocateFixed,
  Route,
  Split,
  Users,
  Wheat,
} from "lucide-react";
import locationDataJson from "@/data/locations.json";
import recruitmentDataJson from "@/data/recruitment.json";

// Static assets live in public/ and are served from the site root by URL.
const mapImage = "/map.jpg";
const terrainImage = "/map.gif";
const ringImage = "/ring.png";

interface Point {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

interface MapLocation {
  id: number;
  name: string;
  name_ru?: string;
  point: Point;
}

interface LocationData {
  meta: { map: Size };
  locations: MapLocation[];
}

interface TerrainType {
  name: string;
  cost: number;
}

interface TerrainSample extends TerrainType {
  cellKey: string | null;
}

interface TerrainGrid {
  width: number;
  height: number;
  grid: Uint8Array;
}

interface DragState {
  active: boolean;
  moved: boolean;
  pointerId: number | null;
  startX: number;
  startY: number;
  startOffset: Point;
}

interface WaterRun {
  cellKey: string | null;
  count: number;
}

interface Character {
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
  // their current exposure. Corruption% = ringExposure×100 + day/resilience×100.
  resilience: number;
  // Pre-existing corruption (0..1) before the journey. Bilbo is already far gone.
  ringExposure?: number;
}

interface CharacterStats {
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

const locationData = locationDataJson as unknown as LocationData;

const DEFAULT_VIEW_SIZE = 480;
const DEFAULT_ZOOM = 1;
// Max zoom is this many times the initial fit zoom; the min is derived per
// frame so the map always at least covers the viewport (no empty gaps).
const MAX_ZOOM_FACTOR = 4;
const ZOOM_STEP = 0.5;
// Roughly this share of the whole map area is visible by default; the fit zoom
// is derived from it and the actual viewport size (so mobile shows what fits).
const DEFAULT_VISIBLE_FRACTION = 0.25;
// Start zoomed in a bit more than the plain fit (×1.5 closer).
const DEFAULT_ZOOM_BOOST = 1.5;
const SPEED_PX_PER_SECOND = 10;
const ANIMATION_SPEEDS = [1, 2, 4];
const MILES_PER_DAY = 30;
const PATH_SAMPLE_DISTANCE = 12;
const MOVE_SUBSTEPS = 4;
const TERRAIN_OVERLAY_OPACITY = 0.2;
// Narrow water (rivers) up to this many terrain cells can be forded; wider
// water (seas, lakes) still blocks the route. Mountains are always impassable.
const MAX_WATER_CROSSING_CELLS = 2;
// The figure stays within this margin (share of the viewport) from each edge;
// crossing it pans the map instead of letting the figure reach the border.
const FOLLOW_MARGIN_RATIO = 0.2;
// Location ids — must match data/locations.json. Reference these everywhere
// instead of bare numbers.
const WOODLAND_REALM_ID = 3;
const BEORN_ID = 5;
const RIVENDELL_ID = 7;
const BREE_ID = 8;
const WEATHERTOP_ID = 9;
const HOBBITON_ID = 10;
const GREY_HAVENS_ID = 11;
const OLD_FOREST_ID = 12;
const MORIA_GATE_ID = 14;
const LOTHLORIEN_ID = 15;
const ISENGARD_ID = 16;
const EDORAS_ID = 18;
const BARAD_DUR_ID = 19;
const ORODRUIN_ID = 21;
const CIRITH_UNGOL_ID = 22;
const MINAS_MORGUL_ID = 23;
const MINAS_TIRITH_ID = 24;
const UMBAR_ID = 29;
const BUCKLAND_ID = 30;
const ESGAROTH_ID = 31;
// RPG model. Max health = 10×strength. While out of food, each travel day costs
// 1 health; at 0 the character dies. The Ring bearer corrupts over time; at
// 100% they break and crown themselves.
const HEALTH_PER_STR = 10;
const RING_BEARER_ID = "frodo";
// Base stats are flavor estimates (easy to tweak); resilience is from the
// "дни до срыва" table. Only PARTY_IDS are shown in the HUD column.
const CHARACTERS: Character[] = [
  { id: "frodo", name: "Фродо", icon: "/icons/frodo.png", strength: 4, defense: 4, intelligence: 6, luck: 5, resilience: 180 },
  { id: "sam", name: "Сэм", icon: "/icons/sam.png", strength: 6, defense: 6, intelligence: 4, luck: 4, resilience: 210 },
  { id: "merry", name: "Мерри", icon: "/icons/merry.png", strength: 5, defense: 5, intelligence: 5, luck: 6, resilience: 180 },
  { id: "pippin", name: "Пиппин", icon: "/icons/pippin.png", strength: 5, defense: 4, intelligence: 4, luck: 8, resilience: 180 },
  { id: "gimli", name: "Гимли", icon: "/icons/gimli.png", strength: 9, defense: 8, intelligence: 4, luck: 3, resilience: 120 },
  { id: "legolas", name: "Леголас", icon: "/icons/legolas.png", strength: 7, defense: 6, intelligence: 7, luck: 7, resilience: 100 },
  { id: "aragorn", name: "Арагорн", icon: "/icons/aragorn.png", strength: 9, defense: 8, intelligence: 8, luck: 6, resilience: 90 },
  { id: "gandalf", name: "Гэндальф", icon: "/icons/gandalf.png", strength: 7, defense: 7, intelligence: 10, luck: 9, resilience: 60 },
  { id: "boromir", name: "Боромир", icon: "/icons/boromir.png", strength: 8, defense: 7, intelligence: 6, luck: 3, resilience: 30 },
  { id: "thranduil", name: "Трандуил", icon: "/icons/thranduil.png", strength: 7, defense: 7, intelligence: 8, luck: 6, resilience: 120 },
  { id: "grimbeorn", name: "Гримбеорн", icon: "/icons/grimbeorn.png", strength: 9, defense: 8, intelligence: 4, luck: 5, resilience: 100 },
  { id: "elrond", name: "Элронд", icon: "/icons/elrond.png", strength: 7, defense: 7, intelligence: 10, luck: 7, resilience: 200 },
  { id: "arwen", name: "Арвен", icon: "/icons/arwen.png", strength: 5, defense: 5, intelligence: 8, luck: 7, resilience: 140 },
  { id: "bilbo", name: "Бильбо", icon: "/icons/bilbo.png", strength: 3, defense: 3, intelligence: 7, luck: 9, resilience: 180, ringExposure: 0.9 },
  { id: "cirdan", name: "Кирдан Корабел", icon: "/icons/cirdan.png", strength: 6, defense: 6, intelligence: 9, luck: 7, resilience: 180 },
  { id: "galdor", name: "Галдор", icon: "/icons/galdor.png", strength: 6, defense: 6, intelligence: 7, luck: 6, resilience: 120 },
  { id: "bombadil", name: "Том Бомбадил", icon: "/icons/bombadil.png", strength: 10, defense: 10, intelligence: 10, luck: 10, resilience: 999 },
  { id: "galadriel", name: "Галадриэль", icon: "/icons/galadriel.png", strength: 7, defense: 7, intelligence: 10, luck: 8, resilience: 150 },
  { id: "celeborn", name: "Келеборн", icon: "/icons/celeborn.png", strength: 7, defense: 8, intelligence: 8, luck: 6, resilience: 130 },
  { id: "haldir", name: "Халдир", icon: "/icons/haldir.png", strength: 7, defense: 6, intelligence: 6, luck: 6, resilience: 110 },
  { id: "saruman", name: "Саруман", icon: "/icons/saruman.png", strength: 6, defense: 6, intelligence: 10, luck: 4, resilience: 20 },
  { id: "theoden", name: "Теоден", icon: "/icons/theoden.png", strength: 7, defense: 8, intelligence: 6, luck: 5, resilience: 90 },
  { id: "eowyn", name: "Эовин", icon: "/icons/eowyn.png", strength: 7, defense: 6, intelligence: 6, luck: 7, resilience: 100 },
  { id: "eomer", name: "Эомер", icon: "/icons/eomer.png", strength: 8, defense: 8, intelligence: 6, luck: 6, resilience: 100 },
  { id: "faramir", name: "Фарамир", icon: "/icons/faramir.png", strength: 8, defense: 7, intelligence: 8, luck: 6, resilience: 160 },
  { id: "gollum", name: "Голлум", icon: "/icons/gollum.png", strength: 4, defense: 3, intelligence: 5, luck: 9, resilience: 20, ringExposure: 0.6 },
];
const DEFAULT_PARTY = ["frodo"];
const PLAYER_ICON = CHARACTERS[0].icon;
// Terrain mask is 192 px wide; one "cell" of map = mapWidth / this.
const MAP_GRID_COLS = 192;
// Food: days of provisions carried. Capacity depends on transport (each person
// carries their own, so party size does not matter). 1 day eaten per travel day.
const FOOD_DAYS_BASE = 30;
const FOOD_DAYS_PONY = 50;
const FOOD_DAYS_HORSE = 60;
// Double rations (2 food/day) heal this much health per day while damaged.
const HEAL_PER_DAY = 10;
// Random enemy encounters: on average one every 3 days. Elven cloaks halve it.
const ENCOUNTER_CHANCE_PER_DAY = 1 / 3;
// Difficulty gradient = distance to Mordor (south-east): near the Shire (NW)
// enemies are weak, toward Mount Doom they get stronger (gazetteer tiers 0-5).
const MORDOR_POINT = { x: 1332, y: 1130 };
const ENCOUNTER_TIER_SPAN = 1100; // px over which the tier falls from 5 to 0
// Chance an encounter is above the local tier — a foe you'd better flee for now.
const DANGEROUS_ENCOUNTER_CHANCE = 0.15;
// South-only foes (mumakil) appear only at/below this latitude on the map.
const SOUTH_ENCOUNTER_Y = 1100;

interface Monster {
  name: string;
  icon: string;
  tier: number;
  strength: number;
  defense: number;
  intelligence: number;
  luck: number;
  // If set, defeating this foe may recruit the given character.
  recruitId?: string;
  // Only appears in the south (e.g. mumakil of Harad).
  southOnly?: boolean;
}

// Emotion variants live in a subfolder mirroring the base path, e.g.
// "/icons/frodo.png" → "/icons/pain/frodo.png".
function iconVariant(icon: string, kind: "pain" | "joy" | "refuse" | "dark"): string {
  const slash = icon.lastIndexOf("/");
  return `${icon.slice(0, slash)}/${kind}${icon.slice(slash)}`;
}
// Iconic foes from the gazetteer, spread across tiers (stats are flavor 1-10).
const MONSTERS: Monster[] = [
  { name: "Лисы-вредители", icon: "/enemies/fox.png", tier: 0, strength: 1, defense: 1, intelligence: 1, luck: 3 },
  { name: "Крысы-переростки", icon: "/enemies/rat.png", tier: 0, strength: 2, defense: 1, intelligence: 1, luck: 2 },
  { name: "Волчья стая", icon: "/enemies/wolf.png", tier: 1, strength: 3, defense: 2, intelligence: 2, luck: 4 },
  { name: "Бандиты", icon: "/enemies/bandit.png", tier: 1, strength: 3, defense: 3, intelligence: 3, luck: 3 },
  { name: "Гигантские пауки", icon: "/enemies/spider.png", tier: 1, strength: 4, defense: 3, intelligence: 2, luck: 3 },
  { name: "Умертвие", icon: "/enemies/wight.png", tier: 1, strength: 5, defense: 5, intelligence: 6, luck: 2 },
  { name: "Гоблины-разведчики", icon: "/enemies/goblin.png", tier: 2, strength: 3, defense: 3, intelligence: 3, luck: 3 },
  { name: "Орки-разведчики", icon: "/enemies/orc_scout.png", tier: 2, strength: 4, defense: 4, intelligence: 3, luck: 3 },
  { name: "Горный тролль", icon: "/enemies/troll.png", tier: 2, strength: 8, defense: 8, intelligence: 2, luck: 2 },
  { name: "Орочий отряд", icon: "/enemies/orc.png", tier: 3, strength: 5, defense: 4, intelligence: 3, luck: 3 },
  { name: "Варги", icon: "/enemies/varg.png", tier: 3, strength: 5, defense: 4, intelligence: 3, luck: 4 },
  { name: "Урук-хай", icon: "/enemies/urukhai.png", tier: 3, strength: 7, defense: 6, intelligence: 4, luck: 3 },
  { name: "Харадрим", icon: "/enemies/kharadrim.png", tier: 4, strength: 6, defense: 6, intelligence: 4, luck: 4 },
  { name: "Мумак (олифант)", icon: "/enemies/mumak.png", tier: 4, strength: 10, defense: 9, intelligence: 1, luck: 2, southOnly: true },
  { name: "Тролли Горгорота", icon: "/enemies/troll_gorgoroth.png", tier: 5, strength: 9, defense: 9, intelligence: 2, luck: 2 },
];

// Tier 0-5 at a map point: closer to Mordor → higher.
function tierAt(point: Point): number {
  const dist = Math.hypot(point.x - MORDOR_POINT.x, point.y - MORDOR_POINT.y);
  return clamp(Math.round((1 - dist / ENCOUNTER_TIER_SPAN) * 5), 0, 5);
}

// Pick a foe for the local tier; sometimes a stronger one ("too tough for now").
function pickMonster(localTier: number, point: Point): { monster: Monster; dangerous: boolean } {
  const south = point.y >= SOUTH_ENCOUNTER_Y;
  const allowed = MONSTERS.filter((m) => south || !m.southOnly);
  const dangerous = localTier < 5 && Math.random() < DANGEROUS_ENCOUNTER_CHANCE;
  let pool = dangerous
    ? allowed.filter((m) => m.tier > localTier)
    : allowed.filter((m) => m.tier <= localTier && m.tier >= localTier - 1);
  if (pool.length === 0) {
    pool = allowed.filter((m) => m.tier <= localTier);
  }
  if (pool.length === 0) {
    pool = allowed.length > 0 ? allowed : MONSTERS;
  }
  return { monster: pool[Math.floor(Math.random() * pool.length)], dangerous };
}

// Named bosses fixed to their lairs — engageable when you reach the location.
const BOSSES_BY_LOCATION: Record<number, Monster> = {
  [WEATHERTOP_ID]: { name: "Назгул-засада", icon: "/enemies/nazgul.png", tier: 4, strength: 8, defense: 7, intelligence: 8, luck: 4 },
  [MORIA_GATE_ID]: { name: "Балрог, Погибель Дурина", icon: "/enemies/balrog.png", tier: 5, strength: 10, defense: 10, intelligence: 8, luck: 5 },
  [ISENGARD_ID]: { name: "Саруман и урук-хай", icon: "/icons/saruman.png", tier: 4, strength: 8, defense: 7, intelligence: 9, luck: 5 },
  [BARAD_DUR_ID]: { name: "Гарнизон Барад-дура", icon: "/enemies/baraddur.png", tier: 5, strength: 10, defense: 10, intelligence: 10, luck: 6 },
  [CIRITH_UNGOL_ID]: { name: "Шелоб", icon: "/enemies/shelob.png", tier: 5, strength: 9, defense: 8, intelligence: 5, luck: 4 },
  [MINAS_MORGUL_ID]: { name: "Король-чародей Ангмара", icon: "/enemies/witchking.png", tier: 5, strength: 9, defense: 8, intelligence: 9, luck: 5 },
  [UMBAR_ID]: { name: "Корсары Умбара", icon: "/enemies/corsair.png", tier: 4, strength: 7, defense: 6, intelligence: 5, luck: 5 },
};
// Unique boss names — a defeated boss never returns to its location.
const BOSS_NAMES = new Set(Object.values(BOSSES_BY_LOCATION).map((boss) => boss.name));

// XP a foe grants the whole party on victory (scales with tier and strength).
function monsterExp(monster: Monster): number {
  return 5 + monster.tier * 20 + monster.strength * 4;
}

// Races for party-composition rules.
const HOBBIT_IDS = new Set(["frodo", "sam", "merry", "pippin", "bilbo"]);
const DWARF_IDS = new Set(["gimli"]);
// Elves who refuse to march with a dwarf in the party (Legolas excepted).
const ELF_IDS = new Set([
  "elrond",
  "arwen",
  "galadriel",
  "celeborn",
  "haldir",
  "thranduil",
  "cirdan",
  "galdor",
]);

// Voiced refusal for a deterministic reason given the party (null = no block).
function recruitRefusalLine(characterId: string, party: string[]): string | null {
  if (characterId === "gollum" && !party.every((id) => HOBBIT_IDS.has(id))) {
    return "Голлум шипит: «Не-ет! Голлум пойдёт только с хоббитсами, без чужаков, голлм!»";
  }
  if (characterId === "arwen" && party.includes("elrond")) {
    return "Элронд: «Я не отпущу Арвен в эту тьму.»";
  }
  if (characterId === "eowyn" && (party.includes("eomer") || party.includes("theoden"))) {
    return "Эовин: «Мои родичи не пускают меня в поход.»";
  }
  if (characterId === "saruman" && party.includes("gandalf")) {
    return "Саруман: «Я не пойду рядом с этим серым бродягой.»";
  }
  if (characterId === "gandalf" && party.includes("saruman")) {
    return "Гэндальф: «Я не встану рядом с предателем Саруманом.»";
  }
  if (ELF_IDS.has(characterId) && party.some((id) => DWARF_IDS.has(id))) {
    return "Эльф качает головой: «Я не ступлю и шагу, пока в отряде гном.»";
  }
  return null;
}

// Generic "not in the mood" lines for occasional random refusals.
const RANDOM_REFUSALS = [
  "«Не сегодня — у меня дела.»",
  "«Нет настроения для дальних дорог.»",
  "«Может, в другой раз.»",
  "«Мне и здесь неплохо, благодарю.»",
];
const MOOD_REFUSAL_CHANCE = 0.15;

// One passive ability per hero, active while they are in the party.
const ABILITIES: Record<string, string> = {
  gandalf: "Ускоряет лечение отряда на 50%",
  aragorn: "Скрытность: вдвое реже случайные бои",
  gollum: "Нет штрафа за труднопроходимую местность",
  bombadil: "Удача всего отряда +1",
  cirdan: "Можно плыть по морю, нет штрафа от воды",
  grimbeorn: "Усиленный урон по зверям",
  sam: "Добывает больше еды",
  eomer: "Ускоряет передвижение по карте",
  elrond: "Сила эльфов в отряде +1",
  galadriel: "Защита эльфов в отряде +1",
};
// Wraith/undead foes see the bearer even with the Ring on (no invisibility).
const WRAITH_FOES = new Set(["Умертвие", "Назгул-засада", "Король-чародей Ангмара"]);
// Only these beings can wound the Balrog.
const BALROG_DAMAGERS = new Set(["gandalf", "bombadil", "saruman"]);
// Beast-type foes (Grimbeorn hits them harder).
const BEAST_MONSTERS = new Set([
  "Лисы-вредители",
  "Крысы-переростки",
  "Волчья стая",
  "Гигантские пауки",
  "Варги",
  "Мумак (олифант)",
]);
const GANDALF_HEAL_MULTIPLIER = 1.5;
const ARAGORN_ENCOUNTER_MULTIPLIER = 0.5;
const EOMER_SPEED_MULTIPLIER = 1.5;
const SAM_FARM_BONUS = 3;
const GRIMBEORN_BEAST_BONUS = 4;

// Party-wide stat auras from companions, added on top of allocated bonuses.
function auraBonus(character: Character, party: string[]): StatBonus {
  const bonus = { strength: 0, defense: 0, intelligence: 0, luck: 0 };
  if (party.includes("bombadil")) {
    bonus.luck += 1;
  }
  if (ELF_IDS.has(character.id) || character.id === "legolas") {
    if (party.includes("elrond")) {
      bonus.strength += 1;
    }
    if (party.includes("galadriel")) {
      bonus.defense += 1;
    }
  }
  return bonus;
}

function addBonus(a: StatBonus, b: StatBonus): StatBonus {
  return {
    strength: a.strength + b.strength,
    defense: a.defense + b.defense,
    intelligence: a.intelligence + b.intelligence,
    luck: a.luck + b.luck,
  };
}

// Roaming foes who join on defeat. Eomer only in Rohan; Gollum anywhere, rare.
const EOMER_ENEMY: Monster = {
  name: "Эомер, маршал Марки",
  icon: "/icons/eomer.png",
  tier: 3,
  strength: 8,
  defense: 8,
  intelligence: 6,
  luck: 6,
  recruitId: "eomer",
};
const GOLLUM_ENEMY: Monster = {
  name: "Голлум",
  icon: "/icons/gollum.png",
  tier: 2,
  strength: 4,
  defense: 3,
  intelligence: 5,
  luck: 9,
  recruitId: "gollum",
};
const EDORAS_POINT = { x: 909, y: 1062 };
const ROHAN_RADIUS = 280;
// Per-encounter chance for the roaming specials (encounters fire ~every 3 days):
// Gollum ≈ once a month anywhere, Eomer ≈ once every couple weeks but only in Rohan.
const GOLLUM_ENCOUNTER_CHANCE = 0.1;
const EOMER_ENCOUNTER_CHANCE = 0.2;
// Tom Bombadil drifts home eventually — per-day chance (~weeks to a couple months).
const BOMBADIL_LEAVE_CHANCE = 1 / 40;
// Companions tempted by the Ring who may turn on the bearer, and the per-encounter chance.
const TRAITORS = new Set(["bilbo", "boromir", "gollum", "saruman"]);
const BETRAYAL_CHANCE = 0.08;

// Choose what a triggered encounter is. Specials (Gollum/Eomer) come alone;
// ordinary foes arrive as a pack (handled at battle start).
function rollEncounter(
  point: Point,
  party: string[],
): { monster: Monster; dangerous: boolean; solo: boolean } {
  if (!party.includes("gollum") && Math.random() < GOLLUM_ENCOUNTER_CHANCE) {
    return { monster: GOLLUM_ENEMY, dangerous: false, solo: true };
  }
  const inRohan = Math.hypot(point.x - EDORAS_POINT.x, point.y - EDORAS_POINT.y) < ROHAN_RADIUS;
  if (inRohan && !party.includes("eomer") && Math.random() < EOMER_ENCOUNTER_CHANCE) {
    return { monster: EOMER_ENEMY, dangerous: false, solo: true };
  }
  return { ...pickMonster(tierAt(point), point), solo: false };
}

// Leveling: each level-up grants +1 to a chosen stat. Level costs grow, so a
// full game spans roughly 10-50 levels; the first level ~10 easy fights.
const LEVEL_BASE_XP = 300; // xp from level 1 to 2
const LEVEL_XP_STEP = 120; // each further level needs this much more

interface StatBonus {
  strength: number;
  defense: number;
  intelligence: number;
  luck: number;
}
const ZERO_BONUS: StatBonus = { strength: 0, defense: 0, intelligence: 0, luck: 0 };

// Level (everyone starts at 1) plus progress within the current level.
function levelForExp(exp: number): { level: number; intoLevel: number; nextLevelXp: number } {
  let level = 1;
  let acc = 0;
  let need = LEVEL_BASE_XP;
  while (exp >= acc + need) {
    acc += need;
    level += 1;
    need += LEVEL_XP_STEP;
  }
  return { level, intoLevel: exp - acc, nextLevelXp: need };
}

function effectiveStats(character: Character, bonus: StatBonus) {
  return {
    strength: character.strength + bonus.strength,
    defense: character.defense + bonus.defense,
    intelligence: character.intelligence + bonus.intelligence,
    luck: character.luck + bonus.luck,
  };
}

// Auto-battle: allies strike one by one, then the enemy. Damage = attacker
// strength minus target defense (min 1). HP = 10×strength. Paced by a timer.
const BATTLE_TICK_MS = 550;

interface Combatant {
  key: string;
  name: string;
  icon: string | null;
  hp: number;
  maxHp: number;
  strength: number;
  defense: number;
}
interface BattleState {
  allies: Combatant[];
  enemies: Combatant[];
  exp: number;
  turn: "allies" | "enemies";
  index: number;
  outcome: "win" | "lose" | null;
  lastHit: string | null; // key of the combatant struck this tick (for the flash)
  attacker: string | null; // key of the combatant striking this tick (outlined)
  tick: number; // increments on every strike so the flash re-triggers
  bearerKey: string | null; // the ring bearer among the allies, if present
  ringOn: boolean; // bearer wears the Ring: invisible & untargetable
  recruitId: string | null; // character who may join if this foe is defeated
  enemyBeast: boolean; // foes are beasts (Grimbeorn hits them harder)
  ringIneffective: boolean; // wraiths see through the Ring's invisibility
  betrayalBy: string | null; // a companion turned on the bearer (1v1 for the Ring)
  gandalfOnly: boolean; // only Gandalf can wound this foe (the Balrog)
}

function hitDamage(attacker: Combatant, target: Combatant): number {
  return Math.max(1, attacker.strength - target.defense);
}
// Towns where provisions can be restocked.
const FOOD_SUPPLY_LOCATION_IDS = new Set<number>([
  HOBBITON_ID,
  RIVENDELL_ID,
  MINAS_TIRITH_ID,
  LOTHLORIEN_ID,
  ESGAROTH_ID,
]);
// Always available at these locations (no schedule in recruitment.json).
const RECRUITS_BY_LOCATION: Record<number, string[]> = {
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
// Characters who are only sometimes home; rolled once per visit (chance to find).
const RANDOM_PRESENCE: Record<string, number> = {
  bombadil: 1 / 5,
  grimbeorn: 1 / 2,
};
// The One Ring has no hold on Tom Bombadil — he cannot be made its bearer.
const NON_BEARERS = new Set<string>(["bombadil"]);
// Bilbo only relents after much pestering: each attempt has this success chance.
const BILBO_RECRUIT_CHANCE = 0.05;
// Some heroes only join if the party is lucky enough (max luck in the party
// meets this). Pippin's Took-luck (8) is the key that unlocks the elusive ones.
const RECRUIT_MIN_LUCK: Record<string, number> = {
  gandalf: 8,
  legolas: 7,
};

// Mounts/ships. Only one at a time; taking a new one replaces the old. `sea`
// transports let the route cross water; `speed` multiplies travel speed.
type TransportId = "pony" | "horse" | "ship";
interface Transport {
  name: string;
  speed: number;
  sea: boolean;
  action: string;
}
const TRANSPORTS: Record<TransportId, Transport> = {
  pony: { name: "Пони", speed: 2, sea: false, action: "Взять пони" },
  horse: { name: "Конь", speed: 4, sea: false, action: "Оседлать коня" },
  ship: { name: "Корабль", speed: 1, sea: true, action: "Сесть на корабль" },
};
const TRANSPORT_BY_LOCATION: Record<number, TransportId> = {
  [BREE_ID]: "pony",
  [EDORAS_ID]: "horse",
  [GREY_HAVENS_ID]: "ship",
  [UMBAR_ID]: "ship",
};

// Provisions a party can carry depends on the transport (mounts carry more).
function foodCapacityFor(transport: TransportId | null): number {
  if (transport === "horse") return FOOD_DAYS_HORSE;
  if (transport === "pony") return FOOD_DAYS_PONY;
  return FOOD_DAYS_BASE;
}

interface RecruitmentWindow {
  locationId: number;
  fromDay: number;
  toDay: number | null;
  note?: string;
}

interface RawRecruitmentEntry {
  from: string;
  to: string | null;
  place: string;
  time?: string;
  source?: string;
}

const RECRUITMENT_PLACE_IDS: Record<string, number> = {
  hobbiton: HOBBITON_ID,
  bucklebury: BUCKLAND_ID,
  bree: BREE_ID,
  weathertop: WEATHERTOP_ID,
  rivendell: RIVENDELL_ID,
  grey_havens: GREY_HAVENS_ID,
};
const START_DATE = { day: 23, month: 8, year: 3018 };
const MONTHS_RU = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];
const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
// Terrain types indexed by id; id is the value stored in the precomputed grid.
const TERRAIN_TYPES: TerrainType[] = [
  { name: "plain", cost: 1 },
  { name: "slow", cost: 1.5 },
  { name: "forest", cost: 1.5 },
  { name: "road", cost: 0.5 },
  { name: "mountain", cost: 2 },
  { name: "water", cost: 2 },
];
const TERRAIN = {
  plain: TERRAIN_TYPES[0],
  slow: TERRAIN_TYPES[1],
  forest: TERRAIN_TYPES[2],
  road: TERRAIN_TYPES[3],
  mountain: TERRAIN_TYPES[4],
  water: TERRAIN_TYPES[5],
};
// map.gif is an 8-color indexed image; every color maps to exactly one terrain
// type. We match each pixel to the nearest palette color instead of guessing
// from RGB thresholds. (See palette dump: 6 colors are used, black is unused.)
const TERRAIN_PALETTE: { rgb: [number, number, number]; id: number }[] = [
  { rgb: [255, 255, 255], id: 0 }, // white  -> plain (land/background)
  { rgb: [221, 154, 99], id: 1 }, //  tan    -> slow (hills)
  { rgb: [0, 205, 13], id: 2 }, //    green  -> forest
  { rgb: [255, 255, 0], id: 3 }, //   yellow -> road
  { rgb: [116, 48, 48], id: 4 }, //   brown  -> mountain
  { rgb: [48, 48, 209], id: 5 }, //   blue   -> water
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isBlockedTerrain(name: string): boolean {
  return name === "mountain";
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function getMonthLength(month: number, year: number): number {
  return month === 1 && isLeapYear(year) ? 29 : MONTH_LENGTHS[month];
}

function getJourneyDate(dayOffset: number, months: string[] = MONTHS_RU): string {
  let day = START_DATE.day + dayOffset;
  let month = START_DATE.month;
  let year = START_DATE.year;

  while (day > getMonthLength(month, year)) {
    day -= getMonthLength(month, year);
    month += 1;

    if (month > 11) {
      month = 0;
      year += 1;
    }
  }

  return `${day} ${months[month]} ${year}`;
}

// Month is 1-based (9 = сентябрь). Day offset 0 = START_DATE.
function dateToDayOffset(day: number, month1Based: number, year: number): number {
  const targetMonth = month1Based - 1;
  let offset = 0;
  let d = START_DATE.day;
  let m = START_DATE.month;
  let y = START_DATE.year;

  while (!(y === year && m === targetMonth && d === day)) {
    offset += 1;
    d += 1;
    if (d > getMonthLength(m, y)) {
      d = 1;
      m += 1;
      if (m > 11) {
        m = 0;
        y += 1;
      }
    }
  }

  return offset;
}

function isoDateToDayOffset(iso: string): number {
  const [year, month, day] = iso.split("-").map(Number);
  return dateToDayOffset(day, month, year);
}

function buildRecruitmentSchedules(
  raw: Record<string, RawRecruitmentEntry[]>,
): Record<string, RecruitmentWindow[]> {
  const schedules: Record<string, RecruitmentWindow[]> = {};

  for (const [characterId, entries] of Object.entries(raw)) {
    schedules[characterId] = entries.map((entry) => {
      const locationId = RECRUITMENT_PLACE_IDS[entry.place];
      if (locationId === undefined) {
        throw new Error(`Unknown recruitment place "${entry.place}" for ${characterId}`);
      }

      return {
        locationId,
        fromDay: isoDateToDayOffset(entry.from),
        toDay: entry.to ? isoDateToDayOffset(entry.to) : null,
        note: entry.time === "night" ? "ночью" : undefined,
      };
    });
  }

  return schedules;
}

const RECRUITMENT_SCHEDULES = buildRecruitmentSchedules(
  recruitmentDataJson as Record<string, RawRecruitmentEntry[]>,
);

function formatRecruitmentPeriod(
  fromDay: number,
  toDay: number | null,
  note: string | undefined,
  months: string[],
  onward: string,
  night: string,
): string {
  let label: string;
  if (toDay === null) {
    label = `${getJourneyDate(fromDay, months)} ${onward}`;
  } else if (fromDay === toDay) {
    label = getJourneyDate(fromDay, months);
  } else {
    label = `${getJourneyDate(fromDay, months)} — ${getJourneyDate(toDay, months)}`;
  }
  return note ? `${label} (${night})` : label;
}

function isCharacterRecruitableHere(
  characterId: string,
  locationId: number,
  journeyDay: number,
): boolean {
  const schedule = RECRUITMENT_SCHEDULES[characterId];
  if (schedule) {
    return schedule.some(
      (window) =>
        window.locationId === locationId &&
        journeyDay >= window.fromDay &&
        (window.toDay === null || journeyDay <= window.toDay),
    );
  }
  return (RECRUITS_BY_LOCATION[locationId] ?? []).includes(characterId);
}

function getLocationLabel(location: MapLocation, lang: string): string {
  return lang === "en" ? location.name : (location.name_ru ?? location.name);
}

interface RecruitmentCalendarEntry {
  character: Character;
  locationLabel: string;
  periodLabel: string;
  fromDay: number;
  isActive: boolean;
}

function buildRecruitmentCalendar(
  locations: MapLocation[],
  journeyDay: number,
  months: string[],
  lang: string,
  onward: string,
  night: string,
  always: string,
): RecruitmentCalendarEntry[] {
  const entries: RecruitmentCalendarEntry[] = [];

  for (const [characterId, windows] of Object.entries(RECRUITMENT_SCHEDULES)) {
    const character = CHARACTERS.find((entry) => entry.id === characterId);
    if (!character) {
      continue;
    }

    for (const window of windows) {
      const location = locations.find((entry) => entry.id === window.locationId);
      const isActive =
        journeyDay >= window.fromDay && (window.toDay === null || journeyDay <= window.toDay);
      entries.push({
        character,
        locationLabel: location ? getLocationLabel(location, lang) : String(window.locationId),
        periodLabel: formatRecruitmentPeriod(window.fromDay, window.toDay, window.note, months, onward, night),
        fromDay: window.fromDay,
        isActive,
      });
    }
  }

  for (const [locationIdStr, characterIds] of Object.entries(RECRUITS_BY_LOCATION)) {
    const locationId = Number(locationIdStr);
    const location = locations.find((entry) => entry.id === locationId);

    for (const characterId of characterIds) {
      if (RECRUITMENT_SCHEDULES[characterId]) {
        continue;
      }
      const character = CHARACTERS.find((entry) => entry.id === characterId);
      if (!character) {
        continue;
      }
      entries.push({
        character,
        locationLabel: location ? getLocationLabel(location, lang) : String(locationId),
        periodLabel: always,
        fromDay: 0,
        isActive: true,
      });
    }
  }

  return entries.sort(
    (left, right) =>
      left.fromDay - right.fromDay || left.character.name.localeCompare(right.character.name),
  );
}


function getStartPosition(hobbitonPoint: Point): Point {
  const cellWidth = locationData.meta.map.width / MAP_GRID_COLS;
  return {
    x: hobbitonPoint.x - cellWidth,
    y: hobbitonPoint.y,
  };
}

function appendPathPoint(path: Point[], point: Point): Point[] {
  const last = path[path.length - 1];
  if (last && Math.hypot(point.x - last.x, point.y - last.y) < PATH_SAMPLE_DISTANCE) {
    return path;
  }
  return [...path, point];
}

// Zoom at which `visibleFraction` of the map area fills the given viewport.
function fitZoom(view: Size, map: Size, visibleFraction: number): number {
  return Math.sqrt((view.width * view.height) / (map.width * map.height * visibleFraction));
}

// Smallest zoom that still covers the whole viewport (no empty gaps).
function coverZoom(view: Size, map: Size): number {
  return Math.max(view.width / map.width, view.height / map.height);
}

// Nearest palette color by squared RGB distance. Robust to any minor variance
// the browser's GIF decode might introduce, while staying exact for clean pixels.
function nearestTerrainId(r: number, g: number, b: number): number {
  let bestId = 0;
  let bestDist = Infinity;

  for (const entry of TERRAIN_PALETTE) {
    const dr = r - entry.rgb[0];
    const dg = g - entry.rgb[1];
    const db = b - entry.rgb[2];
    const dist = dr * dr + dg * dg + db * db;

    if (dist < bestDist) {
      bestDist = dist;
      bestId = entry.id;
    }
  }

  return bestId;
}

// Derive current stats from a character and how many days have been travelled.
function computeCharacterStats(
  character: Character,
  journeyDay: number,
  bearerId: string,
  damage: number,
  bonus: StatBonus,
): CharacterStats {
  const isBearer = character.id === bearerId;
  const s = effectiveStats(character, bonus);
  const maxHealth = s.strength * HEALTH_PER_STR;
  const health = Math.max(0, maxHealth - damage);

  // Baseline exposure everyone carries; the bearer also accrues it day by day.
  const baseCorruption = (character.ringExposure ?? 0) * 100;
  const journeyCorruption = isBearer ? (journeyDay / character.resilience) * 100 : 0;

  return {
    strength: s.strength,
    defense: s.defense,
    intelligence: s.intelligence,
    health,
    maxHealth,
    luck: s.luck,
    isBearer,
    corruption: Math.min(100, Math.round(baseCorruption + journeyCorruption)),
    dead: health <= 0,
  };
}

function StatBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="text-left">
      <div className="mb-1 flex justify-between text-xs text-neutral-400">
        <span>{label}</span>
        <span className="text-neutral-200">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded bg-neutral-800">
        <div className={`h-full rounded ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// Vertical gauge with an icon and a numeric readout; fills from the bottom up.
function VerticalStat({
  icon,
  label,
  value,
  max,
  color,
  unit = "",
}: {
  icon: ReactNode;
  label: string;
  value: number;
  max: number;
  color: string;
  unit?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      className="flex w-12 flex-col items-center gap-1"
      title={label}
      aria-label={`${label}: ${value}${unit}`}
    >
      <span className="text-xs tabular-nums text-neutral-200">
        {value}
        {unit}
      </span>
      <div className="relative h-24 w-5 overflow-hidden rounded bg-neutral-800">
        <div className={`absolute inset-x-0 bottom-0 ${color}`} style={{ height: `${pct}%` }} />
      </div>
      <span className="text-neutral-400">{icon}</span>
    </div>
  );
}

export default function MiddleEarthMap() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const months = t("months", { returnObjects: true }) as unknown as string[];
  // Localized display names (logic still keys off ids / canonical names).
  const charName = (id: string) => t(`char.${id}`);
  const monsterName = (icon: string) => t(`monster.${icon.split("/").pop()?.replace(".png", "")}`);
  const locName = (loc: MapLocation) => getLocationLabel(loc, lang);
  const toggleLang = () => i18n.changeLanguage(lang === "en" ? "ru" : "en");

  const frameRef = useRef<number | null>(null);
  const journeyMilesRef = useRef(0);
  const journeyDayRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const playerRef = useRef<Point | null>(null);
  const terrainRef = useRef<TerrainGrid | null>(null);
  const waterRunRef = useRef<WaterRun>({ cellKey: null, count: 0 });
  const dragRef = useRef<DragState>({
    active: false,
    moved: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    startOffset: { x: 0, y: 0 },
  });
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const offsetRef = useRef<Point | null>(null);
  const zoomRef = useRef(DEFAULT_ZOOM);
  const baseZoomRef = useRef(DEFAULT_ZOOM);
  const viewRef = useRef<Size>({ width: DEFAULT_VIEW_SIZE, height: DEFAULT_VIEW_SIZE });
  const initializedRef = useRef(false);
  // Set when the user manually pans during a journey; suspends auto-follow until
  // the next target so the camera doesn't snap back to the figure.
  const followDisabledRef = useRef(false);
  // Current transport, mirrored into a ref so the rAF loop reads it live.
  const transportRef = useRef<TransportId | null>(null);
  const partyRef = useRef<string[]>(DEFAULT_PARTY);

  const mapSize = useMemo<Size>(
    () => ({
      width: locationData.meta.map.width,
      height: locationData.meta.map.height,
    }),
    [],
  );

  const locations = useMemo<MapLocation[]>(() => locationData.locations, []);

  const hobbiton = useMemo<MapLocation>(
    () => locations.find((location) => location.id === HOBBITON_ID) ?? locations[0],
    [locations],
  );

  const [view, setView] = useState<Size>({ width: DEFAULT_VIEW_SIZE, height: DEFAULT_VIEW_SIZE });
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [offset, setOffset] = useState<Point>(() => {
    const start = getStartPosition(hobbiton.point);
    return {
      x: DEFAULT_VIEW_SIZE / 2 - start.x * DEFAULT_ZOOM,
      y: DEFAULT_VIEW_SIZE / 2 - start.y * DEFAULT_ZOOM,
    };
  });
  const [player, setPlayer] = useState<Point>(() => {
    const start = getStartPosition(hobbiton.point);
    playerRef.current = start;
    return start;
  });
  const [heroPath, setHeroPath] = useState<Point[]>(() => {
    const start = getStartPosition(hobbiton.point);
    return [start];
  });
  const [showHeroPath, setShowHeroPath] = useState(false);
  const [journeyDay, setJourneyDay] = useState(0);
  const [target, setTarget] = useState<Point | null>(null);
  const [targetLocation, setTargetLocation] = useState<MapLocation | null>(null);
  // A companion left on the map that we're walking toward (invite on arrival).
  const [targetMemberId, setTargetMemberId] = useState<string | null>(null);
  // The game opens with the Hobbiton location card (recruit Sam, take supplies).
  const [visitedLocation, setVisitedLocation] = useState<MapLocation | null>(hobbiton);
  const [isMoving, setIsMoving] = useState(false);
  const [terrainReady, setTerrainReady] = useState(false);
  const [showTerrain, setShowTerrain] = useState(false);
  const [openCharacterId, setOpenCharacterId] = useState<string | null>(null);
  const [ending, setEnding] = useState<"victory" | "lord" | "starved" | null>(null);
  const [lordClaimed, setLordClaimed] = useState(false);
  const [party, setParty] = useState<string[]>(DEFAULT_PARTY);
  const [partyOpen, setPartyOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [bearerId, setBearerId] = useState(RING_BEARER_ID);
  const [transport, setTransport] = useState<TransportId | null>(null);
  // Food (days left) and per-character starvation damage are simulated per day.
  // Damage is per character so new recruits join at full health; with double
  // rations on, a damaged party heals at the cost of extra food.
  const [food, setFood] = useState(0);
  const [damageById, setDamageById] = useState<Record<string, number>>({});
  const [deathNotice, setDeathNotice] = useState<string | null>(null);
  const [foodFarmed, setFoodFarmed] = useState<number | null>(null);
  const [randomPresence, setRandomPresence] = useState<Record<string, boolean>>({});
  const [recruitRefusal, setRecruitRefusal] = useState<string | null>(null);
  // After defeating a recruitable foe: offer to invite them.
  const [recruitOffer, setRecruitOffer] = useState<string | null>(null);
  const [splitOpen, setSplitOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [defeatedBosses, setDefeatedBosses] = useState<Set<string>>(new Set());
  const [pendingBetrayal, setPendingBetrayal] = useState<string | null>(null);
  // Companions left waiting on the map; can be re-called by clicking their marker.
  const [leftBehind, setLeftBehind] = useState<{ id: string; point: Point }[]>([]);
  // Brief face swap (refuse/joy) on a character's portrait when (de)recruited.
  const [emote, setEmote] = useState<{ id: string; kind: "refuse" | "joy" } | null>(null);
  const emoteTimerRef = useRef<number | null>(null);
  const [hasCloaks, setHasCloaks] = useState(false);
  const [encounter, setEncounter] = useState<{
    monster: Monster;
    dangerous: boolean;
    solo: boolean;
  } | null>(null);
  const [battle, setBattle] = useState<BattleState | null>(null);
  const [expById, setExpById] = useState<Record<string, number>>({});
  const [statBonusById, setStatBonusById] = useState<Record<string, StatBonus>>({});
  // Extra days of Ring decay bought by putting it on in battle.
  const [ringWear, setRingWear] = useState(0);
  const battleAppliedRef = useRef(false);
  const foodRef = useRef(0);
  const damageRef = useRef<Record<string, number>>({});
  const processedDayRef = useRef(0);
  // Movement halts while an encounter is unresolved; the rAF loop reads this.
  const encounterRef = useRef(false);

  const flashEmote = useCallback((id: string, kind: "refuse" | "joy") => {
    if (emoteTimerRef.current) {
      clearTimeout(emoteTimerRef.current);
    }
    setEmote({ id, kind });
    emoteTimerRef.current = window.setTimeout(() => setEmote(null), 500);
  }, []);

  const recruitCharacter = useCallback(
    (id: string) => {
      setParty((prev) => (prev.includes(id) ? prev : [...prev, id]));
      flashEmote(id, "joy");
    },
    [flashEmote],
  );

  // Try to recruit, honoring per-character conditions; refusals show a voiced
  // line. `fromOffer` (post-battle invite) skips the random "mood" refusal.
  const attemptRecruit = useCallback(
    (character: Character, fromOffer = false) => {
      const refuse = (line: string) => {
        flashEmote(character.id, "refuse");
        setRecruitRefusal(line);
      };

      // Deterministic party-composition rules (incl. Gollum's hobbits-only).
      const blocked = recruitRefusalLine(character.id, party);
      if (blocked) {
        refuse(blocked);
        return;
      }
      // Círdan only follows a bearer at least as wise as himself.
      if (character.id === "cirdan") {
        const bearer = CHARACTERS.find((c) => c.id === bearerId);
        const bearerInt = bearer
          ? effectiveStats(bearer, statBonusById[bearerId] ?? ZERO_BONUS).intelligence
          : 0;
        if (bearerInt < character.intelligence) {
          refuse("Кирдан: «Я не вверю себя хранителю, что уступает мне в мудрости.»");
          return;
        }
      }
      // Bilbo clings to Rivendell — only relents after much pestering.
      if (character.id === "bilbo" && Math.random() >= BILBO_RECRUIT_CHANCE) {
        refuse("Бильбо ворчит: «Нет-нет, мне и тут уютно… загляни попозже.»");
        return;
      }
      // Occasional bad mood (not for hard-won battle invites).
      if (!fromOffer && Math.random() < MOOD_REFUSAL_CHANCE) {
        refuse(`${character.name}: ${RANDOM_REFUSALS[Math.floor(Math.random() * RANDOM_REFUSALS.length)]}`);
        return;
      }
      recruitCharacter(character.id);
    },
    [bearerId, flashEmote, party, recruitCharacter, statBonusById],
  );

  // Invite the foe defeated in battle (or decline).
  const acceptRecruitOffer = useCallback(() => {
    const id = recruitOffer;
    setRecruitOffer(null);
    if (!id) {
      return;
    }
    // A companion waiting on the map simply rejoins; a beaten foe is recruited.
    if (leftBehind.some((m) => m.id === id)) {
      setLeftBehind((prev) => prev.filter((m) => m.id !== id));
      recruitCharacter(id);
      return;
    }
    const character = CHARACTERS.find((c) => c.id === id);
    if (character) {
      // Subdued in battle → joins wounded (half health).
      const half = Math.floor((character.strength * HEALTH_PER_STR) / 2);
      damageRef.current = { ...damageRef.current, [id]: half };
      setDamageById(damageRef.current);
      attemptRecruit(character, true);
    }
  }, [recruitOffer, leftBehind, recruitCharacter, attemptRecruit]);

  // A tempted companion turns on the bearer: a 1v1 fight for the Ring.
  const startBetrayal = useCallback(
    (traitorId: string) => {
      const bearer = CHARACTERS.find((c) => c.id === bearerId);
      const traitor = CHARACTERS.find((c) => c.id === traitorId);
      if (!bearer || !traitor) {
        return;
      }
      const toCombatant = (c: Character): Combatant => {
        const s = effectiveStats(c, addBonus(statBonusById[c.id] ?? ZERO_BONUS, auraBonus(c, party)));
        const maxHp = s.strength * HEALTH_PER_STR;
        return {
          key: c.id,
          name: c.name,
          icon: c.icon,
          hp: Math.max(1, maxHp - (damageById[c.id] ?? 0)),
          maxHp,
          strength: s.strength,
          defense: s.defense,
        };
      };
      battleAppliedRef.current = false;
      setEncounter(null);
      setBattle({
        allies: [toCombatant(bearer)],
        enemies: [toCombatant(traitor)],
        exp: 0,
        turn: "allies",
        index: 0,
        outcome: null,
        lastHit: null,
        attacker: null,
        tick: 0,
        bearerKey: bearer.id,
        ringOn: false,
        recruitId: null,
        enemyBeast: false,
        ringIneffective: true,
        betrayalBy: traitorId,
        gandalfOnly: false,
      });
    },
    [bearerId, party, statBonusById, damageById],
  );

  // Leave a companion waiting at the current spot (re-callable later).
  const leaveMember = useCallback(
    (id: string) => {
      const point = playerRef.current ?? hobbiton.point;
      setLeftBehind((prev) => [
        ...prev,
        { id, point: { x: point.x + ((prev.length % 3) - 1) * 18, y: point.y + 22 } },
      ]);
      setParty((prev) => prev.filter((p) => p !== id));
    },
    [hobbiton],
  );

  // Dismiss a companion for good.
  const dismissMember = useCallback((id: string) => {
    setParty((prev) => prev.filter((p) => p !== id));
  }, []);

  // Walk to a companion left on the map; the invite opens once you arrive.
  const walkToMember = useCallback((member: { id: string; point: Point }) => {
    setTarget({ x: member.point.x, y: member.point.y });
    setTargetMemberId(member.id);
    setTargetLocation(null);
    setVisitedLocation(null);
    waterRunRef.current = { cellKey: null, count: 0 };
    lastTimeRef.current = null;
    followDisabledRef.current = false;
  }, []);

  // "Принять бой" → snapshot party + enemy into a paced auto-battle.
  const startBattle = useCallback(() => {
    if (!encounter) {
      return;
    }
    const allies: Combatant[] = party
      .map((id): Combatant | null => {
        const character = CHARACTERS.find((c) => c.id === id);
        if (!character) {
          return null;
        }
        const s = effectiveStats(
          character,
          addBonus(statBonusById[id] ?? ZERO_BONUS, auraBonus(character, party)),
        );
        const maxHp = s.strength * HEALTH_PER_STR;
        return {
          key: id,
          name: character.name,
          icon: character.icon,
          hp: Math.max(0, maxHp - (damageById[id] ?? 0)),
          maxHp,
          strength: s.strength,
          defense: s.defense,
        };
      })
      .filter((c): c is Combatant => c !== null && c.hp > 0);
    const m = encounter.monster;
    const enemyHp = m.strength * HEALTH_PER_STR;
    // Ordinary foes come in a pack ~equal to the party (±2); specials come alone.
    const count = encounter.solo
      ? 1
      : Math.max(1, party.length + Math.floor(Math.random() * 5) - 2);
    const enemies: Combatant[] = Array.from({ length: count }, (_, i) => ({
      key: `enemy-${i}`,
      name: m.name,
      icon: m.icon,
      hp: enemyHp,
      maxHp: enemyHp,
      strength: m.strength,
      defense: m.defense,
    }));
    battleAppliedRef.current = false;
    setEncounter(null);
    setBattle({
      allies,
      enemies,
      exp: monsterExp(m) * count,
      turn: "allies",
      index: 0,
      outcome: allies.length === 0 ? "lose" : null,
      lastHit: null,
      attacker: null,
      tick: 0,
      bearerKey: allies.some((a) => a.key === bearerId) ? bearerId : null,
      ringOn: false,
      recruitId: m.recruitId ?? null,
      enemyBeast: BEAST_MONSTERS.has(m.name),
      ringIneffective: WRAITH_FOES.has(m.name),
      betrayalBy: null,
      gandalfOnly: m.name.startsWith("Балрог"),
    });
  }, [encounter, party, statBonusById, damageById]);

  const spendStatPoint = useCallback((id: string, stat: keyof StatBonus) => {
    setStatBonusById((prev) => {
      const current = prev[id] ?? ZERO_BONUS;
      return { ...prev, [id]: { ...current, [stat]: current[stat] + 1 } };
    });
  }, []);

  // Flee: keep the wounds taken so far, no XP, leave the fight.
  const fleeBattle = useCallback(() => {
    if (!battle) {
      return;
    }
    const nextDamage = { ...damageRef.current };
    for (const ally of battle.allies) {
      nextDamage[ally.key] = ally.maxHp - ally.hp;
    }
    damageRef.current = nextDamage;
    setDamageById(nextDamage);
    setBattle(null);
  }, [battle]);

  // Put on the Ring: the bearer turns invisible/untargetable for this fight,
  // at the cost of one extra day of Ring corruption.
  const putOnRing = useCallback(() => {
    setRingWear((w) => w + 1);
    setBattle((b) => (b ? { ...b, ringOn: true } : b));
  }, []);

  const takeOffRing = useCallback(() => {
    setBattle((b) => (b ? { ...b, ringOn: false } : b));
  }, []);

  const claimLordship = useCallback(() => {
    setOpenCharacterId(null);
    setLordClaimed(true);
    setEnding("lord");
  }, []);

  const waitOneDay = useCallback(() => {
    if (isMoving) {
      return;
    }

    const nextDay = journeyDayRef.current + 1;
    journeyDayRef.current = nextDay;
    journeyMilesRef.current += MILES_PER_DAY;
    setJourneyDay(nextDay);
  }, [isMoving]);

  // Spend a day foraging: gather 1-3 days of food, plus a bonus from the ring
  // bearer's luck, capped by the transport's carrying capacity.
  const farmFood = useCallback(() => {
    if (isMoving) {
      return;
    }
    const bearer = CHARACTERS.find((character) => character.id === bearerId);
    const luck = bearer?.luck ?? 0;
    const samBonus = party.includes("sam") ? SAM_FARM_BONUS : 0;
    const gained =
      1 +
      samBonus +
      Math.floor(Math.random() * 3) +
      Math.floor(Math.random() * (Math.floor(luck / 3) + 1));
    const before = foodRef.current;
    foodRef.current = Math.min(foodCapacityFor(transport), before + gained);
    setFoodFarmed(foodRef.current - before);

    const nextDay = journeyDayRef.current + 1;
    journeyDayRef.current = nextDay;
    journeyMilesRef.current += MILES_PER_DAY;
    setJourneyDay(nextDay);
  }, [isMoving, bearerId, party, transport]);

  // Flip to the previous/next party member while a stats modal is open.
  const showAdjacentCharacter = useCallback(
    (direction: number) => {
      setOpenCharacterId((current) => {
        if (!current) {
          return current;
        }
        const ids = CHARACTERS.filter((character) => party.includes(character.id)).map(
          (character) => character.id,
        );
        const index = ids.indexOf(current);
        if (index === -1) {
          return current;
        }
        return ids[(index + direction + ids.length) % ids.length];
      });
    },
    [party],
  );

  // Mirror view state into refs so the rAF loop reads current values without
  // being a dependency (which would restart the animation on every pan/zoom).
  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);
  useEffect(() => {
    transportRef.current = transport;
  }, [transport]);
  useEffect(() => {
    partyRef.current = party;
  }, [party]);
  useEffect(() => {
    encounterRef.current = encounter !== null || battle !== null;
  }, [encounter, battle]);

  const clampOffset = useCallback(
    (nextOffset: Point, nextZoom: number): Point => {
      const scaledWidth = mapSize.width * nextZoom;
      const scaledHeight = mapSize.height * nextZoom;
      return {
        x: clamp(nextOffset.x, view.width - scaledWidth, 0),
        y: clamp(nextOffset.y, view.height - scaledHeight, 0),
      };
    },
    [mapSize, view],
  );

  const mapToScreen = useCallback(
    (point: Point): Point => ({
      x: point.x * zoom + offset.x,
      y: point.y * zoom + offset.y,
    }),
    [offset, zoom],
  );

  const screenToMap = useCallback(
    (screenPoint: Point): Point => ({
      x: clamp((screenPoint.x - offset.x) / zoom, 0, mapSize.width),
      y: clamp((screenPoint.y - offset.y) / zoom, 0, mapSize.height),
    }),
    [mapSize, offset, zoom],
  );

  const centerOnPlayer = useCallback(() => {
    const figure = playerRef.current;
    if (!figure) {
      return;
    }

    const next = clampOffset(
      { x: view.width / 2 - figure.x * zoom, y: view.height / 2 - figure.y * zoom },
      zoom,
    );
    offsetRef.current = next;
    setOffset(next);
  }, [clampOffset, view, zoom]);

  const cycleSpeed = useCallback(() => {
    setAnimationSpeed((prev) => {
      const index = ANIMATION_SPEEDS.indexOf(prev);
      return ANIMATION_SPEEDS[(index + 1) % ANIMATION_SPEEDS.length];
    });
  }, []);

  const getTerrainAtPoint = useCallback(
    (point: Point): TerrainSample => {
      const terrain = terrainRef.current;
      if (!terrain) {
        return {
          ...TERRAIN.plain,
          cellKey: null,
        };
      }

      const cellX = clamp(
        Math.floor((point.x / mapSize.width) * terrain.width),
        0,
        terrain.width - 1,
      );
      const cellY = clamp(
        Math.floor((point.y / mapSize.height) * terrain.height),
        0,
        terrain.height - 1,
      );
      const terrainType = TERRAIN_TYPES[terrain.grid[cellY * terrain.width + cellX]];

      return {
        ...terrainType,
        cellKey: `${cellX}:${cellY}`,
      };
    },
    [mapSize],
  );

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      const viewport = viewportRef.current;
      if (!viewport) {
        return;
      }

      event.preventDefault();
      const bounds = viewport.getBoundingClientRect();
      const cursor = {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      };
      const mapPoint = screenToMap(cursor);
      const direction = event.deltaY > 0 ? -1 : 1;
      const minZoom = coverZoom(view, mapSize);
      const maxZoom = Math.max(minZoom, baseZoomRef.current * MAX_ZOOM_FACTOR);
      const nextZoom = clamp(zoom + direction * ZOOM_STEP, minZoom, maxZoom);

      if (nextZoom === zoom) {
        return;
      }

      const nextOffset = clampOffset(
        {
          x: cursor.x - mapPoint.x * nextZoom,
          y: cursor.y - mapPoint.y * nextZoom,
        },
        nextZoom,
      );

      setZoom(nextZoom);
      setOffset(nextOffset);
    },
    [clampOffset, mapSize, screenToMap, view, zoom],
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return undefined;
    }

    viewport.addEventListener("wheel", handleWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const setTargetFromClientPoint = useCallback(
    (clientX: number, clientY: number) => {
      if (!viewportRef.current) {
        return;
      }

      const bounds = viewportRef.current.getBoundingClientRect();
      const clickPoint = screenToMap({
        x: clientX - bounds.left,
        y: clientY - bounds.top,
      });
      if (isBlockedTerrain(getTerrainAtPoint(clickPoint).name)) {
        return;
      }
      setTarget(clickPoint);
      setTargetLocation(null);
      setTargetMemberId(null);
      setVisitedLocation(null);
      waterRunRef.current = { cellKey: null, count: 0 };
      lastTimeRef.current = null;
      followDisabledRef.current = false;
    },
    [getTerrainAtPoint, screenToMap],
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) {
        return;
      }

      event.currentTarget.setPointerCapture(event.pointerId);
      dragRef.current = {
        active: true,
        moved: false,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startOffset: offset,
      };
    },
    [offset],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag.active || drag.pointerId !== event.pointerId) {
        return;
      }

      const deltaX = event.clientX - drag.startX;
      const deltaY = event.clientY - drag.startY;

      if (Math.hypot(deltaX, deltaY) > 3) {
        drag.moved = true;
        // User took over the camera — stop auto-following for this journey.
        followDisabledRef.current = true;
      }

      const draggedOffset = clampOffset(
        {
          x: drag.startOffset.x + deltaX,
          y: drag.startOffset.y + deltaY,
        },
        zoom,
      );
      // Keep the ref in sync so the auto-camera resumes from where the user
      // dropped the map, not from a stale value.
      offsetRef.current = draggedOffset;
      setOffset(draggedOffset);
    },
    [clampOffset, zoom],
  );

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag.active || drag.pointerId !== event.pointerId) {
        return;
      }

      event.currentTarget.releasePointerCapture(event.pointerId);
      dragRef.current = { ...drag, active: false, pointerId: null };

      if (!drag.moved) {
        setTargetFromClientPoint(event.clientX, event.clientY);
      }
    },
    [setTargetFromClientPoint],
  );

  const handlePointerCancel = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (drag.active && drag.pointerId === event.pointerId) {
      dragRef.current = { ...drag, active: false, pointerId: null };
    }
  }, []);

  const handleMarkerClick = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>, location: MapLocation) => {
      event.stopPropagation();
      setTarget({ x: location.point.x, y: location.point.y });
      setTargetLocation(location);
      setTargetMemberId(null);
      setVisitedLocation(null);
      waterRunRef.current = { cellKey: null, count: 0 };
      lastTimeRef.current = null;
      followDisabledRef.current = false;
    },
    [],
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return undefined;
    }

    const observer = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width);
      const height = Math.round(entry.contentRect.height);
      if (width === 0 || height === 0) {
        return;
      }

      const nextView = { width, height };
      setView(nextView);
      viewRef.current = nextView;

      const cover = coverZoom(nextView, mapSize);

      // On the first real measurement, fit the default ~quarter-of-map view and
      // center it on the figure (default zoom depends on the actual viewport).
      if (!initializedRef.current) {
        initializedRef.current = true;
        const figure = playerRef.current ?? hobbiton.point;
        const fit = Math.max(fitZoom(nextView, mapSize, DEFAULT_VISIBLE_FRACTION) * DEFAULT_ZOOM_BOOST, cover);
        baseZoomRef.current = fit;
        const centered = {
          x: clamp(width / 2 - figure.x * fit, width - mapSize.width * fit, 0),
          y: clamp(height / 2 - figure.y * fit, height - mapSize.height * fit, 0),
        };
        setZoom(fit);
        zoomRef.current = fit;
        setOffset(centered);
        offsetRef.current = centered;
        return;
      }

      // On later resizes, if the current zoom no longer covers the viewport,
      // bump it up to the cover zoom and re-clamp the offset.
      if (zoomRef.current < cover) {
        const o = offsetRef.current ?? { x: 0, y: 0 };
        const clampedOffset = {
          x: clamp(o.x, width - mapSize.width * cover, 0),
          y: clamp(o.y, height - mapSize.height * cover, 0),
        };
        setZoom(cover);
        zoomRef.current = cover;
        setOffset(clampedOffset);
        offsetRef.current = clampedOffset;
      }
    });

    observer.observe(viewport);
    return () => observer.disconnect();
  }, [hobbiton, mapSize]);

  useEffect(() => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = terrainImage;

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;

      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) {
        return;
      }

      context.drawImage(image, 0, 0);

      const width = image.naturalWidth;
      const height = image.naturalHeight;
      const { data } = context.getImageData(0, 0, width, height);
      // Classify once into a compact terrain-id grid; lookups are then O(1).
      const grid = new Uint8Array(width * height);
      for (let pixel = 0; pixel < grid.length; pixel += 1) {
        const offset = pixel * 4;
        grid[pixel] =
          data[offset + 3] < 16
            ? 0 // transparent -> plain
            : nearestTerrainId(data[offset], data[offset + 1], data[offset + 2]);
      }

      terrainRef.current = { width, height, grid };
      setTerrainReady(true);
    };

    return () => {
      image.onload = null;
    };
  }, []);

  useEffect(() => {
    if (!target) {
      return undefined;
    }

    const activeTarget: Point = target;
    const arrivalLocation = targetLocation;
    const arrivalMemberId = targetMemberId;
    setIsMoving(true);

    if (!playerRef.current) {
      playerRef.current = player;
    }

    function finishTravel(visitLocation: MapLocation | null) {
      setVisitedLocation(visitLocation);
      setTarget(null);
      setTargetLocation(null);
      setTargetMemberId(null);
      setIsMoving(false);
      frameRef.current = null;
      // Reached a companion we left behind → offer to invite them back.
      if (arrivalMemberId) {
        setRecruitOffer(arrivalMemberId);
      }
    }

    function step(time: number) {
      if (!lastTimeRef.current) {
        lastTimeRef.current = time;
      }

      // Freeze movement while an encounter is on screen; keep the clock fresh so
      // there is no time jump when the player resolves it.
      if (encounterRef.current) {
        lastTimeRef.current = time;
        frameRef.current = requestAnimationFrame(step);
        return;
      }

      const current = playerRef.current ?? activeTarget;
      const elapsedSeconds = (time - lastTimeRef.current) / 1000;
      const dx = activeTarget.x - current.x;
      const dy = activeTarget.y - current.y;
      const routeRadius = Math.hypot(dx, dy);
      lastTimeRef.current = time;

      if (routeRadius <= 0.5) {
        playerRef.current = activeTarget;
        setPlayer(activeTarget);
        setHeroPath((path) => appendPathPoint(path, activeTarget));
        finishTravel(arrivalLocation);
        return;
      }

      const cos = dx / routeRadius;
      const sin = dy / routeRadius;
      const members = partyRef.current;
      const activeTransport = transportRef.current ? TRANSPORTS[transportRef.current] : null;
      // Eomer speeds the march; Cirdan lets the party sail; Gollum ignores
      // rough-terrain penalties.
      const transportSpeed =
        (activeTransport ? activeTransport.speed : 1) *
        (members.includes("eomer") ? EOMER_SPEED_MULTIPLIER : 1);
      const canSail = (activeTransport ? activeTransport.sea : false) || members.includes("cirdan");
      const currentTerrain = getTerrainAtPoint(current);
      const terrainCost = members.includes("gollum") ? 1 : currentTerrain.cost;
      const visibleSpeed = (SPEED_PX_PER_SECOND * animationSpeed * transportSpeed) / terrainCost;
      const travel = Math.min(routeRadius, visibleSpeed * elapsedSeconds);

      function canMoveTo(point: Point): boolean {
        const terrain = getTerrainAtPoint(point);
        if (isBlockedTerrain(terrain.name)) {
          return false;
        }
        if (terrain.name === "water" && !canSail) {
          const waterRun = waterRunRef.current;
          const isNewWaterCell = waterRun.cellKey !== terrain.cellKey;
          if (isNewWaterCell && waterRun.count >= MAX_WATER_CROSSING_CELLS) {
            return false;
          }
        }
        return true;
      }

      function applyWaterRun(point: Point): void {
        if (canSail) {
          return;
        }
        const terrain = getTerrainAtPoint(point);
        if (terrain.name === "water") {
          const waterRun = waterRunRef.current;
          const isNewWaterCell = waterRun.cellKey !== terrain.cellKey;
          if (isNewWaterCell) {
            waterRunRef.current = {
              cellKey: terrain.cellKey,
              count: waterRun.count + 1,
            };
          }
          return;
        }
        waterRunRef.current = { cellKey: null, count: 0 };
      }

      function resolveMovement(from: Point, distance: number, dirX: number, dirY: number): Point | null {
        const direct = { x: from.x + dirX * distance, y: from.y + dirY * distance };
        if (canMoveTo(direct)) {
          return direct;
        }

        const slideX = { x: from.x + dirX * distance, y: from.y };
        const slideY = { x: from.x, y: from.y + dirY * distance };
        const xOk = canMoveTo(slideX);
        const yOk = canMoveTo(slideY);

        if (xOk && yOk) {
          return Math.abs(dirX) >= Math.abs(dirY) ? slideX : slideY;
        }
        if (xOk) {
          return slideX;
        }
        if (yOk) {
          return slideY;
        }
        return null;
      }

      let nextPlayer = current;
      let remainingTravel = travel;
      for (let substep = 0; substep < MOVE_SUBSTEPS; substep += 1) {
        const slice = remainingTravel / (MOVE_SUBSTEPS - substep);
        const resolved = resolveMovement(nextPlayer, slice, cos, sin);
        if (!resolved) {
          break;
        }
        applyWaterRun(resolved);
        nextPlayer = resolved;
        remainingTravel -= slice;
      }

      const actualTravel = Math.hypot(nextPlayer.x - current.x, nextPlayer.y - current.y);
      if (actualTravel < 0.01) {
        if (travel < 0.01) {
          frameRef.current = requestAnimationFrame(step);
          return;
        }
        setIsMoving(false);
        frameRef.current = null;
        return;
      }

      const arrived = Math.hypot(activeTarget.x - nextPlayer.x, activeTarget.y - nextPlayer.y) <= 0.5;
      if (arrived) {
        nextPlayer = activeTarget;
      }

      const nextJourneyMiles = journeyMilesRef.current + actualTravel * currentTerrain.cost;
      const nextJourneyDay = Math.floor(nextJourneyMiles / MILES_PER_DAY);

      journeyMilesRef.current = nextJourneyMiles;
      playerRef.current = nextPlayer;
      setPlayer(nextPlayer);
      setHeroPath((path) => appendPathPoint(path, nextPlayer));

      // Pan the map only once the figure crosses the margin band near an edge,
      // but never while the user is dragging — otherwise both fight over offset.
      const camOffset = offsetRef.current;
      if (camOffset && !dragRef.current.active && !followDisabledRef.current) {
        const camZoom = zoomRef.current;
        const camView = viewRef.current;
        const marginX = camView.width * FOLLOW_MARGIN_RATIO;
        const marginY = camView.height * FOLLOW_MARGIN_RATIO;
        const screenX = nextPlayer.x * camZoom + camOffset.x;
        const screenY = nextPlayer.y * camZoom + camOffset.y;
        let nextOffsetX = camOffset.x;
        let nextOffsetY = camOffset.y;

        if (screenX < marginX) {
          nextOffsetX = marginX - nextPlayer.x * camZoom;
        } else if (screenX > camView.width - marginX) {
          nextOffsetX = camView.width - marginX - nextPlayer.x * camZoom;
        }

        if (screenY < marginY) {
          nextOffsetY = marginY - nextPlayer.y * camZoom;
        } else if (screenY > camView.height - marginY) {
          nextOffsetY = camView.height - marginY - nextPlayer.y * camZoom;
        }

        if (nextOffsetX !== camOffset.x || nextOffsetY !== camOffset.y) {
          const clampedOffset = {
            x: clamp(nextOffsetX, camView.width - mapSize.width * camZoom, 0),
            y: clamp(nextOffsetY, camView.height - mapSize.height * camZoom, 0),
          };
          offsetRef.current = clampedOffset;
          setOffset(clampedOffset);
        }
      }

      if (arrived) {
        finishTravel(arrivalLocation);
        return;
      }

      if (nextJourneyDay !== journeyDayRef.current) {
        journeyDayRef.current = nextJourneyDay;
        setJourneyDay(nextJourneyDay);
      }

      frameRef.current = requestAnimationFrame(step);
    }

    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }

    lastTimeRef.current = null;
    frameRef.current = requestAnimationFrame(step);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      setIsMoving(false);
    };
    // playerRef/mapSize are stable refs/memo; player is only the initial seed,
    // so it stays out of deps to avoid restarting the animation every frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animationSpeed, getTerrainAtPoint, target, targetLocation, targetMemberId]);

  const playerScreen = mapToScreen(player);
  const targetScreen = target ? mapToScreen(target) : null;
  const heroPathScreen = useMemo(
    () => heroPath.map((point) => mapToScreen(point)),
    [heroPath, mapToScreen],
  );
  const journeyDate = getJourneyDate(journeyDay, months);

  const bonusFor = (id: string): StatBonus => statBonusById[id] ?? ZERO_BONUS;
  // Allocated level-up points plus party auras (Bombadil/Elrond/Galadriel).
  const totalBonusFor = (character: Character): StatBonus =>
    addBonus(bonusFor(character.id), auraBonus(character, party));
  const iconFor = (character: { id: string; icon: string }): string =>
    emote && emote.id === character.id ? iconVariant(character.icon, emote.kind) : character.icon;
  const partyCharacters = CHARACTERS.filter((character) => party.includes(character.id));
  const partyLuck = partyCharacters.reduce(
    (best, character) => Math.max(best, effectiveStats(character, totalBonusFor(character)).luck),
    0,
  );
  const anyHurt = partyCharacters.some((character) => (damageById[character.id] ?? 0) > 0);
  const foodCapacity = foodCapacityFor(transport);
  const transportEmoji =
    transport === "ship" ? "⛵" : transport === "horse" ? "🐎" : transport === "pony" ? "🐴" : "🎒";
  // Saruman at Isengard is an ally only if the bearer is duller than him and no
  // Gandalf is along; otherwise he's a boss. Once fought, he can't be recruited.
  const sarumanBossName = BOSSES_BY_LOCATION[ISENGARD_ID].name;
  const sarumanFriendly = (() => {
    if (party.includes("gandalf") || defeatedBosses.has(sarumanBossName)) {
      return false;
    }
    const bearer = CHARACTERS.find((c) => c.id === bearerId);
    const saruman = CHARACTERS.find((c) => c.id === "saruman");
    if (!bearer || !saruman) {
      return false;
    }
    return effectiveStats(bearer, totalBonusFor(bearer)).intelligence < saruman.intelligence;
  })();
  const recruitsHere = visitedLocation
    ? CHARACTERS.filter(
        (character) =>
          isCharacterRecruitableHere(character.id, visitedLocation.id, journeyDay) &&
          (!(character.id in RANDOM_PRESENCE) || randomPresence[character.id]) &&
          (character.id !== "saruman" || sarumanFriendly),
      )
    : [];
  const recruitmentCalendar = useMemo(
    () =>
      buildRecruitmentCalendar(
        locations,
        journeyDay,
        months,
        lang,
        t("calendar.onward"),
        t("calendar.night"),
        t("calendar.always"),
      ),
    [locations, journeyDay, months, lang, t],
  );
  const openCharacter = openCharacterId
    ? (CHARACTERS.find((character) => character.id === openCharacterId) ?? null)
    : null;
  // Corruption clock = days travelled plus extra days bought by wearing the Ring.
  const ringDay = journeyDay + ringWear;
  const openStats = openCharacter
    ? computeCharacterStats(
        openCharacter,
        ringDay,
        bearerId,
        damageById[openCharacter.id] ?? 0,
        totalBonusFor(openCharacter),
      )
    : null;
  const openExp = openCharacter ? (expById[openCharacter.id] ?? 0) : 0;
  const openLevel = levelForExp(openExp);
  const openSpent = openCharacter
    ? bonusFor(openCharacter.id).strength +
      bonusFor(openCharacter.id).defense +
      bonusFor(openCharacter.id).intelligence +
      bonusFor(openCharacter.id).luck
    : 0;
  const openPoints = openLevel.level - 1 - openSpent;
  const ringBearer = CHARACTERS.find((character) => character.id === bearerId);
  const bearerCorruption = ringBearer
    ? computeCharacterStats(
        ringBearer,
        ringDay,
        bearerId,
        damageById[ringBearer.id] ?? 0,
        totalBonusFor(ringBearer),
      ).corruption
    : 0;
  const hasFallen = bearerCorruption >= 100;
  const bearerDead = ringBearer
    ? effectiveStats(ringBearer, totalBonusFor(ringBearer)).strength * HEALTH_PER_STR <=
      (damageById[ringBearer.id] ?? 0)
    : false;

  // Resilience exhausted before reaching Mount Doom: the bearer breaks and the
  // game ends as the Lord (unless an ending was already reached).
  useEffect(() => {
    if (hasFallen) {
      setEnding((prev) => prev ?? "lord");
    }
  }, [hasFallen]);

  // The Ring bearer starved to death — game over.
  useEffect(() => {
    if (bearerDead) {
      setEnding((prev) => prev ?? "starved");
    }
  }, [bearerDead]);

  // A non-bearer who starved out is dropped from the party with a notice.
  useEffect(() => {
    const dead = CHARACTERS.filter(
      (character) =>
        party.includes(character.id) &&
        character.id !== bearerId &&
        effectiveStats(character, addBonus(statBonusById[character.id] ?? ZERO_BONUS, auraBonus(character, party))).strength *
          HEALTH_PER_STR <=
          (damageById[character.id] ?? 0),
    );
    if (dead.length === 0) {
      return;
    }
    const deadIds = new Set(dead.map((character) => character.id));
    setParty((prev) => prev.filter((id) => !deadIds.has(id)));
    setDeathNotice(dead.map((character) => character.name).join(", "));
  }, [damageById, party, bearerId, statBonusById]);

  // Re-check compatibility whenever the party changes: someone who can't abide
  // the new company (e.g. Gollum once a non-hobbit joins) walks off. One per
  // pass — the effect re-runs until the party is stable.
  useEffect(() => {
    const evictee = party.find((id) => {
      if (id === bearerId) {
        return false;
      }
      const character = CHARACTERS.find((c) => c.id === id);
      return character ? recruitRefusalLine(id, party.filter((p) => p !== id)) !== null : false;
    });
    if (!evictee) {
      return;
    }
    const character = CHARACTERS.find((c) => c.id === evictee);
    const line = recruitRefusalLine(evictee, party.filter((p) => p !== evictee));
    setParty((prev) => prev.filter((id) => id !== evictee));
    flashEmote(evictee, "refuse");
    setRecruitRefusal(
      `${character?.name ?? "Спутник"} покидает отряд. ${line ?? ""}`.trim(),
    );
  }, [party, bearerId, flashEmote]);

  // Auto-battle clock: one strike per tick (allies in turn, then the enemy).
  useEffect(() => {
    if (!battle || battle.outcome) {
      return undefined;
    }
    const timer = setTimeout(() => {
      setBattle((b) => {
        if (!b || b.outcome) {
          return b;
        }
        const allies = b.allies.map((a) => ({ ...a }));
        const enemies = b.enemies.map((e) => ({ ...e }));

        if (b.turn === "allies") {
          let i = b.index;
          while (i < allies.length && allies[i].hp <= 0) {
            i += 1;
          }
          if (i >= allies.length) {
            return { ...b, allies, enemies, turn: "enemies", index: 0, lastHit: null, attacker: null };
          }
          const aliveEnemies = enemies.flatMap((e, idx) => (e.hp > 0 ? [idx] : []));
          if (aliveEnemies.length === 0) {
            return { ...b, allies, enemies, outcome: "win" };
          }
          const target = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
          const beastBonus = allies[i].key === "grimbeorn" && b.enemyBeast ? GRIMBEORN_BEAST_BONUS : 0;
          // Only Gandalf or Bombadil can wound the Balrog; others bounce off.
          const dealt =
            b.gandalfOnly && !BALROG_DAMAGERS.has(allies[i].key)
              ? 0
              : hitDamage(allies[i], enemies[target]) + beastBonus;
          enemies[target].hp = Math.max(0, enemies[target].hp - dealt);
          // Recruitable foes and betrayers are subdued at half health, not slain.
          const subdued = (e: Combatant) =>
            b.recruitId || b.betrayalBy ? e.hp <= e.maxHp / 2 : e.hp <= 0;
          return {
            ...b,
            allies,
            enemies,
            index: i + 1,
            outcome: enemies.every(subdued) ? "win" : null,
            lastHit: enemies[target].key,
            attacker: allies[i].key,
            tick: b.tick + 1,
          };
        }

        let j = b.index;
        while (j < enemies.length && enemies[j].hp <= 0) {
          j += 1;
        }
        if (j >= enemies.length) {
          return { ...b, allies, enemies, turn: "allies", index: 0, lastHit: null, attacker: null };
        }
        const aliveAllies = allies.flatMap((a, idx) =>
          a.hp > 0 && !(b.ringOn && !b.ringIneffective && a.key === b.bearerKey) ? [idx] : [],
        );
        if (aliveAllies.length === 0) {
          // Only the invisible bearer remains → enemies whiff; else party wiped.
          if (allies.some((a) => a.hp > 0)) {
            return { ...b, allies, enemies, turn: "allies", index: 0, lastHit: null, attacker: null };
          }
          return { ...b, allies, enemies, outcome: "lose" };
        }
        const target = aliveAllies[Math.floor(Math.random() * aliveAllies.length)];
        allies[target].hp = Math.max(0, allies[target].hp - hitDamage(enemies[j], allies[target]));
        return {
          ...b,
          allies,
          enemies,
          index: j + 1,
          outcome: allies.every((a) => a.hp <= 0) ? "lose" : null,
          lastHit: allies[target].key,
          attacker: enemies[j].key,
          tick: b.tick + 1,
        };
      });
    }, BATTLE_TICK_MS);
    return () => clearTimeout(timer);
  }, [battle]);

  // When a battle resolves: apply taken damage (once) and award XP on a win.
  useEffect(() => {
    if (!battle || !battle.outcome || battleAppliedRef.current) {
      return;
    }
    battleAppliedRef.current = true;

    // Betrayal lost: the traitor beats the bearer, takes the Ring, crowns himself.
    if (battle.outcome === "lose" && battle.betrayalBy) {
      setBearerId(battle.betrayalBy);
      setLordClaimed(false);
      setEnding("lord");
      setBattle(null);
      return;
    }

    const nextDamage = { ...damageRef.current };
    for (const ally of battle.allies) {
      nextDamage[ally.key] = ally.maxHp - ally.hp;
    }
    damageRef.current = nextDamage;
    setDamageById(nextDamage);
    if (battle.outcome === "win") {
      setExpById((prev) => {
        const next = { ...prev };
        for (const ally of battle.allies) {
          next[ally.key] = (next[ally.key] ?? 0) + battle.exp;
        }
        return next;
      });

      // Betrayal repelled: the traitor is driven off and leaves the party.
      if (battle.betrayalBy) {
        const traitorId = battle.betrayalBy;
        const traitor = CHARACTERS.find((c) => c.id === traitorId);
        setParty((prev) => prev.filter((id) => id !== traitorId));
        setRecruitRefusal(
          traitorId === "gollum"
            ? "Голлум шипит и удирает во тьму."
            : `${traitor?.name ?? "Предатель"} опомнился и в стыде покидает отряд.`,
        );
      }
      // A defeated roaming foe: offer to invite them.
      if (battle.recruitId) {
        setRecruitOffer(battle.recruitId);
      }
      // A defeated boss never returns to its lair.
      const foe = battle.enemies[0];
      if (foe && BOSS_NAMES.has(foe.name)) {
        setDefeatedBosses((prev) => new Set(prev).add(foe.name));
      }
    }
  }, [battle]);

  // Roll "is he home?" once per visit for sometimes-present characters.
  useEffect(() => {
    if (!visitedLocation) {
      return;
    }
    const rolled: Record<string, boolean> = {};
    for (const [id, chance] of Object.entries(RANDOM_PRESENCE)) {
      rolled[id] = Math.random() < chance;
    }
    setRandomPresence(rolled);
  }, [visitedLocation]);

  // Simulate each elapsed day: eat (1/day), or with double rations heal +HEAL
  // per member for 2 food while anyone is hurt, or starve (−1 health/day) when
  // out of food. Damage is tracked per current party member.
  useEffect(() => {
    if (journeyDay <= processedDayRef.current) {
      processedDayRef.current = journeyDay;
      return;
    }
    let nextFood = foodRef.current;
    const nextDamage = { ...damageRef.current };
    const members = party;
    const heal = members.includes("gandalf")
      ? Math.round(HEAL_PER_DAY * GANDALF_HEAL_MULTIPLIER)
      : HEAL_PER_DAY;
    let encounterChance = hasCloaks ? ENCOUNTER_CHANCE_PER_DAY / 2 : ENCOUNTER_CHANCE_PER_DAY;
    if (members.includes("aragorn")) {
      encounterChance *= ARAGORN_ENCOUNTER_MULTIPLIER;
    }
    let encountered = false;
    let bombadilLeaves = false;
    for (let day = processedDayRef.current; day < journeyDay; day += 1) {
      const anyHurt = members.some((id) => (nextDamage[id] ?? 0) > 0);
      // Wounded + spare food: auto-spend a 2nd ration to heal each.
      if (anyHurt && nextFood >= 2) {
        nextFood -= 2;
        for (const id of members) {
          nextDamage[id] = Math.max(0, (nextDamage[id] ?? 0) - heal);
        }
      } else if (nextFood >= 1) {
        nextFood -= 1;
      } else {
        for (const id of members) {
          nextDamage[id] = (nextDamage[id] ?? 0) + 1;
        }
      }
      if (Math.random() < encounterChance) {
        encountered = true;
      }
      if (members.includes("bombadil") && Math.random() < BOMBADIL_LEAVE_CHANCE) {
        bombadilLeaves = true;
      }
    }
    processedDayRef.current = journeyDay;
    foodRef.current = nextFood;
    damageRef.current = nextDamage;
    setFood(nextFood);
    setDamageById(nextDamage);
    if (bombadilLeaves) {
      setParty((prev) => prev.filter((id) => id !== "bombadil"));
      setRecruitRefusal("Том Бомбадил соскучился по дому и покидает отряд.");
    }
    if (encountered) {
      const traitors = party.filter((id) => id !== bearerId && TRAITORS.has(id));
      if (traitors.length > 0 && Math.random() < BETRAYAL_CHANCE) {
        setPendingBetrayal(traitors[Math.floor(Math.random() * traitors.length)]);
      } else {
        const position = playerRef.current ?? hobbiton.point;
        setEncounter(rollEncounter(position, party));
      }
    }
  }, [journeyDay, party, hasCloaks, hobbiton, bearerId]);

  // Kick off a betrayal battle once one is queued (with full party context).
  useEffect(() => {
    if (pendingBetrayal) {
      startBetrayal(pendingBetrayal);
      setPendingBetrayal(null);
    }
  }, [pendingBetrayal, startBetrayal]);

  return (
    <section className="fixed inset-0 bg-white p-2 sm:p-[36px]">
      <div
        ref={viewportRef}
        role="application"
        aria-label="Interactive Middle-earth map"
        className="relative h-full w-full cursor-grab touch-none overflow-hidden bg-neutral-900 shadow-[0_0_0_5px_#111111,0_0_0_10px_#ffffff,0_0_0_12px_#111111] active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <img
          alt="Middle-earth map"
          draggable="false"
          src={mapImage}
          className="absolute left-0 top-0 max-w-none select-none"
          style={{
            width: mapSize.width,
            height: mapSize.height,
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
          }}
        />
        <img
          alt="Terrain overlay"
          draggable="false"
          src={terrainImage}
          className="pointer-events-none absolute left-0 top-0 max-w-none select-none [image-rendering:pixelated] mix-blend-multiply"
          style={{
            width: mapSize.width,
            height: mapSize.height,
            opacity: showTerrain && terrainReady ? TERRAIN_OVERLAY_OPACITY : 0,
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
          }}
        />

        {locations.map((location) => {
          const screen = mapToScreen(location.point);
          return (
            <button
              key={location.id}
              type="button"
              title={location.name}
              aria-label={location.name}
              className="absolute z-10 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-red-600 shadow-[0_0_0_2px_rgba(120,0,0,0.35)] transition-transform hover:scale-[1.8] hover:bg-red-500"
              style={{ left: screen.x, top: screen.y }}
              onPointerDown={(event) => event.stopPropagation()}
              onPointerUp={(event) => event.stopPropagation()}
              onClick={(event) => handleMarkerClick(event, location)}
            />
          );
        })}

        {leftBehind.map((member) => {
          const character = CHARACTERS.find((c) => c.id === member.id);
          if (!character) {
            return null;
          }
          const screen = mapToScreen(member.point);
          return (
            <button
              key={member.id}
              type="button"
              title={charName(character.id)}
              aria-label={charName(character.id)}
              className="absolute z-20 size-9 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border-2 border-amber-300 bg-parchment shadow-lg"
              style={{ left: screen.x, top: screen.y }}
              onPointerDown={(event) => event.stopPropagation()}
              onPointerUp={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                walkToMember(member);
              }}
            >
              <img src={character.icon} alt="" className="size-full object-cover" />
            </button>
          );
        })}

        {targetScreen && (
          <div
            className="pointer-events-none absolute z-20 size-4 -translate-x-1/2 -translate-y-1/2"
            style={{ left: targetScreen.x, top: targetScreen.y }}
            aria-hidden="true"
          >
            <span className="absolute inset-0 animate-ping rounded-full bg-green-500/70" />
            <span className="absolute left-1/2 top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-green-500 shadow" />
          </div>
        )}

        {showHeroPath && heroPathScreen.length > 1 && (
          <svg
            className="pointer-events-none absolute inset-0 z-[25] overflow-visible"
            aria-hidden="true"
          >
            <polyline
              points={heroPathScreen.map((point) => `${point.x},${point.y}`).join(" ")}
              fill="none"
              stroke="#c9a227"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.9}
            />
          </svg>
        )}

        <img
          src={ringBearer?.icon ?? PLAYER_ICON}
          alt={ringBearer ? charName(ringBearer.id) : t("character.bearer")}
          title={ringBearer ? charName(ringBearer.id) : t("character.bearer")}
          draggable="false"
          className="pointer-events-none absolute z-30 size-10 -translate-x-1/2 -translate-y-1/2 select-none object-contain drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]"
          style={{ left: playerScreen.x, top: playerScreen.y }}
        />

        <div
          className="absolute right-4 top-4 z-40 flex items-center gap-2"
          onPointerDown={(event) => event.stopPropagation()}
          onPointerUp={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={toggleLang}
            aria-label="Language"
            title="RU / EN"
            className="flex h-9 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900/90 px-3 text-sm font-bold text-neutral-200 transition hover:bg-neutral-800"
          >
            {lang === "en" ? "RU" : "EN"}
          </button>
          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            aria-label={t("ui.help")}
            title={t("ui.help")}
            className="flex size-9 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900/90 text-lg font-bold text-neutral-200 transition hover:bg-neutral-800"
          >
            ?
          </button>
        </div>

        {/* HUD overlay: date + controls + party float above the map, top-left */}
        <div className="pointer-events-none absolute left-0 top-0 z-40 flex flex-col gap-3 p-4 text-neutral-200">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <h1 className="w-fit whitespace-nowrap rounded border border-neutral-700 bg-neutral-900/90 px-2.5 py-2 font-serif text-xl leading-none text-neutral-100 sm:text-2xl">
              {journeyDate}
            </h1>
            <div
              className="pointer-events-auto flex flex-wrap items-center gap-2 text-sm"
              onPointerDown={(event) => event.stopPropagation()}
              onPointerUp={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={centerOnPlayer}
                aria-label={t("ui.center")}
                title={t("ui.center")}
                className="rounded border border-neutral-700 bg-neutral-900/90 p-2 text-neutral-200 transition hover:bg-neutral-800"
              >
                <LocateFixed className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowTerrain((prev) => !prev)}
                aria-label={showTerrain ? t("ui.terrainHide") : t("ui.terrainShow")}
                aria-pressed={showTerrain}
                title={t("ui.terrain")}
                className="rounded border border-neutral-700 bg-neutral-900/90 p-2 text-neutral-200 transition hover:bg-neutral-800"
              >
                {showTerrain ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
              </button>
              <button
                type="button"
                onClick={cycleSpeed}
                aria-label={t("ui.speedValue", { n: animationSpeed })}
                title={t("ui.speed")}
                className="flex items-center gap-1 rounded border border-neutral-700 bg-neutral-900/90 p-2 text-neutral-200 transition hover:bg-neutral-800"
              >
                <Gauge className="size-4" />
                {animationSpeed}×
              </button>
              <button
                type="button"
                onClick={waitOneDay}
                disabled={isMoving}
                aria-label={t("ui.waitAria")}
                title={isMoving ? t("ui.waitBlocked") : t("ui.waitDay")}
                className="flex size-9 items-center justify-center rounded border border-neutral-700 bg-neutral-900/90 text-neutral-200 transition hover:bg-neutral-800 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-neutral-900/90"
              >
                <Hourglass className="size-4" />
              </button>
              <button
                type="button"
                onClick={farmFood}
                disabled={isMoving}
                aria-label={t("ui.farmAria")}
                title={isMoving ? t("ui.farmBlocked") : t("ui.farm")}
                className="flex size-9 items-center justify-center rounded border border-neutral-700 bg-neutral-900/90 text-neutral-200 transition hover:bg-neutral-800 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-neutral-900/90"
              >
                <Wheat className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowHeroPath((prev) => !prev)}
                aria-label={showHeroPath ? t("ui.heroPathHide") : t("ui.heroPathShow")}
                aria-pressed={showHeroPath}
                title={t("ui.heroPath")}
                className="flex size-9 items-center justify-center rounded border border-neutral-700 bg-neutral-900/90 text-neutral-200 transition hover:bg-neutral-800 aria-pressed:border-amber-700/80 aria-pressed:bg-amber-950/40"
              >
                <Route className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setCalendarOpen(true)}
                aria-label={t("ui.calendar")}
                title={t("ui.calendar")}
                className="flex size-9 items-center justify-center rounded border border-neutral-700 bg-neutral-900/90 text-neutral-200 transition hover:bg-neutral-800"
              >
                <CalendarDays className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setSplitOpen(true)}
                aria-label={t("ui.split")}
                title={t("ui.split")}
                className="flex size-9 items-center justify-center rounded border border-neutral-700 bg-neutral-900/90 text-neutral-200 transition hover:bg-neutral-800"
              >
                <Split className="size-4" />
              </button>
            </div>
          </div>

          <div
            className={`flex w-fit items-center gap-2 rounded border px-2 py-1 text-sm ${
              food === 0
                ? "animate-pulse border-red-700 bg-red-950/80 text-red-300"
                : "border-neutral-700 bg-neutral-900/90 text-neutral-200"
            }`}
          >
            <span title={t("ui.foodTitle")}>🍞 {food}</span>
            {food === 0 && (
              <span className="text-xs font-semibold" title={t("ui.hungryTitle")}>
                {t("ui.hungry")}
              </span>
            )}
            {anyHurt && food >= 2 && (
              <span
                className="text-xs font-semibold text-emerald-300"
                title={t("ui.healingTitle")}
              >
                {t("ui.healing")}
              </span>
            )}
            <span
              className="text-base leading-none"
              title={transport ? t(`transport.${transport}`) : t("ui.onFoot")}
            >
              {transportEmoji}
            </span>
            {hasCloaks && (
              <span className="text-base leading-none" title={t("ui.cloaksTitle")}>
                🧥
              </span>
            )}
          </div>

          <div
            className="pointer-events-auto flex w-fit flex-col gap-1"
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPartyOpen((open) => !open)}
              aria-expanded={partyOpen}
              aria-label={t("ui.party")}
              title={t("ui.party")}
              className="flex size-11 items-center justify-center rounded border border-neutral-700 bg-neutral-900/90 text-neutral-200 transition hover:bg-neutral-800 sm:hidden"
            >
              <Users className="size-5" />
            </button>

            <div className={`${partyOpen ? "flex" : "hidden"} flex-col gap-1 sm:flex`}>
                {partyCharacters.map((character) => (
                  <button
                    key={character.id}
                    type="button"
                    onClick={() => setOpenCharacterId(character.id)}
                    title={charName(character.id)}
                    aria-label={t("recruit.statsAria", { name: charName(character.id) })}
                    className="relative size-11 border border-neutral-700 bg-parchment transition hover:brightness-95 sm:size-14"
                  >
                    <img
                      src={iconFor(character)}
                      alt=""
                      draggable="false"
                      className="size-full select-none object-cover"
                    />
                    {character.id === bearerId && (
                      <span
                        className="pointer-events-none absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full border border-amber-700 bg-neutral-900"
                        title="Хранитель Кольца"
                      >
                        <img
                          src={ringImage}
                          alt=""
                          draggable="false"
                          className="size-3.5 select-none object-contain"
                        />
                      </span>
                    )}
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-black/50">
                      <span
                        className="block h-full bg-green-500"
                        style={{
                          width: `${Math.max(0, 1 - (damageById[character.id] ?? 0) / (effectiveStats(character, totalBonusFor(character)).strength * HEALTH_PER_STR)) * 100}%`,
                        }}
                      />
                    </span>
                  </button>
                ))}
            </div>
          </div>
        </div>

        {visitedLocation && visitedLocation.id !== ORODRUIN_ID && (
          <div
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="location-title"
              className="w-full max-w-72 rounded border border-neutral-700 bg-neutral-900 p-5 text-center shadow-2xl"
            >
              <h2 id="location-title" className="font-serif text-2xl text-neutral-100">
                {locName(visitedLocation)}
              </h2>

              {BOSSES_BY_LOCATION[visitedLocation.id] &&
                !defeatedBosses.has(BOSSES_BY_LOCATION[visitedLocation.id].name) &&
                (visitedLocation.id !== ISENGARD_ID || !sarumanFriendly) && (
                <button
                  type="button"
                  onClick={() =>
                    setEncounter({
                      monster: BOSSES_BY_LOCATION[visitedLocation.id],
                      dangerous: true,
                      solo: true,
                    })
                  }
                  className="mt-4 w-full rounded border border-red-800 bg-red-900/40 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-900/70"
                >
                  ⚔️ Вступить в бой: {BOSSES_BY_LOCATION[visitedLocation.id].name}
                </button>
              )}

              {recruitsHere.length > 0 && (
                <ul className="mt-4 space-y-2 text-left">
                  {recruitsHere.map((character) => {
                    const inParty = party.includes(character.id);
                    const requiredLuck = RECRUIT_MIN_LUCK[character.id] ?? 0;
                    const needLuck = !inParty && partyLuck < requiredLuck;
                    return (
                      <li key={character.id} className="flex items-center gap-3">
                        <img
                          src={iconFor(character)}
                          alt=""
                          className="size-12 border border-neutral-700 bg-parchment object-cover"
                        />
                        <span className="flex-1 text-sm text-neutral-200">{charName(character.id)}</span>
                        <button
                          type="button"
                          disabled={inParty || needLuck}
                          title={needLuck ? `Нужна удача отряда ${requiredLuck}+` : undefined}
                          onClick={() => attemptRecruit(character)}
                          className="rounded border border-neutral-700 bg-neutral-800 px-3 py-1 text-xs font-semibold text-neutral-100 transition hover:bg-neutral-700 disabled:cursor-default disabled:opacity-50 disabled:hover:bg-neutral-800"
                        >
                          {inParty ? "В отряде" : needLuck ? `Удача ${requiredLuck}+` : "Позвать"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {FOOD_SUPPLY_LOCATION_IDS.has(visitedLocation.id) && (
                <button
                  type="button"
                  disabled={food >= foodCapacity}
                  onClick={() => {
                    setFood(foodCapacity);
                    foodRef.current = foodCapacity;
                  }}
                  className="mt-4 w-full rounded border border-amber-800 bg-amber-900/30 px-4 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-900/60 disabled:cursor-default disabled:opacity-50 disabled:hover:bg-amber-900/30"
                >
                  {food >= foodCapacity
                    ? `🍞 Запасы полны (${foodCapacity} дн.)`
                    : `🍞 Взять запасы на ${foodCapacity} дн.`}
                </button>
              )}

              {visitedLocation.id === LOTHLORIEN_ID && (
                <button
                  type="button"
                  disabled={hasCloaks}
                  onClick={() => setHasCloaks(true)}
                  className="mt-4 w-full rounded border border-emerald-800 bg-emerald-900/30 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-900/60 disabled:cursor-default disabled:opacity-50 disabled:hover:bg-emerald-900/30"
                >
                  {hasCloaks ? "🧥 Плащи получены" : "🧥 Взять эльфийские плащи"}
                </button>
              )}

              {(() => {
                const offered = TRANSPORT_BY_LOCATION[visitedLocation.id];
                if (!offered || (offered === "ship" && party.includes("cirdan"))) {
                  return null;
                }
                const active = transport === offered;
                return (
                  <button
                    type="button"
                    disabled={active}
                    onClick={() => setTransport(offered)}
                    className="mt-4 w-full rounded border border-emerald-800 bg-emerald-900/30 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-900/60 disabled:cursor-default disabled:opacity-50 disabled:hover:bg-emerald-900/30"
                  >
                    {active ? `${TRANSPORTS[offered].name}: уже с вами` : TRANSPORTS[offered].action}
                  </button>
                );
              })()}

              <button
                type="button"
                className="mt-5 rounded border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700"
                onClick={() => {
                  setVisitedLocation(null);
                  setTargetLocation(null);
                }}
              >
                Покинуть место
              </button>
            </div>
          </div>
        )}

        {calendarOpen && (
          <div
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="recruitment-calendar-title"
              className="flex max-h-[80vh] w-full max-w-md flex-col rounded border border-neutral-700 bg-neutral-900 shadow-2xl"
            >
              <div className="border-b border-neutral-800 px-5 py-4">
                <h2 id="recruitment-calendar-title" className="font-serif text-xl text-neutral-100">
                  Календарь найма
                </h2>
                <p className="mt-1 text-xs text-neutral-500">
                  Сегодня: {journeyDate}. Без расписания — доступен всегда.
                </p>
              </div>

              <ul className="overflow-y-auto px-5 py-3">
                {recruitmentCalendar.map((entry) => (
                  <li
                    key={`${entry.character.id}-${entry.locationLabel}-${entry.fromDay}-${entry.periodLabel}`}
                    className={`flex items-center gap-3 border-b border-neutral-800 py-3 last:border-b-0 ${
                      entry.isActive ? "text-neutral-100" : "text-neutral-400"
                    }`}
                  >
                    <img
                      src={entry.character.icon}
                      alt=""
                      className="size-9 shrink-0 rounded-full border-2 border-[#4a2a13] bg-parchment object-cover"
                    />
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="font-medium">{charName(entry.character.id)}</p>
                      <p className="truncate text-xs text-neutral-500">{entry.locationLabel}</p>
                    </div>
                    <div className="shrink-0 text-right text-xs">
                      <p>{entry.periodLabel}</p>
                      {entry.isActive && <p className="text-emerald-500">сейчас</p>}
                    </div>
                  </li>
                ))}
              </ul>

              <div className="border-t border-neutral-800 px-5 py-4">
                <button
                  type="button"
                  className="w-full rounded border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700"
                  onClick={() => setCalendarOpen(false)}
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        )}

        {splitOpen && (
          <div
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
          >
            <div
              role="dialog"
              aria-modal="true"
              className="flex max-h-[80vh] w-full max-w-sm flex-col rounded border border-neutral-700 bg-neutral-900 shadow-2xl"
            >
              <div className="border-b border-neutral-800 px-5 py-4">
                <h2 className="font-serif text-xl text-neutral-100">Разделиться</h2>
                <p className="mt-1 text-xs text-neutral-500">
                  Оставить спутника здесь (потом подойти и позвать) или выгнать совсем.
                </p>
              </div>
              <ul className="overflow-y-auto px-5 py-3">
                {partyCharacters
                  .filter((character) => character.id !== bearerId)
                  .map((character) => (
                    <li
                      key={character.id}
                      className="flex items-center gap-3 border-b border-neutral-800 py-2 last:border-b-0"
                    >
                      <img
                        src={character.icon}
                        alt=""
                        className="size-10 border border-neutral-700 bg-parchment object-cover"
                      />
                      <span className="flex-1 text-sm text-neutral-200">{charName(character.id)}</span>
                      <button
                        type="button"
                        onClick={() => leaveMember(character.id)}
                        className="rounded border border-amber-700 bg-amber-900/30 px-2 py-1 text-xs font-semibold text-amber-200 transition hover:bg-amber-900/60"
                      >
                        Оставить
                      </button>
                      <button
                        type="button"
                        onClick={() => dismissMember(character.id)}
                        className="rounded border border-red-800 bg-red-900/30 px-2 py-1 text-xs font-semibold text-red-200 transition hover:bg-red-900/60"
                      >
                        Выгнать
                      </button>
                    </li>
                  ))}
                {partyCharacters.filter((character) => character.id !== bearerId).length === 0 && (
                  <li className="py-3 text-center text-sm text-neutral-500">
                    Кроме хранителя в отряде никого нет.
                  </li>
                )}
              </ul>
              <div className="border-t border-neutral-800 px-5 py-4">
                <button
                  type="button"
                  className="w-full rounded border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700"
                  onClick={() => setSplitOpen(false)}
                >
                  Готово
                </button>
              </div>
            </div>
          </div>
        )}

        {openCharacter && openStats && (
          <div
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
          >
            <div
              role="dialog"
              aria-modal="true"
              className="w-full max-w-xs rounded border border-neutral-700 bg-neutral-900 p-5 shadow-2xl"
            >
              <div className="mb-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => showAdjacentCharacter(-1)}
                  aria-label={t("character.prev")}
                  className="rounded p-1 text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-100"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <img
                  src={iconFor(openCharacter)}
                  alt=""
                  className="size-14 border border-neutral-700 bg-parchment object-cover"
                />
                <div className="flex-1">
                  <h2 className="font-serif text-2xl text-neutral-100">{charName(openCharacter.id)}</h2>
                  {openStats.isBearer && (
                    <p className="flex items-center gap-1 text-xs text-amber-400">
                      <img
                        src={ringImage}
                        alt=""
                        draggable="false"
                        className="size-3.5 select-none object-contain"
                      />
                      {t("character.bearer")}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => showAdjacentCharacter(1)}
                  aria-label={t("character.next")}
                  className="rounded p-1 text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-100"
                >
                  <ChevronRight className="size-5" />
                </button>
              </div>

              {openStats.dead && (
                <p className="mb-3 text-center text-sm font-semibold text-red-400">
                  {t("character.deadHunger")}
                </p>
              )}

              <div className="mb-4 rounded border border-neutral-800 bg-neutral-950/60 p-3">
                <div className="mb-1 flex justify-between text-xs text-neutral-400">
                  <span>{t("character.level", { n: openLevel.level })}</span>
                  <span className="text-neutral-200">
                    {t("character.xp", { into: openLevel.intoLevel, next: openLevel.nextLevelXp })}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded bg-neutral-800">
                  <div
                    className="h-full bg-amber-400"
                    style={{ width: `${(openLevel.intoLevel / openLevel.nextLevelXp) * 100}%` }}
                  />
                </div>
                {openCharacter && openPoints > 0 && (
                  <div className="mt-3">
                    <p className="mb-1 text-xs text-amber-300">
                      {t("character.points", { n: openPoints })}
                    </p>
                    <div className="grid grid-cols-2 gap-1">
                      {(["strength", "defense", "intelligence", "luck"] as (keyof StatBonus)[]).map(
                        (stat) => (
                          <button
                            key={stat}
                            type="button"
                            onClick={() => spendStatPoint(openCharacter.id, stat)}
                            className="rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs font-semibold text-neutral-100 transition hover:bg-neutral-700"
                          >
                            +{t(`character.${stat}`)}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="mb-5 flex justify-center gap-4">
                <VerticalStat
                  icon={<Heart className="size-4" />}
                  label="Здоровье"
                  value={openStats.health}
                  max={openStats.maxHealth}
                  color="bg-emerald-500"
                />
                {(openStats.isBearer || openStats.corruption > 0) && (
                  <VerticalStat
                    icon={<Flame className="size-4" />}
                    label="Власть Кольца"
                    value={openStats.corruption}
                    max={100}
                    unit="%"
                    color="bg-yellow-600"
                  />
                )}
              </div>

              <div className="space-y-2">
                <StatBar label="Сила" value={openStats.strength} max={10} color="bg-red-500" />
                <StatBar label="Защита" value={openStats.defense} max={10} color="bg-sky-500" />
                <StatBar
                  label="Интеллект"
                  value={openStats.intelligence}
                  max={10}
                  color="bg-violet-500"
                />
                <StatBar label="Удача" value={openStats.luck} max={10} color="bg-lime-500" />
              </div>

              {ABILITIES[openCharacter.id] && (
                <div className="mt-3 rounded border border-amber-800/60 bg-amber-950/30 px-3 py-2 text-left">
                  <p className="text-[10px] uppercase tracking-wide text-amber-500/80">Способность</p>
                  <p className="text-sm text-amber-200">{ABILITIES[openCharacter.id]}</p>
                </div>
              )}

              <div className="mt-5 flex flex-col gap-2">
                {openStats.isBearer && (
                  <button
                    type="button"
                    className="w-full rounded border border-amber-700 bg-amber-900/40 px-4 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-900/70"
                    onClick={claimLordship}
                  >
                    Стать властелином
                  </button>
                )}
                {!openStats.isBearer && !openStats.dead && !NON_BEARERS.has(openCharacter.id) && (
                  <button
                    type="button"
                    className="flex w-full items-center justify-center gap-2 rounded border border-amber-700 bg-amber-900/40 px-4 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-900/70"
                    onClick={() => setBearerId(openCharacter.id)}
                  >
                    <img
                      src={ringImage}
                      alt=""
                      draggable="false"
                      className="size-4 select-none object-contain"
                    />
                    Сделать хранителем
                  </button>
                )}
                <button
                  type="button"
                  className="w-full rounded border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700"
                  onClick={() => setOpenCharacterId(null)}
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        )}

        {visitedLocation?.id === ORODRUIN_ID && !ending && (
          <div
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
          >
            <div
              role="dialog"
              aria-modal="true"
              className="w-full max-w-sm rounded border border-amber-700 bg-neutral-900 p-6 text-center shadow-2xl"
            >
              <h2 className="font-serif text-2xl text-neutral-100">Ородруин</h2>
              <p className="mt-3 text-sm text-neutral-300">
                Ты на краю Роковой горы. Кольцо жжёт ладонь. Решайся.
              </p>
              <div className="mt-5 flex flex-col gap-2">
                <button
                  type="button"
                  className="rounded border border-emerald-700 bg-emerald-900/40 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-900/70"
                  onClick={() => setEnding("victory")}
                >
                  Уничтожить Кольцо
                </button>
                <button
                  type="button"
                  className="rounded border border-amber-700 bg-amber-900/40 px-4 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-900/70"
                  onClick={() => {
                    setLordClaimed(true);
                    setEnding("lord");
                  }}
                >
                  Объявить себя Властелином
                </button>
              </div>
            </div>
          </div>
        )}

        {foodFarmed !== null && !ending && (
          <div
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
          >
            <div
              role="dialog"
              aria-modal="true"
              className="w-full max-w-xs rounded border border-amber-800 bg-neutral-900 p-6 text-center shadow-2xl"
            >
              <div className="text-4xl">🍞</div>
              <h2 className="mt-2 font-serif text-xl text-amber-200">
                {foodFarmed > 0 ? `Вы добыли еды: ${foodFarmed} дн.` : "Запасы уже полны"}
              </h2>
              <button
                type="button"
                className="mt-5 rounded border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700"
                onClick={() => setFoodFarmed(null)}
              >
                Хорошо
              </button>
            </div>
          </div>
        )}

        {battle && (
          <div
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
          >
            <div
              role="dialog"
              aria-modal="true"
              className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded border border-red-800 bg-neutral-900 p-5 shadow-2xl"
            >
              <h2 className="mb-4 text-center font-serif text-xl text-red-300">
                {battle.betrayalBy ? "Предательство!" : "Бой"}
              </h2>
              <div className="flex items-start justify-center gap-3">
                <div className="flex max-w-[46%] flex-wrap content-start justify-center gap-2">
                  {battle.allies.map((ally) => {
                    const invisible = battle.ringOn && ally.key === battle.bearerKey;
                    return (
                      <div key={ally.key} className="flex w-20 flex-col items-center gap-1">
                        <div
                          className={`relative size-20 overflow-hidden border bg-parchment ${
                            battle.attacker === ally.key
                              ? "border-amber-400 ring-2 ring-amber-400"
                              : "border-neutral-700"
                          }`}
                        >
                          <img
                            src={
                              battle.lastHit === ally.key && ally.icon
                                ? iconVariant(ally.icon, "pain")
                                : (ally.icon ?? "")
                            }
                            alt=""
                            className={`size-full object-cover ${
                              ally.hp <= 0 ? "opacity-30 grayscale" : invisible ? "opacity-40" : ""
                            }`}
                          />
                          {invisible && (
                            <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                              <img src={ringImage} alt="" className="size-7 object-contain" />
                            </span>
                          )}
                          {battle.lastHit === ally.key && (
                            <span
                              key={battle.tick}
                              className="pointer-events-none absolute inset-0 flex items-center justify-center"
                            >
                              <span className="hit-sweep block h-2 w-[140%] bg-white/70" />
                            </span>
                          )}
                          <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1.5 bg-black/50">
                            <span
                              className="block h-full bg-green-500"
                              style={{ width: `${(ally.hp / ally.maxHp) * 100}%` }}
                            />
                          </span>
                        </div>
                        <span className="w-full truncate text-center text-[10px] leading-tight text-neutral-300">
                          {charName(ally.key)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="self-center text-2xl text-neutral-500">⚔️</div>

                <div className="flex max-w-[46%] flex-wrap content-start justify-center gap-2">
                  {battle.enemies.map((enemy) => (
                    <div key={enemy.key} className="flex w-20 flex-col items-center gap-1">
                      <div
                        className={`relative flex size-20 items-center justify-center overflow-hidden border bg-parchment text-4xl ${
                          battle.attacker === enemy.key
                            ? "border-amber-400 ring-2 ring-amber-400"
                            : "border-neutral-700"
                        }`}
                      >
                        {enemy.icon ? (
                          <img
                            src={
                              battle.lastHit === enemy.key
                                ? iconVariant(enemy.icon, "pain")
                                : enemy.icon
                            }
                            alt=""
                            className={`size-full object-cover ${enemy.hp <= 0 ? "opacity-30 grayscale" : ""}`}
                          />
                        ) : (
                          <span className={enemy.hp <= 0 ? "opacity-30" : ""}>👹</span>
                        )}
                        {battle.lastHit === enemy.key && (
                          <span
                            key={battle.tick}
                            className="pointer-events-none absolute inset-0 flex items-center justify-center"
                          >
                            <span className="hit-sweep block h-2 w-[140%] bg-white/70" />
                          </span>
                        )}
                        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1.5 bg-black/50">
                          <span
                            className="block h-full bg-red-500"
                            style={{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }}
                          />
                        </span>
                      </div>
                      <span className="w-full truncate text-center text-[10px] leading-tight text-neutral-300">
                        {enemy.icon ? monsterName(enemy.icon) : enemy.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {battle.outcome ? (
                <div className="mt-5 text-center">
                  <p
                    className={`font-serif text-xl ${
                      battle.outcome === "win" ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {battle.outcome === "win" ? `Победа! +${battle.exp} опыта` : "Поражение"}
                  </p>
                  <button
                    type="button"
                    className="mt-3 rounded border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700"
                    onClick={() => setBattle(null)}
                  >
                    Продолжить
                  </button>
                </div>
              ) : (
                <div className="mt-5 flex flex-col gap-2">
                  {battle.ringIneffective && (
                    <p className="text-center text-xs text-amber-400">
                      Эти враги видят сквозь Кольцо — невидимость не спасёт.
                    </p>
                  )}
                  {battle.gandalfOnly && !battle.allies.some((a) => BALROG_DAMAGERS.has(a.key)) && (
                    <p className="text-center text-xs text-amber-400">
                      Балрога ранят лишь Гэндальф, Бомбадил или Саруман — без них лучше бежать.
                    </p>
                  )}
                  {battle.betrayalBy && (
                    <p className="text-center text-xs text-amber-400">
                      Бежать некуда — сражайся за Кольцо.
                    </p>
                  )}
                  {!battle.betrayalBy &&
                    battle.bearerKey &&
                    battle.allies.some((a) => a.key === battle.bearerKey && a.hp > 0) && (
                      <button
                        type="button"
                        onClick={battle.ringOn ? takeOffRing : putOnRing}
                        className="flex items-center justify-center gap-2 rounded border border-amber-700 bg-amber-900/40 px-4 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-900/70"
                        title="Носитель невидим и неуязвим, но +1 день разложения"
                      >
                        <img src={ringImage} alt="" className="size-4 object-contain" />
                        {battle.ringOn ? "Снять Кольцо" : "Надеть Кольцо"}
                      </button>
                    )}
                  {!battle.betrayalBy && (
                  <button
                    type="button"
                    onClick={fleeBattle}
                    className="rounded border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700"
                  >
                    Сбежать
                  </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {encounter && (
          <div
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
          >
            <div
              role="dialog"
              aria-modal="true"
              className="w-full max-w-xs rounded border border-red-800 bg-neutral-900 p-6 text-center shadow-2xl"
            >
              <div className="text-4xl">⚔️</div>
              <h2 className="mt-2 font-serif text-2xl text-red-300">Вы встретили врага</h2>
              <p className="mt-1 text-base text-neutral-100">{monsterName(encounter.monster.icon)}</p>
              <p className="mt-1 text-xs text-neutral-400">
                Сила {encounter.monster.strength} · Защита {encounter.monster.defense}
              </p>
              {encounter.dangerous && (
                <p className="mt-2 text-sm font-semibold text-amber-400">
                  ⚠ Силён — лучше сбежать и вернуться позже
                </p>
              )}
              <div className="mt-5 flex flex-col gap-2">
                <button
                  type="button"
                  className="w-full rounded border border-red-800 bg-red-900/40 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-900/70"
                  onClick={startBattle}
                >
                  Принять бой
                </button>
                <button
                  type="button"
                  className="w-full rounded border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700"
                  onClick={() => setEncounter(null)}
                >
                  Сбежать
                </button>
              </div>
            </div>
          </div>
        )}

        {recruitOffer &&
          !battle &&
          (() => {
            const offered = CHARACTERS.find((c) => c.id === recruitOffer);
            if (!offered) {
              return null;
            }
            return (
              <div
                className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
                onPointerDown={(event) => event.stopPropagation()}
                onPointerUp={(event) => event.stopPropagation()}
              >
                <div
                  role="dialog"
                  aria-modal="true"
                  className="w-full max-w-xs rounded border border-neutral-700 bg-neutral-900 p-6 text-center shadow-2xl"
                >
                  <img
                    src={offered.icon}
                    alt=""
                    className="mx-auto size-16 border border-neutral-700 bg-parchment object-cover"
                  />
                  <h2 className="mt-3 font-serif text-xl text-neutral-100">
                    {offered.name} {leftBehind.some((m) => m.id === offered.id) ? "ждёт" : "повержен"}
                  </h2>
                  <p className="mt-1 text-sm text-neutral-300">Позвать его в отряд?</p>
                  <div className="mt-5 flex flex-col gap-2">
                    <button
                      type="button"
                      className="rounded border border-emerald-700 bg-emerald-900/40 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-900/70"
                      onClick={acceptRecruitOffer}
                    >
                      Позвать
                    </button>
                    <button
                      type="button"
                      className="rounded border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700"
                      onClick={() => setRecruitOffer(null)}
                    >
                      Не звать
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

        {recruitRefusal && (
          <div
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
          >
            <div
              role="dialog"
              aria-modal="true"
              className="w-full max-w-xs rounded border border-neutral-700 bg-neutral-900 p-6 text-center shadow-2xl"
            >
              <p className="text-sm text-neutral-200">{recruitRefusal}</p>
              <button
                type="button"
                className="mt-5 rounded border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700"
                onClick={() => setRecruitRefusal(null)}
              >
                Ладно
              </button>
            </div>
          </div>
        )}

        {deathNotice && !ending && (
          <div
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
          >
            <div
              role="dialog"
              aria-modal="true"
              className="w-full max-w-sm rounded border border-red-800 bg-neutral-900 p-6 text-center shadow-2xl"
            >
              <h2 className="font-serif text-2xl text-red-400">💀 {deathNotice}</h2>
              <p className="mt-3 text-sm text-neutral-300">
                Запасы кончились, и {deathNotice} не пережил голод в пути. Отряд продолжает путь без
                него.
              </p>
              <button
                type="button"
                className="mt-5 rounded border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700"
                onClick={() => setDeathNotice(null)}
              >
                Идти дальше
              </button>
            </div>
          </div>
        )}

        {helpOpen && (
          <div
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
          >
            <div
              role="dialog"
              aria-modal="true"
              className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded border border-neutral-700 bg-neutral-900 p-6 shadow-2xl"
            >
              <h2 className="font-serif text-2xl text-neutral-100">Как играть</h2>
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-neutral-300">
                <p>
                  Ты ведёшь хранителя Кольца через Средиземье к Роковой горе. Кликай по карте, чтобы
                  идти; красные точки — места: там можно вербовать спутников, пополнять припасы,
                  брать транспорт. Карту можно таскать и масштабировать колесом.
                </p>
                <p>
                  Время идёт по дням. Еда тратится по 1 в день — бери запасы в городах или добывай в
                  пути; без еды отряд голодает и теряет здоровье, при нуле спутник гибнет. В дороге
                  случаются бои: «Принять бой» — авто-схватка, «Сбежать» — уйти и вернуться позже.
                  Власть Кольца у носителя растёт со временем; если дойдёт до 100% — он сорвётся и
                  объявит себя Властелином (конец игры).
                </p>
                <p>
                  У каждого героя есть статы, уровень (растёт от побед — даёт +1 к стату на выбор) и
                  своя способность. Состав отряда важен: некоторые вместе не уживаются (эльфы и гном
                  и т.п.). Дойди до Ородруина и выбери: уничтожить Кольцо (победа) или присвоить его
                  (тьма).
                </p>
              </div>
              <button
                type="button"
                className="mt-5 w-full rounded border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700"
                onClick={() => setHelpOpen(false)}
              >
                Понятно
              </button>
            </div>
          </div>
        )}

        {ending && (
          <div
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 p-6"
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
          >
            <div
              role="dialog"
              aria-modal="true"
              className={`w-full max-w-sm rounded border bg-neutral-900 p-6 text-center shadow-2xl ${
                ending === "victory"
                  ? "border-emerald-700"
                  : ending === "starved"
                    ? "border-red-800"
                    : "border-amber-700"
              }`}
            >
              {ending === "starved" ? (
                <>
                  <h2 className="font-serif text-2xl text-red-400">Хранитель погиб</h2>
                  <p className="mt-3 text-sm text-neutral-300">
                    Запасы вышли, и {ringBearer?.name ?? "хранитель"} не пережил голод. Поход
                    окончен.
                  </p>
                </>
              ) : ending === "victory" ? (
                <>
                  <h2 className="font-serif text-2xl text-emerald-400">Кольцо уничтожено</h2>
                  <p className="mt-3 text-sm text-neutral-300">
                    Роковая гора поглотила Кольцо. Саурон повержен, Средиземье спасено.
                  </p>
                </>
              ) : lordClaimed ? (
                <>
                  {ringBearer && (
                    <img
                      src={iconVariant(ringBearer.icon, "dark")}
                      alt=""
                      className="mx-auto mb-3 size-24 border border-amber-800 object-cover"
                    />
                  )}
                  <h2 className="font-serif text-2xl text-amber-400">Вы стали Властелином</h2>
                  <p className="mt-3 text-sm text-neutral-300">
                    Кольцо взяло верх. {ringBearer?.name ?? "Хранитель"} принял власть. Игра
                    окончена.
                  </p>
                </>
              ) : (
                <>
                  {ringBearer && (
                    <img
                      src={iconVariant(ringBearer.icon, "dark")}
                      alt=""
                      className="mx-auto mb-3 size-24 border border-amber-800 object-cover"
                    />
                  )}
                  <h2 className="font-serif text-2xl text-amber-400">
                    {ringBearer?.name ?? "Хранитель"} надел Кольцо
                  </h2>
                  <p className="mt-3 text-sm text-neutral-300">
                    Тьма поглотила хранителя. {ringBearer?.name ?? "Он"} объявляет себя новым
                    Властелином. Игра окончена.
                  </p>
                </>
              )}
              <button
                type="button"
                className="mt-5 rounded border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700"
                onClick={() => window.location.reload()}
              >
                Сыграть заново
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
