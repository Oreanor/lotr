// Turns the dry structured chronicle log into a human retelling: events are
// grouped into legs (a town and the road that led there), then narrated as a
// couple of plain-language paragraphs with varied phrasing. Deliberately not
// epic — it should read like a player briefly recounting their run.
import { getJourneyDate } from "@/game/calendar";
import type { ChronicleEntry } from "@/game/types";

export interface ChronicleBlock {
  title: string;
  paragraphs: string[];
}

type Lang = "ru" | "en";

// A stable per-event seed so variant choice never flickers between renders.
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return h;
}
function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length];
}

// Russian count agreement for a few nouns we need.
function ruPlural(n: number, one: string, few: string, many: string): string {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return `${n} ${one}`;
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return `${n} ${few}`;
  return `${n} ${many}`;
}
const ruDays = (n: number) => ruPlural(n, "день", "дня", "дней");
const ruItems = (n: number) => ruPlural(n, "предмет", "предмета", "предметов");
const ruTimes = (n: number) =>
  n === 2 ? "дважды" : n === 3 ? "трижды" : n === 4 ? "четырежды" : `${n} раз`;
const enTimes = (n: number) =>
  n === 2 ? "twice" : n === 3 ? "three times" : n === 4 ? "four times" : `${n} times`;

const BATTLE_KEYS = new Set(["battleWon", "battleWonLosses", "battleLost"]);
const isRoadBattle = (e: ChronicleEntry) => e.at == null && BATTLE_KEYS.has(e.key);

interface Leg {
  townId: number | null;
  place: string | null;
  entries: ChronicleEntry[];
}

// Split the flat log into legs. Road events buffer as the approach to the next
// town; an arrival opens a block (approach + arrival); in-town events stay with
// their town. Leftover road events become a trailing "on the road" block.
function groupLegs(entries: ChronicleEntry[]): Leg[] {
  const legs: Leg[] = [];
  let approach: ChronicleEntry[] = [];
  let current: Leg | null = null;
  for (const e of entries) {
    if (e.key === "arrive") {
      current = {
        townId: e.at ?? null,
        place: (e.params?.place as string) ?? null,
        entries: [...approach, e],
      };
      legs.push(current);
      approach = [];
    } else if (e.at != null) {
      if (current && current.townId === e.at) {
        current.entries.push(e);
      } else {
        current = { townId: e.at, place: null, entries: [e] };
        legs.push(current);
      }
    } else {
      approach.push(e);
    }
  }
  if (approach.length > 0) {
    legs.push({ townId: null, place: null, entries: approach });
  }
  return legs;
}

function dateRange(d0: number, d1: number, months: string[]): string {
  const end = getJourneyDate(d1, months);
  if (d0 === d1) return end;
  const start = getJourneyDate(d0, months);
  const s = start.split(" ");
  const e = end.split(" ");
  // Same month + year → "25–27 сентября 3018"; otherwise spell both out.
  if (s[1] === e[1] && s[2] === e[2]) {
    return `${s[0]}–${e[0]} ${e[1]} ${e[2]}`;
  }
  return `${start} – ${end}`;
}

// ----- phrasing pools, per language ---------------------------------------

const P = (e: ChronicleEntry) => e.params ?? {};

// Russian past-tense verbs agree with their subject's gender. We can't decline
// foreign proper nouns, but we CAN keep a name in the nominative (as a subject or
// a dash-appositive after a fixed head noun) and just pick the right verb form —
// so we only need one bit per name: is it feminine? Everything else is masculine.
// Keyed by display name because the narrator only ever sees resolved names, not
// ids; when adding a feminine companion, update `FEMALE_IDS` in game/data.ts too.
const RU_FEMININE = new Set(["Галадриэль", "Арвен", "Эовин", "Голдберри", "Шелоб"]);
const gv = (name: unknown, masc: string, fem: string) =>
  RU_FEMININE.has(String(name)) ? fem : masc;

