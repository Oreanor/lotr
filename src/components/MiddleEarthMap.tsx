import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { MouseEvent as ReactMouseEvent } from "react";
import { TransportIcon, Modal, PortalBubble } from "@/components/ui";
import {
  BattleModal,
  CharacterModal,
  ChronicleModal,
  CreationModal,
  EaglesLeftModal,
  EncounterModal,
  EndingModal,
  EscapeFailedModal,
  ExploreResultModal,
  HelpModal,
  LevelUpModal,
  LocationModal,
  OrodruinModal,
  PartySummaryModal,
  Preloader,
  RecruitOfferModal,
  RecruitRefusalModal,
  RestartConfirmModal,
  RogueFledModal,
  SamCatchUpModal,
  SpeechModal,
  SplitModal,
  StatsModal,
  TalkResultModal,
  TransportConfirmModal,
  type ExploreResult,
  type GameStats,
  type PartySummaryRow,
  type TalkResult,
} from "@/components/modals";
import {
  useBattleClock,
  useGameAutosave,
  useMapCamera,
  useReactions,
  useRingDecay,
  useSpeedSettings,
  useTerrainGrid,
} from "@/hooks";
import { MapSettingsMenu } from "@/components/map/MapSettingsMenu";
import { MapHud } from "@/components/map/MapHud";
import { MapLayers } from "@/components/map/MapLayers";
import { useChronicle } from "@/components/useChronicle";
import { useMapPrefs } from "@/components/useMapPrefs";
import { useLevelUp } from "@/components/useLevelUp";
import { isDesktop, exitApp } from "@/platform";
import * as G from "@/game";
import type { RecruitRefusalNotice } from "@/game";
import type {
  BattleState,
  Character,
  Combatant,
  DeathCause,
  EncounterState,
  Ending,
  MapLocation,
  Monster,
  Point,
  ReactionEvent,
  ReactionMood,
  Size,
  Squad,
  StatBonus,
  TransportId,
} from "@/game";

