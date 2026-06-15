// Pure game logic: stats, leveling, battle resolution, encounters, region/tier,
// recruitment, auto-play decisions, and small geometry/terrain helpers. No React,
// no mutable module state — every function is deterministic given its inputs
// (aside from the explicit Math.random rolls).
import { getJourneyDate, SEASON_FOLDER, type Season } from "@/game/calendar";
import {
  AUTO_SKIP_RECRUITS,
  AUTO_STORY_RECRUITS,
  BALROG_DAMAGERS,
  BALROG_DAMAGER_BONUS,
  BREE_ID,
  CREATION_POINTS,
  DANGEROUS_ENCOUNTER_CHANCE,
  DWARF_IDS,
  EDORAS_POINT,
  ELF_IDS,
  ENCOUNTER_TIER_SPAN,
  EOMER_ENCOUNTER_CHANCE,
  FOOD_DAYS_BASE,
  FOOD_DAYS_HORSE,
  CRIT_LUCK_FLOOR,
  CRIT_MAX_CHANCE,
  CRIT_PER_LUCK,
  FOOD_DAYS_PONY,
  GOLLUM_ENCOUNTER_CHANCE,
  GRIMBEORN_BEAST_BONUS,
  HEALTH_PER_STR,
  HOBBIT_IDS,
  LEVEL_BASE_XP,
  LEVEL_XP_STEP,
  MAP_GRID_COLS,
  MAX_PACK_SIZE,
  MIN_DAMAGE_FRACTION,
  MORDOR_POINT,
  PATH_COLLINEAR_DOT,
  PATH_MIN_STEP,
  ROGUE_HIT_CHANCE,
  RECRUITS_BY_LOCATION,
  REGION_X,
  REGION_Y_NORTH,
  REGION_Y_SOUTH,
  RING_BEARER_ID,
  RIVENDELL_ID,
  ROAMING_RECRUIT_IDS,
  ROHAN_RADIUS,
  TERRAIN_PALETTE,
  WRAITH_FOES,
  ZERO_BONUS,
} from "@/game/constants";
import {
  AUTO_BREE_DEPART_DAY,
  AUTO_RIVENDELL_COUNCIL_DAY,
  CHARACTERS,
  EOMER_ENEMY,
  GOLLUM_ENEMY,
  LOCATION_IMAGE_FILE,
  locationData,
  MONSTERS,
  RECRUITMENT_SCHEDULES,
} from "@/game/data";
import type {
  BattleState,
  Character,
  CharacterStats,
  Combatant,
  EncounterState,
  MapLocation,
  Monster,
  Point,
  RecruitmentCalendarEntry,
  RegionCode,
  StatBonus,
  TransportId,
} from "@/game/types";

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// Emotion variants live in a subfolder mirroring the base path, e.g.
// "/icons/frodo.png" → "/icons/pain/frodo.png".
export function iconVariant(icon: string, kind: "pain" | "joy" | "refuse" | "dark"): string {
  const slash = icon.lastIndexOf("/");
  return `${icon.slice(0, slash)}/${kind}${icon.slice(slash)}`;
}

export function regionAt(point: Point): RegionCode {
  const west = point.x < REGION_X;
  if (point.y < REGION_Y_NORTH) {
    return west ? "NW" : "NE";
  }
  if (point.y < REGION_Y_SOUTH) {
    return west ? "MW" : "ME";
  }
  return west ? "SW" : "SE";
}

// Tier 0-5 at a map point: closer to Mordor → higher.
export function tierAt(point: Point): number {
  const dist = Math.hypot(point.x - MORDOR_POINT.x, point.y - MORDOR_POINT.y);
  return clamp(Math.round((1 - dist / ENCOUNTER_TIER_SPAN) * 5), 0, 5);
}

