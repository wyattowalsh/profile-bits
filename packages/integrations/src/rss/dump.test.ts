import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createRssClient, RssClientError } from "./client.js";
import { loadFixture } from "./loadFixture.js";
import { parseRssXml, type RssFeedDump, type RssFeedItem } from "./parse.js";
import {
  RSS_MAX_BYTES,
  type RssFetch,
  type RssLookup,
  RssSsrfError,
  ssrfGet,
} from "./ssrf.js";

const PUBLIC_V4 = "93.184.216.34";
const FEED_URL = "https://example.com/feed.xml";
const ATOM_HOURS = [11, 10, 9, 8, 7, 6, 5, 4] as const;

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

const PARSE_SOURCE = readFileSync(
  fileURLToPath(new URL("./parse.ts", import.meta.url)),
  "utf8",
);
const CLIENT_SOURCE = readFileSync(
  fileURLToPath(new URL("./client.ts", import.meta.url)),
  "utf8",
);
const SSRF_SOURCE = readFileSync(
  fileURLToPath(new URL("./ssrf.ts", import.meta.url)),
  "utf8",
);
const SSRF_TEST_SOURCE = readFileSync(
  fileURLToPath(new URL("./ssrf.test.ts", import.meta.url)),
  "utf8",
);

function publicLookup(): RssLookup {
  return async () => [{ address: PUBLIC_V4, family: 4 }];
}

