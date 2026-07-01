import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { LogOut, Moon, Settings, Sun } from "lucide-react";
import {
  ABILITIES,
  BOSSES_BY_LOCATION,
  CHARACTERS,
  CRIT_INT_FLOOR,
  CRIT_MAX_CHANCE,
  CRIT_MULTIPLIER,
  CRIT_PER_INT,
  DEFAULT_PARTY,
  FARAMIR_GUARD_PASS_CHANCE,
  FOCUS_INT_FLOOR,
  FOCUS_MAX_CHANCE,
  FOCUS_PER_INT,
  GUARD_PASS_CHANCE,
  HIT_BASE_CHANCE,
  HIT_LUCK_STEP,
  HIT_MAX_CHANCE,
  HIT_MIN_CHANCE,
  ITEMS,
  LEVEL_BASE_XP,
  LOCATION_IMAGE_FILE,
  MIN_DAMAGE_FRACTION,
  THEME_PREF_KEY,
  MONSTERS,
  NON_BEARERS,
  RECRUITMENT_PLACE_IDS,
  RECRUITS_BY_LOCATION,
  ROAMING_RECRUIT_IDS,
  ROGUE_HIT_CHANCE,
  getLocationLabel,
  itemFamilyId,
  locationData,
  maxHpFromStats,
  monsterExp,
} from "@/game";
import recruitmentDataJson from "@/data/recruitment.json";
import { LOCATION_GUIDE } from "@/components/guideLocations";
import { GUIDE_TIPS } from "@/components/guideTips";
import { ITEM_SOURCES } from "@/components/guideItemSources";
import type { RawRecruitmentEntry } from "@/game/types";

type Tab =
  | "intro"
  | "heroes"
  | "enemies"
  | "items"
  | "recruit"
  | "locations"
  | "combat"
  | "levels"
  | "secrets";
const TABS: Tab[] = [
  "intro",
  "heroes",
  "enemies",
  "items",
  "recruit",
  "locations",
  "combat",
  "levels",
  "secrets",
];

// Four seasonal art sets share the same filenames; the guide lets you click a
// location to cycle through them (unlike the game, which only uses fall/winter).
const SEASONS = ["spring", "summer", "fall", "winter"] as const;

// Location ids laid out roughly along the quest — Shire and the west havens,
// east across Eriador and Rivendell, over the Misty Mountains through Wilderland,
// down to Rohan/Isengard, into Gondor and the south, and last into Mordor. Any
// id not listed here is appended in its natural order (a safety net).
const LOCATION_ORDER = [
  10, 30, 12, 11, 6, 13, // Shire & the western havens
  8, 9, 4, 1, 32, 7, // across Eriador to Rivendell
  14, 5, 3, 31, 2, 33, 15, // Moria, Wilderland, Lothlórien
  16, 17, 18, // Isengard & Rohan
  24, 25, 20, 26, 27, 28, 29, // Gondor & the south
  23, 22, 19, 21, // into Mordor
];

// The Doors of Durin riddle: "say friend and enter." Only «mellon» opens.
const GATE_OPTIONS = ["Lennon", "Mellon", "Lemon", "Melon"];
const GATE_ANSWER = "Mellon";
const GATE_KEY = "guide-mellon";

const pct = (n: number) => `${Math.round(n * 100)}%`;

// The active tab lives in the URL (?tab=heroes) so a section is linkable and
// survives a reload; unknown/absent falls back to the overview.
const tabFromUrl = (): Tab => {
  const p = new URLSearchParams(window.location.search).get("tab");
  return (TABS as string[]).includes(p ?? "") ? (p as Tab) : "intro";
};