// Pick a foe for the local tier; sometimes a stronger one ("too tough for now").
export function pickMonster(localTier: number, point: Point): { monster: Monster; dangerous: boolean } {
  const region = regionAt(point);
  const allowed = MONSTERS.filter((m) => !m.regions || m.regions.includes(region));
  const dangerous = localTier < 5 && Math.random() < DANGEROUS_ENCOUNTER_CHANCE;
  let pool = dangerous
    ? allowed.filter((m) => m.tier > localTier)
    : allowed.filter((m) => m.tier <= localTier && m.tier >= localTier - 1);
  if (pool.length === 0) {
    pool = allowed.filter((m) => m.tier <= localTier);
  }
  if (pool.length === 0) {
    pool = allowed.length > 0 ? allowed : MONSTERS;
  }
  return { monster: pool[Math.floor(Math.random() * pool.length)], dangerous };
}

// Resolve the season-appropriate artwork URL for a location, or null if none.
export function locationImage(id: number, season: Season): string | null {
  const file = LOCATION_IMAGE_FILE[id];
  return file ? `/locations/${SEASON_FOLDER[season]}/${file}` : null;
}

// XP a foe grants the whole party on victory (scales with tier and strength).
export function monsterExp(monster: Monster): number {
  return 5 + monster.tier * 20 + monster.strength * 4;
}

// i18n key for a deterministic refusal given the party (null = no block).
export function recruitRefusalKey(characterId: string, party: string[]): string | null {
  if (characterId === "gollum" && !party.every((id) => HOBBIT_IDS.has(id))) {
    return "refuse.gollumHobbits";
  }
  if (characterId === "arwen" && party.includes("elrond")) {
    return "refuse.elrondArwen";
  }
  if (characterId === "eowyn" && (party.includes("eomer") || party.includes("theoden"))) {
    return "refuse.kinEowyn";
  }
  if (characterId === "saruman" && party.includes("gandalf")) {
    return "refuse.sarumanGandalf";
  }
  if (characterId === "gandalf" && party.includes("saruman")) {
    return "refuse.gandalfSaruman";
  }
  // Arwen, Galadriel (like Legolas) don't mind a dwarf along for the road.
  if (
    characterId !== "arwen" &&
    characterId !== "galadriel" &&
    ELF_IDS.has(characterId) &&
    party.some((id) => DWARF_IDS.has(id))
  ) {
    return "refuse.elfDwarf";
  }
  return null;
}

// Party-wide stat auras from companions, added on top of allocated bonuses.
export function auraBonus(character: Character, party: string[]): StatBonus {
  const bonus = { strength: 0, defense: 0, intelligence: 0, luck: 0 };
  if (party.includes("bombadil")) {
    bonus.luck += 1;
  }
  if (ELF_IDS.has(character.id) || character.id === "legolas") {
    if (party.includes("elrond")) {
      bonus.strength += 1;
    }
    if (party.includes("galadriel")) {
      bonus.defense += 1;
    }
  }
  return bonus;
}

export function addBonus(a: StatBonus, b: StatBonus): StatBonus {
  return {
    strength: a.strength + b.strength,
    defense: a.defense + b.defense,
    intelligence: a.intelligence + b.intelligence,
    luck: a.luck + b.luck,
  };
}

export function roamingRecruitBlocked(
  id: string,
  party: string[],
  leftBehind: { id: string }[],
  slain: ReadonlySet<string>,
): boolean {
  return party.includes(id) || leftBehind.some((member) => member.id === id) || slain.has(id);
}

export function slainRoamingRecruitIds(ids: string[]): string[] {
  return ids.filter((id) => ROAMING_RECRUIT_IDS.has(id));
}

// Choose what a triggered encounter is. Specials (Gollum/Eomer) come alone;
// ordinary foes arrive as a mixed pack (rolled once, shown before the fight).
export function rollEncounter(
  point: Point,
  party: string[],
  leftBehind: { id: string }[],
  slainRoamingRecruits: ReadonlySet<string>,
): { monster: Monster; dangerous: boolean; solo: boolean } {
  if (
    !roamingRecruitBlocked("gollum", party, leftBehind, slainRoamingRecruits) &&
    Math.random() < GOLLUM_ENCOUNTER_CHANCE
  ) {
    return { monster: GOLLUM_ENEMY, dangerous: false, solo: true };
  }
  const inRohan = Math.hypot(point.x - EDORAS_POINT.x, point.y - EDORAS_POINT.y) < ROHAN_RADIUS;
  if (
    inRohan &&
    !roamingRecruitBlocked("eomer", party, leftBehind, slainRoamingRecruits) &&
    Math.random() < EOMER_ENCOUNTER_CHANCE
  ) {
    return { monster: EOMER_ENEMY, dangerous: false, solo: true };
  }
  return { ...pickMonster(tierAt(point), point), solo: false };
}

