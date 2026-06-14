// Pure in-game calendar: day offsets from the quest's start date, month/season
// helpers. Day offset 0 = START_DATE; everything else derives from it.

export const START_DATE = { day: 23, month: 8, year: 3018 };

export const MONTHS_RU = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function getMonthLength(month: number, year: number): number {
  return month === 1 && isLeapYear(year) ? 29 : MONTH_LENGTHS[month];
}

export function getJourneyDate(dayOffset: number, months: string[] = MONTHS_RU): string {
  let day = START_DATE.day + dayOffset;
  let month = START_DATE.month;
  let year = START_DATE.year;

  while (day > getMonthLength(month, year)) {
    day -= getMonthLength(month, year);
    month += 1;

    if (month > 11) {
      month = 0;
      year += 1;
    }
  }

  return `${day} ${months[month]} ${year}`;
}

// 0-based month at a day offset (mirrors getJourneyDate's roll-over).
export function monthAt(dayOffset: number): number {
  let day = START_DATE.day + dayOffset;
  let month = START_DATE.month;
  let year = START_DATE.year;
  while (day > getMonthLength(month, year)) {
    day -= getMonthLength(month, year);
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  return month;
}

export type Season = "spring" | "summer" | "fall" | "winter";

export function seasonAt(dayOffset: number): Season {
  const month = monthAt(dayOffset); // 0 = January
  if (month >= 2 && month <= 4) {
    return "spring";
  }
  if (month >= 5 && month <= 7) {
    return "summer";
  }
  if (month >= 8 && month <= 10) {
    return "fall";
  }
  return "winter";
}

// Folder of location artwork per season. Spring/summer sets are partial — fall
// remains the fallback until every location has seasonal art.
export const SEASON_FOLDER: Record<Season, string> = {
  spring: "fall",
  summer: "fall",
  fall: "fall",
  winter: "winter",
};

// Month is 1-based (9 = сентябрь). Day offset 0 = START_DATE.
export function dateToDayOffset(day: number, month1Based: number, year: number): number {
  const targetMonth = month1Based - 1;
  let offset = 0;
  let d = START_DATE.day;
  let m = START_DATE.month;
  let y = START_DATE.year;

  while (!(y === year && m === targetMonth && d === day)) {
    offset += 1;
    d += 1;
    if (d > getMonthLength(m, y)) {
      d = 1;
      m += 1;
      if (m > 11) {
        m = 0;
        y += 1;
      }
    }
  }

  return offset;
}

export function isoDateToDayOffset(iso: string): number {
  const [year, month, day] = iso.split("-").map(Number);
  return dateToDayOffset(day, month, year);
}
