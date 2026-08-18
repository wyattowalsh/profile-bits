import { loadFixture, parseRssXml } from "@profile-bits/integrations";
import { describe, expect, it, vi } from "vitest";
import {
  feedLines,
  NO_FEED_ITEMS,
  renderFeedFromClient,
  renderFeedSvg,
  sliceFeedItems,
} from "./index.js";

function assertBakedStillSvg(svg: string): void {
  expect(svg).toMatch(/<svg\b[^>]*\bwidth="480"/);
  expect(svg).toMatch(/<svg\b[^>]*\bheight="160"/);
  expect(svg).toMatch(/<svg\b[^>]*\bviewBox="0 0 480 160"/);
  expect(svg).not.toMatch(/<text[\s>]/i);
  expect(svg).not.toMatch(/<style[\s>]/i);
  expect(svg).not.toContain("@keyframes");
  expect(svg).not.toMatch(/<(animate|animateTransform|animateMotion|set)\b/i);
  expect(svg).not.toMatch(/<foreignObject[\s>]/i);
}

describe("feed widget", () => {
  it("slices Atom fixture payload to limit 1", () => {
    const items = parseRssXml(loadFixture("atom.xml"));
    expect(feedLines(sliceFeedItems(items, 1))).toEqual(["Atom Item 1"]);
  });

  it("slices RSS 2.0 fixture payload to limit 8", () => {
    const items = parseRssXml(loadFixture("rss2.xml"));
    expect(feedLines(sliceFeedItems(items, 8))).toEqual([
      "RSS Item 1",
      "RSS Item 2",
      "RSS Item 3",
      "RSS Item 4",
      "RSS Item 5",
      "RSS Item 6",
      "RSS Item 7",
      "RSS Item 8",
    ]);
  });

  it("renders No feed items for an empty payload", async () => {
    const items = parseRssXml(loadFixture("empty.xml"));
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    expect(feedLines(sliceFeedItems(items, 5))).toEqual([NO_FEED_ITEMS]);
    const svg = await renderFeedSvg({ items, limit: 5 });
    assertBakedStillSvg(svg);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("emits a 480×160 baked-still svg for limit 1 and 8", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const atomItems = parseRssXml(loadFixture("atom.xml"));
    const rssItems = parseRssXml(loadFixture("rss2.xml"));
    const limit1 = await renderFeedSvg({ items: atomItems, limit: 1 });
    const limit8 = await renderFeedSvg({ items: rssItems, limit: 8 });
    assertBakedStillSvg(limit1);
    assertBakedStillSvg(limit8);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("consumes a stub rss client payload with no HTTP", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const items = parseRssXml(loadFixture("atom.xml"));
    const svg = await renderFeedFromClient(
      { fetchFeed: async () => items },
      { url: "https://example.com/atom.xml", limit: 1 },
    );
    assertBakedStillSvg(svg);
    expect(feedLines(sliceFeedItems(items, 1))).toEqual(["Atom Item 1"]);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
