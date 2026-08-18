export const THEME_FONT = "Geist";

export type ThemeId = string;

export const COLOR_ROLES = [
  "bg",
  "card",
  "text",
  "muted",
  "accent",
  "border",
] as const;

export const THEME_ROLES = [...COLOR_ROLES, "font"] as const;

export type ColorRole = (typeof COLOR_ROLES)[number];

export type ThemeRole = (typeof THEME_ROLES)[number];

export type ThemePolarity = "light" | "dark";

/**
 * `{flavorId}.{swatchId}` | `{flavorId}.{role}` | `#RGB` | `#RRGGBB` | `#RRGGBBAA`
 */
export type ColorRef = string;

export type ThemePalette = {
  bg: string;
  card: string;
  text: string;
  muted: string;
  accent: string;
  border: string;
  font: string;
};

export type CustomThemeInput = {
  bg: ColorRef;
  card: ColorRef;
  text: ColorRef;
  muted: ColorRef;
  accent: ColorRef;
  border: ColorRef;
};

export type ThemeFlavorRoles = {
  readonly bg: string;
  readonly card: string;
  readonly text: string;
  readonly muted: string;
  readonly accent: string;
  readonly border: string;
  readonly font: typeof THEME_FONT;
};

export type ThemeFlavor = {
  readonly id: string;
  readonly family: string;
  readonly label: string;
  readonly polarity: ThemePolarity;
  readonly pair: string;
  readonly license: string;
  readonly sourceUrl: string;
  readonly swatches: Readonly<Record<string, string>>;
  readonly roles: ThemeFlavorRoles;
};

export type ThemeRegistry = Readonly<Record<string, ThemeFlavor>>;

export type ThemeFamilyGroup = {
  readonly id: string;
  readonly flavors: readonly ThemeFlavor[];
};
