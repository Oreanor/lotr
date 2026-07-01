// Where each special item can be found or obtained in the game, keyed by item
// FAMILY id (the itemFamilyId result — the Gondor armoury ids collapse to
// "gondor_sword"/"gondor_armor"; the two silver belts are grouped as
// "silver_belt"). Each phrase is a short bilingual (ru + en) hint.
//
// Traced from the code, not invented:
//   - Explore caches: EXPLORE_ITEM_BY_LOCATION (src/game/constants.ts) plus the
//     special-case branches in exploreLocation (src/components/MiddleEarthMap.tsx):
//     Osgiliath (Gondor cache), Helm's Deep (Rohan armoury, needs Éomer).
//   - Companion gifts: GIFTS_BY_CHARACTER (src/game/data.ts) — Bilbo, Galadriel,
//     Thranduil, with any required recipient.
//   - Guardian gating: exploreLocked in MiddleEarthMap.tsx locks a location's
//     search while its boss stands (Isengard/Saruman, Moria/Balrog, Dol Guldur).
//
// This file is intentionally self-contained (no imports).
export const ITEM_SOURCES: Record<string, { ru: string; en: string }> = {
  // --- Explore caches (luck-based find on searching a location) ---
  numenor_dagger: {
    ru: "Клад при обыске Форноста",
    en: "Cache when exploring Fornost",
  },
  old_helmet: {
    ru: "Клад при обыске Тарбада",
    en: "Cache when exploring Tharbad",
  },
  mithril_helmet: {
    ru: "Клад при обыске Эребора",
    en: "Cache when exploring Erebor",
  },
  numenor_blade: {
    ru: "Клад при обыске Старого Леса",
    en: "Cache when exploring the Old Forest",
  },
  // --- Explore caches gated by a location guardian ---
  palantir: {
    ru: "Обыск Изенгарда — после победы над Саруманом",
    en: "Explore Isengard — after Saruman is beaten",
  },
  book_of_mazarbul: {
    ru: "Обыск Мории — после победы над Балрогом",
    en: "Explore Moria — after the Balrog is beaten",
  },
  durin_ring: {
    ru: "Обыск Дол Гулдура (после гарнизона); носит только Гимли",
    en: "Explore Dol Guldur (after its garrison); Gimli only",
  },
  // --- Special caches ---
  gondor_sword: {
    ru: "Клад-оружейня в руинах Осгилиата (одноразово)",
    en: "Armoury cache in the ruins of Osgiliath (one-time)",
  },
  gondor_armor: {
    ru: "Клад-оружейня в руинах Осгилиата (одноразово)",
    en: "Armoury cache in the ruins of Osgiliath (one-time)",
  },
  rohan_spear: {
    ru: "Оружейня Хорнбурга в Хельмовой Пади — нужен Эомер",
    en: "Hornburg armoury at Helm's Deep — needs Éomer",
  },
  rohan_sword: {
    ru: "Оружейня Хорнбурга в Хельмовой Пади — нужен Эомер",
    en: "Hornburg armoury at Helm's Deep — needs Éomer",
  },
  rohan_shield: {
    ru: "Оружейня Хорнбурга в Хельмовой Пади — нужен Эомер",
    en: "Hornburg armoury at Helm's Deep — needs Éomer",
  },
  rohan_armor: {
    ru: "Оружейня Хорнбурга в Хельмовой Пади — нужен Эомер",
    en: "Hornburg armoury at Helm's Deep — needs Éomer",
  },
  // --- Companion gifts (talk to them; recipient must be in the party) ---
  sting: {
    ru: "Дар Бильбо — для Фродо (Ривенделл)",
    en: "Bilbo's gift — to Frodo (Rivendell)",
  },
  mithril_mail: {
    ru: "Дар Бильбо — для Фродо (Ривенделл)",
    en: "Bilbo's gift — to Frodo (Rivendell)",
  },
  elven_arrows: {
    ru: "Дар Трандуила (Лесное королевство)",
    en: "Thranduil's gift (Woodland Realm)",
  },
  phial: {
    ru: "Дар Галадриэли — для Фродо (Лориэн)",
    en: "Galadriel's gift — to Frodo (Lórien)",
  },
  galadriel_box: {
    ru: "Дар Галадриэли — для Сэма (Лориэн)",
    en: "Galadriel's gift — to Sam (Lórien)",
  },
  elessar: {
    ru: "Дар Галадриэли — для Арагорна (Лориэн)",
    en: "Galadriel's gift — to Aragorn (Lórien)",
  },
  golden_belt: {
    ru: "Дар Галадриэли — для Боромира (Лориэн)",
    en: "Galadriel's gift — to Boromir (Lórien)",
  },
  silver_belt: {
    ru: "Дар Галадриэли — для Мерри и Пиппина (Лориэн)",
    en: "Galadriel's gift — to Merry and Pippin (Lórien)",
  },
  galadhrim_bow: {
    ru: "Дар Галадриэли — для Леголаса (Лориэн)",
    en: "Galadriel's gift — to Legolas (Lórien)",
  },
  galadriel_hairs: {
    ru: "Дар Галадриэли — для Гимли (Лориэн)",
    en: "Galadriel's gift — to Gimli (Lórien)",
  },
};
