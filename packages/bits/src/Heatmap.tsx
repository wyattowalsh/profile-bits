import { parseHex } from "@profile-bits/themes";
import { useBitTheme } from "./Theme.js";

export const DAYS_PER_WEEK = 7;

export type HeatmapDay = {
  readonly date?: string;
  readonly count: number;
  readonly weekday?: number;
};

export type HeatmapWeek = {
  readonly days: readonly HeatmapDay[];
};

export type HeatmapProps = {
  readonly weeks: readonly HeatmapWeek[];
  readonly cellSize?: number;
  readonly gap?: number;
  readonly maxCount?: number;
};

const HEATMAP_LEVELS = 4;
const CELL_RADIUS = 2;
const CELL_MARK = "\u2588";

function toHexByte(value: number): string {
  return value.toString(16).padStart(2, "0");
}

function mixHex(from: string, to: string, t: number): string {
  const a = parseHex(from);
  const b = parseHex(to);
  const u = Math.max(0, Math.min(1, t));
  const mix = (x: number, y: number) => Math.round(x + (y - x) * u);
  return `#${toHexByte(mix(a.r, b.r))}${toHexByte(mix(a.g, b.g))}${toHexByte(mix(a.b, b.b))}`;
}

function finiteCount(count: number): number {
  return Number.isFinite(count) ? Math.max(0, count) : 0;
}

function heatmapLevel(count: number, maxCount: number): number {
  const value = finiteCount(count);
  if (value <= 0 || maxCount <= 0) {
    return 0;
  }
  const ratio = value / maxCount;
  if (ratio <= 0.25) {
    return 1;
  }
  if (ratio <= 0.5) {
    return 2;
  }
  if (ratio <= 0.75) {
    return 3;
  }
  return 4;
}

function cellFill(
  count: number,
  maxCount: number,
  empty: string,
  fill: string,
): string {
  return mixHex(empty, fill, heatmapLevel(count, maxCount) / HEATMAP_LEVELS);
}

function weeksMax(weeks: readonly HeatmapWeek[]): number {
  let max = 0;
  for (const week of weeks) {
    for (const day of week.days) {
      const count = finiteCount(day.count);
      if (count > max) {
        max = count;
      }
    }
  }
  return max;
}

function cellsForWeek(days: readonly HeatmapDay[]): HeatmapDay[] {
  const cells: HeatmapDay[] = Array.from({ length: DAYS_PER_WEEK }, () => ({
    count: 0,
  }));
  for (const [index, day] of days.entries()) {
    const weekday = day.weekday;
    const slot =
      typeof weekday === "number" &&
      Number.isInteger(weekday) &&
      weekday >= 0 &&
      weekday < DAYS_PER_WEEK
        ? weekday
        : index;
    if (slot >= 0 && slot < DAYS_PER_WEEK) {
      cells[slot] = day;
    }
  }
  return cells;
}

export function Heatmap({
  weeks,
  cellSize = 10,
  gap = 2,
  maxCount,
}: HeatmapProps) {
  const theme = useBitTheme();
  const size = Math.max(1, cellSize);
  const peak =
    typeof maxCount === "number" && Number.isFinite(maxCount) && maxCount > 0
      ? maxCount
      : weeksMax(weeks);

  return (
    <div
      tw="flex flex-row"
      style={{ display: "flex", flexDirection: "row", gap }}
    >
      {weeks.map((week, weekIndex) => (
        <div
          key={week.days[0]?.date ?? String(weekIndex)}
          tw="flex flex-col"
          style={{ display: "flex", flexDirection: "column", gap }}
        >
          {cellsForWeek(week.days).map((day, weekday) => {
            const fill = cellFill(day.count, peak, theme.border, theme.accent);
            return (
              <div
                key={day.date ?? `${String(weekIndex)}-${String(weekday)}`}
                tw="flex"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: size,
                  height: size,
                  borderRadius: CELL_RADIUS,
                  backgroundColor: fill,
                  color: fill,
                  fontFamily: theme.font,
                  fontSize: size,
                  fontWeight: 700,
                }}
              >
                {CELL_MARK}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
