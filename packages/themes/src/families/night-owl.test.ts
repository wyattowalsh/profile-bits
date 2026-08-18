import { describe, expect, it } from "vitest";
import { COLOR_ROLES, THEME_FONT } from "../types.js";
import { NIGHT_OWL_FLAVORS } from "./night-owl.js";

const EXPECTED_IDS = ["night-owl", "light-owl"] as const;

describe("NIGHT_OWL_FLAVORS", () => {
  it("exports the catalog ids", () => {
    expect(NIGHT_OWL_FLAVORS.map((flavor) => flavor.id)).toEqual([
      ...EXPECTED_IDS,
    ]);
  });

  it("pairs every flavor with opposite polarity in the same family", () => {
    const byId = new Map(
      NIGHT_OWL_FLAVORS.map((flavor) => [flavor.id, flavor]),
    );
    for (const flavor of NIGHT_OWL_FLAVORS) {
      expect(flavor.family).toBe("night-owl");
      expect(flavor.roles.font).toBe(THEME_FONT);
      const pair = byId.get(flavor.pair);
      expect(pair, flavor.id).toBeDefined();
      expect(pair?.family).toBe(flavor.family);
      expect(pair?.polarity).not.toBe(flavor.polarity);
    }
  });

  it("maps every color role to an existing swatch", () => {
    for (const flavor of NIGHT_OWL_FLAVORS) {
      for (const role of COLOR_ROLES) {
        const swatch = flavor.roles[role];
        expect(flavor.swatches[swatch], `${flavor.id}.${role}`).toMatch(
          /^#[0-9a-f]{6}$/,
        );
      }
    }
  });
});
