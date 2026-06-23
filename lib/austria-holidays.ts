/** Österreichische Feiertage (bundesweit + häufige Landesfeiertage). */

export type AustrianHoliday = {
  dateKey: string;
  label: string;
  nationwide: boolean;
};

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export function dateKeyFromParts(year: number, month: number, day: number) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function dateKeyFromDate(date: Date) {
  return dateKeyFromParts(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Ostersonntag — gregorianischer Algorithmus */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function fixedHoliday(year: number, month: number, day: number, label: string, nationwide = true) {
  return {
    dateKey: dateKeyFromParts(year, month, day),
    label,
    nationwide,
  } satisfies AustrianHoliday;
}

function movableHoliday(date: Date, label: string, nationwide = true) {
  return {
    dateKey: dateKeyFromDate(date),
    label,
    nationwide,
  } satisfies AustrianHoliday;
}

/** Feiertage für ein Kalenderjahr (Österreich). */
export function austrianHolidaysForYear(year: number): AustrianHoliday[] {
  const easter = easterSunday(year);
  return [
    fixedHoliday(year, 1, 1, "Neujahr"),
    fixedHoliday(year, 1, 6, "Heilige Drei Könige"),
    movableHoliday(addDays(easter, 1), "Ostermontag"),
    fixedHoliday(year, 5, 1, "Staatsfeiertag"),
    movableHoliday(addDays(easter, 39), "Christi Himmelfahrt"),
    movableHoliday(addDays(easter, 50), "Pfingstmontag"),
    movableHoliday(addDays(easter, 60), "Fronleichnam"),
    fixedHoliday(year, 8, 15, "Mariä Himmelfahrt", false),
    fixedHoliday(year, 10, 26, "Nationalfeiertag"),
    fixedHoliday(year, 11, 1, "Allerheiligen", false),
    fixedHoliday(year, 12, 8, "Mariä Empfängnis", false),
    fixedHoliday(year, 12, 25, "Christtag"),
    fixedHoliday(year, 12, 26, "Stefanitag"),
  ];
}

export function austrianHolidayMapForRange(startYear: number, endYear: number) {
  const map = new Map<string, AustrianHoliday>();
  for (let year = startYear; year <= endYear; year += 1) {
    for (const holiday of austrianHolidaysForYear(year)) {
      map.set(holiday.dateKey, holiday);
    }
  }
  return map;
}

const MONTH_NAMES = [
  "Jänner",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
] as const;

export function austrianMonthLabel(year: number, monthIndex: number) {
  return `${MONTH_NAMES[monthIndex]} ${year}`;
}

export const WEEKDAY_LABELS_AT = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as const;

export function isWeekendDate(date: Date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

/** Montag = 0 … Sonntag = 6 */
export function mondayBasedWeekday(date: Date) {
  return (date.getDay() + 6) % 7;
}

export type CalendarMonth = {
  year: number;
  monthIndex: number;
  label: string;
  weeks: Array<Array<CalendarDay | null>>;
};

export type CalendarDay = {
  date: Date;
  day: number;
  dateKey: string;
  isWeekend: boolean;
  isToday: boolean;
  holiday: AustrianHoliday | null;
};

export function buildCalendarMonth(
  year: number,
  monthIndex: number,
  holidayMap: Map<string, AustrianHoliday>,
  todayKey: string
): CalendarMonth {
  const first = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const leadingBlanks = mondayBasedWeekday(first);

  const cells: Array<CalendarDay | null> = [];
  for (let i = 0; i < leadingBlanks; i += 1) cells.push(null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, monthIndex, day);
    const dateKey = dateKeyFromDate(date);
    cells.push({
      date,
      day,
      dateKey,
      isWeekend: isWeekendDate(date),
      isToday: dateKey === todayKey,
      holiday: holidayMap.get(dateKey) ?? null,
    });
  }

  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: Array<Array<CalendarDay | null>> = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return {
    year,
    monthIndex,
    label: austrianMonthLabel(year, monthIndex),
    weeks,
  };
}

export function buildCalendarMonths(startYear: number, startMonth: number, count: number, today = new Date()) {
  const end = new Date(startYear, startMonth + count, 0);
  const holidayMap = austrianHolidayMapForRange(startYear, end.getFullYear());
  const todayKey = dateKeyFromDate(today);
  const months: CalendarMonth[] = [];

  for (let i = 0; i < count; i += 1) {
    const cursor = new Date(startYear, startMonth + i, 1);
    months.push(buildCalendarMonth(cursor.getFullYear(), cursor.getMonth(), holidayMap, todayKey));
  }

  return months;
}