function ruSentence(e: ChronicleEntry, seed: number): string {
  const p = P(e);
  switch (e.key) {
    case "recruit":
      return pick(
        [
          `${p.name} ${gv(p.name, "присоединился", "присоединилась")} к отряду.`,
          `${p.name} ${gv(p.name, "пошёл", "пошла")} с ними.`,
          `Так к спутникам ${gv(p.name, "прибавился", "прибавилась")} ${p.name}.`,
        ],
        seed,
      );
    case "battleWon":
      return pick(
        [`Отряд одолел противника — ${p.foe}.`, `Отряд справился с врагом — ${p.foe}.`],
        seed,
      );
    case "battleWonLosses":
      return `Отряд одолел врага — ${p.foe}, но не обошлось без потерь: ${p.fallen}.`;
    case "battleLost":
      return `Бой был проигран.`;
    case "deathHunger":
      return pick(
        [
          `${p.name} ${gv(p.name, "умер", "умерла")} от голода.`,
          `${p.name} не ${gv(p.name, "пережил", "пережила")} голода.`,
        ],
        seed,
      );
    case "gift":
      return pick(
        [
          `${p.name} ${gv(p.name, "принёс", "принесла")} дар — ${p.item}.`,
          `${p.name} ${gv(p.name, "поделился", "поделилась")} с отрядом: теперь у него есть ${p.item}.`,
        ],
        seed,
      );
    case "giftCloaks":
      return `${p.name} ${gv(p.name, "подарил", "подарила")} отряду эльфийские плащи.`;
    case "found":
      return pick(
        [
          `Здесь отряд кое-что нашёл — ${p.item}.`,
          `На месте отыскалась находка — ${p.item}.`,
        ],
        seed,
      );
    case "foundCache":
      return `В руинах отыскался целый гондорский арсенал — снаряжение на ${ruItems(Number(p.count))}.`;
    case "foundArmory":
      return `В арсенале нашлось снаряжение на ${ruItems(Number(p.count))}.`;
    case "equip":
      return `Обновку ${gv(p.name, "получил", "получила")} ${p.name} — ${p.item}.`;
    case "bearerHandoff":
      return `${p.from} ${gv(p.from, "расстался", "рассталась")} с Кольцом: порча уже достигла ${p.corruption}%. Его ${gv(p.name, "принял", "приняла")} ${p.name} — как попытку снять с прежнего носителя часть тяжести.`;
    case "bearerTake":
      return `Кольцо ${gv(p.name, "принял", "приняла")} ${p.name}.`;
    case "bearerBroke":
      return `${p.name} не ${gv(p.name, "выдержал", "выдержала")} тяжести Кольца и ${gv(p.name, "бежал", "бежала")} с ним в сторону Ородруина.`;
    case "betrayal":
      return `${p.name} ${gv(p.name, "поддался", "поддалась")} Кольцу и ${gv(p.name, "напал", "напала")} на носителя.`;
    case "betrayalFled":
      return `${p.name} ${gv(p.name, "завладел", "завладела")} Кольцом и ${gv(p.name, "скрылся", "скрылась")}, устремившись к Ородруину.`;
    case "gandalfFell":
      return `Гэндальф Серый пал в бою.`;
    case "deadSummoned":
      return `У Эреха Арагорн призвал Мёртвых.`;
    case "sarumanSpared":
      return p.advocate
        ? `После того как Сарумана сломили, за него ${gv(p.advocate, "вступился", "вступилась")} ${p.advocate} — и его решили отпустить.`
        : `Сломленного Сарумана решили пощадить.`;
    case "sarumanFightOn":
      return p.advocate
        ? `${p.advocate} ${gv(p.advocate, "просил", "просила")} пощадить Сарумана, но отряд решил довести бой до конца.`
        : `Сарумана решили добить.`;
    case "denethorPyre":
      return `Наместник Денетор в отчаянии предал себя огню.`;
    case "corsairPeace":
      return `С корсарами Умбара удалось договориться о мире.`;
    case "bossSlain":
      return `В тяжёлом бою отряд одолел могучего врага — ${p.foe}.`;
    case "ringDestroyed":
      return `Кольцо полетело в Роковую расселину — и было уничтожено.`;
    case "ringGollum":
      return `Голлум вырвал Кольцо и сорвался с ним в Огонь — Кольцо было уничтожено.`;
    case "ringClaimed":
      return `${p.name} ${gv(p.name, "надел", "надела")} Кольцо и ${gv(p.name, "объявил", "объявила")} себя новым правителем.`;
    case "board_ship":
      return `Отряд сел на корабль.`;
    case "board_horse":
      return pick([`Отряд пересел на коней, чтобы двигаться быстрее.`, `Дальше пошли на конях.`], seed);
    case "board_pony":
      return `Отряд взял пони, чтобы идти быстрее.`;
    case "board_eagle":
      return `Отряд поднялся в воздух на Орлах.`;
    case "disembark":
      return `Отряд сошёл на берег.`;
    case "landEagle":
      return `Орлы опустили отряд на землю.`;
    case "dismount":
      return `Дальше пошли пешком.`;
    case "supplies":
      return pick(
        [
          `Здесь запаслись едой — её стало заметно больше.`,
          `Припасы пополнили, и запас еды вырос на ${ruDays(Number(p.days))}.`,
        ],
        seed,
      );
    case "levelMilestone":
      return `К этому времени отряд заметно окреп — средний уровень дошёл до ${p.level}-го.`;
    default:
      return "";
  }
}

