import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { MouseEvent as ReactMouseEvent } from "react";
import { LocateFixed, Split, Square, Users, Wheat, ZoomIn } from "lucide-react";
import { HoverHint } from "@/components/ui/HoverHint";
import { healthBarColorClass, healthBarWidthPct } from "@/components/ui/healthBar";
import { TransportIcon } from "@/components/ui/TransportIcon";
import { Modal } from "@/components/ui/Modal";
import { HelpModal } from "@/components/modals/HelpModal";
import { StatsModal, type GameStats } from "@/components/modals/StatsModal";
import { PartySummaryModal, type PartySummaryRow } from "@/components/modals/PartySummaryModal";
import {
  DeathNoticeModal,
  FarmResultModal,
  RecruitRefusalModal,
  SamCatchUpModal,
} from "@/components/modals/Notices";
import { EndingModal } from "@/components/modals/EndingModal";
import { SpeechModal } from "@/components/modals/SpeechModal";
import { MapSettingsMenu } from "@/components/map/MapSettingsMenu";
import type { Ending } from "@/components/modals/EndingModal";
import { RogueFledModal } from "@/components/modals/RogueModals";
import { EncounterModal } from "@/components/modals/EncounterModal";
import { BattleModal } from "@/components/modals/BattleModal";
import { EscapeFailedModal } from "@/components/modals/EscapeFailedModal";
import { ExploreResultModal } from "@/components/modals/ExploreResultModal";
import type { ExploreResult } from "@/components/modals/ExploreResultModal";
import { TalkResultModal } from "@/components/modals/TalkResultModal";
import type { TalkResult } from "@/components/modals/TalkResultModal";
import { OrodruinModal } from "@/components/modals/OrodruinModal";
import { RecruitOfferModal } from "@/components/modals/RecruitOfferModal";
import { LevelUpModal } from "@/components/modals/LevelUpModal";
import { CreationModal } from "@/components/modals/CreationModal";
import { usePersistentState } from "@/hooks/usePersistentState";
import { useMapCamera } from "@/hooks/useMapCamera";
import { Preloader } from "@/components/modals/Preloader";
import { SplitModal } from "@/components/modals/SplitModal";
import { LocationModal } from "@/components/modals/LocationModal";
import { CharacterModal } from "@/components/modals/CharacterModal";
import { EaglesLeftModal, TransportConfirmModal } from "@/components/modals/TransportModals";
import { useSpeedSettings } from "@/hooks/useSpeedSettings";
import { useTerrainGrid } from "@/hooks/useTerrainGrid";
import { useBattleClock } from "@/hooks/useBattleClock";
import {
  addBonus,
  appendPathPoint,
  ARAGORN_ENCOUNTER_MULTIPLIER,
  PARTY_INT_STEALTH_BASELINE,
  PARTY_INT_STEALTH_PER_POINT,
  PARTY_INT_STEALTH_FLOOR,
  PARTY_STEALTH_NEUTRAL_SIZE,
  PARTY_STEALTH_PER_MEMBER,
  PARTY_STEALTH_FLOOR,
  PARTY_STEALTH_CEIL,
  auraBonus,
  AUTO_MAX_TURN_STEPS,
  AUTO_ROUTE,
  AUTO_STALL_MS,
  AUTO_TURN_DEG,
  autoAssignLevelUpPoints,
  autoFarmStopThreshold,
  autoPlayNextStoryRecruit,
  autoPlayShouldFarm,
  autoPlayShouldFleeEncounter,
  autoPlayShouldWaitAtLocation,
  BEAST_MONSTERS,
  BETRAYAL_CHANCE,
  BETRAYAL_GRACE_DAYS,
  RELUCTANT_RECRUIT_ATTEMPTS,
  BOMBADIL_LEAVE_CHANCE,
  bonusPoints,
  BOSS_NAMES,
  BOSSES_BY_LOCATION,
  BARAD_DUR_ID,
  CARN_DUM_ID,
  CORSAIRS_CITY_ID,
  CORSAIR_ENEMY,
  MONSTERS,
  clearSave,
  CHARACTERS,
  CLOAKS_ENCOUNTER_MULTIPLIER,
  clamp,
  computeCharacterStats,
  createEncounter,
  CREATION_POINTS,
  DEFAULT_PARTY,
  EAGLE_PRESENCE_CHANCE,
  EAGLE_STAY_DAYS,
  effectiveStats,
  itemStatBonus,
  itemAttackBonus,
  ENCOUNTER_CHANCE_PER_DAY,
  BOMBADIL_SLOW_FACTOR,
  EOMER_SPEED_MULTIPLIER,
  FOLLOW_MARGIN_RATIO,
  FOOD_SUPPLY_LOCATION_IDS,
  FOOD_DAYS_BASE,
  foodCapacityFor,
  GANDALF_HEAL_MULTIPLIER,
  getJourneyDate,
  getLocationLabel,
  getStartPosition,
  HEAL_PER_DAY,
  maxHpFromStats,
  HUNGER_DAMAGE_FRACTION,
  HOBBITON_ID,
  iconVariant,
  INITIAL_FOOD_DAYS,
  EDORAS_ID,
  INITIAL_HERO_PROGRESS,
  isCharacterRecruitableHere,
  ISENGARD_ID,
  ERECH_ID,
  WEATHERTOP_ID,
  THARBAD_ID,
  DOL_GULDUR_ID,
  levelForExp,
  loadSave,
  locationData,
  locationImage,
  LOTHLORIEN_ID,
  mapImage,
  MAP_VARIANTS,
  MAP_PREF_KEY,
  THEME_PREF_KEY,
  MAX_PATH_POINTS,
  MAX_WATER_CROSSING_CELLS,
  MEMBER_PICKUP_RANGE,
  MILES_PER_DAY,
  MINAS_MORGUL_ID,
  monsterExp,
  GONDOR_ARMOR_IDS,
  GONDOR_CACHE_MAX,
  GONDOR_SWORD_IDS,
  GRIMA_ENEMY,
  SARUMAN_ENEMY,
  HELMS_DEEP_ID,
  ROHAN_ARMORY_IDS,
  MORIA_GATE_ID,
  MOVE_SUBSTEPS,
  NAZGUL_ENEMY,
  DOL_GULDUR_WRAITH,
  DOL_GULDUR_CAPTAIN,
  DOL_GULDUR_GARRISON,
  WEATHERTOP_WITCHKING,
  NON_BEARERS,
  ORODRUIN_ID,
  OSGILIATH_ID,
  PLAYER_ICON,
  preloadedLocationImages,
  preloadImage,
  preloadLocationImage,
  RANDOM_PRESENCE,
  recruitRefusalKey,
  resolveBattleInstantly,
  RING_BEARER_ID,
  ROGUE_CHASE_DAYS,
  ROGUE_ENCOUNTER_CHANCE,
  ROGUE_MIN_CHASE_DAYS,
  type RecruitRefusalNotice,
  ringImage,
  regionAt,
  rollEncounter,
  rollEscape,
  escapeChance,
  partyLuck,
  ITEMS,
  ITEM_BY_ID,
  GIFTS_BY_CHARACTER,
  CLOAK_GIVERS,
  EXPLORE_ITEM_BY_LOCATION,
  WRAITH_FOES,
  ORC_FOES,
  SHELOB_NAME,
  WIGHT_NAME,
  HOBBIT_IDS,
  LOFTY_TALKERS,
  rollStatBonus,
  SAM_FARM_BONUS,
  SAM_CATCH_UP_FOOD_DAYS,
  seasonAt,
  slainRoamingRecruitIds,
  SLIDE_DEFLECTIONS,
  SPEED_PX_PER_SECOND,
  TERRAIN_OVERLAY_OPACITY,
  TERRAIN_PREF_KEY,
  terrainImage,
  TRAITORS,
  TRANSPORT_BY_LOCATION,
  TRANSPORTS,
  HARBOR_IDS,
  SHIP_BOARD_OFFSET,
  SHIP_PRESENCE_CHANCE,
  CIRDAN_SEA_SPEED,
  CORSAIR_SEA_MAX,
  CORSAIR_SEA_POWER,
  unspentPointsFor,
  RING_PIERCING_FOES,
  RINGWRAITH_FOES,
  SARUMAN_NAME,
  SARUMAN_ENCOUNTER_CHANCE,
  SARUMAN_SCOUR_DAYS,
  writeSave,
  ZERO_BONUS,
} from "@/game";
import type {
  BattleState,
  Character,
  Combatant,
  DeathCause,
  EncounterState,
  MapLocation,
  Monster,
  Point,
  Size,
  Squad,
  StatBonus,
  TransportId,
} from "@/game";

// Stable parse/serialize helpers for the persistent UI prefs (kept at module
// scope so usePersistentState's effect doesn't re-run every render).
const parsePrefBool = (raw: string) => raw === "1";
const serializePrefBool = (value: boolean) => (value ? "1" : "0");
const parseMapIndex = (raw: string) => {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 && n < MAP_VARIANTS.length ? n : MAP_VARIANTS.length - 1;
};
const parsePrefTheme = (raw: string): "dark" | "light" => (raw === "light" ? "light" : "dark");
const identityPref = (value: string) => value;

