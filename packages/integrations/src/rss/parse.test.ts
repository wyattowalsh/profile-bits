import { describe, expect, it } from "vitest";
import { loadFixture } from "./loadFixture.js";
import { parseRssXml, type RssFeedItem, RssParseError } from "./parse.js";

describe("parseRssXml", () => {
  it("parses the Atom fixture into frozen title/url/published_at items", () => {
    const items = parseRssXml(loadFixture("atom.xml"));
    expect(items).toHaveLength(8);
    expect(Object.isFrozen(items)).toBe(true);
    expect(Object.isFrozen(items[0])).toBe(true);
    expect(items[0]).toEqual({
      title: "Atom Item 1",
      url: "https://example.com/atom/1",
      published_at: "2026-08-16T11:00:00.000Z",
    });
    expect(items[7]?.title).toBe("Atom Item 8");
  });

  it("parses the RSS 2.0 fixture into frozen title/url/published_at items", () => {
    const items = parseRssXml(loadFixture("rss2.xml"));
    expect(items).toHaveLength(8);
    expect(Object.isFrozen(items)).toBe(true);
    expect(items[0]).toEqual({
      title: "RSS Item 1",
      url: "https://example.com/rss/1",
      published_at: "2026-08-16T11:00:00.000Z",
    });
    expect(items[7]?.title).toBe("RSS Item 8");
  });

  it("maps published ?? updated to ISO published_at", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Updated only</title>
  <id>urn:uuid:updated-only</id>
  <updated>2026-08-16T12:00:00Z</updated>
  <entry>
    <title>No published</title>
    <link href="https://example.com/updated" rel="alternate"/>
    <id>https://example.com/updated</id>
    <updated>2026-08-01T00:00:00Z</updated>
  </entry>
</feed>`;
    const items = parseRssXml(xml);
    expect(items[0]?.published_at).toBe("2026-08-01T00:00:00.000Z");
  });

  it("strips tags and collapses title whitespace", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>t</title>
    <link>https://example.com/</link>
    <description>d</description>
    <item>
      <title>  Hello   &lt;b&gt;World&lt;/b&gt;  </title>
      <link>https://example.com/hello</link>
    </item>
  </channel>
</rss>`;
    const items = parseRssXml(xml);
    expect(items[0]?.title).toBe("Hello World");
  });

  it("returns an empty frozen list for an empty channel", () => {
    const items = parseRssXml(loadFixture("empty.xml"));
    expect(items).toEqual([]);
    expect(Object.isFrozen(items)).toBe(true);
  });

  it("throws RssParseError on malformed XML", () => {
    expect(() => parseRssXml(loadFixture("malformed.xml"))).toThrow(
      RssParseError,
    );
  });

  it("does not read disk for an XXE SYSTEM file:// entity", () => {
    let items: readonly RssFeedItem[] | undefined;
    try {
      items = parseRssXml(loadFixture("xxe.xml"));
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(RssParseError);
      return;
    }
    const blob = JSON.stringify(items);
    expect(blob).not.toMatch(/root:.*:0:0/u);
    expect(blob).not.toContain("xxe-canary-should-not-appear");
  });
});