// The place name lives in the block title (nominative, no declension needed), so
// the arrival line refers to it with сюда/здесь and never declines it. Day counts
// sit in accusative slots ("за N", "через N", "N спустя"), which ruDays gives.
function ruArrival(e: ChronicleEntry, seed: number, isFirst: boolean): string {
  const days = Number(P(e).days) || 0;
  if (isFirst) {
    return pick([`Путь начался здесь.`, `Всё началось отсюда.`], seed);
  }
  if (days <= 0) {
    return pick([`Отряд снова оказался здесь.`, `Отряд задержался тут.`], seed);
  }
  return pick(
    [
      `Отряд добрался сюда за ${ruDays(days)}.`,
      `Дорога сюда заняла ${ruDays(days)}.`,
      `Через ${ruDays(days)} пути отряд был уже на месте.`,
      `${ruDays(days)} спустя путники были тут.`,
    ],
    seed,
  );
}

function ruRoadBattles(batch: ChronicleEntry[], seed: number): string {
  if (batch.length === 1) {
    const b = batch[0];
    const foe = b.params?.foe;
    if (b.key === "battleLost") return `По дороге отряд уступил в бою врагу — ${foe}.`;
    if (b.key === "battleWonLosses")
      return `По дороге отряд отбился от врага — ${foe}, но не обошлось без потерь: ${b.params?.fallen}.`;
    return pick(
      [`По дороге отряд отбился от врага — ${foe}.`, `По пути пришлось отогнать врага — ${foe}.`],
      seed,
    );
  }
  const fallen = batch
    .filter((b) => b.key === "battleWonLosses")
    .map((b) => b.params?.fallen)
    .filter(Boolean)
    .join(", ");
  let s = `Дорога выдалась неспокойной: пришлось ${ruTimes(batch.length)} браться за оружие.`;
  if (fallen) s += ` Не обошлось без потерь: ${fallen}.`;
  return s;
}

