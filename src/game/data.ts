// Static game data: characters, monsters, bosses, abilities, transports, and the
// recruitment schedule parsed from JSON. Imports constants/types/calendar only.
import locationDataJson from "@/data/locations.json";
import recruitmentDataJson from "@/data/recruitment.json";
import heroProgressDataJson from "@/data/hero-progress.json";
import { isoDateToDayOffset } from "@/game/calendar";
import {
  CIRITH_UNGOL_ID,
  CORSAIRS_CITY_ID,
  DOL_GULDUR_ID,
  ISENGARD_ID,
  MINAS_MORGUL_ID,
  MORIA_GATE_ID,
  RECRUITMENT_PLACE_IDS,
  WEATHERTOP_ID,
} from "@/game/constants";
import type {
  Character,
  HeroInitialProgress,
  Item,
  LocationData,
  Monster,
  RawRecruitmentEntry,
  RecruitmentWindow,
  Transport,
  TransportId,
} from "@/game/types";

export const locationData = locationDataJson as unknown as LocationData;

// Base stats are flavor estimates; resilience is from the "дни до срыва" table.
export const CHARACTERS: Character[] = [
  { id: "frodo", name: "Фродо", icon: "/icons/frodo.png", strength: 4, defense: 4, intelligence: 4, luck: 4, resilience: 180 },
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
  { id: "denethor", name: "Денетор", icon: "/icons/denethor.png", strength: 6, defense: 6, intelligence: 8, luck: 4, resilience: 25 },
  { id: "grima", name: "Грима Гнилоуст", icon: "/icons/grima.png", strength: 5, defense: 2, intelligence: 7, luck: 2, resilience: 10 },
  { id: "gollum", name: "Голлум", icon: "/icons/gollum.png", strength: 4, defense: 3, intelligence: 5, luck: 9, resilience: 20, ringExposure: 0.6 },
  { id: "king_dead", name: "Король Мёртвых", icon: "/icons/wight.png", strength: 8, defense: 8, intelligence: 6, luck: 4, resilience: 999 },
  { id: "treebeard", name: "Древобород", icon: "/icons/treebeard.png", strength: 12, defense: 5, intelligence: 12, luck: 3, resilience: 999 },
];

export const PLAYER_ICON = CHARACTERS[0].icon;

// Iconic foes from the gazetteer, spread across tiers. `regions` pins each to
// its homeland; undefined = roams widely.
export const MONSTERS: Monster[] = [
  // Equal-terms combat (attack = strength). Difficulty is a steep gradient by
  // tier: early foes a small hobbit party can handle, far foes that wall an
  // unleveled party and need a leveled 5-7 to clear. Luck is mostly low, so
  // foes seldom crit.
  { name: "Лис", icon: "/enemies/fox.png", tier: 0, strength: 3, defense: 1, intelligence: 1, luck: 2, regions: ["NW", "NE", "MW"] },
  { name: "Крыса-переросток", icon: "/enemies/rat.png", tier: 0, strength: 3, defense: 1, intelligence: 1, luck: 2 },
  { name: "Волк", icon: "/enemies/wolf.png", tier: 1, strength: 4, defense: 2, intelligence: 2, luck: 3, regions: ["NW", "NE", "MW"] },
  { name: "Бандит", icon: "/enemies/bandit.png", tier: 1, strength: 4, defense: 3, intelligence: 3, luck: 3 },
  { name: "Гигантский паук", icon: "/enemies/spider.png", tier: 1, strength: 4, defense: 3, intelligence: 2, luck: 3, regions: ["NW", "NE"] },
  { name: "Умертвие", icon: "/enemies/wight.png", tier: 1, strength: 6, defense: 5, intelligence: 6, luck: 2, regions: ["NW"] },
  // From tier 2 up, defense is raised to match strength so the 5×str+5×def pool
  // keeps these foes as tough as before (the party's blows already hit the 34%
  // floor against this much guard, so it adds HP, not extra mitigation). Tier 0-1
  // fodder keeps its low guard — a touch frailer now, which suits cannon fodder.
  { name: "Гоблин", icon: "/enemies/goblin.png", tier: 2, strength: 8, defense: 8, intelligence: 3, luck: 3, regions: ["NW", "MW", "ME"] },
  { name: "Орк-разведчик", icon: "/enemies/orc_scout.png", tier: 2, strength: 8, defense: 8, intelligence: 3, luck: 3 },
  { name: "Горный тролль", icon: "/enemies/troll.png", tier: 2, strength: 11, defense: 11, intelligence: 2, luck: 2, regions: ["NW", "NE", "MW"] },
  { name: "Орк", icon: "/enemies/orc.png", tier: 3, strength: 9, defense: 9, intelligence: 3, luck: 3 },
  { name: "Варг", icon: "/enemies/varg.png", tier: 3, strength: 9, defense: 9, intelligence: 3, luck: 4, regions: ["NW", "MW"] },
  { name: "Урук-хай", icon: "/enemies/urukhai.png", tier: 3, strength: 10, defense: 10, intelligence: 4, luck: 3, regions: ["MW", "ME"] },
  { name: "Харадрим", icon: "/enemies/kharadrim.png", tier: 4, strength: 11, defense: 11, intelligence: 4, luck: 4, regions: ["SW", "SE"] },
  { name: "Мумак", icon: "/enemies/mumak.png", tier: 4, strength: 13, defense: 13, intelligence: 1, luck: 3, regions: ["SW", "SE"] },
  { name: "Тролль Горгорота", icon: "/enemies/troll_gorgoroth.png", tier: 5, strength: 14, defense: 14, intelligence: 3, luck: 3, regions: ["ME"] },
];