export function GuidePage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [open, setOpen] = useState(() => sessionStorage.getItem(GATE_KEY) === "1");
  const [wrong, setWrong] = useState(false);
  const [tab, setTabState] = useState<Tab>(tabFromUrl);
  const setTab = (id: Tab) => {
    setTabState(id);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", id);
    window.history.pushState({}, "", url);
  };
  // Keep the tab in sync with the back/forward buttons.
  useEffect(() => {
    const onPop = () => setTabState(tabFromUrl());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const toggleLang = () => i18n.changeLanguage(lang === "en" ? "ru" : "en");

  // Interface theme, shared with the game via the same localStorage key and the
  // <html data-theme> hook that swaps index.css's palette variables.
  const [theme, setTheme] = useState<"dark" | "light">(() =>
    typeof localStorage !== "undefined" && localStorage.getItem(THEME_PREF_KEY) === "light"
      ? "light"
      : "dark",
  );
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.dataset.theme = "light";
    } else {
      delete root.dataset.theme;
    }
    try {
      localStorage.setItem(THEME_PREF_KEY, theme);
    } catch {
      // ignore storage errors
    }
  }, [theme]);
  const toggleTheme = () => setTheme((p) => (p === "light" ? "dark" : "light"));

  const answer = (choice: string) => {
    if (choice === GATE_ANSWER) {
      sessionStorage.setItem(GATE_KEY, "1");
      setOpen(true);
    } else {
      setWrong(true);
    }
  };

  if (!open) {
    return (
      <div className="relative min-h-screen bg-neutral-950 px-4 text-neutral-200">
        <div className="absolute right-4 top-4">
          <GuideSettings
            theme={theme}
            onToggleTheme={toggleTheme}
            lang={lang}
            onToggleLang={toggleLang}
          />
        </div>
        <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 text-center">
          <h1 className="font-serif text-2xl text-amber-300">{t("guide.gate.question")}</h1>
          <p className="text-sm text-neutral-400">{t("guide.gate.hint")}</p>
          <div className="grid w-full grid-cols-2 gap-3">
            {GATE_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => answer(opt)}
                className="rounded border border-amber-800 bg-amber-950/40 px-4 py-3 font-serif text-lg text-amber-100 transition hover:bg-amber-900/60"
              >
                {opt}
              </button>
            ))}
          </div>
          {wrong && <p className="text-sm text-red-400">{t("guide.gate.wrong")}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200">
      <header className="sticky top-0 z-10 border-b border-red-900/40 bg-neutral-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-4 py-3">
          <h1 className="mr-2 font-serif text-lg text-amber-300">{t("guide.title")}</h1>
          <nav className="flex flex-wrap gap-1.5">
            {TABS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`rounded border px-3 py-1.5 text-sm transition ${
                  tab === id
                    ? "border-amber-500 bg-amber-900/50 text-amber-100"
                    : "border-neutral-700 bg-neutral-800/60 text-neutral-300 hover:bg-neutral-700"
                }`}
              >
                {t(`guide.tabs.${id}`)}
              </button>
            ))}
          </nav>
          <div className="ml-auto">
            <GuideSettings
              theme={theme}
              onToggleTheme={toggleTheme}
              lang={lang}
              onToggleLang={toggleLang}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {tab === "intro" && <IntroSection />}
        {tab === "heroes" && <HeroesSection />}
        {tab === "enemies" && <EnemiesSection lang={lang} />}
        {tab === "items" && <ItemsSection lang={lang} />}
        {tab === "recruit" && <RecruitSection lang={lang} />}
        {tab === "locations" && <LocationsSection lang={lang} />}
        {tab === "combat" && <CombatSection />}
        {tab === "levels" && <LevelsSection />}
        {tab === "secrets" && <SecretsSection lang={lang} />}
      </main>
    </div>
  );
}

// —— shared bits ——————————————————————————————————————————————————————————

