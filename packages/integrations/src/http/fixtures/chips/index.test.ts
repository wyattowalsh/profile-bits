import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { normalizeBadgeJson } from "../../normalize.js";
import { parseRawBadgeJson } from "../../payload.js";
import {
  CHIP_FIXTURE_PRESETS,
  CHIP_FIXTURE_TYPES,
  type ChipFixturePreset,
  type ChipFixtureType,
  chipFixture,
} from "./index.js";

const fixturesDir = dirname(fileURLToPath(import.meta.url));

function readFixtureFile(
  preset: ChipFixturePreset,
  type: ChipFixtureType,
): Record<string, unknown> {
  const parsed: unknown = JSON.parse(
    readFileSync(join(fixturesDir, preset, `${type}.json`), "utf8"),
  );
  expect(parsed).toBeTypeOf("object");
  expect(parsed).not.toBeNull();
  expect(Array.isArray(parsed)).toBe(false);
  return parsed as Record<string, unknown>;
}

describe("chipFixture", () => {
  it("loads shieldcn npm without color and shields npm with color", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const shieldcnNpm = chipFixture("shieldcn", "npm");
    expect(shieldcnNpm.value).toBe("19.1.1");
    expect(shieldcnNpm).not.toHaveProperty("color");

    const shieldsNpm = chipFixture("shields", "npm");
    expect(shieldsNpm.message).toBe("v19.1.1");
    expect(shieldsNpm.color).toBe("blue");

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("keeps link and value on every shieldcn fixture dump without mapping value to message", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    expect(CHIP_FIXTURE_PRESETS).toEqual(["shieldcn", "shields"]);
    expect(CHIP_FIXTURE_TYPES).toHaveLength(8);

    for (const type of CHIP_FIXTURE_TYPES) {
      const file = readFixtureFile("shieldcn", type);
      const dump = chipFixture("shieldcn", type);
      const cached = parseRawBadgeJson(dump);

      expect(file).toEqual(
        expect.objectContaining({
          label: expect.any(String),
          value: expect.any(String),
          link: expect.any(String),
        }),
      );
      expect(file).not.toHaveProperty("message");
      expect(typeof file.link).toBe("string");
      expect(file.link).toMatch(/^https:\/\//);

      expect(dump).toEqual(file);
      expect(cached).toEqual(file);
      expect(cached).toHaveProperty("label", file.label);
      expect(cached).toHaveProperty("value", file.value);
      expect(cached).toHaveProperty("link", file.link);
      expect(cached).not.toHaveProperty("message");

      const rendered = normalizeBadgeJson(dump);
      expect(rendered).toEqual({
        label: file.label,
        message: file.value,
      });
      expect(rendered).not.toHaveProperty("link");
      expect(rendered).not.toHaveProperty("value");
    }

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("keeps name and value on every shields fixture dump", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    for (const type of CHIP_FIXTURE_TYPES) {
      const file = readFixtureFile("shields", type);
      const dump = chipFixture("shields", type);
      const cached = parseRawBadgeJson(dump);

      expect(file).toEqual(
        expect.objectContaining({
          label: expect.any(String),
          message: expect.any(String),
          color: expect.any(String),
          name: expect.any(String),
          value: expect.any(String),
        }),
      );

      expect(dump).toEqual(file);
      expect(cached).toEqual(file);
      expect(cached).toHaveProperty("name", file.name);
      expect(cached).toHaveProperty("value", file.value);
      expect(cached).toHaveProperty("label", file.label);
      expect(cached).toHaveProperty("message", file.message);
      expect(cached).toHaveProperty("color", file.color);
    }

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("throws on an unknown combo", () => {
    expect(() => chipFixture("unknown" as "shieldcn", "npm")).toThrow(
      /unknown chip fixture combo/,
    );
  });
});
