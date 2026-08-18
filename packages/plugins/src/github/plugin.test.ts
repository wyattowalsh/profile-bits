import { describe, expect, it } from "vitest";
import {
  bitsUsedForWidget,
  githubPlugin,
  githubWidgetRegistry,
} from "./plugin.js";

describe("githubPlugin", () => {
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
