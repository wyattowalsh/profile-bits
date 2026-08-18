import { describe, expect, it } from "vitest";
import { listFamilies } from "./list-families.js";
import { NAMED_THEME_IDS, THEME_REGISTRY } from "./registry.js";
import { resolveColorRef, resolveTheme } from "./resolve.js";
import { COLOR_ROLES, THEME_FONT } from "./types.js";

const CATALOG_IDS = [
  "ayu-dark",
  "ayu-light",
  "ayu-mirage",
  "bluloco-dark",
  "bluloco-light",
  "catppuccin-frappe",
  "catppuccin-latte",
  "catppuccin-macchiato",
  "catppuccin-mocha",
  "dark",
  "dawnfox",
  "dayfox",
  "dracula",
  "dracula-alucard",
  "everforest-dark",
  "everforest-light",
  "flexoki-dark",
  "flexoki-light",
  "github-dimmed",
  "gruvbox-dark",
  "gruvbox-light",
  "horizon-dark",
  "horizon-light",
  "iceberg-dark",
  "iceberg-light",
  "kanagawa-dragon",
  "kanagawa-lotus",
  "kanagawa-wave",
  "light",
  "light-owl",
  "night-owl",
  "nightfox",
  "nord",
  "nord-light",
  "one-dark",
  "one-light",
  "papercolor-dark",
  "papercolor-light",
  "rose-pine",
  "rose-pine-dawn",
  "rose-pine-moon",
  "solarized-dark",
  "solarized-light",
  "tokyo-night",
  "tokyo-night-day",
  "tokyo-night-moon",
  "tokyo-night-storm",
] as const;

const HEX = /^#(?:[0-9a-f]{6}|[0-9a-f]{8})$/;

describe("THEME_REGISTRY catalog", () => {
  it("exposes exactly the 47 official flavor ids", () => {
    expect(CATALOG_IDS).toHaveLength(47);
    expect([...NAMED_THEME_IDS]).toEqual([...CATALOG_IDS]);
    expect(Object.keys(THEME_REGISTRY).sort()).toEqual([...CATALOG_IDS]);
  });

  it("gives every flavor an opposite-polarity pair in the same family", () => {
    for (const flavor of Object.values(THEME_REGISTRY)) {
      const pair = THEME_REGISTRY[flavor.pair];
      expect(pair, `${flavor.id} pair ${flavor.pair}`).toBeDefined();
      expect(pair?.family).toBe(flavor.family);
      expect(pair?.polarity).not.toBe(flavor.polarity);
      expect(pair?.polarity === "light" || pair?.polarity === "dark").toBe(
        true,
      );
    }
  });

  it("resolves every named id to hex roles and Geist", () => {
    for (const id of NAMED_THEME_IDS) {
      const palette = resolveTheme(id, THEME_REGISTRY);
      expect(palette.font).toBe(THEME_FONT);
      for (const role of COLOR_ROLES) {
        expect(palette[role]).toMatch(HEX);
      }
    }
  });

  it("lists 19 families", () => {
    expect(listFamilies(THEME_REGISTRY)).toHaveLength(19);
  });

  it("keeps Primer chrome hex for light and dark", () => {
    expect(resolveTheme("light", THEME_REGISTRY).bg).toBe("#ffffff");
    expect(resolveTheme("dark", THEME_REGISTRY).bg).toBe("#0d1117");
  });

  it("fails closed on unofficial dump ids", () => {
    expect(() => resolveTheme("radical", THEME_REGISTRY)).toThrow(
      /Unknown theme flavor "radical"/,
    );
    expect(() => resolveColorRef("merko.bg", THEME_REGISTRY)).toThrow(
      /Unknown theme flavor "merko"/,
    );
  });
});
