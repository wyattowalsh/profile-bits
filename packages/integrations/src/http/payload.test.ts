import { describe, expect, it, vi } from "vitest";
import * as z from "zod";
import { CHIP_FIXTURE_TYPES, chipFixture } from "./fixtures/chips/index.js";
import { normalizeBadgeJson } from "./normalize.js";
import {
  HttpJsonDumpSchema,
  parseHttpJsonDump,
  parseRawBadgeJson,
  RAW_BADGE_JSON_KEYS,
  RawBadgeJsonSchema,
} from "./payload.js";

describe("HttpJsonDumpSchema", () => {
  it("keeps every key on a JSON object the json card would truncate", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const body = {
      hostname: "api.example.com",
      count: 9,
      nested: { keep: true, extra: "stay" },
      alpha: 1,
      bravo: 2,
      charlie: 3,
      delta: 4,
    };

    expect(parseHttpJsonDump(body)).toEqual(body);
    expect(HttpJsonDumpSchema.parse(body)).toEqual(body);
    expect(z.object({ hostname: z.string() }).parse(body)).toEqual({
      hostname: "api.example.com",
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("accepts arrays, primitives, and null without stripping nested keys", () => {
    expect(parseHttpJsonDump(null)).toBeNull();
    expect(parseHttpJsonDump(19)).toBe(19);
    expect(parseHttpJsonDump("ok")).toBe("ok");
    expect(parseHttpJsonDump(true)).toBe(true);
    expect(
      parseHttpJsonDump([
        { a: 1, b: 2 },
        { a: 3, b: 4 },
        { a: 5, b: 6 },
        { a: 7, b: 8 },
      ]),
    ).toEqual([
      { a: 1, b: 2 },
      { a: 3, b: 4 },
      { a: 5, b: 6 },
      { a: 7, b: 8 },
    ]);
  });

  it("rejects non-JSON values", () => {
    expect(() => parseHttpJsonDump(undefined)).toThrow();
    expect(() => parseHttpJsonDump(() => "nope")).toThrow();
  });
});

describe("RawBadgeJsonSchema", () => {
  it("retains shieldcn label, value, and link and does not map value to message", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const npm = chipFixture("shieldcn", "npm");
    const dump = parseRawBadgeJson(npm);

    expect(dump).toMatchObject({
      label: "npm",
      value: "19.1.1",
      link: "https://www.npmjs.com/package/react",
    });
    expect(dump).not.toHaveProperty("message");
    expect(dump).not.toHaveProperty("color");
    expect(RAW_BADGE_JSON_KEYS).toEqual([
      "label",
      "message",
      "color",
      "name",
      "value",
      "link",
    ]);

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("retains shields label, message, color, name, and value", () => {
    const dump = parseRawBadgeJson(chipFixture("shields", "npm"));
    expect(dump).toEqual({
      label: "npm",
      message: "v19.1.1",
      color: "blue",
      name: "npm",
      value: "v19.1.1",
    });
  });

  it("keeps link and value on every shieldcn fixture and name and value on shields", () => {
    for (const type of CHIP_FIXTURE_TYPES) {
      const shieldcn = parseRawBadgeJson(chipFixture("shieldcn", type));
      expect(shieldcn).toHaveProperty("label");
      expect(shieldcn).toHaveProperty("value");
      expect(shieldcn).toHaveProperty("link");
      expect(typeof shieldcn.link).toBe("string");

      const shields = parseRawBadgeJson(chipFixture("shields", type));
      expect(shields).toHaveProperty("label");
      expect(shields).toHaveProperty("message");
      expect(shields).toHaveProperty("color");
      expect(shields).toHaveProperty("name");
      expect(shields).toHaveProperty("value");
    }
  });

  it("keeps extra vendor keys and does not strip to the six badge fields", () => {
    const body = {
      schemaVersion: 1,
      label: "npm",
      message: "v19.0.0",
      color: "blue",
      name: "npm",
      value: "v19.0.0",
      link: "https://example.com",
      href: "https://example.com/href",
    };
    const dump = parseRawBadgeJson(body);
    expect(dump).toEqual(body);
    expect(z.object({ label: z.string() }).parse(body)).toEqual({
      label: "npm",
    });
    expect(RawBadgeJsonSchema.parse(body)).toEqual(body);
  });

  it("does not map value to message; normalizeBadgeJson stays the widget reader", () => {
    const raw = {
      label: "npm",
      value: "19.0.0",
      link: "https://example.com",
    };
    expect(parseRawBadgeJson(raw)).toEqual(raw);
    expect(normalizeBadgeJson(raw)).toEqual({
      label: "npm",
      message: "19.0.0",
    });
    expect(normalizeBadgeJson(raw)).not.toHaveProperty("value");
    expect(normalizeBadgeJson(raw)).not.toHaveProperty("link");
  });

  it("accepts a body with none of the six keys without inventing them", () => {
    expect(parseRawBadgeJson({ vendorOnly: true })).toEqual({
      vendorOnly: true,
    });
  });

  it("rejects non-object badge dumps", () => {
    expect(() => parseRawBadgeJson(null)).toThrow();
    expect(() => parseRawBadgeJson("npm")).toThrow();
    expect(() => parseRawBadgeJson([])).toThrow();
  });
});
