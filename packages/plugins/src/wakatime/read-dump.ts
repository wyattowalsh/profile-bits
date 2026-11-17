import type { WakatimeDump } from "@profile-bits/integrations";

export type SecondsStat = {
  readonly label: string;
  readonly seconds: number;
};

export type WakatimeDumpBitsSource = Partial<
  Pick<
    WakatimeDump,
    | "daily_average"
    | "best_day"
    | "all_time_since_today"
    | "statusbar_today"
    | "summaries"
  >
>;

export function finiteSeconds(value: number | undefined): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  return value;
}

function pushStat(
  stats: SecondsStat[],
  label: string,
  value: number | undefined,
): void {
  const seconds = finiteSeconds(value);
  if (seconds === undefined) {
    return;
  }
  stats.push({ label, seconds });
}

/** Totals already on the dump. Missing fields stay missing. A numeric 0 still counts. */
export function readSecondsStats(
  dump: WakatimeDumpBitsSource,
): readonly SecondsStat[] {
  const stats: SecondsStat[] = [];
  pushStat(stats, "avg", dump.daily_average);
  pushStat(stats, "best", dump.best_day?.total_seconds);
  pushStat(stats, "all-time", dump.all_time_since_today?.total_seconds);
  pushStat(stats, "today", dump.statusbar_today?.grand_total?.total_seconds);
  return stats;
}

/**
 * Daily summary seconds in dump order.
 * A reported 0 stays. A day with no `total_seconds` is skipped.
 */
export function readSummarySeries(
  dump: WakatimeDumpBitsSource,
): readonly number[] | undefined {
  const days = dump.summaries?.data;
  if (days === undefined) {
    return undefined;
  }
  const series: number[] = [];
  for (const day of days) {
    const seconds = finiteSeconds(day.grand_total?.total_seconds);
    if (seconds === undefined) {
      continue;
    }
    series.push(seconds);
  }
  return series.length > 0 ? series : undefined;
}

const SPARK_BARS = 8;

/** Keep a short daily series. Average longer ranges into eight bars so the row fits. */
export function sparklineValues(
  values: readonly number[],
  maxBars = SPARK_BARS,
): number[] {
  if (values.length <= maxBars) {
    return [...values];
  }
  const plotted: number[] = [];
  for (let index = 0; index < maxBars; index += 1) {
    const start = Math.floor((index * values.length) / maxBars);
    const end = Math.floor(((index + 1) * values.length) / maxBars);
    let sum = 0;
    let count = 0;
    for (let cursor = start; cursor < end; cursor += 1) {
      const value = values[cursor] ?? 0;
      sum += Number.isFinite(value) ? Math.max(0, value) : 0;
      count += 1;
    }
    plotted.push(count > 0 ? sum / count : 0);
  }
  return plotted;
}

export function dumpBits(dump: WakatimeDumpBitsSource): {
  totals?: readonly SecondsStat[];
  series?: readonly number[];
} {
  const totals = readSecondsStats(dump);
  const series = readSummarySeries(dump);
  return {
    ...(totals.length > 0 ? { totals } : {}),
    ...(series !== undefined ? { series } : {}),
  };
}