// Named bosses fixed to their lairs — engageable when you reach the location.
export const BOSSES_BY_LOCATION: Record<number, Monster> = {
  // Weathertop fields a riding of five wraiths rather than one terror: each is
  // far weaker (and, like all Nazgûl, recoils at half health), so four near-fresh
  // hobbits with Aragorn can stand them off — see the WEATHERTOP pack below.
  // Bosses keep defense matched to strength so their HP holds under 5×str+5×def
  // (the old 10×strength), and their guard already floors the party's hits.
  [WEATHERTOP_ID]: { name: "Назгул", icon: "/enemies/nazgul.png", tier: 2, strength: 8, defense: 8, intelligence: 6, luck: 5 },
  [MORIA_GATE_ID]: { name: "Балрог", icon: "/enemies/balrog.png", tier: 5, strength: 32, defense: 32, intelligence: 8, luck: 6 },
  [ISENGARD_ID]: { name: "Саруман", icon: "/icons/saruman.png", tier: 4, strength: 15, defense: 15, intelligence: 9, luck: 5 },
  // Barad-dûr has no boss to fight — reaching it is simply the end (see the
  // "sauron" ending). The /enemies/baraddur.png art is kept for possible reuse.
  [CIRITH_UNGOL_ID]: { name: "Шелоб", icon: "/enemies/shelob.png", tier: 5, strength: 20, defense: 20, intelligence: 5, luck: 5 },
  [MINAS_MORGUL_ID]: { name: "Король-чародей", icon: "/enemies/witchking.png", tier: 5, strength: 20, defense: 20, intelligence: 9, luck: 6 },
  [CORSAIRS_CITY_ID]: { name: "Корсар", icon: "/enemies/corsair.png", tier: 4, strength: 14, defense: 14, intelligence: 5, luck: 5 },
};
// Unique boss names — a defeated boss never returns to its location.
export const BOSS_NAMES = new Set(Object.values(BOSSES_BY_LOCATION).map((boss) => boss.name));

export const NAZGUL_ENEMY: Monster = {
  name: "Назгул",
  icon: "/enemies/nazgul.png",
  tier: 4,
  strength: 18,
  defense: 18, // matched to strength so HP holds under 5×str+5×def
  intelligence: 8,
  luck: 5,
};

// Dol Guldur has two faces. While the Nine are still abroad it's held by three
// wraiths over an orc garrison — this one leads (and is shown on the card) so the
// lair reads as wraith-held, not "just orcs". It's a plain Nazgûl in stats and on
// screen (nazgul.png → "Назгул"); the distinct internal name only keeps its
// defeat from being confused with the roaming/Weathertop "Назгул". No lord here —
// the Ringwraiths' leader, the Witch-king, sits at Minas Morgul, untouched.
export const DOL_GULDUR_WRAITH: Monster = {
  name: "Назгул Дол Гулдура",
  icon: "/enemies/nazgul.png",
  tier: 4,
  strength: 18,
  defense: 18,
  intelligence: 8,
  luck: 5,
};

