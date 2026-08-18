import { afterEach, describe, expect, it, vi } from "vitest";
import { createRssClient, RssClientError } from "./client.js";
import { loadFixture } from "./loadFixture.js";
import { RSS_RETRY_AFTER_CAP_MS } from "./outcomes.js";
import { parseRssXml } from "./parse.js";
import {
  RSS_ACCEPT,
  RSS_USER_AGENT,
  type RssFetch,
  type RssLookup,
} from "./ssrf.js";

const PUBLIC_V4 = "93.184.216.34";
const FEED_URL = "https://example.com/feed.xml";

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

describe("createRssClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("parses the Atom fixture into a full frozen list", async () => {
    const fetch = vi.fn<RssFetch>(async () =>
      xmlResponse(loadFixture("atom.xml")),
    );
    const client = createRssClient({ fetch, lookup: publicLookup() });
    const items = await client.fetchFeed(FEED_URL);
    const expected = parseRssXml(loadFixture("atom.xml"));

    expect(items).toHaveLength(8);
    expect(items).toEqual(expected);
    expect(Object.isFrozen(items)).toBe(true);
    expect(Object.isFrozen(items[0])).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("parses the RSS 2.0 fixture into a full frozen list", async () => {
    const fetch = vi.fn<RssFetch>(async () =>
      xmlResponse(loadFixture("rss2.xml")),
    );
    const client = createRssClient({ fetch, lookup: publicLookup() });
    const items = await client.fetchFeed(FEED_URL);

    expect(items).toHaveLength(8);
    expect(items).toEqual(parseRssXml(loadFixture("rss2.xml")));
    expect(Object.isFrozen(items)).toBe(true);
    expect(items[0]).toEqual({
      title: "RSS Item 1",
      url: "https://example.com/rss/1",
      published_at: "2026-08-16T11:00:00.000Z",
    });
  });

  it("returns an empty frozen list for an empty feed", async () => {
    const fetch = vi.fn<RssFetch>(async () =>
      xmlResponse(loadFixture("empty.xml")),
    );
    const client = createRssClient({ fetch, lookup: publicLookup() });
    const items = await client.fetchFeed(FEED_URL);

    expect(items).toEqual([]);
    expect(Object.isFrozen(items)).toBe(true);
  });

  it.each([401, 403, 404])(
    "maps HTTP %s to fail_widget without retry",
    async (status) => {
      const fetch = vi.fn<RssFetch>(async () => xmlResponse("", { status }));
      const sleep = vi.fn(async () => {});
      const client = createRssClient({
        fetch,
        lookup: publicLookup(),
        sleep,
      });

      await expect(client.fetchFeed(FEED_URL)).rejects.toMatchObject({
        name: "RssClientError",
        outcome: "fail_widget",
        status,
      });
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(sleep).not.toHaveBeenCalled();
    },
  );

  it.each([429, 500, 503])(
    "retries HTTP %s then fail_widget",
    async (status) => {
      const fetch = vi.fn<RssFetch>(async () => xmlResponse("", { status }));
      const sleep = vi.fn(async () => {});
      const client = createRssClient({
        fetch,
        lookup: publicLookup(),
        sleep,
      });

      await expect(client.fetchFeed(FEED_URL)).rejects.toSatisfy(
        (error: unknown) =>
          error instanceof RssClientError &&
          error.outcome === "fail_widget" &&
          error.status === status,
      );
      expect(fetch).toHaveBeenCalledTimes(3);
      expect(sleep).toHaveBeenCalledTimes(2);
      expect(sleep).toHaveBeenNthCalledWith(1, 200);
      expect(sleep).toHaveBeenNthCalledWith(2, 400);
    },
  );

  it.each([
    { retryAfter: "30", delayMs: RSS_RETRY_AFTER_CAP_MS },
    { retryAfter: "5", delayMs: 5_000 },
  ])(
    "honors Retry-After $retryAfter s (capped at 10s) then fail_widget",
    async ({ retryAfter, delayMs }) => {
      const fetch = vi.fn<RssFetch>(async () =>
        xmlResponse("", {
          status: 429,
          headers: { "retry-after": retryAfter },
        }),
      );
      const sleep = vi.fn(async () => {});
      const client = createRssClient({
        fetch,
        lookup: publicLookup(),
        sleep,
      });

      await expect(client.fetchFeed(FEED_URL)).rejects.toSatisfy(
        (error: unknown) =>
          error instanceof RssClientError &&
          error.outcome === "fail_widget" &&
          error.status === 429,
      );
      expect(fetch).toHaveBeenCalledTimes(3);
      expect(sleep).toHaveBeenCalledTimes(2);
      expect(sleep).toHaveBeenNthCalledWith(1, delayMs);
      expect(sleep).toHaveBeenNthCalledWith(2, delayMs);
    },
  );

  it("fails the widget for a GitHub-owned host before connect", async () => {
    const fetch = vi.fn<RssFetch>();
    const lookup = vi.fn(publicLookup());
    const client = createRssClient({ fetch, lookup });

    await expect(
      client.fetchFeed("https://github.com/octocat.atom"),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof RssClientError &&
        error.outcome === "fail_widget" &&
        error.message === "github-owned host",
    );
    await expect(
      client.fetchFeed("https://GitHub.COM./octocat.atom"),
    ).rejects.toBeInstanceOf(RssClientError);
    await expect(
      client.fetchFeed(
        "https://raw.githubusercontent.com/org/repo/main/feed.xml",
      ),
    ).rejects.toBeInstanceOf(RssClientError);

    expect(fetch).not.toHaveBeenCalled();
    expect(lookup).not.toHaveBeenCalled();
  });

  it.each([
    "https://user:pass@example.com/feed.xml",
    "https://user@example.com/feed.xml",
  ])("fails the widget for URL userinfo before connect (%s)", async (url) => {
    const fetch = vi.fn<RssFetch>();
    const lookup = vi.fn(publicLookup());
    const client = createRssClient({ fetch, lookup });

    await expect(client.fetchFeed(url)).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof RssClientError &&
        error.outcome === "fail_widget" &&
        error.message === "url userinfo",
    );
    expect(fetch).not.toHaveBeenCalled();
    expect(lookup).not.toHaveBeenCalled();
  });

  it("coalesces concurrent and sequential fetches of the same url", async () => {
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const fetch = vi.fn<RssFetch>(async () => {
      await gate;
      return xmlResponse(loadFixture("atom.xml"));
    });
    const client = createRssClient({ fetch, lookup: publicLookup() });

    const first = client.fetchFeed(FEED_URL);
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    const second = client.fetchFeed(FEED_URL);
    expect(fetch).toHaveBeenCalledTimes(1);

    release?.();
    const [a, b] = await Promise.all([first, second]);
    expect(a).toBe(b);
    expect(a).toHaveLength(8);

    const third = await client.fetchFeed(FEED_URL);
    expect(third).toBe(a);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("maps malformed XML to fail_widget", async () => {
    const fetch = vi.fn<RssFetch>(async () =>
      xmlResponse(loadFixture("malformed.xml")),
    );
    const client = createRssClient({ fetch, lookup: publicLookup() });

    await expect(client.fetchFeed(FEED_URL)).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof RssClientError && error.outcome === "fail_widget",
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("maps XXE fixture to fail_widget or ignores the entity without reading disk", async () => {
    const fetch = vi.fn<RssFetch>(async () =>
      xmlResponse(loadFixture("xxe.xml")),
    );
    const client = createRssClient({ fetch, lookup: publicLookup() });

    try {
      const items = await client.fetchFeed(FEED_URL);
      const blob = JSON.stringify(items);
      expect(blob).not.toMatch(/root:.*:0:0/u);
      expect(blob).not.toContain("xxe-canary-should-not-appear");
      expect(blob).not.toContain("/etc/passwd");
      expect(blob).not.toContain("root:x:0:0");
      expect(blob).not.toContain("/bin/bash");
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(RssClientError);
      expect((error as RssClientError).outcome).toBe("fail_widget");
      const leaked = `${(error as RssClientError).message}\n${String(error)}`;
      expect(leaked).not.toMatch(/root:.*:0:0/u);
      expect(leaked).not.toContain("root:x:0:0");
      expect(leaked).not.toContain("/bin/bash");
    }
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("maps a literal private IP to fail_widget before connect", async () => {
    const fetch = vi.fn<RssFetch>();
    const lookup = vi.fn(publicLookup());
    const client = createRssClient({ fetch, lookup });

    await expect(
      client.fetchFeed("https://127.0.0.1/feed.xml"),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof RssClientError && error.outcome === "fail_widget",
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("maps a DNS-mocked private host to fail_widget before connect", async () => {
    const fetch = vi.fn<RssFetch>();
    const lookup = vi.fn(async () => [{ address: "10.0.0.1", family: 4 }]);
    const client = createRssClient({ fetch, lookup });

    await expect(
      client.fetchFeed("https://internal.example/feed.xml"),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof RssClientError && error.outcome === "fail_widget",
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("never sends an Authorization header", async () => {
    const fetch = vi.fn<RssFetch>(async (_input, init) => {
      expect(init?.headers?.Authorization).toBeUndefined();
      expect(init?.headers).not.toHaveProperty("authorization");
      expect(init?.headers?.["User-Agent"]).toBe(RSS_USER_AGENT);
      expect(init?.headers?.Accept).toBe(RSS_ACCEPT);
      return xmlResponse(loadFixture("atom.xml"));
    });
    const sleep = vi.fn(async () => {});
    const retryFetch = vi.fn<RssFetch>(async (_input, init) => {
      expect(init?.headers?.Authorization).toBeUndefined();
      return xmlResponse("", { status: 429 });
    });

    const okClient = createRssClient({ fetch, lookup: publicLookup() });
    await okClient.fetchFeed(FEED_URL);
    expect(fetch).toHaveBeenCalledTimes(1);

    const retryClient = createRssClient({
      fetch: retryFetch,
      lookup: publicLookup(),
      sleep,
    });
    await expect(retryClient.fetchFeed(FEED_URL)).rejects.toBeInstanceOf(
      RssClientError,
    );
    expect(retryFetch).toHaveBeenCalledTimes(3);
    for (const [, init] of retryFetch.mock.calls) {
      expect(init?.headers?.Authorization).toBeUndefined();
    }
  });
});
