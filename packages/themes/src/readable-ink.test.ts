import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast.js";
import { readableInk } from "./readable-ink.js";
import { THEME_REGISTRY } from "./registry.js";
import { resolveTheme } from "./resolve.js";

describe("readableInk", () => {
  it("prefers black on Primer dark accent", () => {
    const dark = resolveTheme("dark", THEME_REGISTRY);
    expect(dark.accent).toBe("#58a6ff");
    expect(readableInk(dark.accent)).toBe("#000000");
    expect(contrastRatio("#000000", dark.accent)).toBeGreaterThan(
      contrastRatio("#ffffff", dark.accent),
    );
  });

  it("prefers black on mocha mauve accent", () => {
    const mocha = resolveTheme("catppuccin-mocha", THEME_REGISTRY);
    expect(mocha.accent).toBe("#cba6f7");
    expect(readableInk(mocha.accent)).toBe("#000000");
  });

  it("prefers white on Primer light accent", () => {
    const light = resolveTheme("light", THEME_REGISTRY);
    expect(light.accent).toBe("#0969da");
    expect(readableInk(light.accent)).toBe("#ffffff");
  });

  it("picks the higher-contrast ink for black and white fills", () => {
    expect(readableInk("#000000")).toBe("#ffffff");
    expect(readableInk("#ffffff")).toBe("#000000");
    expect(readableInk("#000")).toBe("#ffffff");
  });

  it("throws on malformed hex", () => {
    expect(() => readableInk("mauve")).toThrow(/Malformed hex color/);
  });
});
