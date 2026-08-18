const BRIGHTGREEN = "#44cc11";
const GREEN = "#97ca00";
const YELLOWGREEN = "#a4a61d";
const YELLOW = "#dfb317";
const ORANGE = "#fe7d37";
const RED = "#e05d44";
const BLUE = "#007ec6";
const LIGHTGREY = "#9f9f9f";

const HEX3 = /^#([0-9a-f]{3})$/iu;
const HEX6 = /^#([0-9a-f]{6})$/iu;

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
  const named = SHIELDS_NAMED_COLORS[trimmed.toLowerCase()];
  if (named != null) {
    return named;
  }
  const hex = normalizeHexColor(trimmed);
  if (hex != null) {
    return hex;
  }
  return accent;
}

function normalizeHexColor(value: string): string | undefined {
  const hex6 = HEX6.exec(value);
  if (hex6?.[1] != null) {
    return `#${hex6[1].toLowerCase()}`;
  }
  const hex3 = HEX3.exec(value);
  const digits = hex3?.[1];
  if (digits == null || digits.length !== 3) {
    return undefined;
  }
  const [r, g, b] = digits.toLowerCase();
  return `#${r}${r}${g}${g}${b}${b}`;
}