export function uniquePackTypes(pack: Monster[]): Monster[] {
  const seen = new Set<string>();
  return pack.filter((mm) => {
    if (seen.has(mm.icon)) return false;
    seen.add(mm.icon);
    return true;
  });
}

export function buildEncounterPack(
  lead: Monster,
  solo: boolean,
  partySize: number,
  point: Point,
): Monster[] {
  const count = solo
    ? 1
    : clamp(partySize + Math.floor(Math.random() * 5) - 2, 1, MAX_PACK_SIZE);
  const region = regionAt(point);
  const packPool = MONSTERS.filter(
    (mm) =>
      (!mm.regions || mm.regions.includes(region)) &&
      mm.tier <= lead.tier &&
      mm.tier >= lead.tier - 1,
  );
  return Array.from({ length: count }, (_, i) =>
    i === 0 || solo || packPool.length === 0
      ? lead
      : packPool[Math.floor(Math.random() * packPool.length)],
  );
}

export function createEncounter(
  rolled: { monster: Monster; dangerous: boolean; solo: boolean },
  partySize: number,
  point: Point,
): EncounterState {
  return {
    ...rolled,
    pack: buildEncounterPack(rolled.monster, rolled.solo, partySize, point),
  };
}

export function autoPlayShouldFleeEncounter(
  encounter: EncounterState,
  party: string[],
  statBonusById: Record<string, StatBonus>,
  damageById: Record<string, number>,
): boolean {
  return autoPlayShouldFleeCombat({
    dangerous: encounter.dangerous,
    solo: encounter.solo,
    recruitId: encounter.monster.recruitId,
    party,
    statBonusById,
    damageById,
    enemies: encounter.pack,
  });
}

export function autoPlayShouldFleeCombat(opts: {
  dangerous: boolean;
  solo: boolean;
  recruitId?: string | null;
  party: string[];
  statBonusById: Record<string, StatBonus>;
  damageById: Record<string, number>;
  enemies: Pick<Monster, "name" | "strength" | "tier">[];
}): boolean {
  const { dangerous, solo, recruitId, party, statBonusById, damageById, enemies } = opts;
  if (dangerous) {
    return true;
  }

  let partyStrength = 0;
  let partyHp = 0;
  let partyMaxHp = 0;
  for (const id of party) {
    const character = CHARACTERS.find((entry) => entry.id === id);
    if (!character) {
      continue;
    }
    const stats = effectiveStats(
      character,
      addBonus(statBonusById[id] ?? ZERO_BONUS, auraBonus(character, party)),
    );
    const maxHp = stats.strength * HEALTH_PER_STR;
    partyStrength += stats.strength;
    partyMaxHp += maxHp;
    partyHp += Math.max(0, maxHp - (damageById[id] ?? 0));
  }

  let enemyStrength = 0;
  let maxEnemyTier = 0;
  let maxEnemyStrength = 0;
  let hasWraith = false;
  for (const enemy of enemies) {
    enemyStrength += enemy.strength;
    maxEnemyTier = Math.max(maxEnemyTier, enemy.tier);
    maxEnemyStrength = Math.max(maxEnemyStrength, enemy.strength);
    if (WRAITH_FOES.has(enemy.name)) {
      hasWraith = true;
    }
  }

  const partySize = party.length;
  const enemyCount = enemies.length;
  const strengthRatio = enemyStrength / Math.max(1, partyStrength);
  const hpRatio = partyHp / Math.max(1, partyMaxHp);

  if (solo && recruitId) {
    if (hpRatio < 0.35) {
      return true;
    }
    if (partyStrength < maxEnemyStrength * partySize * 0.75) {
      return true;
    }
    return false;
  }

  if (hasWraith && partySize < 6 && !party.includes("gandalf") && !party.includes("aragorn")) {
    return true;
  }

  if (maxEnemyStrength >= 10 && !party.some((id) => BALROG_DAMAGERS.has(id))) {
    return true;
  }

  if (
    maxEnemyStrength >= 7 &&
    partySize <= 6 &&
    partyStrength < maxEnemyStrength * partySize * 0.9
  ) {
    return true;
  }

  if (maxEnemyTier >= 3 && partySize <= 4 && strengthRatio > 0.4) {
    return true;
  }

  if (strengthRatio > 1.3) {
    return true;
  }
  if (partySize <= 5 && strengthRatio > 1.0) {
    return true;
  }
  if (enemyCount >= partySize && strengthRatio > 1.05) {
    return true;
  }
  if (hpRatio < 0.55 && strengthRatio > 0.85) {
    return true;
  }
  if (hpRatio < 0.75 && strengthRatio > 1.15) {
    return true;
  }

  return false;
}

