import { describe, expect, it } from "vitest";
import {
  bitsUsedForWidget,
  GITHUB_BITS_USED,
  githubPlugin,
  githubWidgetRegistry,
} from "./plugin.js";

describe("githubPlugin", () => {
  it("exports githubWidgetRegistry with demo, stats, and languages", () => {
    expect(githubWidgetRegistry.demo.id).toBe("demo");
    expect(githubWidgetRegistry.stats.id).toBe("stats");
    expect(githubWidgetRegistry.languages.id).toBe("languages");
    expect(Object.keys(githubWidgetRegistry).sort()).toEqual([
      "demo",
      "languages",
      "stats",
    ]);
  });

  it("sets pack-level bitsUsed to the unique union of widget-entry bitsUsed", () => {
    const widgetUnion = [
      ...new Set([
        ...githubWidgetRegistry.demo.bitsUsed,
        ...githubWidgetRegistry.stats.bitsUsed,
        ...githubWidgetRegistry.languages.bitsUsed,
      ]),
    ].toSorted();

    expect(githubPlugin.bitsUsed).toEqual(GITHUB_BITS_USED);
    expect(githubPlugin.bitsUsed).toEqual(widgetUnion);
    expect(githubPlugin.bitsUsed).toEqual([
      "Avatar",
      "Bar",
      "Chip",
      "Divider",
      "Frame",
      "Muted",
      "Row",
      "Stack",
      "Stat",
      "Text",
      "Theme",
    ]);
  });

  it("registers demo/stats/languages with per-widget bitsUsed", () => {
    expect(githubPlugin.id).toBe("github");
    expect(githubPlugin.widgets).toEqual(["demo", "stats", "languages"]);
    expect(githubPlugin.integrations).toEqual(["static", "github"]);
    expect(githubPlugin.defaults.widgets).toEqual(["stats", "languages"]);
    expect(githubWidgetRegistry.demo.bitsUsed).toContain("Theme");
    expect(githubWidgetRegistry.stats.bitsUsed).toContain("Avatar");
    expect(githubWidgetRegistry.languages.bitsUsed).toContain("Bar");
    expect(bitsUsedForWidget("stats")).toEqual([
      ...githubWidgetRegistry.stats.bitsUsed,
    ]);
  });
});