// Captain of the orc garrison — leads (and is shown) once the wraiths are gone,
// i.e. after Minas Morgul has been seen. Distinct name for clean defeat tracking.
export const DOL_GULDUR_CAPTAIN: Monster = {
  name: "Капитан Дол Гулдура",
  icon: "/enemies/urukhai.png",
  tier: 4,
  strength: 12,
  defense: 12,
  intelligence: 4,
  luck: 4,
};

// The rank-and-file orcs garrisoning Dol Guldur, fought alongside its captain
// (and the wraiths, if the Nine haven't yet gathered in Mordor). Sized so that
// with the three wraiths the whole pack runs ~7 Nazgûl-equivalent in HP — below
// the nine-strong Minas Morgul host, not above it.
export const DOL_GULDUR_GARRISON: Monster[] = [
  { name: "Орк", icon: "/enemies/orc.png", tier: 3, strength: 9, defense: 9, intelligence: 3, luck: 3 },
  { name: "Орк", icon: "/enemies/orc.png", tier: 3, strength: 9, defense: 9, intelligence: 3, luck: 3 },
  { name: "Орк", icon: "/enemies/orc.png", tier: 3, strength: 9, defense: 9, intelligence: 3, luck: 3 },
  { name: "Урук-хай", icon: "/enemies/urukhai.png", tier: 3, strength: 10, defense: 10, intelligence: 4, luck: 3 },
  { name: "Урук-хай", icon: "/enemies/urukhai.png", tier: 3, strength: 10, defense: 10, intelligence: 4, luck: 3 },
  { name: "Урук-хай", icon: "/enemies/urukhai.png", tier: 3, strength: 10, defense: 10, intelligence: 4, luck: 3 },
];

// Register both Dol Guldur bosses (wraith lead while the Nine are abroad, orc
// captain after) so either's defeat is recognised. The page picks which leads.
BOSSES_BY_LOCATION[DOL_GULDUR_ID] = DOL_GULDUR_CAPTAIN;
BOSS_NAMES.add(DOL_GULDUR_WRAITH.name);
BOSS_NAMES.add(DOL_GULDUR_CAPTAIN.name);

// The Witch-king as he led the assault on Weathertop — stronger than his riders
// and the pack's anchor, but here (like them) driven off at half rather than
// slain. A far cry from the terror he becomes at Minas Morgul, where the wraiths
// stand and fight to the death (see BOSSES_BY_LOCATION + the wraithsStand flag).
export const WEATHERTOP_WITCHKING: Monster = {
  name: "Король-чародей",
  icon: "/enemies/witchking.png",
  tier: 3,
  strength: 10,
  defense: 10,
  intelligence: 8,
  luck: 6,
};

// Roaming foes who join on defeat. Eomer only in Rohan; Gollum anywhere, rare.
export const EOMER_ENEMY: Monster = {
  name: "Эомер",
  icon: "/icons/eomer.png",
  tier: 3,
  strength: 8,
  defense: 8,
  intelligence: 6,
  luck: 6,
  recruitId: "eomer",
};
// Treebeard roams Fangorn. Met peacefully he offers to join; with Saruman in the
// company he turns on it instead (the page decides which, and strips recruitId
// for the hostile fight). Same combat build as his character self.
export const TREEBEARD_ENEMY: Monster = {
  name: "Древобород",
  icon: "/icons/treebeard.png",
  tier: 4,
  strength: 12,
  defense: 5,
  intelligence: 12,
  luck: 3,
  recruitId: "treebeard",
};
export const GOLLUM_ENEMY: Monster = {
  name: "Голлум",
  icon: "/icons/gollum.png",
  tier: 2,
  strength: 4,
  defense: 3,
  intelligence: 5,
  luck: 9,
  recruitId: "gollum",
};

// Rank-and-file corsairs raiding the southern seas — roughly orc-grade, no great
// threat. They sail in mixed crews (with rats and Haradrim). Share the Corsair
// captain's portrait. Suppressed once the party has bought safe passage.
export const CORSAIR_ENEMY: Monster = {
  name: "Корсар",
  icon: "/enemies/corsair.png",
  tier: 3,
  strength: 9,
  defense: 6,
  intelligence: 5,
  luck: 5,
  regions: ["SW", "SE"],
};

