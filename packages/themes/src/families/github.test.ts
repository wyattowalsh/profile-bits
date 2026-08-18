import { describe, expect, it } from "vitest";
import { DARK_FLAVOR, LIGHT_FLAVOR } from "../primer.js";
import { COLOR_ROLES, THEME_FONT } from "../types.js";
import { GITHUB_FLAVORS } from "./github.js";

const EXPECTED_IDS = ["light", "dark", "github-dimmed"] as const;

describe("GITHUB_FLAVORS", () => {
  it("exports the catalog ids", () => {
    expect(GITHUB_FLAVORS.map((flavor) => flavor.id)).toEqual([
      ...EXPECTED_IDS,
    ]);
  });

  it("pairs every flavor with opposite polarity in the same family", () => {
    const byId = new Map(GITHUB_FLAVORS.map((flavor) => [flavor.id, flavor]));
    for (const flavor of GITHUB_FLAVORS) {
      expect(flavor.family).toBe("github");
      expect(flavor.roles.font).toBe(THEME_FONT);
      const pair = byId.get(flavor.pair);
      expect(pair, flavor.id).toBeDefined();
      expect(pair?.family).toBe(flavor.family);
      expect(pair?.polarity).not.toBe(flavor.polarity);
    }
  });

  it("maps every color role to an existing swatch", () => {
    for (const flavor of GITHUB_FLAVORS) {
      for (const role of COLOR_ROLES) {
        const swatch = flavor.roles[role];
        expect(flavor.swatches[swatch], `${flavor.id}.${role}`).toMatch(
          /^#[0-9a-f]{6}$/,
        );
      }
    }
  });

  it("keeps Primer light/dark role hex", () => {
    const light = GITHUB_FLAVORS.find((flavor) => flavor.id === "light");
    const dark = GITHUB_FLAVORS.find((flavor) => flavor.id === "dark");
    expect(light).toBe(LIGHT_FLAVOR);
    expect(dark).toBe(DARK_FLAVOR);
    for (const role of COLOR_ROLES) {
      expect(light?.swatches[light.roles[role]]).toBe(
        LIGHT_FLAVOR.swatches[LIGHT_FLAVOR.roles[role]],
      );
      expect(dark?.swatches[dark.roles[role]]).toBe(
        DARK_FLAVOR.swatches[DARK_FLAVOR.roles[role]],
      );
    }
  });
});