// Stable parse/serialize helpers for the persistent UI prefs (kept at module
// scope so usePersistentState's effect doesn't re-run every render).
// How long each Saruman-parley line lingers before the next speaker (or the choice).
const PARLEY_LINE_MS = 2300;
// Denethor's last day: not taken from Minas Tirith by 15 March 3019, and the
// despairing Steward gives himself to the pyre. After this he's gone.
const DENETHOR_FINAL_DAY = G.dateToDayOffset(15, 3, 3019);
// Companions who can plead for Saruman's life at the Isengard parley.
const SARUMAN_ADVOCATES = ["gandalf", "gandalf_white", "treebeard"];

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
  const locName = useCallback((loc: MapLocation) => G.getLocationLabel(loc, lang), [lang]);
  const toggleLang = () => i18n.changeLanguage(lang === "en" ? "ru" : "en");

  // Snapshot of a saved game (if any), read once. Seeds the state below so an
  // accidental reload resumes from the last stop/town.
  const [initialSave] = useState(G.loadSave);

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
      ? G.MAX_PATH_POINTS
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
  const partyRef = useRef<string[]>(G.DEFAULT_PARTY);
  // Bearer's current corruption (0-100), mirrored so callbacks defined before it
  // is computed (auto-play) can still read it.
  const bearerCorruptionRef = useRef(0);
  const gollumAliveRef = useRef(true);
  const bearerIdRef = useRef<string | null>(null);
  // Reassigned every render to the live `speak` closure, so action callbacks
  // defined before the reactions block can still fire spoken lines.
  const speakRef = useRef<(charId: string, event: ReactionEvent, opts?: { always?: boolean }) => void>(
    () => {},
  );
  // Item reactions shown inside the character panel (not on the map).
  const panelReactionRef = useRef<(charId: string, event: ReactionEvent) => void>(() => {});
  // A refusal/notice to surface only once the battle screen is dismissed (e.g. a
  // beaten traitor slinking off "in shame").
  const pendingRefusalRef = useRef<{ message: string; characterId?: string } | null>(null);
  // Equipped items mirrored for the rAF travel loop (item speed bonuses).
  const equippedItemsRef = useRef<Record<string, string>>({});
  // Party members present when the current location was entered; used to hide
  // already-recruited companions on repeat visits.
  const [entryParty, setEntryParty] = useState<Set<string>>(
    () => new Set(initialSave?.party ?? G.DEFAULT_PARTY),
  );

  const mapSize = useMemo<Size>(
    () => ({
      width: G.locationData.meta.map.width,
      height: G.locationData.meta.map.height,
    }),
    [],
  );

  const locations = useMemo<MapLocation[]>(() => G.locationData.locations, []);

  const hobbiton = useMemo<MapLocation>(
    () => locations.find((location) => location.id === G.HOBBITON_ID) ?? locations[0],
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
    initialFocus: G.getStartPosition(hobbiton.point),
    resizeFocus: hobbiton.point,
    playerRef,
    mapInputLockedRef,
    onTapRef,
  });
  const { terrainReady, getTerrainAtPoint } = useTerrainGrid(mapSize);
  const [player, setPlayer] = useState<Point>(() => {
    const start = initialSave?.player ?? G.getStartPosition(hobbiton.point);
    playerRef.current = start;
    return start;
  });
  const [heroPath, setHeroPath] = useState<Point[]>(
    () => [initialSave?.player ?? G.getStartPosition(hobbiton.point)],
  );
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
  // Per-browser UI preferences (overlays, background map, theme, chatter rate,
  // level-up mode) live in their own hook; `settingsMenuProps` is spread straight
  // into <MapSettingsMenu>.
  const {
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
  } = useMapPrefs();
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
  const [party, setParty] = useState<string[]>(initialSave?.party ?? G.DEFAULT_PARTY);
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
  // Set when Treebeard, brought along to fallen Isengard, settles to rule it: he
  // leaves the party, won't re-join, and is found there on every later visit.
  const [treebeardAtIsengard, setTreebeardAtIsengard] = useState<boolean>(
    initialSave?.treebeardAtIsengard ?? false,
  );
  const treebeardAtIsengardRef = useRef(treebeardAtIsengard);
  treebeardAtIsengardRef.current = treebeardAtIsengard;
  // Entry speeches at Tharbad (Gandalf, then Boromir, whoever is along), shown
  // one modal after another. Reset on leaving so each visit greets afresh.
  const [tharbadSpeech, setTharbadSpeech] = useState<"gandalf" | "boromir" | null>(null);
  const tharbadGreetedRef = useRef(false);
  // The Osgiliath ruins yield a Gondorian armoury cache exactly once.
  const [osgiliathCacheFound, setOsgiliathCacheFound] = useState<boolean>(
    initialSave?.osgiliathCacheFound ?? false,
  );
  // We've told the player, once, that Denethor gave himself to the pyre.
  const [denethorMourned, setDenethorMourned] = useState<boolean>(
    initialSave?.denethorMourned ?? false,
  );
  // World tension: every foe (bosses included) gains flat stat points as the
  // journey drags on — as if the enemy ranks level up too. Points land on a
  // slowing cadence (10 days to the 1st, then 11, 12, …), so growth tracks the
  // party's own decelerating level curve rather than outpacing it.
  const [enemyGrowth, setEnemyGrowth] = useState<StatBonus>(
    () => initialSave?.enemyGrowth ?? { strength: 0, defense: 0, intelligence: 0, luck: 0 },
  );
  useEffect(() => {
    setEnemyGrowth((prev) => {
      let n = prev.strength + prev.defense + prev.intelligence + prev.luck;
      // The m-th point lands on day 10 + 11 + … = 10m + m(m−1)/2 (interval grows).
      const dayFor = (m: number) => 10 * m + (m * (m - 1)) / 2;
      if (dayFor(n + 1) > journeyDay) {
        return prev;
      }
      const next = { ...prev };
      const stats: (keyof StatBonus)[] = ["strength", "defense", "intelligence", "luck"];
      while (dayFor(n + 1) <= journeyDay) {
        next[stats[Math.floor(Math.random() * stats.length)]] += 1;
        n += 1;
      }
      return next;
    });
  }, [journeyDay]);
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
  // True once the party has left Hobbiton during the Scouring: only then is the
  // village shown ruined (on arrival Saruman has only just got there).
  const [hobbitonScoured, setHobbitonScoured] = useState<boolean>(initialSave?.hobbitonScoured ?? false);
  // The One Ring has been cast into the Fire — the Ban over the West may lift.
  const [ringDestroyed, setRingDestroyed] = useState(initialSave?.ringDestroyed ?? false);
  // A ship (or the Eagles) has reached the world's western edge — offer the
  // passage to Valinor. `valinorByEagle` marks an Eagle attempt: the Eagles will
  // not bear the Ring West, so they only carry the party across once it's unmade.
  const [valinorAttempt, setValinorAttempt] = useState(false);
  const [valinorByEagle, setValinorByEagle] = useState(false);
  const [samCatchUpOpen, setSamCatchUpOpen] = useState(false);
  // Result of talking to a companion: a greeting or items handed over.
  const [talkResult, setTalkResult] = useState<TalkResult | null>(null);
  const [bearerId, setBearerId] = useState(initialSave?.bearerId ?? G.RING_BEARER_ID);
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
  // Food (days left) and per-character starvation are simulated per day. HP is
  // stored as current health per character (a missing entry = full), so new
  // recruits join at full health; with double rations on, a hurt party heals at
  // the cost of extra food.
  const [food, setFood] = useState(initialSave?.food ?? G.INITIAL_FOOD_DAYS);
  const [hpById, setHpById] = useState<Record<string, number>>(initialSave?.hpById ?? {});
  const [deathCauseById, setDeathCauseById] = useState<Record<string, DeathCause>>(
    initialSave?.deathCauseById ?? {},
  );
  // Journey day the Grey Gandalf fell in battle (null until he does) — gates when
  // Gandalf the White may be met upon the road.
  const [gandalfFellDay, setGandalfFellDay] = useState<number | null>(
    initialSave?.gandalfFellDay ?? null,
  );

  const [randomPresence, setRandomPresence] = useState<Record<string, boolean>>({});
  // Forage result floated above the food counter: "+gathered" (green) and the
  // day's "-eaten" (red), so the change adds up.
  const [foodChange, setFoodChange] = useState<{ gain: number; eaten: number; key: number } | null>(
    null,
  );
  const foodFarmSeqRef = useRef(0);
  const foodFarmTimerRef = useRef<number | null>(null);
  const [recruitRefusal, setRecruitRefusal] = useState<RecruitRefusalNotice | null>(null);
  // A recruit's spoken refusal, shown as a bubble above their portrait.
  const [recruitBubble, setRecruitBubble] = useState<{ speakerId: string; text: string; key: number } | null>(
    null,
  );
  const recruitBubbleSeqRef = useRef(0);
  const recruitBubbleTimerRef = useRef<number | null>(null);
  // After defeating a recruitable foe: offer to invite them.
  const [recruitOffer, setRecruitOffer] = useState<string | null>(null);
  const [pendingExploreRecruit, setPendingExploreRecruit] = useState<string | null>(null);
  // The current offer is a peaceful "wants to join" (no battle, joins at full HP).
  const [peacefulOffer, setPeacefulOffer] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [chronicleOpen, setChronicleOpen] = useState(false);
  // Party roster overview, shown when tapping the group's figure on the map.
  const [partySummaryOpen, setPartySummaryOpen] = useState(false);
  // Settings dropdown (terrain / hero-path / speed / language / help / restart).
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Restart-the-game confirmation dialog (wipes the save and reloads).
  const [restartConfirm, setRestartConfirm] = useState(false);
  // Hero creation: distribute G.CREATION_POINTS over Frodo's stats before play.
  // A loaded save means the hero was already created.
  const [created, setCreated] = useState(initialSave !== null);
  const [autoPlay, setAutoPlay] = useState(false);
  const [creationBonus, setCreationBonus] = useState<StatBonus>(G.ZERO_BONUS);
  // Wired up later by the reactions system; the level-up hook reads it to speak a
  // line at a hero's portrait when their fresh points land.
  const pickReactionRef = useRef<((c: string, e: ReactionEvent) => { text: string } | null) | null>(
    null,
  );
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
    initialSave?.maxPartySize ?? (initialSave?.party?.length ?? G.DEFAULT_PARTY.length),
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

  // The post-battle level-up modal machine (queue + current hero + draft + spoken
  // reaction) lives in its own hook. The map keeps the derived modal props and the
  // effects that enqueue heroes and open the next card, all via these setters.
  const {
    levelUpQueue,
    setLevelUpQueue,
    levelUpCharacterId,
    setLevelUpCharacterId,
    levelUpDraft,
    setLevelUpDraft,
    levelUpReaction,
    adjustLevelUpDraft,
    confirmLevelUp,
    runLevelUpMode,
    pickLevelUpMode,
  } = useLevelUp({
    expById,
    statBonusById,
    setStatBonusById,
    setLevelUpMode,
    reactionMultRef,
    pickReactionRef,
  });

  // The journey chronicle (log + stationed-town tagging + transport/level
  // watchers) lives in its own hook; the game code just calls chronicleRef.current
  // at the moment each event happens. Names are resolved to the display language
  // via tRef at the call-site, so the log stays language-neutral structured data.
  const { chronicle, chronicleRef, noteArrival, clearStationed } = useChronicle({
    journeyDayRef,
    initialChronicle: initialSave?.chronicle,
    transport,
    expById,
    party,
  });
  const tRef = useRef(t);
  tRef.current = t;
  const locNameRef = useRef(locName);
  locNameRef.current = locName;
  // Extra days of Ring decay bought by putting it on in battle.
  const [ringWear, setRingWear] = useState(initialSave?.ringWear ?? 0);
  // Days each character has carried the Ring; corruption never resets on transfer.
  const [ringDaysById, setRingDaysById] = useState<Record<string, number>>(
    () =>
      initialSave?.ringDaysById ??
      (initialSave?.bearerId
        ? { [initialSave.bearerId]: initialSave.bearerRingDays ?? 0 }
        : { [G.RING_BEARER_ID]: 0 }),
  );
  const bearerRingDays = bearerId ? (ringDaysById[bearerId] ?? 0) : 0;
  const addRingDays = useCallback((id: string, delta: number) => {
    setRingDaysById((days) => ({ ...days, [id]: (days[id] ?? 0) + delta }));
  }, []);
  const battleAppliedRef = useRef(false);
  // A game-over ending queued behind the lost battle screen — shown once the
  // player dismisses the fight (so the defeat, and who fell, is actually seen).
  const pendingEndingRef = useRef<Ending | null>(null);
  const foodRef = useRef(initialSave?.food ?? G.INITIAL_FOOD_DAYS);
  const hpRef = useRef<Record<string, number>>(initialSave?.hpById ?? {});
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
      // Records that events now happen "at" this town, and chronicles the arrival
      // (skipping a mere re-open of the town we're already in).
      noteArrival(location.id, locNameRef.current(location));
    };
    const src = G.locationImage(location.id, G.seasonAt(journeyDayRef.current));
    if (!src) {
      open();
      return;
    }
    void G.preloadLocationImage(src).then(open);
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

  // A recruit's refusal as a speech bubble above their portrait (unified reaction
  // style), with the refuse-face flicker. If the speaker has no portrait on screen
  // to anchor to (e.g. Gollum, just caught in the wild and offered), fall back to
  // the notice card so the line is never lost.
  const speakRefusalBubble = useCallback(
    (speakerId: string, text: string, emote: "refuse" | "joy" = "refuse") => {
      const onScreen = !!document.querySelector(`[data-character-portrait="${speakerId}"]`);
      if (!onScreen) {
        showRecruitRefusal(text, speakerId);
        return;
      }
      flashEmote(speakerId, emote);
      recruitBubbleSeqRef.current += 1;
      setRecruitBubble({ speakerId, text, key: recruitBubbleSeqRef.current });
      if (recruitBubbleTimerRef.current) {
        window.clearTimeout(recruitBubbleTimerRef.current);
      }
      recruitBubbleTimerRef.current = window.setTimeout(() => setRecruitBubble(null), G.REACTION_SHOW_MS);
    },
    [flashEmote, showRecruitRefusal],
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
      if (!partyRef.current.includes(id)) {
        chronicleRef.current("recruit", { name: tRef.current(`char.${id}`) });
      }
      setParty((prev) => {
        if (prev.includes(id)) {
          return prev;
        }
        // Stamp the join day so the Ring's corruption of traitors has a grace
        // period (and resets if they leave and are re-recruited later).
        joinDayRef.current[id] = journeyDayRef.current;
        return [...prev, id];
      });

      const progress = G.INITIAL_HERO_PROGRESS[id];
      if (progress) {
        setExpById((prev) => (id in prev ? prev : { ...prev, [id]: progress.exp }));
        setStatBonusById((prev) =>
          id in prev ? prev : { ...prev, [id]: { ...progress.bonus } },
        );
      }

      flashEmote(id, "joy");

      // Elrond joining sends Arwen home — she will not defy her father. She steps
      // out of the company with a word (recruitable again once he's not along).
      if (id === "elrond" && partyRef.current.includes("arwen")) {
        setParty((prev) => prev.filter((memberId) => memberId !== "arwen"));
        showRecruitRefusal(t("refuse.arwenLeaves"), "arwen");
      }
    },
    [flashEmote, showRecruitRefusal, t],
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
      // The refusal is spoken as a bubble above the speaker's portrait. By default
      // that's the recruit you tapped; Gandalf voices his own line about Saruman.
      const refuse = (line: string, speaker: string = character.id) => {
        speakRefusalBubble(speaker, line);
      };

      // Treebeard, settled at Isengard, won't march on — only bids you go.
      if (character.id === "treebeard" && treebeardAtIsengardRef.current) {
        refuse(t("refuse.treebeardStays"));
        return;
      }
      // Deterministic party-composition rules (incl. Gollum's hobbits-only).
      const blockedKey = G.recruitRefusalKey(character.id, party);
      if (blockedKey) {
        const speaker = blockedKey === "refuse.gandalfSaruman" ? "gandalf" : character.id;
        refuse(t(blockedKey, { name: charName(character.id) }), speaker);
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
              const c = G.CHARACTERS.find((ch) => ch.id === id);
              return (
                sum +
                (c
                  ? G.effectiveStats(c, G.addBonus(statBonusById[id] ?? G.ZERO_BONUS, G.auraBonus(c, ids)))
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
      const needed = G.RELUCTANT_RECRUIT_ATTEMPTS[character.id];
      if (needed) {
        recruitAttemptsRef.current[character.id] = (recruitAttemptsRef.current[character.id] ?? 0) + 1;
        if (recruitAttemptsRef.current[character.id] < needed) {
          // Once the Ring is gone, Denethor drops the "the Ring belongs to Minas
          // Tirith" line for a plain brush-off.
          const refusalKey =
            character.id === "denethor" && ringDestroyed
              ? "refuse.denethorFree"
              : `refuse.${character.id}`;
          refuse(t(refusalKey));
          return;
        }
      }
      // Celeborn / Haldir would balk at a dwarf, but join for the Lady Galadriel
      // — each in his own way of naming her.
      const forGaladriel =
        (character.id === "celeborn" || character.id === "haldir") &&
        party.includes("galadriel") &&
        party.includes("gimli");
      recruitCharacter(character.id);
      if (forGaladriel) {
        speakRefusalBubble(character.id, t(`recruit.${character.id}Follows`), "joy");
      }
    },
    [bearerId, party, grimaFled, ringDestroyed, recruitCharacter, speakRefusalBubble, statBonusById, t],
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
    const character = G.CHARACTERS.find((c) => c.id === id);
    if (character) {
      // Subdued in battle → joins wounded (half health); a peaceful join is unhurt.
      if (!peaceful) {
        const max = G.maxHpFromStats(character.strength, character.defense);
        hpRef.current = { ...hpRef.current, [id]: max - Math.floor(max / 2) };
        setHpById(hpRef.current);
      }
      attemptRecruit(character);
      // Éomer sends his sister Éowyn home as he joins; she's recruitable again at
      // Edoras (we only drop her from the party, never mark her gone).
      if (id === "eomer" && partyRef.current.includes("eowyn")) {
        setParty((prev) => prev.filter((memberId) => memberId !== "eowyn"));
        showRecruitRefusal(t("refuse.eomerSendsEowyn"), "eomer");
      }
    }
  }, [recruitOffer, peacefulOffer, parkedMembers, recruitCharacter, attemptRecruit, showRecruitRefusal, t]);

  // A tempted companion turns on the bearer: a 1v1 fight for the Ring.
  const startBetrayal = useCallback(
    (traitorId: string) => {
      const bearer = G.CHARACTERS.find((c) => c.id === bearerId);
      const traitor = G.CHARACTERS.find((c) => c.id === traitorId);
      if (!bearer || !traitor) {
        return;
      }
      battleAppliedRef.current = false;
      setEncounter(null);
      let battleState = G.createBetrayalBattle(bearer, traitor, traitorId, {
        party,
        statBonusById,
        hpById,
        expById,
      });
      if (autoPlayRef.current) {
        battleState = G.resolveBattleInstantly(battleState);
      }
      setBattle(battleState);
    },
    [bearerId, party, statBonusById, hpById, expById],
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
    battleAppliedRef.current = false;
    setEncounter(null);
    let battleState = G.createBattleState({
      party,
      monster: enc.monster,
      pack: enc.pack,
      bearerId,
      statBonusById,
      hpById,
      expById,
      equippedItems,
      wraithsStand: enc.wraithsStand,
      sarumanParley: enc.sarumanParley,
      enemyBonus: enemyGrowth,
    });
    if (autoPlayRef.current) {
      battleState = G.resolveBattleInstantly(battleState);
    }
    setBattle(battleState);
  }, [encounter, party, statBonusById, hpById, bearerId, equippedItems, expById, enemyGrowth]);

  // Rate a wild encounter "strong" only if it would, on average, take down more
  // than half the company — a forecast from the real battle engine, not a coin
  // flip (see G.estimateEncounterDanger).
  const assessDanger = useCallback(
    (monster: Monster, pack: Monster[]) =>
      G.estimateEncounterDanger({
        party,
        monster,
        pack,
        bearerId,
        statBonusById,
        hpById,
        expById,
        equippedItems,
        enemyBonus: enemyGrowth,
      }),
    [party, bearerId, statBonusById, hpById, expById, equippedItems, enemyGrowth],
  );

  // Flee before the fight: succeed and the foe is left behind; fail and there's
  // no slipping away — the battle begins anyway.
  const fleeEncounter = useCallback(() => {
    if (!encounter) {
      return;
    }
    if (G.rollEscape(party, statBonusById, encounter.pack.map((mm) => mm.luck))) {
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
        ? Math.round(G.escapeChance(party, statBonusById, encounter.pack.map((mm) => mm.luck)) * 100)
        : 0,
    [encounter, party, statBonusById],
  );
  const battleEscapePct = useMemo(
    () =>
      battle
        ? Math.round(G.escapeChance(party, statBonusById, battle.enemies.map((e) => e.luck)) * 100)
        : 0,
    [battle, party, statBonusById],
  );

  // Hero creation: nudge one of Frodo's stats, clamped to [0, points left].
  const adjustCreation = useCallback((stat: keyof StatBonus, delta: number) => {
    setCreationBonus((prev) => {
      const spent = prev.strength + prev.defense + prev.intelligence + prev.luck;
      const nextValue = prev[stat] + delta;
      if (nextValue < 0 || (delta > 0 && spent >= G.CREATION_POINTS)) {
        return prev;
      }
      return { ...prev, [stat]: nextValue };
    });
  }, []);

  // Scatter all creation points randomly across the four stats.
  const randomizeCreation = useCallback(() => {
    setCreationBonus(G.rollStatBonus(G.CREATION_POINTS));
  }, []);

  const confirmCreation = useCallback(() => {
    setStatBonusById((prev) => ({ ...prev, [G.RING_BEARER_ID]: creationBonus }));
    setCreated(true);
  }, [creationBonus]);

  // Wipe the save and reload for a fresh quest (from the restart confirmation).
  const restartGame = useCallback(() => {
    G.clearSave();
    window.location.reload();
  }, []);

  const startAutoPlay = useCallback(() => {
    const rolled = G.rollStatBonus(G.CREATION_POINTS);
    setCreationBonus(rolled);
    setStatBonusById((prev) => ({ ...prev, [G.RING_BEARER_ID]: rolled }));
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
      // A game-over from battle: leave the lost battle on screen (its "Поражение"
      // + "Продолжить" footer) so the player sees the whole party fall, then show
      // the ending only once they dismiss it (see the pending-ending effect).
      const endBattleAfterPause = (next: Ending) => {
        pendingEndingRef.current = next;
      };
      const survivors = party.filter((id) => !dead.includes(id));
      const livingBearerCandidates = survivors.filter((id) => !G.NON_BEARERS.has(id));
      const slainRoaming = G.slainRoamingRecruitIds(dead);
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
      if (!ringDestroyed && dead.includes(bearerId)) {
        // The Ring can pass to an able companion still standing — here in the
        // active party, or, if this whole group fell, in a splinter squad still
        // abroad. Only when no one anywhere can take it up is the quest over.
        // (In freeplay the Ring is gone — a fallen ex-bearer is just a death.)
        const squadHasBearer = squadsRef.current.some((s) =>
          s.members.some((id) => !G.NON_BEARERS.has(id)),
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
          // No one anywhere can truly carry the Ring. If non-bearers still live,
          // one of them takes it to their own doom; otherwise all simply fell.
          const living = [...survivors, ...squadsRef.current.flatMap((s) => s.members)];
          const next: Ending = living.length > 0 ? G.nonBearerEnding(living) : "battle";
          endBattleAfterPause(next);
        }
      } else if (survivors.length === 0) {
        // The whole group fell, but the bearer wasn't among them — he'd already
        // fled with the Ring (or there's no bearer). That's "all for nothing",
        // not "the bearer fell in battle".
        endBattleAfterPause(rogueBearerId || !bearerId ? "nothing" : "battle");
      }
    },
    [bearerId, party, rogueBearerId, ringDestroyed],
  );

  // Flee: a single luck-weighted attempt per battle. Succeed and you leave
  // with the wounds taken so far (no XP); fail and the chance is spent — the
  // button goes dead and the fight goes on.
  const fleeBattle = useCallback(() => {
    if (!battle || battle.fleeUsed) {
      return;
    }
    if (!G.rollEscape(party, statBonusById, battle.enemies.map((e) => e.luck))) {
      setBattle((b) => (b ? { ...b, fleeUsed: true } : b));
      setEscapeFailed("battle");
      return;
    }
    const nextHp = { ...hpRef.current };
    for (const ally of battle.allies) {
      if (ally.hp >= ally.maxHp) {
        delete nextHp[ally.key];
      } else {
        nextHp[ally.key] = ally.hp;
      }
    }
    hpRef.current = nextHp;
    setHpById(nextHp);
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

  // Frame a hero: the party shields him (every 2nd blow aimed at him is taken by
  // another). Frame a foe: the party gangs up on it, overriding wit-based aim.
  // Clicking the framed portrait again lifts the order.
  const selectGuardAlly = useCallback((key: string) => {
    setBattle((b) => (b ? { ...b, guardedAllyKey: b.guardedAllyKey === key ? null : key } : b));
  }, []);

  const selectFocusEnemy = useCallback((key: string) => {
    setBattle((b) => (b ? { ...b, focusEnemyKey: b.focusEnemyKey === key ? null : key } : b));
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
  // Only speakers still standing have their say — anyone downed in the fight is
  // silent. Their pleas/objections play one at a time as battle bubbles.
  const livingParleySpeakers = useMemo(() => {
    if (!battle?.pendingParley) {
      return [];
    }
    const downed = new Set(battle.allies.filter((a) => a.hp <= 0).map((a) => a.key));
    return parleySpeakers.filter((id) => !downed.has(id));
  }, [battle?.pendingParley, battle?.allies, parleySpeakers]);
  // Auto-advance through the parley lines; when past the last, the choice shows.
  useEffect(() => {
    if (!battle?.pendingParley || parleyStep >= livingParleySpeakers.length) {
      return undefined;
    }
    const id = window.setTimeout(() => setParleyStep((s) => s + 1), PARLEY_LINE_MS);
    return () => window.clearTimeout(id);
  }, [battle?.pendingParley, parleyStep, livingParleySpeakers.length]);

  // Spare Saruman: he renounces and the fight ends — wounds stay, no kill/loot,
  // and Isengard is cleared (boss recorded as dealt with).
  const spareSaruman = useCallback(() => {
    if (!battle) {
      return;
    }
    const nextHp = { ...hpRef.current };
    for (const ally of battle.allies) {
      if (ally.hp >= ally.maxHp) {
        delete nextHp[ally.key];
      } else {
        nextHp[ally.key] = ally.hp;
      }
    }
    hpRef.current = nextHp;
    setHpById(nextHp);
    applyBattleCasualties(battle.allies);
    // He's let go, not slain: alive and on the loose (drives the NW roam and the
    // Scouring two months hence). Isengard is still cleared (he's left it).
    setSarumanSpared(true);
    setSarumanSparedDay(journeyDayRef.current);
    const advocate = SARUMAN_ADVOCATES.find((who) => partyRef.current.includes(who));
    chronicleRef.current("sarumanSpared", {
      advocate: advocate ? tRef.current(`char.${advocate}`) : "",
    });
    setBattle(null);
    setParleyStep(0);
  }, [battle, applyBattleCasualties]);

  // Fight on: drop the parley hold and half-floor so Saruman can be slain.
  const fightSaruman = useCallback(() => {
    setBattle((b) => (b ? { ...b, pendingParley: false, parleyDeclined: true } : b));
    const advocate = SARUMAN_ADVOCATES.find((who) => partyRef.current.includes(who));
    chronicleRef.current("sarumanFightOn", {
      advocate: advocate ? tRef.current(`char.${advocate}`) : "",
    });
    setParleyStep(0);
  }, []);

  // A Saruman who leaves alive — spared at Isengard, or fled after a betrayal —
  // makes for the Shire: he roams the NW and scours Hobbiton two months on.
  const sendSarumanScouring = useCallback((id: string) => {
    if (id === "saruman") {
      setSarumanSpared(true);
      setSarumanSparedDay(journeyDayRef.current);
    }
  }, []);


  const makeBearer = useCallback((id: string) => {
    if (G.NON_BEARERS.has(id)) {
      return;
    }
    const previous = bearerIdRef.current;
    if (previous && previous !== id) {
      // A playful soul handing the Ring to a grounded or lofty companion holds
      // their tongue — no "guard it well" lecture; the wiser one already knows.
      const playfulLecturingSerious =
        G.temperamentOf(previous) === "playful" && G.temperamentOf(id) !== "playful";
      if (!playfulLecturingSerious) {
        speakRef.current(previous, "ringGive", { always: true });
      }
    }
    if (previous !== id) {
      speakRef.current(id, "ringTake", { always: true });
      const taker = tRef.current(`char.${id}`);
      if (previous) {
        // Record who took up the Ring and how corrupted the one handing it over had
        // become — the whole reason bearers are swapped.
        chronicleRef.current("bearerHandoff", {
          name: taker,
          from: tRef.current(`char.${previous}`),
          corruption: Math.round(bearerCorruptionRef.current),
        });
      } else {
        chronicleRef.current("bearerTake", { name: taker });
      }
    }
    setBearerId(id);
  }, []);

  const acceptSamCatchUp = useCallback(() => {
    const capacity = G.foodCapacityFor(transport);
    const nextFood = Math.min(capacity, foodRef.current + G.SAM_CATCH_UP_FOOD_DAYS);
    foodRef.current = nextFood;
    setFood(nextFood);
    recruitCharacter("sam");
    setSamCatchUpOpen(false);
  }, [recruitCharacter, transport]);

  // The Ring slips away with a companion (the bearer broke at 100%, or a betrayer
  // bested the party). He drops out and runs for Mount Doom; the party is left
  // ringless with G.ROGUE_CHASE_DAYS to hunt him down.
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
      const rogue = G.CHARACTERS.find((c) => c.id === rogueId);
      if (!rogue) {
        return;
      }
      battleAppliedRef.current = false;
      let battleState = G.createRogueBattle(rogueId, rogue, {
        party,
        statBonusById,
        hpById,
        expById,
      });
      if (autoPlayRef.current) {
        battleState = G.resolveBattleInstantly(battleState);
      }
      setBattle(battleState);
    },
    [party, statBonusById, hpById, expById],
  );

  // Re-roll who/what is around: sometimes-present companions and the eagles at
  // Carn Dûm. Fired on arrival and again whenever the player waits a day.
  const rollPresence = useCallback((locationId?: number) => {
    setRandomPresence(() => {
      const rolled: Record<string, boolean> = {};
      for (const [id, chance] of Object.entries(G.RANDOM_PRESENCE)) {
        rolled[id] = Math.random() < chance;
      }
      return rolled;
    });
    setEagleOffered(locationId === G.CARN_DUM_ID && Math.random() < G.EAGLE_PRESENCE_CHANCE);
    setShipOffered(
      locationId !== undefined && Math.random() < (G.SHIP_PRESENCE_CHANCE[locationId] ?? 0),
    );
  }, []);

  const waitOneDay = useCallback(() => {
    if (isMoving) {
      return;
    }

    const nextDay = journeyDayRef.current + 1;
    journeyDayRef.current = nextDay;
    journeyMilesRef.current += G.MILES_PER_DAY;
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
    const bearer = G.CHARACTERS.find((character) => character.id === bearerId);
    const luck =
      bearer && party.includes(bearerId)
        ? G.effectiveStats(bearer, G.addBonus(statBonusById[bearerId] ?? G.ZERO_BONUS, G.auraBonus(bearer, party)))
            .luck
        : party.reduce((best, id) => {
            const c = G.CHARACTERS.find((character) => character.id === id);
            if (!c) {
              return best;
            }
            return Math.max(
              best,
              G.effectiveStats(c, G.addBonus(statBonusById[id] ?? G.ZERO_BONUS, G.auraBonus(c, party))).luck,
            );
          }, 0);
    const samBonus = party.includes("sam") ? G.SAM_FARM_BONUS : 0;
    const gained =
      1 +
      samBonus +
      Math.floor(Math.random() * 3) +
      Math.floor(Math.random() * (Math.floor(luck / 3) + 1));
    const before = foodRef.current;
    const cap = G.foodCapacityFor(transport);
    const raw = before + gained;
    // Foraging spends a day, and that day eats a ration (2 if anyone's hurt and
    // there's spare to heal) — mirror that for the red "-N" so the numbers
    // reconcile. The actual subtraction happens in the day-upkeep effect below;
    // let the larder crest the cap by that ration here so it lands exactly full
    // afterwards. Otherwise, sitting at cap-1, the gain is clipped to the cap and
    // the day's meal drops you back below it — the cap is never reached.
    const anyHurt = party.some((id) => hpRef.current[id] !== undefined);
    const eaten = anyHurt && raw >= 2 ? 2 : raw >= 1 ? 1 : 0;
    foodRef.current = Math.min(cap + eaten, raw);
    const gain = foodRef.current - before;
    if (gain > 0 && !autoPlayRef.current) {
      foodFarmSeqRef.current += 1;
      setFoodChange({ gain, eaten, key: foodFarmSeqRef.current });
      if (foodFarmTimerRef.current) {
        window.clearTimeout(foodFarmTimerRef.current);
      }
      foodFarmTimerRef.current = window.setTimeout(() => setFoodChange(null), 1300);
    }

    const nextDay = journeyDayRef.current + 1;
    journeyDayRef.current = nextDay;
    journeyMilesRef.current += G.MILES_PER_DAY;
    setJourneyDay(nextDay);
  }, [isMoving, bearerId, party, transport, statBonusById]);

  // Flip to the previous/next party member while a stats modal is open.
  const showAdjacentCharacter = useCallback(
    (direction: number) => {
      setOpenCharacterId((current) => {
        if (!current) {
          return current;
        }
        const ids = G.CHARACTERS.filter((character) => party.includes(character.id)).map(
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
      helpOpen ||
      statsOpen ||
      chronicleOpen ||
      partySummaryOpen ||
      ((levelUpCharacterId !== null || levelUpQueue.length > 0) && !autoPlay) ||
      (encounter !== null && !autoPlay) ||
      (battle !== null && !autoPlay),
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
      helpOpen,
      statsOpen,
      chronicleOpen,
      partySummaryOpen,
      levelUpCharacterId,
      levelUpQueue,
      encounter,
      battle,
      autoPlay,
    ],
  );

  // Everyone "found": the seed hobbit, anyone recruited (stamped in joinDay),
  // whoever stands in the party now, plus everyone merely met — seen at a
  // location or faced as a foe — even if they never joined.
  const foundCharacterIds = useMemo(
    () =>
      new Set<string>([
        ...G.DEFAULT_PARTY,
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
      bossesTotal: Object.keys(G.BOSSES_BY_LOCATION).length,
      itemsFound: foundItems.length,
      itemsTotal: G.ITEMS.length,
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

  // The Grey Gandalf's fall in battle seeds his white return: stamp the day so
  // the encounter timer (a month off) can start counting.
  useEffect(() => {
    if (deathCauseById.gandalf === "battle" && gandalfFellDay === null) {
      setGandalfFellDay(journeyDayRef.current);
      chronicleRef.current("gandalfFell");
    }
  }, [deathCauseById, gandalfFellDay]);

  // Once the party is under way to a new destination it is no longer stationed at
  // a town — subsequent events are logged by the chronicle as happening on the road.
  useEffect(() => {
    if (targetLocation) {
      clearStationed();
    }
  }, [targetLocation, clearStationed]);

  // Ring corruption days accrue only for whoever currently carries it, freezing
  // while the Ring is fled (a chase) or once it's unmade (freeplay).
  useRingDecay({
    journeyDay,
    ringWear,
    bearerId,
    carrying: rogueBearerId === null && !ringDestroyed,
    addRingDays,
  });

  // Auto-save the full game state, but only at a clean rest point — never
  // mid-move, mid-battle, with an encounter pending, or during a ringless chase
  // (a reload would leave the party with no Ring and no rogue). The hook diffs a
  // snapshot, so it writes only on real change.
  useGameAutosave(
    !!created && !ending && !battle && !encounter && !isMoving && !target && !rogueBearerId,
    {
      player,
      journeyDay,
      journeyMiles: journeyMilesRef.current,
      party,
      bearerId,
      transport,
      eagleSince,
      food,
      hpById,
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
      denethorMourned,
      enemyGrowth,
      corsairPeace,
      ringDestroyed,
      dolGuldurNazgulSlain,
      sarumanSpared,
      sarumanSparedDay,
      hobbitonScoured,
      treebeardAtIsengard,
      gandalfFellDay: gandalfFellDay ?? undefined,
      chronicle,
      visitedLocationIds: [...visitedLocationIds],
      enemiesKilled,
      defeatedEnemyIcons: [...defeatedEnemyIcons],
      maxPartySize,
      metCharacterIds: [...metCharacterIds],
    },
  );

  // Game over: drop the save so a reload starts a fresh quest.
  useEffect(() => {
    if (ending) {
      G.clearSave();
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

  // Space always halts the march — same as the Stop button. We swallow it (and
  // drop focus) so it never re-fires whatever control was last clicked (which
  // made the camera/figure jump). Ignored only while a modal is up or while
  // typing in a field.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" && event.key !== " ") {
        return;
      }
      const el = event.target as HTMLElement | null;
      if (el && el.closest("input, textarea, select")) {
        return; // let Space type a space
      }
      event.preventDefault();
      if (mapInputLocked) {
        return; // a modal owns input
      }
      // Blur any focused button so the browser doesn't activate it on Space.
      (document.activeElement as HTMLElement | null)?.blur?.();
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

  // The bearer puts on the Ring at the Crack of Doom — whether by the player's
  // choice (claim) or because the Ring's hold overrode the will to destroy it
  // (viaBetrayal). If Gollum yet lives, half such moments end as the tale truly
  // did: he springs out of the dark for the Precious and, in the struggle,
  // topples with it into the Fire — the Ring unmade in spite of the bearer. He is
  // marked slain, so he never resurfaces in freeplay.
  const wearRingAtDoom = useCallback((viaBetrayal: boolean) => {
    if (gollumAliveRef.current && Math.random() < 0.5) {
      setSlainRoamingRecruits((prev) => new Set(prev).add("gollum"));
      // He may have been travelling in the company — he went into the Fire, so
      // drop him from party and squads alike.
      setParty((prev) => prev.filter((id) => id !== "gollum"));
      setSquads((prev) =>
        prev
          .map((s) => ({ ...s, members: s.members.filter((m) => m !== "gollum") }))
          .filter((s) => s.members.length > 0),
      );
      setRingDestroyed(true);
      chronicleRef.current("ringGollum");
      setEnding("gollumFall");
      return;
    }
    setLordClaimed(true);
    if (viaBetrayal) {
      setDoomBetrayal(true);
    }
    chronicleRef.current("ringClaimed", { name: tRef.current(`char.${bearerIdRef.current}`) });
    setEnding("lord");
  }, []);

  // Cast the Ring into the fire — but its hold may win out and the bearer puts it
  // on instead. Chance is half the corruption %, so even a badly-corrupted bearer
  // usually obeys: it's a nasty surprise, not the default.
  const destroyRing = useCallback(() => {
    if (Math.random() * 100 < bearerCorruptionRef.current / 2) {
      wearRingAtDoom(true);
    } else {
      setRingDestroyed(true);
      chronicleRef.current("ringDestroyed");
      setEnding("victory");
    }
  }, [wearRingAtDoom]);

  // Search the current location: chance = average party luck × 10% to turn up its
  // hidden item. Once the item is found, further searches always come up empty.
  const exploreLocation = useCallback(() => {
    const loc = visitedLocation;
    if (!loc) {
      return;
    }
    const itemId = G.EXPLORE_ITEM_BY_LOCATION[loc.id];
    // Nothing to search here (no special site, no hidden item) — do nothing, and
    // don't burn a day for it.
    if (
      loc.id !== G.WEATHERTOP_ID &&
      loc.id !== G.ERECH_ID &&
      loc.id !== G.OSGILIATH_ID &&
      loc.id !== G.HELMS_DEEP_ID &&
      !itemId
    ) {
      return;
    }
    // Searching a location costs a day (and runs that day's upkeep: rations,
    // and any ambushes that befall the idle splinters).
    const nextDay = journeyDayRef.current + 1;
    journeyDayRef.current = nextDay;
    setJourneyDay(nextDay);
    // Weathertop: Gandalf's rune, left on the stone on 3 October. It can't be
    // found before that day — and it's pointless if you've already crossed paths
    // with Gandalf (met him anywhere), since his "I went east" mark tells you
    // nothing new. (Reachable only once the Nazgûl here is beaten.)
    if (loc.id === G.WEATHERTOP_ID) {
      const onSite = nextDay - 1; // the day we searched, before the day's cost
      const runeReady = onSite >= G.dateToDayOffset(3, 10, 3018);
      setExploreResult(
        runeReady && !metCharacterIds.has("gandalf")
          ? { found: true, message: "location.weathertopRune" }
          : { found: false },
      );
      return;
    }
    // Erech: only Aragorn, heir of Isildur, can rouse the Dead.
    if (loc.id === G.ERECH_ID) {
      if (party.includes("aragorn") && !deadSummoned) {
        setDeadSummoned(true);
        chronicleRef.current("deadSummoned");
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
    if (loc.id === G.OSGILIATH_ID) {
      const cacheLuck = party.length ? G.partyLuck(party, statBonusById) / party.length : 0;
      if (osgiliathCacheFound || Math.random() >= cacheLuck / 12) {
        setExploreResult({ found: false });
        return;
      }
      const total = Math.min(party.length, G.GONDOR_CACHE_MAX * 2);
      const rawSwords = Math.random() < 0.5 ? Math.ceil(total / 2) : Math.floor(total / 2);
      const swords = Math.min(rawSwords, G.GONDOR_CACHE_MAX);
      const armor = Math.min(total - rawSwords, G.GONDOR_CACHE_MAX);
      const cacheIds = [...G.GONDOR_SWORD_IDS.slice(0, swords), ...G.GONDOR_ARMOR_IDS.slice(0, armor)];
      setFoundItems((prev) => [...prev, ...cacheIds.filter((id) => !prev.includes(id))]);
      setOsgiliathCacheFound(true);
      chronicleRef.current("foundCache", { count: cacheIds.length });
      setExploreResult({ found: true, itemIds: cacheIds });
      return;
    }
    // Helm's Deep: only Éomer knows the Hornburg armoury. With him along he leads
    // the party to it and they kit out (spear/sword +3 str, shield/mail +3 def);
    // without him the search turns up nothing.
    if (loc.id === G.HELMS_DEEP_ID) {
      const already = G.ROHAN_ARMORY_IDS.every((id) => foundItems.includes(id));
      if (party.includes("eomer") && !already) {
        const gained = G.ROHAN_ARMORY_IDS.filter((id) => !foundItems.includes(id));
        setFoundItems((prev) => [...prev, ...gained.filter((id) => !prev.includes(id))]);
        chronicleRef.current("foundArmory", { count: gained.length });
        // Show the kit as a gift list (icons + names + effects), like Galadriel's.
        setTalkResult({ charId: "eomer", itemIds: gained, greeting: null });
      } else {
        setExploreResult({ found: false });
      }
      return;
    }
    const avgLuck = party.length ? G.partyLuck(party, statBonusById) / party.length : 0;
    const found = !foundItems.includes(itemId) && Math.random() < avgLuck / 10;
    if (found) {
      setFoundItems((prev) => [...prev, itemId]);
      chronicleRef.current("found", { item: t(`item.${G.itemFamilyId(itemId)}.name`) });
      setExploreResult({ found: true, itemId });
    } else {
      setExploreResult({ found: false });
    }
  }, [visitedLocation, foundItems, party, statBonusById, deadSummoned, parkedMembers, osgiliathCacheFound, metCharacterIds]);

  // Talk to a companion: hand over their gift items (once, and only if their
  // requirement is met — Bilbo needs Frodo along), else a random greeting.
  const talkToCharacter = useCallback(
    (charId: string) => {
      const gifts = G.GIFTS_BY_CHARACTER[charId] ?? [];
      const newItems = gifts
        .filter(
          (g) =>
            (!g.requires || g.requires.every((r) => party.includes(r))) &&
            !foundItems.includes(g.id),
        )
        .map((g) => g.id);
      const givesCloaks = G.CLOAK_GIVERS.has(charId) && !hasCloaks;
      if (newItems.length > 0 || givesCloaks) {
        if (newItems.length > 0) {
          setFoundItems((prev) => [...prev, ...newItems]);
        }
        if (givesCloaks) {
          setHasCloaks(true);
        }
        const giver = t(`char.${charId}`);
        for (const itemId of newItems) {
          chronicleRef.current("gift", { name: giver, item: t(`item.${G.itemFamilyId(itemId)}.name`) });
        }
        if (givesCloaks) {
          chronicleRef.current("giftCloaks", { name: giver });
        }
        setTalkResult({ charId, itemIds: newItems, greeting: null, cloaks: givesCloaks });
      } else {
        // Tone of the hello depends on who's speaking.
        const tone = G.HOBBIT_IDS.has(charId)
          ? "hobbit"
          : G.LOFTY_TALKERS.has(charId)
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
      const gifts = G.GIFTS_BY_CHARACTER[charId] ?? [];
      const pendingItem = gifts.some(
        (g) =>
          (!g.requires || g.requires.every((r) => party.includes(r))) && !foundItems.includes(g.id),
      );
      const pendingCloaks = G.CLOAK_GIVERS.has(charId) && !hasCloaks;
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
    if (itemId) {
      chronicleRef.current("equip", {
        item: tRef.current(`item.${G.itemFamilyId(itemId)}.name`),
        name: tRef.current(`char.${charId}`),
      });
    }
    // Donning: he likes it or it doesn't sit right (random); taking off: a shrug.
    // Spoken right in the character panel, about half the time.
    panelReactionRef.current(charId, itemId ? (Math.random() < 0.5 ? "itemLike" : "itemDislike") : "itemOff");
  }, []);

  const autoPlayTick = useCallback(() => {
    if (!autoPlay || ending) {
      return;
    }

    if (levelUpCharacterId || levelUpQueue.length > 0) {
      const charId = levelUpCharacterId ?? levelUpQueue[0];
      const total = G.unspentPointsFor(
        charId,
        expById[charId] ?? 0,
        statBonusById[charId] ?? G.ZERO_BONUS,
      );
      if (total > 0) {
        const allocated = G.autoAssignLevelUpPoints(charId, total);
        setStatBonusById((prev) => ({
          ...prev,
          [charId]: G.addBonus(prev[charId] ?? G.ZERO_BONUS, allocated),
        }));
      }
      if (levelUpCharacterId) {
        setLevelUpCharacterId(null);
        setLevelUpDraft(G.ZERO_BONUS);
      } else {
        setLevelUpQueue((queue) => queue.slice(1));
      }
      return;
    }

    if (reclaimedFrom) {
      const candidates = party
        .filter((id) => !G.NON_BEARERS.has(id))
        .map((id) => {
          const character = G.CHARACTERS.find((entry) => entry.id === id);
          if (!character) {
            return null;
          }
          const stats = G.computeCharacterStats(
            character,
            ringDaysById[id] ?? 0,
            bearerId,
            hpById[id],
            G.addBonus(statBonusById[id] ?? G.ZERO_BONUS, G.auraBonus(character, party)),
          );
          return { id, stats };
        })
        .filter((entry): entry is { id: string; stats: ReturnType<typeof G.computeCharacterStats> } => !!entry)
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
    if (talkResult) {
      setTalkResult(null);
      return;
    }
    if (exploreResult) {
      setExploreResult(null);
      return;
    }

    const capacity = G.foodCapacityFor(transport);
    const stopThreshold = G.autoFarmStopThreshold(capacity);

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

    if (!visitedLocation && !isMoving && !target && G.autoPlayShouldFarm(food, capacity)) {
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
      setBattle(G.resolveBattleInstantly(battle));
      return;
    }

    if (encounter) {
      const lockedBoss =
        visitedLocation &&
        (visitedLocation.id === G.MORIA_GATE_ID || visitedLocation.id === G.MINAS_MORGUL_ID)
          ? G.BOSSES_BY_LOCATION[visitedLocation.id]
          : null;
      if (lockedBoss && !defeatedBosses.has(lockedBoss.name)) {
        startBattle();
        return;
      }
      if (G.autoPlayShouldFleeEncounter(encounter, party, statBonusById, hpById)) {
        setEncounter(null);
      } else {
        startBattle();
      }
      return;
    }

    if (visitedLocation?.id === G.ORODRUIN_ID && bearerId && rogueBearerId === null) {
      // Auto-play always tries to destroy it; the Ring's hold may still win out.
      destroyRing();
      return;
    }

    if (visitedLocation) {
      const loc = visitedLocation;
      const lockedBoss =
        loc.id === G.MORIA_GATE_ID || loc.id === G.MINAS_MORGUL_ID
          ? G.BOSSES_BY_LOCATION[loc.id]
          : null;
      if (lockedBoss && !defeatedBosses.has(lockedBoss.name)) {
        const partyHurt = party.some((id) => hpById[id] !== undefined);
        if (partyHurt && food > 0) {
          waitOneDay();
          return;
        }
        const bossPack =
          loc.id === G.MINAS_MORGUL_ID
            ? [lockedBoss, ...Array.from({ length: dolGuldurNazgulSlain ? 5 : 8 }, () => G.NAZGUL_ENEMY)]
            : [lockedBoss];
        setEncounter({
          monster: lockedBoss,
          dangerous: true,
          solo: bossPack.length === 1,
          pack: bossPack,
          wraithsStand: loc.id === G.MINAS_MORGUL_ID,
        });
        return;
      }

      const nextRecruit = G.autoPlayNextStoryRecruit(loc.id, journeyDay, party, banishedTraitors);
      if (nextRecruit) {
        attemptRecruit(nextRecruit);
        return;
      }

      const giftGiver = G.CHARACTERS.find(
        (character) =>
          G.isCharacterRecruitableHere(character.id, loc.id, journeyDay) &&
          (!(character.id in G.RANDOM_PRESENCE) || randomPresence[character.id]) &&
          !banishedTraitors.has(character.id) &&
          hasGifts(character.id),
      );
      if (giftGiver) {
        talkToCharacter(giftGiver.id);
        return;
      }

      if (G.FOOD_SUPPLY_LOCATION_IDS.has(loc.id) && food < Math.max(5, Math.floor(capacity * 0.55))) {
        setFood(capacity);
        foodRef.current = capacity;
        return;
      }

      if (!isMoving && G.autoPlayShouldFarm(food, capacity)) {
        farmFood();
        return;
      }

      if (G.autoPlayShouldWaitAtLocation(loc.id, journeyDay, party)) {
        if (!isMoving && food > 0) {
          waitOneDay();
        }
        return;
      }

      if (loc.id === G.LOTHLORIEN_ID && !hasCloaks) {
        setHasCloaks(true);
        return;
      }

      const offered = G.TRANSPORT_BY_LOCATION[loc.id];
      if (
        offered &&
        transport !== offered &&
        (offered === "horse" || !transport)
      ) {
        setTransport(offered);
        return;
      }

      const leftId = loc.id;
      setVisitedLocation(null);
      setTargetLocation(null);

      const routeIdx = autoRouteIndexRef.current;
      if (routeIdx < G.AUTO_ROUTE.length && G.AUTO_ROUTE[routeIdx] === leftId) {
        autoRouteIndexRef.current = routeIdx + 1;
      }
      const nextId = G.AUTO_ROUTE[autoRouteIndexRef.current];
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

    if (G.autoPlayShouldFarm(food, capacity)) {
      farmFood();
      return;
    }

    const nextId = G.AUTO_ROUTE[autoRouteIndexRef.current];
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
    hpById,
    ringDaysById,
    reclaimedFrom,
    recruitRefusal,
    dismissRecruitRefusal,
    samCatchUpOpen,
    recruitOffer,
    acceptRecruitOffer,
    acceptSamCatchUp,
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
    for (const id of [G.MORIA_GATE_ID, G.MINAS_MORGUL_ID]) {
      const gate = locations.find((location) => location.id === id);
      const boss = gate ? G.BOSSES_BY_LOCATION[id] : null;
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
    // any coastal city (see G.computeLandfallCells).
    const landfallCells = G.computeLandfallCells(locations, getTerrainAtPoint, 10);

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
          (s) => Math.hypot(s.point.x - here.x, s.point.y - here.y) <= G.MEMBER_PICKUP_RANGE,
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
        setHeroPath((path) => G.appendPathPoint(path, activeTarget, trailCapRef.current));
        finishTravel(arrivalLocation);
        return;
      }

      const cos = dx / routeRadius;
      const sin = dy / routeRadius;
      const members = partyRef.current;
      const activeTransport = transportRef.current ? G.TRANSPORTS[transportRef.current] : null;
      // Eomer speeds the march; Bombadil dawdles (1.5× longer); Cirdan lets the
      // party sail; Gollum ignores rough-terrain penalties; items may hasten too.
      const itemSpeedMult = members.reduce((m, id) => {
        const it = equippedItemsRef.current[id] ? G.ITEM_BY_ID[equippedItemsRef.current[id]] : undefined;
        return it?.speed ? m * it.speed : m;
      }, 1);
      const transportSpeed =
        ((activeTransport ? activeTransport.speed : 1) *
          (members.includes("eomer") ? G.EOMER_SPEED_MULTIPLIER : 1) *
          itemSpeedMult) /
        (members.includes("bombadil") ? G.BOMBADIL_SLOW_FACTOR : 1);
      const canSail = activeTransport ? activeTransport.sea : false;
      const currentTerrain = getTerrainAtPoint(current);
      // Gollum ignores rough ground; a ship wipes the water penalty; eagles fly
      // over everything.
      const onWater = currentTerrain.name === "water";
      const terrainCost =
        transportRef.current === "eagle" || members.includes("gollum") || (onWater && canSail)
          ? 1
          : currentTerrain.cost;
      // Círdan the Shipwright doubles the party's pace while at sea (aboard a ship).
      const cirdanSea = onWater && canSail && members.includes("cirdan") ? G.CIRDAN_SEA_SPEED : 1;
      const visibleSpeed =
        (G.SPEED_PX_PER_SECOND * animationSpeed * transportSpeed * cirdanSea) / terrainCost;
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
        // G.MAX_WATER_CROSSING_CELLS fresh ones before reaching land again.
        if (terrain.name === "water" && !canSail) {
          const cell = terrain.cellKey;
          if (
            cell !== null &&
            !waterRunRef.current.has(cell) &&
            waterRunRef.current.size >= G.MAX_WATER_CROSSING_CELLS
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
        for (const deg of G.SLIDE_DEFLECTIONS) {
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

        if (steer.stallMs >= G.AUTO_STALL_MS) {
          // Widen the turn each attempt; once past ±180° flip to the other side.
          steer.turnIndex += 1;
          if (steer.turnIndex > G.AUTO_MAX_TURN_STEPS) {
            steer.turnIndex = 1;
            steer.turnSign = steer.turnSign === 1 ? -1 : 1;
          }
          const goalAngle = Math.atan2(dy, dx);
          const angle =
            goalAngle + steer.turnSign * steer.turnIndex * ((G.AUTO_TURN_DEG * Math.PI) / 180);
          moveDirX = Math.cos(angle);
          moveDirY = Math.sin(angle);
          steer.stallMs = 0;
        }
      }

      let nextPlayer = startPos;
      let remainingTravel = travel;
      for (let substep = 0; substep < G.MOVE_SUBSTEPS; substep += 1) {
        const slice = remainingTravel / (G.MOVE_SUBSTEPS - substep);
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

      // Reached the world's western edge under sail — or borne there on the Eagles:
      // offer to try the Straight Road into the West rather than run off the map.
      const atWesternEdge = nextPlayer.x <= 14 && getTerrainAtPoint(nextPlayer).name === "water";
      if ((onShip || transportRef.current === "eagle") && atWesternEdge) {
        playerRef.current = nextPlayer;
        syncTravelState();
        setValinorByEagle(transportRef.current === "eagle");
        setValinorAttempt(true);
        setTarget(null);
        setTargetLocation(null);
        setIsMoving(false);
        frameRef.current = null;
        return;
      }

      // Reached a harbour off a ship (canMoveTo walls every other coast): don't
      // step ashore yet — hold on the water and ask, since landing loses the ship.
      // Keep the hull on the last water cell (`current`), NOT the land cell, so
      // declining ("stay aboard") never strands the figure ashore. On landing we
      // put ashore exactly at the harbour/tapped point below.
      if (onShip && getTerrainAtPoint(nextPlayer).name !== "water") {
        playerRef.current = current;
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
      const nextJourneyDay = Math.floor(nextJourneyMiles / G.MILES_PER_DAY);

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
        setHeroPath((path) => G.appendPathPoint(path, nextPlayer, trailCapRef.current));
      }

      // Pan the map only once the figure crosses the margin band near an edge,
      // but never while the user is dragging — otherwise both fight over offset.
      const camOffset = offsetRef.current;
      if (camOffset && !dragRef.current.active && !followDisabledRef.current) {
        const nextOffset = G.followOffset(
          nextPlayer,
          camOffset,
          zoomRef.current,
          viewRef.current,
          mapSize,
          G.FOLLOW_MARGIN_RATIO,
        );
        if (nextOffset) {
          offsetRef.current = nextOffset;
          // Follow imperatively too (committed at the next stop).
          writePanTransform(nextOffset);
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
      // Commit the live (imperatively-moved) position so the figure stays where it
      // stopped instead of snapping back to the last stored point when isMoving
      // turns off (e.g. on a manual Stop).
      if (playerRef.current) {
        setPlayer(playerRef.current);
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
  const journeyDate = useMemo(() => G.getJourneyDate(journeyDay, months), [journeyDay, months]);

  const bonusFor = (id: string): StatBonus => statBonusById[id] ?? G.ZERO_BONUS;
  // Flat (always-on) stat bonuses from a carried item.
  const itemBonusFor = (id: string): StatBonus =>
    G.itemStatBonus(equippedItems[id] ? G.ITEM_BY_ID[equippedItems[id]] : undefined);
  // Allocated level-up points, party auras (Bombadil/Elrond/Galadriel), and items.
  const totalBonusFor = (character: Character): StatBonus =>
    G.addBonus(G.addBonus(bonusFor(character.id), G.auraBonus(character, party)), itemBonusFor(character.id));
  const iconFor = (character: { id: string; icon: string }): string =>
    emote && emote.id === character.id ? G.iconVariant(character.icon, emote.kind) : character.icon;
  const partyCharacters = useMemo(
    () => G.CHARACTERS.filter((character) => party.includes(character.id)),
    [party],
  );
  const anyHurt = partyCharacters.some((character) => hpById[character.id] !== undefined);
  const foodCapacity = G.foodCapacityFor(transport);
  // Where food can be restocked, and up to how much: the great towns fill the
  // full carried capacity; any harbour stocks only a foot-traveller's ration.
  const canRestockHere =
    !!visitedLocation &&
    (G.FOOD_SUPPLY_LOCATION_IDS.has(visitedLocation.id) || G.HARBOR_IDS.has(visitedLocation.id));
  const supplyCap =
    visitedLocation && G.FOOD_SUPPLY_LOCATION_IDS.has(visitedLocation.id)
      ? foodCapacity
      : G.FOOD_DAYS_BASE;
  // Saruman at Isengard is an ally only if the bearer is duller than him and no
  // Gandalf is along; otherwise he's a boss. Once fought, he can't be recruited.
  const sarumanBossName = G.BOSSES_BY_LOCATION[G.ISENGARD_ID].name;
  // Saruman has left Isengard one way or another (slain there, or spared).
  const sarumanGone = defeatedBosses.has(sarumanBossName) || sarumanSpared;
  // After he's spared, he roams the NW for two months, then comes to the Shire.
  // He doesn't camp at once: for a grace week Hobbiton stays normal, then the
  // Scouring proper begins (scoured ruin + a fight to the death).
  const sarumanDaysOut = sarumanSpared ? journeyDay - sarumanSparedDay : 0;
  const sarumanRoams = sarumanSpared && sarumanDaysOut < G.SARUMAN_SCOUR_DAYS;
  const sarumanScouring =
    sarumanSpared && sarumanDaysOut >= G.SARUMAN_SCOUR_DAYS + G.SARUMAN_SCOUR_GRACE_DAYS;
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
    const bearer = G.CHARACTERS.find((c) => c.id === bearerId);
    const saruman = G.CHARACTERS.find((c) => c.id === "saruman");
    if (!bearer || !saruman) {
      return false;
    }
    return G.effectiveStats(bearer, totalBonusFor(bearer)).intelligence < saruman.intelligence;
  })();
  // The Corsair captain parleys rather than fights for a company clever enough on
  // the whole — average intelligence above 8. Talk to him then for safe passage.
  const corsairCaptainFriendly =
    party.length > 0 &&
    party.reduce((sum, id) => {
      const c = G.CHARACTERS.find((ch) => ch.id === id);
      return sum + (c ? G.effectiveStats(c, totalBonusFor(c)).intelligence : 0);
    }, 0) /
      party.length >
      8;
  // A fled Gríma with no Isengard left to run to (Saruman already beaten) skulks
  // the wild until someone puts him down.
  const grimaRoaming = grimaFled && !grimaSlain && defeatedBosses.has(sarumanBossName);
  // Isengard has fallen (Saruman slain or spared) — the precondition for Treebeard
  // to settle there, but only if you actually brought him along.
  const isengardFallen = sarumanGone;
  // Denethor is lost to the pyre once his last day passes without his ever having
  // joined (in the party now, waiting in a squad, or recruited earlier — joinDay
  // is stamped on recruitment and kept even if he later leaves).
  const denethorTaken =
    joinDayRef.current.denethor != null ||
    party.includes("denethor") ||
    parkedMembers.includes("denethor");
  const denethorPerished = journeyDay > DENETHOR_FINAL_DAY && !denethorTaken;
  // Entering Minas Tirith after Denethor's end: tell the player, once, that the
  // Steward chose the fire.
  useEffect(() => {
    if (visitedLocation?.id === G.MINAS_TIRITH_ID && denethorPerished && !denethorMourned) {
      setDenethorMourned(true);
      chronicleRef.current("denethorPyre");
      setExploreResult({ found: false, message: "denethor.pyre" });
    }
  }, [visitedLocation, denethorPerished, denethorMourned]);
  const recruitsBase = visitedLocation
    ? G.CHARACTERS.filter(
        (character) =>
          G.isCharacterRecruitableHere(character.id, visitedLocation.id, journeyDay) &&
          (!(character.id in G.RANDOM_PRESENCE) || randomPresence[character.id]) &&
          !banishedTraitors.has(character.id) &&
          // Denethor gives himself to the pyre if never taken from Minas Tirith in
          // time — after his last day he's no longer there to recruit.
          (character.id !== "denethor" || !denethorPerished) &&
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
  // Treebeard, brought here and left to rule fallen Isengard, is found there on
  // every visit — but he won't march on (recruiting only earns his "I stay").
  const recruitsHere =
    visitedLocation?.id === G.ISENGARD_ID &&
    treebeardAtIsengard &&
    !party.includes("treebeard") &&
    !recruitsBase.some((c) => c.id === "treebeard")
      ? [...recruitsBase, G.CHARACTERS.find((c) => c.id === "treebeard")!]
      : recruitsBase;
  // The boss to offer a fight with at the current location (null if none, slain,
  // or Saruman is currently a friend).
  // The Witch-king cast down at Minas Morgul breaks the wraiths: they stop
  // roaming and any unfought riding (e.g. still lurking at Weathertop) disperses.
  const wraithsBroken = defeatedBosses.has(G.BOSSES_BY_LOCATION[G.MINAS_MORGUL_ID].name);
  // The Ringwraiths stop roaming once leaderless (Witch-king thrown down) or once
  // the Ring they hunt is unmade.
  const nazgulGone = wraithsBroken || ringDestroyed;
  // Dol Guldur posts three plain wraiths over its orc garrison — but only until
  // the Nine gather in Mordor: once Minas Morgul has been laid eyes on, the
  // wraiths are gone and the captain holds it with orcs alone.
  const dolGuldurHasWraiths = !visitedLocationIds.has(G.MINAS_MORGUL_ID);
  // Dol Guldur is led by a wraith while the Nine are abroad, else by the orc
  // captain — and is cleared once either has fallen.
  const dolGuldurBoss = dolGuldurHasWraiths ? G.DOL_GULDUR_WRAITH : G.DOL_GULDUR_CAPTAIN;
  const locationBoss = (() => {
    if (!visitedLocation) {
      return null;
    }
    if (visitedLocation.id === G.ORODRUIN_ID) {
      // A fled bearer makes for Mount Doom — wait for him here and reclaim the
      // Ring (this also covers Gollum if he's the one who bolted). Gollum no
      // longer bars the brink otherwise; he springs out only as the bearer dons
      // the Ring (see wearRingAtDoom).
      if (rogueBearerId) {
        const rogue = G.CHARACTERS.find((c) => c.id === rogueBearerId);
        if (rogue) {
          return {
            name: rogue.name,
            icon: rogue.icon,
            tier: 4,
            strength: rogue.strength,
            defense: rogue.defense,
            intelligence: rogue.intelligence,
            luck: rogue.luck,
          };
        }
      }
      return null;
    }
    if (visitedLocation.id === G.DOL_GULDUR_ID) {
      if (defeatedBosses.has(G.DOL_GULDUR_WRAITH.name) || defeatedBosses.has(G.DOL_GULDUR_CAPTAIN.name)) {
        return null;
      }
      return dolGuldurBoss;
    }
    // The Scouring: a spared Saruman holds Hobbiton two months on — fought to the
    // death (with Gríma if still alive). No parley this time.
    if (visitedLocation.id === G.HOBBITON_ID && sarumanScouring) {
      return G.SARUMAN_ENEMY;
    }
    // Isengard: Saruman holds it (unless beaten, parleyed friendly, spared, or
    // fled with the Ring). With him gone, a Gríma who slunk here still skulks the
    // ruins until slain — so the player who chased him here actually finds him.
    if (visitedLocation.id === G.ISENGARD_ID) {
      const saruman = G.BOSSES_BY_LOCATION[G.ISENGARD_ID];
      const sarumanFled =
        !!rogueBearerId && G.CHARACTERS.find((c) => c.id === rogueBearerId)?.icon === saruman.icon;
      const sarumanHere =
        !defeatedBosses.has(saruman.name) && !sarumanFriendly && !sarumanFled && !sarumanSpared;
      if (sarumanHere) {
        return saruman;
      }
      // Spared, he left with Gríma (they roam the NW together) — the ruins are
      // empty and can be searched.
      if (sarumanSpared) {
        return null;
      }
      if (grimaFled && !grimaSlain) {
        return G.GRIMA_ENEMY;
      }
      return null;
    }
    const boss = G.BOSSES_BY_LOCATION[visitedLocation.id];
    if (!boss || defeatedBosses.has(boss.name)) {
      return null;
    }
    // A boss who fled with the Ring no longer holds his seat — he's hunted in the
    // wild instead. Matched by portrait to his companion self.
    if (rogueBearerId) {
      const rogue = G.CHARACTERS.find((c) => c.id === rogueBearerId);
      if (rogue && rogue.icon === boss.icon) {
        return null;
      }
    }
    // A friendly Corsair captain is parleyed with, not fought.
    if (visitedLocation.id === G.CORSAIRS_CITY_ID && corsairCaptainFriendly) {
      return null;
    }
    // Weathertop's riding melts away once their lord is undone.
    if (visitedLocation.id === G.WEATHERTOP_ID && wraithsBroken) {
      return null;
    }
    return boss;
  })();
  // Hobbiton's art shows the scoured ruin (34_hobbiton2) whenever Saruman holds it
  // — while the Scouring is on (he sits there spoiling it) and after (the wreck
  // he leaves behind, tracked by hobbitonScoured).
  const locationArtSrc = visitedLocation ? G.locationImage(visitedLocation.id, G.seasonAt(journeyDay)) : null;
  const scouredArtSrc =
    visitedLocation?.id === G.HOBBITON_ID && (sarumanScouring || hobbitonScoured) && locationArtSrc
      ? locationArtSrc.replace("10_hobbiton.jpg", "34_hobbiton2.jpg")
      : locationArtSrc;
  // The mount/ship offered here (null if none, or a ship while Círdan sails free).
  const locationTransport = (() => {
    if (!visitedLocation) {
      return null;
    }
    const offered = G.TRANSPORT_BY_LOCATION[visitedLocation.id];
    if (!offered) {
      return null;
    }
    if (offered === "eagle" && !eagleOffered) {
      return null; // the eagles aren't here this visit
    }
    // Galdor of the Havens always finds a ship in port; otherwise it's chance.
    if (offered === "ship" && !shipOffered && !party.includes("galdor")) {
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
      const match = icon ? G.CHARACTERS.find((character) => character.icon === icon) : undefined;
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
    const ids = partyRef.current;
    if (ids.length > 0) {
      speakRef.current(ids[Math.floor(Math.random() * ids.length)], next === "eagle" ? "eagles" : "transport");
    }
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
      const pref = G.SHIP_BOARD_OFFSET[harborId];
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
    ? (G.CHARACTERS.find((character) => character.id === openCharacterId) ?? null)
    : null;
  const openStats = openCharacter
    ? G.computeCharacterStats(
        openCharacter,
        ringDaysById[openCharacter.id] ?? 0,
        bearerId,
        hpById[openCharacter.id],
        totalBonusFor(openCharacter),
      )
    : null;
  const openExp = openCharacter ? (expById[openCharacter.id] ?? 0) : 0;
  const openLevel = G.levelForExp(openExp);
  // One roster row (portrait + level + full stats) for the party table panel.
  const toSummaryRow = (character: Character): PartySummaryRow => ({
    id: character.id,
    icon: iconFor(character),
    level: G.levelForExp(expById[character.id] ?? 0).level,
    stats: G.computeCharacterStats(
      character,
      ringDaysById[character.id] ?? 0,
      bearerId,
      hpById[character.id],
      totalBonusFor(character),
    ),
  });
  // Reclaimed the Ring from a fallen rogue — pick its next bearer from the same
  // table panel. Eligible companions only (some can never carry it).
  const bearerChooserOpen =
    !!reclaimedFrom &&
    !ending &&
    !battle &&
    !levelUpCharacterId &&
    levelUpQueue.length === 0;
  // Roster rows, built only while a panel is open (recomputed each render, but
  // the work is trivial and the panels are brief).
  const partySummaryRows: PartySummaryRow[] = partySummaryOpen
    ? partyCharacters.map(toSummaryRow)
    : [];
  const bearerCandidateRows: PartySummaryRow[] = bearerChooserOpen
    ? partyCharacters.filter((character) => !G.NON_BEARERS.has(character.id)).map(toSummaryRow)
    : [];
  // Frodo's creation points are baked into his bonus; don't count them as
  // level-up spending.
  const creationHero = G.CHARACTERS.find((character) => character.id === G.RING_BEARER_ID)!;
  const creationSpent =
    creationBonus.strength + creationBonus.defense + creationBonus.intelligence + creationBonus.luck;
  const levelUpHero = levelUpCharacterId
    ? (G.CHARACTERS.find((character) => character.id === levelUpCharacterId) ?? null)
    : null;
  const levelUpExistingBonus = levelUpCharacterId
    ? (statBonusById[levelUpCharacterId] ?? G.ZERO_BONUS)
    : G.ZERO_BONUS;
  const levelUpTotalPoints = levelUpCharacterId
    ? G.unspentPointsFor(levelUpCharacterId, expById[levelUpCharacterId] ?? 0, levelUpExistingBonus)
    : 0;
  const levelUpDraftSpent = G.bonusPoints(levelUpDraft);
  const levelUpLevel = G.levelForExp(levelUpCharacterId ? (expById[levelUpCharacterId] ?? 0) : 0);
  const ringBearer = G.CHARACTERS.find((character) => character.id === bearerId);
  // The Ring only counts for the squad actually carrying the bearer — a splinter
  // group off on its own can't destroy it at Mount Doom.
  // Once cast into the fire the party no longer carries the Ring: the Doom prompt
  // won't reopen and all Ring-driven events (betrayal, the bearer's fall) cease.
  const hasRing =
    !ringDestroyed && !!bearerId && rogueBearerId === null && party.includes(bearerId);
  // The figure on the map is the bearer (when travelling with the active squad),
  // or — for a splinter / while the Ring is fled — the group's lead, i.e. the
  // first member in party order (for a splinter, whoever was left first). Using
  // party order (not G.CHARACTERS order) keeps the active figure and the parked
  // squad marker, which both key off the lead, showing the same hero.
  const figureCharacter =
    ringBearer && party.includes(ringBearer.id)
      ? ringBearer
      : G.CHARACTERS.find((c) => c.id === party[0]);
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
      addCharacter(G.CHARACTERS.find((character) => character.id === id));
    }
    addCharacter(openCharacter);
    addCharacter(creationHero);
    addCharacter(levelUpHero);
    addCharacter(ringBearer);
    addCharacter(figureCharacter);
    addCharacter(recruitOffer ? G.CHARACTERS.find((character) => character.id === recruitOffer) : null);
    addCharacter(rogueFledNotice ? G.CHARACTERS.find((character) => character.id === rogueFledNotice) : null);
    addCharacter(reclaimedFrom ? G.CHARACTERS.find((character) => character.id === reclaimedFrom) : null);

    const characterIcons = new Set(G.CHARACTERS.map((character) => character.icon));
    for (const combatant of [...(battle?.allies ?? []), ...(battle?.enemies ?? [])]) {
      if (combatant.icon && characterIcons.has(combatant.icon)) {
        currentIcons.add(combatant.icon);
      }
    }

    for (const icon of currentIcons) {
      G.preloadImage(G.iconVariant(icon, "joy"));
      G.preloadImage(G.iconVariant(icon, "refuse"));
      G.preloadImage(G.iconVariant(icon, "pain"));
      G.preloadImage(G.iconVariant(icon, "dark"));
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

  // Once the game is up, idle-preload every small sprite so faces/foes/items
  // never pop in: all ally neutral portraits, all foe icons, and all item icons.
  // Cheap PNGs, fetched off the main thread when the browser is idle.
  useEffect(() => {
    if (!created) {
      return undefined;
    }
    const run = () => {
      for (const character of G.CHARACTERS) {
        G.preloadImage(character.icon);
      }
      for (const monster of G.MONSTERS) {
        G.preloadImage(monster.icon);
      }
      for (const item of G.ITEMS) {
        G.preloadImage(item.icon);
      }
    };
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void) => number })
      .requestIdleCallback;
    if (ric) {
      const id = ric(run);
      const cic = (window as unknown as { cancelIdleCallback?: (id: number) => void })
        .cancelIdleCallback;
      return () => cic?.(id);
    }
    const id = window.setTimeout(run, 500);
    return () => window.clearTimeout(id);
  }, [created]);

  // Lazily fetch the destination's artwork while the party is still marching to
  // it, so the location card opens instantly on arrival instead of waiting.
  useEffect(() => {
    if (!targetLocation) {
      return;
    }
    const src = G.locationImage(targetLocation.id, G.seasonAt(journeyDayRef.current));
    if (src) {
      void G.preloadLocationImage(src);
    }
  }, [targetLocation]);

  const bearerCorruption = ringBearer
    ? G.computeCharacterStats(
        ringBearer,
        ringDaysById[ringBearer.id] ?? 0,
        bearerId,
        hpById[ringBearer.id],
        totalBonusFor(ringBearer),
      ).corruption
    : 0;
  bearerCorruptionRef.current = bearerCorruption;
  // Kept fresh for wearRingAtDoom (a []-deps callback): is Gollum still abroad to
  // spring for the Precious at the brink?
  gollumAliveRef.current = !slainRoamingRecruits.has("gollum");
  bearerIdRef.current = bearerId;
  const hasFallen = bearerCorruption >= 100;

  // --- Companion reactions (speech bubbles over the party figure) ---
  // Hold playback while the map is covered or the party is in motion, so a remark
  // prompted inside a window only surfaces once it's closed and the map is clear.
  // Hold bubbles while ANY darkening modal/overlay is up (or the party is moving),
  // so a portrait never "talks" behind a dimmed screen — a remark only surfaces
  // once everything is closed and the map is clear. `mapInputLocked` already folds
  // in escape/explore/disembark/valinor/talk/tharbad; the rest are listed here.
  const reactionsPaused =
    !!battle ||
    !!encounter ||
    !!ending ||
    !created ||
    isMoving ||
    mapInputLocked ||
    !!visitedLocation ||
    openCharacterId !== null ||
    statsOpen ||
    chronicleOpen ||
    partySummaryOpen ||
    levelUpCharacterId !== null ||
    recruitOffer !== null ||
    recruitRefusal !== null ||
    pendingTransport !== null ||
    pendingExploreRecruit !== null ||
    reclaimedFrom !== null ||
    rogueFledNotice !== null ||
    samCatchUpOpen ||
    eaglesLeft ||
    splitOpen ||
    helpOpen ||
    restartConfirm;
  const { reaction, enqueue: enqueueReaction } = useReactions(reactionsPaused);
  const [panelReaction, setPanelReaction] = useState<{ charId: string; text: string; key: number } | null>(
    null,
  );
  const panelSeqRef = useRef(0);
  const panelReactionTimerRef = useRef<number | null>(null);
  // A translated array of reaction lines for a key, or null if absent/empty.
  const reactionLines = (key: string): string[] | null => {
    const value = t(key, { returnObjects: true, defaultValue: null }) as unknown;
    return Array.isArray(value) && value.length > 0 ? (value as string[]) : null;
  };
  // Pick a line for this speaker+event: a character-specific set wins (Gollum,
  // Treebeard…), else the feminine variant, else the temperament's set.
  const pickReaction = (charId: string, event: ReactionEvent): { text: string; mood: ReactionMood } | null => {
    const temp = G.temperamentOf(charId);
    const lines =
      reactionLines(`reaction.${charId}.${event}`) ??
      (G.FEMALE_IDS.has(charId) ? reactionLines(`reaction.${temp}.${event}_f`) : null) ??
      reactionLines(`reaction.${temp}.${event}`);
    if (!lines) {
      return null;
    }
    return { text: lines[Math.floor(Math.random() * lines.length)], mood: G.reactionMood(charId, event) };
  };
  pickReactionRef.current = pickReaction;
  speakRef.current = (charId, event, opts) => {
    // Only the active company speaks — their portraits are on screen to anchor a
    // bubble; parked/splinter members stay silent.
    if (!partyRef.current.includes(charId)) {
      return;
    }
    // Flavour rate: "always" lines are certain at the "often" setting; everything
    // else uses G.REACTION_CHANCE. The mode multiplier halves it ("rare") or zeroes
    // it ("never").
    const prob = (opts?.always ? 1 : G.REACTION_CHANCE) * reactionMultRef.current;
    if (Math.random() >= prob) {
      return;
    }
    const picked = pickReaction(charId, event);
    if (picked) {
      // A "we need supplies" line is dropped if you restock before it surfaces.
      const valid = event === "food" ? () => foodRef.current <= G.REACTION_FOOD_LOW_DAYS : undefined;
      enqueueReaction(charId, picked.text, picked.mood, valid);
    }
  };
  // Item-panel reaction: about half the time, surfaced at the open hero's portrait
  // inside the character panel; auto-clears after a beat.
  panelReactionRef.current = (charId, event) => {
    if (Math.random() >= 0.5 * reactionMultRef.current) {
      return;
    }
    const picked = pickReaction(charId, event);
    if (!picked) {
      return;
    }
    if (panelReactionTimerRef.current) {
      window.clearTimeout(panelReactionTimerRef.current);
    }
    panelSeqRef.current += 1;
    setPanelReaction({ charId, text: picked.text, key: panelSeqRef.current });
    panelReactionTimerRef.current = window.setTimeout(() => setPanelReaction(null), G.REACTION_SHOW_MS);
  };
  // A living companion mourns the fallen by name, with the right gender form
  // ("бедный/бедная …"). Always spoken (a death is no small thing).
  const speakMourn = (speakerId: string, deadId: string) => {
    if (Math.random() >= reactionMultRef.current) {
      return;
    }
    const temp = G.temperamentOf(speakerId);
    const lines =
      (G.FEMALE_IDS.has(deadId) ? reactionLines(`reaction.${temp}.mourn_f`) : null) ??
      reactionLines(`reaction.${temp}.mourn`);
    if (!lines) {
      return;
    }
    const text = lines[Math.floor(Math.random() * lines.length)].replace("{{name}}", charName(deadId));
    enqueueReaction(speakerId, text, "refuse");
  };

  // Idle chatter: after a spell of standing still on a clear map, a random
  // companion grumbles; re-arms itself, and resets on any movement/day change.
  const [idleTick, setIdleTick] = useState(0);
  useEffect(() => {
    if (reactionsPaused) {
      return undefined;
    }
    const id = window.setTimeout(() => {
      const ids = partyRef.current;
      if (ids.length > 0) {
        speakRef.current(ids[Math.floor(Math.random() * ids.length)], "idle", { always: true });
      }
      setIdleTick((n) => n + 1);
    }, G.REACTION_IDLE_MS);
    return () => window.clearTimeout(id);
  }, [reactionsPaused, journeyDay, player, idleTick]);

  // Grumble once when food first runs low.
  const prevFoodLowRef = useRef(false);
  useEffect(() => {
    const low = food <= G.REACTION_FOOD_LOW_DAYS;
    if (low && !prevFoodLowRef.current) {
      const ids = partyRef.current;
      if (ids.length > 0) {
        speakRef.current(ids[Math.floor(Math.random() * ids.length)], "food", { always: true });
      }
    }
    prevFoodLowRef.current = low;
  }, [food]);

  // The bearer voices the Ring's growing weight crossing 60% and 80%.
  const prevCorruptionRef = useRef(0);
  useEffect(() => {
    const prev = prevCorruptionRef.current;
    if (bearerId) {
      if (prev < G.REACTION_CORRUPTION_1 && bearerCorruption >= G.REACTION_CORRUPTION_1) {
        speakRef.current(bearerId, "bearer60", { always: true });
      } else if (prev < G.REACTION_CORRUPTION_2 && bearerCorruption >= G.REACTION_CORRUPTION_2) {
        speakRef.current(bearerId, "bearer80", { always: true });
      }
    }
    prevCorruptionRef.current = bearerCorruption;
  }, [bearerCorruption, bearerId]);

  // Reactions to settings changes (language, map, terrain layer, speed) — a
  // random companion remarks. Watching the values catches every change without
  // wrapping each handler.
  const speakRandom = (event: ReactionEvent, opts?: { always?: boolean }) => {
    const ids = partyRef.current;
    if (ids.length > 0) {
      speakRef.current(ids[Math.floor(Math.random() * ids.length)], event, opts);
    }
  };
  const prevLangRef = useRef(lang);
  useEffect(() => {
    if (lang !== prevLangRef.current) {
      prevLangRef.current = lang;
      speakRandom("langChange", { always: true });
    }
    // speakRandom reads stable refs; intentionally not a dep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);
  const prevMapRef = useRef(mapIndex);
  useEffect(() => {
    if (mapIndex !== prevMapRef.current) {
      prevMapRef.current = mapIndex;
      speakRandom("mapChange");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapIndex]);
  const prevTerrainRef = useRef(showTerrain);
  useEffect(() => {
    if (showTerrain && !prevTerrainRef.current) {
      speakRandom("terrainOn");
    }
    prevTerrainRef.current = showTerrain;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTerrain]);
  const prevSpeedRef = useRef(animationSpeed);
  useEffect(() => {
    if (animationSpeed !== prevSpeedRef.current) {
      const faster = animationSpeed > prevSpeedRef.current;
      prevSpeedRef.current = animationSpeed;
      speakRandom(faster ? "speedUp" : "speedDown");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animationSpeed]);

  // Surface a deferred post-battle notice (e.g. a beaten traitor leaving) only
  // once the battle screen has been dismissed.
  useEffect(() => {
    if (battle === null && pendingRefusalRef.current) {
      const r = pendingRefusalRef.current;
      pendingRefusalRef.current = null;
      showRecruitRefusal(r.message, r.characterId);
    }
  }, [battle, showRecruitRefusal]);

  // Terrain grumbles: a long mountain slog (3 cells running) wears someone out,
  // and the open sea draws a remark. Sampled each travelled day.
  const mountainStreakRef = useRef(0);
  useEffect(() => {
    const here = playerRef.current;
    // Only react to terrain underfoot while actually travelling the wilds — never
    // while halted at a town (whose cell may sit on a river/coast pixel) or just
    // waiting out days there. Sea remarks only under sail.
    if (!here || visitedLocation) {
      mountainStreakRef.current = 0;
      return;
    }
    const terrain = getTerrainAtPoint(here).name;
    if (terrain === "mountain") {
      mountainStreakRef.current += 1;
      if (mountainStreakRef.current === 3) {
        speakRandom("mountains", { always: true });
      }
    } else {
      mountainStreakRef.current = 0;
    }
    // "Sea" remarks only on the open sea — at least 7 of the 8 surrounding cells
    // are water too, so a shore or a river (more land around) never triggers
    // them. Only under sail.
    if (terrain === "water" && transport === "ship" && G.isOpenSea(here, 10, getTerrainAtPoint)) {
      speakRandom("sea");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journeyDay]);

  // A badly wounded companion (under a third HP, still standing) asks for rest —
  // once, until they recover above the line.
  const hurtSpokenRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const character of partyCharacters) {
      const stats = G.effectiveStats(character, totalBonusFor(character));
      const maxHp = G.maxHpFromStats(stats.strength, stats.defense);
      const hp = G.currentHp(maxHp, hpById[character.id]);
      const low = maxHp > 0 && hp > 0 && hp / maxHp < 0.33;
      if (low && !hurtSpokenRef.current.has(character.id)) {
        hurtSpokenRef.current.add(character.id);
        speakRef.current(character.id, "hurt", { always: true });
      } else if (!low) {
        hurtSpokenRef.current.delete(character.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hpById, partyCharacters]);

  // When companions fall, a survivor mourns them by name — at most two per wave,
  // and never re-mourning the already-dead on load.
  const mournedRef = useRef<Set<string>>(new Set());
  const mournSeededRef = useRef(false);
  useEffect(() => {
    if (!mournSeededRef.current) {
      mournSeededRef.current = true;
      mournedRef.current = new Set(Object.keys(deathCauseById));
      return;
    }
    let mournedThisWave = 0;
    for (const id of Object.keys(deathCauseById)) {
      if (mournedRef.current.has(id)) {
        continue;
      }
      mournedRef.current.add(id);
      if (mournedThisWave >= 2) {
        continue; // cap the wailing at two per wave
      }
      const living = partyRef.current.filter((p) => p !== id && !deathCauseById[p]);
      if (living.length === 0) {
        continue;
      }
      speakMourn(living[Math.floor(Math.random() * living.length)], id);
      mournedThisWave += 1;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deathCauseById]);
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
    chronicleRef.current("bearerBroke", { name: tRef.current(`char.${bearerId}`) });
    triggerRingFlight(bearerId);
  }, [ringDestroyed, hasFallen, rogueBearerId, ending, bearerId, battle, encounter, party, squads, focusSquad, triggerRingFlight]);

  useEffect(() => {
    // Hold while the lost battle is still on screen — the player dismisses its
    // "Поражение" footer first (then the pending-ending effect rolls the end).
    if (!created || ending || party.length > 0 || battle) {
      return;
    }
    // The active squad was wiped out, but if others still wander the map, take
    // command of one rather than ending — only an empty roster is game over.
    // Prefer a squad that can carry the Ring (so a pending reclaim can offer it).
    if (squads.length > 0) {
      const squad = squads.find((s) => s.members.some((id) => !G.NON_BEARERS.has(id))) ?? squads[0];
      focusSquad(squad.id);
      return;
    }
    setEnding((prev) => prev ?? (rogueBearerId || !bearerId ? "nothing" : "battle"));
    setEncounter(null);
    setTarget(null);
    setTargetLocation(null);
    setIsMoving(false);
  }, [created, ending, party.length, squads, rogueBearerId, bearerId, focusSquad, battle]);

  // The bearer fell and the Ring is loose (reclaim pending), but the survivors
  // still here can't carry it — only non-bearers linger. If a splinter squad has
  // an able member, take command of it so the bearer-chooser can offer the Ring
  // there. (When this group is wiped entirely, the empty-party effect above does
  // the same; this covers the case where non-bearer survivors remain.)
  useEffect(() => {
    if (!reclaimedFrom || ending || battle || party.length === 0) {
      return;
    }
    if (party.some((id) => !G.NON_BEARERS.has(id))) {
      return; // someone here can take it — the chooser handles it
    }
    const squad = squads.find((s) => s.members.some((id) => !G.NON_BEARERS.has(id)));
    if (squad) {
      focusSquad(squad.id);
    }
  }, [reclaimedFrom, ending, battle, party, squads, focusSquad]);

  // Re-check compatibility whenever the party changes: someone who can't abide
  // the new company (e.g. Gollum once a non-hobbit joins) walks off. One per
  // pass — the effect re-runs until the party is stable.
  useEffect(() => {
    // At sea the company can't split — an incompatible member only slips away
    // once ashore (the transport dep re-runs this when the voyage ends).
    if (transport === "ship" && getTerrainAtPoint(playerRef.current ?? hobbiton.point).name === "water") {
      return;
    }
    const evictee = party.find((id) => {
      if (id === bearerId) {
        return false;
      }
      const character = G.CHARACTERS.find((c) => c.id === id);
      return character ? G.recruitRefusalKey(id, party.filter((p) => p !== id)) !== null : false;
    });
    if (!evictee) {
      return;
    }
    const key = G.recruitRefusalKey(evictee, party.filter((p) => p !== evictee));
    setParty((prev) => prev.filter((id) => id !== evictee));
    showRecruitRefusal(
      t("refuse.evicted", { name: charName(evictee), line: key ? t(key) : "" }).trim(),
      evictee,
    );
  }, [party, bearerId, showRecruitRefusal, t, charName, transport, getTerrainAtPoint, hobbiton]);

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
      const nextHp = { ...hpRef.current };
      for (const ally of battle.allies) {
        if (ally.hp >= ally.maxHp) {
        delete nextHp[ally.key];
      } else {
        nextHp[ally.key] = ally.hp;
      }
      }
      hpRef.current = nextHp;
      setHpById(nextHp);
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
      if (G.NON_BEARERS.has(battle.betrayalBy)) {
        const nextHp = { ...hpRef.current };
        for (const ally of battle.allies) {
          if (ally.hp >= ally.maxHp) {
        delete nextHp[ally.key];
      } else {
        nextHp[ally.key] = ally.hp;
      }
        }
        hpRef.current = nextHp;
        setHpById(nextHp);
        const traitorId = battle.betrayalBy;
        banishTraitor(traitorId);
        setParty((prev) => prev.filter((id) => id !== traitorId));
        applyBattleCasualties(battle.allies);
        sendSarumanScouring(traitorId);
        chronicleRef.current("betrayal", { name: charName(traitorId) });
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
      const nextHp = { ...hpRef.current };
      for (const ally of battle.allies) {
        if (ally.hp >= ally.maxHp) {
        delete nextHp[ally.key];
      } else {
        nextHp[ally.key] = ally.hp;
      }
      }
      hpRef.current = nextHp;
      setHpById(nextHp);
      applyBattleCasualties(battle.allies);
      banishTraitor(traitorId);
      chronicleRef.current("betrayalFled", { name: charName(traitorId) });
      triggerRingFlight(traitorId);
      setBattle(null);
      return;
    }

    const nextHp = { ...hpRef.current };
    for (const ally of battle.allies) {
      if (ally.hp >= ally.maxHp) {
        delete nextHp[ally.key];
      } else {
        nextHp[ally.key] = ally.hp;
      }
    }
    hpRef.current = nextHp;
    setHpById(nextHp);
    applyBattleCasualties(battle.allies);
    // Chronicle the fight; the narrator merges consecutive road fights itself.
    {
      const fallen = battle.allies.filter((a) => a.hp <= 0).map((a) => a.key);
      const foe = battle.enemies[0]?.name ?? "враг";
      const fallenNames = fallen.map((id) => tRef.current(`char.${id}`)).join(", ");
      if (battle.outcome === "win") {
        chronicleRef.current(fallen.length > 0 ? "battleWonLosses" : "battleWon", {
          foe,
          fallen: fallenNames,
        });
      } else {
        chronicleRef.current("battleLost", { foe });
      }
    }
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
      // Intelligence is learning aptitude: each survivor earns the battle's XP
      // scaled by their own wits above the floor (so a clever hero advances
      // faster from the very same fight).
      // Gandalf the White, marching with the company, quickens everyone's learning
      // from a fight: the whole party earns +25% XP while he's in the battle.
      const whiteBonus = battle.allies.some((a) => a.key === "gandalf_white") ? 1.25 : 1;
      const xpGain = (ally: Combatant) =>
        Math.round(
          battle.exp *
            (1 + G.XP_BONUS_PER_INT * Math.max(0, ally.intelligence - G.XP_INT_FLOOR)) *
            whiteBonus,
        );
      const toLevel: string[] = [];
      for (const ally of battle.allies) {
        if (ally.hp <= 0) {
          continue; // the fallen don't level up
        }
        const oldExp = expById[ally.key] ?? 0;
        const newExp = oldExp + xpGain(ally);
        const bonus = statBonusById[ally.key] ?? G.ZERO_BONUS;
        if (G.unspentPointsFor(ally.key, newExp, bonus) > G.unspentPointsFor(ally.key, oldExp, bonus)) {
          toLevel.push(ally.key);
        }
      }
      setExpById((prev) => {
        const next = { ...prev };
        for (const ally of battle.allies) {
          next[ally.key] = (prev[ally.key] ?? 0) + xpGain(ally);
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

      // One or two survivors remark on how the fight went, judged by how much HP
      // the party lost: a breeze, a hard slog, or a brush with death. Shown right
      // in the battle's win screen at their portraits (not later on the map).
      if (Math.random() < reactionMultRef.current) {
        const totalMax = battle.allies.reduce((sum, a) => sum + a.maxHp, 0);
        const totalHp = battle.allies.reduce((sum, a) => sum + Math.max(0, a.hp), 0);
        const loss = totalMax > 0 ? 1 - totalHp / totalMax : 0;
        const outcomeEvent: ReactionEvent =
          loss < 0.33 ? "battleEasy" : loss <= 0.66 ? "battleHard" : "battleNarrow";
        const survivors = battle.allies
          .filter((a) => a.hp > 0 && partyRef.current.includes(a.key))
          .sort(() => Math.random() - 0.5)
          .slice(0, Math.random() < 0.5 ? 2 : 1);
        const reactions: { key: string; text: string }[] = [];
        const seenText = new Set<string>();
        for (const a of survivors) {
          const picked = pickReaction(a.key, outcomeEvent);
          if (picked && !seenText.has(picked.text)) {
            seenText.add(picked.text); // never the same line from two of them
            reactions.push({ key: a.key, text: picked.text });
          }
        }
        if (reactions.length > 0) {
          setBattle((b) => (b ? { ...b, reactions } : b));
        }
      }

      // Betrayal repelled: the traitor is driven off at half HP, never slain here
      // (Gollum included), so a beaten Gollum lives on to play his part at Doom.
      if (battle.betrayalBy) {
        const traitorId = battle.betrayalBy;
        banishTraitor(traitorId);
        setParty((prev) => prev.filter((id) => id !== traitorId));
        sendSarumanScouring(traitorId);
        // Defer the "slinks off in shame" line until the battle screen closes.
        pendingRefusalRef.current = {
          message:
            traitorId === "gollum"
              ? t("refuse.gollumFled")
              : t("refuse.traitorReturns", { name: charName(traitorId) }),
          characterId: traitorId,
        };
      }
      if (battle.recruitId) {
        setRecruitOffer(battle.recruitId);
      }
      // A defeated boss never returns to its lair.
      const foe = battle.enemies[0];
      const activeBoss = !visitedLocation
        ? null
        : visitedLocation.id === G.DOL_GULDUR_ID
          ? // Whichever Dol Guldur boss led this fight — wraith or orc captain.
            visitedLocationIds.has(G.MINAS_MORGUL_ID)
            ? G.DOL_GULDUR_CAPTAIN
            : G.DOL_GULDUR_WRAITH
          : G.BOSSES_BY_LOCATION[visitedLocation.id];
      if (foe && activeBoss && foe.name === activeBoss.name && G.BOSS_NAMES.has(foe.name)) {
        setDefeatedBosses((prev) => new Set(prev).add(foe.name));
        chronicleRef.current("bossSlain", { foe: foe.name });
        // Clearing Dol Guldur while its wraiths were still posted there means the
        // three were slain — Minas Morgul will muster six of the Nine, not nine.
        if (visitedLocation?.id === G.DOL_GULDUR_ID && !visitedLocationIds.has(G.MINAS_MORGUL_ID)) {
          setDolGuldurNazgulSlain(true);
        }
      }
      // Wormtongue felled (at Isengard alongside Saruman, or cornered in the
      // wild) is gone for good — he won't haunt the roads again.
      if (battle.enemies.some((enemy) => enemy.icon === G.GRIMA_ENEMY.icon)) {
        setGrimaSlain(true);
      }
      // A spared Saruman run down (in the NW, or at the Scouring) is dead at last.
      if (battle.enemies.some((enemy) => enemy.icon === G.SARUMAN_ENEMY.icon)) {
        setSarumanSpared(false);
        setDefeatedBosses((prev) => new Set(prev).add(G.SARUMAN_NAME));
        chronicleRef.current("bossSlain", { foe: G.SARUMAN_NAME });
      }
      // Gollum slain at the Crack of Doom (a fight to the death, not a recruit
      // capture) — he won't lurk there again.
      if (!battle.recruitId && battle.enemies.some((enemy) => enemy.icon === G.GOLLUM_ENEMY.icon)) {
        setSlainRoamingRecruits((prev) => new Set(prev).add("gollum"));
      }
    }
  }, [battle, expById, statBonusById, t, charName, applyBattleCasualties, showRecruitRefusal, visitedLocation, visitedLocationIds, banishTraitor, sendSarumanScouring]);

  // A game-over loss leaves the battle's "Поражение" screen up; once the player
  // dismisses it ("Продолжить"), the ending is finally shown.
  useEffect(() => {
    if (!battle && pendingEndingRef.current) {
      const next = pendingEndingRef.current;
      pendingEndingRef.current = null;
      setEnding((prev) => prev ?? next);
    }
  }, [battle]);

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
    setLevelUpDraft(G.ZERO_BONUS);
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
      visitedLocation?.id === G.EDORAS_ID &&
      party.includes("gandalf") &&
      !grimaFled &&
      !grimaFleePending
    ) {
      setGrimaFleePending(true);
      showRecruitRefusal(t("refuse.grimaFlees"), "grima");
    }
  }, [visitedLocation, party, grimaFled, grimaFleePending, showRecruitRefusal, t]);

  // Reaching Barad-dûr is simply the end — no fight. At Sauron's doorstep the
  // Eye finds the Ring and it leaps to its master; the quest is lost. Once the
  // Ring is unmade (freeplay) there is nothing left to claim — the tower is just
  // an empty ruin, so no ending fires.
  useEffect(() => {
    if (visitedLocation?.id === G.BARAD_DUR_ID && !ringDestroyed) {
      setEnding((prev) => prev ?? "sauron");
    }
  }, [visitedLocation, ringDestroyed]);

  // Bring Treebeard to fallen Isengard and he settles to rule it: he leaves the
  // party and stays for good (found there forever after). Only the brought-along
  // case settles him — an unmet/declined Treebeard keeps roaming Fangorn.
  useEffect(() => {
    if (
      visitedLocation?.id === G.ISENGARD_ID &&
      isengardFallen &&
      !treebeardAtIsengard &&
      party.includes("treebeard")
    ) {
      setTreebeardAtIsengard(true);
      dismissMember("treebeard");
      showRecruitRefusal(t("refuse.treebeardStays"), "treebeard");
    }
  }, [visitedLocation, isengardFallen, party, treebeardAtIsengard, showRecruitRefusal, dismissMember, t]);

  // Arriving at the ruins of Tharbad: Gandalf, then Boromir (whoever is along)
  // each say their piece. With neither present the place is just empty.
  useEffect(() => {
    if (visitedLocation?.id !== G.THARBAD_ID) {
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
  // when out of food. HP is tracked per current party member.
  useEffect(() => {
    if (journeyDay <= processedDayRef.current) {
      processedDayRef.current = journeyDay;
      return;
    }
    let nextFood = foodRef.current;
    const nextHp = { ...hpRef.current };
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
      ? Math.round(G.HEAL_PER_DAY * G.GANDALF_HEAL_MULTIPLIER)
      : G.HEAL_PER_DAY;
    // Per-day encounter chance for any group: cloaks + Aragorn + stealth gear,
    // and the group's overall cleverness (average intelligence) — a sharper band
    // travels more warily. Used for the active party and each idle squad alike.
    const chanceFor = (ids: string[]) => {
      let chance = hasCloaks
        ? G.ENCOUNTER_CHANCE_PER_DAY * G.CLOAKS_ENCOUNTER_MULTIPLIER
        : G.ENCOUNTER_CHANCE_PER_DAY;
      if (ids.includes("aragorn")) {
        chance *= G.ARAGORN_ENCOUNTER_MULTIPLIER;
      }
      chance *= ids.reduce((m, id) => {
        const it = equippedItems[id] ? G.ITEM_BY_ID[equippedItems[id]] : undefined;
        return it?.stealth ? m * it.stealth : m;
      }, 1);
      if (ids.length > 0) {
        const avgInt =
          ids.reduce((sum, id) => {
            const c = G.CHARACTERS.find((ch) => ch.id === id);
            return (
              sum +
              (c
                ? G.effectiveStats(c, G.addBonus(statBonusById[id] ?? G.ZERO_BONUS, G.auraBonus(c, ids)))
                    .intelligence
                : 0)
            );
          }, 0) / ids.length;
        chance *= Math.max(
          G.PARTY_INT_STEALTH_FLOOR,
          1 - Math.max(0, avgInt - G.PARTY_INT_STEALTH_BASELINE) * G.PARTY_INT_STEALTH_PER_POINT,
        );
        // Fewer feet draw fewer eyes; a big host is far easier to spot (and
        // largely cancels its own cloaks). Mild for small bands, steep for crowds.
        chance *= G.clamp(
          1 + (ids.length - G.PARTY_STEALTH_NEUTRAL_SIZE) * G.PARTY_STEALTH_PER_MEMBER,
          G.PARTY_STEALTH_FLOOR,
          G.PARTY_STEALTH_CEIL,
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
    // At sea (under sail on open water) the company is stuck together — no one
    // wanders off mid-voyage.
    const atSea = onWater && transport === "ship";
    // Live max HP for a survivor, from their group's auras (matching how the rest
    // of upkeep reads stats). Items are intentionally left out here, as before.
    const maxHpOf = (id: string): number => {
      const character = G.CHARACTERS.find((c) => c.id === id);
      if (!character) {
        return 0;
      }
      const es = G.effectiveStats(
        character,
        G.addBonus(statBonusById[id] ?? G.ZERO_BONUS, G.auraBonus(character, groupOf(id))),
      );
      return G.maxHpFromStats(es.strength, es.defense);
    };
    for (let day = processedDayRef.current; day < journeyDay; day += 1) {
      // A tracked entry means below full; a missing one means full health.
      const anyHurt = survivors.some((id) => nextHp[id] !== undefined);
      // Wounded + spare food: auto-spend a 2nd ration to heal each.
      if (anyHurt && nextFood >= 2) {
        nextFood -= 2;
        for (const id of survivors) {
          if (nextHp[id] === undefined) {
            continue; // already at full health
          }
          const max = maxHpOf(id);
          const healed = Math.min(max, (nextHp[id] ?? max) + heal);
          // Back to full → drop the entry so it reads as full everywhere.
          if (healed >= max) {
            delete nextHp[id];
          } else {
            nextHp[id] = healed;
          }
        }
      } else if (nextFood >= 1) {
        nextFood -= 1;
      } else {
        for (const id of survivors) {
          if (id === "king_dead") {
            continue;
          }
          const character = G.CHARACTERS.find((c) => c.id === id);
          if (character) {
            const maxHp = maxHpOf(id);
            const prev = nextHp[id] ?? maxHp;
            const now = prev - Math.round(maxHp * G.HUNGER_DAMAGE_FRACTION);
            nextHp[id] = now;
            if (now <= 0 && prev > 0) {
              hungerDead.push(id);
            }
          } else {
            nextHp[id] = (nextHp[id] ?? 0) - 1;
          }
        }
      }
      // Sam runs after Frodo once the party has actually set out — not while it
      // waits at home (near Hobbiton). Distance, not day count, so waiting around
      // never triggers (or blocks) him.
      const here = playerRef.current;
      const leftHome =
        !!here && Math.hypot(here.x - hobbiton.point.x, here.y - hobbiton.point.y) > 40;
      if (
        !samCaughtUp &&
        leftHome &&
        members.includes("frodo") &&
        !members.includes("sam") &&
        !parkedMembers.includes("sam") &&
        !deathCauseById.sam
      ) {
        samCatchesUp = true;
      }
      if (ringless) {
        // No Ring to covet and no wild foes to bother with — just hunt the rogue.
        // The Ring hides him for weeks; only after G.ROGUE_MIN_CHASE_DAYS does a
        // daily roll have any chance to corner him.
        const daysSinceFled = rogueSinceDay !== null ? day - rogueSinceDay : 0;
        if (
          daysSinceFled >= G.ROGUE_MIN_CHASE_DAYS &&
          !onEagles &&
          !visitedLocation &&
          Math.random() < G.ROGUE_ENCOUNTER_CHANCE
        ) {
          rogueEncounter = true;
        }
      } else {
        // A betrayal brews in whatever squad holds the Ring — even if you've
        // wandered off with another group.
        const traitors = bearerGroup.filter(
          (id) =>
            id !== bearerId &&
            G.TRAITORS.has(id) &&
            day + 1 - (joinDayRef.current[id] ?? day + 1) >= G.BETRAYAL_GRACE_DAYS,
        );
        // No one turns traitor over a Ring that's already in the fire.
        if (
          !ringDestroyed &&
          !onEagles &&
          !pendingTraitor &&
          traitors.length > 0 &&
          Math.random() < G.BETRAYAL_CHANCE
        ) {
          pendingTraitor = traitors[Math.floor(Math.random() * traitors.length)];
        }
        if (!visitedLocation && Math.random() < encounterChance) {
          wildEncounter = true;
        }
        // Corsair raids only out at sea (under sail — not while fording a river),
        // sharply likelier the further south, all but absent at Grey Havens' latitude.
        if (!visitedLocation && atSea && !corsairPeace) {
          const south = G.clamp((playerRef.current?.y ?? 0) / mapSize.height, 0, 1);
          if (Math.random() < G.CORSAIR_SEA_MAX * Math.pow(south, G.CORSAIR_SEA_POWER)) {
            corsairEncounter = true;
          }
        }
      }
      if (!atSea && members.includes("bombadil") && Math.random() < G.BOMBADIL_LEAVE_CHANCE) {
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
    hpRef.current = nextHp;
    setFood(nextFood);
    setHpById(nextHp);
    if (hungerDead.length > 0) {
      const starvedRoaming = G.slainRoamingRecruitIds(hungerDead);
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
      for (const id of hungerDead) {
        chronicleRef.current("deathHunger", { name: tRef.current(`char.${id}`) });
      }
      // Everyone who starved leaves the company (active party or a parked squad).
      setParty((prev) => prev.filter((id) => !hungerDead.includes(id)));
      setSquads((prev) =>
        prev
          .map((s) => ({ ...s, members: s.members.filter((id) => !hungerDead.includes(id)) }))
          .filter((s) => s.members.length > 0),
      );

      const remaining = survivors.filter((id) => !hungerDead.includes(id));
      const ableBearer = remaining.some((id) => !G.NON_BEARERS.has(id));
      if (hungerDead.includes(bearerId)) {
        if (ableBearer) {
          // The bearer starved, but an able companion can take up the Ring — pass
          // it on (the chooser, or a squad via the loose-Ring effect) instead of
          // ending the quest.
          setBearerId("");
          setReclaimedFrom(bearerId);
        } else if (remaining.length > 0) {
          // Only non-bearers left — one takes the Ring to their own doom.
          setEnding((prev) => prev ?? G.nonBearerEnding(remaining));
        } else {
          setEnding((prev) => prev ?? "starved");
        }
      } else if (remaining.length === 0) {
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
    // the sea. If their time is up while you're above open water, they carry on
    // and their leave is put off (the clock re-rolls), so they only set you down
    // once you're over walkable land.
    if (transport === "eagle" && eagleSince !== null && journeyDay - eagleSince >= G.EAGLE_STAY_DAYS) {
      if (onWater) {
        setEagleSince(journeyDay);
      } else {
        setTransport(null);
        setEagleSince(null);
        setEaglesLeft(true);
      }
    }
    if (ringless) {
      const daysSinceFled = rogueSinceDay !== null ? journeyDay - rogueSinceDay : 0;
      // Raced the thief to the Mountain and lay in wait: he must come here to
      // claim the Fire, so once he's had time to draw near you fall on the
      // invisible bearer — a fight to reclaim the Ring, not a loss to him.
      if (
        rogueBearerId &&
        rogueSinceDay !== null &&
        visitedLocation?.id === G.ORODRUIN_ID &&
        daysSinceFled >= G.ROGUE_MIN_CHASE_DAYS
      ) {
        setVisitedLocation(null);
        setCurrentLocation(null);
        startRogueBattle(rogueBearerId);
      } else if (rogueSinceDay !== null && daysSinceFled >= G.ROGUE_CHASE_DAYS) {
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
      if (sarumanRoams && G.regionAt(position) === "NW" && Math.random() < G.SARUMAN_ENCOUNTER_CHANCE) {
        const pack = [G.SARUMAN_ENEMY, ...(grimaSlain ? [] : [G.GRIMA_ENEMY])];
        setEncounter({ monster: G.SARUMAN_ENEMY, dangerous: true, solo: pack.length === 1, pack });
        return;
      }
      // Gandalf the White: a month after the Grey fell in battle he may be met
      // anew upon the road — rarely, and anywhere. No fight: on meeting he at
      // once offers to walk with the company again (peaceful join, full health).
      const gandalfWhiteAvailable =
        deathCauseById.gandalf === "battle" &&
        gandalfFellDay !== null &&
        journeyDay - gandalfFellDay >= G.GANDALF_WHITE_DELAY_DAYS &&
        !party.includes("gandalf_white") &&
        !parkedMembers.includes("gandalf_white") &&
        !deathCauseById.gandalf_white;
      if (gandalfWhiteAvailable && Math.random() < G.GANDALF_WHITE_ENCOUNTER_CHANCE) {
        setPeacefulOffer(true);
        setRecruitOffer("gandalf_white");
        return;
      }
      const rolled = G.rollEncounter(
        position,
        party,
        parkedMembers.map((id) => ({ id })),
        slainRoamingRecruits,
        grimaRoaming,
        nazgulGone,
        // Gone from Fangorn only once he's settled at Isengard (you brought him).
        // Dealing with Saruman alone — or meeting and declining him — leaves him
        // roaming, so he can still be found and recruited.
        treebeardAtIsengard,
      );
      const kinPresent = party.includes("theoden") || party.includes("eowyn");
      if (rolled.monster.recruitId === "treebeard") {
        if (party.includes("saruman")) {
          // The company harbours Saruman — Treebeard falls on it (no joining).
          const hostile = { ...rolled, monster: { ...rolled.monster, recruitId: undefined } };
          const enc = G.createEncounter(hostile, party.length, position);
          setEncounter({ ...enc, dangerous: assessDanger(enc.monster, enc.pack) });
        } else {
          // Met in peace among the trees, he offers to come along.
          setPeacefulOffer(true);
          setRecruitOffer("treebeard");
        }
      } else if (rolled.monster.recruitId === "eomer" && kinPresent) {
        // With his kin along, Éomer meets the party peacefully and offers to join.
        setPeacefulOffer(true);
        setRecruitOffer("eomer");
      } else if (deadSummoned && rolled.monster.name === G.WIGHT_NAME) {
        // The Dead are roused — barrow-wights no longer dare assail the party.
      } else if (party.includes("saruman") && G.ORC_FOES.has(rolled.monster.name)) {
        // Saruman walks with the company — the orc-kin dare not attack.
      } else {
        const enc = G.createEncounter(rolled, party.length, position);
        const pack = deadSummoned ? enc.pack.filter((mm) => mm.name !== G.WIGHT_NAME) : enc.pack;
        setEncounter({ ...enc, pack, dangerous: assessDanger(enc.monster, pack) });
      }
    } else if (corsairEncounter && onWater) {
      // A corsair crew falls on the ship — they only ever sail with rats and
      // Haradrim alongside, and none of them are much of a threat.
      const corsairCount = G.clamp(1 + Math.floor(Math.random() * party.length), 1, 4);
      const pack: Monster[] = Array.from({ length: corsairCount }, () => G.CORSAIR_ENEMY);
      const rat = G.MONSTERS.find((mm) => mm.icon === "/enemies/rat.png");
      const haradrim = G.MONSTERS.find((mm) => mm.icon === "/enemies/kharadrim.png");
      if (rat && Math.random() < 0.5) {
        pack.push(rat);
      }
      if (haradrim && Math.random() < 0.4) {
        pack.push(haradrim);
      }
      setEncounter({
        monster: G.CORSAIR_ENEMY,
        dangerous: assessDanger(G.CORSAIR_ENEMY, pack),
        solo: pack.length === 1,
        pack,
      });
    }
  }, [journeyDay, party, squads, parkedMembers, slainRoamingRecruits, hasCloaks, hobbiton, bearerId, statBonusById, equippedItems, deadSummoned, samCaughtUp, deathCauseById, t, getTerrainAtPoint, visitedLocation, showRecruitRefusal, transport, eagleSince, rogueBearerId, rogueSinceDay, startRogueBattle, grimaRoaming, grimaSlain, nazgulGone, ringDestroyed, treebeardAtIsengard, sarumanRoams, corsairPeace, mapSize, assessDanger, gandalfFellDay]);

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
    const rolled = G.rollEncounter(
      squad.point,
      squad.members,
      others.map((id) => ({ id })),
      slainRoamingRecruits,
      grimaRoaming,
      nazgulGone,
      // Treebeard only seeks the main company, never a splinter group.
      true,
    );
    if (deadSummoned && rolled.monster.name === G.WIGHT_NAME) {
      return; // the roused Dead deter barrow-wights — no fight
    }
    const enc = G.createEncounter(rolled, squad.members.length, squad.point);
    const pack = deadSummoned ? enc.pack.filter((mm) => mm.name !== G.WIGHT_NAME) : enc.pack;
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
    <section className="fixed inset-0 bg-parchment p-1 sm:p-[18px]">
      <div
        ref={viewportRef}
        role="application"
        aria-label="Interactive Middle-earth map"
        className="relative h-full w-full cursor-grab touch-none overflow-hidden bg-neutral-900 shadow-[0_0_0_5px_#111111,0_0_0_10px_rgb(var(--parchment)),0_0_0_12px_#111111] active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <MapLayers
          mapImgRef={mapImgRef}
          terrainImgRef={terrainImgRef}
          overlayRef={overlayRef}
          figureRef={figureRef}
          panOffset={panOffset}
          zoom={zoom}
          mapSize={mapSize}
          mapIndex={mapIndex}
          showTerrain={showTerrain}
          terrainReady={terrainReady}
          mapLoading={mapLoading}
          locationMarkers={locationMarkers}
          squads={squads}
          mapToLayer={mapToLayer}
          charName={charName}
          canSwitchSquads={canSwitchSquads}
          onFocusSquad={focusSquad}
          targetLayer={targetLayer}
          showHeroPath={showHeroPath}
          heroPathLayer={heroPathLayer}
          figureCharacter={figureCharacter}
          playerLayer={playerLayer}
          isMoving={isMoving}
          target={target}
          currentLocation={currentLocation}
          onOpenLocation={openVisitedLocation}
          onOpenParty={() => setPartySummaryOpen(true)}
        />

        <MapSettingsMenu
          open={settingsOpen}
          onToggle={() => setSettingsOpen((prev) => !prev)}
          {...settingsMenuProps}
          speed={animationSpeed}
          onCycleSpeed={cycleSpeed}
          lang={lang}
          onToggleLang={toggleLang}
          onStats={() => {
            setStatsOpen(true);
            setSettingsOpen(false);
          }}
          onChronicle={() => {
            setChronicleOpen(true);
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
          onExit={isDesktop ? exitApp : undefined}
        />

        {/* HUD overlay: date + controls + party float above the map, top-left */}
        <MapHud
          journeyDate={journeyDate}
          food={food}
          foodChange={foodChange}
          transport={transport}
          hasCloaks={hasCloaks}
          anyHurt={anyHurt}
          zoom={zoom}
          baseZoom={baseZoomRef.current || 1}
          target={target}
          isMoving={isMoving}
          partyLength={party.length}
          canSwitchSquads={canSwitchSquads}
          onStop={() => {
            // Cancel the march: drop the current destination and halt where the
            // figure stands.
            setTarget(null);
            setTargetLocation(null);
            setStopped(false);
          }}
          onFarm={farmFood}
          onSplit={() => setSplitOpen(true)}
          onSwitchSquad={switchSquad}
          onCenter={centerOnPlayer}
          onCycleZoom={cycleZoom}
          partyCharacters={partyCharacters}
          totalBonusFor={totalBonusFor}
          hpById={hpById}
          bearerId={bearerId}
          ringDestroyed={ringDestroyed}
          reaction={reaction}
          charName={charName}
          iconFor={iconFor}
          onOpenCharacter={(id) => openCharacterPanel(id, true)}
        />

        <LocationModal
          location={
            // At Orodruin the destroy/claim modal takes over once you hold the
            // Ring, so the location card is suppressed there.
            visitedLocation &&
            !ending &&
            !(visitedLocation.id === G.ORODRUIN_ID && hasRing)
              ? visitedLocation
              : null
          }
          locationName={visitedLocation ? locName(visitedLocation) : ""}
          journeyDate={journeyDate}
          imageSrc={scouredArtSrc}
          imageInitiallyLoaded={
            scouredArtSrc ? G.preloadedLocationImages.has(scouredArtSrc) : false
          }
          boss={locationBoss}
          sidekick={
            // Gríma stands at Saruman's side — at Isengard, and at the Scouring —
            // while still alive. (When Gríma is the Isengard boss himself, no
            // sidekick.)
            !grimaSlain &&
            ((visitedLocation?.id === G.ISENGARD_ID &&
              grimaFled &&
              locationBoss?.name === G.BOSSES_BY_LOCATION[G.ISENGARD_ID].name) ||
              (visitedLocation?.id === G.HOBBITON_ID && sarumanScouring))
              ? G.GRIMA_ENEMY
              : null
          }
          parley={
            visitedLocation?.id === G.CORSAIRS_CITY_ID && corsairCaptainFriendly
              ? G.BOSSES_BY_LOCATION[G.CORSAIRS_CITY_ID]
              : null
          }
          onParley={() => {
            setCorsairPeace(true);
            chronicleRef.current("corsairPeace");
            setExploreResult({ found: true, message: "location.corsairPeace" });
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
            (!!G.EXPLORE_ITEM_BY_LOCATION[visitedLocation.id] ||
              visitedLocation.id === G.ERECH_ID ||
              visitedLocation.id === G.WEATHERTOP_ID ||
              visitedLocation.id === G.OSGILIATH_ID ||
              visitedLocation.id === G.HELMS_DEEP_ID)
          }
          exploreLocked={
            !!locationBoss ||
            (visitedLocation?.id === G.ISENGARD_ID &&
              !sarumanGone &&
              !party.includes("saruman")) ||
            (visitedLocation?.id === G.WEATHERTOP_ID &&
              !defeatedBosses.has(G.BOSSES_BY_LOCATION[G.WEATHERTOP_ID].name) &&
              !wraithsBroken)
          }
          onExplore={exploreLocation}
          onFightBoss={() => {
            // At Orodruin a fled bearer is run down with the dedicated rogue
            // battle (reclaims the Ring on victory), not a normal boss fight.
            if (visitedLocation?.id === G.ORODRUIN_ID && rogueBearerId) {
              startRogueBattle(rogueBearerId);
              return;
            }
            if (locationBoss) {
              const bossPack =
                visitedLocation?.id === G.MINAS_MORGUL_ID
                  ? // Three of the Nine fall at Dol Guldur — leaving six here, not nine.
                    [
                      locationBoss,
                      ...Array.from({ length: dolGuldurNazgulSlain ? 5 : 8 }, () => G.NAZGUL_ENEMY),
                    ]
                  : visitedLocation?.id === G.DOL_GULDUR_ID
                    ? dolGuldurHasWraiths
                      ? // The lead wraith plus two more — three Nazgûl over the garrison.
                        [locationBoss, G.NAZGUL_ENEMY, G.NAZGUL_ENEMY, ...G.DOL_GULDUR_GARRISON]
                      : [locationBoss, ...G.DOL_GULDUR_GARRISON]
                    : visitedLocation?.id === G.WEATHERTOP_ID
                      ? [locationBoss, G.WEATHERTOP_WITCHKING, ...Array.from({ length: 3 }, () => locationBoss)]
                      : visitedLocation?.id === G.HOBBITON_ID && sarumanScouring
                        ? // The Scouring: Saruman with Gríma at his side, if alive.
                          [locationBoss, ...(grimaSlain ? [] : [G.GRIMA_ENEMY])]
                        : visitedLocation?.id === G.ISENGARD_ID &&
                            grimaFled &&
                            locationBoss.name !== G.GRIMA_ENEMY.name
                          ? // Saruman fights with Gríma at his side; once Saruman is
                            // gone, Gríma (now the boss himself) skulks here alone.
                            [locationBoss, G.GRIMA_ENEMY]
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
                  visitedLocation?.id === G.MINAS_MORGUL_ID ||
                  (visitedLocation?.id === G.DOL_GULDUR_ID && dolGuldurHasWraiths),
                // Saruman at Isengard, with a mercy advocate (Gandalf/Treebeard)
                // along: the fight pauses at half to offer sparing him.
                sarumanParley:
                  visitedLocation?.id === G.ISENGARD_ID &&
                  locationBoss.name === G.SARUMAN_NAME &&
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
            const gained = next - foodRef.current;
            setFood(next);
            foodRef.current = next;
            if (gained > 0) {
              chronicleRef.current("supplies", { days: gained });
            }
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
            visitedLocation?.id === G.ORODRUIN_ID && !hasRing && !locationBoss
              ? t("orodruin.noRing")
              : null
          }
          onLeave={() => {
            if (recruitRefusal) {
              dismissRecruitRefusal();
              return;
            }
            // Leaving Hobbiton while Saruman holds it (still alive) — now he ruins
            // the Shire: it shows scoured on any return.
            if (visitedLocation?.id === G.HOBBITON_ID && sarumanScouring && sarumanSpared) {
              setHobbitonScoured(true);
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
          z={statsOpen ? "z-[70]" : undefined}
          reaction={
            panelReaction && openCharacter && panelReaction.charId === openCharacter.id
              ? panelReaction.text
              : null
          }
          ringDestroyed={ringDestroyed}
          paging={openCharacterPaging}
          level={openLevel}
          deadInBattle={openCharacter ? deathCauseById[openCharacter.id] === "battle" : false}
          isInParty={!!openCharacter && party.includes(openCharacter.id)}
          canMakeBearer={
            !!openCharacter &&
            !!openStats &&
            !ringDestroyed &&
            !openStats.isBearer &&
            !openStats.dead &&
            rogueBearerId === null &&
            party.includes(openCharacter.id) &&
            !G.NON_BEARERS.has(openCharacter.id)
          }
          isLeftBehind={!!openCharacter && parkedMembers.includes(openCharacter.id)}
          equippedItem={
            openCharacter && equippedItems[openCharacter.id]
              ? (G.ITEM_BY_ID[equippedItems[openCharacter.id]] ?? null)
              : null
          }
          itemOptions={
            openCharacter
              ? G.ITEMS.filter(
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
          open={visitedLocation?.id === G.ORODRUIN_ID && hasRing && !ending}
          onDestroy={destroyRing}
          onClaim={() => wearRingAtDoom(false)}
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
          onSkip={() => setBattle((b) => (b ? G.resolveBattleInstantly(b) : b))}
          onContinue={() => setBattle(null)}
          onSelectAlly={selectGuardAlly}
          onSelectEnemy={selectFocusEnemy}
          parleyBubble={
            battle?.pendingParley && parleyStep < livingParleySpeakers.length
              ? {
                  key: livingParleySpeakers[parleyStep],
                  text: t(`sarumanParley.${livingParleySpeakers[parleyStep]}`),
                }
              : null
          }
        />

        {/* Saruman beaten to half with a mercy advocate along: living companions
            plead/object one at a time as battle bubbles, then the spare/fight choice. */}
        <Modal
          open={!!battle?.pendingParley && parleyStep >= livingParleySpeakers.length}
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
                setHeroPath((path) => G.appendPathPoint(path, landing.point, trailCapRef.current));
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
          <TransportIcon
            transport={valinorByEagle ? "eagle" : "ship"}
            className="mx-auto size-12 object-contain"
          />
          <p className="mt-3 text-sm text-sky-100">
            {t(valinorByEagle ? "ending.valinorAskEagle" : "ending.valinorAsk")}
          </p>
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setValinorAttempt(false);
                // The Eagles of Manwë will not bear the Ring into the West — while
                // it endures they wheel back to the map. Only once it's unmade do
                // they carry the company over the Sea.
                if (valinorByEagle) {
                  if (ringDestroyed) {
                    setEnding("valinorWest");
                    return;
                  }
                  const back = { x: 60, y: playerRef.current?.y ?? hobbiton.point.y };
                  playerRef.current = back;
                  setPlayer(back);
                  setExploreResult({ found: true, message: "ending.valinorEagleRefuse" });
                  return;
                }
                if (hasRing) {
                  setEnding("valinorRing");
                  return;
                }
                if (ringDestroyed) {
                  setEnding("valinorWest");
                  return;
                }
                const avgLuck = party.length ? G.partyLuck(party, statBonusById) / party.length : 0;
                if (avgLuck < 8) {
                  setEnding("valinorSink");
                } else {
                  // The Straight Road stays shut, but the seas spare them — they
                  // come about and the ship slips back onto the map from the edge.
                  const back = { x: 60, y: playerRef.current?.y ?? hobbiton.point.y };
                  playerRef.current = back;
                  setPlayer(back);
                  setExploreResult({ found: true, message: "ending.valinorReturn" });
                }
              }}
              className="flex flex-1 items-center justify-center gap-1.5 rounded border border-sky-700 bg-sky-900/40 px-4 py-2 text-sm font-semibold text-sky-200 transition hover:bg-sky-900/70"
            >
              <TransportIcon
                transport={valinorByEagle ? "eagle" : "ship"}
                className="size-5 shrink-0 object-contain"
              />
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
              ? (G.CHARACTERS.find((c) => c.id === recruitOffer) ?? null)
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
        {recruitBubble && (
          <PortalBubble
            key={recruitBubble.key}
            getEl={() =>
              // Prefer the portrait inside the open location card (a just-recruited
              // speaker like Celeborn/Haldir also has one in the party strip behind
              // the overlay; that ambiguity pinned the bubble to the wrong place).
              document.querySelector<HTMLElement>(
                `[data-recruit-portraits] [data-character-portrait="${recruitBubble.speakerId}"]`,
              ) ??
              document.querySelector<HTMLElement>(
                `[data-character-portrait="${recruitBubble.speakerId}"]`,
              )
            }
            text={recruitBubble.text}
            tail="down"
            maxWClass="max-w-[16rem]"
          />
        )}


        <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
        <StatsModal
          open={statsOpen}
          onClose={() => setStatsOpen(false)}
          stats={gameStats}
          foundCharacterIds={foundCharacterIds}
          defeatedEnemyIcons={defeatedEnemyIcons}
          onCharacterClick={(id) => openCharacterPanel(id, false)}
        />
        <ChronicleModal
          open={chronicleOpen}
          onClose={() => setChronicleOpen(false)}
          entries={chronicle}
          months={months}
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

        <RestartConfirmModal
          open={restartConfirm}
          onCancel={() => setRestartConfirm(false)}
          onConfirm={restartGame}
        />

        <TransportConfirmModal
          from={transport}
          to={pendingTransport}
          onConfirm={() => pendingTransport && applyTransport(pendingTransport)}
          onCancel={() => setPendingTransport(null)}
        />

        <EaglesLeftModal open={eaglesLeft} onClose={() => setEaglesLeft(false)} />

        <SpeechModal
          open={tharbadSpeech !== null}
          icon={tharbadSpeech ? (G.CHARACTERS.find((c) => c.id === tharbadSpeech)?.icon ?? "") : ""}
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
          sam={G.CHARACTERS.find((character) => character.id === "sam") ?? null}
          onContinue={acceptSamCatchUp}
        />

        <LevelUpModal
          hero={autoPlay ? null : levelUpHero}
          level={levelUpLevel}
          hp={levelUpCharacterId ? hpById[levelUpCharacterId] : undefined}
          existingBonus={levelUpExistingBonus}
          draft={levelUpDraft}
          totalPoints={levelUpTotalPoints}
          draftSpent={levelUpDraftSpent}
          charName={charName}
          onAdjust={adjustLevelUpDraft}
          mode={levelUpMode}
          onMainAction={() => runLevelUpMode(levelUpMode)}
          onPickMode={pickLevelUpMode}
          onConfirm={() => confirmLevelUp()}
          reaction={levelUpReaction}
        />

        {/* Solid cover so the map never flashes behind the creation modal's fade-in. */}
        {!created && <div className="absolute inset-0 z-[55] bg-[#020202]" />}

        {/* Resuming a save: hold the intro art until the map terrain is ready. */}
        <Preloader hidden={terrainReady || !created} />

        <CreationModal
          open={!created}
          hero={creationHero}
          heroName={charName(G.RING_BEARER_ID)}
          bonus={creationBonus}
          spent={creationSpent}
          onAdjust={adjustCreation}
          onRandomize={randomizeCreation}
          onConfirm={confirmCreation}
          onAutoPlay={startAutoPlay}
          theme={theme}
          onToggleTheme={() => setTheme((prev) => (prev === "light" ? "dark" : "light"))}
        />

        <RogueFledModal
          fled={
            rogueFledNotice && !ending ? (G.CHARACTERS.find((c) => c.id === rogueFledNotice) ?? null) : null
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
            bearer={rogueBearerId ? G.CHARACTERS.find((c) => c.id === rogueBearerId) : ringBearer}
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
              G.clearSave();
              window.location.reload();
            }}
            onViewStats={() => setStatsOpen(true)}
            // The Ring is gone — let the player keep roaming a freed Middle-earth.
            // Clear every open overlay so the map is free to wander.
            onContinue={() => {
              setEnding(null);
              setVisitedLocation(null);
              setStatsOpen(false);
              setHelpOpen(false);
              setOpenCharacterId(null);
              setPartySummaryOpen(false);
              setSettingsOpen(false);
            }}
          />
        )}
      </div>
    </section>
  );
}
