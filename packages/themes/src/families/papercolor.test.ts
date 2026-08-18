import { describe, expect, it } from "vitest";
import { COLOR_ROLES, THEME_FONT } from "../types.js";
import { PAPERCOLOR_FLAVORS } from "./papercolor.js";

const EXPECTED_IDS = ["papercolor-dark", "papercolor-light"] as const;

describe("PAPERCOLOR_FLAVORS", () => {
  it("exports the catalog ids", () => {
    expect(PAPERCOLOR_FLAVORS.map((flavor) => flavor.id)).toEqual([
      ...EXPECTED_IDS,
    ]);
  });

  it("pairs every flavor with opposite polarity in the same family", () => {
    const byId = new Map(
      PAPERCOLOR_FLAVORS.map((flavor) => [flavor.id, flavor]),
    );
    for (const flavor of PAPERCOLOR_FLAVORS) {
      expect(flavor.family).toBe("papercolor");
      expect(flavor.roles.font).toBe(THEME_FONT);
      const pair = byId.get(flavor.pair);
      expect(pair, flavor.id).toBeDefined();
      expect(pair?.family).toBe(flavor.family);
      expect(pair?.polarity).not.toBe(flavor.polarity);
    }
  });

  it("maps every color role to an existing swatch", () => {
    for (const flavor of PAPERCOLOR_FLAVORS) {
      for (const role of COLOR_ROLES) {
        const swatch = flavor.roles[role];
        expect(flavor.swatches[swatch], `${flavor.id}.${role}`).toMatch(
          /^#[0-9a-f]{6}$/,
        );
      }
    }
  });
});
