import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadRssPreviewItems,
  NO_FEED_ITEMS,
  renderRssPreviewSvg,
  rssPreviewLines,
} from "./rss-fixtures";

const ATOM_TITLES = [
  "Atom Item 1",
  "Atom Item 2",
  "Atom Item 3",
  "Atom Item 4",
  "Atom Item 5",
  "Atom Item 6",
  "Atom Item 7",
  "Atom Item 8",
] as const;

function assertBakedStillSvg(svg: string): void {
  expect(svg).toMatch(/<svg\b[^>]*\bwidth="480"/);
  expect(svg).toMatch(/<svg\b[^>]*\bheight="160"/);
  expect(svg).toMatch(/<svg\b[^>]*\bviewBox="0 0 480 160"/);
  expect(svg).not.toMatch(/<style[\s>]/i);
  expect(svg).not.toContain("@keyframes");
  expect(svg).not.toMatch(/<(animate|animateTransform|animateMotion|set)\b/i);
  expect(svg).not.toMatch(/<foreignObject[\s>]/i);
}

describe("preview rss fixtures wrap XML", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("parses Atom fixture titles via parseRssXml(loadFixture)", () => {
    const items = loadRssPreviewItems("atom.xml");
    expect(items.map((item) => item.title)).toEqual([...ATOM_TITLES]);
    expect(rssPreviewLines("atom.xml", 8)).toEqual([...ATOM_TITLES]);
    expect(rssPreviewLines("atom.xml")).toEqual([...ATOM_TITLES.slice(0, 5)]);
  });

  it("renders No feed items for the empty fixture", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    expect(loadRssPreviewItems("empty.xml")).toEqual([]);
    expect(rssPreviewLines("empty.xml")).toEqual([NO_FEED_ITEMS]);
    const svg = await renderRssPreviewSvg({ fixture: "empty.xml" });
    assertBakedStillSvg(svg);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("emits a 480×160 baked-still svg from the Atom fixture", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const svg = await renderRssPreviewSvg({ fixture: "atom.xml", limit: 8 });
    assertBakedStillSvg(svg);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("never calls fetch or createRssClient", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    loadRssPreviewItems("atom.xml");
    await renderRssPreviewSvg({ fixture: "empty.xml" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("wraps rss XML fixtures without live feeds, rss client, or playground rss routes", async () => {
    const source = await readFile(
      new URL("./rss-fixtures.ts", import.meta.url),
      "utf8",
    );

    expect(source).toContain("parseRssXml(loadFixture(");
    expect(source).toContain("renderFeedSvg");
    expect(source).not.toContain("createRssClient");
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source).not.toContain("/playground/rss");
    expect(source).not.toContain('data-group="feed"');
  });
});