// The gear dropdown: theme + language, mirroring the game's settings menu so the
// guide feels like part of the same app.
function GuideSettings({
  theme,
  onToggleTheme,
  lang,
  onToggleLang,
}: {
  theme: "dark" | "light";
  onToggleTheme: () => void;
  lang: string;
  onToggleLang: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const row =
    "flex items-center gap-2.5 rounded px-2.5 py-2 text-left text-sm text-neutral-200 transition hover:bg-neutral-800";
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("ui.settings")}
        title={t("ui.settings")}
        aria-pressed={open}
        className="flex size-9 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900/90 text-neutral-200 transition hover:bg-neutral-800 aria-pressed:bg-neutral-800"
      >
        <Settings className="size-4" />
      </button>
      {open && (
        <>
          {/* Click-away layer so the menu closes when you tap elsewhere. */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="absolute right-0 top-full z-50 mt-2 flex w-48 flex-col gap-0.5 rounded border border-neutral-700 bg-neutral-900/95 p-1.5 shadow-2xl">
            <button type="button" onClick={onToggleTheme} className={row}>
              {theme === "light" ? (
                <Sun className="size-4 shrink-0" />
              ) : (
                <Moon className="size-4 shrink-0" />
              )}
              <span className="flex-1">{t("ui.theme")}</span>
              <span className="text-xs text-neutral-400">
                {theme === "light" ? t("ui.themeLight") : t("ui.themeDark")}
              </span>
            </button>
            <button type="button" onClick={onToggleLang} className={row}>
              <span className="flex size-4 shrink-0 items-center justify-center text-[11px] font-bold">
                {lang === "en" ? "RU" : "EN"}
              </span>
              <span className="flex-1">{lang === "en" ? "Русский" : "English"}</span>
            </button>
            <div className="my-1 border-t border-neutral-800" />
            <a href="../" className={row}>
              <LogOut className="size-4 shrink-0" />
              <span className="flex-1">{t("guide.back")}</span>
            </a>
          </div>
        </>
      )}
    </div>
  );
}

