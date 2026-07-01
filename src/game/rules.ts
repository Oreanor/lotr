// Pure game logic: stats, leveling, battle resolution, encounters, region/tier,
// recruitment, auto-play decisions, and small geometry/terrain helpers. No React,
// no mutable module state — every function is deterministic given its inputs
// (aside from the explicit Math.random rolls).
import { SEASON_FOLDER, type Season } from "@/game/calendar";
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
  ENEMY_TARGET_TOP_MAX_CHANCE,
  ENEMY_TARGET_INT_FLOOR,
  ENEMY_TARGET_INT_CEIL,
  EOMER_ENCOUNTER_CHANCE,
  FANGORN_CENTER,
  FANGORN_HALF,
  TREEBEARD_ENCOUNTER_CHANCE,
  FOOD_DAYS_BASE,
  FOOD_DAYS_HORSE,
  CRIT_MAX_CHANCE,
  CRIT_INT_FLOOR,
  CRIT_PER_INT,
  CRIT_MULTIPLIER,
  FOCUS_INT_FLOOR,
  FOCUS_PER_INT,
  FOCUS_MAX_CHANCE,
  COMMAND_FOCUS_BONUS,
  GUARD_PASS_CHANCE,
  FARAMIR_GUARD_PASS_CHANCE,
  FOOD_DAYS_PONY,
  FLEE_AT_HALF_FOES,
  GOLLUM_ENCOUNTER_CHANCE,
  GOLLUM_ENCOUNTER_CHANCE_MAX,
  GRIMA_ENCOUNTER_CHANCE,
  GRIMBEORN_BEAST_BONUS,
  EOWYN_NAZGUL_BONUS,
  HALDIR_ORC_BONUS,
  KING_DEAD_LEECH_MIN,
  KING_DEAD_LEECH_MAX,
  TROLL_FOES,
  THRANDUIL_TROLL_CRIT_BONUS,
  HEALTH_PER_STR,
  HEALTH_PER_DEF,
  HOBBIT_IDS,
  LEVEL_BASE_XP,
  MAP_GRID_COLS,
  MIN_DAMAGE_FRACTION,
  MORDOR_POINT,
  NAZGUL_ENCOUNTER_CHANCE,
  NAZGUL_NAME,
  NAZGUL_PACK_MAX,
  SARUMAN_NAME,
  PATH_COLLINEAR_DOT,
  PATH_MIN_STEP,
  BEAST_MONSTERS,
  ORC_FOES,
  RINGWRAITH_FOES,
  RING_PIERCING_FOES,
  SHELOB_NAME,
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
  TREEBEARD_ENEMY,
  GOLLUM_ENEMY,
  GRIMA_ENEMY,
  ITEM_BY_ID,
  LOCATION_IMAGE_FILE,
  locationData,
  MONSTERS,
  NAZGUL_ENEMY,
  RECRUITMENT_SCHEDULES,
} from "@/game/data";
import type {
  BattleState,
  Character,
  CharacterStats,
  Combatant,
  EncounterState,
  Item,
  MapLocation,
  Monster,
  Point,
  RegionCode,
  StatBonus,
  TransportId,
} from "@/game/types";

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// Emotion variants live in a subfolder mirroring the base path, e.g.
// "/allies/frodo.png" → "/allies/pain/frodo.png".
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

