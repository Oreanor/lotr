// Pure combat-state builders extracted from the map component. No React here:
// these turn the party + a foe into a ready BattleState, exactly as the inline
// code used to. The paced/auto battle engine itself lives in rules.ts
// (advanceBattleTick / resolveBattleInstantly / createBattleState).
import { ZERO_BONUS } from "@/game/constants";
import { CHARACTERS } from "@/game/data";
import { addBonus, auraBonus, effectiveStats, levelForExp, maxHpFromStats } from "@/game/rules";
import type { BattleState, Character, Combatant, StatBonus } from "@/game/types";

// Everything a builder needs to read a character's live battle stats.
export interface CombatContext {
  party: string[];
  statBonusById: Record<string, StatBonus>;
  damageById: Record<string, number>;
  expById: Record<string, number>;
}

// A party member as a combatant, with effective stats (allocated bonus + party
// auras), current HP (max minus carried wounds, floored at `minHp`), and level.
export function heroCombatant(c: Character, ctx: CombatContext, minHp: number): Combatant {
  const s = effectiveStats(c, addBonus(ctx.statBonusById[c.id] ?? ZERO_BONUS, auraBonus(c, ctx.party)));
  const maxHp = maxHpFromStats(s.strength, s.defense);
  return {
    key: c.id,
    name: c.name,
    icon: c.icon,
    hp: Math.max(minHp, maxHp - (ctx.damageById[c.id] ?? 0)),
    maxHp,
    strength: s.strength,
    attack: s.strength,
    defense: s.defense,
    luck: s.luck,
    intelligence: s.intelligence,
    level: levelForExp(ctx.expById[c.id] ?? 0).level,
  };
}

// A tempted companion turns on the bearer: a 1v1 duel for the Ring. Both fighters
// keep their carried wounds (floored at 1 HP so the duel can play out). Non-wraith
// betrayers can't see through the Ring, so it still hides the bearer.
export function createBetrayalBattle(
  bearer: Character,
  traitor: Character,
  traitorId: string,
  ctx: CombatContext,
): BattleState {
  return {
    allies: [heroCombatant(bearer, ctx, 1)],
    enemies: [heroCombatant(traitor, ctx, 1)],
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
    ringIneffective: !["saruman", "boromir", "bilbo"].includes(traitorId),
    betrayalBy: traitorId,
    gandalfOnly: false,
    rogueId: null,
    invisibleEnemy: false,
    phialBlinded: false,
  };
}

// Run down a fled ring-bearer: the whole standing party vs the rogue, who fights
// at full health, wears the Ring (invisibleEnemy → most strikes miss), and takes
// no party auras. The rogue's stats include only their own allocated bonus.
export function createRogueBattle(rogueId: string, rogue: Character, ctx: CombatContext): BattleState {
  const allies = ctx.party
    .map((id): Combatant | null => {
      const character = CHARACTERS.find((c) => c.id === id);
      return character ? heroCombatant(character, ctx, 0) : null;
    })
    .filter((c): c is Combatant => c !== null && c.hp > 0);
  const rs = effectiveStats(rogue, ctx.statBonusById[rogueId] ?? ZERO_BONUS);
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
  return {
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
}
