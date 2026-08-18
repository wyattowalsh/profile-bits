import { describe, expect, it } from "vitest";
import {
  type CustomThemeInput,
  contrastRatio,
  listFamilies,
  NAMED_THEME_IDS,
  resolveColorRef,
  resolveTheme,
  THEME_FONT,
  THEME_REGISTRY,
  type ThemeRegistry,
} from "./index.js";

const PRIMER_DARK = {
  bg: "#0d1117",
  card: "#161b22",
  text: "#e6edf3",
  muted: "#8b949e",
  accent: "#58a6ff",
  border: "#30363d",
  font: "Geist",
} as const;

const PRIMER_LIGHT = {
  bg: "#ffffff",
  card: "#f6f8fa",
  text: "#1f2328",
  muted: "#59636e",
  accent: "#0969da",
  border: "#d0d7de",
  font: "Geist",
} as const;

const EMPTY_REGISTRY: ThemeRegistry = {};

describe("NAMED_THEME_IDS", () => {
  it("includes Primer ids and the registered catalog", () => {
    expect(NAMED_THEME_IDS).toContain("light");
    expect(NAMED_THEME_IDS).toContain("dark");
    expect(NAMED_THEME_IDS).toContain("nord");
    expect(NAMED_THEME_IDS).toContain("catppuccin-mocha");
    expect(NAMED_THEME_IDS).toHaveLength(47);
  });
});

describe("resolveColorRef", () => {
  it("resolves Primer swatch refs", () => {
    expect(resolveColorRef("dark.fgColor-accent", THEME_REGISTRY)).toBe(
      "#58a6ff",
    );
    expect(resolveColorRef("light.bgColor-default", THEME_REGISTRY)).toBe(
      "#ffffff",
    );
  });

  it("resolves Primer role refs", () => {
    expect(resolveColorRef("dark.accent", THEME_REGISTRY)).toBe("#58a6ff");
    expect(resolveColorRef("dark.bg", THEME_REGISTRY)).toBe("#0d1117");
    expect(resolveColorRef("light.card", THEME_REGISTRY)).toBe("#f6f8fa");
  });

  it("resolves hex refs without a registry lookup", () => {
    expect(resolveColorRef("#0d1", EMPTY_REGISTRY)).toBe("#00dd11");
    expect(resolveColorRef("#0D1117", EMPTY_REGISTRY)).toBe("#0d1117");
    expect(resolveColorRef("#58a6ff80", EMPTY_REGISTRY)).toBe("#58a6ff80");
  });

  it("throws on unknown flavor and does not fall back to dark", () => {
    expect(() => resolveColorRef("radical.mauve", THEME_REGISTRY)).toThrow(
      /Unknown theme flavor "radical"/,
    );
    expect(() => resolveColorRef("merko.bg", THEME_REGISTRY)).toThrow(
      /Unknown theme flavor "merko"/,
    );
  });

  it("resolves catalog swatch and role refs", () => {
    expect(resolveColorRef("catppuccin-mocha.accent", THEME_REGISTRY)).toMatch(
      /^#(?:[0-9a-f]{6}|[0-9a-f]{8})$/,
    );
    expect(resolveColorRef("nord.bg", THEME_REGISTRY)).toMatch(
      /^#(?:[0-9a-f]{6}|[0-9a-f]{8})$/,
    );
  });

  it("throws on unknown swatch or role", () => {
    expect(() => resolveColorRef("dark.mauve", THEME_REGISTRY)).toThrow(
      /Unknown swatch or role "mauve"/,
    );
    expect(() => resolveColorRef("dark.font", THEME_REGISTRY)).toThrow(
      /Unknown swatch or role "font"/,
    );
    expect(() => resolveColorRef("dark.nope", THEME_REGISTRY)).toThrow(
      /Unknown swatch or role "nope"/,
    );
  });

  it("throws on malformed refs", () => {
    expect(() => resolveColorRef("dark", THEME_REGISTRY)).toThrow(
      /Malformed color ref "dark"/,
    );
    expect(() => resolveColorRef("dark.", THEME_REGISTRY)).toThrow(
      /Malformed color ref/,
    );
    expect(() => resolveColorRef(".bg", THEME_REGISTRY)).toThrow(
      /Malformed color ref/,
    );
    expect(() => resolveColorRef("dark.bg.extra", THEME_REGISTRY)).toThrow(
      /Malformed color ref/,
    );
    expect(() => resolveColorRef("#ggg", THEME_REGISTRY)).toThrow(
      /Malformed hex color "#ggg"/,
    );
    expect(() => resolveColorRef("blue", THEME_REGISTRY)).toThrow(
      /Malformed color ref "blue"/,
    );
  });
});

