import {
  type DumpCalendarDay,
  dumpCalendar,
  dumpUser,
  stringField,
} from "../select-dump.js";
import type { ContributionsChip, ContributionsHeatmapWeek } from "./widget.js";

export const CONTRIBUTIONS_MAX_WEEKS = 53;

const MS_PER_DAY = 86_400_000;

export type ContributionsViewModel = {
  login: string;
  chips: ContributionsChip[];
  weeks: readonly ContributionsHeatmapWeek[];
  empty: boolean;
};

export type ContributionStreaks = {
  current: number;
  longest: number;
};

export function contributionsViewModel(
  payload: unknown,
): ContributionsViewModel {
  const calendar = dumpCalendar(payload);
  const login =
    stringField(dumpUser(payload)?.login) ||
    stringField(
      payload != null && typeof payload === "object"
        ? (payload as Record<string, unknown>).login
        : undefined,
    ) ||
    "octocat";
  if (calendar == null) {
    return { login, chips: [], weeks: [], empty: true };
  }
  const weeks = calendar.weeks.slice(-CONTRIBUTIONS_MAX_WEEKS).map((week) => ({
    days: week.days.map((day) => ({
      date: day.date,
      count: day.count,
      weekday: day.weekday,
    })),
  }));
  const streaks = contributionStreaks(flattenDays(weeks), utcAsOf());
  return {
    login,
    chips: [
      { label: "Total", value: formatCount(calendar.totalContributions) },
      { label: "Streak", value: String(streaks.current) },
      { label: "Longest", value: String(streaks.longest) },
    ],
    weeks,
    empty: false,
  };
}

export function contributionStreaks(
  days: readonly DumpCalendarDay[],
  asOf: string,
): ContributionStreaks {
  const past = days.filter(
    (day) => day.date === undefined || day.date === "" || day.date <= asOf,
  );
  let longest = 0;
  let run = 0;
  for (const [index, day] of past.entries()) {
    if (finiteCount(day.count) <= 0) {
      run = 0;
      continue;
    }
    const previous = past[index - 1];
    if (run > 0 && previous !== undefined && !daysAdjacent(previous, day)) {
      run = 1;
    } else {
      run += 1;
    }
    if (run > longest) {
      longest = run;
    }
  }
  let current = 0;
  for (let index = past.length - 1; index >= 0; index -= 1) {
    const day = past[index];
    if (day === undefined || finiteCount(day.count) <= 0) {
      break;
    }
    const next = past[index + 1];
    if (current > 0 && next !== undefined && !daysAdjacent(day, next)) {
      break;
    }
    current += 1;
  }
  return { current, longest };
}

function flattenDays(
  weeks: readonly ContributionsHeatmapWeek[],
): DumpCalendarDay[] {
  const days: DumpCalendarDay[] = [];
  for (const week of weeks) {
    for (const day of week.days) {
      days.push({
        date: day.date ?? "",
        count: day.count,
        weekday: day.weekday,
      });
    }
  }
  return days;
}

function daysAdjacent(left: DumpCalendarDay, right: DumpCalendarDay): boolean {
  const start = utcDay(left.date);
  const end = utcDay(right.date);
  if (start === undefined || end === undefined) {
    return true;
  }
  return end - start === MS_PER_DAY;
}

function utcDay(date: string): number | undefined {
  if (date === "") {
    return undefined;
  }
  const ms = Date.parse(`${date}T00:00:00.000Z`);
  return Number.isNaN(ms) ? undefined : ms;
}

function utcAsOf(): string {
  return new Date().toISOString().slice(0, 10);
}

function finiteCount(count: number): number {
  return Number.isFinite(count) ? Math.max(0, count) : 0;
}

function formatCount(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}k`;
  }
  return String(value);
}