function xmlResponse(
  body: string,
  init: { status?: number; headers?: Record<string, string> } = {},
): Response {
  return new Response(body, {
    status: init.status ?? 200,
    headers: init.headers,
  });
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

function assertDumpShape(dump: RssFeedDump): void {
  expect(Array.isArray(dump)).toBe(false);
  expect(Object.keys(dump).sort()).toEqual(["feed", "items"]);
  expect(Object.keys(dump.feed).sort()).toEqual([...DUMP_FEED_KEYS].sort());
  expect(Object.isFrozen(dump)).toBe(true);
  expect(Object.isFrozen(dump.feed)).toBe(true);
  expect(Object.isFrozen(dump.items)).toBe(true);
}

function assertAtomContentId(dump: RssFeedDump): void {
  expect(dump.items).toHaveLength(8);
  expect(Object.keys(dump.items[0] ?? {}).sort()).toEqual(
    [...DUMP_ITEM_KEYS].sort(),
  );
  for (const [index, item] of dump.items.entries()) {
    const n = index + 1;
    const hour = String(ATOM_HOURS[index]).padStart(2, "0");
    expect(item.id).toBe(`https://example.com/atom/${n}`);
    expect(item.content).toBe(`<p>Atom content ${n}</p>`);
    expect(item.summary).toBe(`Atom summary ${n}`);
    expect(leftoverOf(item)).toEqual({
      title: `Atom Item ${n}`,
      url: `https://example.com/atom/${n}`,
      published_at: `2026-08-16T${hour}:00:00.000Z`,
    });
  }
}

function isFailWidget(error: unknown): boolean {
  return error instanceof RssClientError && error.outcome === "fail_widget";
}

describe("rss dump", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("Atom fixture XML has id and content the leftover triple dropped", () => {
    const xml = loadFixture("atom.xml");
    expect(xml).toContain("<id>https://example.com/atom/1</id>");
    expect(xml).toContain("<id>https://example.com/atom/8</id>");
    expect(xml).toMatch(/<content\b[^>]*>/u);
    expect(xml).toContain("Atom content 1");
    expect(xml).toContain("Atom content 8");
  });

  it("parsed Atom dump exposes id and content, not only title/url/published_at", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const dump = parseRssXml(loadFixture("atom.xml"));
    assertDumpShape(dump);
    assertAtomContentId(dump);
    expect(dump.feed).toEqual({
      title: "Profile Bits Atom Fixture",
      link: "https://example.com/",
      description: "",
      updated: "2026-08-16T12:00:00.000Z",
      authors: [],
      categories: [],
      image: null,
    });
    expect(JSON.stringify(dump)).not.toMatch(/Authorization|Bearer|token/i);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("ssrfGet of the Atom fixture parses into the same frozen dump", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const fetch = vi.fn<RssFetch>(async () =>
      xmlResponse(loadFixture("atom.xml")),
    );
    const lookup = vi.fn(publicLookup());
    const result = await ssrfGet(FEED_URL, { fetch, lookup });
    const dump = parseRssXml(result.body);

    expect(result.status).toBe(200);
    expect(lookup).toHaveBeenCalledWith("example.com", { all: true });
    assertDumpShape(dump);
    assertAtomContentId(dump);
    expect(dump).toEqual(parseRssXml(loadFixture("atom.xml")));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("client fetchFeed returns the unsliced frozen Atom dump through SSRF GET", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const fetch = vi.fn<RssFetch>(async () =>
      xmlResponse(loadFixture("atom.xml")),
    );
    const lookup = vi.fn(publicLookup());
    const client = createRssClient({ fetch, lookup });
    const dump = await client.fetchFeed(FEED_URL);

    assertDumpShape(dump);
    assertAtomContentId(dump);
    expect(dump).toEqual(parseRssXml(loadFixture("atom.xml")));
    expect(dump.items).toHaveLength(8);
    expect(CLIENT_SOURCE).not.toContain(".slice(");
    expect(CLIENT_SOURCE).toContain("ssrfGet");
    expect(CLIENT_SOURCE).toContain("parseRssXml");
    expect(lookup).toHaveBeenCalledWith("example.com", { all: true });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("parsed RSS 2.0 dump maps guid to id and keeps content:encoded", () => {
    const dump = parseRssXml(loadFixture("rss2.xml"));
    assertDumpShape(dump);
    expect(dump.items).toHaveLength(8);
    expect(dump.items[0]?.id).toBe("https://example.com/rss/1");
    expect(dump.items[0]?.content).toBe("<p>RSS content 1</p>");
    expect(dump.items[7]?.id).toBe("https://example.com/rss/8");
    expect(dump.items[7]?.content).toBe("<p>RSS content 8</p>");
    expect(leftoverOf(dump.items[0] as RssFeedItem)).toEqual({
      title: "RSS Item 1",
      url: "https://example.com/rss/1",
      published_at: "2026-08-16T11:00:00.000Z",
    });
  });

  it.each([
    "http://example.com/feed.xml",
    "https://github.com/octocat.atom",
    "https://raw.githubusercontent.com/org/repo/main/feed.xml",
    "https://user:pass@example.com/feed.xml",
    "https://127.0.0.1/feed.xml",
  ])("does not dump when SSRF or GitHub-host rejects %s", async (url) => {
    const fetch = vi.fn<RssFetch>();
    const lookup = vi.fn(publicLookup());
    const client = createRssClient({ fetch, lookup });

    await expect(client.fetchFeed(url)).rejects.toSatisfy(isFailWidget);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not dump when the SSRF body exceeds 1 MiB", async () => {
    const oversize = "x".repeat(RSS_MAX_BYTES + 1);
    const fetch = vi.fn<RssFetch>(async () => xmlResponse(oversize));
    const client = createRssClient({ fetch, lookup: publicLookup() });

    await expect(client.fetchFeed(FEED_URL)).rejects.toSatisfy(
      (error: unknown) =>
        isFailWidget(error) &&
        error instanceof RssClientError &&
        error.cause instanceof RssSsrfError &&
        error.cause.message === "body exceeds 1 MiB",
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("ssrfGet rejects GitHub-owned hosts before returning a body", async () => {
    const fetch = vi.fn<RssFetch>();
    const lookup = vi.fn(publicLookup());
    await expect(
      ssrfGet("https://github.com/octocat.atom", { fetch, lookup }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof RssSsrfError && error.message === "github-owned host",
    );
    expect(fetch).not.toHaveBeenCalled();
    expect(lookup).not.toHaveBeenCalled();
  });
});

describe("rss dump source locks", () => {
  it("keeps parser-without-HTTP and live client.ts (no author-integration add)", () => {
    expect(PARSE_SOURCE).toContain(
      'import { parseFeed } from "@rowanmanning/feed-parser"',
    );
    expect(PARSE_SOURCE).toContain("parsed = parseFeed(xml)");
    expect(PARSE_SOURCE).not.toMatch(/\bparseURL\b/u);
    expect(PARSE_SOURCE).not.toMatch(/\bfromURL\b/u);
    expect(PARSE_SOURCE).not.toMatch(/\bfetch\s*\(/u);
    expect(CLIENT_SOURCE).toContain("export function createRssClient");
    expect(CLIENT_SOURCE).not.toMatch(/author-integration add/u);
  });

  it("keeps SSRF 1 MiB, GitHub-owned hosts, https-only, and no URL userinfo", () => {
    expect(RSS_MAX_BYTES).toBe(1_048_576);
    expect(SSRF_SOURCE).toContain("RSS_MAX_BYTES = 1_048_576");
    expect(SSRF_SOURCE).toContain("isGithubOwnedHost");
    expect(SSRF_SOURCE).toContain("allowUsername: false");
    expect(SSRF_SOURCE).toContain('allowedProtocols: ["https"]');
    expect(SSRF_SOURCE).toContain('parsed.protocol !== "https:"');
    expect(SSRF_SOURCE).toContain("body exceeds 1 MiB");
  });

  it("leaves existing SSRF tests in place", () => {
    expect(SSRF_TEST_SOURCE).toContain("rejects http:// before fetch");
    expect(SSRF_TEST_SOURCE).toContain("rejects an oversize body");
    expect(SSRF_TEST_SOURCE).toContain(
      "rejects a lying Content-Length over 1 MiB",
    );
    expect(SSRF_TEST_SOURCE).toContain("rejects userinfo before fetch");
    expect(SSRF_TEST_SOURCE).toContain("rejects a redirect to github.com");
    expect(SSRF_TEST_SOURCE).toContain("rejects a redirect to http");
    expect(SSRF_TEST_SOURCE).toContain(
      "rejects a private hostname via mocked DNS",
    );
    expect(SSRF_TEST_SOURCE).toContain(
      "pins https.request to an options bag without Authorization",
    );
    expect(SSRF_TEST_SOURCE).not.toContain("createRssClient");
  });
});