// Fleeing a fight is a 50/50 at evenly-matched luck, tilted by how the party's
// *average* luck compares to the foes'. Every point the party out-lucks the
// enemy adds ESCAPE_LUCK_STEP; every point it's out-lucked subtracts the same.
// Clamped to [MIN, MAX] so escape is never certain and never hopeless.
export const ESCAPE_BASE_CHANCE = 0.5;
export const ESCAPE_LUCK_STEP = 0.06; // chance shift per point of average-luck edge
export const ESCAPE_MIN_CHANCE = 0.05;
export const ESCAPE_MAX_CHANCE = 0.95;

// Sum of the party's effective luck (auras and level-up bonuses included).
export function partyLuck(party: string[], statBonusById: Record<string, StatBonus>): number {
  let total = 0;
  for (const id of party) {
    const character = CHARACTERS.find((entry) => entry.id === id);
    if (!character) {
      continue;
    }
    total += effectiveStats(
      character,
      addBonus(statBonusById[id] ?? ZERO_BONUS, auraBonus(character, party)),
    ).luck;
  }
  return total;
}

function mean(values: number[]): number {
  return values.length ? values.reduce((sum, n) => sum + n, 0) / values.length : 0;
}

export function escapeChance(
  party: string[],
  statBonusById: Record<string, StatBonus>,
  enemyLuck: number[],
): number {
  const partyAvg = party.length ? partyLuck(party, statBonusById) / party.length : 0;
  const enemyAvg = mean(enemyLuck);
  const chance = ESCAPE_BASE_CHANCE + (partyAvg - enemyAvg) * ESCAPE_LUCK_STEP;
  return Math.min(ESCAPE_MAX_CHANCE, Math.max(ESCAPE_MIN_CHANCE, chance));
}

export function rollEscape(
  party: string[],
  statBonusById: Record<string, StatBonus>,
  enemyLuck: number[],
): boolean {
  return Math.random() < escapeChance(party, statBonusById, enemyLuck);
}

// Level (everyone starts at 1) plus progress within the current level.
export function levelForExp(exp: number): { level: number; intoLevel: number; nextLevelXp: number } {
  let level = 1;
  let acc = 0;
  let need = LEVEL_BASE_XP;
  while (exp >= acc + need) {
    acc += need;
    level += 1;
    need += LEVEL_XP_STEP;
  }
  return { level, intoLevel: exp - acc, nextLevelXp: need };
}

export function bonusPoints(bonus: StatBonus): number {
  return bonus.strength + bonus.defense + bonus.intelligence + bonus.luck;
}

export function rollStatBonus(points: number): StatBonus {
  const stats: (keyof StatBonus)[] = ["strength", "defense", "intelligence", "luck"];
  const rolled: StatBonus = { strength: 0, defense: 0, intelligence: 0, luck: 0 };
  for (let i = 0; i < points; i += 1) {
    rolled[stats[Math.floor(Math.random() * stats.length)]] += 1;
  }
  return rolled;
}

