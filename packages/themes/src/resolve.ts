import { normalizeHex } from "./hex.js";
import {
  COLOR_ROLES,
  type ColorRef,
  type ColorRole,
  type CustomThemeInput,
  THEME_FONT,
  type ThemePalette,
  type ThemeRegistry,
} from "./types.js";

const COLOR_ROLE_SET = new Set<string>(COLOR_ROLES);

function isColorRole(token: string): token is ColorRole {
  return COLOR_ROLE_SET.has(token);
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
    throw new Error(`Unknown theme flavor "${flavorId}"`);
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
    throw new Error(
      `Unknown swatch or role "${token}" on flavor "${flavorId}"`,
    );
  }
  return normalizeHex(hex);
}

function resolveNamedTheme(id: string, registry: ThemeRegistry): ThemePalette {
  const flavor = registry[id];
  if (!flavor) {
    throw new Error(`Unknown theme flavor "${id}"`);
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
