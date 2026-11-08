/**
 * LeetCode widgets select from the cached GraphQL dump.
 * Extra keys MUST NOT fail. Widgets MUST NOT perform HTTP.
 */

import type { HeatmapWeek } from "@profile-bits/bits";

export type SolvedRow = {
  label: string;
  value: number;
};

export function asDumpRecord(value: unknown): Record<string, unknown> | null {
  if (value != null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function solvedRows(payload: unknown): SolvedRow[] {
  const dump = asDumpRecord(payload);
  const user = asDumpRecord(dump?.matchedUser);
  const stats = asDumpRecord(user?.submitStatsGlobal);
  const list = stats?.acSubmissionNum;
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