export function autoAssignLevelUpPoints(characterId: string, points: number): StatBonus {
  const character = CHARACTERS.find((entry) => entry.id === characterId);
  const draft: StatBonus = { strength: 0, defense: 0, intelligence: 0, luck: 0 };
  if (!character || points <= 0) {
    return draft;
  }
  const stats: (keyof StatBonus)[] = ["strength", "defense", "intelligence", "luck"];
  for (let i = 0; i < points; i += 1) {
    let pick: keyof StatBonus = stats[0];
    let best = Number.NEGATIVE_INFINITY;
    for (const stat of stats) {
      const score = character[stat] - draft[stat] * 0.75;
      if (score > best) {
        best = score;
        pick = stat;
      }
    }
    draft[pick] += 1;
  }
  return draft;
}

export function unspentPointsFor(id: string, exp: number, bonus: StatBonus): number {
  const spent = bonusPoints(bonus);
  const creationOffset = id === RING_BEARER_ID ? CREATION_POINTS : 0;
  return Math.max(0, levelForExp(exp).level - 1 - (spent - creationOffset));
}

export function effectiveStats(character: Character, bonus: StatBonus) {
  return {
    strength: character.strength + bonus.strength,
    defense: character.defense + bonus.defense,
    intelligence: character.intelligence + bonus.intelligence,
    luck: character.luck + bonus.luck,
  };
}

// Chance a blow crits for double damage, rising with the attacker's luck.
export function critChance(luck: number): number {
  return clamp((luck - CRIT_LUCK_FLOOR) * CRIT_PER_LUCK, 0, CRIT_MAX_CHANCE);
}

export function rollCrit(luck: number): boolean {
  return Math.random() < critChance(luck);
}

// Auto-battle: allies strike one by one, then the enemy. Damage is symmetric on
// both sides — attack − defense — so defense counts the same for everyone, but a
// blow always pushes through at least MIN_DAMAGE_FRACTION of its attack so high
// defense can't nullify it into an endless grind. HP = 10×strength.
export function hitDamage(attacker: Combatant, target: Combatant): number {
  return Math.max(
    Math.ceil(attacker.attack * MIN_DAMAGE_FRACTION),
    attacker.attack - target.defense,
  );
}

// Whether a strike connects at all is a luck duel: the attacker's luck against
// the target's. Evenly-matched luck lands HIT_BASE_CHANCE of the time; each
// point of edge shifts it by HIT_LUCK_STEP. A low-luck foe whiffs about half its
// swings — that's the "half-strength" dial for weak enemies.
export const HIT_BASE_CHANCE = 0.7;
export const HIT_LUCK_STEP = 0.06;
export const HIT_MIN_CHANCE = 0.2; // even the hapless connect sometimes
export const HIT_MAX_CHANCE = 0.95; // and a hit is never truly guaranteed

export function hitChance(attackerLuck: number, targetLuck: number): number {
  return clamp(
    HIT_BASE_CHANCE + (attackerLuck - targetLuck) * HIT_LUCK_STEP,
    HIT_MIN_CHANCE,
    HIT_MAX_CHANCE,
  );
}

export function rollHit(attackerLuck: number, targetLuck: number): boolean {
  return Math.random() < hitChance(attackerLuck, targetLuck);
}

export function enemyBeatenInBattle(enemy: Combatant, battle: BattleState): boolean {
  if (battle.recruitId) {
    return enemy.hp <= enemy.maxHp / 2;
  }
  if (battle.betrayalBy === "gollum") {
    return enemy.hp <= 0;
  }
  if (battle.betrayalBy) {
    return enemy.hp <= enemy.maxHp / 2;
  }
  return enemy.hp <= 0;
}

