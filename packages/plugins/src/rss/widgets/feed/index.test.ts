import { loadFixture, parseRssXml } from "@profile-bits/integrations";
import { resolveTheme, THEME_REGISTRY } from "@profile-bits/themes";
import { describe, expect, it, vi } from "vitest";
import {
  type FeedItem,
  feedLines,
  NO_FEED_ITEMS,
  readFeedItem,
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

function leftoverOf(item: FeedItem): FeedItem {
  return {
    title: item.title,
    url: item.url,
    published_at: item.published_at,
  };
}

const ATOM_ITEM_1: FeedItem = {
  title: "Atom Item 1",
  url: "https://example.com/atom/1",
  published_at: "2026-08-16T11:00:00.000Z",
};

describe("feed widget", () => {
  it("reads leftover title/url/published_at from dump items and slices to limit 1", () => {
    const dump = parseRssXml(loadFixture("atom.xml"));
    expect(dump.items).toHaveLength(8);
    expect(dump.items[0]).toEqual(
      expect.objectContaining({
        id: "https://example.com/atom/1",
        content: "<p>Atom content 1</p>",
        summary: "Atom summary 1",
      }),
    );
    const sliced = sliceFeedItems(dump, 1);
    expect(sliced).toEqual([ATOM_ITEM_1]);
    expect(Object.keys(sliced[0] as FeedItem).sort()).toEqual([
      "published_at",
      "title",
      "url",
    ]);
    expect(sliced[0]).not.toHaveProperty("id");
    expect(sliced[0]).not.toHaveProperty("content");
    expect(sliceFeedItems(dump.items, 1)).toEqual([ATOM_ITEM_1]);
    expect(feedLines(sliced)).toEqual(["Atom Item 1"]);
    expect(dump.items).toHaveLength(8);
  });

  it("slices RSS 2.0 dump items to limit 8 without asking the client to drop fields", () => {
    const dump = parseRssXml(loadFixture("rss2.xml"));
    expect(dump.items).toHaveLength(8);
    expect(feedLines(sliceFeedItems(dump, 8))).toEqual([
      "RSS Item 1",
      "RSS Item 2",
      "RSS Item 3",
      "RSS Item 4",
      "RSS Item 5",
      "RSS Item 6",
      "RSS Item 7",
      "RSS Item 8",
    ]);
    expect(sliceFeedItems(dump, 5)).toHaveLength(5);
    expect(dump.items).toHaveLength(8);
  });

  it("does not require extra dump fields to render leftover-only items", async () => {
    const leftover: FeedItem = {
      title: "Solo",
      url: "https://example.com/solo",
      published_at: null,
    };
    expect(readFeedItem(leftover)).toEqual(leftoverOf(leftover));
    expect(feedLines(sliceFeedItems([leftover], 5))).toEqual(["Solo"]);
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const svg = await renderFeedSvg({ items: [leftover], limit: 5 });
    assertBakedStillSvg(svg);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("renders No feed items for an empty dump items list", async () => {
    const dump = parseRssXml(loadFixture("empty.xml"));
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    expect(dump.items).toHaveLength(0);
    expect(feedLines(sliceFeedItems(dump, 5))).toEqual([NO_FEED_ITEMS]);
    const svg = await renderFeedSvg({ items: dump, limit: 5 });
    assertBakedStillSvg(svg);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("emits a 480×160 baked-still svg for limit 1 and 8", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const atomDump = parseRssXml(loadFixture("atom.xml"));
    const rssDump = parseRssXml(loadFixture("rss2.xml"));
    const limit1 = await renderFeedSvg({ items: atomDump, limit: 1 });
    const limit8 = await renderFeedSvg({ items: rssDump, limit: 8 });
    assertBakedStillSvg(limit1);
    assertBakedStillSvg(limit8);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("bakes mocha card hex instead of Primer dark", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const dump = parseRssXml(loadFixture("atom.xml"));
    const svg = await renderFeedSvg({
      items: dump,
      limit: 1,
      theme: resolveTheme("catppuccin-mocha", THEME_REGISTRY),
    });
    assertBakedStillSvg(svg);
    expect(svg).toContain("#181825");
    expect(svg).not.toContain("#0d1117");
    expect(svg).not.toMatch(/<style\b|@keyframes|<animate\b|foreignObject/i);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("consumes a stub rss dump with no HTTP", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const dump = parseRssXml(loadFixture("atom.xml"));
    const svg = await renderFeedFromClient(
      { fetchFeed: async () => dump },
      { url: "https://example.com/atom.xml", limit: 1 },
    );
    assertBakedStillSvg(svg);
    expect(feedLines(sliceFeedItems(dump, 1))).toEqual(["Atom Item 1"]);
    expect(leftoverOf(dump.items[0] as FeedItem)).toEqual(ATOM_ITEM_1);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
