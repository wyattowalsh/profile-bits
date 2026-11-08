import { WIDGET_INTEGRATIONS } from "@profile-bits/core";
import { describe, expect, it } from "vitest";
import { WAKATIME_SLICE_WIDGET_IDS, wakatimePlugin } from "./plugin.js";

describe("wakatimePlugin", () => {
  it("registers coding plus slice cards on the wakatime pack", () => {
    expect(wakatimePlugin.id).toBe("wakatime");
    expect(wakatimePlugin.widgets).toEqual([
      "coding",
      "editors",
      "projects",
      "os",
      "langs",
    ]);
    expect(wakatimePlugin.widgets).toEqual([
      "coding",
      ...WAKATIME_SLICE_WIDGET_IDS,
    ]);
    expect(wakatimePlugin.widgets).not.toContain("stats");
    expect(wakatimePlugin.widgets).not.toContain("languages");
    expect(wakatimePlugin.integrations).toEqual(["wakatime"]);
    expect(wakatimePlugin.defaults.widgets).toEqual(["coding"]);
    expect(wakatimePlugin.bitsUsed).toEqual([
      "Theme",
      "Frame",
      "Stack",
      "Row",
      "Text",
      "Muted",
      "Stat",
      "Bar",
      "Chip",
      "Divider",
      "List",
    ]);
  });

  it("binds slice widget ids to wakatime only", () => {
    expect(WIDGET_INTEGRATIONS.editors).toEqual(["wakatime"]);
    expect(WIDGET_INTEGRATIONS.projects).toEqual(["wakatime"]);
    expect(WIDGET_INTEGRATIONS.os).toEqual(["wakatime"]);
    expect(WIDGET_INTEGRATIONS.langs).toEqual(["wakatime"]);
    expect(WIDGET_INTEGRATIONS.languages).toEqual(["github"]);
    expect(WIDGET_INTEGRATIONS.stats).toEqual(["github"]);
  });
});