// A cornered Gríma — wretched and feeble, no match for a couple of hobbits.
export const GRIMA_ENEMY: Monster = {
  name: "Грима Гнилоуст",
  icon: "/enemies/grima.png",
  tier: 1,
  strength: 5,
  defense: 2,
  intelligence: 7,
  luck: 2,
};

// One passive ability per hero, active while they are in the party.
// Special items found by exploring or gifted by companions.
// The Osgiliath ruins hide an armoury cache: a batch of identical Gondorian
// swords (+3 strength) and hauberks (+3 defense). They share the "gondor_sword"
// / "gondor_armor" name (see itemFamilyId) but need distinct ids so each can be
// borne by a different companion. The pool caps how many a single cache yields.
export const GONDOR_CACHE_MAX = 8;
export const GONDOR_SWORD_IDS = Array.from(
  { length: GONDOR_CACHE_MAX },
  (_, i) => `gondor_sword_${i + 1}`,
);
export const GONDOR_ARMOR_IDS = Array.from(
  { length: GONDOR_CACHE_MAX },
  (_, i) => `gondor_armor_${i + 1}`,
);

// The Hornburg armoury at Helm's Deep — Éomer's stash of good Rohirric kit. Two
// pieces lend +3 strength (spear, sword), two +3 defense (shield, mail).
export const ROHAN_ARMORY_IDS = ["rohan_spear", "rohan_sword", "rohan_shield", "rohan_armor"];

export const ITEMS: Item[] = [
  { id: "numenor_dagger", icon: "🗡️", strengthVsUndead: 3 },
  { id: "old_helmet", icon: "🪖", defense: 2 },
  { id: "sting", icon: "⚔️", strength: 3 },
  { id: "mithril_mail", icon: "🛡️", defense: 3 },
  { id: "palantir", icon: "🔮", intelligence: 3 },
  // Galadriel's gifts.
  { id: "phial", icon: "🌟", holders: ["frodo"], luck: 3 },
  { id: "galadriel_box", icon: "🌰", holders: ["sam"], luck: 3 },
  { id: "elessar", icon: "💚", holders: ["aragorn"], strength: 3 },
  { id: "golden_belt", icon: "🔶", holders: ["boromir"], defense: 3 },
  { id: "silver_belt_1", icon: "⚪", holders: ["merry"], defense: 2 },
  { id: "silver_belt_2", icon: "⚪", holders: ["pippin"], defense: 2 },
  { id: "galadhrim_bow", icon: "🏹", holders: ["legolas"], strength: 3 },
  { id: "galadriel_hairs", icon: "💛", holders: ["gimli"], luck: 3 },
  { id: "mithril_helmet", icon: "🪖", defense: 2 },
  { id: "numenor_blade", icon: "🔪", strengthVsUndead: 3 },
  { id: "book_of_mazarbul", icon: "📖", intelligence: 3 },
  // Ring of Durin — only a dwarf (Gimli) may bear it.
  { id: "durin_ring", icon: "💍", holders: ["gimli"], defense: 5, luck: 5 },
  { id: "elven_arrows", icon: "🎯", strengthVsOrcs: 4 },
  { id: "rohan_spear", icon: "🔱", strength: 3 },
  { id: "rohan_sword", icon: "🗡️", strength: 3 },
  { id: "rohan_shield", icon: "🛡️", defense: 3 },
  { id: "rohan_armor", icon: "⛓️", defense: 3 },
  ...GONDOR_SWORD_IDS.map((id): Item => ({ id, icon: "⚔️", strength: 3 })),
  ...GONDOR_ARMOR_IDS.map((id): Item => ({ id, icon: "🛡️", defense: 3 })),
];
export const ITEM_BY_ID: Record<string, Item> = Object.fromEntries(
  ITEMS.map((item) => [item.id, item]),
);

