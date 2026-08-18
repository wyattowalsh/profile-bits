import { describe, expect, it } from "vitest";
import {
  DARK_THEME,
  LIGHT_THEME,
  resolveWidgetTheme,
  themePalette,
} from "./themes.js";

describe("themePalette", () => {
  it("keeps Primer chrome for light and dark", () => {
    expect(DARK_THEME.bg).toBe("#0d1117");
    expect(LIGHT_THEME.bg).toBe("#ffffff");
    expect(themePalette("dark")).toEqual(DARK_THEME);
    expect(themePalette("light")).toEqual(LIGHT_THEME);
  });

  it("resolves catalog ids", () => {
    expect(themePalette("catppuccin-mocha").bg).toBe("#1e1e2e");
    expect(themePalette("nord").font).toBe("Geist");
  });

  it("resolves a palette object unchanged", () => {
    const mixed = { ...DARK_THEME, accent: "#cba6f7" };
    expect(resolveWidgetTheme(mixed)).toEqual(mixed);
  });
});
