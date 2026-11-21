export interface EvaluationWeekdayMeta {
  day: number; // 0 = Sun, 1 = Mon, ..., 6 = Sat (matches Date.getUTCDay())
  label: string;
  short: string;
}

// Arabic calendar week order starting Saturday
export const EVALUATION_WEEKDAYS: readonly EvaluationWeekdayMeta[] = [
  { day: 6, label: 'السبت', short: 'سبت' },
  { day: 0, label: 'الأحد', short: 'أحد' },
  { day: 1, label: 'الإثنين', short: 'إثنين' },
  { day: 2, label: 'الثلاثاء', short: 'ثلاثاء' },
  { day: 3, label: 'الأربعاء', short: 'أربعاء' },
  { day: 4, label: 'الخميس', short: 'خميس' },
  { day: 5, label: 'الجمعة', short: 'جمعة' },
] as const;

export const ALL_EVALUATION_DAYS: readonly number[] = [0, 1, 2, 3, 4, 5, 6];

export const WEEKDAY_AR_BY_INDEX: Record<number, string> = {
  0: 'الأحد',
  1: 'الإثنين',
  2: 'الثلاثاء',
  3: 'الأربعاء',
  4: 'الخميس',
  5: 'الجمعة',
  6: 'السبت',
};

export function normalizeEvaluationDays(raw: unknown): number[] {
  let list: unknown[] = [];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) list = parsed;
    } catch {
      list = raw.split(',').map(s => s.trim());
    }
  }

  const valid = Array.from(
    new Set(
      list
        .map(v => Number(v))
        .filter(n => Number.isInteger(n) && n >= 0 && n <= 6)
    )
  ).sort((a, b) => a - b);

  return valid.length > 0 ? valid : [...ALL_EVALUATION_DAYS];
}

export function parseYMD(dateStr: string): { year: number; month: number; day: number } | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const match = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

export function formatYMD(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function getWeekdayUTC(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function getDaysInMonthUTC(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function getTodayLocalYMD(): string {
  const now = new Date();
  return formatYMD(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function getArabicWeekdayForDate(dateStr: string): string {
  const parsed = parseYMD(dateStr);
  if (!parsed) return '';
  const wd = getWeekdayUTC(parsed.year, parsed.month, parsed.day);
  return WEEKDAY_AR_BY_INDEX[wd] || '';
}

export interface MonthEvaluationDateItem {
  dateStr: string;
  day: number;
  weekday: number;
  weekdayLabel: string;
}

export function getEvaluationDatesForMonth(
  year: number,
  month: number,
  evaluationDays?: unknown
): MonthEvaluationDateItem[] {
  const allowed = new Set(normalizeEvaluationDays(evaluationDays));
  const totalDays = getDaysInMonthUTC(year, month);
  const items: MonthEvaluationDateItem[] = [];

  for (let d = 1; d <= totalDays; d++) {
    const wd = getWeekdayUTC(year, month, d);
    if (allowed.has(wd)) {
      items.push({
        dateStr: formatYMD(year, month, d),
        day: d,
        weekday: wd,
        weekdayLabel: WEEKDAY_AR_BY_INDEX[wd] || '',
      });
    }
  }
  return items;
}

/**
 * Snaps a YYYY-MM-DD date to the nearest allowed evaluation weekday within the same calendar month.
 * If the date already falls on an allowed weekday, it is returned unchanged.
 */
export function snapDateToNearestEvaluationDay(
  dateStr: string,
  evaluationDays?: unknown
): string {
  const parsed = parseYMD(dateStr);
  if (!parsed) return dateStr;

  const allowedList = normalizeEvaluationDays(evaluationDays);
  if (allowedList.length >= 7) return dateStr;
  const allowed = new Set(allowedList);

  const { year, month, day } = parsed;
  const maxDay = getDaysInMonthUTC(year, month);
  const clampedDay = Math.min(Math.max(1, day), maxDay);

  if (allowed.has(getWeekdayUTC(year, month, clampedDay))) {
    return formatYMD(year, month, clampedDay);
  }

  for (let delta = 1; delta <= maxDay; delta++) {
    const prevDay = clampedDay - delta;
    const nextDay = clampedDay + delta;
    const prevValid = prevDay >= 1 && allowed.has(getWeekdayUTC(year, month, prevDay));
    const nextValid = nextDay <= maxDay && allowed.has(getWeekdayUTC(year, month, nextDay));

    if (nextValid && !prevValid) return formatYMD(year, month, nextDay);
    if (prevValid && !nextValid) return formatYMD(year, month, prevDay);
    if (nextValid && prevValid) return formatYMD(year, month, nextDay);
  }

  return formatYMD(year, month, clampedDay);
}

/**
 * Returns the next allowed evaluation date strictly after dateStr within the same month, or null if none.
 */
export function getNextEvaluationDateInMonth(
  dateStr: string,
  evaluationDays?: unknown
): string | null {
  const parsed = parseYMD(dateStr);
  if (!parsed) return null;
  const allowed = new Set(normalizeEvaluationDays(evaluationDays));
  const maxDay = getDaysInMonthUTC(parsed.year, parsed.month);
  for (let d = parsed.day + 1; d <= maxDay; d++) {
    if (allowed.has(getWeekdayUTC(parsed.year, parsed.month, d))) {
      return formatYMD(parsed.year, parsed.month, d);
    }
  }
  return null;
}

export function formatEvaluationDaysSummary(evaluationDays?: unknown): string {
  const normalized = normalizeEvaluationDays(evaluationDays);
  if (normalized.length === 7) return 'جميع أيام الأسبوع';
  const ordered = EVALUATION_WEEKDAYS.filter(w => normalized.includes(w.day));
  return ordered.map(w => w.label).join('، ');
}
