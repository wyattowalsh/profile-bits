import { parseHex } from "@profile-bits/themes";

const INTENSITY_LEVELS = 4;

function toHexByte(value: number): string {
  return value.toString(16).padStart(2, "0");
}

export function mixHex(from: string, to: string, t: number): string {
  const a = parseHex(from);
  const b = parseHex(to);
  const u = Math.max(0, Math.min(1, t));
  const mix = (x: number, y: number) => Math.round(x + (y - x) * u);
  return `#${toHexByte(mix(a.r, b.r))}${toHexByte(mix(a.g, b.g))}${toHexByte(mix(a.b, b.b))}`;
}

export function segmentFill(
  index: number,
  count: number,
  accent: string,
  border: string,
): string {
  if (count <= 1 || index <= 0) {
    return accent;
  }
  const last = count - 1;
  return mixHex(accent, border, Math.max(0, Math.min(1, index / last)));
}

export function percentShares(values: readonly number[]): number[] {
  const parts = values.map((value) =>
    Number.isFinite(value) && value > 0 ? value : 0,
  );
  const sum = parts.reduce((total, value) => total + value, 0);
  if (sum <= 0) {
    return parts.map(() => 0);
  }
  return parts.map((value) => (value / sum) * 100);
}

export function intensityLevel(count: number, maxCount: number): number {
  const value = Number.isFinite(count) ? Math.max(0, count) : 0;
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

export function intensityFill(
  count: number,
  maxCount: number,
  empty: string,
  fill: string,
): string {
  return mixHex(
    empty,
    fill,
    intensityLevel(count, maxCount) / INTENSITY_LEVELS,
  );
}