// Companions who hand over items when you talk to them. Each gift may require a
// member to be along (its intended recipient) — Bilbo passes his heirlooms to
// Frodo; Galadriel gives a gift to each named companion present.
export const GIFTS_BY_CHARACTER: Record<string, { id: string; requires?: string[] }[]> = {
  bilbo: [
    { id: "sting", requires: ["frodo"] },
    { id: "mithril_mail", requires: ["frodo"] },
  ],
  galadriel: [
    { id: "phial", requires: ["frodo"] },
    // (also hands out elven cloaks to the whole party — see CLOAK_GIVERS)
    { id: "galadriel_box", requires: ["sam"] },
    { id: "elessar", requires: ["aragorn"] },
    { id: "golden_belt", requires: ["boromir"] },
    { id: "silver_belt_1", requires: ["merry"] },
    { id: "silver_belt_2", requires: ["pippin"] },
    { id: "galadhrim_bow", requires: ["legolas"] },
    { id: "galadriel_hairs", requires: ["gimli"] },
  ],
  thranduil: [{ id: "elven_arrows" }],
};

// Companions who, on talking, hand the whole party elven cloaks (party-wide
// stealth) — no recipient needed.
export const CLOAK_GIVERS = new Set(["galadriel"]);

export const ABILITIES: Record<string, string> = {
  gandalf: "Ускоряет лечение отряда на 50%",
  aragorn: "Скрытность: реже случайные бои",
  gollum: "Нет штрафа за труднопроходимую местность",
  bombadil: "Удача всего отряда +1",
  cirdan: "Можно плыть по морю; двойная скорость на воде",
  grimbeorn: "Усиленный урон по зверям",
  sam: "Добывает больше еды",
  eomer: "Ускоряет передвижение по карте",
  elrond: "Сила эльфов в отряде +1",
  galadriel: "Защита эльфов в отряде +1",
  king_dead: "Двойной урон по нежити",
  eowyn: "Усиленный урон по Назгулам",
  haldir: "Усиленный урон по оркам и гоблинам",
  thranduil: "Чаще критует по троллям",
};

// Artwork filename per location id. Same names live in each season folder; the
// full path is built from the current season (see locationImage / SEASON_FOLDER).
export const LOCATION_IMAGE_FILE: Record<number, string> = {
  1: "01_carn_dum.jpg",
  2: "02_erebor.jpg",
  3: "03_wood_elves.jpg",
  4: "04_fornost.jpg",
  5: "05_beorn.jpg",
  6: "06_forlond.jpg",
  7: "07_rivendell.jpg",
  8: "08_bree.jpg",
  9: "09_weathertop.jpg",
  10: "10_hobbiton.jpg",
  11: "11_grey_havens.jpg",
  12: "12_old%20forest.jpg",
  13: "13_harlond.jpg",
  14: "14_moria.jpg",
  15: "15_lorien.jpg",
  16: "16_isengard.jpg",
  17: "17_helm_deep.jpg",
  18: "18_edoras.jpg",
  19: "19_barad_dur.jpg",
  20: "20_erech.jpg",
  21: "21_orodruin.jpg",
  22: "22_kirith_ungol.jpg",
  23: "23_minas_morgul.jpg",
  24: "24_minas_tirith.jpg",
  25: "25_osgiliath.jpg",
  26: "26_dol_amroth.jpg",
  27: "27_pelargir.jpg",
  28: "28_corsairs.jpg",
  29: "29_umbar.jpg",
  30: "30_buckland.jpg",
  31: "31_esgaroth.jpg",
  32: "32_tharbad.jpg",
  33: "33_dol_guldur.jpg",
};

export const INITIAL_HERO_PROGRESS = heroProgressDataJson as Record<string, HeroInitialProgress>;

// Mounts/ships. Only one at a time; taking a new one replaces the old.
export const TRANSPORTS: Record<TransportId, Transport> = {
  pony: { name: "Пони", speed: 2, sea: false, action: "Взять пони" },
  horse: { name: "Конь", speed: 4, sea: false, action: "Оседлать коня" },
  ship: { name: "Корабль", speed: 1, sea: true, action: "Сесть на корабль" },
  // Eagles of Manwë: fly anywhere (sea = no terrain block), 4× walking speed,
  // skip battles, and only stay for a month.
  eagle: { name: "Орлы Манвэ", speed: 4, sea: true, action: "Призвать орлов" },
};

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

export const RECRUITMENT_SCHEDULES = buildRecruitmentSchedules(
  recruitmentDataJson as Record<string, RawRecruitmentEntry[]>,
);

export const AUTO_BREE_DEPART_DAY = isoDateToDayOffset("3018-09-30");
export const AUTO_RIVENDELL_COUNCIL_DAY = isoDateToDayOffset("3018-10-25");
