import type { CodingRange } from "@profile-bits/core";
import { assertSafeApiDomain } from "./api-domain.js";
import {
  parseAllTimeSinceToday,
  parseGoals,
  parseStatusbarToday,
  parseSummaries,
  type WakatimeDump,
  type WakatimeDumpExtras,
} from "./extra-payload.js";
import type { WakatimeStatsData } from "./payload.js";

export const WAKATIME_CLOUD_CURRENT =
  "https://wakatime.com/api/v1/users/current";

export const WAKATIME_CLOUD_EXTRA_PATHS = [
  "all_time_since_today",
  "summaries",
  "statusbar/today",
  "goals",
] as const;

export type WakatimeCloudExtraPath =
  (typeof WAKATIME_CLOUD_EXTRA_PATHS)[number];

export type ExtraHttpOutcome = "include" | "omit" | "fail_run" | "retry";

export type ExtraGetResult = { kind: "ok"; body: unknown } | { kind: "omit" };

export type ExtraGetter = (
  url: URL,
  params: Readonly<Record<string, string>>,
) => Promise<ExtraGetResult>;

const ISO_DATE = /^(\d{4}-\d{2}-\d{2})/;
const FORBIDDEN_EXTRA_PATH = /heartbeats|durations|insights/i;

export type DateWindow = {
  start: string;
  end: string;
};

export function isWakatimeCloud(apiDomain: string): boolean {
  return assertSafeApiDomain(apiDomain) === "wakatime.com";
}

export function classifyWakatimeExtraHttp(status: number): ExtraHttpOutcome {
  if (status === 200) {
    return "include";
  }
  if (status === 401) {
    return "fail_run";
  }
  if (status === 402 || status === 403 || status === 404 || status === 400) {
    return "omit";
  }
  if (
    status === 429 ||
    status === 302 ||
    status === 202 ||
    (status >= 500 && status <= 599)
  ) {
    return "retry";
  }
  return "omit";
}

export function isoDatePrefix(value: string | undefined): string | undefined {
  if (value == null) {
    return undefined;
  }
  const match = ISO_DATE.exec(value.trim());
  return match?.[1];
}

export function summariesWindow(
  range: CodingRange,
  stats: Pick<WakatimeStatsData, "start" | "end">,
  now: Date = new Date(),
): DateWindow {
  const start = isoDatePrefix(stats.start);
  const end = isoDatePrefix(stats.end);
  if (start != null && end != null && start <= end) {
    return { start, end };
  }
  return windowFromRange(range, now);
}

function utcYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function utcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function windowFromRange(range: CodingRange, now: Date): DateWindow {
  const end = utcDay(now);
  const start = new Date(end);
  if (range === "last_7_days") {
    start.setUTCDate(start.getUTCDate() - 6);
  } else if (range === "last_30_days") {
    start.setUTCDate(start.getUTCDate() - 29);
  } else if (range === "last_6_months") {
    start.setUTCMonth(start.getUTCMonth() - 6);
  } else {
    start.setUTCFullYear(start.getUTCFullYear() - 1);
  }
  return { start: utcYmd(start), end: utcYmd(end) };
}

export function resolveCloudExtraUrl(
  path: WakatimeCloudExtraPath,
  query?: Readonly<Record<string, string>>,
): URL {
  if (FORBIDDEN_EXTRA_PATH.test(path)) {
    throw new Error("WakaTime extra path is not allowed");
  }
  const url = new URL(`${WAKATIME_CLOUD_CURRENT}/${path}`);
  if (query != null) {
    for (const [key, value] of Object.entries(query)) {
      if (key === "api_key" || key === "key") {
        continue;
      }
      url.searchParams.set(key, value);
    }
  }
  if (url.searchParams.has("api_key") || url.searchParams.has("key")) {
    url.searchParams.delete("api_key");
    url.searchParams.delete("key");
  }
  return url;
}

export function extraUrlIsForbidden(url: URL): boolean {
  return FORBIDDEN_EXTRA_PATH.test(`${url.pathname}${url.search}`);
}

export function mergeWakatimeDump(
  stats: WakatimeStatsData,
  extras: WakatimeDumpExtras,
): WakatimeDump {
  return {
    ...stats,
    ...(extras.all_time_since_today != null
      ? { all_time_since_today: extras.all_time_since_today }
      : {}),
    ...(extras.summaries != null ? { summaries: extras.summaries } : {}),
    ...(extras.statusbar_today != null
      ? { statusbar_today: extras.statusbar_today }
      : {}),
    ...(extras.goals != null ? { goals: extras.goals } : {}),
  };
}

export async function loadCloudExtras(input: {
  stats: WakatimeStatsData;
  range: CodingRange;
  get: ExtraGetter;
  now?: Date;
}): Promise<WakatimeDumpExtras> {
  const bounds = summariesWindow(input.range, input.stats, input.now);
  const allTimeUrl = resolveCloudExtraUrl("all_time_since_today");
  const summariesUrl = resolveCloudExtraUrl("summaries", {
    start: bounds.start,
    end: bounds.end,
  });
  const statusbarUrl = resolveCloudExtraUrl("statusbar/today");
  const goalsUrl = resolveCloudExtraUrl("goals");

  const [allTime, summaries, statusbar, goals] = await Promise.all([
    loadOne(input.get, allTimeUrl, {}, parseAllTimeSinceToday),
    loadOne(
      input.get,
      summariesUrl,
      { start: bounds.start, end: bounds.end },
      parseSummaries,
    ),
    loadOne(input.get, statusbarUrl, {}, parseStatusbarToday),
    loadOne(input.get, goalsUrl, {}, parseGoals),
  ]);

  const extras: WakatimeDumpExtras = {};
  if (allTime != null) {
    extras.all_time_since_today = allTime;
  }
  if (summaries != null) {
    extras.summaries = summaries;
  }
  if (statusbar != null) {
    extras.statusbar_today = statusbar;
  }
  if (goals != null) {
    extras.goals = goals;
  }
  return extras;
}

async function loadOne<T>(
  get: ExtraGetter,
  url: URL,
  params: Readonly<Record<string, string>>,
  parse: (body: unknown) => T | undefined,
): Promise<T | undefined> {
  if (extraUrlIsForbidden(url)) {
    return undefined;
  }
  const result = await get(url, params);
  if (result.kind === "omit") {
    return undefined;
  }
  return parse(result.body);
}
