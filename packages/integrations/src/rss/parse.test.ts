import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { loadFixture } from "./loadFixture.js";
import {
  parseRssXml,
  type RssFeedDump,
  type RssFeedItem,
  RssParseError,
} from "./parse.js";

const PARSE_SOURCE = readFileSync(
  fileURLToPath(new URL("./parse.ts", import.meta.url)),
  "utf8",
);

const DUMP_FEED_KEYS = [
  "title",
  "link",
  "description",
  "updated",
  "authors",
  "categories",
  "image",
] as const;

const DUMP_ITEM_KEYS = [
  "id",
  "title",
  "url",
  "published_at",
  "updated",
  "content",
  "summary",
  "authors",
  "categories",
  "enclosures",
] as const;

function assertDumpShape(dump: RssFeedDump): void {
  expect(Array.isArray(dump)).toBe(false);
  expect(Object.keys(dump).sort()).toEqual(["feed", "items"]);
  expect(Object.keys(dump.feed).sort()).toEqual([...DUMP_FEED_KEYS].sort());
  expect(Object.isFrozen(dump)).toBe(true);
  expect(Object.isFrozen(dump.feed)).toBe(true);
  expect(Object.isFrozen(dump.items)).toBe(true);
  expect(Object.isFrozen(dump.feed.authors)).toBe(true);
  expect(Object.isFrozen(dump.feed.categories)).toBe(true);
}

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

