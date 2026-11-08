import { WIDGET_INTEGRATIONS } from "@profile-bits/core";
import { describe, expect, it } from "vitest";
import { RSS_BITS_USED, rssPlugin } from "./plugin.js";

describe("rssPlugin", () => {
  it("registers feed and opt-in latest on the rss pack", () => {
    expect(rssPlugin.id).toBe("rss");
    expect(rssPlugin.widgets).toEqual(["feed", "latest"]);
    expect(rssPlugin.integrations).toEqual(["rss"]);
    expect(rssPlugin.defaults.widgets).toEqual(["feed"]);
    expect(rssPlugin.bitsUsed).toEqual(RSS_BITS_USED);
    expect(rssPlugin.bitsUsed).toContain("Time");
    expect(WIDGET_INTEGRATIONS.latest).toEqual(["rss"]);
    expect(WIDGET_INTEGRATIONS.feed).toEqual(["rss"]);
  });
});
