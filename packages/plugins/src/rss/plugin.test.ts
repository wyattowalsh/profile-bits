import { describe, expect, it } from "vitest";
import { rssPlugin } from "./plugin.js";

describe("rssPlugin", () => {
  it("registers feed on the rss pack", () => {
    expect(rssPlugin.id).toBe("rss");
    expect(rssPlugin.widgets).toEqual(["feed"]);
    expect(rssPlugin.integrations).toEqual(["rss"]);
    expect(rssPlugin.defaults.widgets).toEqual(["feed"]);
    expect(rssPlugin.bitsUsed).toEqual([
      "Theme",
      "Frame",
      "Stack",
      "Row",
      "Text",
      "Muted",
    ]);
  });
});
