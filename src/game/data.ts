// Static game data: characters, monsters, bosses, abilities, transports, and the
// recruitment schedule parsed from JSON. Imports constants/types/calendar only.
import locationDataJson from "@/data/locations.json";
import recruitmentDataJson from "@/data/recruitment.json";
import heroProgressDataJson from "@/data/hero-progress.json";
import { isoDateToDayOffset } from "@/game/calendar";
import {
  BARAD_DUR_ID,
  CIRITH_UNGOL_ID,
  ISENGARD_ID,
  MINAS_MORGUL_ID,
  MORIA_GATE_ID,
  RECRUITMENT_PLACE_IDS,
  UMBAR_ID,
  WEATHERTOP_ID,
} from "@/game/constants";
import type {
  Character,
  HeroInitialProgress,
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
  { id: "gollum", name: "Голлум", icon: "/icons/gollum.png", strength: 4, defense: 3, intelligence: 5, luck: 9, resilience: 20, ringExposure: 0.6 },
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
  { name: "Гоблин", icon: "/enemies/goblin.png", tier: 2, strength: 5, defense: 3, intelligence: 3, luck: 3, regions: ["NW", "MW", "ME"] },
  { name: "Орк-разведчик", icon: "/enemies/orc_scout.png", tier: 2, strength: 5, defense: 4, intelligence: 3, luck: 3 },
  { name: "Горный тролль", icon: "/enemies/troll.png", tier: 2, strength: 8, defense: 7, intelligence: 2, luck: 2, regions: ["NW", "NE", "MW"] },
  { name: "Орк", icon: "/enemies/orc.png", tier: 3, strength: 6, defense: 5, intelligence: 3, luck: 3 },
  { name: "Варг", icon: "/enemies/varg.png", tier: 3, strength: 6, defense: 4, intelligence: 3, luck: 4, regions: ["NW", "MW"] },
  { name: "Урук-хай", icon: "/enemies/urukhai.png", tier: 3, strength: 8, defense: 6, intelligence: 4, luck: 3, regions: ["MW", "ME"] },
  { name: "Харадрим", icon: "/enemies/kharadrim.png", tier: 4, strength: 8, defense: 6, intelligence: 4, luck: 4, regions: ["SW", "SE"] },
  { name: "Мумак", icon: "/enemies/mumak.png", tier: 4, strength: 10, defense: 9, intelligence: 1, luck: 2, regions: ["SW", "SE"] },
  { name: "Тролль Горгорота", icon: "/enemies/troll_gorgoroth.png", tier: 5, strength: 11, defense: 9, intelligence: 2, luck: 2, regions: ["ME"] },
];

// Named bosses fixed to their lairs — engageable when you reach the location.
export const BOSSES_BY_LOCATION: Record<number, Monster> = {
  [WEATHERTOP_ID]: { name: "Назгул", icon: "/enemies/nazgul.png", tier: 4, strength: 10, defense: 8, intelligence: 8, luck: 4 },
  [MORIA_GATE_ID]: { name: "Балрог", icon: "/enemies/balrog.png", tier: 5, strength: 12, defense: 10, intelligence: 8, luck: 5 },
  [ISENGARD_ID]: { name: "Саруман", icon: "/icons/saruman.png", tier: 4, strength: 10, defense: 8, intelligence: 9, luck: 5 },
  [BARAD_DUR_ID]: { name: "Страж Барад-дура", icon: "/enemies/baraddur.png", tier: 5, strength: 12, defense: 10, intelligence: 10, luck: 6 },
  [CIRITH_UNGOL_ID]: { name: "Шелоб", icon: "/enemies/shelob.png", tier: 5, strength: 11, defense: 9, intelligence: 5, luck: 4 },
  [MINAS_MORGUL_ID]: { name: "Король-чародей", icon: "/enemies/witchking.png", tier: 5, strength: 11, defense: 9, intelligence: 9, luck: 5 },
  [UMBAR_ID]: { name: "Корсар", icon: "/enemies/corsair.png", tier: 4, strength: 8, defense: 6, intelligence: 5, luck: 5 },
};
// Unique boss names — a defeated boss never returns to its location.
export const BOSS_NAMES = new Set(Object.values(BOSSES_BY_LOCATION).map((boss) => boss.name));

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

// One passive ability per hero, active while they are in the party.
export const ABILITIES: Record<string, string> = {
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
