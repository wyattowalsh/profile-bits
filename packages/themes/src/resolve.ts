import { normalizeHex } from "./hex.ts";
import {
  COLOR_ROLES,
  type ColorRef,
  type ColorRole,
  type CustomThemeInput,
  THEME_FONT,
  type ThemePalette,
  type ThemeRegistry,
} from "./types.ts";

const COLOR_ROLE_SET = new Set<string>(COLOR_ROLES);
const MAX_SUGGEST_DISTANCE = 2;

function isColorRole(token: string): token is ColorRole {
  return COLOR_ROLE_SET.has(token);
}

function editDistance(left: string, right: string): number {
  const a = left.toLowerCase();
  const b = right.toLowerCase();
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = prev[0] ?? 0;
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const insertion = (prev[j] ?? 0) + 1;
      const deletion = (prev[j - 1] ?? 0) + 1;
      const substitution = diagonal + (a[i - 1] === b[j - 1] ? 0 : 1);
      diagonal = prev[j] ?? 0;
      prev[j] = Math.min(insertion, deletion, substitution);
    }
  }
  return prev[b.length] ?? a.length;
}

function closestSuggestion(
  query: string,
  candidates: readonly string[],
): string | undefined {
  let best: string | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const distance = editDistance(query, candidate);
    if (distance === 0) {
      continue;
    }
    if (
      distance < bestDistance ||
      (distance === bestDistance && (best === undefined || candidate < best))
    ) {
      best = candidate;
      bestDistance = distance;
    }
  }
  if (best === undefined || bestDistance > MAX_SUGGEST_DISTANCE) {
    return undefined;
  }
  return best;
}

function unknownFlavorError(flavorId: string, registry: ThemeRegistry): Error {
  return withSuggestion(
    `Unknown theme flavor "${flavorId}"`,
    closestSuggestion(flavorId, Object.keys(registry)),
  );
}

function unknownSwatchError(
  token: string,
  flavorId: string,
  swatches: Readonly<Record<string, string>>,
): Error {
  return withSuggestion(
    `Unknown swatch or role "${token}" on flavor "${flavorId}"`,
    closestSuggestion(token, [...Object.keys(swatches), ...COLOR_ROLES]),
  );
}

function withSuggestion(
  message: string,
  suggestion: string | undefined,
): Error {
  if (suggestion === undefined) {
    return new Error(message);
  }
  return new Error(`${message}. Did you mean "${suggestion}"?`);
}

function isCustomThemeInput(
  input: string | CustomThemeInput,
): input is CustomThemeInput {
  return typeof input === "object" && input !== null;
}

function splitFlavorRef(ref: string): { flavorId: string; token: string } {
  const dot = ref.indexOf(".");
  if (dot <= 0 || dot === ref.length - 1 || ref.indexOf(".", dot + 1) !== -1) {
    throw new Error(`Malformed color ref "${ref}"`);
  }
  return {
    flavorId: ref.slice(0, dot),
    token: ref.slice(dot + 1),
  };
}

export function resolveColorRef(
  ref: ColorRef,
  registry: ThemeRegistry,
): string {
  if (ref.startsWith("#")) {
    return normalizeHex(ref);
  }
  const { flavorId, token } = splitFlavorRef(ref);
  const flavor = registry[flavorId];
  if (!flavor) {
    throw unknownFlavorError(flavorId, registry);
  }
  if (isColorRole(token)) {
    const swatchId = flavor.roles[token];
    const hex = flavor.swatches[swatchId];
    if (!hex) {
      throw new Error(`Unknown swatch "${swatchId}" on flavor "${flavorId}"`);
    }
    return normalizeHex(hex);
  }
  const hex = flavor.swatches[token];
  if (!hex) {
    throw unknownSwatchError(token, flavorId, flavor.swatches);
  }
  return normalizeHex(hex);
}

function resolveNamedTheme(id: string, registry: ThemeRegistry): ThemePalette {
  const flavor = registry[id];
  if (!flavor) {
    throw unknownFlavorError(id, registry);
  }
  return {
    bg: resolveColorRef(`${flavor.id}.bg`, registry),
    card: resolveColorRef(`${flavor.id}.card`, registry),
    text: resolveColorRef(`${flavor.id}.text`, registry),
    muted: resolveColorRef(`${flavor.id}.muted`, registry),
    accent: resolveColorRef(`${flavor.id}.accent`, registry),
    border: resolveColorRef(`${flavor.id}.border`, registry),
    font: THEME_FONT,
  };
}

function requireRole(input: CustomThemeInput, role: ColorRole): ColorRef {
  const ref = input[role];
  if (typeof ref !== "string" || ref.length === 0) {
    throw new Error(`Custom theme missing role "${role}"`);
  }
  return ref;
}

function resolveCustomTheme(
  input: CustomThemeInput,
  registry: ThemeRegistry,
): ThemePalette {
  return {
    bg: resolveColorRef(requireRole(input, "bg"), registry),
    card: resolveColorRef(requireRole(input, "card"), registry),
    text: resolveColorRef(requireRole(input, "text"), registry),
    muted: resolveColorRef(requireRole(input, "muted"), registry),
    accent: resolveColorRef(requireRole(input, "accent"), registry),
    border: resolveColorRef(requireRole(input, "border"), registry),
    font: THEME_FONT,
  };
}

export function resolveTheme(
  input: string | CustomThemeInput,
  registry: ThemeRegistry,
): ThemePalette {
  if (isCustomThemeInput(input)) {
    return resolveCustomTheme(input, registry);
  }
  return resolveNamedTheme(input, registry);
}
