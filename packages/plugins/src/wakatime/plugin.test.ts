import { describe, expect, it } from "vitest";
import { wakatimePlugin } from "./plugin.js";

describe("wakatimePlugin", () => {
  it("registers coding on the wakatime pack", () => {
    expect(wakatimePlugin.id).toBe("wakatime");
    expect(wakatimePlugin.widgets).toEqual(["coding"]);
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
    ]);
  });
});
