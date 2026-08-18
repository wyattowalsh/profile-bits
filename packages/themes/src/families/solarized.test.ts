import { describe, expect, it } from "vitest";
import { COLOR_ROLES, THEME_FONT } from "../types.js";
import { SOLARIZED_FLAVORS } from "./solarized.js";

const EXPECTED_IDS = ["solarized-dark", "solarized-light"] as const;

describe("SOLARIZED_FLAVORS", () => {
  it("exports the catalog ids", () => {
    expect(SOLARIZED_FLAVORS.map((flavor) => flavor.id)).toEqual([
      ...EXPECTED_IDS,
    ]);
  });

  it("pairs every flavor with opposite polarity in the same family", () => {
    const byId = new Map(
      SOLARIZED_FLAVORS.map((flavor) => [flavor.id, flavor]),
    );
    for (const flavor of SOLARIZED_FLAVORS) {
      expect(flavor.family).toBe("solarized");
      expect(flavor.roles.font).toBe(THEME_FONT);
      const pair = byId.get(flavor.pair);
      expect(pair, flavor.id).toBeDefined();
      expect(pair?.family).toBe(flavor.family);
      expect(pair?.polarity).not.toBe(flavor.polarity);
    }
  });

  it("maps every color role to an existing swatch", () => {
    for (const flavor of SOLARIZED_FLAVORS) {
      for (const role of COLOR_ROLES) {
        const swatch = flavor.roles[role];
        expect(flavor.swatches[swatch], `${flavor.id}.${role}`).toMatch(
          /^#[0-9a-f]{6}$/,
        );
      }
    }
  });
});