export function advanceBattleTick(battle: BattleState): BattleState {
  if (battle.outcome) {
    return battle;
  }
  const allies = battle.allies.map((ally) => ({ ...ally }));
  const enemies = battle.enemies.map((enemy) => ({ ...enemy }));

  if (battle.turn === "allies") {
    let i = battle.index;
    while (i < allies.length && allies[i].hp <= 0) {
      i += 1;
    }
    if (i >= allies.length) {
      return { ...battle, allies, enemies, turn: "enemies", index: 0, lastHit: null, attacker: null };
    }
    const aliveEnemies = enemies.flatMap((enemy, idx) => (enemy.hp > 0 ? [idx] : []));
    if (aliveEnemies.length === 0) {
      return { ...battle, allies, enemies, outcome: "win" };
    }
    const target = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
    const beastBonus = allies[i].key === "grimbeorn" && battle.enemyBeast ? GRIMBEORN_BEAST_BONUS : 0;
    // Everyone can wound the Balrog, but only Gandalf/Bombadil/Saruman hit hard.
    const balrogBonus =
      battle.gandalfOnly && BALROG_DAMAGERS.has(allies[i].key) ? BALROG_DAMAGER_BONUS : 0;
    // An invisible foe (the rogue ring-bearer) shrugs off most strikes.
    const missesInvisible = battle.invisibleEnemy && Math.random() > ROGUE_HIT_CHANCE;
    // Luck duel decides whether the blow connects; luck again rolls a crit.
    const lands = !missesInvisible && rollHit(allies[i].luck, enemies[target].luck);
    let dealt = 0;
    if (lands) {
      dealt = hitDamage(allies[i], enemies[target]);
      if (rollCrit(allies[i].luck)) {
        dealt *= 2;
      }
      dealt += beastBonus + balrogBonus;
    }
    enemies[target].hp = Math.max(0, enemies[target].hp - dealt);
    if (battle.recruitId) {
      const minHp = Math.max(1, Math.ceil(enemies[target].maxHp / 2));
      enemies[target].hp = Math.max(minHp, enemies[target].hp);
    }
    return {
      ...battle,
      allies,
      enemies,
      index: i + 1,
      outcome: enemies.every((enemy) => enemyBeatenInBattle(enemy, battle)) ? "win" : null,
      lastHit: lands ? enemies[target].key : null,
      attacker: allies[i].key,
      tick: battle.tick + 1,
      hitDir: Math.floor(Math.random() * 4),
    };
  }

  let j = battle.index;
  while (j < enemies.length && enemies[j].hp <= 0) {
    j += 1;
  }
  if (j >= enemies.length) {
    return { ...battle, allies, enemies, turn: "allies", index: 0, lastHit: null, attacker: null };
  }
  const aliveAllies = allies.flatMap((ally, idx) => (ally.hp > 0 ? [idx] : []));
  if (aliveAllies.length === 0) {
    return { ...battle, allies, enemies, outcome: "lose" };
  }
  const target = aliveAllies[Math.floor(Math.random() * aliveAllies.length)];
  // The Ring hides its bearer but isn't total cover — only about ROGUE_HIT_CHANCE
  // of blows find him.
  const ringProtected =
    battle.ringOn && !battle.ringIneffective && allies[target].key === battle.bearerKey;
  const missesRing = ringProtected && Math.random() > ROGUE_HIT_CHANCE;
  const lands = !missesRing && rollHit(enemies[j].luck, allies[target].luck);
  let dealt = 0;
  if (lands) {
    dealt = hitDamage(enemies[j], allies[target]);
    if (rollCrit(enemies[j].luck)) {
      dealt *= 2;
    }
  }
  allies[target].hp = Math.max(0, allies[target].hp - dealt);
  return {
    ...battle,
    allies,
    enemies,
    index: j + 1,
    outcome: allies.every((ally) => ally.hp <= 0) ? "lose" : null,
    lastHit: lands ? allies[target].key : null,
    attacker: enemies[j].key,
    tick: battle.tick + 1,
    hitDir: Math.floor(Math.random() * 4),
  };
}

export function resolveBattleInstantly(battle: BattleState): BattleState {
  let state = battle;
  let guard = 0;
  while (!state.outcome && guard < 5000) {
    state = advanceBattleTick(state);
    guard += 1;
  }
  return state;
}

// Provisions a party can carry depends on the transport (mounts carry more).
export function foodCapacityFor(transport: TransportId | null): number {
  if (transport === "horse") return FOOD_DAYS_HORSE;
  if (transport === "pony") return FOOD_DAYS_PONY;
  return FOOD_DAYS_BASE;
}

