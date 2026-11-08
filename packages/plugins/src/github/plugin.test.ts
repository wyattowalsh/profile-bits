import { WIDGET_INTEGRATIONS } from "@profile-bits/core";
import { describe, expect, it } from "vitest";
import {
  bitsUsedForWidget,
  GITHUB_BITS_USED,
  githubPlugin,
  githubWidgetRegistry,
  TOP_REPOS_BITS_USED,
} from "./plugin.js";

describe("githubPlugin", () => {
  it("exports githubWidgetRegistry with demo, stats, languages, repo, and top-repos", () => {
    expect(githubWidgetRegistry.demo.id).toBe("demo");
    expect(githubWidgetRegistry.stats.id).toBe("stats");
    expect(githubWidgetRegistry.languages.id).toBe("languages");
    expect(githubWidgetRegistry.repo.id).toBe("repo");
    expect(githubWidgetRegistry["top-repos"].id).toBe("top-repos");
    expect(Object.keys(githubWidgetRegistry).sort()).toEqual([
      "demo",
      "languages",
      "repo",
      "stats",
      "top-repos",
    ]);
  });

  it("sets pack-level bitsUsed to the unique union of widget-entry bitsUsed", () => {
    const widgetUnion = [
      ...new Set([
        ...githubWidgetRegistry.demo.bitsUsed,
        ...githubWidgetRegistry.stats.bitsUsed,
        ...githubWidgetRegistry.languages.bitsUsed,
        ...githubWidgetRegistry.repo.bitsUsed,
        ...githubWidgetRegistry["top-repos"].bitsUsed,
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
      "List",
      "Muted",
      "Row",
      "Stack",
      "Stat",
      "Text",
      "Theme",
    ]);
  });

  it("registers demo/stats/languages/repo/top-repos with per-widget bitsUsed", () => {
    expect(githubPlugin.id).toBe("github");
    expect(githubPlugin.widgets).toEqual([
      "demo",
      "stats",
      "languages",
      "repo",
      "top-repos",
    ]);
    expect(githubPlugin.integrations).toEqual(["static", "github"]);
    expect(githubPlugin.defaults.widgets).toEqual(["stats", "languages"]);
    expect(githubPlugin.defaults.widgets).not.toContain("top-repos");
    expect(githubWidgetRegistry.demo.bitsUsed).toContain("Theme");
    expect(githubWidgetRegistry.stats.bitsUsed).toContain("Avatar");
    expect(githubWidgetRegistry.languages.bitsUsed).toContain("Bar");
    expect(githubWidgetRegistry.repo.bitsUsed).toEqual([
      ...githubWidgetRegistry.stats.bitsUsed,
    ]);
    expect(githubWidgetRegistry["top-repos"].bitsUsed).toEqual([
      ...TOP_REPOS_BITS_USED,
    ]);
    expect(bitsUsedForWidget("stats")).toEqual([
      ...githubWidgetRegistry.stats.bitsUsed,
    ]);
    expect(bitsUsedForWidget("top-repos")).toEqual([...TOP_REPOS_BITS_USED]);
    expect(bitsUsedForWidget("top-repos")).toContain("List");
  });

  it("declares top-repos integration github only", () => {
    expect(WIDGET_INTEGRATIONS["top-repos"]).toEqual(["github"]);
    expect(githubPlugin.widgets).toContain("top-repos");
    expect(githubWidgetRegistry).not.toHaveProperty("coding");
    expect(githubWidgetRegistry).not.toHaveProperty("feed");
    expect(githubWidgetRegistry).not.toHaveProperty("json");
    expect(githubWidgetRegistry).not.toHaveProperty("chips");
  });
});
