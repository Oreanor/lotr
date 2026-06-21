import { useTranslation } from "react-i18next";
import { Modal } from "@/components/ui/Modal";
import { BOSSES_BY_LOCATION, CHARACTERS, MONSTERS } from "@/game/data";

export interface GameStats {
  locationsVisited: number;
  locationsTotal: number;
  bossesDefeated: number;
  bossesTotal: number;
  itemsFound: number;
  itemsTotal: number;
  enemiesKilled: number;
  deaths: number;
  maxPartySize: number;
  days: number;
  miles: number;
}

// Foes are tracked in one pool, but shown in two galleries: the roaming rank
// and file, and the named bosses. Each is de-duplicated by portrait (a few
// share an icon, e.g. the Nazgûl appears both roaming and at Weathertop).
const dedupeByIcon = (foes: { name: string; icon: string }[]) => {
  const seen = new Set<string>();
  const roster: { name: string; icon: string }[] = [];
  for (const foe of foes) {
    if (seen.has(foe.icon)) {
      continue;
    }
    seen.add(foe.icon);
    roster.push({ name: foe.name, icon: foe.icon });
  }
  return roster;
};

const MONSTER_ROSTER = dedupeByIcon(MONSTERS);
const BOSS_ROSTER = dedupeByIcon(Object.values(BOSSES_BY_LOCATION));

const iconKey = (icon: string) => icon.split("/").pop()?.replace(".png", "") ?? icon;

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-neutral-800 pb-1">
      <span className="text-neutral-400">{label}</span>
      <span className="font-semibold tabular-nums text-neutral-100">{value}</span>
    </div>
  );
}

function Portrait({ src, label, found }: { src: string; label: string; found: boolean }) {
  return (
    <div title={label} className="flex flex-col items-center gap-0.5">
      <div
        className={`aspect-square w-full overflow-hidden rounded border border-neutral-700 ${
          found ? "bg-parchment" : "bg-[#525252]"
        }`}
      >
        <img
          src={src}
          alt={label}
          draggable={false}
          className={`size-full select-none object-cover transition ${
            found ? "" : "grayscale opacity-50"
          }`}
        />
      </div>
      <span
        className={`w-full truncate text-center text-[9px] leading-tight ${
          found ? "text-neutral-300" : "text-neutral-600"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

// Read-only stats overlay: lifetime tallies plus a portrait gallery of every
// companion and foe, with undiscovered ones dimmed.
export function StatsModal({
  open,
  onClose,
  stats,
  foundCharacterIds,
  defeatedEnemyIcons,
}: {
  open: boolean;
  onClose: () => void;
  stats: GameStats;
  foundCharacterIds: Set<string>;
  defeatedEnemyIcons: Set<string>;
}) {
  const { t } = useTranslation();
  const monstersFound = MONSTER_ROSTER.filter((foe) => defeatedEnemyIcons.has(foe.icon)).length;
  const bossesFound = BOSS_ROSTER.filter((foe) => defeatedEnemyIcons.has(foe.icon)).length;

  return (
    <Modal
      open={open}
      onClose={onClose}
      align="top"
      z="z-[60]"
      className="flex max-h-[88vh] w-full max-w-2xl flex-col border-neutral-700"
    >
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
      <h2 className="font-serif text-2xl text-neutral-100">{t("stats.title")}</h2>

      <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
        {/* Exploration */}
        <StatRow
          label={t("stats.locations")}
          value={`${stats.locationsVisited} / ${stats.locationsTotal}`}
        />
        <StatRow
          label={t("stats.items")}
          value={`${stats.itemsFound} / ${stats.itemsTotal}`}
        />
        {/* Roster collected */}
        <StatRow
          label={t("stats.characters")}
          value={`${foundCharacterIds.size} / ${CHARACTERS.length}`}
        />
        <StatRow
          label={t("stats.bosses")}
          value={`${stats.bossesDefeated} / ${stats.bossesTotal}`}
        />
        {/* Combat */}
        <StatRow label={t("stats.kills")} value={`${stats.enemiesKilled}`} />
        <StatRow
          label={t("stats.enemyTypes")}
          value={`${monstersFound} / ${MONSTER_ROSTER.length}`}
        />
        <StatRow label={t("stats.deaths")} value={`${stats.deaths}`} />
        <StatRow label={t("stats.maxParty")} value={`${stats.maxPartySize}`} />
        {/* Journey */}
        <StatRow label={t("stats.days")} value={`${stats.days}`} />
        <StatRow label={t("stats.miles")} value={`${Math.round(stats.miles)}`} />
      </div>

      <h3 className="mt-6 font-serif text-lg text-neutral-200">
        {t("stats.charactersGallery")}{" "}
        <span className="text-sm text-neutral-500">
          {foundCharacterIds.size}/{CHARACTERS.length}
        </span>
      </h3>
      <div className="mt-2 grid grid-cols-5 gap-2 sm:grid-cols-9">
        {CHARACTERS.map((c) => (
          <Portrait
            key={c.id}
            src={c.icon}
            label={t(`char.${c.id}`)}
            found={foundCharacterIds.has(c.id)}
          />
        ))}
      </div>

      <h3 className="mt-6 font-serif text-lg text-neutral-200">
        {t("stats.enemiesGallery")}{" "}
        <span className="text-sm text-neutral-500">
          {monstersFound}/{MONSTER_ROSTER.length}
        </span>
      </h3>
      <div className="mt-2 grid grid-cols-5 gap-2 sm:grid-cols-9">
        {MONSTER_ROSTER.map((foe) => (
          <Portrait
            key={foe.icon}
            src={foe.icon}
            label={t(`monster.${iconKey(foe.icon)}`)}
            found={defeatedEnemyIcons.has(foe.icon)}
          />
        ))}
      </div>

      <h3 className="mt-6 font-serif text-lg text-neutral-200">
        {t("stats.bossesGallery")}{" "}
        <span className="text-sm text-neutral-500">
          {bossesFound}/{BOSS_ROSTER.length}
        </span>
      </h3>
      <div className="mt-2 grid grid-cols-5 gap-2 sm:grid-cols-9">
        {BOSS_ROSTER.map((foe) => (
          <Portrait
            key={foe.icon}
            src={foe.icon}
            label={t(`monster.${iconKey(foe.icon)}`)}
            found={defeatedEnemyIcons.has(foe.icon)}
          />
        ))}
      </div>
      </div>

      <div className="border-t border-neutral-800 p-4">
        <button
          type="button"
          className="w-full rounded border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700"
          onClick={onClose}
        >
          {t("stats.ok")}
        </button>
      </div>
    </Modal>
  );
}