function Portrait({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="size-11 shrink-0 overflow-hidden rounded border border-neutral-700 bg-parchment sm:size-12">
      <img src={src} alt={alt} className="size-full object-cover" loading="lazy" />
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-1 font-serif text-xl text-amber-200">{children}</h2>;
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={`px-2 py-2 font-semibold text-neutral-400 ${right ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );
}

function Td({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return <td className={`px-2 py-1.5 ${right ? "text-right tabular-nums" : ""}`}>{children}</td>;
}

// —— sections —————————————————————————————————————————————————————————————

function IntroSection() {
  const { t } = useTranslation();
  const paras = t("guide.intro.body", { returnObjects: true }) as string[];
  return (
    <section className="space-y-3">
      <SectionTitle>{t("guide.tabs.intro")}</SectionTitle>
      {paras.map((p, i) => (
        <p key={i} className="max-w-3xl leading-relaxed text-neutral-300">
          {p}
        </p>
      ))}
    </section>
  );
}

function HeroesSection() {
  const { t } = useTranslation();
  return (
    <section>
      <SectionTitle>{t("guide.tabs.heroes")}</SectionTitle>
      <p className="mb-3 text-sm text-neutral-400">{t("guide.heroes.note")}</p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-700">
              <Th> </Th>
              <Th>{t("guide.col.name")}</Th>
              <Th right>{t("guide.col.str")}</Th>
              <Th right>{t("guide.col.def")}</Th>
              <Th right>{t("guide.col.int")}</Th>
              <Th right>{t("guide.col.luck")}</Th>
              <Th right>{t("guide.col.hp")}</Th>
              <Th right>{t("guide.col.res")}</Th>
              <Th>{t("guide.col.ability")}</Th>
            </tr>
          </thead>
          <tbody>
            {CHARACTERS.map((c) => (
              <tr key={c.id} className="border-b border-neutral-800/70 align-middle">
                <Td>
                  <Portrait src={c.icon} alt={t(`char.${c.id}`)} />
                </Td>
                <Td>
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-neutral-100">{t(`char.${c.id}`)}</span>
                    {NON_BEARERS.has(c.id) && (
                      <span
                        className="text-xs text-neutral-500"
                        title={t("guide.heroes.nonBearer")}
                      >
                        ⊘
                      </span>
                    )}
                  </div>
                </Td>
                <Td right>{c.strength}</Td>
                <Td right>{c.defense}</Td>
                <Td right>{c.intelligence}</Td>
                <Td right>{c.luck}</Td>
                <Td right>{maxHpFromStats(c.strength, c.defense)}</Td>
                <Td right>{c.resilience}</Td>
                <Td>
                  <span className="text-neutral-300">
                    {c.id in ABILITIES ? t(`ability.${c.id}`) : "—"}
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-neutral-500">{t("guide.heroes.legend")}</p>
    </section>
  );
}

function EnemiesSection({ lang }: { lang: string }) {
  const { t } = useTranslation();
  const regionLabel = (code: string) => t(`guide.region.${code}`);
  const monsterKey = (icon: string) => icon.split("/").pop()?.replace(".png", "") ?? "";
  // Weakest first so the tier climb reads top-to-bottom.
  const rows = useMemo(
    () => [...MONSTERS].sort((a, b) => a.tier - b.tier || monsterExp(a) - monsterExp(b)),
    [],
  );
  return (
    <section>
      <SectionTitle>{t("guide.tabs.enemies")}</SectionTitle>
      <p className="mb-3 text-sm text-neutral-400">{t("guide.enemies.note")}</p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-700">
              <Th> </Th>
              <Th>{t("guide.col.name")}</Th>
              <Th right>{t("guide.col.tier")}</Th>
              <Th right>{t("guide.col.str")}</Th>
              <Th right>{t("guide.col.def")}</Th>
              <Th right>{t("guide.col.int")}</Th>
              <Th right>{t("guide.col.luck")}</Th>
              <Th right>{t("guide.col.hp")}</Th>
              <Th right>{t("guide.col.xp")}</Th>
              <Th>{t("guide.col.regions")}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m, i) => (
              <tr key={`${m.icon}-${i}`} className="border-b border-neutral-800/70 align-middle">
                <Td>
                  <Portrait src={m.icon} alt={t(`monster.${monsterKey(m.icon)}`)} />
                </Td>
                <Td>
                  <span className="font-medium text-neutral-100">
                    {t(`monster.${monsterKey(m.icon)}`)}
                  </span>
                </Td>
                <Td right>{m.tier}</Td>
                <Td right>{m.strength}</Td>
                <Td right>{m.defense}</Td>
                <Td right>{m.intelligence}</Td>
                <Td right>{m.luck}</Td>
                <Td right>{maxHpFromStats(m.strength, m.defense)}</Td>
                <Td right>{monsterExp(m)}</Td>
                <Td>
                  <span className="text-neutral-400">
                    {m.regions ? m.regions.map(regionLabel).join(", ") : t("guide.region.any")}
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-neutral-500">{t("guide.enemies.regionsLegend", { lang })}</p>
    </section>
  );
}

// Collapse the numbered variants (gondor_sword_1…8, silver_belt_1/2) to one
// entry, and give the source map a matching key by also stripping trailing "_N".
const sourceKey = (id: string) => itemFamilyId(id).replace(/_\d+$/, "");

function ItemsSection({ lang }: { lang: string }) {
  const { t } = useTranslation();
  const en = lang === "en";
  // One card per item family.
  const families = useMemo(() => {
    const seen = new Set<string>();
    return ITEMS.filter((it) => {
      const key = sourceKey(it.id);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }, []);
  return (
    <section>
      <SectionTitle>{t("guide.tabs.items")}</SectionTitle>
      <p className="mb-3 text-sm text-neutral-400">{t("guide.items.note")}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {families.map((it) => {
          const fam = itemFamilyId(it.id);
          const source = ITEM_SOURCES[sourceKey(it.id)];
          return (
            <div
              key={it.id}
              className="flex items-center gap-3 rounded border border-neutral-800 bg-neutral-900/60 p-2"
            >
              <Portrait src={it.icon} alt={t(`item.${fam}.name`)} />
              <div className="min-w-0">
                <p className="font-medium text-neutral-100">{t(`item.${fam}.name`)}</p>
                <p className="text-xs text-neutral-400">{t(`item.${fam}.desc`)}</p>
                {source && (
                  <p className="mt-0.5 text-xs text-emerald-300/80">
                    📍 {en ? source.en : source.ru}
                  </p>
                )}
                {it.holders && (
                  <p className="mt-0.5 text-xs text-amber-400/80">
                    {t("guide.items.onlyFor", {
                      names: it.holders.map((h) => t(`char.${h}`)).join(", "),
                    })}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function RecruitSection({ lang }: { lang: string }) {
  const { t } = useTranslation();
  const schedule = recruitmentDataJson as Record<string, RawRecruitmentEntry[]>;
  const locName = (id: number) => {
    const loc = locationData.locations.find((l) => l.id === id);
    return loc ? getLocationLabel(loc, lang) : `#${id}`;
  };
  const placeName = (place: string) => {
    const id = RECRUITMENT_PLACE_IDS[place];
    return id ? locName(id) : place;
  };
  // Dates arrive as ISO (3018-09-29); show them as they are — the year matters
  // (the quest spans 3018→3019).
  const fmtDate = (iso: string | null) => iso;
  return (
    <section className="space-y-6">
      <div>
        <SectionTitle>{t("guide.recruit.scheduleTitle")}</SectionTitle>
        <p className="mb-3 text-sm text-neutral-400">{t("guide.recruit.scheduleNote")}</p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-700">
                <Th> </Th>
                <Th>{t("guide.col.name")}</Th>
                <Th>{t("guide.col.place")}</Th>
                <Th>{t("guide.col.when")}</Th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(schedule).flatMap(([id, entries]) =>
                entries.map((e, i) => (
                  <tr key={`${id}-${i}`} className="border-b border-neutral-800/70 align-middle">
                    <Td>{i === 0 && <Portrait src={heroIcon(id)} alt={t(`char.${id}`)} />}</Td>
                    <Td>{i === 0 && <span className="font-medium text-neutral-100">{t(`char.${id}`)}</span>}</Td>
                    <Td>{placeName(e.place)}</Td>
                    <Td>
                      {fmtDate(e.from)}
                      {e.to ? ` — ${fmtDate(e.to)}` : ` ${t("guide.recruit.andLater")}`}
                      {e.time === "night" ? ` (${t("guide.recruit.night")})` : ""}
                    </Td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <SectionTitle>{t("guide.recruit.alwaysTitle")}</SectionTitle>
        <p className="mb-3 text-sm text-neutral-400">{t("guide.recruit.alwaysNote")}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {Object.entries(RECRUITS_BY_LOCATION).map(([locId, ids]) => (
            <div
              key={locId}
              className="rounded border border-neutral-800 bg-neutral-900/60 p-3"
            >
              <p className="mb-2 font-medium text-amber-200">{locName(Number(locId))}</p>
              <div className="flex flex-wrap gap-3">
                {ids.map((id) => (
                  <div key={id} className="flex items-center gap-1.5">
                    <Portrait src={heroIcon(id)} alt={t(`char.${id}`)} />
                    <span className="text-sm text-neutral-200">{t(`char.${id}`)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded border border-amber-900/40 bg-amber-950/20 p-3">
          <p className="mb-1.5 text-xs font-semibold text-amber-200">
            {t("guide.recruit.condTitle")}
          </p>
          <ul className="space-y-1">
            {(t("guide.recruit.conditions", { returnObjects: true }) as string[]).map((c, i) => (
              <li key={i} className="flex gap-2 text-xs leading-relaxed text-amber-200/80">
                <span className="select-none text-amber-500/70">◆</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <SectionTitle>{t("guide.recruit.roamingTitle")}</SectionTitle>
        <p className="mb-3 text-sm text-neutral-400">{t("guide.recruit.roamingNote")}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {[...ROAMING_RECRUIT_IDS, "gandalf_white"].map((id) => (
            <div
              key={id}
              className="flex items-center gap-3 rounded border border-neutral-800 bg-neutral-900/60 p-2"
            >
              <Portrait src={heroIcon(id)} alt={t(`char.${id}`)} />
              <div className="min-w-0">
                <p className="font-medium text-neutral-100">{t(`char.${id}`)}</p>
                <p className="text-xs text-neutral-400">{t(`guide.recruit.roaming.${id}`)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function heroIcon(id: string): string {
  return CHARACTERS.find((c) => c.id === id)?.icon ?? "";
}

// Which heroes can be met at each location: the always-home roster plus anyone
// whose travelling schedule passes through that place.
function recruitsByLocation(): Record<number, string[]> {
  const map: Record<number, Set<string>> = {};
  for (const [locId, ids] of Object.entries(RECRUITS_BY_LOCATION)) {
    map[Number(locId)] = new Set(ids);
  }
  const schedule = recruitmentDataJson as Record<string, RawRecruitmentEntry[]>;
  for (const [heroId, entries] of Object.entries(schedule)) {
    for (const e of entries) {
      const locId = RECRUITMENT_PLACE_IDS[e.place];
      if (locId) {
        (map[locId] ??= new Set()).add(heroId);
      }
    }
  }
  return Object.fromEntries(Object.entries(map).map(([k, v]) => [k, [...v]]));
}

function LocationCard({ id, lang }: { id: number; lang: string }) {
  const { t } = useTranslation();
  const [si, setSi] = useState(2); // start on the fall art the game defaults to
  const loc = locationData.locations.find((l) => l.id === id);
  const file = LOCATION_IMAGE_FILE[id];
  const boss = BOSSES_BY_LOCATION[id];
  const recruits = LOCATION_RECRUITS[id] ?? [];
  const blurb = LOCATION_GUIDE[id]?.[lang === "en" ? "en" : "ru"] ?? "";
  return (
    <div className="overflow-hidden rounded border border-neutral-800 bg-neutral-900/60">
      {file && (
        <button
          type="button"
          onClick={() => setSi((n) => (n + 1) % SEASONS.length)}
          title={t("guide.locations.seasonHint")}
          className="group relative block aspect-square w-full bg-neutral-950"
        >
          {/* All four seasons are stacked and cross-fade on click (0.3s) — since
              every layer is mounted, the incoming art is already loaded, so the
              swap is a smooth dissolve rather than a flash. */}
          {SEASONS.map((s, idx) => (
            <img
              key={s}
              src={`/locations/${s}/${file}`}
              alt={loc ? getLocationLabel(loc, lang) : ""}
              className={`absolute inset-0 size-full object-contain transition-opacity duration-300 ease-in-out group-hover:brightness-110 ${
                idx === si ? "opacity-100" : "opacity-0"
              }`}
              loading="lazy"
            />
          ))}
          <span className="absolute bottom-1 right-1 rounded bg-black/70 px-2 py-0.5 text-xs text-amber-200">
            {t(`guide.season.${SEASONS[si]}`)} ⟳
          </span>
        </button>
      )}
      <div className="space-y-2 p-3">
        <h3 className="font-serif text-lg text-amber-200">
          {loc ? getLocationLabel(loc, lang) : `#${id}`}
        </h3>
        <p className="text-sm leading-relaxed text-neutral-300">{blurb}</p>
        <div className="flex flex-wrap gap-1.5">
          {boss && (
            <span className="rounded-full border border-red-800 bg-red-950/50 px-2 py-0.5 text-xs text-red-300">
              {t("guide.locations.guardian", {
                name: t(`monster.${boss.icon.split("/").pop()?.replace(".png", "")}`),
              })}
            </span>
          )}
          {recruits.map((rid) => (
            <span
              key={rid}
              className="inline-flex items-center gap-1 rounded-full border border-emerald-800 bg-emerald-950/40 px-2 py-0.5 text-xs text-emerald-200"
            >
              <img src={heroIcon(rid)} alt="" className="size-4 rounded-full object-cover" />
              {t(`char.${rid}`)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

const LOCATION_RECRUITS = recruitsByLocation();

function LocationsSection({ lang }: { lang: string }) {
  const { t } = useTranslation();
  const ids = useMemo(() => {
    const all = locationData.locations.map((l) => l.id);
    const known = new Set(all);
    const ordered = LOCATION_ORDER.filter((id) => known.has(id));
    const rest = all.filter((id) => !LOCATION_ORDER.includes(id));
    return [...ordered, ...rest];
  }, []);
  return (
    <section>
      <SectionTitle>{t("guide.tabs.locations")}</SectionTitle>
      <p className="mb-4 text-sm text-neutral-400">{t("guide.locations.note")}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ids.map((id) => (
          <LocationCard key={id} id={id} lang={lang} />
        ))}
      </div>
    </section>
  );
}

function CombatSection() {
  const { t } = useTranslation();
  const rows: { label: string; value: string }[] = [
    {
      label: t("guide.combat.hp"),
      value: t("guide.combat.hpF"),
    },
    {
      label: t("guide.combat.damage"),
      value: `max(⌈${t("guide.col.str")}·${pct(MIN_DAMAGE_FRACTION)}⌉, ${t("guide.col.str")} − ${t("guide.col.def")})`,
    },
    {
      label: t("guide.combat.hit"),
      value: `${pct(HIT_BASE_CHANCE)} ± ${pct(HIT_LUCK_STEP)}·Δ${t("guide.col.luck")} [${pct(HIT_MIN_CHANCE)}…${pct(HIT_MAX_CHANCE)}]`,
    },
    {
      label: t("guide.combat.crit"),
      value: `(${t("guide.col.int")} − ${CRIT_INT_FLOOR})·${pct(CRIT_PER_INT)} ≤ ${pct(CRIT_MAX_CHANCE)}, ×${CRIT_MULTIPLIER}`,
    },
    {
      label: t("guide.combat.focus"),
      value: `(${t("guide.col.int")} − ${FOCUS_INT_FLOOR})·${pct(FOCUS_PER_INT)} ≤ ${pct(FOCUS_MAX_CHANCE)}`,
    },
    {
      label: t("guide.combat.ring"),
      value: t("guide.combat.ringF", { pct: pct(ROGUE_HIT_CHANCE) }),
    },
  ];
  return (
    <section className="space-y-4">
      <SectionTitle>{t("guide.tabs.combat")}</SectionTitle>
      <div className="overflow-x-auto">
        <table className="w-full max-w-2xl border-collapse text-sm">
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-b border-neutral-800/70">
                <td className="px-2 py-2 text-neutral-400">{r.label}</td>
                <td className="px-2 py-2 font-mono text-neutral-100">{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 rounded border border-amber-900/40 bg-amber-950/20 p-4">
        <h3 className="font-serif text-lg text-amber-200">{t("guide.combat.ordersTitle")}</h3>
        <p className="flex items-start gap-2 text-neutral-300">
          <span className="text-xl leading-none">🛡️</span>
          <span>
            {t("guide.combat.guard", {
              pass: pct(GUARD_PASS_CHANCE),
              faramir: pct(FARAMIR_GUARD_PASS_CHANCE),
            })}
          </span>
        </p>
        <p className="flex items-start gap-2 text-neutral-300">
          <span className="text-xl leading-none">⚔️</span>
          <span>{t("guide.combat.focusOrder")}</span>
        </p>
      </div>

      <p className="max-w-3xl text-sm text-neutral-400">{t("guide.combat.statsNote")}</p>
    </section>
  );
}

function SecretsSection({ lang }: { lang: string }) {
  const { t } = useTranslation();
  const en = lang === "en";
  return (
    <section className="space-y-6">
      <SectionTitle>{t("guide.tabs.secrets")}</SectionTitle>
      <p className="-mt-2 max-w-3xl text-sm text-neutral-400">{t("guide.secrets.note")}</p>
      <div className="grid gap-4 md:grid-cols-2">
        {GUIDE_TIPS.map((group) => (
          <div
            key={group.titleEn}
            className="rounded border border-neutral-800 bg-neutral-900/60 p-4"
          >
            <h3 className="mb-2 font-serif text-lg text-amber-200">
              {en ? group.titleEn : group.titleRu}
            </h3>
            <ul className="space-y-2">
              {group.tips.map((tip, i) => (
                <li key={i} className="flex gap-2 text-sm leading-relaxed text-neutral-300">
                  <span className="select-none text-amber-500/70">◆</span>
                  <span>{en ? tip.en : tip.ru}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function LevelsSection() {
  const { t } = useTranslation();
  const rows = useMemo(() => {
    const out: { level: number; toNext: number; total: number }[] = [];
    let total = 0;
    for (let level = 1; level <= 12; level += 1) {
      const toNext = LEVEL_BASE_XP * level;
      out.push({ level, toNext, total });
      total += toNext;
    }
    return out;
  }, []);
  return (
    <section>
      <SectionTitle>{t("guide.tabs.levels")}</SectionTitle>
      <p className="mb-3 max-w-2xl text-sm text-neutral-400">
        {t("guide.levels.note", { base: LEVEL_BASE_XP })}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full max-w-md border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-700">
              <Th>{t("guide.col.level")}</Th>
              <Th right>{t("guide.col.toNext")}</Th>
              <Th right>{t("guide.col.totalXp")}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.level} className="border-b border-neutral-800/70">
                <Td>{r.level}</Td>
                <Td right>{r.toNext.toLocaleString()}</Td>
                <Td right>{r.total.toLocaleString()}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-neutral-500">
        {t("guide.levels.pointNote", { party: DEFAULT_PARTY.length })}
      </p>
    </section>
  );
}
