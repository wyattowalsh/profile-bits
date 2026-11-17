/**
 * LeetCode widgets select from the cached GraphQL dump.
 * Extra keys MUST NOT fail. Widgets MUST NOT perform HTTP.
 */

import type { HeatmapWeek } from "@profile-bits/bits";

export type SolvedRow = {
  label: string;
  value: number;
};

/** Solved count against `allQuestionsCount` for the same difficulty. */
export type SolvedMeter = {
  label: string;
  value: number;
  max: number;
};

const OVERALL_DIFFICULTY = "All";

export function asDumpRecord(value: unknown): Record<string, unknown> | null {
  if (value != null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function countRows(list: unknown): SolvedRow[] {
  if (!Array.isArray(list)) {
    return [];
  }
  const rows: SolvedRow[] = [];
  for (const item of list) {
    const record = asDumpRecord(item);
    if (record == null) {
      continue;
    }
    const label = record.difficulty;
    const value = record.count;
    if (typeof label !== "string" || label === "") {
      continue;
    }
    if (typeof value !== "number" || !Number.isFinite(value)) {
      continue;
    }
    rows.push({ label, value });
  }
  return rows;
}

export function solvedRows(payload: unknown): SolvedRow[] {
  const dump = asDumpRecord(payload);
  const user = asDumpRecord(dump?.matchedUser);
  const stats = asDumpRecord(user?.submitStatsGlobal);
  return countRows(stats?.acSubmissionNum);
}

function questionTotals(payload: unknown): SolvedRow[] {
  const dump = asDumpRecord(payload);
  if (dump != null && "allQuestionsCount" in dump) {
    return countRows(dump.allQuestionsCount);
  }
  const user = asDumpRecord(dump?.matchedUser);
  if (user != null && "allQuestionsCount" in user) {
    return countRows(user.allQuestionsCount);
  }
  return [];
}

/**
 * Completion meters use solved `count` and `allQuestionsCount`.
 * `submissions` is not an acceptance percentage and is not used.
 */
export function solvedMeters(payload: unknown): SolvedMeter[] {
  const totals = new Map<string, number>();
  for (const row of questionTotals(payload)) {
    if (!totals.has(row.label) && row.value > 0) {
      totals.set(row.label, row.value);
    }
  }
  const meters: SolvedMeter[] = [];
  for (const row of solvedRows(payload)) {
    if (row.label === OVERALL_DIFFICULTY) {
      continue;
    }
    const max = totals.get(row.label);
    if (max === undefined) {
      continue;
    }
    meters.push({
      label: `${row.label} / ${String(max)}`,
      value: row.value,
      max,
    });
  }
  return meters;
}

/** Positive non-All difficulties. One part is not a split. */
export function solvedSplit(payload: unknown): SolvedRow[] {
  const parts = solvedRows(payload).filter(
    (row) => row.label !== OVERALL_DIFFICULTY && row.value > 0,
  );
  return parts.length >= 2 ? parts : [];
}

function calendarValue(payload: unknown): unknown {
  const dump = asDumpRecord(payload);
  const calendar = asDumpRecord(dump?.userCalendar);
  if (calendar != null && "submissionCalendar" in calendar) {
    return calendar.submissionCalendar;
  }
  const user = asDumpRecord(dump?.matchedUser);
  return user?.submissionCalendar;
}

function countsFromCalendar(value: unknown): Record<string, number> | null {
  let parsed = value;
  if (typeof parsed === "string") {
    if (parsed.trim() === "") {
      return null;
    }
    try {
      parsed = JSON.parse(parsed) as unknown;
    } catch {
      return null;
    }
  }
  const record = asDumpRecord(parsed);
  if (record == null) {
    return null;
  }
  const counts: Record<string, number> = {};
  for (const [key, count] of Object.entries(record)) {
    if (typeof count === "number" && Number.isFinite(count) && count > 0) {
      counts[key] = count;
    }
  }
  return Object.keys(counts).length > 0 ? counts : null;
}

export function submissionWeeks(payload: unknown): HeatmapWeek[] {
  const counts = countsFromCalendar(calendarValue(payload));
  if (counts == null) {
    return [];
  }
  const days = Object.entries(counts)
    .map(([key, count]) => {
      const seconds = Number(key);
      const date =
        Number.isFinite(seconds) && seconds > 10_000_000
          ? new Date(seconds * 1000)
          : new Date(key);
      return { date, count };
    })
    .filter((day) => !Number.isNaN(day.date.getTime()))
    .toSorted((a, b) => a.date.getTime() - b.date.getTime());
  const grouped = new Map<string, HeatmapWeek["days"][number][]>();
  for (const day of days) {
    const weekday = day.date.getUTCDay();
    const start = new Date(day.date);
    start.setUTCDate(start.getUTCDate() - weekday);
    const key = start.toISOString().slice(0, 10);
    const list = grouped.get(key) ?? [];
    list.push({
      date: day.date.toISOString().slice(0, 10),
      count: day.count,
      weekday,
    });
    grouped.set(key, list);
  }
  return [...grouped.values()]
    .slice(-26)
    .map((weekDays) => ({ days: weekDays }));
}