export function formatRecruitmentPeriod(
  fromDay: number,
  toDay: number | null,
  note: string | undefined,
  months: string[],
  onward: string,
  night: string,
): string {
  let label: string;
  if (toDay === null) {
    label = `${getJourneyDate(fromDay, months)} ${onward}`;
  } else if (fromDay === toDay) {
    label = getJourneyDate(fromDay, months);
  } else {
    label = `${getJourneyDate(fromDay, months)} — ${getJourneyDate(toDay, months)}`;
  }
  return note ? `${label} (${night})` : label;
}

export function isCharacterRecruitableHere(
  characterId: string,
  locationId: number,
  journeyDay: number,
): boolean {
  const schedule = RECRUITMENT_SCHEDULES[characterId];
  if (schedule) {
    return schedule.some(
      (window) =>
        window.locationId === locationId &&
        journeyDay >= window.fromDay &&
        (window.toDay === null || journeyDay <= window.toDay),
    );
  }
  return (RECRUITS_BY_LOCATION[locationId] ?? []).includes(characterId);
}

export function autoPlayNextStoryRecruit(
  locationId: number,
  journeyDay: number,
  party: string[],
): Character | null {
  const storyIds = AUTO_STORY_RECRUITS[locationId] ?? [];
  for (const id of storyIds) {
    if (party.includes(id) || AUTO_SKIP_RECRUITS.has(id)) {
      continue;
    }
    if (recruitRefusalKey(id, party)) {
      continue;
    }
    if (isCharacterRecruitableHere(id, locationId, journeyDay)) {
      return CHARACTERS.find((c) => c.id === id) ?? null;
    }
  }
  return null;
}

export function autoPlayShouldWaitAtLocation(
  locationId: number,
  journeyDay: number,
  party: string[],
): boolean {
  if (locationId === BREE_ID) {
    if (party.includes("aragorn")) {
      return false;
    }
    return journeyDay < AUTO_BREE_DEPART_DAY;
  }
  if (locationId === RIVENDELL_ID) {
    if (journeyDay < AUTO_RIVENDELL_COUNCIL_DAY) {
      return true;
    }
    const storyIds = AUTO_STORY_RECRUITS[locationId] ?? [];
    for (const id of storyIds) {
      if (party.includes(id) || AUTO_SKIP_RECRUITS.has(id)) {
        continue;
      }
      if (recruitRefusalKey(id, party)) {
        continue;
      }
      if (isCharacterRecruitableHere(id, locationId, journeyDay)) {
        return true;
      }
    }
  }
  return false;
}

export function autoFarmThreshold(capacity: number): number {
  return Math.max(4, Math.floor(capacity * 0.35));
}

export function autoFarmStopThreshold(capacity: number): number {
  return Math.max(3, Math.floor(capacity * 0.2));
}

export function autoPlayShouldFarm(food: number, capacity: number): boolean {
  return food < capacity && food <= autoFarmThreshold(capacity);
}

export function getLocationLabel(location: MapLocation, lang: string): string {
  return lang === "en" ? location.name : (location.name_ru ?? location.name);
}

export function buildRecruitmentCalendar(
  locations: MapLocation[],
  journeyDay: number,
  months: string[],
  lang: string,
  onward: string,
  night: string,
  always: string,
): RecruitmentCalendarEntry[] {
  const entries: RecruitmentCalendarEntry[] = [];

  for (const [characterId, windows] of Object.entries(RECRUITMENT_SCHEDULES)) {
    const character = CHARACTERS.find((entry) => entry.id === characterId);
    if (!character) {
      continue;
    }
    for (const window of windows) {
      const location = locations.find((entry) => entry.id === window.locationId);
      const isActive =
        journeyDay >= window.fromDay && (window.toDay === null || journeyDay <= window.toDay);
      entries.push({
        character,
        locationLabel: location ? getLocationLabel(location, lang) : String(window.locationId),
        periodLabel: formatRecruitmentPeriod(window.fromDay, window.toDay, window.note, months, onward, night),
        fromDay: window.fromDay,
        isActive,
      });
    }
  }

  for (const [locationIdStr, characterIds] of Object.entries(RECRUITS_BY_LOCATION)) {
    const locationId = Number(locationIdStr);
    const location = locations.find((entry) => entry.id === locationId);
    for (const characterId of characterIds) {
      if (RECRUITMENT_SCHEDULES[characterId]) {
        continue;
      }
      const character = CHARACTERS.find((entry) => entry.id === characterId);
      if (!character) {
        continue;
      }
      entries.push({
        character,
        locationLabel: location ? getLocationLabel(location, lang) : String(locationId),
        periodLabel: always,
        fromDay: 0,
        isActive: true,
      });
    }
  }

  return entries.sort(
    (left, right) =>
      left.fromDay - right.fromDay || left.character.name.localeCompare(right.character.name),
  );
}