describe("parseRssXml", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses the Atom fixture into a frozen feed+item dump", () => {
    const dump = parseRssXml(loadFixture("atom.xml"));
    assertDumpShape(dump);
    expect(dump.items).toHaveLength(8);
    expect(Object.isFrozen(dump.items[0])).toBe(true);
    expect(Object.keys(dump.items[0] ?? {}).sort()).toEqual(
      [...DUMP_ITEM_KEYS].sort(),
    );
    expect(dump.feed).toEqual({
      title: "Profile Bits Atom Fixture",
      link: "https://example.com/",
      description: "",
      updated: "2026-08-16T12:00:00.000Z",
      authors: [],
      categories: [],
      image: null,
    });
    expect(leftoverOf(dump.items[0] as RssFeedItem)).toEqual({
      title: "Atom Item 1",
      url: "https://example.com/atom/1",
      published_at: "2026-08-16T11:00:00.000Z",
    });
    expect(dump.items[0]).toEqual(
      expect.objectContaining({
        id: "https://example.com/atom/1",
        title: "Atom Item 1",
        url: "https://example.com/atom/1",
        published_at: "2026-08-16T11:00:00.000Z",
        updated: "2026-08-16T11:00:00.000Z",
        content: "<p>Atom content 1</p>",
        summary: "Atom summary 1",
        authors: [],
        categories: [],
        enclosures: [],
      }),
    );
    expect(dump.items.map((item) => item.id)).toEqual(
      Array.from(
        { length: 8 },
        (_, index) => `https://example.com/atom/${String(index + 1)}`,
      ),
    );
    expect(dump.items[7]?.title).toBe("Atom Item 8");
  });

  it("parses the RSS 2.0 fixture into a frozen feed+item dump", () => {
    const dump = parseRssXml(loadFixture("rss2.xml"));
    assertDumpShape(dump);
    expect(dump.items).toHaveLength(8);
    expect(dump.feed).toEqual({
      title: "Profile Bits RSS2 Fixture",
      link: "https://example.com/",
      description: "Fixture feed with eight items so limit is testable",
      updated: null,
      authors: [],
      categories: [],
      image: null,
    });
    expect(leftoverOf(dump.items[0] as RssFeedItem)).toEqual({
      title: "RSS Item 1",
      url: "https://example.com/rss/1",
      published_at: "2026-08-16T11:00:00.000Z",
    });
    expect(dump.items[0]).toEqual(
      expect.objectContaining({
        id: "https://example.com/rss/1",
        title: "RSS Item 1",
        url: "https://example.com/rss/1",
        published_at: "2026-08-16T11:00:00.000Z",
        updated: "2026-08-16T11:00:00.000Z",
        content: "<p>RSS content 1</p>",
        summary: "RSS summary 1",
        authors: [],
        categories: [],
        enclosures: [],
      }),
    );
    expect(dump.items.map((item) => item.id)).toEqual(
      Array.from(
        { length: 8 },
        (_, index) => `https://example.com/rss/${String(index + 1)}`,
      ),
    );
    expect(dump.items[7]?.title).toBe("RSS Item 8");
  });

  it("maps published ?? updated to ISO published_at and keeps updated", () => {
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
    const dump = parseRssXml(xml);
    expect(dump.items[0]?.published_at).toBe("2026-08-01T00:00:00.000Z");
    expect(dump.items[0]?.updated).toBe("2026-08-01T00:00:00.000Z");
    expect(dump.items[0]?.id).toBe("https://example.com/updated");
  });

  it("strips tags and collapses title whitespace on feed and items", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>  Hello   Channel  </title>
    <link>https://example.com/</link>
    <description>d</description>
    <item>
      <title>  Hello   &lt;b&gt;World&lt;/b&gt;  </title>
      <link>https://example.com/hello</link>
    </item>
  </channel>
</rss>`;
    const dump = parseRssXml(xml);
    expect(dump.feed.title).toBe("Hello Channel");
    expect(dump.items[0]?.title).toBe("Hello World");
  });

  it("types authors, categories, content, summary, image, and enclosures", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Dump fields</title>
    <link>https://example.com/</link>
    <description>Channel summary</description>
    <lastBuildDate>Sun, 16 Aug 2026 12:00:00 GMT</lastBuildDate>
    <managingEditor>editor@example.com (Editor)</managingEditor>
    <category>channel-cat</category>
    <image>
      <title>Logo</title>
      <url>https://example.com/logo.png</url>
      <link>https://example.com/</link>
    </image>
    <item>
      <title>Has body</title>
      <link>https://example.com/has-body</link>
      <guid>urn:uuid:has-body</guid>
      <pubDate>Sun, 16 Aug 2026 11:00:00 GMT</pubDate>
      <author>ada@example.com (Ada)</author>
      <category>alpha</category>
      <description>Item summary</description>
      <content:encoded xmlns:content="http://purl.org/rss/1.0/modules/content/">&lt;p&gt;Full content&lt;/p&gt;</content:encoded>
      <enclosure url="https://example.com/audio.mp3" type="audio/mpeg" length="1234"/>
    </item>
  </channel>
</rss>`;
    const dump = parseRssXml(xml);
    assertDumpShape(dump);
    expect(dump.feed.description).toBe("Channel summary");
    expect(dump.feed.updated).toBe("2026-08-16T12:00:00.000Z");
    expect(dump.feed.image).toEqual({
      title: "Logo",
      url: "https://example.com/logo.png",
    });
    expect(Object.isFrozen(dump.feed.image)).toBe(true);
    expect(dump.feed.authors).toEqual([
      { name: "Editor", email: "editor@example.com", url: null },
    ]);
    expect(dump.feed.categories).toEqual([
      { term: "channel-cat", label: "channel-cat", url: null },
    ]);
    const item = dump.items[0];
    expect(item?.id).toBe("urn:uuid:has-body");
    expect(item?.content).toBe("<p>Full content</p>");
    expect(item?.summary).toBe("Item summary");
    expect(item?.authors).toEqual([
      { name: "Ada", email: "ada@example.com", url: null },
    ]);
    expect(item?.categories).toEqual([
      { term: "alpha", label: "alpha", url: null },
    ]);
    expect(item?.enclosures).toEqual([
      {
        url: "https://example.com/audio.mp3",
        type: "audio/mpeg",
        length: 1234,
      },
    ]);
    expect(Object.isFrozen(item?.authors[0])).toBe(true);
    expect(Object.isFrozen(item?.enclosures[0])).toBe(true);
  });

  it("returns an empty frozen items list for an empty channel", () => {
    const dump = parseRssXml(loadFixture("empty.xml"));
    assertDumpShape(dump);
    expect(dump.feed).toEqual({
      title: "Empty Fixture",
      link: "https://example.com/",
      description: "No feed items",
      updated: null,
      authors: [],
      categories: [],
      image: null,
    });
    expect(dump.items).toEqual([]);
    expect(Object.isFrozen(dump.items)).toBe(true);
  });

  it("throws RssParseError on malformed XML", () => {
    expect(() => parseRssXml(loadFixture("malformed.xml"))).toThrow(
      RssParseError,
    );
  });

  it("maps Atom id, content, summary, authors, categories, and enclosures", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Atom dump</title>
  <link href="https://example.com/atom.xml" rel="self"/>
  <link href="https://example.com/" rel="alternate"/>
  <id>urn:uuid:atom-dump</id>
  <updated>2026-08-16T12:00:00Z</updated>
  <author>
    <name>Chan</name>
    <email>chan@example.com</email>
    <uri>https://example.com/chan</uri>
  </author>
  <category term="feed-cat" label="Feed Cat" scheme="https://example.com/tags"/>
  <logo>https://example.com/logo.png</logo>
  <subtitle>Atom subtitle</subtitle>
  <entry>
    <title>Has content</title>
    <link href="https://example.com/atom/c" rel="alternate"/>
    <link href="https://example.com/pod.mp3" rel="enclosure" type="audio/mpeg" length="99"/>
    <id>urn:uuid:atom-c</id>
    <published>2026-08-16T11:00:00Z</published>
    <updated>2026-08-16T11:30:00Z</updated>
    <author>
      <name>Ada</name>
      <email>ada@example.com</email>
    </author>
    <category term="alpha"/>
    <summary>Atom summary</summary>
    <content type="html">&lt;p&gt;Atom body&lt;/p&gt;</content>
  </entry>
</feed>`;
    const dump = parseRssXml(xml);
    assertDumpShape(dump);
    expect(dump.feed).toEqual({
      title: "Atom dump",
      link: "https://example.com/",
      description: "Atom subtitle",
      updated: "2026-08-16T12:00:00.000Z",
      authors: [
        {
          name: "Chan",
          email: "chan@example.com",
          url: "https://example.com/chan",
        },
      ],
      categories: [
        {
          term: "feed-cat",
          label: "Feed Cat",
          url: "https://example.com/tags",
        },
      ],
      image: { title: null, url: "https://example.com/logo.png" },
    });
    expect(leftoverOf(dump.items[0] as RssFeedItem)).toEqual({
      title: "Has content",
      url: "https://example.com/atom/c",
      published_at: "2026-08-16T11:00:00.000Z",
    });
    expect(dump.items[0]).toEqual({
      id: "urn:uuid:atom-c",
      title: "Has content",
      url: "https://example.com/atom/c",
      published_at: "2026-08-16T11:00:00.000Z",
      updated: "2026-08-16T11:30:00.000Z",
      content: "<p>Atom body</p>",
      summary: "Atom summary",
      authors: [{ name: "Ada", email: "ada@example.com", url: null }],
      categories: [{ term: "alpha", label: "alpha", url: null }],
      enclosures: [
        { url: "https://example.com/pod.mp3", type: "audio/mpeg", length: 99 },
      ],
    });
  });

  it("maps every parser media entry into frozen enclosures", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>Media</title>
    <link>https://example.com/</link>
    <description>d</description>
    <item>
      <title>Two enclosures</title>
      <link>https://example.com/two</link>
      <guid>two</guid>
      <enclosure url="https://example.com/a.mp3" type="audio/mpeg" length="1"/>
      <media:content url="https://example.com/b.jpg" type="image/jpeg" filesize="2"/>
    </item>
  </channel>
</rss>`;
    const dump = parseRssXml(xml);
    const item = dump.items[0];
    expect(item?.id).toBe("two");
    expect(item?.enclosures).toEqual([
      { url: "https://example.com/a.mp3", type: "audio/mpeg", length: 1 },
      { url: "https://example.com/b.jpg", type: "image/jpeg", length: 2 },
    ]);
    expect(Object.isFrozen(item?.enclosures)).toBe(true);
    expect(Object.isFrozen(item?.enclosures[1])).toBe(true);
  });

  it("parses an XML string and never calls fetch or a parser URL helper", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const dump = parseRssXml(loadFixture("atom.xml"));
    expect(dump.items).toHaveLength(8);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(PARSE_SOURCE).toContain(
      'import { parseFeed } from "@rowanmanning/feed-parser"',
    );
    expect(PARSE_SOURCE).toContain("parsed = parseFeed(xml)");
    expect(PARSE_SOURCE).not.toMatch(/from ["']rss-parser["']/u);
    expect(PARSE_SOURCE).not.toMatch(/\bparseURL\b/u);
    expect(PARSE_SOURCE).not.toMatch(/\bfromURL\b/u);
    expect(PARSE_SOURCE).not.toMatch(/\bfetch\s*\(/u);
    expect(PARSE_SOURCE).not.toMatch(/from ["']\.\/ssrf\.js["']/u);
  });

  it("does not read disk for an XXE SYSTEM file:// entity", () => {
    let dump: RssFeedDump | undefined;
    try {
      dump = parseRssXml(loadFixture("xxe.xml"));
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(RssParseError);
      return;
    }
    const blob = JSON.stringify(dump);
    expect(blob).not.toMatch(/root:.*:0:0/u);
    expect(blob).not.toContain("xxe-canary-should-not-appear");
  });
});
