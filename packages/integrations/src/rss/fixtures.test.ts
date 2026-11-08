import { describe, expect, it } from "vitest";
import { loadFixture } from "./loadFixture.js";
import { parseRssXml, type RssFeedItem } from "./parse.js";

function leftoverOf(item: RssFeedItem): {
  title: string;
  url: string;
  published_at: string | null;
} {
  return {
    title: item.title,
    url: item.url,
    published_at: item.published_at,
  };
}

describe("rss fixtures content/id", () => {
  it("Atom fixture XML has entry id and content the leftover triple dropped", () => {
    const xml = loadFixture("atom.xml");
    expect(xml).toContain("<id>https://example.com/atom/1</id>");
    expect(xml).toContain("<id>https://example.com/atom/8</id>");
    expect(xml).toMatch(/<content\b[^>]*>/u);
    expect(xml).toContain("Atom content 1");
    expect(xml).toContain("Atom content 8");
    expect(xml).toContain("<title>Atom Item 1</title>");
    expect(xml).toContain('href="https://example.com/atom/1"');
    expect(xml).toContain("<published>2026-08-16T11:00:00Z</published>");
  });

  it("parsed Atom fixture dump exposes id and content, not only title/url/published_at", () => {
    const dump = parseRssXml(loadFixture("atom.xml"));
    const hours = [11, 10, 9, 8, 7, 6, 5, 4];

    expect(dump.items).toHaveLength(8);
    expect(Object.keys(dump).sort()).toEqual(["feed", "items"]);
    for (const [index, item] of dump.items.entries()) {
      const n = index + 1;
      const hour = String(hours[index]).padStart(2, "0");
      expect(item.id).toBe(`https://example.com/atom/${n}`);
      expect(item.content).toBe(`<p>Atom content ${n}</p>`);
      expect(item.summary).toBe(`Atom summary ${n}`);
      expect(leftoverOf(item)).toEqual({
        title: `Atom Item ${n}`,
        url: `https://example.com/atom/${n}`,
        published_at: `2026-08-16T${hour}:00:00.000Z`,
      });
    }
  });

  it("RSS 2.0 fixture XML has guid and content:encoded the leftover triple dropped", () => {
    const xml = loadFixture("rss2.xml");
    expect(xml).toContain("<guid>https://example.com/rss/1</guid>");
    expect(xml).toContain("<guid>https://example.com/rss/8</guid>");
    expect(xml).toContain("content:encoded");
    expect(xml).toContain("RSS content 1");
    expect(xml).toContain("RSS content 8");
    expect(xml).toContain("<title>RSS Item 1</title>");
    expect(xml).toContain("<link>https://example.com/rss/1</link>");
    expect(xml).toContain("<pubDate>Sun, 16 Aug 2026 11:00:00 GMT</pubDate>");
  });

  it("parsed RSS 2.0 fixture dump exposes id and content, not only title/url/published_at", () => {
    const dump = parseRssXml(loadFixture("rss2.xml"));
    const hours = [11, 10, 9, 8, 7, 6, 7, 4];

    expect(dump.items).toHaveLength(8);
    for (const [index, item] of dump.items.entries()) {
      const n = index + 1;
      const hour = String(hours[index]).padStart(2, "0");
      expect(item.id).toBe(`https://example.com/rss/${n}`);
      expect(item.content).toBe(`<p>RSS content ${n}</p>`);
      expect(item.summary).toBe(`RSS summary ${n}`);
      expect(leftoverOf(item)).toEqual({
        title: `RSS Item ${n}`,
        url: `https://example.com/rss/${n}`,
        published_at: `2026-08-16T${hour}:00:00.000Z`,
      });
    }
  });
});
