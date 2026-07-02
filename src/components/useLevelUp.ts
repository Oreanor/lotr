import {
  useCallback,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import * as G from "@/game";
import type { ReactionEvent, StatBonus } from "@/game";
import type { LevelUpMode } from "@/components/modals";

// Spread one hero's `points` per the chosen mode: scattered for the random modes,
// or all into a single stat otherwise.
const allocateForMode = (points: number, mode: LevelUpMode): StatBonus => {
  if (mode === "random" || mode === "randomAll") {
    return G.rollStatBonus(points);
  }
  const spread: StatBonus = { strength: 0, defense: 0, intelligence: 0, luck: 0 };
  const stat: keyof StatBonus =
    mode === "strengthAll"
      ? "strength"
      : mode === "defenseAll"
        ? "defense"
        : mode === "intelligenceAll"
          ? "intelligence"
          : "luck";
  spread[stat] = points;
  return spread;
};

// The post-battle level-up modal machine: a queue of heroes shown one card at a
// time, each with a draft allocation the player nudges/rolls/confirms. Owns the
// queue + current hero + draft + spoken reaction; the map keeps the derived modal
// props and the effects that enqueue heroes (on a battle win) and open the next
// card (once the battle screen is gone), all via the returned state setters.
export function useLevelUp(opts: {
  expById: Record<string, number>;
  statBonusById: Record<string, StatBonus>;
  setStatBonusById: Dispatch<SetStateAction<Record<string, StatBonus>>>;
  setLevelUpMode: (mode: LevelUpMode) => void;
  reactionMultRef: MutableRefObject<number>;
  pickReactionRef: MutableRefObject<
    ((c: string, e: ReactionEvent) => { text: string } | null) | null
  >;
}) {
  const { expById, statBonusById, setStatBonusById, setLevelUpMode, reactionMultRef, pickReactionRef } =
    opts;

  const [levelUpQueue, setLevelUpQueue] = useState<string[]>([]);
  const levelUpQueueRef = useRef<string[]>([]);
  levelUpQueueRef.current = levelUpQueue;
  const [levelUpCharacterId, setLevelUpCharacterId] = useState<string | null>(null);
  // A ~40% spoken reaction shown at the hero's portrait on the level-up screen
  // (kept here so it's reliable, unlike the map queue which a march/town pauses).
  const [levelUpReaction, setLevelUpReaction] = useState<string | null>(null);
  const levelUpReactionTimerRef = useRef<number | null>(null);
  const [levelUpDraft, setLevelUpDraft] = useState<StatBonus>(G.ZERO_BONUS);

  const adjustLevelUpDraft = useCallback(
    (stat: keyof StatBonus, delta: number) => {
      if (!levelUpCharacterId) {
        return;
      }
      setLevelUpDraft((prev) => {
        const spent = G.bonusPoints(prev);
        const total = G.unspentPointsFor(
          levelUpCharacterId,
          expById[levelUpCharacterId] ?? 0,
          statBonusById[levelUpCharacterId] ?? G.ZERO_BONUS,
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
  const confirmLevelUp = useCallback(
    (override?: StatBonus) => {
      if (!levelUpCharacterId) {
        return;
      }
      // The timed auto-commit passes its rolled spread as `override`; a manual
      // confirm (no override) is ignored while a roll is still on display.
      if (override === undefined && levelUpRollingRef.current) {
        return;
      }
      const draft = override ?? levelUpDraft;
      const total = G.unspentPointsFor(
        levelUpCharacterId,
        expById[levelUpCharacterId] ?? 0,
        statBonusById[levelUpCharacterId] ?? G.ZERO_BONUS,
      );
      if (G.bonusPoints(draft) !== total) {
        return;
      }
      setStatBonusById((prev) => {
        const current = prev[levelUpCharacterId] ?? G.ZERO_BONUS;
        return { ...prev, [levelUpCharacterId]: G.addBonus(current, draft) };
      });
      // Clear the draft now (not at advance): the points are spent, so during the
      // reaction-hold "points left" reads 0, never a negative.
      setLevelUpDraft(G.ZERO_BONUS);
      // Leveling raises the max HP pool but doesn't heal — and since HP is stored as
      // current health, the bigger max simply leaves the hero below full; nothing to
      // carry over.
      // React to the stat that gained the most (~40%): a line at the portrait. If it
      // fires, hold the screen a beat so it can be read, then move on.
      const keys: (keyof StatBonus)[] = ["strength", "defense", "intelligence", "luck"];
      let top: keyof StatBonus = "strength";
      for (const k of keys) {
        if (draft[k] > draft[top]) top = k;
      }
      if (draft[top] > 0 && Math.random() < 0.3 * reactionMultRef.current) {
        const ev: ReactionEvent =
          top === "strength" ? "levelStr" : top === "defense" ? "levelDef" : top === "intelligence" ? "levelInt" : "levelLuck";
        const picked = pickReactionRef.current?.(levelUpCharacterId, ev);
        if (picked) {
          setLevelUpReaction(picked.text);
          if (levelUpReactionTimerRef.current) {
            window.clearTimeout(levelUpReactionTimerRef.current);
          }
          levelUpReactionTimerRef.current = window.setTimeout(() => {
            setLevelUpReaction(null);
            advanceLevelUpRef.current();
          }, G.REACTION_SHOW_MS);
          return;
        }
      }
      advanceLevelUpRef.current();
    },
    [levelUpCharacterId, levelUpDraft, expById, statBonusById],
  );

  // Commit done — clear the draft and either show the next queued hero or close.
  const advanceLevelUpRef = useRef(() => {});
  advanceLevelUpRef.current = () => {
    // Cancel any pending reaction-hold so a manual click can't double-advance.
    if (levelUpReactionTimerRef.current) {
      window.clearTimeout(levelUpReactionTimerRef.current);
      levelUpReactionTimerRef.current = null;
    }
    setLevelUpReaction(null);
    setLevelUpDraft(G.ZERO_BONUS);
    const queue = levelUpQueueRef.current;
    if (queue.length > 0) {
      const [next, ...rest] = queue;
      setLevelUpCharacterId(next);
      setLevelUpQueue(rest);
    } else {
      setLevelUpCharacterId(null);
    }
  };

  // Rolling a random spread on level-up doubles as confirming it — scatter the
  // points and commit in one click, moving on to the next hero. (Hero creation
  // keeps its separate roll/confirm; only post-battle level-ups chain.) The roll
  // shows for half a second first, so the player can see the new spread before it
  // commits and the next hero swaps in.
  const randomizeAndConfirmLevelUp = useCallback(() => {
    if (!levelUpCharacterId || levelUpRollingRef.current) {
      return;
    }
    const total = G.unspentPointsFor(
      levelUpCharacterId,
      expById[levelUpCharacterId] ?? 0,
      statBonusById[levelUpCharacterId] ?? G.ZERO_BONUS,
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

  // The "…All" modes: spend the open hero's points AND every queued hero's. Rather
  // than commit silently, walk each card in turn — half a second on the old values,
  // half a second on the new — so the player sees roughly who gained what before it
  // closes. Stored HP is current health, so the bigger max from the new points
  // just leaves each hero below full — no healing, nothing to compensate.
  const applyLevelUpToAll = useCallback(
    (mode: LevelUpMode) => {
      if (!levelUpCharacterId || levelUpRollingRef.current) {
        return;
      }
      // Precompute every spread up front; the heroes are distinct, so committing
      // them one by one doesn't change anyone else's point total.
      const spreads: Record<string, StatBonus> = {};
      const ids: string[] = [];
      for (const id of [levelUpCharacterId, ...levelUpQueueRef.current]) {
        const total = G.unspentPointsFor(id, expById[id] ?? 0, statBonusById[id] ?? G.ZERO_BONUS);
        if (total <= 0) {
          continue;
        }
        spreads[id] = allocateForMode(total, mode);
        ids.push(id);
      }
      if (ids.length === 0) {
        return;
      }
      // Block manual confirm / re-entry for the whole walkthrough.
      levelUpRollingRef.current = true;
      if (levelUpReactionTimerRef.current) {
        window.clearTimeout(levelUpReactionTimerRef.current);
        levelUpReactionTimerRef.current = null;
      }
      setLevelUpReaction(null);
      const commit = (id: string, spread: StatBonus) => {
        setStatBonusById((prev) => ({
          ...prev,
          [id]: G.addBonus(prev[id] ?? G.ZERO_BONUS, spread),
        }));
        // HP is stored as current health, so the larger max from the new points
        // just leaves the hero below full — no need to wound them to compensate.
      };
      let i = 0;
      const step = () => {
        if (i >= ids.length) {
          setLevelUpDraft(G.ZERO_BONUS);
          setLevelUpQueue([]);
          setLevelUpCharacterId(null);
          levelUpRollingRef.current = false;
          return;
        }
        const id = ids[i];
        // Show the card with its old values, then flip the new spread in.
        setLevelUpCharacterId(id);
        setLevelUpDraft(G.ZERO_BONUS);
        window.setTimeout(() => {
          setLevelUpDraft(spreads[id]);
          window.setTimeout(() => {
            commit(id, spreads[id]);
            i += 1;
            step();
          }, 500);
        }, 500);
      };
      step();
    },
    [levelUpCharacterId, expById, statBonusById],
  );

  // The main split-button click: route to the single-hero roll or the team-wide
  // spend, depending on the remembered mode.
  const runLevelUpMode = useCallback(
    (mode: LevelUpMode) => {
      if (mode === "random") {
        randomizeAndConfirmLevelUp();
      } else {
        applyLevelUpToAll(mode);
      }
    },
    [randomizeAndConfirmLevelUp, applyLevelUpToAll],
  );

  // Picking from the chevron menu only swaps the active mode (and remembers it);
  // the player still clicks the main button to actually spend the points.
  const pickLevelUpMode = useCallback(
    (mode: LevelUpMode) => {
      setLevelUpMode(mode);
    },
    [setLevelUpMode],
  );

  return {
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
  };
}