export function getStartPosition(hobbitonPoint: Point): Point {
  const cellWidth = locationData.meta.map.width / MAP_GRID_COLS;
  return {
    x: hobbitonPoint.x - cellWidth,
    y: hobbitonPoint.y,
  };
}

// Store the trail as line segments: only turns become vertices. While the hero
// keeps going (nearly) straight we just move the last vertex; a real change of
// direction adds a new one. `maxPoints` (touch only) caps the vertex count.
export function appendPathPoint(path: Point[], point: Point, maxPoints?: number): Point[] {
  const n = path.length;
  if (n === 0) {
    return [point];
  }
  const last = path[n - 1];
  const stepLen = Math.hypot(point.x - last.x, point.y - last.y);
  if (stepLen < PATH_MIN_STEP) {
    return path; // ignore sub-pixel jitter
  }
  if (n >= 2) {
    const prev = path[n - 2];
    const segX = last.x - prev.x;
    const segY = last.y - prev.y;
    const segLen = Math.hypot(segX, segY) || 1;
    const dot = (segX * (point.x - last.x) + segY * (point.y - last.y)) / (segLen * stepLen);
    if (dot > PATH_COLLINEAR_DOT) {
      // Still heading the same way → extend the current segment, no new vertex.
      const extended = path.slice(0, -1);
      extended.push(point);
      return extended;
    }
  }
  const next = [...path, point];
  return maxPoints && next.length > maxPoints ? next.slice(-maxPoints) : next;
}

// Zoom at which `visibleFraction` of the map area fills the given viewport.
export function fitZoom(view: { width: number; height: number }, map: { width: number; height: number }, visibleFraction: number): number {
  return Math.sqrt((view.width * view.height) / (map.width * map.height * visibleFraction));
}

// Smallest zoom that still covers the whole viewport (no empty gaps).
export function coverZoom(view: { width: number; height: number }, map: { width: number; height: number }): number {
  return Math.max(view.width / map.width, view.height / map.height);
}

// Nearest palette color by squared RGB distance.
export function nearestTerrainId(r: number, g: number, b: number): number {
  let bestId = 0;
  let bestDist = Infinity;
  for (const entry of TERRAIN_PALETTE) {
    const dr = r - entry.rgb[0];
    const dg = g - entry.rgb[1];
    const db = b - entry.rgb[2];
    const dist = dr * dr + dg * dg + db * db;
    if (dist < bestDist) {
      bestDist = dist;
      bestId = entry.id;
    }
  }
  return bestId;
}

// Derive current stats from a character and how many days have been travelled.
export function computeCharacterStats(
  character: Character,
  bearerRingDays: number,
  bearerId: string,
  damage: number,
  bonus: StatBonus,
): CharacterStats {
  const isBearer = character.id === bearerId;
  const s = effectiveStats(character, bonus);
  const maxHealth = s.strength * HEALTH_PER_STR;
  const health = Math.max(0, maxHealth - damage);

  const accumulated = (character.ringExposure ?? 0) * 100;
  const journeyCorruption = isBearer ? (bearerRingDays / character.resilience) * 100 : 0;

  return {
    strength: s.strength,
    defense: s.defense,
    intelligence: s.intelligence,
    health,
    maxHealth,
    luck: s.luck,
    isBearer,
    corruption: Math.min(100, Math.floor(accumulated + journeyCorruption)),
    dead: health <= 0,
  };
}
