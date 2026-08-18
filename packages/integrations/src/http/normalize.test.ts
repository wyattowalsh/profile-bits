import { describe, expect, it } from "vitest";
import { BadgeNormalizeError, normalizeBadgeJson } from "./normalize.js";

describe("normalizeBadgeJson", () => {
  it("maps shieldcn npm shape value to message and omits color", () => {
    const badge = normalizeBadgeJson({
      label: "npm",
      value: "19.1.1",
      link: "https://www.npmjs.com/package/react",
    });
    expect(badge).toEqual({ label: "npm", message: "19.1.1" });
    expect(badge).not.toHaveProperty("color");
    expect(badge).not.toHaveProperty("link");
    expect(badge).not.toHaveProperty("value");
  });

  it("maps shields shape preferring message over value", () => {
    const badge = normalizeBadgeJson({
      label: "stars",
      message: "1k",
      color: "blue",
      name: "stars",
      value: "1k",
    });
    expect(badge).toEqual({
      label: "stars",
      message: "1k",
      color: "blue",
    });
    expect(badge).not.toHaveProperty("name");
    expect(badge).not.toHaveProperty("value");
  });

  it("throws when message and value are missing", () => {
    expect(() => normalizeBadgeJson({ label: "npm" })).toThrow(
      BadgeNormalizeError,
    );
  });

  it("throws when message is empty and value is absent", () => {
    expect(() => normalizeBadgeJson({ label: "npm", message: "  " })).toThrow(
      BadgeNormalizeError,
    );
  });

  it("keeps an empty message as missing under nullish coalescing", () => {
    expect(() =>
      normalizeBadgeJson({
        label: "stars",
        message: "",
        value: "1k",
      }),
    ).toThrow(BadgeNormalizeError);
  });

  it("returns unknown color names as the raw string", () => {
    const badge = normalizeBadgeJson({
      label: "build",
      message: "passing",
      color: "chartreuse",
    });
    expect(badge.color).toBe("chartreuse");
  });

  it("ignores href", () => {
    const badge = normalizeBadgeJson({
      label: "npm",
      message: "1.0.0",
      href: "https://example.com",
    });
    expect(badge).toEqual({ label: "npm", message: "1.0.0" });
    expect(badge).not.toHaveProperty("href");
  });

  it("defaults a missing label to an empty string", () => {
    expect(normalizeBadgeJson({ message: "1k" })).toEqual({
      label: "",
      message: "1k",
    });
  });

  it("coerces numeric and boolean messages", () => {
    expect(normalizeBadgeJson({ label: "n", message: 19 })).toEqual({
      label: "n",
      message: "19",
    });
    expect(normalizeBadgeJson({ label: "ok", value: true })).toEqual({
      label: "ok",
      message: "true",
    });
  });

  it("throws on non-object input", () => {
    expect(() => normalizeBadgeJson(null)).toThrow(BadgeNormalizeError);
    expect(() => normalizeBadgeJson("npm")).toThrow(BadgeNormalizeError);
    expect(() => normalizeBadgeJson([])).toThrow(BadgeNormalizeError);
  });
});