export default function MiddleEarthMap() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  // Memoized so the array identity is stable per language — otherwise every
  // render rebuilt the recruitment calendar and the journey date for nothing.
  const months = useMemo(() => t("months", { returnObjects: true }) as unknown as string[], [t]);
  // Localized display names (logic still keys off ids / canonical names).
  const charName = useCallback((id: string) => t(`char.${id}`), [t]);
  const monsterName = useCallback(
    (icon: string) => t(`monster.${icon.split("/").pop()?.replace(".png", "")}`),
    [t],
  );
  const locName = useCallback((loc: MapLocation) => getLocationLabel(loc, lang), [lang]);
  const toggleLang = () => i18n.changeLanguage(lang === "en" ? "ru" : "en");

  // Snapshot of a saved game (if any), read once. Seeds the state below so an
  // accidental reload resumes from the last stop/town.
  const [initialSave] = useState(loadSave);

  // Day each companion joined the party (for the betrayal grace period).
  const joinDayRef = useRef<Record<string, number>>(initialSave?.joinDay ?? {});
  const frameRef = useRef<number | null>(null);
  const journeyMilesRef = useRef(initialSave?.journeyMiles ?? 0);
  const journeyDayRef = useRef(initialSave?.journeyDay ?? 0);
  const openVisitedLocationRef = useRef<(location: MapLocation) => void>(() => {});
  const initialLocationOpenedRef = useRef(false);
  const autoRouteIndexRef = useRef(0);
  const autoPlayRef = useRef(false);
  const autoSteerRef = useRef({
    bestGoalDist: Number.POSITIVE_INFINITY,
    stallMs: 0,
    turnSign: 1 as 1 | -1,
    turnIndex: 0,
  });
  const autoPlayTickRef = useRef<() => void>(() => {});
  const lastTimeRef = useRef<number | null>(null);
  const playerRef = useRef<Point | null>(null);
  const recruitAttemptsRef = useRef<Record<string, number>>(initialSave?.recruitAttempts ?? {});
  // Cap the drawn trail only on touch devices (weak in-app browsers); desktop
  // keeps the full path. Computed once.
  const trailCapRef = useRef<number | undefined>(
    typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches
      ? MAX_PATH_POINTS
      : undefined,
  );
  // Distinct water cells stepped through since last on land. You may revisit
  // these (to turn back) but can't enter more than MAX new ones — so a band of
  // water wider than that simply can't be crossed on foot.
  const waterRunRef = useRef<Set<string>>(new Set());
  // The travelling figure, moved imperatively each frame during a march so the
  // journey doesn't re-render the whole component 60×/sec (see the rAF loop).
  const figureRef = useRef<HTMLButtonElement | null>(null);
  // Live "a modal is up — ignore map input" flag + tap-to-move handler, fed to
  // the camera hook via refs so its gesture handlers stay stable.
  const mapInputLockedRef = useRef(false);
  const onTapRef = useRef<(clientX: number, clientY: number) => void>(() => {});
  // Current transport, mirrored into a ref so the rAF loop reads it live.
  const transportRef = useRef<TransportId | null>(null);
  const partyRef = useRef<string[]>(DEFAULT_PARTY);
  // Bearer's current corruption (0-100), mirrored so callbacks defined before it
  // is computed (auto-play) can still read it.
  const bearerCorruptionRef = useRef(0);
  // Equipped items mirrored for the rAF travel loop (item speed bonuses).
  const equippedItemsRef = useRef<Record<string, string>>({});
  // Party members present when the current location was entered; used to hide
  // already-recruited companions on repeat visits.
  const [entryParty, setEntryParty] = useState<Set<string>>(
    () => new Set(initialSave?.party ?? DEFAULT_PARTY),
  );

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

  const { animationSpeed, battleSpeed, cycleSpeed, cycleBattleSpeed } = useSpeedSettings();
  // The whole map camera (zoom/offset/pan/pinch/wheel/follow/centering) lives in
  // one hook; values come back under the same names the rest of the file uses.
  const {
    view,
    zoom,
    offset,
    setOffset,
    dragRef,
    viewportRef,
    mapImgRef,
    terrainImgRef,
    overlayRef,
    offsetRef,
    zoomRef,
    baseZoomRef,
    viewRef,
    followDisabledRef,
    clampOffset,
    mapToLayer,
    screenToMap,
    centerOnPlayer,
    cycleZoom,
    writePanTransform,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
  } = useMapCamera({
    mapSize,
    initialFocus: getStartPosition(hobbiton.point),
    resizeFocus: hobbiton.point,
    playerRef,
    mapInputLockedRef,
    onTapRef,
  });
  const { terrainReady, getTerrainAtPoint } = useTerrainGrid(mapSize);
  const [player, setPlayer] = useState<Point>(() => {
    const start = initialSave?.player ?? getStartPosition(hobbiton.point);
    playerRef.current = start;
    return start;
  });
  const [heroPath, setHeroPath] = useState<Point[]>(
    () => [initialSave?.player ?? getStartPosition(hobbiton.point)],
  );
  const [showHeroPath, setShowHeroPath] = useState(false);
  // Latest-value ref for the rAF travel loop (which closes over stale state):
  // only churn the hero-path state per frame while the trail is actually shown.
  const showHeroPathRef = useRef(showHeroPath);
  showHeroPathRef.current = showHeroPath;
  const [journeyDay, setJourneyDay] = useState(initialSave?.journeyDay ?? 0);
  const [target, setTarget] = useState<Point | null>(null);
  const [targetLocation, setTargetLocation] = useState<MapLocation | null>(null);
  // Location card opens after its seasonal artwork has been preloaded.
  const [visitedLocation, setVisitedLocation] = useState<MapLocation | null>(null);
  // Location the party is physically standing in, even if its card was closed.
  const [currentLocation, setCurrentLocation] = useState<MapLocation | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  // Manually halted mid-journey: the destination (and its marker) is kept so the
  // march can be resumed; only a fresh target clears it.
  const [stopped, setStopped] = useState(false);
  // Per-browser UI preferences, each mirrored to localStorage (see usePersistentState).
  const [showTerrain, setShowTerrain] = usePersistentState(
    TERRAIN_PREF_KEY,
    false,
    parsePrefBool,
    serializePrefBool,
  );
  // Which of MAP_VARIANTS to draw as the background; defaults to the last (colour map3).
  const [mapIndex, setMapIndex] = usePersistentState(
    MAP_PREF_KEY,
    MAP_VARIANTS.length - 1,
    parseMapIndex,
    String,
  );
  // Interface theme: "dark" (default) or "light" (parchment).
  const [theme, setTheme] = usePersistentState<"dark" | "light">(
    THEME_PREF_KEY,
    "dark",
    parsePrefTheme,
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
  const [openCharacterId, setOpenCharacterId] = useState<string | null>(null);
  // Whether the open details panel can page through the party (arrows). True
  // only when opened from the party HUD or by clicking the hero on the map.
  const [openCharacterPaging, setOpenCharacterPaging] = useState(false);
  const [ending, setEnding] = useState<Ending | null>(null);
  // The Ring fled with this companion (bearer broke at 100% or a betrayer won);
  // null means the party holds the Ring. While set, the party is "ringless".
  const [rogueBearerId, setRogueBearerId] = useState<string | null>(null);
  const [rogueSinceDay, setRogueSinceDay] = useState<number | null>(null);
  // After beating the rogue: pick who receives the reclaimed Ring (id shown).
  const [reclaimedFrom, setReclaimedFrom] = useState<string | null>(null);
  // "X fled with the Ring" notice, shown once when the flight begins.
  const [rogueFledNotice, setRogueFledNotice] = useState<string | null>(null);
  const [lordClaimed, setLordClaimed] = useState(false);
  // Set when the bearer overrode a choice to destroy the Ring and claimed it.
  const [doomBetrayal, setDoomBetrayal] = useState(false);
  const [party, setParty] = useState<string[]>(initialSave?.party ?? DEFAULT_PARTY);
  // Special items: found pool and who carries what.
  const [foundItems, setFoundItems] = useState<string[]>(initialSave?.foundItems ?? []);
  const [equippedItems, setEquippedItems] = useState<Record<string, string>>(
    initialSave?.equippedItems ?? {},
  );
  // Result of the last location search, shown in a modal (null = closed).
  const [exploreResult, setExploreResult] = useState<ExploreResult | null>(null);
  // Aragorn summoned the Dead at Erech — the undead no longer assail the party.
  const [deadSummoned, setDeadSummoned] = useState<boolean>(initialSave?.deadSummoned ?? false);
  const [samCaughtUp, setSamCaughtUp] = useState<boolean>(initialSave?.samCaughtUp ?? false);
  // Gríma Wormtongue: sits at Edoras blocking Théoden until Gandalf scares him
  // off (grimaFled), then turns up at Isengard or roams the wild until slain.
  const [grimaFled, setGrimaFled] = useState<boolean>(initialSave?.grimaFled ?? false);
  const [grimaSlain, setGrimaSlain] = useState<boolean>(initialSave?.grimaSlain ?? false);
  // Gandalf has cowed Gríma at Edoras, but he stays on the card until the player
  // dismisses the "he flees" notice — only then does he actually slip away.
  const [grimaFleePending, setGrimaFleePending] = useState(false);
  // Shown once: Treebeard's farewell at fallen Isengard (he stays to tend it).
  const [treebeardFarewell, setTreebeardFarewell] = useState(false);
  // Entry speeches at Tharbad (Gandalf, then Boromir, whoever is along), shown
  // one modal after another. Reset on leaving so each visit greets afresh.
  const [tharbadSpeech, setTharbadSpeech] = useState<"gandalf" | "boromir" | null>(null);
  const tharbadGreetedRef = useRef(false);
  // The Osgiliath ruins yield a Gondorian armoury cache exactly once.
  const [osgiliathCacheFound, setOsgiliathCacheFound] = useState<boolean>(
    initialSave?.osgiliathCacheFound ?? false,
  );
  // The Corsair captain has been talked round into letting the party sail in peace.
  const [corsairPeace, setCorsairPeace] = useState<boolean>(initialSave?.corsairPeace ?? false);
  // The three wraiths posted at Dol Guldur have been slain — so Minas Morgul
  // musters six of the Nine, not nine.
  const [dolGuldurNazgulSlain, setDolGuldurNazgulSlain] = useState<boolean>(
    initialSave?.dolGuldurNazgulSlain ?? false,
  );
  // Saruman spared at Isengard — alive, roaming the NW and holding the Shire
  // (the Scouring) until run down and slain. The day he was let go drives the
  // two-month countdown to the Scouring.
  const [sarumanSpared, setSarumanSpared] = useState<boolean>(initialSave?.sarumanSpared ?? false);
  const [sarumanSparedDay, setSarumanSparedDay] = useState<number>(initialSave?.sarumanSparedDay ?? 0);
  // The One Ring has been cast into the Fire — the Ban over the West may lift.
  const [ringDestroyed, setRingDestroyed] = useState(initialSave?.ringDestroyed ?? false);
  // A ship has reached the world's western edge — offer the passage to Valinor.
  const [valinorAttempt, setValinorAttempt] = useState(false);
  const [samCatchUpOpen, setSamCatchUpOpen] = useState(false);
  // Result of talking to a companion: a greeting or items handed over.
  const [talkResult, setTalkResult] = useState<TalkResult | null>(null);
  const [bearerId, setBearerId] = useState(initialSave?.bearerId ?? RING_BEARER_ID);
  const [transport, setTransport] = useState<TransportId | null>(initialSave?.transport ?? null);
  // Eagles of Manwë: offered only on some Carn Dûm visits, and they leave after
  // a month. `eagleSince` is the journey day they joined (null when not flying).
  const [eagleOffered, setEagleOffered] = useState(false);
  // A ship happens to be in port this visit — rolled per harbour (see rollPresence).
  const [shipOffered, setShipOffered] = useState(false);
  const [eagleSince, setEagleSince] = useState<number | null>(initialSave?.eagleSince ?? null);
  const [eaglesLeft, setEaglesLeft] = useState(false);
  // A transport swap awaiting the player's confirmation (replaces the current one).
  const [pendingTransport, setPendingTransport] = useState<TransportId | null>(null);
  // Food (days left) and per-character starvation damage are simulated per day.
  // Damage is per character so new recruits join at full health; with double
  // rations on, a damaged party heals at the cost of extra food.
  const [food, setFood] = useState(initialSave?.food ?? INITIAL_FOOD_DAYS);
  const [damageById, setDamageById] = useState<Record<string, number>>(initialSave?.damageById ?? {});
  const [deathNotice, setDeathNotice] = useState<{ ids: string; cause: DeathCause } | null>(null);
  const [deathCauseById, setDeathCauseById] = useState<Record<string, DeathCause>>(
    initialSave?.deathCauseById ?? {},
  );
  const [foodFarmed, setFoodFarmed] = useState<number | null>(null);
  const [randomPresence, setRandomPresence] = useState<Record<string, boolean>>({});
  const [recruitRefusal, setRecruitRefusal] = useState<RecruitRefusalNotice | null>(null);
  // After defeating a recruitable foe: offer to invite them.
  const [recruitOffer, setRecruitOffer] = useState<string | null>(null);
  const [pendingExploreRecruit, setPendingExploreRecruit] = useState<string | null>(null);
  // The current offer is a peaceful "wants to join" (no battle, joins at full HP).
  const [peacefulOffer, setPeacefulOffer] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  // Party roster overview, shown when tapping the group's figure on the map.
  const [partySummaryOpen, setPartySummaryOpen] = useState(false);
  // Settings dropdown (terrain / hero-path / speed / language / help / restart).
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Restart-the-game confirmation dialog (wipes the save and reloads).
  const [restartConfirm, setRestartConfirm] = useState(false);
  // Hero creation: distribute CREATION_POINTS over Frodo's stats before play.
  // A loaded save means the hero was already created.
  const [created, setCreated] = useState(initialSave !== null);
  const [autoPlay, setAutoPlay] = useState(false);
  const [creationBonus, setCreationBonus] = useState<StatBonus>(ZERO_BONUS);
  // Level-up point allocation queue (shown one modal at a time after battle).
  const [levelUpQueue, setLevelUpQueue] = useState<string[]>([]);
  const [levelUpCharacterId, setLevelUpCharacterId] = useState<string | null>(null);
  const [levelUpDraft, setLevelUpDraft] = useState<StatBonus>(ZERO_BONUS);
  const [defeatedBosses, setDefeatedBosses] = useState<Set<string>>(
    () => new Set(initialSave?.defeatedBosses ?? []),
  );
  // Lifetime statistics, accumulated for the stats panel and persisted.
  const [visitedLocationIds, setVisitedLocationIds] = useState<Set<number>>(
    () => new Set(initialSave?.visitedLocationIds ?? []),
  );
  const [enemiesKilled, setEnemiesKilled] = useState<number>(initialSave?.enemiesKilled ?? 0);
  const [defeatedEnemyIcons, setDefeatedEnemyIcons] = useState<Set<string>>(
    () => new Set(initialSave?.defeatedEnemyIcons ?? []),
  );
  const [maxPartySize, setMaxPartySize] = useState<number>(
    initialSave?.maxPartySize ?? (initialSave?.party?.length ?? DEFAULT_PARTY.length),
  );
  // Everyone the party has laid eyes on — recruited, offered, refused, or faced
  // as a foe — so the "characters found" tally counts those who wouldn't join.
  const [metCharacterIds, setMetCharacterIds] = useState<Set<string>>(
    () => new Set(initialSave?.metCharacterIds ?? []),
  );
  // Roaming recruits never reappear once dead (Gollum slain in betrayal, starved, or fallen).
  const [slainRoamingRecruits, setSlainRoamingRecruits] = useState<Set<string>>(
    () => new Set(initialSave?.slainRoamingRecruits ?? []),
  );
  // Betrayers other than Gollum leave the story for good after turning on the bearer.
  const [banishedTraitors, setBanishedTraitors] = useState<Set<string>>(
    () => new Set(initialSave?.banishedTraitors ?? []),
  );
  const [pendingBetrayal, setPendingBetrayal] = useState<string | null>(null);
  // Splinter squads ambushed while idle, awaiting their turn in the single event
  // queue (played one at a time, switching focus to each).
  const [squadEncounterQueue, setSquadEncounterQueue] = useState<string[]>([]);
  // Splinter squads left waiting on the map. Each travels as a group; you can
  // take control of one via the squad switcher and walk it its own way. The
  // active squad is the live party/player; these are everyone else.
  const [squads, setSquads] = useState<Squad[]>(() => {
    if (initialSave?.squads) {
      return initialSave.squads;
    }
    // Migrate legacy per-companion drop points into one squad per cluster.
    const legacy = initialSave?.leftBehind ?? [];
    const groups: Squad[] = [];
    for (const member of legacy) {
      const group = groups.find(
        (g) => Math.hypot(g.point.x - member.point.x, g.point.y - member.point.y) < 30,
      );
      if (group) {
        group.members.push(member.id);
      } else {
        groups.push({ id: `squad-legacy-${groups.length}`, members: [member.id], point: member.point });
      }
    }
    return groups;
  });
  const squadsRef = useRef(squads);
  squadsRef.current = squads;
  const parkedMembers = useMemo(() => squads.flatMap((s) => s.members), [squads]);
  const squadSeqRef = useRef(0);
  // Brief face swap (refuse/joy) on a character's portrait when (de)recruited.
  const [emote, setEmote] = useState<{ id: string; kind: "refuse" | "joy" } | null>(null);
  const emoteTimerRef = useRef<number | null>(null);
  const [hasCloaks, setHasCloaks] = useState(initialSave?.hasCloaks ?? false);
  const [encounter, setEncounter] = useState<EncounterState | null>(null);
  const [battle, setBattle] = useState<BattleState | null>(null);
  // Which step of the Saruman mercy parley is showing (index into its speakers;
  // once past them, the spare/fight choice). Reset whenever a parley begins.
  const [parleyStep, setParleyStep] = useState(0);
  // A failed flee roll: "encounter" forces the fight on dismiss, "battle" just
  // closes (the one in-fight attempt is already spent).
  const [escapeFailed, setEscapeFailed] = useState<"encounter" | "battle" | null>(null);
  // A ship has reached a harbour and awaits the player's call to step ashore
  // (which loses the ship). Holds where to land and which haven, if any.
  const [pendingDisembark, setPendingDisembark] = useState<{
    point: Point;
    location: MapLocation | null;
  } | null>(null);
  const [expById, setExpById] = useState<Record<string, number>>(initialSave?.expById ?? {});
  const [statBonusById, setStatBonusById] = useState<Record<string, StatBonus>>(
    initialSave?.statBonusById ?? {},
  );
  // Extra days of Ring decay bought by putting it on in battle.
  const [ringWear, setRingWear] = useState(initialSave?.ringWear ?? 0);
  // Days each character has carried the Ring; corruption never resets on transfer.
  const [ringDaysById, setRingDaysById] = useState<Record<string, number>>(
    () =>
      initialSave?.ringDaysById ??
      (initialSave?.bearerId
        ? { [initialSave.bearerId]: initialSave.bearerRingDays ?? 0 }
        : { [RING_BEARER_ID]: 0 }),
  );
  const bearerRingDays = bearerId ? (ringDaysById[bearerId] ?? 0) : 0;
  // Seed the ring-day trackers so a loaded game doesn't re-accrue past days.
  const prevJourneyDayForRingRef = useRef(initialSave?.journeyDay ?? 0);
  const prevRingWearForRingRef = useRef(initialSave?.ringWear ?? 0);
  const battleAppliedRef = useRef(false);
  const foodRef = useRef(initialSave?.food ?? INITIAL_FOOD_DAYS);
  const damageRef = useRef<Record<string, number>>(initialSave?.damageById ?? {});
  // Days already simulated — start at the loaded day so they aren't replayed.
  const processedDayRef = useRef(initialSave?.journeyDay ?? 0);
  // Movement halts while any modal is open; the rAF loop reads this.
  const animationPausedRef = useRef(false);

  const openVisitedLocation = useCallback((location: MapLocation) => {
    // Snapshot who's already in the party as we arrive, so companions recruited
    // on an earlier visit aren't listed again — only the one just recruited
    // this visit shows "in party".
    const open = () => {
      setEntryParty(new Set(partyRef.current));
      setCurrentLocation(location);
      setVisitedLocation(location);
      setVisitedLocationIds((prev) =>
        prev.has(location.id) ? prev : new Set(prev).add(location.id),
      );
    };
    const src = locationImage(location.id, seasonAt(journeyDayRef.current));
    if (!src) {
      open();
      return;
    }
    void preloadLocationImage(src).then(open);
  }, []);

  useEffect(() => {
    openVisitedLocationRef.current = openVisitedLocation;
  }, [openVisitedLocation]);

  useEffect(() => {
    if (initialLocationOpenedRef.current) {
      return;
    }
    initialLocationOpenedRef.current = true;
    // Fresh game opens at Hobbiton; a resumed save drops you back where you
    // stopped, so don't pop the Hobbiton card.
    if (!initialSave) {
      openVisitedLocation(hobbiton);
    }
  }, [openVisitedLocation, hobbiton, initialSave]);

  const flashEmote = useCallback((id: string, kind: "refuse" | "joy") => {
    if (emoteTimerRef.current) {
      clearTimeout(emoteTimerRef.current);
    }
    setEmote({ id, kind });
    emoteTimerRef.current = window.setTimeout(() => setEmote(null), 500);
  }, []);

  const showRecruitRefusal = useCallback(
    (message: string, characterId?: string) => {
      if (characterId) {
        flashEmote(characterId, "refuse");
      }
      requestAnimationFrame(() => {
        setRecruitRefusal({ message, characterId });
      });
    },
    [flashEmote],
  );

  // Close the refusal notice — and, if it was Gríma being driven from Edoras,
  // only now let him slip away (he stayed visible behind the notice).
  const dismissRecruitRefusal = useCallback(() => {
    setRecruitRefusal(null);
    setGrimaFleePending((pending) => {
      if (pending) {
        setGrimaFled(true);
      }
      return false;
    });
  }, []);

  const recruitCharacter = useCallback(
    (id: string) => {
      setParty((prev) => {
        if (prev.includes(id)) {
          return prev;
        }
        // Stamp the join day so the Ring's corruption of traitors has a grace
        // period (and resets if they leave and are re-recruited later).
        joinDayRef.current[id] = journeyDayRef.current;
        return [...prev, id];
      });

      const progress = INITIAL_HERO_PROGRESS[id];
      if (progress) {
        setExpById((prev) => (id in prev ? prev : { ...prev, [id]: progress.exp }));
        setStatBonusById((prev) =>
          id in prev ? prev : { ...prev, [id]: { ...progress.bonus } },
        );
      }

      flashEmote(id, "joy");
    },
    [flashEmote],
  );

  const banishTraitor = useCallback((id: string) => {
    if (id === "gollum") {
      return;
    }
    setBanishedTraitors((prev) => new Set(prev).add(id));
    setSquads((prev) =>
      prev
        .map((s) => ({ ...s, members: s.members.filter((m) => m !== id) }))
        .filter((s) => s.members.length > 0),
    );
  }, []);

  // Try to recruit, honoring per-character conditions; refusals show a voiced
  // line.
  const attemptRecruit = useCallback(
    (character: Character) => {
      const refuse = (line: string) => {
        showRecruitRefusal(line, character.id);
      };

      // Deterministic party-composition rules (incl. Gollum's hobbits-only).
      const blockedKey = recruitRefusalKey(character.id, party);
      if (blockedKey) {
        refuse(t(blockedKey));
        return;
      }
      // Wormtongue will never leave the king's side — he only ever sneers you off.
      if (character.id === "grima") {
        refuse(t("refuse.grima"));
        return;
      }
      // While Gríma still whispers in Edoras, Théoden won't stir for "these
      // wanderers and their mad errand" — the king himself frowns you off
      // (Wormtongue's words, Théoden's face). Only Gandalf breaks that hold.
      if (character.id === "theoden" && !grimaFled) {
        refuse(t("refuse.theodenGrima"));
        return;
      }
      // Círdan only sails with a company wiser, on the whole, than himself.
      if (character.id === "cirdan") {
        const ids = partyRef.current;
        const avgInt = ids.length
          ? ids.reduce((sum, id) => {
              const c = CHARACTERS.find((ch) => ch.id === id);
              return (
                sum +
                (c
                  ? effectiveStats(c, addBonus(statBonusById[id] ?? ZERO_BONUS, auraBonus(c, ids)))
                      .intelligence
                  : 0)
              );
            }, 0) / ids.length
          : 0;
        if (avgInt <= character.intelligence) {
          refuse(t("refuse.cirdanWisdom"));
          return;
        }
      }
      // Reluctant recruits (Bilbo, Denethor…) only relent after enough pestering.
      const needed = RELUCTANT_RECRUIT_ATTEMPTS[character.id];
      if (needed) {
        recruitAttemptsRef.current[character.id] = (recruitAttemptsRef.current[character.id] ?? 0) + 1;
        if (recruitAttemptsRef.current[character.id] < needed) {
          refuse(t(`refuse.${character.id}`));
          return;
        }
      }
      recruitCharacter(character.id);
    },
    [bearerId, party, grimaFled, recruitCharacter, showRecruitRefusal, statBonusById, t],
  );

  // Invite the foe defeated in battle (or decline).
  const acceptRecruitOffer = useCallback(() => {
    const id = recruitOffer;
    const peaceful = peacefulOffer;
    setRecruitOffer(null);
    setPeacefulOffer(false);
    if (!id) {
      return;
    }
    // A companion waiting on the map simply rejoins; a beaten foe is recruited.
    if (parkedMembers.includes(id)) {
      setSquads((prev) =>
        prev
          .map((s) => ({ ...s, members: s.members.filter((m) => m !== id) }))
          .filter((s) => s.members.length > 0),
      );
      recruitCharacter(id);
      return;
    }
    const character = CHARACTERS.find((c) => c.id === id);
    if (character) {
      // Subdued in battle → joins wounded (half health); a peaceful join is unhurt.
      if (!peaceful) {
        const half = Math.floor(maxHpFromStats(character.strength, character.defense) / 2);
        damageRef.current = { ...damageRef.current, [id]: half };
        setDamageById(damageRef.current);
      }
      attemptRecruit(character);
      // Éomer sends his sister Éowyn home as he joins; she's recruitable again at
      // Edoras (we only drop her from the party, never mark her gone).
      if (id === "eomer" && partyRef.current.includes("eowyn")) {
        setParty((prev) => prev.filter((memberId) => memberId !== "eowyn"));
        showRecruitRefusal(t("refuse.eomerSendsEowyn"), "eowyn");
      }
    }
  }, [recruitOffer, peacefulOffer, parkedMembers, recruitCharacter, attemptRecruit, showRecruitRefusal, t]);

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
        const maxHp = maxHpFromStats(s.strength, s.defense);
        return {
          key: c.id,
          name: c.name,
          icon: c.icon,
          hp: Math.max(1, maxHp - (damageById[c.id] ?? 0)),
          maxHp,
          strength: s.strength,
          attack: s.strength,
          defense: s.defense,
          luck: s.luck,
          intelligence: s.intelligence,
          level: levelForExp(expById[c.id] ?? 0).level,
        };
      };
      battleAppliedRef.current = false;
      setEncounter(null);
      let battleState: BattleState = {
        allies: [toCombatant(bearer)],
        enemies: [toCombatant(traitor)],
        exp: 0,
        turn: "allies",
        index: 0,
        outcome: null,
        lastHit: null,
        attacker: null,
        tick: 0,
        hitDir: 0,
        bearerKey: bearer.id,
        ringOn: false,
        fleeUsed: false,
        recruitId: null,
        enemyBeast: false,
        // These betrayers are no wraiths — the Ring still hides the bearer.
        ringIneffective: !["saruman", "boromir", "bilbo"].includes(traitorId),
        betrayalBy: traitorId,
        gandalfOnly: false,
        rogueId: null,
        invisibleEnemy: false,
        phialBlinded: false,
      };
      if (autoPlayRef.current) {
        battleState = resolveBattleInstantly(battleState);
      }
      setBattle(battleState);
    },
    [bearerId, party, statBonusById, damageById],
  );

  // Leave a companion at the current spot. Everyone left at the same place forms
  // a single splinter squad you can later take control of (never empty the
  // active squad — at least one must carry on).
  const leaveMember = useCallback(
    (id: string) => {
      if (partyRef.current.length <= 1) {
        return;
      }
      const point = playerRef.current ?? hobbiton.point;
      setSquads((prev) => {
        const idx = prev.findIndex(
          (s) => Math.hypot(s.point.x - point.x, s.point.y - point.y) < 1,
        );
        if (idx >= 0) {
          const next = prev.slice();
          next[idx] = { ...next[idx], members: [...next[idx].members, id] };
          return next;
        }
        return [
          ...prev,
          {
            id: `squad-${Date.now().toString(36)}-${squadSeqRef.current++}`,
            members: [id],
            point: { x: point.x, y: point.y },
          },
        ];
      });
      setParty((prev) => prev.filter((p) => p !== id));
    },
    [hobbiton],
  );

  // Dismiss a companion for good (never the last one standing).
  const dismissMember = useCallback((id: string) => {
    if (partyRef.current.length <= 1) {
      return;
    }
    setParty((prev) => prev.filter((p) => p !== id));
  }, []);

  // "Принять бой" → snapshot party + enemy into a paced auto-battle. Pass an
  // encounter to launch the fight straight off (e.g. a chosen boss), skipping
  // the "you met a foe" prompt; default to the current wild encounter.
  const startBattle = useCallback((enc: EncounterState | null = encounter) => {
    if (!enc) {
      return;
    }
    // Carried items lend bonus attack against the right foes here.
    const packHasUndead = enc.pack.some((mm) => WRAITH_FOES.has(mm.name));
    const packHasOrcs = enc.pack.some((mm) => ORC_FOES.has(mm.name));
    // The Phial of Galadriel blinds Shelob — her strength is halved.
    const partyHasPhial = party.some((id) => equippedItems[id] === "phial");
    const phialBlinded = partyHasPhial && enc.pack.some((mm) => mm.name === SHELOB_NAME);
    const allies: Combatant[] = party
      .map((id): Combatant | null => {
        const character = CHARACTERS.find((c) => c.id === id);
        if (!character) {
          return null;
        }
        const item = equippedItems[id] ? ITEM_BY_ID[equippedItems[id]] : undefined;
        const s = effectiveStats(
          character,
          addBonus(addBonus(statBonusById[id] ?? ZERO_BONUS, auraBonus(character, party)), itemStatBonus(item)),
        );
        const maxHp = maxHpFromStats(s.strength, s.defense);
        const attackBonus = itemAttackBonus(item, packHasUndead, packHasOrcs);
        const undeadMultiplier = packHasUndead && id === "king_dead" ? 2 : 1;
        return {
          key: id,
          name: character.name,
          icon: character.icon,
          hp: Math.max(0, maxHp - (damageById[id] ?? 0)),
          maxHp,
          strength: s.strength,
          attack: s.strength * undeadMultiplier + attackBonus,
          defense: s.defense,
          luck: s.luck,
          intelligence: s.intelligence,
          level: levelForExp(expById[id] ?? 0).level,
        };
      })
      .filter((c): c is Combatant => c !== null && c.hp > 0);
    const m = enc.monster;
    const pack = enc.pack;
    const enemies: Combatant[] = pack.map((mm, i) => {
      const str =
        phialBlinded && mm.name === SHELOB_NAME ? Math.floor(mm.strength / 2) : mm.strength;
      const hp = maxHpFromStats(str, mm.defense);
      return {
        key: `enemy-${i}`,
        name: mm.name,
        icon: mm.icon,
        hp,
        maxHp: hp,
        strength: str,
        attack: str,
        defense: mm.defense,
        luck: mm.luck,
        intelligence: mm.intelligence,
      };
    });
    battleAppliedRef.current = false;
    setEncounter(null);
    let battleState: BattleState = {
      allies,
      enemies,
      exp: pack.reduce((sum, mm) => sum + monsterExp(mm), 0),
      turn: "allies",
      index: 0,
      outcome: allies.length === 0 ? "lose" : null,
      lastHit: null,
      attacker: null,
      tick: 0,
      hitDir: 0,
      bearerKey: allies.some((a) => a.key === bearerId) ? bearerId : null,
      ringOn: false,
      fleeUsed: false,
      recruitId: m.recruitId ?? null,
      enemyBeast: pack.some((mm) => BEAST_MONSTERS.has(mm.name)),
      enemyNazgul: pack.some((mm) => RINGWRAITH_FOES.has(mm.name)),
      enemyOrc: packHasOrcs,
      ringIneffective: pack.some((mm) => RING_PIERCING_FOES.has(mm.name)),
      betrayalBy: null,
      gandalfOnly: pack.some((mm) => mm.name.startsWith("Балрог")),
      rogueId: null,
      invisibleEnemy: false,
      phialBlinded,
      wraithsStand: enc.wraithsStand ?? false,
      sarumanParley: enc.sarumanParley ?? false,
    };
    if (autoPlayRef.current) {
      battleState = resolveBattleInstantly(battleState);
    }
    setBattle(battleState);
  }, [encounter, party, statBonusById, damageById, bearerId, equippedItems, expById]);

  // Flee before the fight: succeed and the foe is left behind; fail and there's
  // no slipping away — the battle begins anyway.
  const fleeEncounter = useCallback(() => {
    if (!encounter) {
      return;
    }
    if (rollEscape(party, statBonusById, encounter.pack.map((mm) => mm.luck))) {
      setEncounter(null);
      // Slipping away means the whole scattered company keeps its head down — a
      // splinter squad's pending ambush doesn't seize control right after.
      setSquadEncounterQueue([]);
    } else {
      setEscapeFailed("encounter");
    }
  }, [encounter, party, statBonusById]);

  // Current escape chance (%) for each context, shown on the flee buttons so the
  // player can weigh the gamble. Craftier (luckier) foes drag it down.
  const encounterEscapePct = useMemo(
    () =>
      encounter
        ? Math.round(escapeChance(party, statBonusById, encounter.pack.map((mm) => mm.luck)) * 100)
        : 0,
    [encounter, party, statBonusById],
  );
  const battleEscapePct = useMemo(
    () =>
      battle
        ? Math.round(escapeChance(party, statBonusById, battle.enemies.map((e) => e.luck)) * 100)
        : 0,
    [battle, party, statBonusById],
  );

  const adjustLevelUpDraft = useCallback(
    (stat: keyof StatBonus, delta: number) => {
      if (!levelUpCharacterId) {
        return;
      }
      setLevelUpDraft((prev) => {
        const spent = bonusPoints(prev);
        const total = unspentPointsFor(
          levelUpCharacterId,
          expById[levelUpCharacterId] ?? 0,
          statBonusById[levelUpCharacterId] ?? ZERO_BONUS,
        );
        const nextValue = prev[stat] + delta;
        if (nextValue < 0 || (delta > 0 && spent >= total)) {
          return prev;
        }
        return { ...prev, [stat]: nextValue };
      });
    },
    [levelUpCharacterId, expById, statBonusById],
  );


  // True during the brief "show the roll" pause after a random level-up, so a
  // manual confirm/adjust can't sneak in and commit against the wrong hero.
  const levelUpRollingRef = useRef(false);
  const confirmLevelUp = useCallback((override?: StatBonus) => {
    if (!levelUpCharacterId) {
      return;
    }
    // The timed auto-commit passes its rolled spread as `override`; a manual
    // confirm (no override) is ignored while a roll is still on display.
    if (override === undefined && levelUpRollingRef.current) {
      return;
    }
    const draft = override ?? levelUpDraft;
    const total = unspentPointsFor(
      levelUpCharacterId,
      expById[levelUpCharacterId] ?? 0,
      statBonusById[levelUpCharacterId] ?? ZERO_BONUS,
    );
    if (bonusPoints(draft) !== total) {
      return;
    }
    setStatBonusById((prev) => {
      const current = prev[levelUpCharacterId] ?? ZERO_BONUS;
      return { ...prev, [levelUpCharacterId]: addBonus(current, draft) };
    });
    // Leveling raises the max HP pool but doesn't heal: the extra capacity comes
    // in "empty", so carry the gain into damage to leave current health untouched.
    const hpGain = maxHpFromStats(draft.strength, draft.defense);
    if (hpGain > 0) {
      const nextDamage = {
        ...damageRef.current,
        [levelUpCharacterId]: (damageRef.current[levelUpCharacterId] ?? 0) + hpGain,
      };
      damageRef.current = nextDamage;
      setDamageById(nextDamage);
    }
    setLevelUpDraft(ZERO_BONUS);
    // Swap in the next queued hero without closing the modal; only close when the
    // queue is empty.
    if (levelUpQueue.length > 0) {
      const [next, ...rest] = levelUpQueue;
      setLevelUpCharacterId(next);
      setLevelUpQueue(rest);
    } else {
      setLevelUpCharacterId(null);
    }
  }, [levelUpCharacterId, levelUpDraft, expById, statBonusById, levelUpQueue]);

  // Rolling a random spread on level-up doubles as confirming it — scatter the
  // points and commit in one click, moving on to the next hero. (Hero creation
  // keeps its separate roll/confirm; only post-battle level-ups chain.) The roll
  // shows for half a second first, so the player can see the new spread before it
  // commits and the next hero swaps in.
  const randomizeAndConfirmLevelUp = useCallback(() => {
    if (!levelUpCharacterId || levelUpRollingRef.current) {
      return;
    }
    const total = unspentPointsFor(
      levelUpCharacterId,
      expById[levelUpCharacterId] ?? 0,
      statBonusById[levelUpCharacterId] ?? ZERO_BONUS,
    );
    const stats: (keyof StatBonus)[] = ["strength", "defense", "intelligence", "luck"];
    const rolled: StatBonus = { strength: 0, defense: 0, intelligence: 0, luck: 0 };
    for (let i = 0; i < total; i += 1) {
      rolled[stats[Math.floor(Math.random() * stats.length)]] += 1;
    }
    levelUpRollingRef.current = true;
    setLevelUpDraft(rolled);
    window.setTimeout(() => {
      confirmLevelUp(rolled);
      levelUpRollingRef.current = false;
    }, 500);
  }, [levelUpCharacterId, expById, statBonusById, confirmLevelUp]);

  // Hero creation: nudge one of Frodo's stats, clamped to [0, points left].
  const adjustCreation = useCallback((stat: keyof StatBonus, delta: number) => {
    setCreationBonus((prev) => {
      const spent = prev.strength + prev.defense + prev.intelligence + prev.luck;
      const nextValue = prev[stat] + delta;
      if (nextValue < 0 || (delta > 0 && spent >= CREATION_POINTS)) {
        return prev;
      }
      return { ...prev, [stat]: nextValue };
    });
  }, []);

  // Scatter all creation points randomly across the four stats.
  const randomizeCreation = useCallback(() => {
    setCreationBonus(rollStatBonus(CREATION_POINTS));
  }, []);

  const confirmCreation = useCallback(() => {
    setStatBonusById((prev) => ({ ...prev, [RING_BEARER_ID]: creationBonus }));
    setCreated(true);
  }, [creationBonus]);

  // Wipe the save and reload for a fresh quest (from the restart confirmation).
  const restartGame = useCallback(() => {
    clearSave();
    window.location.reload();
  }, []);

  const startAutoPlay = useCallback(() => {
    const rolled = rollStatBonus(CREATION_POINTS);
    setCreationBonus(rolled);
    setStatBonusById((prev) => ({ ...prev, [RING_BEARER_ID]: rolled }));
    setCreated(true);
    setAutoPlay(true);
    autoRouteIndexRef.current = 0;
  }, []);

  const applyBattleCasualties = useCallback(
    (allies: { key: string; hp: number }[]) => {
      const dead = allies.filter((ally) => ally.hp <= 0).map((ally) => ally.key);
      if (dead.length === 0) {
        return;
      }
      const survivors = party.filter((id) => !dead.includes(id));
      const livingBearerCandidates = survivors.filter((id) => !NON_BEARERS.has(id));
      const slainRoaming = slainRoamingRecruitIds(dead);
      if (slainRoaming.length > 0) {
        setSlainRoamingRecruits((prev) => {
          const next = new Set(prev);
          for (const id of slainRoaming) {
            next.add(id);
          }
          return next;
        });
      }
      setDeathCauseById((prev) => {
        const next = { ...prev };
        for (const id of dead) {
          next[id] = "battle";
        }
        return next;
      });
      setParty((prev) => prev.filter((id) => !dead.includes(id)));
      if (dead.length > 0) {
        setDeathNotice({ ids: dead.join(","), cause: "battle" });
      }
      if (dead.includes(bearerId)) {
        // The Ring can pass to an able companion still standing — here in the
        // active party, or, if this whole group fell, in a splinter squad still
        // abroad. Only when no one anywhere can take it up is the quest over.
        const squadHasBearer = squadsRef.current.some((s) =>
          s.members.some((id) => !NON_BEARERS.has(id)),
        );
        if (livingBearerCandidates.length > 0) {
          setBearerId("");
          setReclaimedFrom(bearerId);
        } else if (squadHasBearer) {
          // No able heir in the fighting group, but a splinter squad still has
          // one — hand them the Ring instead of ending. A surviving squad is
          // focused (by the empty-party effect if this group is wiped, or the
          // loose-Ring effect if non-bearers linger here); the chooser then
          // offers the Ring among that squad.
          setBearerId("");
          setReclaimedFrom(bearerId);
          setBattle(null);
        } else {
          setEnding((prev) => prev ?? "battle");
          setBattle(null);
        }
      } else if (survivors.length === 0) {
        // The whole group fell, but the bearer wasn't among them — he'd already
        // fled with the Ring (or there's no bearer). That's "all for nothing",
        // not "the bearer fell in battle".
        setEnding((prev) => prev ?? (rogueBearerId || !bearerId ? "nothing" : "battle"));
        setBattle(null);
      }
    },
    [bearerId, party, rogueBearerId],
  );

  // Flee: a single luck-weighted attempt per battle. Succeed and you leave
  // with the wounds taken so far (no XP); fail and the chance is spent — the
  // button goes dead and the fight goes on.
  const fleeBattle = useCallback(() => {
    if (!battle || battle.fleeUsed) {
      return;
    }
    if (!rollEscape(party, statBonusById, battle.enemies.map((e) => e.luck))) {
      setBattle((b) => (b ? { ...b, fleeUsed: true } : b));
      setEscapeFailed("battle");
      return;
    }
    const nextDamage = { ...damageRef.current };
    for (const ally of battle.allies) {
      nextDamage[ally.key] = ally.maxHp - ally.hp;
    }
    damageRef.current = nextDamage;
    setDamageById(nextDamage);
    applyBattleCasualties(battle.allies);
    // Fleeing means dropping the packs: all but a single day of food is lost.
    const nextFood = Math.min(foodRef.current, 1);
    foodRef.current = nextFood;
    setFood(nextFood);
    setBattle(null);
    // Breaking off the fight: don't yank control into a splinter squad's pending
    // ambush right after — the company lies low together.
    setSquadEncounterQueue([]);
  }, [battle, party, statBonusById, applyBattleCasualties]);

  // Put on the Ring: the bearer turns invisible/untargetable for this fight,
  // at the cost of one extra day of Ring corruption.
  const putOnRing = useCallback(() => {
    setRingWear((w) => w + 1);
    setBattle((b) => (b ? { ...b, ringOn: true } : b));
  }, []);

  const takeOffRing = useCallback(() => {
    setBattle((b) => (b ? { ...b, ringOn: false } : b));
  }, []);

  // Saruman's mercy parley: who speaks, in order. The advocate (Gandalf, else
  // Treebeard) pleads first; Gimli and Éomer, if present, object in turn. Then
  // the spare/fight choice. Absent speakers are skipped — no empty modals.
  const parleySpeakers = useMemo(() => {
    if (!battle?.pendingParley) {
      return [];
    }
    // Both advocates plead if both are along; then the objectors, if present.
    const list: string[] = [];
    if (party.includes("gandalf")) {
      list.push("gandalf");
    }
    if (party.includes("treebeard")) {
      list.push("treebeard");
    }
    if (party.includes("gimli")) {
      list.push("gimli");
    }
    if (party.includes("eomer")) {
      list.push("eomer");
    }
    return list;
  }, [battle?.pendingParley, party]);
  useEffect(() => {
    if (battle?.pendingParley) {
      setParleyStep(0);
    }
  }, [battle?.pendingParley]);

  // Spare Saruman: he renounces and the fight ends — wounds stay, no kill/loot,
  // and Isengard is cleared (boss recorded as dealt with).
  const spareSaruman = useCallback(() => {
    if (!battle) {
      return;
    }
    const nextDamage = { ...damageRef.current };
    for (const ally of battle.allies) {
      nextDamage[ally.key] = ally.maxHp - ally.hp;
    }
    damageRef.current = nextDamage;
    setDamageById(nextDamage);
    applyBattleCasualties(battle.allies);
    // He's let go, not slain: alive and on the loose (drives the NW roam and the
    // Scouring two months hence). Isengard is still cleared (he's left it).
    setSarumanSpared(true);
    setSarumanSparedDay(journeyDayRef.current);
    setBattle(null);
    setParleyStep(0);
  }, [battle, applyBattleCasualties]);

  // Fight on: drop the parley hold and half-floor so Saruman can be slain.
  const fightSaruman = useCallback(() => {
    setBattle((b) => (b ? { ...b, pendingParley: false, parleyDeclined: true } : b));
    setParleyStep(0);
  }, []);


  const makeBearer = useCallback((id: string) => {
    if (NON_BEARERS.has(id)) {
      return;
    }
    setBearerId(id);
  }, []);

  const acceptSamCatchUp = useCallback(() => {
    const capacity = foodCapacityFor(transport);
    const nextFood = Math.min(capacity, foodRef.current + SAM_CATCH_UP_FOOD_DAYS);
    foodRef.current = nextFood;
    setFood(nextFood);
    recruitCharacter("sam");
    setSamCatchUpOpen(false);
  }, [recruitCharacter, transport]);

  // The Ring slips away with a companion (the bearer broke at 100%, or a betrayer
  // bested the party). He drops out and runs for Mount Doom; the party is left
  // ringless with ROGUE_CHASE_DAYS to hunt him down.
  const triggerRingFlight = useCallback((fledId: string) => {
    setParty((prev) => prev.filter((id) => id !== fledId));
    setBearerId("");
    setLordClaimed(false);
    setRogueBearerId(fledId);
    setRogueSinceDay(journeyDayRef.current);
    setRogueFledNotice(fledId);
  }, []);

  // Confront the fled bearer: the current party against the lone, Ring-veiled
  // rogue. Winning reclaims the Ring; losing ends the tale with nothing.
  const startRogueBattle = useCallback(
    (rogueId: string) => {
      const rogue = CHARACTERS.find((c) => c.id === rogueId);
      if (!rogue) {
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
          const maxHp = maxHpFromStats(s.strength, s.defense);
          return {
            key: id,
            name: character.name,
            icon: character.icon,
            hp: Math.max(0, maxHp - (damageById[id] ?? 0)),
            maxHp,
            strength: s.strength,
            attack: s.strength,
            defense: s.defense,
            luck: s.luck,
            intelligence: s.intelligence,
            level: levelForExp(expById[id] ?? 0).level,
          };
        })
        .filter((c): c is Combatant => c !== null && c.hp > 0);
      const rs = effectiveStats(rogue, statBonusById[rogueId] ?? ZERO_BONUS);
      const rogueMaxHp = maxHpFromStats(rs.strength, rs.defense);
      const enemy: Combatant = {
        key: rogueId,
        name: rogue.name,
        icon: rogue.icon,
        hp: rogueMaxHp,
        maxHp: rogueMaxHp,
        strength: rs.strength,
        attack: rs.strength,
        defense: rs.defense,
        luck: rs.luck,
        intelligence: rs.intelligence,
      };
      battleAppliedRef.current = false;
      let battleState: BattleState = {
        allies,
        enemies: [enemy],
        exp: 0,
        turn: "allies",
        index: 0,
        outcome: allies.length === 0 ? "lose" : null,
        lastHit: null,
        attacker: null,
        tick: 0,
        hitDir: 0,
        bearerKey: null,
        ringOn: false,
        fleeUsed: false,
        recruitId: null,
        enemyBeast: false,
        ringIneffective: false,
        betrayalBy: null,
        gandalfOnly: false,
        rogueId,
        invisibleEnemy: true,
        phialBlinded: false,
      };
      if (autoPlayRef.current) {
        battleState = resolveBattleInstantly(battleState);
      }
      setBattle(battleState);
    },
    [party, statBonusById, damageById],
  );

  // Re-roll who/what is around: sometimes-present companions and the eagles at
  // Carn Dûm. Fired on arrival and again whenever the player waits a day.
  const rollPresence = useCallback((locationId?: number) => {
    setRandomPresence(() => {
      const rolled: Record<string, boolean> = {};
      for (const [id, chance] of Object.entries(RANDOM_PRESENCE)) {
        rolled[id] = Math.random() < chance;
      }
      return rolled;
    });
    setEagleOffered(locationId === CARN_DUM_ID && Math.random() < EAGLE_PRESENCE_CHANCE);
    setShipOffered(
      locationId !== undefined && Math.random() < (SHIP_PRESENCE_CHANCE[locationId] ?? 0),
    );
  }, []);

  const waitOneDay = useCallback(() => {
    if (isMoving) {
      return;
    }

    const nextDay = journeyDayRef.current + 1;
    journeyDayRef.current = nextDay;
    journeyMilesRef.current += MILES_PER_DAY;
    setJourneyDay(nextDay);
    rollPresence(visitedLocation?.id);
  }, [isMoving, rollPresence, visitedLocation]);

  // Spend a day foraging: gather 1-3 days of food, plus a bonus from the ring
  // bearer's luck, capped by the transport's carrying capacity.
  const farmFood = useCallback(() => {
    if (isMoving) {
      return;
    }
    // Whoever's actually here forages, and food fills the shared store — so it
    // doesn't matter which squad gathers it. Use the Ring-bearer's luck when
    // they travel with this squad (keeps the tuned yield), otherwise the best
    // forager in the active squad. Effective luck = base + bonuses + auras.
    const bearer = CHARACTERS.find((character) => character.id === bearerId);
    const luck =
      bearer && party.includes(bearerId)
        ? effectiveStats(bearer, addBonus(statBonusById[bearerId] ?? ZERO_BONUS, auraBonus(bearer, party)))
            .luck
        : party.reduce((best, id) => {
            const c = CHARACTERS.find((character) => character.id === id);
            if (!c) {
              return best;
            }
            return Math.max(
              best,
              effectiveStats(c, addBonus(statBonusById[id] ?? ZERO_BONUS, auraBonus(c, party))).luck,
            );
          }, 0);
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
  }, [isMoving, bearerId, party, transport, statBonusById]);

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

  // Open the details panel; `paging` enables the party prev/next arrows.
  const openCharacterPanel = useCallback((id: string, paging: boolean) => {
    setOpenCharacterId(id);
    setOpenCharacterPaging(paging);
  }, []);

  // Mirror transport into a ref so the rAF loop reads it live. (Camera state is
  // mirrored inside useMapCamera.)
  useEffect(() => {
    transportRef.current = transport;
  }, [transport]);
  useEffect(() => {
    partyRef.current = party;
    setMaxPartySize((prev) => Math.max(prev, party.length));
  }, [party]);
  useEffect(() => {
    equippedItemsRef.current = equippedItems;
  }, [equippedItems]);
  const animationPaused = useMemo(
    () =>
      !created ||
      ending !== null ||
      visitedLocation !== null ||
      splitOpen ||
      openCharacterId !== null ||
      recruitOffer !== null ||
      recruitRefusal !== null ||
      samCatchUpOpen ||
      rogueFledNotice !== null ||
      reclaimedFrom !== null ||
      (deathNotice !== null && ending === null) ||
      helpOpen ||
      statsOpen ||
      partySummaryOpen ||
      ((levelUpCharacterId !== null || levelUpQueue.length > 0) && !autoPlay) ||
      (encounter !== null && !autoPlay) ||
      (battle !== null && !autoPlay) ||
      (foodFarmed !== null && !autoPlay),
    [
      created,
      ending,
      visitedLocation,
      splitOpen,
      openCharacterId,
      recruitOffer,
      recruitRefusal,
      samCatchUpOpen,
      rogueFledNotice,
      reclaimedFrom,
      deathNotice,
      helpOpen,
      statsOpen,
      partySummaryOpen,
      levelUpCharacterId,
      levelUpQueue,
      encounter,
      battle,
      autoPlay,
      foodFarmed,
    ],
  );

  // Everyone "found": the seed hobbit, anyone recruited (stamped in joinDay),
  // whoever stands in the party now, plus everyone merely met — seen at a
  // location or faced as a foe — even if they never joined.
  const foundCharacterIds = useMemo(
    () =>
      new Set<string>([
        ...DEFAULT_PARTY,
        ...Object.keys(joinDayRef.current),
        ...party,
        ...metCharacterIds,
      ]),
    [party, metCharacterIds, statsOpen],
  );
  const gameStats = useMemo<GameStats>(
    () => ({
      locationsVisited: visitedLocationIds.size,
      locationsTotal: locations.length,
      bossesDefeated: defeatedBosses.size,
      bossesTotal: Object.keys(BOSSES_BY_LOCATION).length,
      itemsFound: foundItems.length,
      itemsTotal: ITEMS.length,
      enemiesKilled,
      deaths: Object.keys(deathCauseById).length,
      maxPartySize,
      days: journeyDay,
      miles: journeyMilesRef.current,
    }),
    [
      visitedLocationIds,
      locations,
      defeatedBosses,
      foundItems,
      enemiesKilled,
      deathCauseById,
      maxPartySize,
      journeyDay,
      statsOpen,
    ],
  );

  useEffect(() => {
    animationPausedRef.current = animationPaused;
  }, [animationPaused]);

  // While any modal/overlay is up, the map ignores input entirely — no panning,
  // clicking-to-move, or zooming behind it.
  const mapInputLocked =
    animationPaused ||
    escapeFailed !== null ||
    exploreResult !== null ||
    pendingDisembark !== null ||
    valinorAttempt ||
    talkResult !== null ||
    tharbadSpeech !== null;
  // Feed the live lock flag to the camera hook's gesture handlers.
  mapInputLockedRef.current = mapInputLocked;

  // Close the settings dropdown when clicking anywhere outside it. The panel
  // wrapper stops pointer propagation, so in-panel clicks never reach here.
  useEffect(() => {
    if (!settingsOpen) {
      return undefined;
    }
    const close = () => setSettingsOpen(false);
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [settingsOpen]);

  // Ring corruption days accrue only for whoever currently carries it — and not
  // once the Ring is unmade (freeplay): the bearer is Ring-free, so it freezes.
  useEffect(() => {
    const delta = journeyDay - prevJourneyDayForRingRef.current;
    if (delta > 0 && bearerId && rogueBearerId === null && !ringDestroyed) {
      setRingDaysById((days) => ({
        ...days,
        [bearerId]: (days[bearerId] ?? 0) + delta,
      }));
    }
    prevJourneyDayForRingRef.current = journeyDay;
  }, [journeyDay, bearerId, rogueBearerId, ringDestroyed]);
  useEffect(() => {
    const delta = ringWear - prevRingWearForRingRef.current;
    if (delta > 0 && bearerId && rogueBearerId === null && !ringDestroyed) {
      setRingDaysById((days) => ({
        ...days,
        [bearerId]: (days[bearerId] ?? 0) + delta,
      }));
    }
    prevRingWearForRingRef.current = ringWear;
  }, [ringWear, bearerId, rogueBearerId, ringDestroyed]);

  // Auto-save the full game state, but only at rest — never mid-move, mid-battle,
  // or with an encounter pending — so a reload resumes from a clean stop/town.
  useEffect(() => {
    // Never persist a ringless chase — a reload would leave the party with no
    // Ring and no rogue. Saves resume only from a clean stop with the Ring held.
    if (!created || ending || battle || encounter || isMoving || target || rogueBearerId) {
      return;
    }
    writeSave({
      player,
      journeyDay,
      journeyMiles: journeyMilesRef.current,
      party,
      bearerId,
      transport,
      eagleSince,
      food,
      damageById,
      deathCauseById,
      expById,
      statBonusById,
      ringWear,
      bearerRingDays,
      ringDaysById,
      hasCloaks,
      defeatedBosses: [...defeatedBosses],
      slainRoamingRecruits: [...slainRoamingRecruits],
      banishedTraitors: [...banishedTraitors],
      squads,
      joinDay: joinDayRef.current,
      recruitAttempts: recruitAttemptsRef.current,
      foundItems,
      equippedItems,
      deadSummoned,
      samCaughtUp,
      grimaFled,
      grimaSlain,
      osgiliathCacheFound,
      corsairPeace,
      ringDestroyed,
      dolGuldurNazgulSlain,
      sarumanSpared,
      sarumanSparedDay,
      visitedLocationIds: [...visitedLocationIds],
      enemiesKilled,
      defeatedEnemyIcons: [...defeatedEnemyIcons],
      maxPartySize,
      metCharacterIds: [...metCharacterIds],
    });
  }, [
    created,
    ending,
    battle,
    encounter,
    isMoving,
    target,
    player,
    journeyDay,
    party,
    bearerId,
    transport,
    eagleSince,
    food,
    damageById,
    deathCauseById,
    expById,
    statBonusById,
    ringWear,
    bearerRingDays,
    ringDaysById,
    hasCloaks,
    defeatedBosses,
    slainRoamingRecruits,
    banishedTraitors,
    squads,
    rogueBearerId,
    foundItems,
    equippedItems,
    deadSummoned,
    samCaughtUp,
    grimaFled,
    grimaSlain,
    osgiliathCacheFound,
    corsairPeace,
    ringDestroyed,
    dolGuldurNazgulSlain,
    sarumanSpared,
    sarumanSparedDay,
    visitedLocationIds,
    enemiesKilled,
    defeatedEnemyIcons,
    maxPartySize,
    metCharacterIds,
  ]);

  // Game over: drop the save so a reload starts a fresh quest.
  useEffect(() => {
    if (ending) {
      clearSave();
    }
  }, [ending]);

  // Take control of a splinter squad: park the current active party where it
  // stands, make the chosen squad live, halt any travel, and recenter on it.
  // Used by the squad switcher, marker taps, and the auto-refocus when a
  // ring/betrayal event fires in an inactive squad.
  const focusSquad = useCallback(
    (squadId: string) => {
      const list = squadsRef.current;
      const idx = list.findIndex((s) => s.id === squadId);
      if (idx < 0) {
        return;
      }
      const next = list[idx];
      const rest = list.filter((_, i) => i !== idx);
      const currentMembers = partyRef.current;
      const currentPoint = playerRef.current ?? hobbiton.point;
      const parkedCurrent: Squad[] =
        currentMembers.length > 0
          ? [
              {
                id: `squad-${Date.now().toString(36)}-${squadSeqRef.current++}`,
                members: currentMembers,
                point: { x: currentPoint.x, y: currentPoint.y },
              },
            ]
          : [];
      setSquads([...rest, ...parkedCurrent]);
      setParty(next.members);
      playerRef.current = next.point;
      setPlayer(next.point);
      setHeroPath([next.point]);
      setTarget(null);
      setTargetLocation(null);
      setStopped(false);
      setVisitedLocation(null);
      setCurrentLocation(null);
      setIsMoving(false);
      lastTimeRef.current = null;
      waterRunRef.current.clear();
      followDisabledRef.current = false;
      const centered = clampOffset(
        { x: view.width / 2 - next.point.x * zoom, y: view.height / 2 - next.point.y * zoom },
        zoom,
      );
      offsetRef.current = centered;
      setOffset(centered);
    },
    [hobbiton, clampOffset, view, zoom],
  );

  // Cycle the active squad: front of the queue becomes live, the old active goes
  // to the back. Only meaningful when there's at least one splinter and nothing
  // in progress (a battle/encounter/move must finish first).
  const canSwitchSquads = squads.length > 0 && !mapInputLocked && !isMoving && !target;
  const switchSquad = useCallback(() => {
    if (battle || encounter || isMoving || target || squadsRef.current.length === 0) {
      return;
    }
    focusSquad(squadsRef.current[0].id);
  }, [battle, encounter, isMoving, target, focusSquad]);

  // Tab cycles the active squad too (only when a switch is actually possible, so
  // normal focus traversal still works the rest of the time).
  useEffect(() => {
    if (!canSwitchSquads) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Tab" && !event.ctrlKey && !event.altKey && !event.metaKey) {
        event.preventDefault();
        switchSquad();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canSwitchSquads, switchSquad]);

  // Space halts the march — same as the Stop button. Ignored while a modal is up
  // or when a control/field has focus (so it still activates buttons / types).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" && event.key !== " ") {
        return;
      }
      const el = event.target as HTMLElement | null;
      if (mapInputLocked || (el && el.closest("button, input, textarea, select"))) {
        return;
      }
      event.preventDefault();
      setTarget(null);
      setTargetLocation(null);
      setStopped(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mapInputLocked]);

  const setTargetFromClientPoint = useCallback(
    (clientX: number, clientY: number) => {
      if (autoPlayRef.current || !viewportRef.current) {
        return;
      }

      const bounds = viewportRef.current.getBoundingClientRect();
      const clickPoint = screenToMap({
        x: clientX - bounds.left,
        y: clientY - bounds.top,
      });
      setTarget(clickPoint);
      setTargetLocation(null);
      setStopped(false);
      setVisitedLocation(null);
      setCurrentLocation(null);
      // Note: don't reset the water run here — a fresh tap mid-crossing must not
      // refill the allowance, or a wide sea could be crossed two cells per tap.
      lastTimeRef.current = null;
      followDisabledRef.current = false;
    },
    [getTerrainAtPoint, screenToMap],
  );
  // Let the camera hook's pointer-up call tap-to-move without a stale closure.
  onTapRef.current = setTargetFromClientPoint;

  const handleMarkerClick = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>, location: MapLocation) => {
      event.stopPropagation();
      if (autoPlayRef.current) {
        return;
      }
      setTarget({ x: location.point.x, y: location.point.y });
      setTargetLocation(location);
      setStopped(false);
      setVisitedLocation(null);
      setCurrentLocation(null);
      lastTimeRef.current = null;
      followDisabledRef.current = false;
    },
    [],
  );

  const marchToLocation = useCallback((location: MapLocation) => {
    autoSteerRef.current = {
      bestGoalDist: Number.POSITIVE_INFINITY,
      stallMs: 0,
      turnSign: 1,
      turnIndex: 0,
    };
    setTarget({ x: location.point.x, y: location.point.y });
    setTargetLocation(location);
    setStopped(false);
    setVisitedLocation(null);
    setCurrentLocation(null);
    lastTimeRef.current = null;
    followDisabledRef.current = false;
  }, []);

  // Cast the Ring into the fire — but its hold may win out and the bearer puts it
  // on instead. Chance is half the corruption %, so even a badly-corrupted bearer
  // usually obeys: it's a nasty surprise, not the default.
  const destroyRing = useCallback(() => {
    if (Math.random() * 100 < bearerCorruptionRef.current / 2) {
      setLordClaimed(true);
      setDoomBetrayal(true);
      setEnding("lord");
    } else {
      setRingDestroyed(true);
      setEnding("victory");
    }
  }, []);

  // Search the current location: chance = average party luck × 10% to turn up its
  // hidden item. Once the item is found, further searches always come up empty.
  const exploreLocation = useCallback(() => {
    const loc = visitedLocation;
    if (!loc) {
      return;
    }
    const itemId = EXPLORE_ITEM_BY_LOCATION[loc.id];
    // Nothing to search here (no special site, no hidden item) — do nothing, and
    // don't burn a day for it.
    if (
      loc.id !== WEATHERTOP_ID &&
      loc.id !== ERECH_ID &&
      loc.id !== OSGILIATH_ID &&
      loc.id !== HELMS_DEEP_ID &&
      !itemId
    ) {
      return;
    }
    // Searching a location costs a day (and runs that day's upkeep: rations,
    // and any ambushes that befall the idle splinters).
    const nextDay = journeyDayRef.current + 1;
    journeyDayRef.current = nextDay;
    setJourneyDay(nextDay);
    // Weathertop: Gandalf's rune left on a stone (only reachable once the Nazgul
    // is beaten). Pure lore note, nothing to pick up. If Gandalf already travels
    // with the party his mark pointing east to Rivendell is meaningless — skip it.
    if (loc.id === WEATHERTOP_ID) {
      setExploreResult(
        party.includes("gandalf") ? { found: false } : { found: true, message: "location.weathertopRune" },
      );
      return;
    }
    // Erech: only Aragorn, heir of Isildur, can rouse the Dead.
    if (loc.id === ERECH_ID) {
      if (party.includes("aragorn") && !deadSummoned) {
        setDeadSummoned(true);
        setExploreResult({ found: true, message: "location.erechSummon" });
        if (!party.includes("king_dead") && !parkedMembers.includes("king_dead")) {
          setPendingExploreRecruit("king_dead");
        }
      } else {
        setExploreResult({ found: false });
      }
      return;
    }
    // Osgiliath ruins: a one-time Gondorian armoury cache, a touch rarer than a
    // normal find (÷12 vs ÷10). It yields party-size pieces split roughly evenly
    // between swords (+3 strength) and hauberks (+3 defense), the odd one going
    // either way.
    if (loc.id === OSGILIATH_ID) {
      const cacheLuck = party.length ? partyLuck(party, statBonusById) / party.length : 0;
      if (osgiliathCacheFound || Math.random() >= cacheLuck / 12) {
        setExploreResult({ found: false });
        return;
      }
      const total = Math.min(party.length, GONDOR_CACHE_MAX * 2);
      const rawSwords = Math.random() < 0.5 ? Math.ceil(total / 2) : Math.floor(total / 2);
      const swords = Math.min(rawSwords, GONDOR_CACHE_MAX);
      const armor = Math.min(total - rawSwords, GONDOR_CACHE_MAX);
      const cacheIds = [...GONDOR_SWORD_IDS.slice(0, swords), ...GONDOR_ARMOR_IDS.slice(0, armor)];
      setFoundItems((prev) => [...prev, ...cacheIds.filter((id) => !prev.includes(id))]);
      setOsgiliathCacheFound(true);
      setExploreResult({ found: true, itemIds: cacheIds });
      return;
    }
    // Helm's Deep: only Éomer knows the Hornburg armoury. With him along he leads
    // the party to it and they kit out (spear/sword +3 str, shield/mail +3 def);
    // without him the search turns up nothing.
    if (loc.id === HELMS_DEEP_ID) {
      const already = ROHAN_ARMORY_IDS.every((id) => foundItems.includes(id));
      if (party.includes("eomer") && !already) {
        const gained = ROHAN_ARMORY_IDS.filter((id) => !foundItems.includes(id));
        setFoundItems((prev) => [...prev, ...gained.filter((id) => !prev.includes(id))]);
        // Show the kit as a gift list (icons + names + effects), like Galadriel's.
        setTalkResult({ charId: "eomer", itemIds: gained, greeting: null });
      } else {
        setExploreResult({ found: false });
      }
      return;
    }
    const avgLuck = party.length ? partyLuck(party, statBonusById) / party.length : 0;
    const found = !foundItems.includes(itemId) && Math.random() < avgLuck / 10;
    if (found) {
      setFoundItems((prev) => [...prev, itemId]);
      setExploreResult({ found: true, itemId });
    } else {
      setExploreResult({ found: false });
    }
  }, [visitedLocation, foundItems, party, statBonusById, deadSummoned, parkedMembers, osgiliathCacheFound]);

  // Talk to a companion: hand over their gift items (once, and only if their
  // requirement is met — Bilbo needs Frodo along), else a random greeting.
  const talkToCharacter = useCallback(
    (charId: string) => {
      const gifts = GIFTS_BY_CHARACTER[charId] ?? [];
      const newItems = gifts
        .filter(
          (g) =>
            (!g.requires || g.requires.every((r) => party.includes(r))) &&
            !foundItems.includes(g.id),
        )
        .map((g) => g.id);
      const givesCloaks = CLOAK_GIVERS.has(charId) && !hasCloaks;
      if (newItems.length > 0 || givesCloaks) {
        if (newItems.length > 0) {
          setFoundItems((prev) => [...prev, ...newItems]);
        }
        if (givesCloaks) {
          setHasCloaks(true);
        }
        setTalkResult({ charId, itemIds: newItems, greeting: null, cloaks: givesCloaks });
      } else {
        // Tone of the hello depends on who's speaking.
        const tone = HOBBIT_IDS.has(charId)
          ? "hobbit"
          : LOFTY_TALKERS.has(charId)
            ? "lofty"
            : "serious";
        const counts = { hobbit: 4, serious: 4, lofty: 3 };
        const n = 1 + Math.floor(Math.random() * counts[tone]);
        setTalkResult({
          charId,
          itemIds: [],
          greeting: `talk.${tone}${n}`,
          place: visitedLocation ? locName(visitedLocation) : undefined,
        });
      }
    },
    [party, foundItems, hasCloaks, visitedLocation, locName],
  );

  // Whether a companion still has something to hand over (items or cloaks).
  const hasGifts = useCallback(
    (charId: string) => {
      const gifts = GIFTS_BY_CHARACTER[charId] ?? [];
      const pendingItem = gifts.some(
        (g) =>
          (!g.requires || g.requires.every((r) => party.includes(r))) && !foundItems.includes(g.id),
      );
      const pendingCloaks = CLOAK_GIVERS.has(charId) && !hasCloaks;
      return pendingItem || pendingCloaks;
    },
    [party, foundItems, hasCloaks],
  );

  // Assign an item to a character (it's unique — pulled off whoever held it), or
  // null to unequip.
  const equipItem = useCallback((charId: string, itemId: string | null) => {
    setEquippedItems((prev) => {
      const next = { ...prev };
      if (itemId) {
        for (const id of Object.keys(next)) {
          if (next[id] === itemId) {
            delete next[id];
          }
        }
        next[charId] = itemId;
      } else {
        delete next[charId];
      }
      return next;
    });
  }, []);

  const autoPlayTick = useCallback(() => {
    if (!autoPlay || ending) {
      return;
    }

    if (levelUpCharacterId || levelUpQueue.length > 0) {
      const charId = levelUpCharacterId ?? levelUpQueue[0];
      const total = unspentPointsFor(
        charId,
        expById[charId] ?? 0,
        statBonusById[charId] ?? ZERO_BONUS,
      );
      if (total > 0) {
        const allocated = autoAssignLevelUpPoints(charId, total);
        setStatBonusById((prev) => ({
          ...prev,
          [charId]: addBonus(prev[charId] ?? ZERO_BONUS, allocated),
        }));
      }
      if (levelUpCharacterId) {
        setLevelUpCharacterId(null);
        setLevelUpDraft(ZERO_BONUS);
      } else {
        setLevelUpQueue((queue) => queue.slice(1));
      }
      return;
    }

    if (deathNotice) {
      setDeathNotice(null);
      return;
    }
    if (reclaimedFrom) {
      const candidates = party
        .filter((id) => !NON_BEARERS.has(id))
        .map((id) => {
          const character = CHARACTERS.find((entry) => entry.id === id);
          if (!character) {
            return null;
          }
          const stats = computeCharacterStats(
            character,
            ringDaysById[id] ?? 0,
            bearerId,
            damageById[id] ?? 0,
            addBonus(statBonusById[id] ?? ZERO_BONUS, auraBonus(character, party)),
          );
          return { id, stats };
        })
        .filter((entry): entry is { id: string; stats: ReturnType<typeof computeCharacterStats> } => !!entry)
        .sort((a, b) => {
          if (a.stats.corruption !== b.stats.corruption) {
            return a.stats.corruption - b.stats.corruption;
          }
          return b.stats.health / b.stats.maxHealth - a.stats.health / a.stats.maxHealth;
        });
      if (candidates[0]) {
        makeBearer(candidates[0].id);
        setReclaimedFrom(null);
      }
      return;
    }
    if (recruitRefusal) {
      dismissRecruitRefusal();
      return;
    }
    if (samCatchUpOpen) {
      acceptSamCatchUp();
      return;
    }
    if (recruitOffer) {
      acceptRecruitOffer();
      return;
    }
    if (foodFarmed !== null) {
      setFoodFarmed(null);
      return;
    }
    if (talkResult) {
      setTalkResult(null);
      return;
    }
    if (exploreResult) {
      setExploreResult(null);
      return;
    }

    const capacity = foodCapacityFor(transport);
    const stopThreshold = autoFarmStopThreshold(capacity);

    if (!visitedLocation && food <= stopThreshold && (isMoving || target)) {
      setTarget(null);
      setTargetLocation(null);
      setIsMoving(false);
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      return;
    }

    if (!visitedLocation && !isMoving && !target && autoPlayShouldFarm(food, capacity)) {
      farmFood();
      return;
    }

    if (battle) {
      // The fight was resolved the instant it began; leave the result on screen
      // so it's visible — a dedicated timer (below) clears it after a beat.
      if (battle.outcome) {
        return;
      }
      if (
        battle.betrayalBy &&
        battle.bearerKey &&
        !battle.ringOn &&
        !battle.ringIneffective &&
        battle.allies.some((ally) => ally.key === battle.bearerKey && ally.hp > 0)
      ) {
        setRingWear((wear) => wear + 1);
        setBattle({ ...battle, ringOn: true });
        return;
      }
      setBattle(resolveBattleInstantly(battle));
      return;
    }

    if (encounter) {
      const lockedBoss =
        visitedLocation &&
        (visitedLocation.id === MORIA_GATE_ID || visitedLocation.id === MINAS_MORGUL_ID)
          ? BOSSES_BY_LOCATION[visitedLocation.id]
          : null;
      if (lockedBoss && !defeatedBosses.has(lockedBoss.name)) {
        startBattle();
        return;
      }
      if (autoPlayShouldFleeEncounter(encounter, party, statBonusById, damageById)) {
        setEncounter(null);
      } else {
        startBattle();
      }
      return;
    }

    if (visitedLocation?.id === ORODRUIN_ID && bearerId && rogueBearerId === null) {
      // Auto-play always tries to destroy it; the Ring's hold may still win out.
      destroyRing();
      return;
    }

    if (visitedLocation) {
      const loc = visitedLocation;
      const lockedBoss =
        loc.id === MORIA_GATE_ID || loc.id === MINAS_MORGUL_ID
          ? BOSSES_BY_LOCATION[loc.id]
          : null;
      if (lockedBoss && !defeatedBosses.has(lockedBoss.name)) {
        const partyHurt = party.some((id) => (damageById[id] ?? 0) > 0);
        if (partyHurt && food > 0) {
          waitOneDay();
          return;
        }
        const bossPack =
          loc.id === MINAS_MORGUL_ID
            ? [lockedBoss, ...Array.from({ length: dolGuldurNazgulSlain ? 5 : 8 }, () => NAZGUL_ENEMY)]
            : [lockedBoss];
        setEncounter({
          monster: lockedBoss,
          dangerous: true,
          solo: bossPack.length === 1,
          pack: bossPack,
          wraithsStand: loc.id === MINAS_MORGUL_ID,
        });
        return;
      }

      const nextRecruit = autoPlayNextStoryRecruit(loc.id, journeyDay, party, banishedTraitors);
      if (nextRecruit) {
        attemptRecruit(nextRecruit);
        return;
      }

      const giftGiver = CHARACTERS.find(
        (character) =>
          isCharacterRecruitableHere(character.id, loc.id, journeyDay) &&
          (!(character.id in RANDOM_PRESENCE) || randomPresence[character.id]) &&
          !banishedTraitors.has(character.id) &&
          hasGifts(character.id),
      );
      if (giftGiver) {
        talkToCharacter(giftGiver.id);
        return;
      }

      if (FOOD_SUPPLY_LOCATION_IDS.has(loc.id) && food < Math.max(5, Math.floor(capacity * 0.55))) {
        setFood(capacity);
        foodRef.current = capacity;
        return;
      }

      if (!isMoving && autoPlayShouldFarm(food, capacity)) {
        farmFood();
        return;
      }

      if (autoPlayShouldWaitAtLocation(loc.id, journeyDay, party)) {
        if (!isMoving && food > 0) {
          waitOneDay();
        }
        return;
      }

      if (loc.id === LOTHLORIEN_ID && !hasCloaks) {
        setHasCloaks(true);
        return;
      }

      const offered = TRANSPORT_BY_LOCATION[loc.id];
      if (
        offered &&
        transport !== offered &&
        !(offered === "ship" && party.includes("cirdan")) &&
        (offered === "horse" || !transport)
      ) {
        setTransport(offered);
        return;
      }

      const leftId = loc.id;
      setVisitedLocation(null);
      setTargetLocation(null);

      const routeIdx = autoRouteIndexRef.current;
      if (routeIdx < AUTO_ROUTE.length && AUTO_ROUTE[routeIdx] === leftId) {
        autoRouteIndexRef.current = routeIdx + 1;
      }
      const nextId = AUTO_ROUTE[autoRouteIndexRef.current];
      if (nextId !== undefined) {
        const next = locations.find((l) => l.id === nextId);
        if (next) {
          marchToLocation(next);
        }
      }
      return;
    }

    if (isMoving || target) {
      return;
    }

    if (autoPlayShouldFarm(food, capacity)) {
      farmFood();
      return;
    }

    const nextId = AUTO_ROUTE[autoRouteIndexRef.current];
    if (nextId !== undefined) {
      const next = locations.find((l) => l.id === nextId);
      if (next) {
        marchToLocation(next);
      }
    }
  }, [
    autoPlay,
    ending,
    levelUpCharacterId,
    levelUpQueue,
    expById,
    statBonusById,
    damageById,
    ringDaysById,
    deathNotice,
    reclaimedFrom,
    recruitRefusal,
    dismissRecruitRefusal,
    samCatchUpOpen,
    recruitOffer,
    acceptRecruitOffer,
    acceptSamCatchUp,
    foodFarmed,
    talkResult,
    exploreResult,
    battle,
    encounter,
    visitedLocation,
    party,
    journeyDay,
    food,
    transport,
    hasCloaks,
    defeatedBosses,
    dolGuldurNazgulSlain,
    isMoving,
    target,
    locations,
    randomPresence,
    banishedTraitors,
    attemptRecruit,
    makeBearer,
    hasGifts,
    talkToCharacter,
    startBattle,
    marchToLocation,
    waitOneDay,
    farmFood,
    destroyRing,
  ]);

  useEffect(() => {
    autoPlayRef.current = autoPlay;
  }, [autoPlay]);

  useEffect(() => {
    autoPlayTickRef.current = autoPlayTick;
  }, [autoPlayTick]);

  useEffect(() => {
    if (!autoPlay || !created || ending) {
      return undefined;
    }
    const timer = window.setInterval(() => autoPlayTickRef.current(), 750);
    return () => window.clearInterval(timer);
  }, [autoPlay, created, ending]);

  // Auto-play resolves each fight instantly; keep the result modal up for a
  // beat so the player actually sees the battle and its outcome, then close it.
  useEffect(() => {
    if (!autoPlay || !battle || !battle.outcome) {
      return undefined;
    }
    const timer = window.setTimeout(() => setBattle(null), 1000);
    return () => window.clearTimeout(timer);
  }, [autoPlay, battle]);


  useEffect(() => {
    // No destination, or the march is manually halted: stay put. When `stopped`
    // the target is deliberately left set so the marker stays and the journey
    // can be resumed.
    if (!target || stopped) {
      return undefined;
    }

    const activeTarget: Point = target;
    const arrivalLocation = targetLocation;
    setIsMoving(true);

    if (!playerRef.current) {
      playerRef.current = player;
    }

    // Each undefeated gate (Moria, Minas Morgul) walls off the terrain cell just
    // east of it — as if that square were painted black on the mask. You must go
    // to the gate and clear its guardian before the eastward pass opens; until
    // then the cell is impassable to anyone on the ground (Eagles still fly over).
    const blockedGateCells = new Set<string>();
    for (const id of [MORIA_GATE_ID, MINAS_MORGUL_ID]) {
      const gate = locations.find((location) => location.id === id);
      const boss = gate ? BOSSES_BY_LOCATION[id] : null;
      if (!gate || !boss || defeatedBosses.has(boss.name)) {
        continue;
      }
      const cellKey = getTerrainAtPoint(gate.point).cellKey;
      if (!cellKey) {
        continue;
      }
      const [cellX, cellY] = cellKey.split(":").map(Number);
      blockedGateCells.add(`${cellX + 1}:${cellY}`);
    }

    // Cells a boarded ship may step onto (losing the ship): every harbour, plus
    // any coastal city — one whose cell has open water on a neighbouring cell.
    // Only real harbours sell passage back out, so a coastal landing strands the
    // party ashore on purpose.
    const NEIGHBOR_CELL = 10;
    const landfallCells = new Set<string>();
    for (const location of locations) {
      const key = getTerrainAtPoint(location.point).cellKey;
      if (!key) {
        continue;
      }
      if (HARBOR_IDS.has(location.id)) {
        landfallCells.add(key);
        continue;
      }
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) {
            continue;
          }
          const neighbor = getTerrainAtPoint({
            x: location.point.x + dx * NEIGHBOR_CELL,
            y: location.point.y + dy * NEIGHBOR_CELL,
          });
          if (neighbor.name === "water") {
            landfallCells.add(key);
          }
        }
      }
    }

    // Commit the imperatively-driven figure/camera back into React state. Called
    // at every stop so the rest of the app (figure render, save, camera) picks up
    // the final position once the per-frame imperative march ends.
    function syncTravelState() {
      if (playerRef.current) {
        setPlayer(playerRef.current);
      }
      if (offsetRef.current) {
        setOffset(offsetRef.current);
      }
    }

    function finishTravel(visitLocation: MapLocation | null) {
      syncTravelState();
      if (visitLocation) {
        openVisitedLocationRef.current(visitLocation);
      } else {
        setVisitedLocation(null);
        setCurrentLocation(null);
      }
      setTarget(null);
      setTargetLocation(null);
      setIsMoving(false);
      frameRef.current = null;
      // Reunite: any splinter squad the active party comes to rest beside folds
      // back in. Walking one squad onto another is how you recombine them.
      const here = playerRef.current;
      if (here) {
        const near = squadsRef.current.filter(
          (s) => Math.hypot(s.point.x - here.x, s.point.y - here.y) <= MEMBER_PICKUP_RANGE,
        );
        if (near.length > 0) {
          const nearIds = new Set(near.map((s) => s.id));
          const rejoining = near.flatMap((s) => s.members);
          setSquads((prev) => prev.filter((s) => !nearIds.has(s.id)));
          setParty((prev) => [...prev, ...rejoining.filter((id) => !prev.includes(id))]);
        }
      }
    }

    function step(time: number) {
      if (!lastTimeRef.current) {
        lastTimeRef.current = time;
      }

      // Freeze movement while a modal is open; keep the clock fresh so there is
      // no time jump when the player closes it.
      if (animationPausedRef.current) {
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
        setHeroPath((path) => appendPathPoint(path, activeTarget, trailCapRef.current));
        finishTravel(arrivalLocation);
        return;
      }

      const cos = dx / routeRadius;
      const sin = dy / routeRadius;
      const members = partyRef.current;
      const activeTransport = transportRef.current ? TRANSPORTS[transportRef.current] : null;
      // Eomer speeds the march; Bombadil dawdles (1.5× longer); Cirdan lets the
      // party sail; Gollum ignores rough-terrain penalties; items may hasten too.
      const itemSpeedMult = members.reduce((m, id) => {
        const it = equippedItemsRef.current[id] ? ITEM_BY_ID[equippedItemsRef.current[id]] : undefined;
        return it?.speed ? m * it.speed : m;
      }, 1);
      const transportSpeed =
        ((activeTransport ? activeTransport.speed : 1) *
          (members.includes("eomer") ? EOMER_SPEED_MULTIPLIER : 1) *
          itemSpeedMult) /
        (members.includes("bombadil") ? BOMBADIL_SLOW_FACTOR : 1);
      const canSail = (activeTransport ? activeTransport.sea : false) || members.includes("cirdan");
      const currentTerrain = getTerrainAtPoint(current);
      // Gollum ignores rough ground; Cirdan (or a ship) wipes the water penalty;
      // eagles fly over everything.
      const onWater = currentTerrain.name === "water";
      const terrainCost =
        transportRef.current === "eagle" || members.includes("gollum") || (onWater && canSail)
          ? 1
          : currentTerrain.cost;
      // Círdan the Shipwright doubles the party's pace while at sea.
      const cirdanSea = onWater && canSail && members.includes("cirdan") ? CIRDAN_SEA_SPEED : 1;
      const visibleSpeed =
        (SPEED_PX_PER_SECOND * animationSpeed * transportSpeed * cirdanSea) / terrainCost;
      const travel = Math.min(routeRadius, visibleSpeed * elapsedSeconds);

      // A boarded ship is a one-way passage: it may only step ashore onto a
      // harbour or coastal-city cell (and is lost when it does). Other land is a
      // wall.
      const onShip = transportRef.current === "ship";

      function canMoveTo(point: Point): boolean {
        const terrain = getTerrainAtPoint(point);
        // The black Mordor wall — and a still-sealed gate's east cell — block
        // everything on the ground; only Eagles, flying overhead, can pass.
        if (
          (terrain.impassable || (terrain.cellKey !== null && blockedGateCells.has(terrain.cellKey))) &&
          transportRef.current !== "eagle"
        ) {
          return false;
        }
        // On a ship you ride the water; you may only set foot on land if that
        // very cell holds a harbour — the open coast is a wall.
        if (
          onShip &&
          terrain.name !== "water" &&
          !(terrain.cellKey !== null && landfallCells.has(terrain.cellKey))
        ) {
          return false;
        }
        // Mountains are passable now (just slow); wide water still blocks: you may
        // wade back through cells already crossed, but never enter more than
        // MAX_WATER_CROSSING_CELLS fresh ones before reaching land again.
        if (terrain.name === "water" && !canSail) {
          const cell = terrain.cellKey;
          if (
            cell !== null &&
            !waterRunRef.current.has(cell) &&
            waterRunRef.current.size >= MAX_WATER_CROSSING_CELLS
          ) {
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
          if (terrain.cellKey !== null) {
            waterRunRef.current.add(terrain.cellKey);
          }
        } else {
          waterRunRef.current.clear();
        }
      }

      // Move toward (dirX, dirY); if blocked, fan out to ever-wider angles on
      // both sides (up to ~88°) so the figure slides along angled walls instead
      // of dead-stopping. Smaller deflections (closer to the goal) win.
      function resolveMovement(from: Point, distance: number, dirX: number, dirY: number): Point | null {
        const baseAngle = Math.atan2(dirY, dirX);
        for (const deg of SLIDE_DEFLECTIONS) {
          const angle = baseAngle + (deg * Math.PI) / 180;
          const point = {
            x: from.x + Math.cos(angle) * distance,
            y: from.y + Math.sin(angle) * distance,
          };
          if (canMoveTo(point)) {
            return point;
          }
        }
        return null;
      }

      let moveDirX = cos;
      let moveDirY = sin;
      let startPos = current;

      if (autoPlayRef.current) {
        const steer = autoSteerRef.current;
        // "Progress" = actually closing on the target. Hugging a wall sideways
        // without getting closer still counts as stalled, so the detour widens.
        if (routeRadius < steer.bestGoalDist - 1) {
          steer.bestGoalDist = routeRadius;
          steer.stallMs = 0;
          steer.turnIndex = 0;
        } else {
          steer.stallMs += elapsedSeconds * 1000;
        }

        if (steer.stallMs >= AUTO_STALL_MS) {
          // Widen the turn each attempt; once past ±180° flip to the other side.
          steer.turnIndex += 1;
          if (steer.turnIndex > AUTO_MAX_TURN_STEPS) {
            steer.turnIndex = 1;
            steer.turnSign = steer.turnSign === 1 ? -1 : 1;
          }
          const goalAngle = Math.atan2(dy, dx);
          const angle =
            goalAngle + steer.turnSign * steer.turnIndex * ((AUTO_TURN_DEG * Math.PI) / 180);
          moveDirX = Math.cos(angle);
          moveDirY = Math.sin(angle);
          steer.stallMs = 0;
        }
      }

      let nextPlayer = startPos;
      let remainingTravel = travel;
      for (let substep = 0; substep < MOVE_SUBSTEPS; substep += 1) {
        const slice = remainingTravel / (MOVE_SUBSTEPS - substep);
        const resolved = resolveMovement(nextPlayer, slice, moveDirX, moveDirY);
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
        if (autoPlayRef.current) {
          frameRef.current = requestAnimationFrame(step);
          return;
        }
        syncTravelState();
        setIsMoving(false);
        frameRef.current = null;
        return;
      }

      const arrived = Math.hypot(activeTarget.x - nextPlayer.x, activeTarget.y - nextPlayer.y) <= 0.5;
      if (arrived) {
        nextPlayer = activeTarget;
      }

      // Reached the world's western edge under sail: offer to try the Straight
      // Road into the West rather than sail off the map.
      if (onShip && nextPlayer.x <= 14 && getTerrainAtPoint(nextPlayer).name === "water") {
        playerRef.current = nextPlayer;
        syncTravelState();
        setValinorAttempt(true);
        setTarget(null);
        setTargetLocation(null);
        setIsMoving(false);
        frameRef.current = null;
        return;
      }

      // Reached a harbour off a ship (canMoveTo walls every other coast): don't
      // step ashore yet — hold on the water and ask, since landing loses the ship.
      // On landing, put ashore exactly at the harbour (if a marker was clicked) or
      // at the point that was tapped, not wherever the hull happened to touch land.
      if (onShip && getTerrainAtPoint(nextPlayer).name !== "water") {
        playerRef.current = nextPlayer;
        syncTravelState();
        setPendingDisembark({
          point: arrivalLocation ? arrivalLocation.point : activeTarget,
          location: arrivalLocation,
        });
        setTarget(null);
        setTargetLocation(null);
        setIsMoving(false);
        frameRef.current = null;
        return;
      }

      const nextJourneyMiles = journeyMilesRef.current + actualTravel * terrainCost;
      const nextJourneyDay = Math.floor(nextJourneyMiles / MILES_PER_DAY);

      journeyMilesRef.current = nextJourneyMiles;
      playerRef.current = nextPlayer;
      // Move the figure imperatively — no per-frame setState, so the march no
      // longer re-renders the whole component every frame. State is committed at
      // the next stop (see syncTravelState). The render reads playerRef while
      // isMoving, so any incidental re-render mid-march stays in sync.
      if (figureRef.current) {
        figureRef.current.style.left = `${nextPlayer.x * zoomRef.current}px`;
        figureRef.current.style.top = `${nextPlayer.y * zoomRef.current}px`;
      }
      // Only churn the trail's state when it's actually being drawn.
      if (showHeroPathRef.current) {
        setHeroPath((path) => appendPathPoint(path, nextPlayer, trailCapRef.current));
      }

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
          // Follow imperatively too (committed at the next stop).
          writePanTransform(clampedOffset);
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
  }, [animationSpeed, defeatedBosses, getTerrainAtPoint, locations, recruitCharacter, target, targetLocation, stopped]);

  // While marching the figure is driven imperatively (playerRef), so an
  // incidental re-render must read the live position, not the stale state.
  const playerLayer = mapToLayer(isMoving && playerRef.current ? playerRef.current : player);
  const targetLayer = target ? mapToLayer(target) : null;
  // Only project the trail when it's actually shown. Layer coords (zoom-only),
  // so panning doesn't remap it.
  const heroPathLayer = useMemo(
    () => (showHeroPath ? heroPath.map((point) => mapToLayer(point)) : []),
    [showHeroPath, heroPath, mapToLayer],
  );
  const journeyDate = useMemo(() => getJourneyDate(journeyDay, months), [journeyDay, months]);

  const bonusFor = (id: string): StatBonus => statBonusById[id] ?? ZERO_BONUS;
  // Flat (always-on) stat bonuses from a carried item.
  const itemBonusFor = (id: string): StatBonus =>
    itemStatBonus(equippedItems[id] ? ITEM_BY_ID[equippedItems[id]] : undefined);
  // Allocated level-up points, party auras (Bombadil/Elrond/Galadriel), and items.
  const totalBonusFor = (character: Character): StatBonus =>
    addBonus(addBonus(bonusFor(character.id), auraBonus(character, party)), itemBonusFor(character.id));
  const iconFor = (character: { id: string; icon: string }): string =>
    emote && emote.id === character.id ? iconVariant(character.icon, emote.kind) : character.icon;
  const partyCharacters = useMemo(
    () => CHARACTERS.filter((character) => party.includes(character.id)),
    [party],
  );
  const anyHurt = partyCharacters.some((character) => (damageById[character.id] ?? 0) > 0);
  const foodCapacity = foodCapacityFor(transport);
  // Where food can be restocked, and up to how much: the great towns fill the
  // full carried capacity; any harbour stocks only a foot-traveller's ration.
  const canRestockHere =
    !!visitedLocation &&
    (FOOD_SUPPLY_LOCATION_IDS.has(visitedLocation.id) || HARBOR_IDS.has(visitedLocation.id));
  const supplyCap =
    visitedLocation && FOOD_SUPPLY_LOCATION_IDS.has(visitedLocation.id)
      ? foodCapacity
      : FOOD_DAYS_BASE;
  // Saruman at Isengard is an ally only if the bearer is duller than him and no
  // Gandalf is along; otherwise he's a boss. Once fought, he can't be recruited.
  const sarumanBossName = BOSSES_BY_LOCATION[ISENGARD_ID].name;
  // Saruman has left Isengard one way or another (slain there, or spared).
  const sarumanGone = defeatedBosses.has(sarumanBossName) || sarumanSpared;
  // After he's spared, he roams the NW for two months, then holds the Shire.
  const sarumanDaysOut = sarumanSpared ? journeyDay - sarumanSparedDay : 0;
  const sarumanRoams = sarumanSpared && sarumanDaysOut < SARUMAN_SCOUR_DAYS;
  const sarumanScouring = sarumanSpared && sarumanDaysOut >= SARUMAN_SCOUR_DAYS;
  const sarumanFriendly = (() => {
    // Once Wormtongue has slunk to Isengard, Saruman is beyond parley.
    if (
      party.includes("gandalf") ||
      party.includes("treebeard") ||
      sarumanGone ||
      grimaFled
    ) {
      return false;
    }
    const bearer = CHARACTERS.find((c) => c.id === bearerId);
    const saruman = CHARACTERS.find((c) => c.id === "saruman");
    if (!bearer || !saruman) {
      return false;
    }
    return effectiveStats(bearer, totalBonusFor(bearer)).intelligence < saruman.intelligence;
  })();
  // The Corsair captain parleys rather than fights for a company clever enough on
  // the whole — average intelligence above 8. Talk to him then for safe passage.
  const corsairCaptainFriendly =
    party.length > 0 &&
    party.reduce((sum, id) => {
      const c = CHARACTERS.find((ch) => ch.id === id);
      return sum + (c ? effectiveStats(c, totalBonusFor(c)).intelligence : 0);
    }, 0) /
      party.length >
      8;
  // A fled Gríma with no Isengard left to run to (Saruman already beaten) skulks
  // the wild until someone puts him down.
  const grimaRoaming = grimaFled && !grimaSlain && defeatedBosses.has(sarumanBossName);
  // Once Saruman is gone (slain or spared) the Ents take Isengard — Treebeard
  // settles there and no longer roams Fangorn or agrees to join.
  const treebeardSettled = sarumanGone;
  const recruitsHere = visitedLocation
    ? CHARACTERS.filter(
        (character) =>
          isCharacterRecruitableHere(character.id, visitedLocation.id, journeyDay) &&
          (!(character.id in RANDOM_PRESENCE) || randomPresence[character.id]) &&
          !banishedTraitors.has(character.id) &&
          // The dead don't return — a companion who fell (in battle or to hunger)
          // is never offered for recruitment again.
          !deathCauseById[character.id] &&
          // A companion who bolted with the Ring is hunted in the wild, not found
          // waiting at his old haunt (Boromir at Rivendell, Saruman at Isengard…).
          character.id !== rogueBearerId &&
          (character.id !== "sam" || !samCaughtUp) &&
          (character.id !== "saruman" || sarumanFriendly) &&
          // Wormtongue only lurks at Edoras until Gandalf drives him out.
          (character.id !== "grima" || !grimaFled) &&
          // Hide companions already aboard when we arrived (recruited on an
          // earlier visit); the one just recruited this visit still shows.
          !entryParty.has(character.id),
      )
    : [];
  // The boss to offer a fight with at the current location (null if none, slain,
  // or Saruman is currently a friend).
  // The Witch-king cast down at Minas Morgul breaks the wraiths: they stop
  // roaming and any unfought riding (e.g. still lurking at Weathertop) disperses.
  const wraithsBroken = defeatedBosses.has(BOSSES_BY_LOCATION[MINAS_MORGUL_ID].name);
  // The Ringwraiths stop roaming once leaderless (Witch-king thrown down) or once
  // the Ring they hunt is unmade.
  const nazgulGone = wraithsBroken || ringDestroyed;
  // Dol Guldur posts three plain wraiths over its orc garrison — but only until
  // the Nine gather in Mordor: once Minas Morgul has been laid eyes on, the
  // wraiths are gone and the captain holds it with orcs alone.
  const dolGuldurHasWraiths = !visitedLocationIds.has(MINAS_MORGUL_ID);
  // Dol Guldur is led by a wraith while the Nine are abroad, else by the orc
  // captain — and is cleared once either has fallen.
  const dolGuldurBoss = dolGuldurHasWraiths ? DOL_GULDUR_WRAITH : DOL_GULDUR_CAPTAIN;
  const locationBoss = (() => {
    if (!visitedLocation) {
      return null;
    }
    if (visitedLocation.id === DOL_GULDUR_ID) {
      if (defeatedBosses.has(DOL_GULDUR_WRAITH.name) || defeatedBosses.has(DOL_GULDUR_CAPTAIN.name)) {
        return null;
      }
      return dolGuldurBoss;
    }
    // The Scouring: a spared Saruman holds Hobbiton two months on — fought to the
    // death (with Gríma if still alive). No parley this time.
    if (visitedLocation.id === HOBBITON_ID && sarumanScouring) {
      return SARUMAN_ENEMY;
    }
    // Isengard: Saruman holds it (unless beaten, parleyed friendly, spared, or
    // fled with the Ring). With him gone, a Gríma who slunk here still skulks the
    // ruins until slain — so the player who chased him here actually finds him.
    if (visitedLocation.id === ISENGARD_ID) {
      const saruman = BOSSES_BY_LOCATION[ISENGARD_ID];
      const sarumanFled =
        !!rogueBearerId && CHARACTERS.find((c) => c.id === rogueBearerId)?.icon === saruman.icon;
      const sarumanHere =
        !defeatedBosses.has(saruman.name) && !sarumanFriendly && !sarumanFled && !sarumanSpared;
      if (sarumanHere) {
        return saruman;
      }
      if (grimaFled && !grimaSlain) {
        return GRIMA_ENEMY;
      }
      return null;
    }
    const boss = BOSSES_BY_LOCATION[visitedLocation.id];
    if (!boss || defeatedBosses.has(boss.name)) {
      return null;
    }
    // A boss who fled with the Ring no longer holds his seat — he's hunted in the
    // wild instead. Matched by portrait to his companion self.
    if (rogueBearerId) {
      const rogue = CHARACTERS.find((c) => c.id === rogueBearerId);
      if (rogue && rogue.icon === boss.icon) {
        return null;
      }
    }
    // A friendly Corsair captain is parleyed with, not fought.
    if (visitedLocation.id === CORSAIRS_CITY_ID && corsairCaptainFriendly) {
      return null;
    }
    // Weathertop's riding melts away once their lord is undone.
    if (visitedLocation.id === WEATHERTOP_ID && wraithsBroken) {
      return null;
    }
    return boss;
  })();
  // Hobbiton's art swaps to the scoured ruin (34_hobbiton2) while Saruman holds it.
  const locationArtSrc = visitedLocation ? locationImage(visitedLocation.id, seasonAt(journeyDay)) : null;
  const scouredArtSrc =
    visitedLocation?.id === HOBBITON_ID && sarumanScouring && locationArtSrc
      ? locationArtSrc.replace("10_hobbiton.jpg", "34_hobbiton2.jpg")
      : locationArtSrc;
  // The mount/ship offered here (null if none, or a ship while Círdan sails free).
  const locationTransport = (() => {
    if (!visitedLocation) {
      return null;
    }
    const offered = TRANSPORT_BY_LOCATION[visitedLocation.id];
    if (!offered || (offered === "ship" && party.includes("cirdan"))) {
      return null;
    }
    if (offered === "eagle" && !eagleOffered) {
      return null; // the eagles aren't here this visit
    }
    if (offered === "ship" && !shipOffered) {
      return null; // no ship in port this visit
    }
    return offered;
  })();
  // Log everyone the party lays eyes on into `metCharacterIds`, so the "found"
  // tally credits characters seen but never recruited (some are mutually
  // exclusive and can't all join one run). Sources: the recruit list at the
  // current location, an active offer/refusal, and any character faced as a foe
  // (matched by portrait — Éomer, Gollum, Saruman, …) in a battle or encounter.
  const recruitsHereKey = recruitsHere.map((character) => character.id).join(",");
  useEffect(() => {
    const seen: string[] = recruitsHere.map((character) => character.id);
    if (recruitOffer) {
      seen.push(recruitOffer);
    }
    if (recruitRefusal?.characterId) {
      seen.push(recruitRefusal.characterId);
    }
    const foes = [
      ...(battle?.enemies ?? []).map((combatant) => combatant.icon),
      ...(encounter ? [encounter.monster, ...encounter.pack].map((monster) => monster.icon) : []),
    ];
    for (const icon of foes) {
      const match = icon ? CHARACTERS.find((character) => character.icon === icon) : undefined;
      if (match) {
        seen.push(match.id);
      }
    }
    if (seen.length === 0) {
      return;
    }
    setMetCharacterIds((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const id of seen) {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    // recruitsHere is rebuilt each render; key off its stable id list instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recruitsHereKey, recruitOffer, recruitRefusal, battle, encounter]);

  // Take a transport, recording the day eagles joined (so they can leave after a
  // month). Switching from a different transport asks for confirmation first.
  const applyTransport = useCallback((next: TransportId) => {
    setTransport(next);
    setEagleSince(next === "eagle" ? journeyDayRef.current : null);
    setPendingTransport(null);
  }, []);
  const requestTransport = useCallback(
    (next: TransportId) => {
      // The eagles answer only to Gandalf — without him they won't carry anyone.
      if (next === "eagle" && !party.includes("gandalf")) {
        showRecruitRefusal(t("transport.eaglesNeedGandalf"));
        return;
      }
      if (transportRef.current && transportRef.current !== next) {
        setPendingTransport(next);
      } else {
        applyTransport(next);
      }
    },
    [applyTransport, party, showRecruitRefusal, t],
  );
  // Board a ship at a harbour: drop the figure onto the open water beside it and
  // set sail. From here only a harbour coast will take the party back ashore.
  const boardShip = useCallback(
    (harborId: number) => {
      const harbor = locations.find((l) => l.id === harborId);
      if (!harbor) {
        return;
      }
      // Pick the open-water cell to set sail from: the harbour's preferred hint
      // if it's sea, else scan its neighbours outward for the nearest water.
      const cell = 10;
      const candidates: { x: number; y: number }[] = [];
      const pref = SHIP_BOARD_OFFSET[harborId];
      if (pref) {
        candidates.push(pref);
      }
      for (const r of [1, 2, 3]) {
        for (const dy of [-1, 0, 1]) {
          for (const dx of [-1, 0, 1]) {
            if (dx === 0 && dy === 0) continue;
            candidates.push({ x: dx * cell * r, y: dy * cell * r });
          }
        }
      }
      let point = { x: harbor.point.x, y: harbor.point.y };
      for (const c of candidates) {
        const p = { x: harbor.point.x + c.x, y: harbor.point.y + c.y };
        if (getTerrainAtPoint(p).name === "water") {
          point = p;
          break;
        }
      }
      applyTransport("ship");
      playerRef.current = point;
      setPlayer(point);
      setTarget(null);
      setTargetLocation(null);
      setStopped(false);
      setVisitedLocation(null);
      setCurrentLocation(null);
      waterRunRef.current.clear();
      centerOnPlayer();
    },
    [locations, applyTransport, centerOnPlayer, getTerrainAtPoint],
  );
  // Markers only re-project when the camera (offset/zoom) or labels change — not
  // on every movement frame where only the figure moves.
  const locationMarkers = useMemo(
    () =>
      locations.map((location) => {
        const pos = mapToLayer(location.point);
        // Places already visited fade to grey so the unvisited red dots stand out.
        const visited = visitedLocationIds.has(location.id);
        return (
          <button
            key={location.id}
            type="button"
            title={locName(location)}
            aria-label={locName(location)}
            className={`pointer-events-auto absolute z-10 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(60,0,0,0.85),0_0_0_2.5px_#ffffff] transition-transform hover:scale-[1.6] ${
              visited ? "bg-neutral-500 hover:bg-neutral-400" : "bg-red-600 hover:bg-red-500"
            }`}
            style={{ left: pos.x, top: pos.y }}
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
            onClick={(event) => handleMarkerClick(event, location)}
          />
        );
      }),
    [locations, mapToLayer, locName, handleMarkerClick, visitedLocationIds],
  );
  const openCharacter = openCharacterId
    ? (CHARACTERS.find((character) => character.id === openCharacterId) ?? null)
    : null;
  const openStats = openCharacter
    ? computeCharacterStats(
        openCharacter,
        ringDaysById[openCharacter.id] ?? 0,
        bearerId,
        damageById[openCharacter.id] ?? 0,
        totalBonusFor(openCharacter),
      )
    : null;
  const openExp = openCharacter ? (expById[openCharacter.id] ?? 0) : 0;
  const openLevel = levelForExp(openExp);
  // One roster row (portrait + level + full stats) for the party table panel.
  const toSummaryRow = (character: Character): PartySummaryRow => ({
    id: character.id,
    icon: iconFor(character),
    level: levelForExp(expById[character.id] ?? 0).level,
    stats: computeCharacterStats(
      character,
      ringDaysById[character.id] ?? 0,
      bearerId,
      damageById[character.id] ?? 0,
      totalBonusFor(character),
    ),
  });
  // Reclaimed the Ring from a fallen rogue — pick its next bearer from the same
  // table panel. Eligible companions only (some can never carry it).
  const bearerChooserOpen =
    !!reclaimedFrom &&
    !ending &&
    !battle &&
    !deathNotice &&
    !levelUpCharacterId &&
    levelUpQueue.length === 0;
  // Roster rows, built only while a panel is open (recomputed each render, but
  // the work is trivial and the panels are brief).
  const partySummaryRows: PartySummaryRow[] = partySummaryOpen
    ? partyCharacters.map(toSummaryRow)
    : [];
  const bearerCandidateRows: PartySummaryRow[] = bearerChooserOpen
    ? partyCharacters.filter((character) => !NON_BEARERS.has(character.id)).map(toSummaryRow)
    : [];
  // Frodo's creation points are baked into his bonus; don't count them as
  // level-up spending.
  const creationHero = CHARACTERS.find((character) => character.id === RING_BEARER_ID)!;
  const creationSpent =
    creationBonus.strength + creationBonus.defense + creationBonus.intelligence + creationBonus.luck;
  const levelUpHero = levelUpCharacterId
    ? (CHARACTERS.find((character) => character.id === levelUpCharacterId) ?? null)
    : null;
  const levelUpExistingBonus = levelUpCharacterId
    ? (statBonusById[levelUpCharacterId] ?? ZERO_BONUS)
    : ZERO_BONUS;
  const levelUpTotalPoints = levelUpCharacterId
    ? unspentPointsFor(levelUpCharacterId, expById[levelUpCharacterId] ?? 0, levelUpExistingBonus)
    : 0;
  const levelUpDraftSpent = bonusPoints(levelUpDraft);
  const levelUpLevel = levelForExp(levelUpCharacterId ? (expById[levelUpCharacterId] ?? 0) : 0);
  const ringBearer = CHARACTERS.find((character) => character.id === bearerId);
  // The Ring only counts for the squad actually carrying the bearer — a splinter
  // group off on its own can't destroy it at Mount Doom.
  // Once cast into the fire the party no longer carries the Ring: the Doom prompt
  // won't reopen and all Ring-driven events (betrayal, the bearer's fall) cease.
  const hasRing =
    !ringDestroyed && !!bearerId && rogueBearerId === null && party.includes(bearerId);
  // The figure on the map is the bearer (when travelling with the active squad),
  // or — for a splinter / while the Ring is fled — the group's lead, i.e. the
  // first member in party order (for a splinter, whoever was left first). Using
  // party order (not CHARACTERS order) keeps the active figure and the parked
  // squad marker, which both key off the lead, showing the same hero.
  const figureCharacter =
    ringBearer && party.includes(ringBearer.id)
      ? ringBearer
      : CHARACTERS.find((c) => c.id === party[0]);
  useEffect(() => {
    const currentIcons = new Set<string>();
    const addCharacter = (character: Character | null | undefined) => {
      if (character) {
        currentIcons.add(character.icon);
      }
    };
    for (const character of partyCharacters) {
      addCharacter(character);
    }
    for (const character of recruitsHere) {
      addCharacter(character);
    }
    for (const id of parkedMembers) {
      addCharacter(CHARACTERS.find((character) => character.id === id));
    }
    addCharacter(openCharacter);
    addCharacter(creationHero);
    addCharacter(levelUpHero);
    addCharacter(ringBearer);
    addCharacter(figureCharacter);
    addCharacter(recruitOffer ? CHARACTERS.find((character) => character.id === recruitOffer) : null);
    addCharacter(rogueFledNotice ? CHARACTERS.find((character) => character.id === rogueFledNotice) : null);
    addCharacter(reclaimedFrom ? CHARACTERS.find((character) => character.id === reclaimedFrom) : null);

    const characterIcons = new Set(CHARACTERS.map((character) => character.icon));
    for (const combatant of [...(battle?.allies ?? []), ...(battle?.enemies ?? [])]) {
      if (combatant.icon && characterIcons.has(combatant.icon)) {
        currentIcons.add(combatant.icon);
      }
    }

    for (const icon of currentIcons) {
      preloadImage(iconVariant(icon, "joy"));
      preloadImage(iconVariant(icon, "refuse"));
      preloadImage(iconVariant(icon, "pain"));
      preloadImage(iconVariant(icon, "dark"));
    }
  }, [
    battle,
    creationHero,
    figureCharacter,
    parkedMembers,
    levelUpHero,
    openCharacter,
    partyCharacters,
    reclaimedFrom,
    recruitOffer,
    recruitsHere,
    ringBearer,
    rogueFledNotice,
  ]);
  const bearerCorruption = ringBearer
    ? computeCharacterStats(
        ringBearer,
        ringDaysById[ringBearer.id] ?? 0,
        bearerId,
        damageById[ringBearer.id] ?? 0,
        totalBonusFor(ringBearer),
      ).corruption
    : 0;
  bearerCorruptionRef.current = bearerCorruption;
  const hasFallen = bearerCorruption >= 100;
  // Resilience exhausted before reaching Mount Doom: the bearer succumbs, slips
  // away with the Ring and bolts for Mount Doom. The party has two months to
  // catch him before he crowns himself.
  useEffect(() => {
    if (ringDestroyed || !(hasFallen && rogueBearerId === null && ending === null && bearerId)) {
      return;
    }
    // One event at a time: let the active squad finish its battle first.
    if (battle || encounter) {
      return;
    }
    // If the Ring fell to a bearer in an idle splinter, take control of that
    // squad before the Ring bolts — the chase belongs to the group it left.
    if (!party.includes(bearerId)) {
      const sq = squads.find((s) => s.members.includes(bearerId));
      if (sq) {
        focusSquad(sq.id);
        return;
      }
    }
    triggerRingFlight(bearerId);
  }, [ringDestroyed, hasFallen, rogueBearerId, ending, bearerId, battle, encounter, party, squads, focusSquad, triggerRingFlight]);

  useEffect(() => {
    if (!created || ending || party.length > 0) {
      return;
    }
    // The active squad was wiped out, but if others still wander the map, take
    // command of one rather than ending — only an empty roster is game over.
    // Prefer a squad that can carry the Ring (so a pending reclaim can offer it).
    if (squads.length > 0) {
      const squad = squads.find((s) => s.members.some((id) => !NON_BEARERS.has(id))) ?? squads[0];
      focusSquad(squad.id);
      return;
    }
    setEnding(rogueBearerId || !bearerId ? "nothing" : "battle");
    setBattle(null);
    setEncounter(null);
    setTarget(null);
    setTargetLocation(null);
    setIsMoving(false);
  }, [created, ending, party.length, squads, rogueBearerId, bearerId, focusSquad]);

  // The bearer fell and the Ring is loose (reclaim pending), but the survivors
  // still here can't carry it — only non-bearers linger. If a splinter squad has
  // an able member, take command of it so the bearer-chooser can offer the Ring
  // there. (When this group is wiped entirely, the empty-party effect above does
  // the same; this covers the case where non-bearer survivors remain.)
  useEffect(() => {
    if (!reclaimedFrom || ending || battle || party.length === 0) {
      return;
    }
    if (party.some((id) => !NON_BEARERS.has(id))) {
      return; // someone here can take it — the chooser handles it
    }
    const squad = squads.find((s) => s.members.some((id) => !NON_BEARERS.has(id)));
    if (squad) {
      focusSquad(squad.id);
    }
  }, [reclaimedFrom, ending, battle, party, squads, focusSquad]);

  // Re-check compatibility whenever the party changes: someone who can't abide
  // the new company (e.g. Gollum once a non-hobbit joins) walks off. One per
  // pass — the effect re-runs until the party is stable.
  useEffect(() => {
    const evictee = party.find((id) => {
      if (id === bearerId) {
        return false;
      }
      const character = CHARACTERS.find((c) => c.id === id);
      return character ? recruitRefusalKey(id, party.filter((p) => p !== id)) !== null : false;
    });
    if (!evictee) {
      return;
    }
    const key = recruitRefusalKey(evictee, party.filter((p) => p !== evictee));
    setParty((prev) => prev.filter((id) => id !== evictee));
    showRecruitRefusal(
      t("refuse.evicted", { name: charName(evictee), line: key ? t(key) : "" }).trim(),
      evictee,
    );
  }, [party, bearerId, showRecruitRefusal, t, charName]);

  useBattleClock(battle, battleSpeed, autoPlay, setBattle);

  // When a battle resolves: apply taken damage (once) and award XP on a win.
  useEffect(() => {
    if (!battle || !battle.outcome || battleAppliedRef.current) {
      return;
    }
    battleAppliedRef.current = true;

    // Hunt for the fled bearer resolved: a win reclaims the Ring (and prompts
    // for a new bearer); a loss ends the tale with nothing.
    if (battle.rogueId) {
      const nextDamage = { ...damageRef.current };
      for (const ally of battle.allies) {
        nextDamage[ally.key] = ally.maxHp - ally.hp;
      }
      damageRef.current = nextDamage;
      setDamageById(nextDamage);
      applyBattleCasualties(battle.allies);
      if (battle.outcome === "win") {
        setRogueBearerId(null);
        setRogueSinceDay(null);
        setReclaimedFrom(battle.rogueId);
      } else {
        setEnding((prev) => prev ?? "nothing");
      }
      setBattle(null);
      return;
    }

    // Betrayal lost: traitor takes the Ring — unless they cannot be its bearer.
    if (battle.outcome === "lose" && battle.betrayalBy) {
      if (NON_BEARERS.has(battle.betrayalBy)) {
        const nextDamage = { ...damageRef.current };
        for (const ally of battle.allies) {
          nextDamage[ally.key] = ally.maxHp - ally.hp;
        }
        damageRef.current = nextDamage;
        setDamageById(nextDamage);
        const traitorId = battle.betrayalBy;
        banishTraitor(traitorId);
        setParty((prev) => prev.filter((id) => id !== traitorId));
        applyBattleCasualties(battle.allies);
        showRecruitRefusal(
          traitorId === "gollum"
            ? t("refuse.gollumFled")
            : t("refuse.traitorReturns", { name: charName(traitorId) }),
          traitorId,
        );
        setBattle(null);
        return;
      }
      // The traitor seizes the Ring and vanishes, racing for Mount Doom — the
      // party has two months to hunt him down before he crowns himself.
      const traitorId = battle.betrayalBy;
      const nextDamage = { ...damageRef.current };
      for (const ally of battle.allies) {
        nextDamage[ally.key] = ally.maxHp - ally.hp;
      }
      damageRef.current = nextDamage;
      setDamageById(nextDamage);
      applyBattleCasualties(battle.allies);
      banishTraitor(traitorId);
      triggerRingFlight(traitorId);
      setBattle(null);
      return;
    }

    const nextDamage = { ...damageRef.current };
    for (const ally of battle.allies) {
      nextDamage[ally.key] = ally.maxHp - ally.hp;
    }
    damageRef.current = nextDamage;
    setDamageById(nextDamage);
    applyBattleCasualties(battle.allies);
    if (battle.outcome === "win") {
      // Tally felled foes for the statistics panel — both a running kill count
      // and the set of distinct portraits seen, so the foe gallery fills in.
      const slain = battle.enemies.filter((enemy) => enemy.hp <= 0);
      if (slain.length > 0) {
        setEnemiesKilled((count) => count + slain.length);
        setDefeatedEnemyIcons((prev) => {
          const next = new Set(prev);
          for (const enemy of slain) {
            if (enemy.icon) {
              next.add(enemy.icon);
            }
          }
          return next.size === prev.size ? prev : next;
        });
      }
      const toLevel: string[] = [];
      for (const ally of battle.allies) {
        if (ally.hp <= 0) {
          continue; // the fallen don't level up
        }
        const oldExp = expById[ally.key] ?? 0;
        const newExp = oldExp + battle.exp;
        const bonus = statBonusById[ally.key] ?? ZERO_BONUS;
        if (unspentPointsFor(ally.key, newExp, bonus) > unspentPointsFor(ally.key, oldExp, bonus)) {
          toLevel.push(ally.key);
        }
      }
      setExpById((prev) => {
        const next = { ...prev };
        for (const ally of battle.allies) {
          next[ally.key] = (prev[ally.key] ?? 0) + battle.exp;
        }
        return next;
      });
      if (toLevel.length > 0) {
        setLevelUpQueue((queue) => {
          const merged = [...queue];
          for (const id of toLevel) {
            if (!merged.includes(id)) {
              merged.push(id);
            }
          }
          return merged;
        });
      }

      // Betrayal repelled: subdued traitors flee; a slain Gollum never returns.
      if (battle.betrayalBy) {
        const traitorId = battle.betrayalBy;
        const traitor = battle.enemies[0];
        banishTraitor(traitorId);
        setParty((prev) => prev.filter((id) => id !== traitorId));
        if (traitorId === "gollum" && traitor.hp <= 0) {
          setSlainRoamingRecruits((prev) => new Set(prev).add("gollum"));
          setDeathCauseById((prev) => ({ ...prev, gollum: "battle" }));
          setDeathNotice({ ids: "gollum", cause: "battle" });
        } else {
          showRecruitRefusal(
            traitorId === "gollum"
              ? t("refuse.gollumFled")
              : t("refuse.traitorReturns", { name: charName(traitorId) }),
            traitorId,
          );
        }
      }
      if (battle.recruitId) {
        setRecruitOffer(battle.recruitId);
      }
      // A defeated boss never returns to its lair.
      const foe = battle.enemies[0];
      const activeBoss = !visitedLocation
        ? null
        : visitedLocation.id === DOL_GULDUR_ID
          ? // Whichever Dol Guldur boss led this fight — wraith or orc captain.
            visitedLocationIds.has(MINAS_MORGUL_ID)
            ? DOL_GULDUR_CAPTAIN
            : DOL_GULDUR_WRAITH
          : BOSSES_BY_LOCATION[visitedLocation.id];
      if (foe && activeBoss && foe.name === activeBoss.name && BOSS_NAMES.has(foe.name)) {
        setDefeatedBosses((prev) => new Set(prev).add(foe.name));
        // Clearing Dol Guldur while its wraiths were still posted there means the
        // three were slain — Minas Morgul will muster six of the Nine, not nine.
        if (visitedLocation?.id === DOL_GULDUR_ID && !visitedLocationIds.has(MINAS_MORGUL_ID)) {
          setDolGuldurNazgulSlain(true);
        }
      }
      // Wormtongue felled (at Isengard alongside Saruman, or cornered in the
      // wild) is gone for good — he won't haunt the roads again.
      if (battle.enemies.some((enemy) => enemy.icon === GRIMA_ENEMY.icon)) {
        setGrimaSlain(true);
      }
      // A spared Saruman run down (in the NW, or at the Scouring) is dead at last.
      if (battle.enemies.some((enemy) => enemy.icon === SARUMAN_ENEMY.icon)) {
        setSarumanSpared(false);
        setDefeatedBosses((prev) => new Set(prev).add(SARUMAN_NAME));
      }
    }
  }, [battle, expById, statBonusById, t, charName, applyBattleCasualties, showRecruitRefusal, visitedLocation, visitedLocationIds, banishTraitor]);

  // Show the next level-up allocation modal when the queue advances — but only
  // after the battle modal is dismissed, so it doesn't pop up over the fight.
  // A short closed-gap between consecutive modals turns the swap from a flicker
  // into a clear beat.
  useEffect(() => {
    // The bearer has fallen / the quest is over — no point allocating level-ups.
    if (ending) {
      if (levelUpCharacterId || levelUpQueue.length > 0) {
        setLevelUpCharacterId(null);
        setLevelUpQueue([]);
      }
      return;
    }
    // Open the first queued level-up once the battle modal is gone. Subsequent
    // heroes are swapped in by confirmLevelUp, so the modal never closes between.
    if (battle || levelUpCharacterId || levelUpQueue.length === 0) {
      return;
    }
    const [next, ...rest] = levelUpQueue;
    setLevelUpCharacterId(next);
    setLevelUpDraft(ZERO_BONUS);
    setLevelUpQueue(rest);
  }, [ending, battle, levelUpCharacterId, levelUpQueue]);

  // Roll "is he home?" once per visit for sometimes-present characters, and
  // snapshot who was already in the party on arrival — members recruited here on
  // a previous visit are then hidden from the list (only the current recruit
  // shows "in party").
  useEffect(() => {
    if (!visitedLocation) {
      return;
    }
    rollPresence(visitedLocation.id);
  }, [visitedLocation, rollPresence]);

  // Arriving at Edoras with Gandalf: he cows Wormtongue, who pales and slips
  // away for good — freeing Théoden to ride out. Keep Gríma on the card (so the
  // notice has someone to point at) until the player closes it; the pending
  // flag commits his flight on dismissal.
  useEffect(() => {
    if (
      visitedLocation?.id === EDORAS_ID &&
      party.includes("gandalf") &&
      !grimaFled &&
      !grimaFleePending
    ) {
      setGrimaFleePending(true);
      showRecruitRefusal(t("refuse.grimaFlees"), "grima");
    }
  }, [visitedLocation, party, grimaFled, grimaFleePending, showRecruitRefusal, t]);

  // Reaching Barad-dûr is simply the end — no fight. At Sauron's doorstep the
  // Eye finds the Ring and it leaps to its master; the quest is lost.
  useEffect(() => {
    if (visitedLocation?.id === BARAD_DUR_ID) {
      setEnding((prev) => prev ?? "sauron");
    }
  }, [visitedLocation]);

  // At fallen Isengard, Treebeard (if met but not recruited) bids farewell once —
  // he stays to heal the land the Ents have taken, and won't march.
  useEffect(() => {
    if (
      visitedLocation?.id === ISENGARD_ID &&
      treebeardSettled &&
      metCharacterIds.has("treebeard") &&
      !party.includes("treebeard") &&
      !treebeardFarewell
    ) {
      setTreebeardFarewell(true);
      showRecruitRefusal(t("refuse.treebeardStays"), "treebeard");
    }
  }, [visitedLocation, treebeardSettled, metCharacterIds, party, treebeardFarewell, showRecruitRefusal, t]);

  // Arriving at the ruins of Tharbad: Gandalf, then Boromir (whoever is along)
  // each say their piece. With neither present the place is just empty.
  useEffect(() => {
    if (visitedLocation?.id !== THARBAD_ID) {
      tharbadGreetedRef.current = false;
      return;
    }
    if (tharbadGreetedRef.current) {
      return;
    }
    tharbadGreetedRef.current = true;
    if (party.includes("gandalf")) {
      setTharbadSpeech("gandalf");
    } else if (party.includes("boromir")) {
      setTharbadSpeech("boromir");
    }
  }, [visitedLocation, party]);

  // Simulate each elapsed day: eat (1/day), or with double rations heal +HEAL
  // per member for 2 food while anyone is hurt, or starve (5% max health/day)
  // when out of food. Damage is tracked per current party member.
  useEffect(() => {
    if (journeyDay <= processedDayRef.current) {
      processedDayRef.current = journeyDay;
      return;
    }
    let nextFood = foodRef.current;
    const nextDamage = { ...damageRef.current };
    const members = party;
    // Survival (food, healing, starvation) covers everyone on the map: parked
    // squads age and eat from the shared store too. Each member's aura comes
    // from whichever group they travel with.
    const survivorGroups: string[][] = [party, ...squads.map((s) => s.members)];
    const survivors = survivorGroups.flat();
    const groupOf = (id: string) => survivorGroups.find((g) => g.includes(id)) ?? party;
    // The Ring's temptation follows the bearer's group, active or not — that's
    // where a betrayal or a fall-to-rogue plays out.
    const bearerGroup = party.includes(bearerId)
      ? party
      : (squads.find((s) => s.members.includes(bearerId))?.members ?? party);
    const heal = survivors.includes("gandalf")
      ? Math.round(HEAL_PER_DAY * GANDALF_HEAL_MULTIPLIER)
      : HEAL_PER_DAY;
    // Per-day encounter chance for any group: cloaks + Aragorn + stealth gear,
    // and the group's overall cleverness (average intelligence) — a sharper band
    // travels more warily. Used for the active party and each idle squad alike.
    const chanceFor = (ids: string[]) => {
      let chance = hasCloaks
        ? ENCOUNTER_CHANCE_PER_DAY * CLOAKS_ENCOUNTER_MULTIPLIER
        : ENCOUNTER_CHANCE_PER_DAY;
      if (ids.includes("aragorn")) {
        chance *= ARAGORN_ENCOUNTER_MULTIPLIER;
      }
      chance *= ids.reduce((m, id) => {
        const it = equippedItems[id] ? ITEM_BY_ID[equippedItems[id]] : undefined;
        return it?.stealth ? m * it.stealth : m;
      }, 1);
      if (ids.length > 0) {
        const avgInt =
          ids.reduce((sum, id) => {
            const c = CHARACTERS.find((ch) => ch.id === id);
            return (
              sum +
              (c
                ? effectiveStats(c, addBonus(statBonusById[id] ?? ZERO_BONUS, auraBonus(c, ids)))
                    .intelligence
                : 0)
            );
          }, 0) / ids.length;
        chance *= Math.max(
          PARTY_INT_STEALTH_FLOOR,
          1 - Math.max(0, avgInt - PARTY_INT_STEALTH_BASELINE) * PARTY_INT_STEALTH_PER_POINT,
        );
        // Fewer feet draw fewer eyes; a big host is far easier to spot (and
        // largely cancels its own cloaks). Mild for small bands, steep for crowds.
        chance *= clamp(
          1 + (ids.length - PARTY_STEALTH_NEUTRAL_SIZE) * PARTY_STEALTH_PER_MEMBER,
          PARTY_STEALTH_FLOOR,
          PARTY_STEALTH_CEIL,
        );
      }
      return chance;
    };
    const onEagles = transport === "eagle";
    const encounterChance = onEagles ? 0 : chanceFor(members);
    let wildEncounter = false;
    let corsairEncounter = false;
    let rogueEncounter = false;
    let pendingTraitor: string | null = null;
    let bombadilLeaves = false;
    let samCatchesUp = false;
    const ringless = !bearerId || rogueBearerId !== null;
    const hungerDead: string[] = [];
    // Splinter squads catch their own random battles too — collected here and
    // played out one at a time, switching focus to each squad in turn.
    const ambushedSquads = new Set<string>();
    const onWater =
      getTerrainAtPoint(playerRef.current ?? hobbiton.point).name === "water";
    for (let day = processedDayRef.current; day < journeyDay; day += 1) {
      const anyHurt = survivors.some((id) => (nextDamage[id] ?? 0) > 0);
      // Wounded + spare food: auto-spend a 2nd ration to heal each.
      if (anyHurt && nextFood >= 2) {
        nextFood -= 2;
        for (const id of survivors) {
          nextDamage[id] = Math.max(0, (nextDamage[id] ?? 0) - heal);
        }
      } else if (nextFood >= 1) {
        nextFood -= 1;
      } else {
        for (const id of survivors) {
          if (id === "king_dead") {
            continue;
          }
          const prev = nextDamage[id] ?? 0;
          const character = CHARACTERS.find((c) => c.id === id);
          if (character) {
            const es = effectiveStats(
              character,
              addBonus(statBonusById[id] ?? ZERO_BONUS, auraBonus(character, groupOf(id))),
            );
            const maxHp = maxHpFromStats(es.strength, es.defense);
            nextDamage[id] = prev + Math.round(maxHp * HUNGER_DAMAGE_FRACTION);
            if (nextDamage[id] >= maxHp && prev < maxHp) {
              hungerDead.push(id);
            }
          } else {
            nextDamage[id] = prev + 1;
          }
        }
      }
      if (
        !samCaughtUp &&
        day < 3 &&
        members.includes("frodo") &&
        !members.includes("sam") &&
        !parkedMembers.includes("sam") &&
        !deathCauseById.sam
      ) {
        samCatchesUp = true;
      }
      if (ringless) {
        // No Ring to covet and no wild foes to bother with — just hunt the rogue.
        // The Ring hides him for weeks; only after ROGUE_MIN_CHASE_DAYS does a
        // daily roll have any chance to corner him.
        const daysSinceFled = rogueSinceDay !== null ? day - rogueSinceDay : 0;
        if (
          daysSinceFled >= ROGUE_MIN_CHASE_DAYS &&
          !onEagles &&
          !visitedLocation &&
          Math.random() < ROGUE_ENCOUNTER_CHANCE
        ) {
          rogueEncounter = true;
        }
      } else {
        // A betrayal brews in whatever squad holds the Ring — even if you've
        // wandered off with another group.
        const traitors = bearerGroup.filter(
          (id) =>
            id !== bearerId &&
            TRAITORS.has(id) &&
            day + 1 - (joinDayRef.current[id] ?? day + 1) >= BETRAYAL_GRACE_DAYS,
        );
        // No one turns traitor over a Ring that's already in the fire.
        if (
          !ringDestroyed &&
          !onEagles &&
          !pendingTraitor &&
          traitors.length > 0 &&
          Math.random() < BETRAYAL_CHANCE
        ) {
          pendingTraitor = traitors[Math.floor(Math.random() * traitors.length)];
        }
        if (!visitedLocation && Math.random() < encounterChance) {
          wildEncounter = true;
        }
        // Corsair raids only out at sea (under sail — not while fording a river),
        // sharply likelier the further south, all but absent at Grey Havens' latitude.
        const atSea = onWater && (transport === "ship" || party.includes("cirdan"));
        if (!visitedLocation && atSea && !corsairPeace) {
          const south = clamp((playerRef.current?.y ?? 0) / mapSize.height, 0, 1);
          if (Math.random() < CORSAIR_SEA_MAX * Math.pow(south, CORSAIR_SEA_POWER)) {
            corsairEncounter = true;
          }
        }
      }
      if (members.includes("bombadil") && Math.random() < BOMBADIL_LEAVE_CHANCE) {
        bombadilLeaves = true;
      }
      // Idle splinter squads can be ambushed where they wait (at most one battle
      // queued per squad per pass; never on open water).
      for (const squad of squads) {
        if (ambushedSquads.has(squad.id)) {
          continue;
        }
        if (getTerrainAtPoint(squad.point).name === "water") {
          continue;
        }
        if (Math.random() < chanceFor(squad.members)) {
          ambushedSquads.add(squad.id);
        }
      }
    }
    if (ambushedSquads.size > 0) {
      setSquadEncounterQueue((prev) => [
        ...prev,
        ...[...ambushedSquads].filter((id) => !prev.includes(id)),
      ]);
    }
    processedDayRef.current = journeyDay;
    foodRef.current = nextFood;
    damageRef.current = nextDamage;
    setFood(nextFood);
    setDamageById(nextDamage);
    if (hungerDead.length > 0) {
      const starvedRoaming = slainRoamingRecruitIds(hungerDead);
      if (starvedRoaming.length > 0) {
        setSlainRoamingRecruits((prev) => {
          const next = new Set(prev);
          for (const id of starvedRoaming) {
            next.add(id);
          }
          return next;
        });
      }
      setDeathCauseById((prev) => {
        const next = { ...prev };
        for (const id of hungerDead) {
          next[id] = "hunger";
        }
        return next;
      });
      const nonBearer = hungerDead.filter((id) => id !== bearerId);
      if (nonBearer.length > 0) {
        setParty((prev) => prev.filter((id) => !nonBearer.includes(id)));
        setSquads((prev) =>
          prev
            .map((s) => ({ ...s, members: s.members.filter((id) => !nonBearer.includes(id)) }))
            .filter((s) => s.members.length > 0),
        );
        setDeathNotice({ ids: nonBearer.join(","), cause: "hunger" });
      }
      const remaining = survivors.filter((id) => !hungerDead.includes(id));
      if (hungerDead.includes(bearerId) || remaining.length === 0) {
        setEnding((prev) => prev ?? "starved");
      }
    }
    if (bombadilLeaves) {
      setParty((prev) => prev.filter((id) => id !== "bombadil"));
      showRecruitRefusal(t("refuse.bombadilLeaves"), "bombadil");
    }
    if (samCatchesUp) {
      setSamCaughtUp(true);
      setSamCatchUpOpen(true);
      return;
    }
    // Eagles tire of carrying you after a month — but they won't drop you over
    // the sea: they only leave once you're over walkable land.
    if (
      transport === "eagle" &&
      eagleSince !== null &&
      journeyDay - eagleSince >= EAGLE_STAY_DAYS &&
      !onWater
    ) {
      setTransport(null);
      setEagleSince(null);
      setEaglesLeft(true);
    }
    if (ringless) {
      const daysSinceFled = rogueSinceDay !== null ? journeyDay - rogueSinceDay : 0;
      // Raced the thief to the Mountain and lay in wait: he must come here to
      // claim the Fire, so once he's had time to draw near you fall on the
      // invisible bearer — a fight to reclaim the Ring, not a loss to him.
      if (
        rogueBearerId &&
        rogueSinceDay !== null &&
        visitedLocation?.id === ORODRUIN_ID &&
        daysSinceFled >= ROGUE_MIN_CHASE_DAYS
      ) {
        setVisitedLocation(null);
        setCurrentLocation(null);
        startRogueBattle(rogueBearerId);
      } else if (rogueSinceDay !== null && daysSinceFled >= ROGUE_CHASE_DAYS) {
        // Ran out of time elsewhere: the rogue reaches Mount Doom and crowns himself.
        setEnding((prev) => prev ?? "rogueLord");
      } else if (rogueEncounter && rogueBearerId) {
        startRogueBattle(rogueBearerId);
      }
    } else if (pendingTraitor) {
      setPendingBetrayal(pendingTraitor);
    } else if (wildEncounter && !onWater) {
      const position = playerRef.current ?? hobbiton.point;
      // A spared Saruman (with Gríma, if still alive) waylays the party in the NW
      // — for the two months before he reaches the Shire.
      if (sarumanRoams && regionAt(position) === "NW" && Math.random() < SARUMAN_ENCOUNTER_CHANCE) {
        const pack = [SARUMAN_ENEMY, ...(grimaSlain ? [] : [GRIMA_ENEMY])];
        setEncounter({ monster: SARUMAN_ENEMY, dangerous: true, solo: pack.length === 1, pack });
        return;
      }
      const rolled = rollEncounter(
        position,
        party,
        parkedMembers.map((id) => ({ id })),
        slainRoamingRecruits,
        grimaRoaming,
        nazgulGone,
        treebeardSettled,
      );
      const kinPresent = party.includes("theoden") || party.includes("eowyn");
      if (rolled.monster.recruitId === "treebeard") {
        if (party.includes("saruman")) {
          // The company harbours Saruman — Treebeard falls on it (no joining).
          const hostile = { ...rolled, monster: { ...rolled.monster, recruitId: undefined } };
          setEncounter(createEncounter(hostile, party.length, position));
        } else {
          // Met in peace among the trees, he offers to come along.
          setPeacefulOffer(true);
          setRecruitOffer("treebeard");
        }
      } else if (rolled.monster.recruitId === "eomer" && kinPresent) {
        // With his kin along, Éomer meets the party peacefully and offers to join.
        setPeacefulOffer(true);
        setRecruitOffer("eomer");
      } else if (deadSummoned && rolled.monster.name === WIGHT_NAME) {
        // The Dead are roused — barrow-wights no longer dare assail the party.
      } else {
        const enc = createEncounter(rolled, party.length, position);
        const pack = deadSummoned ? enc.pack.filter((mm) => mm.name !== WIGHT_NAME) : enc.pack;
        setEncounter(pack.length === enc.pack.length ? enc : { ...enc, pack });
      }
    } else if (corsairEncounter && onWater) {
      // A corsair crew falls on the ship — they only ever sail with rats and
      // Haradrim alongside, and none of them are much of a threat.
      const corsairCount = clamp(1 + Math.floor(Math.random() * party.length), 1, 4);
      const pack: Monster[] = Array.from({ length: corsairCount }, () => CORSAIR_ENEMY);
      const rat = MONSTERS.find((mm) => mm.icon === "/enemies/rat.png");
      const haradrim = MONSTERS.find((mm) => mm.icon === "/enemies/kharadrim.png");
      if (rat && Math.random() < 0.5) {
        pack.push(rat);
      }
      if (haradrim && Math.random() < 0.4) {
        pack.push(haradrim);
      }
      setEncounter({ monster: CORSAIR_ENEMY, dangerous: true, solo: pack.length === 1, pack });
    }
  }, [journeyDay, party, squads, parkedMembers, slainRoamingRecruits, hasCloaks, hobbiton, bearerId, statBonusById, equippedItems, deadSummoned, samCaughtUp, deathCauseById, t, getTerrainAtPoint, visitedLocation, showRecruitRefusal, transport, eagleSince, rogueBearerId, rogueSinceDay, startRogueBattle, grimaRoaming, grimaSlain, nazgulGone, ringDestroyed, treebeardSettled, sarumanRoams, corsairPeace, mapSize]);

  // Kick off a betrayal battle once one is queued (with full party context).
  // Serialized behind any active fight, and if the traitor is in an idle squad
  // we switch focus to that squad before it plays out.
  useEffect(() => {
    if (!pendingBetrayal) {
      return;
    }
    if (battle || encounter) {
      return;
    }
    if (!party.includes(pendingBetrayal)) {
      const sq = squads.find((s) => s.members.includes(pendingBetrayal));
      if (sq) {
        focusSquad(sq.id);
        return;
      }
      // Traitor is nowhere (left/dismissed) — drop the stale event.
      setPendingBetrayal(null);
      return;
    }
    startBetrayal(pendingBetrayal);
    setPendingBetrayal(null);
  }, [pendingBetrayal, battle, encounter, party, squads, focusSquad, startBetrayal]);

  // Play queued splinter-squad ambushes one at a time. Wait until nothing else
  // is happening (single event stack), take command of the next ambushed squad,
  // and stage its fight. A squad that has since merged or been wiped is skipped.
  useEffect(() => {
    if (!created || ending || battle || encounter || isMoving || target || visitedLocation) {
      return;
    }
    if (pendingBetrayal || (hasFallen && rogueBearerId === null && bearerId)) {
      return; // Ring/betrayal events take priority in the queue.
    }
    if (squadEncounterQueue.length === 0) {
      return;
    }
    const [squadId, ...rest] = squadEncounterQueue;
    setSquadEncounterQueue(rest);
    const squad = squads.find((s) => s.id === squadId);
    if (!squad || squad.members.length === 0) {
      return;
    }
    const others = [...partyRef.current, ...parkedMembers].filter(
      (id) => !squad.members.includes(id),
    );
    const rolled = rollEncounter(
      squad.point,
      squad.members,
      others.map((id) => ({ id })),
      slainRoamingRecruits,
      grimaRoaming,
      nazgulGone,
      // Treebeard only seeks the main company, never a splinter group.
      true,
    );
    if (deadSummoned && rolled.monster.name === WIGHT_NAME) {
      return; // the roused Dead deter barrow-wights — no fight
    }
    const enc = createEncounter(rolled, squad.members.length, squad.point);
    const pack = deadSummoned ? enc.pack.filter((mm) => mm.name !== WIGHT_NAME) : enc.pack;
    if (pack.length === 0) {
      return;
    }
    focusSquad(squad.id);
    setEncounter(pack.length === enc.pack.length ? enc : { ...enc, pack });
  }, [
    created,
    ending,
    battle,
    encounter,
    isMoving,
    target,
    visitedLocation,
    pendingBetrayal,
    hasFallen,
    rogueBearerId,
    bearerId,
    squadEncounterQueue,
    squads,
    parkedMembers,
    slainRoamingRecruits,
    deadSummoned,
    grimaRoaming,
    nazgulGone,
    focusSquad,
  ]);

  // While a pan is in flight the camera is driven imperatively (offsetRef), so
  // any incidental re-render must read the live offset — not the stale state —
  // or it would snap the map back. Otherwise the committed state is the source.
  const panOffset =
    (dragRef.current.active || isMoving) && offsetRef.current ? offsetRef.current : offset;

  return (
    <section className="fixed inset-0 bg-white p-1 sm:p-[18px]">
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
          ref={mapImgRef}
          alt="Middle-earth map"
          draggable="false"
          src={MAP_VARIANTS[mapIndex] ?? mapImage}
          className="absolute left-0 top-0 max-w-none select-none"
          style={{
            width: mapSize.width,
            height: mapSize.height,
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
          }}
        />
        {/* Terrain overlay only mounts when enabled — otherwise its mix-blend
            layer would keep re-compositing every frame for nothing. (The warm
            sepia tone is baked into the map art itself, so no tint layer here.) */}
        {showTerrain && terrainReady && (
          <img
            ref={terrainImgRef}
            alt="Terrain overlay"
            draggable="false"
            src={terrainImage}
            className="pointer-events-none absolute left-0 top-0 max-w-none select-none [image-rendering:pixelated] mix-blend-multiply"
            style={{
              width: mapSize.width,
              height: mapSize.height,
              opacity: TERRAIN_OVERLAY_OPACITY,
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
              transformOrigin: "0 0",
            }}
          />
        )}

        {/* Overlay layer: only the container's translate tracks the camera each
            frame, so markers/figure aren't re-projected on pan. Children sit at
            point×zoom (constant pixel size — no scale on this layer). */}
        <div
          ref={overlayRef}
          className="pointer-events-none absolute left-0 top-0"
          style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px)`, transformOrigin: "0 0" }}
        >
          {locationMarkers}

          {squads.map((squad) => {
            const lead = CHARACTERS.find((c) => c.id === squad.members[0]);
            if (!lead) {
              return null;
            }
            const pos = mapToLayer(squad.point);
            const label = squad.members.map((id) => charName(id)).join(", ");
            const canTake = canSwitchSquads;
            return (
              <button
                key={squad.id}
                type="button"
                title={label}
                aria-label={t("ui.switchToSquad", { members: label })}
                disabled={!canTake}
                className="pointer-events-auto absolute z-20 size-11 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border-2 border-amber-300 bg-parchment shadow-lg disabled:cursor-default"
                style={{ left: pos.x, top: pos.y }}
                onPointerDown={(event) => event.stopPropagation()}
                onPointerUp={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  if (canTake) {
                    focusSquad(squad.id);
                  }
                }}
              >
                <img src={lead.icon} alt="" className="size-full object-cover grayscale" />
                {squad.members.length > 1 && (
                  <span className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full border border-amber-200 bg-neutral-900 text-[10px] font-bold leading-none text-amber-200">
                    {squad.members.length}
                  </span>
                )}
              </button>
            );
          })}

          {targetLayer && (
            <div
              className="pointer-events-none absolute z-20 size-4 -translate-x-1/2 -translate-y-1/2"
              style={{ left: targetLayer.x, top: targetLayer.y }}
              aria-hidden="true"
            >
              <span className="absolute inset-0 animate-ping rounded-full bg-green-500/70" />
              <span className="absolute left-1/2 top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-green-500 shadow" />
            </div>
          )}

          {showHeroPath && heroPathLayer.length > 1 && (
            <svg
              className="pointer-events-none absolute left-0 top-0 z-[25] overflow-visible"
              aria-hidden="true"
            >
              <polyline
                points={heroPathLayer.map((point) => `${point.x},${point.y}`).join(" ")}
                fill="none"
                stroke="#c9a227"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.9}
              />
            </svg>
          )}

          <button
            ref={figureRef}
            type="button"
            aria-label={figureCharacter ? charName(figureCharacter.id) : t("character.bearer")}
            title={figureCharacter ? charName(figureCharacter.id) : t("character.bearer")}
            className="pointer-events-auto absolute z-30 size-11 -translate-x-1/2 -translate-y-1/2 cursor-pointer"
            style={{ left: playerLayer.x, top: playerLayer.y }}
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              if (!isMoving && !target && currentLocation) {
                openVisitedLocation(currentLocation);
                return;
              }
              // Show the whole group at a glance first; pick a hero from there.
              setPartySummaryOpen(true);
            }}
          >
            <img
              src={figureCharacter?.icon ?? PLAYER_ICON}
              alt=""
              draggable="false"
              // Thin gold silhouette outline marks the active group's figure (8
              // directions for a solid edge); the last shadow lifts it off the map.
              className="size-full select-none object-contain [filter:drop-shadow(1px_0_0_#fcd34d)_drop-shadow(-1px_0_0_#fcd34d)_drop-shadow(0_1px_0_#fcd34d)_drop-shadow(0_-1px_0_#fcd34d)_drop-shadow(1px_1px_0_#fcd34d)_drop-shadow(-1px_1px_0_#fcd34d)_drop-shadow(1px_-1px_0_#fcd34d)_drop-shadow(-1px_-1px_0_#fcd34d)_drop-shadow(0_1px_3px_rgba(0,0,0,0.75))]"
            />
          </button>
        </div>

        <MapSettingsMenu
          open={settingsOpen}
          onToggle={() => setSettingsOpen((prev) => !prev)}
          showTerrain={showTerrain}
          onToggleTerrain={() => setShowTerrain((prev) => !prev)}
          showHeroPath={showHeroPath}
          onToggleHeroPath={() => setShowHeroPath((prev) => !prev)}
          mapIndex={mapIndex}
          mapCount={MAP_VARIANTS.length}
          onCycleMap={() => setMapIndex((prev) => (prev + 1) % MAP_VARIANTS.length)}
          theme={theme}
          onToggleTheme={() => setTheme((prev) => (prev === "light" ? "dark" : "light"))}
          speed={animationSpeed}
          onCycleSpeed={cycleSpeed}
          lang={lang}
          onToggleLang={toggleLang}
          onStats={() => {
            setStatsOpen(true);
            setSettingsOpen(false);
          }}
          onHelp={() => {
            setHelpOpen(true);
            setSettingsOpen(false);
          }}
          onRestart={() => {
            setRestartConfirm(true);
            setSettingsOpen(false);
          }}
        />

        {/* HUD overlay: date + controls + party float above the map, top-left */}
        <div className="pointer-events-none absolute left-0 top-0 z-40 flex flex-col gap-3 p-4 text-neutral-200">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <h1 className="flex h-9 w-[150px] items-center justify-center whitespace-nowrap rounded border border-neutral-700 bg-neutral-900/90 px-2.5 font-serif text-sm leading-none text-neutral-100 sm:w-[172px] sm:text-base">
                {journeyDate}
              </h1>
              {/* Food + transport, kept beside the date (also on mobile). */}
              <div className="relative h-9 w-fit">
                <div
                  onPointerDown={(event) => event.stopPropagation()}
                  onPointerUp={(event) => event.stopPropagation()}
                  className="pointer-events-auto flex h-9 w-fit items-center gap-2 rounded border border-neutral-700 bg-neutral-900/90 px-2 text-sm text-neutral-200"
                >
                  <HoverHint label={t("ui.foodTitle")} className="inline-flex items-center gap-1">
                    <img src="/ui/food.png" alt="" className="size-5 object-contain" />
                    {food}
                  </HoverHint>
                  <HoverHint
                    label={
                      transport
                        ? t(`transport.${transport}`)
                        : party.includes("cirdan")
                          ? t("transport.ship")
                          : t("ui.onFoot")
                    }
                    className="inline-flex items-center"
                  >
                    <TransportIcon
                      transport={transport}
                      sailingWithCirdan={party.includes("cirdan")}
                      className="size-5 select-none object-contain"
                    />
                  </HoverHint>
                  {hasCloaks && (
                    <HoverHint label={t("ui.cloaksTitle")} className="text-base leading-none">
                      🧥
                    </HoverHint>
                  )}
                </div>
                {food === 0 && (
                  <span
                    className="pointer-events-auto absolute left-0 top-full z-10 mt-0.5 w-full"
                    onPointerDown={(event) => event.stopPropagation()}
                    onPointerUp={(event) => event.stopPropagation()}
                  >
                    <HoverHint
                      label={t("ui.hungryTitle")}
                      className="w-full animate-pulse justify-center rounded border border-red-800 bg-red-950/85 px-1.5 py-1 text-[11px] font-semibold leading-none text-red-300 shadow-lg"
                    >
                      {t("ui.hungry")}
                    </HoverHint>
                  </span>
                )}
                {anyHurt && food >= 2 && (
                  <span
                    className="pointer-events-auto absolute left-0 top-full z-10 mt-0.5 w-full"
                    onPointerDown={(event) => event.stopPropagation()}
                    onPointerUp={(event) => event.stopPropagation()}
                  >
                    <HoverHint
                      label={t("ui.healingTitle")}
                      className="w-full animate-pulse justify-center rounded border border-emerald-800 bg-emerald-950/85 px-1.5 py-1 text-[11px] font-semibold leading-none text-emerald-300 shadow-lg"
                    >
                      {t("ui.healing")}
                    </HoverHint>
                  </span>
                )}
              </div>
            </div>
            <div
              className="pointer-events-auto flex flex-wrap items-center gap-2 text-sm"
              onPointerDown={(event) => event.stopPropagation()}
              onPointerUp={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => {
                  // Cancel the march: drop the current destination and halt where
                  // the figure stands.
                  setTarget(null);
                  setTargetLocation(null);
                  setStopped(false);
                }}
                disabled={!target}
                aria-label={t("ui.stop")}
                title={t("ui.stop")}
                className="flex size-9 items-center justify-center rounded border border-neutral-700 bg-neutral-900/90 text-neutral-200 transition hover:bg-neutral-800 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-neutral-900/90"
              >
                <Square className="size-4" />
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
                onClick={() => setSplitOpen(true)}
                disabled={party.length <= 1 || isMoving}
                aria-label={t("ui.split")}
                title={t("ui.split")}
                className="flex size-9 items-center justify-center rounded border border-neutral-700 bg-neutral-900/90 text-neutral-200 transition hover:bg-neutral-800 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-neutral-900/90"
              >
                <Split className="size-4" />
              </button>
              <button
                type="button"
                onClick={switchSquad}
                disabled={!canSwitchSquads}
                aria-label={t("ui.switchSquad")}
                title={t("ui.switchSquad")}
                className="flex size-9 items-center justify-center rounded border border-neutral-700 bg-neutral-900/90 text-neutral-200 transition hover:bg-neutral-800 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-neutral-900/90"
              >
                <Users className="size-4" />
              </button>
              <button
                type="button"
                onClick={centerOnPlayer}
                aria-label={t("ui.center")}
                title={t("ui.center")}
                className="flex size-9 items-center justify-center rounded border border-neutral-700 bg-neutral-900/90 text-neutral-200 transition hover:bg-neutral-800"
              >
                <LocateFixed className="size-4" />
              </button>
              <button
                type="button"
                onClick={cycleZoom}
                aria-label={t("ui.zoom")}
                title={t("ui.zoom")}
                className="relative flex size-9 items-center justify-center rounded border border-neutral-700 bg-neutral-900/90 text-neutral-200 transition hover:bg-neutral-800"
              >
                <ZoomIn className="size-4 -translate-x-[3px] -translate-y-[3px]" />
                <span className="pointer-events-none absolute bottom-[3px] right-[5px] text-[10px] font-bold leading-none [text-shadow:0_0_2px_#000,0_0_2px_#000]">
                  {(zoom / (baseZoomRef.current || 1)).toFixed(1)}
                </span>
              </button>
            </div>
          </div>

          <div
            className="pointer-events-auto flex w-fit flex-col gap-1"
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
          >
            <div
              data-party-portraits
              className="grid grid-flow-col grid-rows-[repeat(9,auto)] gap-1"
            >
                {partyCharacters.map((character) => {
                  const es = effectiveStats(character, totalBonusFor(character));
                  const maxHp = maxHpFromStats(es.strength, es.defense);
                  const hp = Math.max(0, maxHp - (damageById[character.id] ?? 0));
                  return (
                  <button
                    key={character.id}
                    type="button"
                    onClick={() => openCharacterPanel(character.id, true)}
                    aria-label={t("recruit.statsAria", { name: charName(character.id) })}
                    data-character-portrait={character.id}
                    className="group relative size-[52px] border border-neutral-700 bg-parchment transition hover:brightness-95 sm:size-16"
                  >
                    <img
                      src={iconFor(character)}
                      alt=""
                      draggable="false"
                      className="size-full select-none object-cover"
                    />
                    {/* Touch devices have no hover, so caption the name on the
                        portrait (mobile only); desktop keeps the hover tooltip. */}
                    <span className="pointer-events-none absolute inset-x-0 bottom-1 truncate px-0.5 text-center text-[9px] font-semibold leading-tight text-white [text-shadow:0_1px_2px_#000,0_0_2px_#000] sm:hidden">
                      {charName(character.id)}
                    </span>
                    <span className="pointer-events-none absolute left-0 top-full z-50 mt-1 hidden w-max max-w-[60vw] whitespace-nowrap rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs font-normal text-neutral-200 shadow-lg group-hover:block">
                      {charName(character.id)}
                    </span>
                    {character.id === bearerId && (
                      <span
                        className="pointer-events-none absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full border border-amber-700 bg-neutral-900"
                        title={t("character.bearer")}
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
                        className={`block h-full ${healthBarColorClass(hp, maxHp)}`}
                        style={{ width: `${healthBarWidthPct(hp, maxHp)}%` }}
                      />
                    </span>
                  </button>
                  );
                })}
            </div>
          </div>
        </div>

        <LocationModal
          location={
            visitedLocation && !ending && !(visitedLocation.id === ORODRUIN_ID && hasRing)
              ? visitedLocation
              : null
          }
          locationName={visitedLocation ? locName(visitedLocation) : ""}
          journeyDate={journeyDate}
          imageSrc={scouredArtSrc}
          imageInitiallyLoaded={
            scouredArtSrc ? preloadedLocationImages.has(scouredArtSrc) : false
          }
          boss={locationBoss}
          sidekick={
            // Gríma stands at Saruman's side — at Isengard, and at the Scouring —
            // while still alive. (When Gríma is the Isengard boss himself, no
            // sidekick.)
            !grimaSlain &&
            ((visitedLocation?.id === ISENGARD_ID &&
              grimaFled &&
              locationBoss?.name === BOSSES_BY_LOCATION[ISENGARD_ID].name) ||
              (visitedLocation?.id === HOBBITON_ID && sarumanScouring))
              ? GRIMA_ENEMY
              : null
          }
          parley={
            visitedLocation?.id === CORSAIRS_CITY_ID && corsairCaptainFriendly
              ? BOSSES_BY_LOCATION[CORSAIRS_CITY_ID]
              : null
          }
          onParley={() => {
            setCorsairPeace(true);
            setExploreResult({ found: true, message: "location.corsairPeace", emoji: "🏴‍☠️" });
          }}
          monsterName={monsterName}
          recruits={recruitsHere}
          party={party}
          iconFor={iconFor}
          charName={charName}
          canRestock={canRestockHere}
          food={food}
          foodCapacity={supplyCap}
          transportOffer={locationTransport}
          transportActive={transport === locationTransport}
          isMoving={isMoving}
          refusalOpen={recruitRefusal !== null}
          canExplore={
            !!visitedLocation &&
            (!!EXPLORE_ITEM_BY_LOCATION[visitedLocation.id] ||
              visitedLocation.id === ERECH_ID ||
              visitedLocation.id === WEATHERTOP_ID ||
              visitedLocation.id === OSGILIATH_ID ||
              visitedLocation.id === HELMS_DEEP_ID)
          }
          exploreLocked={
            !!locationBoss ||
            (visitedLocation?.id === ISENGARD_ID &&
              !defeatedBosses.has(BOSSES_BY_LOCATION[ISENGARD_ID].name) &&
              !party.includes("saruman")) ||
            (visitedLocation?.id === WEATHERTOP_ID &&
              !defeatedBosses.has(BOSSES_BY_LOCATION[WEATHERTOP_ID].name) &&
              !wraithsBroken)
          }
          onExplore={exploreLocation}
          onFightBoss={() => {
            if (locationBoss) {
              const bossPack =
                visitedLocation?.id === MINAS_MORGUL_ID
                  ? // Three of the Nine fall at Dol Guldur — leaving six here, not nine.
                    [
                      locationBoss,
                      ...Array.from({ length: dolGuldurNazgulSlain ? 5 : 8 }, () => NAZGUL_ENEMY),
                    ]
                  : visitedLocation?.id === DOL_GULDUR_ID
                    ? dolGuldurHasWraiths
                      ? // The lead wraith plus two more — three Nazgûl over the garrison.
                        [locationBoss, NAZGUL_ENEMY, NAZGUL_ENEMY, ...DOL_GULDUR_GARRISON]
                      : [locationBoss, ...DOL_GULDUR_GARRISON]
                    : visitedLocation?.id === WEATHERTOP_ID
                      ? [locationBoss, WEATHERTOP_WITCHKING, ...Array.from({ length: 3 }, () => locationBoss)]
                      : visitedLocation?.id === HOBBITON_ID && sarumanScouring
                        ? // The Scouring: Saruman with Gríma at his side, if alive.
                          [locationBoss, ...(grimaSlain ? [] : [GRIMA_ENEMY])]
                        : visitedLocation?.id === ISENGARD_ID &&
                            grimaFled &&
                            locationBoss.name !== GRIMA_ENEMY.name
                          ? // Saruman fights with Gríma at his side; once Saruman is
                            // gone, Gríma (now the boss himself) skulks here alone.
                            [locationBoss, GRIMA_ENEMY]
                          : [locationBoss];
              // Already chose the fight at the location — go straight to battle,
              // skipping the "you met a foe" encounter prompt.
              startBattle({
                monster: locationBoss,
                dangerous: true,
                solo: bossPack.length === 1,
                pack: bossPack,
                // Wraiths stand and fight to the death in their lairs (Minas
                // Morgul, and Dol Guldur while the Nine are still abroad).
                wraithsStand:
                  visitedLocation?.id === MINAS_MORGUL_ID ||
                  (visitedLocation?.id === DOL_GULDUR_ID && dolGuldurHasWraiths),
                // Saruman at Isengard, with a mercy advocate (Gandalf/Treebeard)
                // along: the fight pauses at half to offer sparing him.
                sarumanParley:
                  visitedLocation?.id === ISENGARD_ID &&
                  locationBoss.name === SARUMAN_NAME &&
                  (party.includes("gandalf") || party.includes("treebeard")),
              });
            }
          }}
          onViewStats={(id) => openCharacterPanel(id, false)}
          onRecruit={attemptRecruit}
          onTalk={(c) => talkToCharacter(c.id)}
          hasGifts={hasGifts}
          onTakeSupplies={() => {
            // Top up to the local supply cap, but never reduce what's carried.
            const next = Math.max(foodRef.current, supplyCap);
            setFood(next);
            foodRef.current = next;
          }}
          onTakeTransport={() => {
            if (!locationTransport) {
              return;
            }
            if (locationTransport === "ship" && visitedLocation) {
              boardShip(visitedLocation.id);
            } else {
              requestTransport(locationTransport);
            }
          }}
          onWait={waitOneDay}
          note={
            visitedLocation?.id === ORODRUIN_ID && !hasRing ? t("orodruin.noRing") : null
          }
          onLeave={() => {
            if (recruitRefusal) {
              dismissRecruitRefusal();
              return;
            }
            setVisitedLocation(null);
            setTargetLocation(null);
          }}
        />

        <SplitModal
          open={splitOpen}
          members={partyCharacters.filter((character) => character.id !== bearerId)}
          charName={charName}
          onLeave={leaveMember}
          onDismiss={dismissMember}
          onClose={() => setSplitOpen(false)}
        />

        <CharacterModal
          character={openCharacter}
          stats={openStats}
          paging={openCharacterPaging}
          level={openLevel}
          deadInBattle={openCharacter ? deathCauseById[openCharacter.id] === "battle" : false}
          isInParty={!!openCharacter && party.includes(openCharacter.id)}
          canMakeBearer={
            !!openCharacter &&
            !!openStats &&
            !openStats.isBearer &&
            !openStats.dead &&
            rogueBearerId === null &&
            party.includes(openCharacter.id) &&
            !NON_BEARERS.has(openCharacter.id)
          }
          isLeftBehind={!!openCharacter && parkedMembers.includes(openCharacter.id)}
          equippedItem={
            openCharacter && equippedItems[openCharacter.id]
              ? (ITEM_BY_ID[equippedItems[openCharacter.id]] ?? null)
              : null
          }
          itemOptions={
            openCharacter
              ? ITEMS.filter(
                  (it) =>
                    foundItems.includes(it.id) &&
                    !Object.entries(equippedItems).some(
                      ([cid, iid]) => iid === it.id && cid !== openCharacter.id,
                    ),
                )
              : []
          }
          onEquipItem={(itemId) => openCharacter && equipItem(openCharacter.id, itemId)}
          charName={charName}
          iconFor={iconFor}
          onPrev={() => showAdjacentCharacter(-1)}
          onNext={() => showAdjacentCharacter(1)}
          onMakeBearer={() => openCharacter && makeBearer(openCharacter.id)}
          onCall={() => {
            const squad =
              openCharacter && squads.find((s) => s.members.includes(openCharacter.id));
            if (squad && !battle && !encounter && !isMoving && !target) {
              focusSquad(squad.id);
              setOpenCharacterId(null);
            }
          }}
          onClose={() => setOpenCharacterId(null)}
        />

        <OrodruinModal
          open={visitedLocation?.id === ORODRUIN_ID && hasRing && !ending}
          onDestroy={destroyRing}
          onClaim={() => {
            setLordClaimed(true);
            setEnding("lord");
          }}
        />

        <FarmResultModal
          farmed={ending || autoPlay ? null : foodFarmed}
          onClose={() => setFoodFarmed(null)}
        />

        <BattleModal
          battle={battle}
          battleSpeed={battleSpeed}
          onCycleSpeed={cycleBattleSpeed}
          charName={charName}
          monsterName={monsterName}
          onPutRing={putOnRing}
          onTakeRing={takeOffRing}
          onFlee={fleeBattle}
          fleeChance={battleEscapePct}
          onSkip={() => setBattle((b) => (b ? resolveBattleInstantly(b) : b))}
          onContinue={() => setBattle(null)}
        />

        {/* Saruman beaten to half with a mercy advocate along: companions speak in
            turn, then the spare/fight choice. */}
        <SpeechModal
          open={!!battle?.pendingParley && parleyStep < parleySpeakers.length}
          icon={
            parleySpeakers[parleyStep]
              ? (CHARACTERS.find((c) => c.id === parleySpeakers[parleyStep])?.icon ?? "")
              : ""
          }
          name={parleySpeakers[parleyStep] ? charName(parleySpeakers[parleyStep]) : ""}
          text={parleySpeakers[parleyStep] ? t(`sarumanParley.${parleySpeakers[parleyStep]}`) : ""}
          buttonLabel={t(parleyStep < parleySpeakers.length - 1 ? "tharbad.next" : "sarumanParley.decide")}
          onClose={() => setParleyStep((s) => s + 1)}
        />

        <Modal
          open={!!battle?.pendingParley && parleyStep >= parleySpeakers.length}
          z="z-[60]"
          overlayClassName="bg-black/70"
          className="w-full max-w-xs border-amber-800 p-6 text-center"
        >
          <p className="text-sm text-neutral-200">{t("sarumanParley.prompt")}</p>
          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              onClick={spareSaruman}
              className="rounded border border-emerald-700 bg-emerald-900/40 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-900/70"
            >
              {t("sarumanParley.spare")}
            </button>
            <button
              type="button"
              onClick={fightSaruman}
              className="rounded border border-red-800 bg-red-900/40 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-900/70"
            >
              {t("sarumanParley.fight")}
            </button>
          </div>
        </Modal>

        <EncounterModal
          encounter={autoPlay ? null : encounter}
          monsterName={monsterName}
          onAccept={() => startBattle()}
          onFlee={fleeEncounter}
          fleeChance={encounterEscapePct}
        />

        <EscapeFailedModal
          open={escapeFailed !== null}
          onClose={() => {
            const context = escapeFailed;
            setEscapeFailed(null);
            if (context === "encounter") {
              startBattle();
            }
          }}
        />

        <ExploreResultModal
          result={exploreResult}
          onClose={() => {
            setExploreResult(null);
            if (pendingExploreRecruit) {
              setRecruitOffer(pendingExploreRecruit);
              setPeacefulOffer(true);
              setPendingExploreRecruit(null);
            }
          }}
        />

        <TalkResultModal
          result={talkResult}
          charName={charName}
          onClose={() => setTalkResult(null)}
        />

        <Modal
          open={pendingDisembark !== null}
          z="z-[60]"
          className="w-full max-w-xs border-sky-800 p-6 text-center"
        >
          <TransportIcon transport="ship" className="mx-auto size-12 object-contain" />
          <p className="mt-3 text-sm text-sky-100">{t("transport.disembarkAsk")}</p>
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => {
                const landing = pendingDisembark;
                setPendingDisembark(null);
                if (!landing) {
                  return;
                }
                transportRef.current = null;
                setTransport(null);
                playerRef.current = landing.point;
                setPlayer(landing.point);
                setHeroPath((path) => appendPathPoint(path, landing.point, trailCapRef.current));
                if (landing.location) {
                  openVisitedLocationRef.current(landing.location);
                }
              }}
              className="flex-1 rounded border border-amber-700 bg-amber-900/40 px-4 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-900/70"
            >
              {t("transport.disembarkYes")}
            </button>
            <button
              type="button"
              onClick={() => setPendingDisembark(null)}
              className="flex-1 rounded border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700"
            >
              {t("transport.disembarkNo")}
            </button>
          </div>
        </Modal>

        <Modal
          open={valinorAttempt}
          z="z-[60]"
          overlayClassName="bg-black/80"
          className="w-full max-w-xs border-sky-800 p-6 text-center"
        >
          <TransportIcon transport="ship" className="mx-auto size-12 object-contain" />
          <p className="mt-3 text-sm text-sky-100">{t("ending.valinorAsk")}</p>
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setValinorAttempt(false);
                if (hasRing) {
                  setEnding("valinorRing");
                  return;
                }
                if (ringDestroyed) {
                  setEnding("valinorWest");
                  return;
                }
                const avgLuck = party.length ? partyLuck(party, statBonusById) / party.length : 0;
                if (avgLuck < 8) {
                  setEnding("valinorSink");
                } else {
                  // The Straight Road stays shut, but the seas spare them — they
                  // come about and the ship slips back onto the map from the edge.
                  const back = { x: 60, y: playerRef.current?.y ?? hobbiton.point.y };
                  playerRef.current = back;
                  setPlayer(back);
                  setExploreResult({ found: true, message: "ending.valinorReturn", emoji: "🌫️" });
                }
              }}
              className="flex flex-1 items-center justify-center gap-1.5 rounded border border-sky-700 bg-sky-900/40 px-4 py-2 text-sm font-semibold text-sky-200 transition hover:bg-sky-900/70"
            >
              <TransportIcon transport="ship" className="size-5 shrink-0 object-contain" />
              {t("ending.valinorYes")}
            </button>
            <button
              type="button"
              onClick={() => {
                setValinorAttempt(false);
                const back = { x: 60, y: playerRef.current?.y ?? hobbiton.point.y };
                playerRef.current = back;
                setPlayer(back);
              }}
              className="flex-1 rounded border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700"
            >
              {t("ending.valinorNo")}
            </button>
          </div>
        </Modal>

        <RecruitOfferModal
          offered={
            recruitOffer && !battle && !levelUpCharacterId && levelUpQueue.length === 0
              ? (CHARACTERS.find((c) => c.id === recruitOffer) ?? null)
              : null
          }
          waiting={!!recruitOffer && parkedMembers.includes(recruitOffer)}
          peaceful={peacefulOffer}
          charName={charName}
          onAccept={acceptRecruitOffer}
          onDecline={() => {
            setRecruitOffer(null);
            setPeacefulOffer(false);
          }}
        />

        <RecruitRefusalModal
          notice={recruitRefusal}
          viewportRef={viewportRef}
          centered={battle !== null}
          onClose={dismissRecruitRefusal}
        />

        <DeathNoticeModal
          notice={ending ? null : deathNotice}
          charName={charName}
          onContinue={() => setDeathNotice(null)}
        />

        <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
        <StatsModal
          open={statsOpen}
          onClose={() => setStatsOpen(false)}
          stats={gameStats}
          foundCharacterIds={foundCharacterIds}
          defeatedEnemyIcons={defeatedEnemyIcons}
        />
        <PartySummaryModal
          open={partySummaryOpen}
          rows={partySummaryRows}
          bearerId={bearerId}
          charName={charName}
          onSelect={(id) => {
            setPartySummaryOpen(false);
            openCharacterPanel(id, true);
          }}
          onClose={() => setPartySummaryOpen(false)}
        />

        <Modal open={restartConfirm} className="w-full max-w-sm border-neutral-700 p-5">
          <h2 className="text-center font-serif text-xl text-neutral-100">
            {t("ui.restartConfirmTitle")}
          </h2>
          <p className="mt-3 text-center text-sm text-neutral-300">{t("ui.restartConfirmText")}</p>
          <div className="mt-5 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => setRestartConfirm(false)}
              className="rounded border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700"
            >
              {t("ui.cancel")}
            </button>
            <button
              type="button"
              onClick={restartGame}
              className="rounded border border-red-800 bg-red-900/60 px-4 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-900"
            >
              {t("ui.restartConfirm")}
            </button>
          </div>
        </Modal>

        <TransportConfirmModal
          from={transport}
          to={pendingTransport}
          onConfirm={() => pendingTransport && applyTransport(pendingTransport)}
          onCancel={() => setPendingTransport(null)}
        />

        <EaglesLeftModal open={eaglesLeft} onClose={() => setEaglesLeft(false)} />

        <SpeechModal
          open={tharbadSpeech !== null}
          icon={tharbadSpeech ? (CHARACTERS.find((c) => c.id === tharbadSpeech)?.icon ?? "") : ""}
          name={tharbadSpeech ? charName(tharbadSpeech) : ""}
          text={tharbadSpeech ? t(`tharbad.${tharbadSpeech}`) : ""}
          buttonLabel={t(
            tharbadSpeech === "gandalf" && party.includes("boromir") ? "tharbad.next" : "tharbad.close",
          )}
          onClose={() =>
            setTharbadSpeech((cur) => (cur === "gandalf" && party.includes("boromir") ? "boromir" : null))
          }
        />

        <SamCatchUpModal
          open={samCatchUpOpen && !ending}
          sam={CHARACTERS.find((character) => character.id === "sam") ?? null}
          onContinue={acceptSamCatchUp}
        />

        <LevelUpModal
          hero={autoPlay ? null : levelUpHero}
          level={levelUpLevel}
          damage={levelUpCharacterId ? (damageById[levelUpCharacterId] ?? 0) : 0}
          existingBonus={levelUpExistingBonus}
          draft={levelUpDraft}
          totalPoints={levelUpTotalPoints}
          draftSpent={levelUpDraftSpent}
          charName={charName}
          onAdjust={adjustLevelUpDraft}
          onRandomize={randomizeAndConfirmLevelUp}
          onConfirm={() => confirmLevelUp()}
        />

        {/* Solid cover so the map never flashes behind the creation modal's fade-in. */}
        {!created && <div className="absolute inset-0 z-[55] bg-[#020202]" />}

        {/* Resuming a save: hold the intro art until the map terrain is ready. */}
        <Preloader hidden={terrainReady || !created} />

        <CreationModal
          open={!created}
          hero={creationHero}
          heroName={charName(RING_BEARER_ID)}
          bonus={creationBonus}
          spent={creationSpent}
          onAdjust={adjustCreation}
          onRandomize={randomizeCreation}
          onConfirm={confirmCreation}
          onAutoPlay={startAutoPlay}
        />

        <RogueFledModal
          fled={
            rogueFledNotice && !ending ? (CHARACTERS.find((c) => c.id === rogueFledNotice) ?? null) : null
          }
          charName={charName}
          onContinue={() => setRogueFledNotice(null)}
        />

        <PartySummaryModal
          open={bearerChooserOpen}
          variant="bearer"
          rows={bearerCandidateRows}
          bearerId={bearerId}
          charName={charName}
          onSelect={(id) => {
            makeBearer(id);
            setReclaimedFrom(null);
          }}
          onClose={() => {}}
        />

        {ending && (
          <EndingModal
            open
            ending={ending}
            bearer={rogueBearerId ? CHARACTERS.find((c) => c.id === rogueBearerId) : ringBearer}
            bearerName={
              rogueBearerId
                ? charName(rogueBearerId)
                : ringBearer
                  ? charName(ringBearer.id)
                  : t("character.bearer")
            }
            lordClaimed={lordClaimed}
            doomBetrayal={doomBetrayal}
            onReplay={() => {
              clearSave();
              window.location.reload();
            }}
            onViewStats={() => setStatsOpen(true)}
            // The Ring is gone — let the player keep roaming a freed Middle-earth.
            onContinue={() => setEnding(null)}
          />
        )}
      </div>
    </section>
  );
}
