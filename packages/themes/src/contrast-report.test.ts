import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast.js";
import { paletteContrastReport } from "./contrast-report.js";
import { NAMED_THEME_IDS, THEME_REGISTRY } from "./registry.js";
import { resolveTheme } from "./resolve.js";

describe("paletteContrastReport", () => {
  it("reports text/muted/accent vs bg and vs card, plus white/black vs accent", () => {
    const palette = resolveTheme("dark", THEME_REGISTRY);
    const report = paletteContrastReport(palette);
    expect(report).toHaveLength(8);
    expect(report.map((row) => ({ fg: row.fg, bg: row.bg }))).toEqual([
      { fg: palette.text, bg: palette.bg },
      { fg: palette.muted, bg: palette.bg },
      { fg: palette.accent, bg: palette.bg },
      { fg: palette.text, bg: palette.card },
      { fg: palette.muted, bg: palette.card },
      { fg: palette.accent, bg: palette.card },
      { fg: "#ffffff", bg: palette.accent },
      { fg: "#000000", bg: palette.accent },
    ]);
  });

  it("marks AA from ratio >= 4.5 and matches contrastRatio", () => {
    const palette = resolveTheme("dark", THEME_REGISTRY);
    const report = paletteContrastReport(palette);
    const textOnBg = report[0];
    expect(textOnBg?.ratio).toBe(contrastRatio(palette.text, palette.bg));
    expect(textOnBg?.aa).toBe(true);
    expect(textOnBg?.ratio).toBeGreaterThanOrEqual(4.5);

    const whiteOnAccent = report[6];
    expect(whiteOnAccent?.fg).toBe("#ffffff");
    expect(whiteOnAccent?.bg).toBe(palette.accent);
    expect(whiteOnAccent?.aa).toBe(false);
    expect(whiteOnAccent?.ratio).toBeLessThan(4.5);

    const blackOnAccent = report[7];
    expect(blackOnAccent?.aa).toBe(true);
  });

  it("never throws when official muted fails AA vs bg", () => {
    const storm = resolveTheme("tokyo-night-storm", THEME_REGISTRY);
    const report = paletteContrastReport(storm);
    const mutedOnBg = report.find(
      (row) => row.fg === storm.muted && row.bg === storm.bg,
    );
    expect(mutedOnBg?.aa).toBe(false);
    expect(mutedOnBg?.ratio).toBeLessThan(4.5);
  });

  it("reports every catalog flavor without throwing", () => {
    let mutedOnBgFail = 0;
    for (const id of NAMED_THEME_IDS) {
      const palette = resolveTheme(id, THEME_REGISTRY);
      const report = paletteContrastReport(palette);
      expect(report).toHaveLength(8);
      const mutedOnBg = report.find(
        (row) => row.fg === palette.muted && row.bg === palette.bg,
      );
      if (mutedOnBg?.aa === false) {
        mutedOnBgFail += 1;
      }
    }
    expect(mutedOnBgFail).toBeGreaterThanOrEqual(30);
    expect(mutedOnBgFail).toBeLessThan(NAMED_THEME_IDS.length);
  });
});
