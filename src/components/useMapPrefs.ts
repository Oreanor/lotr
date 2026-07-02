import { useCallback, useEffect, useRef, useState } from "react";
import { usePersistentState } from "@/hooks";
import * as G from "@/game";
import type { LevelUpMode } from "@/components/modals";

// Parse/serialize helpers for the persistent UI prefs, kept at module scope so
// usePersistentState's effect doesn't re-run every render.
const parsePrefBool = (raw: string) => raw === "1";
const serializePrefBool = (value: boolean) => (value ? "1" : "0");
const parseMapIndex = (raw: string) => {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 && n < G.MAP_VARIANTS.length ? n : G.MAP_VARIANTS.length - 1;
};
const parsePrefTheme = (raw: string): "dark" | "light" => (raw === "light" ? "light" : "dark");
const identityPref = (value: string) => value;
const LEVELUP_MODE_VALUES: LevelUpMode[] = [
  "random",
  "randomAll",
  "strengthAll",
  "defenseAll",
  "intelligenceAll",
  "luckAll",
];
const parseLevelUpMode = (raw: string): LevelUpMode =>
  (LEVELUP_MODE_VALUES as string[]).includes(raw) ? (raw as LevelUpMode) : "random";

// Owns every per-browser UI preference (terrain/hero-path overlays, background
// map, theme, reaction chatter rate, level-up split mode), each mirrored to
// localStorage. Returns the raw values the map needs plus `settingsMenuProps` —
// a ready-to-spread bag of the preference controls for <MapSettingsMenu>.
export function useMapPrefs() {
  const [showTerrain, setShowTerrain] = usePersistentState(
    G.TERRAIN_PREF_KEY,
    false,
    parsePrefBool,
    serializePrefBool,
  );
  const [showHeroPath, setShowHeroPath] = useState(false);
  // Latest-value ref for the rAF travel loop (which closes over stale state):
  // only churn the hero-path state per frame while the trail is actually shown.
  const showHeroPathRef = useRef(showHeroPath);
  showHeroPathRef.current = showHeroPath;
  // Which of G.MAP_VARIANTS to draw as the background; defaults to the last.
  const [mapIndex, setMapIndex] = usePersistentState(
    G.MAP_PREF_KEY,
    G.MAP_VARIANTS.length - 1,
    parseMapIndex,
    String,
  );
  // Keep the current map shown (dimmed + spinner) until the next is fetched, then
  // swap so it appears instantly with no half-loaded flash.
  const [mapLoading, setMapLoading] = useState(false);
  const cycleMap = useCallback(() => {
    const next = (mapIndex + 1) % G.MAP_VARIANTS.length;
    setMapLoading(true);
    const img = new Image();
    const swap = () => {
      setMapIndex(next);
      setMapLoading(false);
    };
    img.onload = swap;
    img.onerror = swap;
    img.src = G.MAP_VARIANTS[next];
  }, [mapIndex, setMapIndex]);
  const [theme, setTheme] = usePersistentState<"dark" | "light">(
    G.THEME_PREF_KEY,
    "dark",
    parsePrefTheme,
    identityPref,
  );
  const [reactionMode, setReactionMode] = usePersistentState<"often" | "rare" | "never">(
    G.REACTIONS_PREF_KEY,
    "often",
    (raw) => (raw === "rare" ? "rare" : raw === "never" || raw === "0" ? "never" : "often"),
    identityPref,
  );
  // 1 = often, 0.5 = rare, 0 = never. Multiplies every flavour-line probability.
  const reactionMultRef = useRef(1);
  reactionMultRef.current = reactionMode === "never" ? 0 : reactionMode === "rare" ? 0.5 : 1;
  const [levelUpMode, setLevelUpMode] = usePersistentState<LevelUpMode>(
    G.LEVELUP_MODE_PREF_KEY,
    "random",
    parseLevelUpMode,
    identityPref,
  );

  // Apply the theme to the document root so index.css's CSS-variable palette swaps.
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light") {
      root.dataset.theme = "light";
    } else {
      delete root.dataset.theme;
    }
  }, [theme]);

  const settingsMenuProps = {
    showTerrain,
    onToggleTerrain: () => setShowTerrain((prev) => !prev),
    showHeroPath,
    onToggleHeroPath: () => setShowHeroPath((prev) => !prev),
    reactionMode,
    onCycleReactions: () =>
      setReactionMode((prev) => (prev === "often" ? "rare" : prev === "rare" ? "never" : "often")),
    mapIndex,
    mapCount: G.MAP_VARIANTS.length,
    onCycleMap: cycleMap,
    theme,
    onToggleTheme: () => setTheme((prev) => (prev === "light" ? "dark" : "light")),
  };

  return {
    showTerrain,
    showHeroPath,
    showHeroPathRef,
    mapIndex,
    mapLoading,
    theme,
    setTheme,
    reactionMultRef,
    levelUpMode,
    setLevelUpMode,
    settingsMenuProps,
  };
}
