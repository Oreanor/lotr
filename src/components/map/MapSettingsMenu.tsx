import { useTranslation } from "react-i18next";
import {
  BarChart3,
  Eye,
  EyeOff,
  Gauge,
  LogOut,
  Map as MapIcon,
  MessageCircle,
  MessageCircleOff,
  Moon,
  RotateCcw,
  Route,
  ScrollText,
  Settings,
  Sun,
} from "lucide-react";

// The gear button + dropdown in the map's top-right: layer/path/map/theme/speed
// toggles, language, stats, help, restart. Pure presentation — the page owns the
// state and passes values + handlers.
export function MapSettingsMenu({
  open,
  onToggle,
  showTerrain,
  onToggleTerrain,
  showHeroPath,
  onToggleHeroPath,
  reactionMode,
  onCycleReactions,
  mapIndex,
  mapCount,
  onCycleMap,
  theme,
  onToggleTheme,
  speed,
  onCycleSpeed,
  lang,
  onToggleLang,
  onStats,
  onChronicle,
  onHelp,
  onRestart,
  onExit,
}: {
  open: boolean;
  onToggle: () => void;
  showTerrain: boolean;
  onToggleTerrain: () => void;
  showHeroPath: boolean;
  onToggleHeroPath: () => void;
  reactionMode: "often" | "rare" | "never";
  onCycleReactions: () => void;
  mapIndex: number;
  mapCount: number;
  onCycleMap: () => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  speed: number;
  onCycleSpeed: () => void;
  lang: string;
  onToggleLang: () => void;
  onStats: () => void;
  onChronicle: () => void;
  onHelp: () => void;
  onRestart: () => void;
  // Desktop-only (Tauri). Omitted in the web build, where the row is hidden.
  onExit?: () => void;
}) {
  const { t } = useTranslation();
  const row = "flex items-center gap-2.5 rounded px-2.5 py-2 text-left text-sm text-neutral-200 transition hover:bg-neutral-800";
  return (
    <div
      className="absolute right-4 top-4 z-50"
      onPointerDown={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={t("ui.settings")}
        title={t("ui.settings")}
        aria-pressed={open}
        className="flex size-9 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900/90 text-neutral-200 transition hover:bg-neutral-800 aria-pressed:bg-neutral-800"
      >
        <Settings className="size-4" />
      </button>
      {open && (
        <>
          {/* Click-away layer: tapping anywhere outside the menu closes it. */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={onToggle}
            className="fixed inset-0 z-40 cursor-default"
          />
        <div className="absolute right-0 top-full z-50 mt-2 flex w-52 flex-col gap-0.5 rounded border border-neutral-700 bg-neutral-900/95 p-1.5 shadow-2xl">
          <button type="button" onClick={onToggleTerrain} className={row}>
            {showTerrain ? <Eye className="size-4 shrink-0" /> : <EyeOff className="size-4 shrink-0" />}
            <span className="flex-1">{t("ui.terrain")}</span>
            <span className="text-xs text-neutral-400">{showTerrain ? t("ui.on") : t("ui.off")}</span>
          </button>
          <button type="button" onClick={onToggleHeroPath} className={row}>
            <Route className="size-4 shrink-0" />
            <span className="flex-1">{t("ui.heroPath")}</span>
            <span className="text-xs text-neutral-400">{showHeroPath ? t("ui.on") : t("ui.off")}</span>
          </button>
          <button type="button" onClick={onCycleReactions} className={row}>
            {reactionMode === "never" ? (
              <MessageCircleOff className="size-4 shrink-0" />
            ) : (
              <MessageCircle className="size-4 shrink-0" />
            )}
            <span className="flex-1">{t("ui.reactions")}</span>
            <span className="text-xs text-neutral-400">{t(`ui.reaction_${reactionMode}`)}</span>
          </button>
          {mapCount > 1 && (
            <button type="button" onClick={onCycleMap} className={row}>
              <MapIcon className="size-4 shrink-0" />
              <span className="flex-1">{t("ui.map")}</span>
              <span className="text-xs text-neutral-400">
                {mapIndex + 1}/{mapCount}
              </span>
            </button>
          )}
          <button type="button" onClick={onToggleTheme} className={row}>
            {theme === "light" ? <Sun className="size-4 shrink-0" /> : <Moon className="size-4 shrink-0" />}
            <span className="flex-1">{t("ui.theme")}</span>
            <span className="text-xs text-neutral-400">
              {theme === "light" ? t("ui.themeLight") : t("ui.themeDark")}
            </span>
          </button>
          <button type="button" onClick={onCycleSpeed} className={row}>
            <Gauge className="size-4 shrink-0" />
            <span className="flex-1">{t("ui.speed")}</span>
            <span className="text-xs text-neutral-400">{speed}×</span>
          </button>
          <div className="my-1 border-t border-neutral-800" />
          <button type="button" onClick={onToggleLang} className={row}>
            <span className="flex size-4 shrink-0 items-center justify-center text-[11px] font-bold">
              {lang === "en" ? "RU" : "EN"}
            </span>
            <span className="flex-1">{lang === "en" ? "Русский" : "English"}</span>
          </button>
          <button type="button" onClick={onStats} className={row}>
            <BarChart3 className="size-4 shrink-0" />
            <span className="flex-1">{t("ui.stats")}</span>
          </button>
          <button type="button" onClick={onChronicle} className={row}>
            <ScrollText className="size-4 shrink-0" />
            <span className="flex-1">{t("ui.chronicle")}</span>
          </button>
          <button type="button" onClick={onHelp} className={row}>
            <span className="flex size-4 shrink-0 items-center justify-center text-base font-bold">?</span>
            <span className="flex-1">{t("ui.help")}</span>
          </button>
          <button type="button" onClick={onRestart} className={row}>
            <RotateCcw className="size-4 shrink-0" />
            <span className="flex-1">{t("ui.restart")}</span>
          </button>
          {onExit && (
            <button type="button" onClick={onExit} className={row}>
              <LogOut className="size-4 shrink-0" />
              <span className="flex-1">{t("ui.exit")}</span>
            </button>
          )}
        </div>
        </>
      )}
    </div>
  );
}
