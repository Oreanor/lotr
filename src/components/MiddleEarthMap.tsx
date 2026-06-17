import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import {
  Eye,
  EyeOff,
  Gauge,
  LocateFixed,
  Play,
  RotateCcw,
  Route,
  Settings,
  Split,
  Square,
  Wheat,
  ZoomIn,
} from "lucide-react";
import { HoverHint } from "@/components/ui/HoverHint";
import { healthBarColorClass, healthBarWidthPct } from "@/components/ui/healthBar";
import { TransportIcon } from "@/components/ui/TransportIcon";
import { Modal } from "@/components/ui/Modal";
import { HelpModal } from "@/components/modals/HelpModal";
import {
  DeathNoticeModal,
  FarmResultModal,
  RecruitRefusalModal,
  SamCatchUpModal,
} from "@/components/modals/Notices";
import { EndingModal } from "@/components/modals/EndingModal";
import { RogueFledModal, BearerChooserModal } from "@/components/modals/RogueModals";
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
import { Preloader } from "@/components/modals/Preloader";
import { CalendarModal } from "@/components/modals/CalendarModal";
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
  buildRecruitmentCalendar,
  CARN_DUM_ID,
  clearSave,
  CHARACTERS,
  CLOAKS_ENCOUNTER_MULTIPLIER,
  clamp,
  computeCharacterStats,
  coverZoom,
  createEncounter,
  CREATION_POINTS,
  DEFAULT_PARTY,
  DEFAULT_VIEW_SIZE,
  DEFAULT_VISIBLE_FRACTION,
  DEFAULT_ZOOM,
  DEFAULT_ZOOM_BOOST,
  EAGLE_PRESENCE_CHANCE,
  EAGLE_STAY_DAYS,
  effectiveStats,
  itemStatBonus,
  itemAttackBonus,
  ENCOUNTER_CHANCE_PER_DAY,
  BOMBADIL_SLOW_FACTOR,
  EOMER_SPEED_MULTIPLIER,
  fitZoom,
  FOLLOW_MARGIN_RATIO,
  FOOD_SUPPLY_LOCATION_IDS,
  foodCapacityFor,
  GANDALF_HEAL_MULTIPLIER,
  getJourneyDate,
  getLocationLabel,
  getStartPosition,
  HEAL_PER_DAY,
  HEALTH_PER_STR,
  HUNGER_DAMAGE_FRACTION,
  HOBBITON_ID,
  iconVariant,
  INITIAL_FOOD_DAYS,
  INITIAL_HERO_PROGRESS,
  isCharacterRecruitableHere,
  ISENGARD_ID,
  ERECH_ID,
  WEATHERTOP_ID,
  levelForExp,
  loadSave,
  locationData,
  locationImage,
  LOTHLORIEN_ID,
  mapImage,
  MAX_PATH_POINTS,
  MAX_WATER_CROSSING_CELLS,
  MAX_ZOOM_FACTOR,
  MEMBER_PICKUP_RANGE,
  MILES_PER_DAY,
  MINAS_MORGUL_ID,
  monsterExp,
  MORIA_GATE_ID,
  MOVE_SUBSTEPS,
  NAZGUL_ENEMY,
  NON_BEARERS,
  ORODRUIN_ID,
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
  terrainImage,
  TRAITORS,
  TRANSPORT_BY_LOCATION,
  TRANSPORTS,
  unspentPointsFor,
  RING_PIERCING_FOES,
  writeSave,
  ZERO_BONUS,
  ZOOM_STEP,
} from "@/game";
import type {
  BattleState,
  Character,
  Combatant,
  DeathCause,
  DragState,
  EncounterState,
  MapLocation,
  Point,
  Size,
  StatBonus,
  TransportId,
  WaterRun,
} from "@/game";


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
  const waterRunRef = useRef<WaterRun>({ cellKey: null, count: 0 });
  const dragRef = useRef<DragState>({
    active: false,
    moved: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    startOffset: { x: 0, y: 0 },
  });
  // Active touch points and pinch-zoom gesture state (two-finger zoom on mobile).
  const pointersRef = useRef<Map<number, Point>>(new Map());
  const pinchRef = useRef<{ active: boolean; startDist: number; startZoom: number }>({
    active: false,
    startDist: 0,
    startZoom: 1,
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

  const [view, setView] = useState<Size>({ width: DEFAULT_VIEW_SIZE, height: DEFAULT_VIEW_SIZE });
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const { animationSpeed, battleSpeed, cycleSpeed, cycleBattleSpeed } = useSpeedSettings();
  const [offset, setOffset] = useState<Point>(() => {
    const start = getStartPosition(hobbiton.point);
    return {
      x: DEFAULT_VIEW_SIZE / 2 - start.x * DEFAULT_ZOOM,
      y: DEFAULT_VIEW_SIZE / 2 - start.y * DEFAULT_ZOOM,
    };
  });
  const [player, setPlayer] = useState<Point>(() => {
    const start = initialSave?.player ?? getStartPosition(hobbiton.point);
    playerRef.current = start;
    return start;
  });
  const [heroPath, setHeroPath] = useState<Point[]>(
    () => [initialSave?.player ?? getStartPosition(hobbiton.point)],
  );
  const [showHeroPath, setShowHeroPath] = useState(false);
  const [journeyDay, setJourneyDay] = useState(initialSave?.journeyDay ?? 0);
  const [target, setTarget] = useState<Point | null>(null);
  const [targetLocation, setTargetLocation] = useState<MapLocation | null>(null);
  // A companion left on the map that we're walking toward (invite on arrival).
  const [targetMemberId, setTargetMemberId] = useState<string | null>(null);
  // Location card opens after its seasonal artwork has been preloaded.
  const [visitedLocation, setVisitedLocation] = useState<MapLocation | null>(null);
  // Location the party is physically standing in, even if its card was closed.
  const [currentLocation, setCurrentLocation] = useState<MapLocation | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  // Manually halted mid-journey: the destination (and its marker) is kept so the
  // march can be resumed; only a fresh target clears it.
  const [stopped, setStopped] = useState(false);
  const [showTerrain, setShowTerrain] = useState(false);
  const [openCharacterId, setOpenCharacterId] = useState<string | null>(null);
  // Whether the open details panel can page through the party (arrows). True
  // only when opened from the party HUD or by clicking the hero on the map.
  const [openCharacterPaging, setOpenCharacterPaging] = useState(false);
  const [ending, setEnding] = useState<
    "victory" | "lord" | "starved" | "battle" | "nothing" | "rogueLord" | "sauron" | null
  >(null);
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
  const [samCatchUpOpen, setSamCatchUpOpen] = useState(false);
  // Result of talking to a companion: a greeting or items handed over.
  const [talkResult, setTalkResult] = useState<TalkResult | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [bearerId, setBearerId] = useState(initialSave?.bearerId ?? RING_BEARER_ID);
  const [transport, setTransport] = useState<TransportId | null>(initialSave?.transport ?? null);
  // Eagles of Manwë: offered only on some Carn Dûm visits, and they leave after
  // a month. `eagleSince` is the journey day they joined (null when not flying).
  const [eagleOffered, setEagleOffered] = useState(false);
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
  // Roaming recruits never reappear once dead (Gollum slain in betrayal, starved, or fallen).
  const [slainRoamingRecruits, setSlainRoamingRecruits] = useState<Set<string>>(
    () => new Set(initialSave?.slainRoamingRecruits ?? []),
  );
  // Betrayers other than Gollum leave the story for good after turning on the bearer.
  const [banishedTraitors, setBanishedTraitors] = useState<Set<string>>(
    () => new Set(initialSave?.banishedTraitors ?? []),
  );
  const [pendingBetrayal, setPendingBetrayal] = useState<string | null>(null);
  // Companions left waiting on the map; can be re-called by clicking their marker.
  const [leftBehind, setLeftBehind] = useState<{ id: string; point: Point }[]>(
    initialSave?.leftBehind ?? [],
  );
  // Brief face swap (refuse/joy) on a character's portrait when (de)recruited.
  const [emote, setEmote] = useState<{ id: string; kind: "refuse" | "joy" } | null>(null);
  const emoteTimerRef = useRef<number | null>(null);
  const [hasCloaks, setHasCloaks] = useState(initialSave?.hasCloaks ?? false);
  const [encounter, setEncounter] = useState<EncounterState | null>(null);
  const [battle, setBattle] = useState<BattleState | null>(null);
  // A failed flee roll: "encounter" forces the fight on dismiss, "battle" just
  // closes (the one in-fight attempt is already spent).
  const [escapeFailed, setEscapeFailed] = useState<"encounter" | "battle" | null>(null);
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
    setLeftBehind((prev) => prev.filter((member) => member.id !== id));
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
      // Círdan only follows a bearer at least as wise as himself.
      if (character.id === "cirdan") {
        const bearer = CHARACTERS.find((c) => c.id === bearerId);
        const bearerInt = bearer
          ? effectiveStats(bearer, statBonusById[bearerId] ?? ZERO_BONUS).intelligence
          : 0;
        if (bearerInt < character.intelligence) {
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
    [bearerId, party, recruitCharacter, showRecruitRefusal, statBonusById, t],
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
    if (leftBehind.some((m) => m.id === id)) {
      setLeftBehind((prev) => prev.filter((m) => m.id !== id));
      recruitCharacter(id);
      return;
    }
    const character = CHARACTERS.find((c) => c.id === id);
    if (character) {
      // Subdued in battle → joins wounded (half health); a peaceful join is unhurt.
      if (!peaceful) {
        const half = Math.floor((character.strength * HEALTH_PER_STR) / 2);
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
  }, [recruitOffer, peacefulOffer, leftBehind, recruitCharacter, attemptRecruit, showRecruitRefusal, t]);

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
          attack: s.strength,
          defense: s.defense,
          luck: s.luck,
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

  // Walk to a companion left on the map; they rejoin on arrival.
  const walkToMember = useCallback((member: { id: string; point: Point }) => {
    setTarget({ x: member.point.x, y: member.point.y });
    setTargetMemberId(member.id);
    setTargetLocation(null);
    setStopped(false);
    setVisitedLocation(null);
    setCurrentLocation(null);
    waterRunRef.current = { cellKey: null, count: 0 };
    lastTimeRef.current = null;
    followDisabledRef.current = false;
  }, []);

  const callLeftBehindMember = useCallback(
    (member: { id: string; point: Point }) => {
      if (battle || encounter) {
        return;
      }
      const current = playerRef.current;
      if (
        current &&
        Math.hypot(member.point.x - current.x, member.point.y - current.y) <= MEMBER_PICKUP_RANGE
      ) {
        setLeftBehind((prev) => prev.filter((m) => m.id !== member.id));
        recruitCharacter(member.id);
        setOpenCharacterId(null);
        return;
      }
      walkToMember(member);
      setOpenCharacterId(null);
    },
    [battle, encounter, recruitCharacter, walkToMember],
  );

  // "Принять бой" → snapshot party + enemy into a paced auto-battle.
  const startBattle = useCallback(() => {
    if (!encounter) {
      return;
    }
    // Carried items lend bonus attack against the right foes here.
    const packHasUndead = encounter.pack.some((mm) => WRAITH_FOES.has(mm.name));
    const packHasOrcs = encounter.pack.some((mm) => ORC_FOES.has(mm.name));
    // The Phial of Galadriel blinds Shelob — her strength is halved.
    const partyHasPhial = party.some((id) => equippedItems[id] === "phial");
    const phialBlinded = partyHasPhial && encounter.pack.some((mm) => mm.name === SHELOB_NAME);
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
        const maxHp = s.strength * HEALTH_PER_STR;
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
        };
      })
      .filter((c): c is Combatant => c !== null && c.hp > 0);
    const m = encounter.monster;
    const pack = encounter.pack;
    const enemies: Combatant[] = pack.map((mm, i) => {
      const str =
        phialBlinded && mm.name === SHELOB_NAME ? Math.floor(mm.strength / 2) : mm.strength;
      const hp = str * HEALTH_PER_STR;
      return {
        key: `enemy-${i}`,
        name: mm.name,
        icon: mm.icon,
        hp,
        maxHp: hp,
        strength: str,
        attack: mm.attack ?? str,
        defense: mm.defense,
        luck: mm.luck,
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
      ringIneffective: pack.some((mm) => RING_PIERCING_FOES.has(mm.name)),
      betrayalBy: null,
      gandalfOnly: pack.some((mm) => mm.name.startsWith("Балрог")),
      rogueId: null,
      invisibleEnemy: false,
      phialBlinded,
    };
    if (autoPlayRef.current) {
      battleState = resolveBattleInstantly(battleState);
    }
    setBattle(battleState);
  }, [encounter, party, statBonusById, damageById, bearerId, equippedItems]);

  // Flee before the fight: succeed and the foe is left behind; fail and there's
  // no slipping away — the battle begins anyway.
  const fleeEncounter = useCallback(() => {
    if (!encounter) {
      return;
    }
    if (rollEscape(party, statBonusById, encounter.pack.map((mm) => mm.luck))) {
      setEncounter(null);
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

  const randomizeLevelUpDraft = useCallback(() => {
    if (!levelUpCharacterId) {
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
    setLevelUpDraft(rolled);
  }, [levelUpCharacterId, expById, statBonusById]);

  const confirmLevelUp = useCallback(() => {
    if (!levelUpCharacterId) {
      return;
    }
    const total = unspentPointsFor(
      levelUpCharacterId,
      expById[levelUpCharacterId] ?? 0,
      statBonusById[levelUpCharacterId] ?? ZERO_BONUS,
    );
    if (bonusPoints(levelUpDraft) !== total) {
      return;
    }
    setStatBonusById((prev) => {
      const current = prev[levelUpCharacterId] ?? ZERO_BONUS;
      return { ...prev, [levelUpCharacterId]: addBonus(current, levelUpDraft) };
    });
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
        if (livingBearerCandidates.length > 0) {
          setBearerId("");
          setReclaimedFrom(bearerId);
        } else {
          setEnding((prev) => prev ?? "battle");
          setBattle(null);
        }
      } else if (survivors.length === 0) {
        setEnding((prev) => prev ?? "battle");
        setBattle(null);
      }
    },
    [bearerId, party],
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
          const maxHp = s.strength * HEALTH_PER_STR;
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
          };
        })
        .filter((c): c is Combatant => c !== null && c.hp > 0);
      const rs = effectiveStats(rogue, statBonusById[rogueId] ?? ZERO_BONUS);
      const rogueMaxHp = rs.strength * HEALTH_PER_STR;
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
    const bearer = CHARACTERS.find((character) => character.id === bearerId);
    // Effective luck — creation/level-up bonuses and party auras, not the raw stat.
    const luck = bearer
      ? effectiveStats(bearer, addBonus(statBonusById[bearerId] ?? ZERO_BONUS, auraBonus(bearer, party)))
          .luck
      : 0;
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
    equippedItemsRef.current = equippedItems;
  }, [equippedItems]);
  const animationPaused = useMemo(
    () =>
      !created ||
      ending !== null ||
      visitedLocation !== null ||
      calendarOpen ||
      splitOpen ||
      openCharacterId !== null ||
      recruitOffer !== null ||
      recruitRefusal !== null ||
      samCatchUpOpen ||
      rogueFledNotice !== null ||
      reclaimedFrom !== null ||
      (deathNotice !== null && ending === null) ||
      helpOpen ||
      ((levelUpCharacterId !== null || levelUpQueue.length > 0) && !autoPlay) ||
      (encounter !== null && !autoPlay) ||
      (battle !== null && !autoPlay) ||
      (foodFarmed !== null && !autoPlay),
    [
      created,
      ending,
      visitedLocation,
      calendarOpen,
      splitOpen,
      openCharacterId,
      recruitOffer,
      recruitRefusal,
      samCatchUpOpen,
      rogueFledNotice,
      reclaimedFrom,
      deathNotice,
      helpOpen,
      levelUpCharacterId,
      levelUpQueue,
      encounter,
      battle,
      autoPlay,
      foodFarmed,
    ],
  );

  useEffect(() => {
    animationPausedRef.current = animationPaused;
  }, [animationPaused]);

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

  // Ring corruption days accrue only for whoever currently carries it.
  useEffect(() => {
    const delta = journeyDay - prevJourneyDayForRingRef.current;
    if (delta > 0 && bearerId && rogueBearerId === null) {
      setRingDaysById((days) => ({
        ...days,
        [bearerId]: (days[bearerId] ?? 0) + delta,
      }));
    }
    prevJourneyDayForRingRef.current = journeyDay;
  }, [journeyDay, bearerId, rogueBearerId]);
  useEffect(() => {
    const delta = ringWear - prevRingWearForRingRef.current;
    if (delta > 0 && bearerId && rogueBearerId === null) {
      setRingDaysById((days) => ({
        ...days,
        [bearerId]: (days[bearerId] ?? 0) + delta,
      }));
    }
    prevRingWearForRingRef.current = ringWear;
  }, [ringWear, bearerId, rogueBearerId]);

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
      leftBehind,
      joinDay: joinDayRef.current,
      recruitAttempts: recruitAttemptsRef.current,
      foundItems,
      equippedItems,
      deadSummoned,
      samCaughtUp,
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
    leftBehind,
    rogueBearerId,
    foundItems,
    equippedItems,
    deadSummoned,
    samCaughtUp,
  ]);

  // Game over: drop the save so a reload starts a fresh quest.
  useEffect(() => {
    if (ending) {
      clearSave();
    }
  }, [ending]);

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

  // Position inside the overlay layer, which itself is translated by `offset`.
  // Depends only on zoom (not offset), so panning the camera every frame doesn't
  // re-project the markers/figure — only the layer's transform shifts.
  const mapToLayer = useCallback((point: Point): Point => ({ x: point.x * zoom, y: point.y * zoom }), [zoom]);

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

  // Step the zoom to the next preset (0.5× / 1× / 2× of the default fit) above
  // the *current* zoom — so it stays in sync after a pinch — keeping the
  // viewport centre fixed; wraps back to the smallest.
  const cycleZoom = useCallback(() => {
    const presets = [0.5, 1, 2];
    const base = baseZoomRef.current || 1;
    const current = zoom / base;
    const nextPreset = presets.find((p) => p > current + 0.05) ?? presets[0];
    const minZoom = coverZoom(view, mapSize);
    const maxZoom = Math.max(minZoom, base * MAX_ZOOM_FACTOR);
    const nextZoom = clamp(base * nextPreset, minZoom, maxZoom);
    const center = { x: view.width / 2, y: view.height / 2 };
    const anchor = screenToMap(center);
    const nextOffset = clampOffset(
      { x: center.x - anchor.x * nextZoom, y: center.y - anchor.y * nextZoom },
      nextZoom,
    );
    zoomRef.current = nextZoom;
    setZoom(nextZoom);
    offsetRef.current = nextOffset;
    setOffset(nextOffset);
  }, [zoom, view, mapSize, screenToMap, clampOffset]);


  const { terrainReady, getTerrainAtPoint } = useTerrainGrid(mapSize);

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
      setTargetMemberId(null);
      setStopped(false);
      setVisitedLocation(null);
      setCurrentLocation(null);
      waterRunRef.current = { cellKey: null, count: 0 };
      lastTimeRef.current = null;
      followDisabledRef.current = false;
    },
    [getTerrainAtPoint, screenToMap],
  );

  // Begin a two-finger pinch: freeze the drag and remember the start spread/zoom.
  const beginPinch = useCallback(() => {
    const pts = [...pointersRef.current.values()];
    if (pts.length < 2) {
      return;
    }
    dragRef.current = { ...dragRef.current, active: false, pointerId: null };
    pinchRef.current = {
      active: true,
      startDist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
      startZoom: zoomRef.current,
    };
    followDisabledRef.current = true;
  }, []);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      // Touch/pen always tracked; for mouse only the primary button drags.
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      event.currentTarget.setPointerCapture(event.pointerId);
      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (pointersRef.current.size >= 2) {
        beginPinch();
        return;
      }

      dragRef.current = {
        active: true,
        moved: false,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startOffset: offset,
      };
    },
    [beginPinch, offset],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (pointersRef.current.has(event.pointerId)) {
        pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      }

      // Two fingers → pinch-zoom around their midpoint.
      if (pinchRef.current.active && pointersRef.current.size >= 2) {
        const viewport = viewportRef.current;
        if (!viewport) {
          return;
        }
        const [a, b] = [...pointersRef.current.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist <= 0) {
          return;
        }
        const bounds = viewport.getBoundingClientRect();
        const mid = { x: (a.x + b.x) / 2 - bounds.left, y: (a.y + b.y) / 2 - bounds.top };
        const minZoom = coverZoom(view, mapSize);
        const maxZoom = Math.max(minZoom, baseZoomRef.current * MAX_ZOOM_FACTOR);
        const nextZoom = clamp(
          (pinchRef.current.startZoom * dist) / pinchRef.current.startDist,
          minZoom,
          maxZoom,
        );
        const liveOffset = offsetRef.current ?? offset;
        const liveZoom = zoomRef.current;
        const mapPoint = { x: (mid.x - liveOffset.x) / liveZoom, y: (mid.y - liveOffset.y) / liveZoom };
        const nextOffset = clampOffset(
          { x: mid.x - mapPoint.x * nextZoom, y: mid.y - mapPoint.y * nextZoom },
          nextZoom,
        );
        zoomRef.current = nextZoom;
        offsetRef.current = nextOffset;
        setZoom(nextZoom);
        setOffset(nextOffset);
        return;
      }

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
    [clampOffset, mapSize, offset, view, zoom],
  );

  const releasePointer = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // pointer may already be released
    }
    if (pointersRef.current.size < 2) {
      pinchRef.current.active = false;
    }
  }, []);

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const wasPinching = pinchRef.current.active;
      const drag = dragRef.current;
      releasePointer(event);

      if (wasPinching || pinchRef.current.active) {
        return;
      }
      if (drag.active && drag.pointerId === event.pointerId) {
        dragRef.current = { ...drag, active: false, pointerId: null };
        if (!drag.moved) {
          setTargetFromClientPoint(event.clientX, event.clientY);
        }
      }
    },
    [releasePointer, setTargetFromClientPoint],
  );

  const handlePointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      releasePointer(event);
      const drag = dragRef.current;
      if (drag.active && drag.pointerId === event.pointerId) {
        dragRef.current = { ...drag, active: false, pointerId: null };
      }
    },
    [releasePointer],
  );

  const handleMarkerClick = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>, location: MapLocation) => {
      event.stopPropagation();
      if (autoPlayRef.current) {
        return;
      }
      setTarget({ x: location.point.x, y: location.point.y });
      setTargetLocation(location);
      setTargetMemberId(null);
      setStopped(false);
      setVisitedLocation(null);
      setCurrentLocation(null);
      waterRunRef.current = { cellKey: null, count: 0 };
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
    setTargetMemberId(null);
    setStopped(false);
    setVisitedLocation(null);
    setCurrentLocation(null);
    waterRunRef.current = { cellKey: null, count: 0 };
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
    // Weathertop: Gandalf's rune left on a stone (only reachable once the Nazgul
    // is beaten). Pure lore note, nothing to pick up.
    if (loc.id === WEATHERTOP_ID) {
      setExploreResult({ found: true, message: "location.weathertopRune" });
      return;
    }
    // Erech: only Aragorn, heir of Isildur, can rouse the Dead.
    if (loc.id === ERECH_ID) {
      if (party.includes("aragorn") && !deadSummoned) {
        setDeadSummoned(true);
        setExploreResult({ found: true, message: "location.erechSummon" });
        if (!party.includes("king_dead") && !leftBehind.some((member) => member.id === "king_dead")) {
          setPendingExploreRecruit("king_dead");
        }
      } else {
        setExploreResult({ found: false });
      }
      return;
    }
    const itemId = EXPLORE_ITEM_BY_LOCATION[loc.id];
    if (!itemId) {
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
  }, [visitedLocation, foundItems, party, statBonusById, deadSummoned, leftBehind]);

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
      setRecruitRefusal(null);
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
            ? [lockedBoss, ...Array.from({ length: 8 }, () => NAZGUL_ENEMY)]
            : [lockedBoss];
        setEncounter({
          monster: lockedBoss,
          dangerous: true,
          solo: bossPack.length === 1,
          pack: bossPack,
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
    // No destination, or the march is manually halted: stay put. When `stopped`
    // the target is deliberately left set so the marker stays and the journey
    // can be resumed.
    if (!target || stopped) {
      return undefined;
    }

    const activeTarget: Point = target;
    const arrivalLocation = targetLocation;
    const arrivalMemberId = targetMemberId;
    setIsMoving(true);

    if (!playerRef.current) {
      playerRef.current = player;
    }

    const lockedPassages = [MORIA_GATE_ID, MINAS_MORGUL_ID]
      .map((id) => locations.find((location) => location.id === id) ?? null)
      .filter((location): location is MapLocation => {
        const boss = location ? BOSSES_BY_LOCATION[location.id] : null;
        return !!boss && !defeatedBosses.has(boss.name);
      });

    function crossedLockedPassage(point: Point): MapLocation | null {
      return (
        lockedPassages.find(
          (location) => Math.hypot(location.point.x - point.x, location.point.y - point.y) < MILES_PER_DAY,
        ) ?? null
      );
    }

    function finishTravel(visitLocation: MapLocation | null) {
      if (visitLocation) {
        openVisitedLocationRef.current(visitLocation);
      } else {
        setVisitedLocation(null);
        setCurrentLocation(null);
      }
      setTarget(null);
      setTargetLocation(null);
      setTargetMemberId(null);
      setIsMoving(false);
      frameRef.current = null;
      if (arrivalMemberId) {
        setLeftBehind((prev) => prev.filter((m) => m.id !== arrivalMemberId));
        recruitCharacter(arrivalMemberId);
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
      const visibleSpeed = (SPEED_PX_PER_SECOND * animationSpeed * transportSpeed) / terrainCost;
      const travel = Math.min(routeRadius, visibleSpeed * elapsedSeconds);

      function canMoveTo(point: Point): boolean {
        const terrain = getTerrainAtPoint(point);
        // The black Mordor wall blocks everything on the ground — only Eagles,
        // flying overhead, can pass it.
        if (terrain.impassable && transportRef.current !== "eagle") {
          return false;
        }
        // Mountains are passable now (just slow); only wide water still blocks.
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
        setIsMoving(false);
        frameRef.current = null;
        return;
      }

      const arrived = Math.hypot(activeTarget.x - nextPlayer.x, activeTarget.y - nextPlayer.y) <= 0.5;
      if (arrived) {
        nextPlayer = activeTarget;
      }

      const lockedPassage = crossedLockedPassage(nextPlayer);
      if (lockedPassage && arrivalLocation?.id !== lockedPassage.id) {
        journeyMilesRef.current += actualTravel * terrainCost;
        playerRef.current = nextPlayer;
        setPlayer(nextPlayer);
        setHeroPath((path) => appendPathPoint(path, nextPlayer, trailCapRef.current));
        finishTravel(lockedPassage);
        return;
      }

      const nextJourneyMiles = journeyMilesRef.current + actualTravel * terrainCost;
      const nextJourneyDay = Math.floor(nextJourneyMiles / MILES_PER_DAY);

      journeyMilesRef.current = nextJourneyMiles;
      playerRef.current = nextPlayer;
      setPlayer(nextPlayer);
      setHeroPath((path) => appendPathPoint(path, nextPlayer, trailCapRef.current));

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
  }, [animationSpeed, defeatedBosses, getTerrainAtPoint, locations, recruitCharacter, target, targetLocation, targetMemberId, stopped]);

  const playerLayer = mapToLayer(player);
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
          !banishedTraitors.has(character.id) &&
          (character.id !== "sam" || !samCaughtUp) &&
          (character.id !== "saruman" || sarumanFriendly) &&
          // Hide companions already aboard when we arrived (recruited on an
          // earlier visit); the one just recruited this visit still shows.
          !entryParty.has(character.id),
      )
    : [];
  // The boss to offer a fight with at the current location (null if none, slain,
  // or Saruman is currently a friend).
  const locationBoss = (() => {
    if (!visitedLocation) {
      return null;
    }
    const boss = BOSSES_BY_LOCATION[visitedLocation.id];
    if (!boss || defeatedBosses.has(boss.name)) {
      return null;
    }
    if (visitedLocation.id === ISENGARD_ID && sarumanFriendly) {
      return null;
    }
    return boss;
  })();
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
    return offered;
  })();
  const lockedPassageLocation =
    visitedLocation &&
    (visitedLocation.id === MORIA_GATE_ID || visitedLocation.id === MINAS_MORGUL_ID) &&
    locationBoss
      ? visitedLocation
      : null;

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
  // Markers only re-project when the camera (offset/zoom) or labels change — not
  // on every movement frame where only the figure moves.
  const locationMarkers = useMemo(
    () =>
      locations.map((location) => {
        const pos = mapToLayer(location.point);
        return (
          <button
            key={location.id}
            type="button"
            title={locName(location)}
            aria-label={locName(location)}
            className="pointer-events-auto absolute z-10 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-red-600 shadow-[0_0_0_1px_rgba(60,0,0,0.85),0_0_0_2.5px_#ffffff] transition-transform hover:scale-[1.6] hover:bg-red-500"
            style={{ left: pos.x, top: pos.y }}
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
            onClick={(event) => handleMarkerClick(event, location)}
          />
        );
      }),
    [locations, mapToLayer, locName, handleMarkerClick],
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
  const levelUpLevel = levelUpCharacterId
    ? levelForExp(expById[levelUpCharacterId] ?? 0).level
    : 1;
  const ringBearer = CHARACTERS.find((character) => character.id === bearerId);
  const hasRing = !!bearerId && rogueBearerId === null;
  // The figure on the map is the bearer, or — while the Ring is fled — whoever
  // leads the chase.
  const figureCharacter = ringBearer ?? partyCharacters[0];
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
    for (const member of leftBehind) {
      addCharacter(CHARACTERS.find((character) => character.id === member.id));
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
    leftBehind,
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
    if (hasFallen && rogueBearerId === null && ending === null && bearerId) {
      triggerRingFlight(bearerId);
    }
  }, [hasFallen, rogueBearerId, ending, bearerId, triggerRingFlight]);

  useEffect(() => {
    if (!created || ending || party.length > 0) {
      return;
    }
    setEnding(rogueBearerId || !bearerId ? "nothing" : "battle");
    setBattle(null);
    setEncounter(null);
    setTarget(null);
    setTargetLocation(null);
    setIsMoving(false);
  }, [created, ending, party.length, rogueBearerId, bearerId]);

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
      const activeBoss = visitedLocation ? BOSSES_BY_LOCATION[visitedLocation.id] : null;
      if (foe && activeBoss && foe.name === activeBoss.name && BOSS_NAMES.has(foe.name)) {
        setDefeatedBosses((prev) => new Set(prev).add(foe.name));
        // Felling the Guardian of Barad-dûr only brings the Ring to Sauron's
        // doorstep — at that range it leaps to its master and the quest is lost.
        if (visitedLocation?.id === BARAD_DUR_ID) {
          setEnding((prev) => prev ?? "sauron");
        }
      }
    }
  }, [battle, expById, statBonusById, t, charName, applyBattleCasualties, showRecruitRefusal, visitedLocation, banishTraitor]);

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
    const heal = members.includes("gandalf")
      ? Math.round(HEAL_PER_DAY * GANDALF_HEAL_MULTIPLIER)
      : HEAL_PER_DAY;
    let encounterChance = hasCloaks
      ? ENCOUNTER_CHANCE_PER_DAY * CLOAKS_ENCOUNTER_MULTIPLIER
      : ENCOUNTER_CHANCE_PER_DAY;
    if (members.includes("aragorn")) {
      encounterChance *= ARAGORN_ENCOUNTER_MULTIPLIER;
    }
    // Stealth items lower the encounter chance too.
    encounterChance *= members.reduce((m, id) => {
      const it = equippedItems[id] ? ITEM_BY_ID[equippedItems[id]] : undefined;
      return it?.stealth ? m * it.stealth : m;
    }, 1);
    // A wiser ring-bearer picks safer paths: −5% encounters per intelligence
    // point above 4, but never less than half (smarts don't make you invisible).
    const bearer = CHARACTERS.find((c) => c.id === bearerId);
    const bearerInt = bearer
      ? effectiveStats(bearer, addBonus(statBonusById[bearerId] ?? ZERO_BONUS, auraBonus(bearer, party)))
          .intelligence
      : 0;
    encounterChance *= Math.max(0.5, 1 - Math.max(0, bearerInt - 4) * 0.05);
    const onEagles = transport === "eagle";
    if (onEagles) {
      encounterChance = 0; // eagles fly above any trouble
    }
    let wildEncounter = false;
    let rogueEncounter = false;
    let pendingTraitor: string | null = null;
    let bombadilLeaves = false;
    let samCatchesUp = false;
    const ringless = !bearerId || rogueBearerId !== null;
    const hungerDead: string[] = [];
    const onWater =
      getTerrainAtPoint(playerRef.current ?? hobbiton.point).name === "water";
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
          if (id === "king_dead") {
            continue;
          }
          const prev = nextDamage[id] ?? 0;
          const character = CHARACTERS.find((c) => c.id === id);
          if (character) {
            const maxHp =
              effectiveStats(
                character,
                addBonus(statBonusById[id] ?? ZERO_BONUS, auraBonus(character, members)),
              ).strength * HEALTH_PER_STR;
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
        !leftBehind.some((member) => member.id === "sam") &&
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
        const traitors = members.filter(
          (id) =>
            id !== bearerId &&
            TRAITORS.has(id) &&
            day + 1 - (joinDayRef.current[id] ?? day + 1) >= BETRAYAL_GRACE_DAYS,
        );
        if (!onEagles && !pendingTraitor && traitors.length > 0 && Math.random() < BETRAYAL_CHANCE) {
          pendingTraitor = traitors[Math.floor(Math.random() * traitors.length)];
        }
        if (!visitedLocation && Math.random() < encounterChance) {
          wildEncounter = true;
        }
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
        setDeathNotice({ ids: nonBearer.join(","), cause: "hunger" });
      }
      const survivors = members.filter((id) => !hungerDead.includes(id));
      if (hungerDead.includes(bearerId) || survivors.length === 0) {
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
      // Ran out of time: the rogue reaches Mount Doom and crowns himself.
      if (rogueSinceDay !== null && journeyDay - rogueSinceDay >= ROGUE_CHASE_DAYS) {
        setEnding((prev) => prev ?? "rogueLord");
      } else if (rogueEncounter && rogueBearerId) {
        startRogueBattle(rogueBearerId);
      }
    } else if (pendingTraitor) {
      setPendingBetrayal(pendingTraitor);
    } else if (wildEncounter && !onWater) {
      const position = playerRef.current ?? hobbiton.point;
      const rolled = rollEncounter(position, party, leftBehind, slainRoamingRecruits);
      const kinPresent = party.includes("theoden") || party.includes("eowyn");
      if (rolled.monster.recruitId === "eomer" && kinPresent) {
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
    }
  }, [journeyDay, party, leftBehind, slainRoamingRecruits, hasCloaks, hobbiton, bearerId, statBonusById, equippedItems, deadSummoned, samCaughtUp, deathCauseById, t, getTerrainAtPoint, visitedLocation, showRecruitRefusal, transport, eagleSince, rogueBearerId, rogueSinceDay, startRogueBattle]);

  // Kick off a betrayal battle once one is queued (with full party context).
  useEffect(() => {
    if (pendingBetrayal) {
      startBetrayal(pendingBetrayal);
      setPendingBetrayal(null);
    }
  }, [pendingBetrayal, startBetrayal]);

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
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 max-w-none select-none"
          style={{
            width: mapSize.width,
            height: mapSize.height,
            backgroundColor: "#d8b777",
            mixBlendMode: "multiply",
            opacity: 0.18,
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

        {/* Overlay layer: only the container's translate tracks the camera each
            frame, so markers/figure aren't re-projected on pan. Children sit at
            point×zoom (constant pixel size — no scale on this layer). */}
        <div
          className="pointer-events-none absolute left-0 top-0"
          style={{ transform: `translate(${offset.x}px, ${offset.y}px)`, transformOrigin: "0 0" }}
        >
          {locationMarkers}

          {leftBehind.map((member) => {
            const character = CHARACTERS.find((c) => c.id === member.id);
            if (!character) {
              return null;
            }
            const pos = mapToLayer(member.point);
            return (
              <button
                key={member.id}
                type="button"
                title={charName(character.id)}
                aria-label={charName(character.id)}
                className="pointer-events-auto absolute z-20 size-11 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border-2 border-amber-300 bg-parchment shadow-lg"
                style={{ left: pos.x, top: pos.y }}
                onPointerDown={(event) => event.stopPropagation()}
                onPointerUp={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  openCharacterPanel(member.id, false);
                }}
              >
                <img src={character.icon} alt="" className="size-full object-cover" />
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
            type="button"
            aria-label={figureCharacter ? charName(figureCharacter.id) : t("character.bearer")}
            title={figureCharacter ? charName(figureCharacter.id) : t("character.bearer")}
            className="pointer-events-auto absolute z-30 size-12 -translate-x-1/2 -translate-y-1/2 cursor-pointer"
            style={{ left: playerLayer.x, top: playerLayer.y }}
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              if (!isMoving && !target && currentLocation) {
                openVisitedLocation(currentLocation);
                return;
              }
              if (figureCharacter) {
                openCharacterPanel(figureCharacter.id, true);
              }
            }}
          >
            <img
              src={figureCharacter?.icon ?? PLAYER_ICON}
              alt=""
              draggable="false"
              className="size-full select-none object-contain drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]"
            />
          </button>
        </div>

        <div
          className="absolute right-4 top-4 z-50"
          onPointerDown={(event) => event.stopPropagation()}
          onPointerUp={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setSettingsOpen((prev) => !prev)}
            aria-label={t("ui.settings")}
            title={t("ui.settings")}
            aria-pressed={settingsOpen}
            className="flex size-9 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900/90 text-neutral-200 transition hover:bg-neutral-800 aria-pressed:bg-neutral-800"
          >
            <Settings className="size-4" />
          </button>
          {settingsOpen && (
            <div className="absolute right-0 top-full mt-2 flex w-52 flex-col gap-0.5 rounded border border-neutral-700 bg-neutral-900/95 p-1.5 shadow-2xl">
              <button
                type="button"
                onClick={() => setShowTerrain((prev) => !prev)}
                className="flex items-center gap-2.5 rounded px-2.5 py-2 text-left text-sm text-neutral-200 transition hover:bg-neutral-800"
              >
                {showTerrain ? <Eye className="size-4 shrink-0" /> : <EyeOff className="size-4 shrink-0" />}
                <span className="flex-1">{t("ui.terrain")}</span>
                <span className="text-xs text-neutral-400">{showTerrain ? t("ui.on") : t("ui.off")}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowHeroPath((prev) => !prev)}
                className="flex items-center gap-2.5 rounded px-2.5 py-2 text-left text-sm text-neutral-200 transition hover:bg-neutral-800"
              >
                <Route className="size-4 shrink-0" />
                <span className="flex-1">{t("ui.heroPath")}</span>
                <span className="text-xs text-neutral-400">{showHeroPath ? t("ui.on") : t("ui.off")}</span>
              </button>
              <button
                type="button"
                onClick={cycleSpeed}
                className="flex items-center gap-2.5 rounded px-2.5 py-2 text-left text-sm text-neutral-200 transition hover:bg-neutral-800"
              >
                <Gauge className="size-4 shrink-0" />
                <span className="flex-1">{t("ui.speed")}</span>
                <span className="text-xs text-neutral-400">{animationSpeed}×</span>
              </button>
              <div className="my-1 border-t border-neutral-800" />
              <button
                type="button"
                onClick={toggleLang}
                className="flex items-center gap-2.5 rounded px-2.5 py-2 text-left text-sm text-neutral-200 transition hover:bg-neutral-800"
              >
                <span className="flex size-4 shrink-0 items-center justify-center text-[11px] font-bold">
                  {lang === "en" ? "RU" : "EN"}
                </span>
                <span className="flex-1">{lang === "en" ? "Русский" : "English"}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setHelpOpen(true);
                  setSettingsOpen(false);
                }}
                className="flex items-center gap-2.5 rounded px-2.5 py-2 text-left text-sm text-neutral-200 transition hover:bg-neutral-800"
              >
                <span className="flex size-4 shrink-0 items-center justify-center text-base font-bold">?</span>
                <span className="flex-1">{t("ui.help")}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setRestartConfirm(true);
                  setSettingsOpen(false);
                }}
                className="flex items-center gap-2.5 rounded px-2.5 py-2 text-left text-sm text-neutral-200 transition hover:bg-neutral-800"
              >
                <RotateCcw className="size-4 shrink-0" />
                <span className="flex-1">{t("ui.restart")}</span>
              </button>
            </div>
          )}
        </div>

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
                  <HoverHint label={t("ui.foodTitle")}>🍞 {food}</HoverHint>
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
                onClick={() => setStopped((prev) => !prev)}
                disabled={!target}
                aria-label={stopped ? t("ui.resume") : t("ui.stop")}
                title={stopped ? t("ui.resume") : t("ui.stop")}
                className="flex size-9 items-center justify-center rounded border border-neutral-700 bg-neutral-900/90 text-neutral-200 transition hover:bg-neutral-800 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-neutral-900/90"
              >
                {stopped ? <Play className="size-4" /> : <Square className="size-4" />}
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
                aria-label={t("ui.split")}
                title={t("ui.split")}
                className="flex size-9 items-center justify-center rounded border border-neutral-700 bg-neutral-900/90 text-neutral-200 transition hover:bg-neutral-800"
              >
                <Split className="size-4" />
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
                  const maxHp =
                    effectiveStats(character, totalBonusFor(character)).strength * HEALTH_PER_STR;
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
          imageSrc={visitedLocation ? locationImage(visitedLocation.id, seasonAt(journeyDay)) : null}
          imageInitiallyLoaded={
            visitedLocation
              ? preloadedLocationImages.has(
                  locationImage(visitedLocation.id, seasonAt(journeyDay)) ?? "",
                )
              : false
          }
          boss={locationBoss}
          monsterName={monsterName}
          recruits={recruitsHere}
          party={party}
          iconFor={iconFor}
          charName={charName}
          canRestock={visitedLocation ? FOOD_SUPPLY_LOCATION_IDS.has(visitedLocation.id) : false}
          food={food}
          foodCapacity={foodCapacity}
          transportOffer={locationTransport}
          transportActive={transport === locationTransport}
          isMoving={isMoving}
          refusalOpen={recruitRefusal !== null}
          canExplore={
            !!visitedLocation &&
            (!!EXPLORE_ITEM_BY_LOCATION[visitedLocation.id] ||
              visitedLocation.id === ERECH_ID ||
              visitedLocation.id === WEATHERTOP_ID)
          }
          exploreLocked={
            !!locationBoss ||
            (visitedLocation?.id === ISENGARD_ID &&
              !defeatedBosses.has(BOSSES_BY_LOCATION[ISENGARD_ID].name) &&
              !party.includes("saruman")) ||
            (visitedLocation?.id === WEATHERTOP_ID &&
              !defeatedBosses.has(BOSSES_BY_LOCATION[WEATHERTOP_ID].name))
          }
          onExplore={exploreLocation}
          onFightBoss={() => {
            if (locationBoss) {
              const bossPack =
                visitedLocation?.id === MINAS_MORGUL_ID
                  ? [locationBoss, ...Array.from({ length: 8 }, () => NAZGUL_ENEMY)]
                  : [locationBoss];
              setEncounter({
                monster: locationBoss,
                dangerous: true,
                solo: bossPack.length === 1,
                pack: bossPack,
              });
            }
          }}
          onViewStats={(id) => openCharacterPanel(id, false)}
          onRecruit={attemptRecruit}
          onTalk={(c) => talkToCharacter(c.id)}
          hasGifts={hasGifts}
          onTakeSupplies={() => {
            setFood(foodCapacity);
            foodRef.current = foodCapacity;
          }}
          onTakeTransport={() => {
            if (locationTransport) {
              requestTransport(locationTransport);
            }
          }}
          onWait={waitOneDay}
          canLeave={!lockedPassageLocation}
          note={
            visitedLocation?.id === ORODRUIN_ID && !hasRing ? t("orodruin.noRing") : null
          }
          onLeave={() => {
            if (recruitRefusal) {
              setRecruitRefusal(null);
              return;
            }
            if (lockedPassageLocation) {
              return;
            }
            setVisitedLocation(null);
            setTargetLocation(null);
          }}
        />

        <CalendarModal
          open={calendarOpen}
          entries={recruitmentCalendar}
          journeyDate={journeyDate}
          charName={charName}
          onClose={() => setCalendarOpen(false)}
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
          isLeftBehind={!!openCharacter && leftBehind.some((m) => m.id === openCharacter.id)}
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
            const member = openCharacter && leftBehind.find((m) => m.id === openCharacter.id);
            if (member) {
              callLeftBehindMember(member);
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

        <EncounterModal
          encounter={autoPlay ? null : encounter}
          monsterName={monsterName}
          onAccept={startBattle}
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

        <RecruitOfferModal
          offered={
            recruitOffer && !battle && !levelUpCharacterId && levelUpQueue.length === 0
              ? (CHARACTERS.find((c) => c.id === recruitOffer) ?? null)
              : null
          }
          waiting={leftBehind.some((m) => m.id === recruitOffer)}
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
          onClose={() => setRecruitRefusal(null)}
        />

        <DeathNoticeModal
          notice={ending ? null : deathNotice}
          charName={charName}
          onContinue={() => setDeathNotice(null)}
        />

        <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />

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

        <SamCatchUpModal
          open={samCatchUpOpen && !ending}
          sam={CHARACTERS.find((character) => character.id === "sam") ?? null}
          onContinue={acceptSamCatchUp}
        />

        <LevelUpModal
          hero={autoPlay ? null : levelUpHero}
          level={levelUpLevel}
          existingBonus={levelUpExistingBonus}
          draft={levelUpDraft}
          totalPoints={levelUpTotalPoints}
          draftSpent={levelUpDraftSpent}
          charName={charName}
          onAdjust={adjustLevelUpDraft}
          onRandomize={randomizeLevelUpDraft}
          onConfirm={confirmLevelUp}
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

        <BearerChooserModal
          open={
            !!reclaimedFrom &&
            !ending &&
            !battle &&
            !deathNotice &&
            !levelUpCharacterId &&
            levelUpQueue.length === 0
          }
          candidates={partyCharacters.filter((c) => !NON_BEARERS.has(c.id))}
          charName={charName}
          iconFor={iconFor}
          getStats={(id) => {
            const c = CHARACTERS.find((ch) => ch.id === id)!;
            return computeCharacterStats(
              c,
              ringDaysById[id] ?? 0,
              bearerId,
              damageById[id] ?? 0,
              totalBonusFor(c),
            );
          }}
          onChoose={(id) => {
            makeBearer(id);
            setReclaimedFrom(null);
          }}
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
          />
        )}
      </div>
    </section>
  );
}
