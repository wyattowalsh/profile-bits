import { isHexColor, normalizeHex, parseHex } from "@profile-bits/themes";

const BRIGHTGREEN = "#44cc11";
const GREEN = "#97ca00";
const YELLOWGREEN = "#a4a61d";
const YELLOW = "#dfb317";
const ORANGE = "#fe7d37";
const RED = "#e05d44";
const BLUE = "#007ec6";
const LIGHTGREY = "#9f9f9f";

export const SHIELDS_NAMED_COLORS: Readonly<Record<string, string>> =
  Object.freeze({
    brightgreen: BRIGHTGREEN,
    green: GREEN,
    yellowgreen: YELLOWGREEN,
    yellow: YELLOW,
    orange: ORANGE,
    red: RED,
    blue: BLUE,
    lightgrey: LIGHTGREY,
    lightgray: LIGHTGREY,
    success: BRIGHTGREEN,
    important: ORANGE,
    critical: RED,
    informational: BLUE,
    inactive: LIGHTGREY,
  });

export function resolveChipColor(
  color: string | undefined | null,
  accent: string,
): string {
  if (color == null) {
    return accent;
  }
  const trimmed = color.trim();
  if (trimmed === "") {
    return accent;
  }
  const key = trimmed.toLowerCase();
  // Own keys only — `__proto__` / `constructor` must not walk Object.prototype.
  if (Object.hasOwn(SHIELDS_NAMED_COLORS, key)) {
    return SHIELDS_NAMED_COLORS[key];
  }
  const hex = normalizeHexColor(trimmed);
  if (hex != null) {
    return hex;
  }
  return accent;
}

function normalizeHexColor(value: string): string | undefined {
  // Themes accepts #RRGGBBAA; Shields/chips must reject it and must not strip alpha to 6-digit.
  if (!isHexColor(value) || value.length === 9) {
    return undefined;
  }
  parseHex(value);
  return normalizeHex(value);
}