function enSentence(e: ChronicleEntry, seed: number): string {
  const p = P(e);
  switch (e.key) {
    case "recruit":
      return pick([`${p.name} joined the party.`, `${p.name} threw in with them.`], seed);
    case "battleWon":
      return pick([`They beat ${p.foe}.`, `${p.foe} was cut down.`], seed);
    case "battleWonLosses":
      return `They beat ${p.foe}, but lost ${p.fallen}.`;
    case "battleLost":
      return `The fight with ${p.foe} was lost.`;
    case "deathHunger":
      return pick([`${p.name} starved to death.`, `Hunger took ${p.name}.`], seed);
    case "gift":
      return pick([`${p.name} handed over ${p.item}.`, `${p.name} gave them ${p.item}.`], seed);
    case "giftCloaks":
      return `${p.name} gave the party elven cloaks.`;
    case "found":
      return pick([`They found ${p.item} here.`, `${p.item} turned up here.`], seed);
    case "foundCache":
      return `A whole Gondorian armoury turned up in the ruins — gear for ${p.count} pieces.`;
    case "foundArmory":
      return `The armoury yielded gear for ${p.count} pieces.`;
    case "equip":
      return `${p.item} went to ${p.name}.`;
    case "bearerHandoff":
      return `The Ring passed to ${p.name}: the former bearer's corruption had already reached ${p.corruption}%, so it was an attempt to ease his burden.`;
    case "bearerTake":
      return `${p.name} took up the Ring.`;
    case "bearerBroke":
      return `${p.name} broke under the Ring's weight and fled with it toward Mount Doom.`;
    case "betrayal":
      return `${p.name} gave in to the Ring and turned on the bearer.`;
    case "betrayalFled":
      return `${p.name} seized the Ring and vanished, making for Mount Doom.`;
    case "gandalfFell":
      return `Gandalf the Grey fell in battle.`;
    case "deadSummoned":
      return `At Erech, Aragorn summoned the Dead.`;
    case "sarumanSpared":
      return p.advocate
        ? `Once Saruman was broken, ${p.advocate} spoke for him — and they let him go.`
        : `The broken Saruman was spared.`;
    case "sarumanFightOn":
      return p.advocate
        ? `${p.advocate} pleaded for Saruman, but they chose to finish the fight.`
        : `They chose to finish Saruman off.`;
    case "denethorPyre":
      return `In despair, Steward Denethor gave himself to the fire.`;
    case "corsairPeace":
      return `They made peace with the Corsairs of Umbar.`;
    case "bossSlain":
      return `After a hard fight, ${p.foe} was slain.`;
    case "ringDestroyed":
      return `The Ring went into the Crack of Doom — and was unmade.`;
    case "ringGollum":
      return `Gollum seized the Ring and toppled into the Fire with it — the Ring was unmade.`;
    case "ringClaimed":
      return `${p.name} put on the Ring and claimed it, a new Dark Lord.`;
    case "board_ship":
      return `The party took ship.`;
    case "board_horse":
      return `They took to horses to move faster.`;
    case "board_pony":
      return `They took ponies to move faster.`;
    case "board_eagle":
      return `The Eagles bore them up.`;
    case "disembark":
      return `They went ashore.`;
    case "landEagle":
      return `The Eagles set them down.`;
    case "dismount":
      return `They went on foot from there.`;
    case "supplies":
      return `They stocked up here — supplies grew by ${p.days} days.`;
    case "levelMilestone":
      return `By now the party had grown notably stronger — average level reached ${p.level}.`;
    default:
      return "";
  }
}

function enArrival(e: ChronicleEntry, seed: number, isFirst: boolean): string {
  const p = P(e);
  const place = p.place as string;
  const days = Number(p.days) || 0;
  if (isFirst) return `The road began in ${place}.`;
  if (days <= 0) return `The party lingered in ${place}.`;
  return pick(
    [
      `After ${days} days on the road they reached ${place}.`,
      `${days} days later the road brought them to ${place}.`,
      `The trek to ${place} took ${days} days.`,
    ],
    seed,
  );
}