describe("resolveTheme", () => {
  it("resolves named dark to current Primer hex", () => {
    expect(resolveTheme("dark", THEME_REGISTRY)).toEqual(PRIMER_DARK);
  });

  it("resolves named light to current Primer hex", () => {
    expect(resolveTheme("light", THEME_REGISTRY)).toEqual(PRIMER_LIGHT);
  });

  it("always sets font to Geist", () => {
    expect(resolveTheme("dark", THEME_REGISTRY).font).toBe(THEME_FONT);
    expect(resolveTheme("light", THEME_REGISTRY).font).toBe("Geist");
  });

  it("resolves a custom 6-role map and forces Geist", () => {
    expect(
      resolveTheme(
        {
          bg: "dark.bg",
          card: "#161b22",
          text: "dark.fgColor-default",
          muted: "#8b9",
          accent: "light.accent",
          border: "#30363dff",
        },
        THEME_REGISTRY,
      ),
    ).toEqual({
      bg: "#0d1117",
      card: "#161b22",
      text: "#e6edf3",
      muted: "#88bb99",
      accent: "#0969da",
      border: "#30363dff",
      font: "Geist",
    });
  });

  it("throws on unknown named id and does not fall back to dark", () => {
    expect(() => resolveTheme("radical", THEME_REGISTRY)).toThrow(
      /Unknown theme flavor "radical"/,
    );
    expect(() => resolveTheme("merko", THEME_REGISTRY)).toThrow(
      /Unknown theme flavor "merko"/,
    );
  });

  it("resolves catalog named ids", () => {
    expect(resolveTheme("nord", THEME_REGISTRY).font).toBe(THEME_FONT);
    expect(resolveTheme("catppuccin-mocha", THEME_REGISTRY).bg).toMatch(
      /^#(?:[0-9a-f]{6}|[0-9a-f]{8})$/,
    );
  });

  it("throws when a custom role is missing", () => {
    const partial = {
      bg: "#000000",
      card: "#111111",
      text: "#eeeeee",
      muted: "#888888",
      accent: "#0000ff",
    } as CustomThemeInput;
    expect(() => resolveTheme(partial, THEME_REGISTRY)).toThrow(
      /Custom theme missing role "border"/,
    );
  });

  it("throws when a custom ref is unknown", () => {
    expect(() =>
      resolveTheme(
        {
          bg: "mocha.base",
          card: "dark.card",
          text: "dark.text",
          muted: "dark.muted",
          accent: "dark.accent",
          border: "dark.border",
        },
        THEME_REGISTRY,
      ),
    ).toThrow(/Unknown theme flavor "mocha"/);
  });
});

describe("contrastRatio", () => {
  it("is 21 for black vs white", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBe(21);
    expect(contrastRatio("#fff", "#000")).toBe(21);
  });

  it("is 1 for identical colors", () => {
    expect(contrastRatio("#0d1117", "#0d1117")).toBe(21 / 21);
  });

  it("meets WCAG AA for Primer dark text on bg", () => {
    expect(contrastRatio(PRIMER_DARK.text, PRIMER_DARK.bg)).toBeGreaterThan(
      4.5,
    );
    expect(contrastRatio(PRIMER_LIGHT.text, PRIMER_LIGHT.bg)).toBeGreaterThan(
      4.5,
    );
  });

  it("throws on malformed hex", () => {
    expect(() => contrastRatio("dark.bg", "#fff")).toThrow(
      /Malformed hex color/,
    );
  });
});

describe("listFamilies", () => {
  it("groups Primer flavors under github among 19 families", () => {
    const families = listFamilies(THEME_REGISTRY);
    expect(families).toHaveLength(19);
    const github = families.find((family) => family.id === "github");
    expect(github?.flavors.map((flavor) => flavor.id)).toEqual([
      "dark",
      "github-dimmed",
      "light",
    ]);
  });

  it("returns an empty list for an empty registry", () => {
    expect(listFamilies(EMPTY_REGISTRY)).toEqual([]);
  });
});