// Gollum's per-encounter chance, ramping from the base far off to the max right
// at Mordor (the SE diagonal). Proximity reuses the tier span.
export function gollumChanceAt(point: Point): number {
  const dist = Math.hypot(point.x - MORDOR_POINT.x, point.y - MORDOR_POINT.y);
  const proximity = clamp(1 - dist / ENCOUNTER_TIER_SPAN, 0, 1);
  return GOLLUM_ENCOUNTER_CHANCE + (GOLLUM_ENCOUNTER_CHANCE_MAX - GOLLUM_ENCOUNTER_CHANCE) * proximity;
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

// XP a foe grants the whole party on victory. Big foes should pay for their
// bulk, armor, and special attack spikes; keep UI values clean by rounding to 5.
export function monsterExp(monster: Monster): number {
  const raw =
    10 +
    monster.tier * 18 +
    monster.strength * 6 +
    monster.defense * 2 +
    monster.intelligence * 2 +
    monster.luck * 2 +
    monster.strength ** 2 * 0.2;
  return Math.round(raw / 5) * 5;
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
  // Arwen, Galadriel and Círdan (like Legolas) don't mind a dwarf along the road.
  // Celeborn and Haldir would refuse — unless the Lady Galadriel herself is along,
  // for they will follow her anywhere.
  if (
    characterId !== "arwen" &&
    characterId !== "galadriel" &&
    characterId !== "cirdan" &&
    !(
      (characterId === "celeborn" || characterId === "haldir") &&
      party.includes("galadriel")
    ) &&
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
  // Party-wide auras — everyone in the company benefits.
  if (party.includes("bombadil")) {
    bonus.luck += 1;
  }
  if (party.includes("gimli")) {
    bonus.defense += 1;
  }
  if (party.includes("legolas")) {
    bonus.luck += 1;
  }
  if (party.includes("boromir")) {
    bonus.strength += 1;
  }
  // Bilbo's long luck with the Ring rubs off on the whole company: everyone gains
  // a quarter of the party's average luck (rounded).
  if (party.includes("bilbo")) {
    const lucks = party
      .map((id) => CHARACTERS.find((c) => c.id === id)?.luck)
      .filter((v): v is number => v !== undefined);
    if (lucks.length > 0) {
      const avgLuck = lucks.reduce((sum, v) => sum + v, 0) / lucks.length;
      bonus.luck += Math.round(avgLuck * 0.25);
    }
  }
  // Elf-lords' auras — only the elves of the company are lifted by them.
  if (ELF_IDS.has(character.id) || character.id === "legolas") {
    if (party.includes("elrond")) {
      bonus.strength += 2;
    }
    if (party.includes("galadriel")) {
      bonus.defense += 2;
    }
    if (party.includes("celeborn")) {
      bonus.intelligence += 2;
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

function nazgulForTier(localTier: number): Monster {
  const tier = clamp(localTier, 0, 5);
  return {
    ...NAZGUL_ENEMY,
    tier,
    // Strength now drives both their HP and their bite (they used to hit above
    // their HP via a separate attack); the half-strength retreat keeps them from
    // turning into HP sponges. Defense matches strength so HP holds under the
    // 5×str+5×def pool (and stays floor-capped against the party's blows).
    strength: 13 + Math.floor(tier * 2.5),
    defense: 13 + Math.floor(tier * 2.5),
    luck: tier >= 2 ? 5 : 4,
  };
}

// Choose what a triggered encounter is. Specials (Gollum/Eomer) come alone;
// ordinary foes arrive as a mixed pack (rolled once, shown before the fight).
export function rollEncounter(
  point: Point,
  party: string[],
  leftBehind: { id: string }[],
  slainRoamingRecruits: ReadonlySet<string>,
  grimaRoaming = false,
  wraithsBroken = false,
  treebeardGone = false,
): { monster: Monster; dangerous: boolean; solo: boolean } {
  // A masterless Gríma, skulking the wilds — a rare, feeble foe.
  if (grimaRoaming && Math.random() < GRIMA_ENCOUNTER_CHANCE) {
    return { monster: GRIMA_ENEMY, dangerous: false, solo: true };
  }
  if (
    !roamingRecruitBlocked("gollum", party, leftBehind, slainRoamingRecruits) &&
    Math.random() < gollumChanceAt(point)
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
  // Treebeard in Fangorn (gone once the Ents have taken Isengard). The page reads
  // his recruitId to greet or fight him; he comes alone.
  const inFangorn =
    Math.abs(point.x - FANGORN_CENTER.x) < FANGORN_HALF &&
    Math.abs(point.y - FANGORN_CENTER.y) < FANGORN_HALF;
  if (
    inFangorn &&
    !treebeardGone &&
    !roamingRecruitBlocked("treebeard", party, leftBehind, slainRoamingRecruits) &&
    Math.random() < TREEBEARD_ENCOUNTER_CHANCE
  ) {
    return { monster: TREEBEARD_ENEMY, dangerous: false, solo: true };
  }
  // With the Witch-king thrown down, the leaderless wraiths no longer roam.
  if (!wraithsBroken && Math.random() < NAZGUL_ENCOUNTER_CHANCE) {
    return { monster: nazgulForTier(tierAt(point)), dangerous: true, solo: false };
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
  if (!solo && lead.name === NAZGUL_NAME) {
    const maxCount = clamp(1 + Math.floor(lead.tier / 2), 1, NAZGUL_PACK_MAX);
    const count = 1 + Math.floor(Math.random() * maxCount);
    return Array.from({ length: count }, () => lead);
  }
  // Pack size tracks the party (size ±2), with no upper cap — a big company draws
  // a correspondingly big swarm.
  const count = solo ? 1 : Math.max(1, partySize + Math.floor(Math.random() * 5) - 2);
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
  hpById: Record<string, number>,
): boolean {
  return autoPlayShouldFleeCombat({
    dangerous: encounter.dangerous,
    solo: encounter.solo,
    recruitId: encounter.monster.recruitId,
    party,
    statBonusById,
    hpById,
    enemies: encounter.pack,
  });
}

export function autoPlayShouldFleeCombat(opts: {
  dangerous: boolean;
  solo: boolean;
  recruitId?: string | null;
  party: string[];
  statBonusById: Record<string, StatBonus>;
  hpById: Record<string, number>;
  enemies: Pick<Monster, "name" | "strength" | "tier">[];
}): boolean {
  const { dangerous, solo, recruitId, party, statBonusById, hpById, enemies } = opts;
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
    const maxHp = maxHpFromStats(stats.strength, stats.defense);
    partyStrength += stats.strength;
    partyMaxHp += maxHp;
    partyHp += currentHp(maxHp, hpById[id]);
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
// A small, nimble band breaks off more easily: each member short of
// ESCAPE_SIZE_FULL adds ESCAPE_SIZE_STEP to the getaway odds.
export const ESCAPE_SIZE_FULL = 5;
export const ESCAPE_SIZE_STEP = 0.05;

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
  const sizeBonus = Math.max(0, ESCAPE_SIZE_FULL - party.length) * ESCAPE_SIZE_STEP;
  const chance = ESCAPE_BASE_CHANCE + (partyAvg - enemyAvg) * ESCAPE_LUCK_STEP + sizeBonus;
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
  let need = LEVEL_BASE_XP * level;
  while (exp >= acc + need) {
    acc += need;
    level += 1;
    need = LEVEL_BASE_XP * level;
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

// Flat (always-on) stat bonuses a carried item grants its bearer.
export function itemStatBonus(item: Item | undefined): StatBonus {
  return item
    ? {
        strength: item.strength ?? 0,
        defense: item.defense ?? 0,
        intelligence: item.intelligence ?? 0,
        luck: item.luck ?? 0,
      }
    : ZERO_BONUS;
}

// Cache items (gondor_sword_3, gondor_armor_1, …) are many distinct ids that
// share one display name/desc — collapse the numeric suffix for i18n lookups.
// Only the Gondor armoury family is pooled this way, so other "_1/_2" items
// (silver_belt_1, …) keep their own names.
export function itemFamilyId(id: string): string {
  return id.startsWith("gondor_") ? id.replace(/_\d+$/, "") : id;
}

// Conditional bonus attack a carried item adds against the foes in this fight.
export function itemAttackBonus(
  item: Item | undefined,
  packHasUndead: boolean,
  packHasOrcs: boolean,
): number {
  if (!item) {
    return 0;
  }
  return (
    (packHasUndead ? (item.strengthVsUndead ?? 0) : 0) +
    (packHasOrcs ? (item.strengthVsOrcs ?? 0) : 0)
  );
}

// How often a landed blow crits, rising with the attacker's intelligence.
export function critChance(intelligence: number): number {
  return clamp((intelligence - CRIT_INT_FLOOR) * CRIT_PER_INT, 0, CRIT_MAX_CHANCE);
}

export function rollCrit(intelligence: number, bonus = 0, mult = 1): boolean {
  return Math.random() < critChance(intelligence) * mult + bonus;
}

// A crit's bite is a flat multiplier — intelligence governs frequency, not size,
// so it never compounds (more-often × harder).
export function critMultiplier(): number {
  return CRIT_MULTIPLIER;
}

// How likely a fighter is to coordinate on the team's focus target rather than
// flail at a random foe — rising with intelligence.
export function focusChance(intelligence: number): number {
  return clamp((intelligence - FOCUS_INT_FLOOR) * FOCUS_PER_INT, 0, FOCUS_MAX_CHANCE);
}

// How reliably a fighter obeys the player's "gang up on this foe" order: passive
// coordination odds, boosted — sharper fighters still follow orders better, but
// even a dull one heeds the command more often than it would coordinate on its
// own. Capped, so a commanded strike is never a certainty.
export function commandFocusChance(intelligence: number): number {
  return clamp(focusChance(intelligence) + COMMAND_FOCUS_BONUS, 0, FOCUS_MAX_CHANCE);
}

// Choose which foe to strike. A clever fighter focuses the most dangerous one
// (highest attack, finishing the frailest among equals) — and since that pick
// is deterministic, all the clever ones converge on the same target. A dull one
// just swings at a random foe; the duller, the likelier that random flail.
export function chooseTargetIndex(
  attacker: Combatant,
  foes: Combatant[],
  aliveIndices: number[],
): number {
  if (aliveIndices.length <= 1) {
    return aliveIndices[0] ?? 0;
  }
  if (Math.random() < focusChance(attacker.intelligence)) {
    return aliveIndices.reduce((best, idx) => {
      const candidate = foes[idx];
      const current = foes[best];
      if (candidate.attack !== current.attack) {
        return candidate.attack > current.attack ? idx : best;
      }
      return candidate.hp < current.hp ? idx : best;
    }, aliveIndices[0]);
  }
  return aliveIndices[Math.floor(Math.random() * aliveIndices.length)];
}

// Whom a foe strikes among the party. The smarter the foe, the more reliably it
// singles out the most seasoned (highest-level) hero — the obvious threat; the
// duller it is, the more its blows land anywhere. At the dumb end every ally is
// equally likely (top chance = 1/N); at the clever end the top-level hero draws
// ENEMY_TARGET_TOP_MAX_CHANCE. This keeps a glass-cannon Ring-bearer from being
// ganged up on just for hitting hard. With one ally left, there's no choice.
export function chooseAllyTarget(
  attacker: Combatant,
  allies: Combatant[],
  aliveIndices: number[],
): number {
  if (aliveIndices.length <= 1) {
    return aliveIndices[0] ?? 0;
  }
  const topIdx = aliveIndices.reduce((best, idx) => {
    const candidate = allies[idx];
    const current = allies[best];
    const cl = candidate.level ?? 0;
    const bl = current.level ?? 0;
    if (cl !== bl) {
      return cl > bl ? idx : best;
    }
    return candidate.hp < current.hp ? idx : best; // tie → the frailer
  }, aliveIndices[0]);
  const smartness = clamp(
    (attacker.intelligence - ENEMY_TARGET_INT_FLOOR) /
      (ENEMY_TARGET_INT_CEIL - ENEMY_TARGET_INT_FLOOR),
    0,
    1,
  );
  // Lerp the top-level chance from uniform (1/N, fully random) to the max focus.
  const uniform = 1 / aliveIndices.length;
  const topChance = uniform + (ENEMY_TARGET_TOP_MAX_CHANCE - uniform) * smartness;
  if (Math.random() < topChance) {
    return topIdx;
  }
  const others = aliveIndices.filter((idx) => idx !== topIdx);
  return others[Math.floor(Math.random() * others.length)];
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
  // The "drops out at half" threshold must match the HP floor applied in
  // advanceBattleTick (Math.ceil(maxHp/2)); otherwise an odd-HP foe is floored
  // just above maxHp/2 and never counts as beaten — the fight can't end.
  const half = Math.ceil(enemy.maxHp / 2);
  if (battle.recruitId) {
    return enemy.hp <= half;
  }
  if (battle.betrayalBy) {
    // Beaten traitors (Gollum included) are driven off at half rather than slain,
    // so a repelled Gollum survives to play his part at Mount Doom.
    return enemy.hp <= half;
  }
  if (FLEE_AT_HALF_FOES.has(enemy.name) && !battle.wraithsStand) {
    return enemy.hp <= half;
  }
  return enemy.hp <= 0;
}

// Post-tick bookkeeping applied after every strike (so it holds in auto-play too,
// not just on the visible screen):
//  • A player order lapses once its subject leaves the fight — drop the shield on
//    a fallen hero, and the focus on a foe that's been beaten.
//  • Ring-piercing sight dies with its owner: in a standard fight, once every
//    wraith/Balrog that sees through the Ring is beaten, the surviving foes are
//    blind to it, so the Ring becomes usable again.
function clearResolvedOrders(state: BattleState): BattleState {
  let guardedAllyKey = state.guardedAllyKey ?? null;
  let focusEnemyKey = state.focusEnemyKey ?? null;
  // The shield lapses when the guarded hero falls — or dons the Ring: a ring-hidden
  // bearer can't be shielded (the Ring already hides him), so the order clears.
  if (
    guardedAllyKey &&
    (!state.allies.some((a) => a.key === guardedAllyKey && a.hp > 0) ||
      (state.ringOn && !state.ringIneffective && guardedAllyKey === state.bearerKey))
  ) {
    guardedAllyKey = null;
  }
  if (focusEnemyKey) {
    const foe = state.enemies.find((e) => e.key === focusEnemyKey);
    if (!foe || enemyBeatenInBattle(foe, state)) {
      focusEnemyKey = null;
    }
  }
  // Betrayal duels and the rogue hunt set ringIneffective by their own rules —
  // leave those alone; only the monster-pack fight derives it from the foes.
  let ringIneffective = state.ringIneffective;
  if (!state.betrayalBy && !state.rogueId) {
    ringIneffective = state.enemies.some(
      (e) => RING_PIERCING_FOES.has(e.name) && !enemyBeatenInBattle(e, state),
    );
  }
  const unchanged =
    guardedAllyKey === (state.guardedAllyKey ?? null) &&
    focusEnemyKey === (state.focusEnemyKey ?? null) &&
    ringIneffective === state.ringIneffective;
  return unchanged ? state : { ...state, guardedAllyKey, focusEnemyKey, ringIneffective };
}

export function advanceBattleTick(battle: BattleState): BattleState {
  return clearResolvedOrders(advanceBattleTickRaw(battle));
}

function advanceBattleTickRaw(battle: BattleState): BattleState {
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
    // Only foes still in the fight are targets — those that yield at half
    // (fleeing Nazgûl, captives to recruit) drop out and take no more blows.
    const aliveEnemies = enemies.flatMap((enemy, idx) =>
      enemyBeatenInBattle(enemy, battle) ? [] : [idx],
    );
    if (aliveEnemies.length === 0) {
      return { ...battle, allies, enemies, outcome: "win" };
    }
    let target = chooseTargetIndex(allies[i], enemies, aliveEnemies);
    // Player rallied the party onto a framed foe: obey with a wit-scaled chance,
    // overriding this fighter's own target pick.
    if (battle.focusEnemyKey) {
      const focusIdx = enemies.findIndex((e) => e.key === battle.focusEnemyKey);
      if (
        aliveEnemies.includes(focusIdx) &&
        Math.random() < commandFocusChance(allies[i].intelligence)
      ) {
        target = focusIdx;
      }
    }
    const beastBonus = allies[i].key === "grimbeorn" && battle.enemyBeast ? GRIMBEORN_BEAST_BONUS : 0;
    // Éowyn, no living man: she bites harder into the Ringwraiths.
    const nazgulBonus = allies[i].key === "eowyn" && battle.enemyNazgul ? EOWYN_NAZGUL_BONUS : 0;
    // Haldir the marchwarden lands heavier blows on orc-kin.
    const orcBonus = allies[i].key === "haldir" && battle.enemyOrc ? HALDIR_ORC_BONUS : 0;
    // Everyone can wound the Balrog, but only Gandalf/Bombadil/Saruman hit hard.
    const balrogBonus =
      battle.gandalfOnly && BALROG_DAMAGERS.has(allies[i].key) ? BALROG_DAMAGER_BONUS : 0;
    // Thranduil crits trolls far more often.
    const critBonus =
      allies[i].key === "thranduil" && TROLL_FOES.has(enemies[target].name)
        ? THRANDUIL_TROLL_CRIT_BONUS
        : 0;
    // An invisible foe (the rogue ring-bearer) shrugs off most strikes.
    const missesInvisible = battle.invisibleEnemy && Math.random() > ROGUE_HIT_CHANCE;
    // Luck duel decides whether the blow connects; luck again rolls a crit.
    const lands = !missesInvisible && rollHit(allies[i].luck, enemies[target].luck);
    let dealt = 0;
    let didCrit = false;
    if (lands) {
      dealt = hitDamage(allies[i], enemies[target]);
      if (rollCrit(allies[i].intelligence, critBonus, battle.allyCritMult ?? 1)) {
        dealt = Math.round(dealt * critMultiplier());
        didCrit = true;
      }
      dealt += beastBonus + balrogBonus + nazgulBonus + orcBonus;
    }
    const targetHpBefore = enemies[target].hp;
    enemies[target].hp = Math.max(0, targetHpBefore - dealt);
    // A foe that yields at half is never beaten below it — one big blow can't
    // overshoot and kill it; it simply drops out at half. This applies to
    // recruit captures and to wraiths that recoil at half — but NOT in a lair
    // where the wraiths stand and fight to the death (wraithsStand), or they'd
    // be unkillable (floored at half, yet only "beaten" at 0 HP).
    // Saruman holds at half until the mercy choice is made (then parleyDeclined
    // lifts the floor so he can be slain).
    const sarumanHeld =
      !!battle.sarumanParley && !battle.parleyDeclined && enemies[target].name === SARUMAN_NAME;
    const yieldsAtHalf =
      battle.recruitId ||
      sarumanHeld ||
      (FLEE_AT_HALF_FOES.has(enemies[target].name) && !battle.wraithsStand);
    if (yieldsAtHalf) {
      const minHp = Math.max(1, Math.ceil(enemies[target].maxHp / 2));
      enemies[target].hp = Math.max(minHp, enemies[target].hp);
    }
    // The King of the Dead drains the living: a random 30–60% of the wound he
    // deals to a non-undead foe returns to him as health. Other undead give him
    // nothing to drain.
    if (allies[i].key === "king_dead" && !WRAITH_FOES.has(enemies[target].name)) {
      const drained = targetHpBefore - enemies[target].hp;
      if (drained > 0) {
        const share =
          KING_DEAD_LEECH_MIN + Math.random() * (KING_DEAD_LEECH_MAX - KING_DEAD_LEECH_MIN);
        allies[i].hp = Math.min(allies[i].maxHp, allies[i].hp + Math.round(drained * share));
      }
    }
    // Saruman just hit half with Gandalf/Treebeard along — pause for the parley.
    if (sarumanHeld && enemies[target].hp <= Math.ceil(enemies[target].maxHp / 2)) {
      return {
        ...battle,
        allies,
        enemies,
        pendingParley: true,
        lastHit: lands ? enemies[target].key : null,
        attacker: allies[i].key,
        tick: battle.tick + 1,
        hitDir: Math.floor(Math.random() * 4),
        crit: didCrit,
      };
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
      crit: didCrit,
    };
  }

  let j = battle.index;
  // A beaten foe is out of the fight — it doesn't strike back (a Nazgûl that
  // yielded at half is inactive, not merely at 0 HP).
  while (j < enemies.length && enemyBeatenInBattle(enemies[j], battle)) {
    j += 1;
  }
  if (j >= enemies.length) {
    return { ...battle, allies, enemies, turn: "allies", index: 0, lastHit: null, attacker: null };
  }
  const aliveAllies = allies.flatMap((ally, idx) => (ally.hp > 0 ? [idx] : []));
  if (aliveAllies.length === 0) {
    return { ...battle, allies, enemies, outcome: "lose" };
  }
  let target = chooseAllyTarget(enemies[j], allies, aliveAllies);
  // The party shields a framed hero: a blow aimed at him lands only part of the
  // time, else a random other living ally takes the wound for him. Faramir in the
  // fight tightens the screen (fewer blows get through). A ring-hidden bearer is
  // already untargetable, so he can't be shielded on top of that.
  const guardingRingBearer =
    battle.ringOn && !battle.ringIneffective && allies[target].key === battle.bearerKey;
  if (
    battle.guardedAllyKey &&
    allies[target].key === battle.guardedAllyKey &&
    aliveAllies.length > 1 &&
    !guardingRingBearer
  ) {
    const faramirCovers = allies.some((a) => a.key === "faramir" && a.hp > 0);
    const passChance = faramirCovers ? FARAMIR_GUARD_PASS_CHANCE : GUARD_PASS_CHANCE;
    if (Math.random() >= passChance) {
      const shields = aliveAllies.filter((idx) => idx !== target);
      target = shields[Math.floor(Math.random() * shields.length)];
    }
  }
  // The Ring hides its bearer but isn't total cover — only about ROGUE_HIT_CHANCE
  // of blows find him.
  const ringProtected =
    battle.ringOn && !battle.ringIneffective && allies[target].key === battle.bearerKey;
  const missesRing = ringProtected && Math.random() > ROGUE_HIT_CHANCE;
  const lands = !missesRing && rollHit(enemies[j].luck, allies[target].luck);
  let dealt = 0;
  let didCrit = false;
  if (lands) {
    dealt = hitDamage(enemies[j], allies[target]);
    if (rollCrit(enemies[j].intelligence, 0, battle.noEnemyCrit ? 0 : 1)) {
      dealt = Math.round(dealt * critMultiplier());
      didCrit = true;
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
    crit: didCrit,
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

export interface CreateBattleOpts {
  party: string[];
  monster: Monster;
  pack: Monster[];
  bearerId: string | null;
  statBonusById: Record<string, StatBonus>;
  hpById: Record<string, number>;
  expById: Record<string, number>;
  equippedItems: Record<string, string>;
  wraithsStand?: boolean;
  sarumanParley?: boolean;
}

// Snapshot the live party and a foe pack into a fresh, ready-to-run battle. The
// single source of truth for how stats, carried items, auras and wounds become
// combatants — used both to start a real fight and to forecast its danger.
export function createBattleState(opts: CreateBattleOpts): BattleState {
  const { party, monster, pack, bearerId, statBonusById, hpById, expById, equippedItems } = opts;
  const packHasUndead = pack.some((mm) => WRAITH_FOES.has(mm.name));
  const packHasOrcs = pack.some((mm) => ORC_FOES.has(mm.name));
  // The Phial of Galadriel blinds Shelob — her strength is halved.
  const partyHasPhial = party.some((id) => equippedItems[id] === "phial");
  const phialBlinded = partyHasPhial && pack.some((mm) => mm.name === SHELOB_NAME);
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
      return {
        key: id,
        name: character.name,
        icon: character.icon,
        hp: currentHp(maxHp, hpById[id]),
        maxHp,
        strength: s.strength,
        attack: s.strength + attackBonus,
        defense: s.defense,
        luck: s.luck,
        intelligence: s.intelligence,
        level: levelForExp(expById[id] ?? 0).level,
      };
    })
    .filter((c): c is Combatant => c !== null && c.hp > 0);
  const enemies: Combatant[] = pack.map((mm, i) => {
    const str = phialBlinded && mm.name === SHELOB_NAME ? Math.floor(mm.strength / 2) : mm.strength;
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
  return {
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
    recruitId: monster.recruitId ?? null,
    enemyBeast: pack.some((mm) => BEAST_MONSTERS.has(mm.name)),
    enemyNazgul: pack.some((mm) => RINGWRAITH_FOES.has(mm.name)),
    enemyOrc: packHasOrcs,
    ringIneffective: pack.some((mm) => RING_PIERCING_FOES.has(mm.name)),
    betrayalBy: null,
    gandalfOnly: pack.some((mm) => mm.name.startsWith("Балрог")),
    rogueId: null,
    invisibleEnemy: false,
    phialBlinded,
    wraithsStand: opts.wraithsStand ?? false,
    sarumanParley: opts.sarumanParley ?? false,
    noEnemyCrit: party.includes("arwen"),
    allyCritMult: party.includes("theoden") ? 1.5 : 1,
  };
}

// Forecast whether a foe is genuinely "strong": run the real battle engine a few
// times (no Ring trickery, no fleeing) and call it dangerous if, on average,
// more than half the party ends up dead or out of the fight — i.e. the foe can
// take down the better part of the company even if the party ultimately wins.
export function estimateEncounterDanger(opts: CreateBattleOpts): boolean {
  const RUNS = 9;
  let totalWipeShare = 0;
  for (let run = 0; run < RUNS; run += 1) {
    const final = resolveBattleInstantly(createBattleState(opts));
    const fighting = final.allies.length;
    if (fighting === 0) {
      totalWipeShare += 1;
      continue;
    }
    const downed = final.allies.filter((a) => a.hp <= 0).length;
    totalWipeShare += downed / fighting;
  }
  return totalWipeShare / RUNS > 0.5;
}

// Provisions a party can carry depends on the transport (mounts carry more).
export function foodCapacityFor(transport: TransportId | null): number {
  if (transport === "horse") return FOOD_DAYS_HORSE;
  if (transport === "pony") return FOOD_DAYS_PONY;
  return FOOD_DAYS_BASE;
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
  blockedIds: ReadonlySet<string> = new Set(),
): Character | null {
  const storyIds = AUTO_STORY_RECRUITS[locationId] ?? [];
  for (const id of storyIds) {
    if (party.includes(id) || AUTO_SKIP_RECRUITS.has(id) || blockedIds.has(id)) {
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

// Max HP pool from the two bulk stats: 5×strength + 5×defense.
export function maxHpFromStats(strength: number, defense: number): number {
  return strength * HEALTH_PER_STR + defense * HEALTH_PER_DEF;
}

// Resolve stored HP against the live max: a missing entry means full health, and
// the value is clamped to [0, maxHp] so a shrunken pool (e.g. an aura-granter
// fell) just caps current HP rather than retroactively wounding the survivor.
export function currentHp(maxHp: number, storedHp: number | undefined): number {
  return Math.max(0, Math.min(maxHp, storedHp ?? maxHp));
}

// Derive current stats from a character and how many days have been travelled.
export function computeCharacterStats(
  character: Character,
  ringDays: number,
  bearerId: string,
  hp: number | undefined,
  bonus: StatBonus,
): CharacterStats {
  const isBearer = character.id === bearerId;
  const s = effectiveStats(character, bonus);
  const maxHealth = maxHpFromStats(s.strength, s.defense);
  const health = currentHp(maxHealth, hp);

  const accumulated = (character.ringExposure ?? 0) * 100;
  const journeyCorruption = (ringDays / character.resilience) * 100;

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