function enRoadBattles(batch: ChronicleEntry[], seed: number): string {
  if (batch.length === 1) {
    const b = batch[0];
    const foe = b.params?.foe;
    if (b.key === "battleLost") return `On the way, the party was beaten by ${foe}.`;
    if (b.key === "battleWonLosses")
      return `On the road they fought off ${foe}, but lost ${b.params?.fallen}.`;
    return pick([`On the road they fought off ${foe}.`, `The party ran into ${foe} and drove it off.`], seed);
  }
  const fallen = batch
    .filter((b) => b.key === "battleWonLosses")
    .map((b) => b.params?.fallen)
    .filter(Boolean)
    .join(", ");
  let s = `The road was uneasy: they had to fight ${enTimes(batch.length)}.`;
  if (fallen) s += ` The party lost ${fallen}.`;
  return s;
}

// ----- assembly ------------------------------------------------------------

interface Sentence {
  text: string;
  day: number;
}

function narrateLeg(leg: Leg, lang: Lang, isFirst: boolean): { sentences: Sentence[]; arrivalIdx: number } {
  const sentence = lang === "ru" ? ruSentence : enSentence;
  const arrival = lang === "ru" ? ruArrival : enArrival;
  const roadBattles = lang === "ru" ? ruRoadBattles : enRoadBattles;
  const out: Sentence[] = [];
  const items = leg.entries;
  let arrivalIdx = -1;
  let i = 0;
  while (i < items.length) {
    const e = items[i];
    if (isRoadBattle(e)) {
      let j = i;
      const batch: ChronicleEntry[] = [];
      while (j < items.length && isRoadBattle(items[j])) {
        batch.push(items[j]);
        j += 1;
      }
      out.push({ text: roadBattles(batch, hash(e.key) + e.day), day: batch[batch.length - 1].day });
      i = j;
      continue;
    }
    if (e.key === "arrive") {
      arrivalIdx = out.length;
      out.push({ text: arrival(e, hash(e.key) + e.day, isFirst), day: e.day });
      i += 1;
      continue;
    }
    const text = sentence(e, hash(e.key) + e.day * 7 + i * 13);
    if (text) out.push({ text, day: e.day });
    i += 1;
  }
  // No explicit arrival (a road-only or stray in-town block): the whole first
  // run of sentences is the lead paragraph.
  if (arrivalIdx < 0) arrivalIdx = 0;
  return { sentences: out, arrivalIdx };
}

// Group a leg's sentences into paragraphs: the approach + arrival lead paragraph,
// then a fresh paragraph whenever the day advances (so a stay that spans several
// days reads as separate beats, like the example).
function paragraphsFrom(sentences: Sentence[], arrivalIdx: number): string[] {
  const paras: string[] = [];
  const lead = sentences.slice(0, arrivalIdx + 1);
  if (lead.length > 0) {
    paras.push(lead.map((s) => s.text).join(" "));
  }
  let buf: Sentence[] = [];
  let bufDay = -1;
  const flush = () => {
    if (buf.length > 0) paras.push(buf.map((s) => s.text).join(" "));
    buf = [];
  };
  for (const s of sentences.slice(arrivalIdx + 1)) {
    if (buf.length > 0 && s.day !== bufDay) {
      flush();
    }
    buf.push(s);
    bufDay = s.day;
  }
  flush();
  return paras.filter(Boolean);
}

export function buildChronicle(
  entries: ChronicleEntry[],
  lang: string,
  months: string[],
): ChronicleBlock[] {
  const l: Lang = lang === "en" ? "en" : "ru";
  const legs = groupLegs(entries);
  const blocks: ChronicleBlock[] = [];
  legs.forEach((leg, idx) => {
    const { sentences, arrivalIdx } = narrateLeg(leg, l, idx === 0);
    if (sentences.length === 0) return;
    const days = leg.entries.map((e) => e.day);
    const d0 = Math.min(...days);
    const d1 = Math.max(...days);
    const town = leg.place ?? (l === "ru" ? "в пути" : "on the road");
    blocks.push({
      title: `${dateRange(d0, d1, months)} — ${town}`,
      paragraphs: paragraphsFrom(sentences, arrivalIdx),
    });
  });
  return blocks;
}
