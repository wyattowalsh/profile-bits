import {
  resolveTheme,
  THEME_REGISTRY,
  type ThemeId,
  type ThemePalette,
} from "@profile-bits/themes";

export type { ThemeId, ThemePalette };
export type ThemeName = ThemeId;
export type WidgetTheme = ThemeId | ThemePalette;

export const DARK_THEME: ThemePalette = resolveTheme("dark", THEME_REGISTRY);
export const LIGHT_THEME: ThemePalette = resolveTheme("light", THEME_REGISTRY);

export const THEME_PALETTES = {
  dark: DARK_THEME,
  light: LIGHT_THEME,
} as const;

export function themePalette(theme: ThemeId = "dark"): ThemePalette {
  return resolveTheme(theme, THEME_REGISTRY);
}

export function isThemePalette(theme: WidgetTheme): theme is ThemePalette {
  return typeof theme === "object" && theme !== null && "bg" in theme;
}

export function resolveWidgetTheme(theme: WidgetTheme = "dark"): ThemePalette {
  return isThemePalette(theme) ? theme : themePalette(theme);
}
