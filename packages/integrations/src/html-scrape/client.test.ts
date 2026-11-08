import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { RunLogEvent } from "@profile-bits/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createHtmlScrapeClient,
  HtmlScrapeError,
  scrapeHtml,
} from "./index.js";
import { loadFixture } from "./loadFixture.js";
import { parseHtml } from "./parse.js";
import {
  HTML_ACCEPT,
  HTML_MAX_BYTES,
  HTML_USER_AGENT,
  type HtmlFetch,
  type HtmlLookup,
} from "./ssrf.js";

const PUBLIC_V4 = "93.184.216.34";
const PAGE_URL = "https://example.com/public";

function publicLookup(): HtmlLookup {
  return async () => [{ address: PUBLIC_V4, family: 4 }];
}

function htmlResponse(
  body: string,
  init: { status?: number; headers?: Record<string, string> } = {},
): Response {
  return new Response(body, {
    status: init.status ?? 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      ...init.headers,
    },
  });
}

describe("createHtmlScrapeClient", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps the public HTML fixture into a frozen typed dump", async () => {
    const fetch = vi.fn<HtmlFetch>(async () =>
      htmlResponse(loadFixture("public.html")),
    );
    const client = createHtmlScrapeClient({ fetch, lookup: publicLookup() });
    const dump = await client.scrape(PAGE_URL);
    const expected = parseHtml({
      html: loadFixture("public.html"),
      url: PAGE_URL,
      status: 200,
      contentType: "text/html; charset=utf-8",
    }).dump;

    expect(dump).toEqual(expected);
    expect(Object.isFrozen(dump)).toBe(true);
    expect(dump.title).toBe("Profile Bits Public Fixture");
    expect(dump.openGraph.title).toBe("OG Public Fixture");
    expect(dump.jsonLd[0]).toMatchObject({ "@type": "WebPage" });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]?.[1]?.headers?.Accept).toBe(HTML_ACCEPT);
    expect(fetch.mock.calls[0]?.[1]?.headers?.["User-Agent"]).toBe(
      HTML_USER_AGENT,
    );
    expect(fetch.mock.calls[0]?.[1]?.headers?.Authorization).toBeUndefined();
  });

  it("exposes scrapeHtml as the function widgets and docs call", async () => {
    const fetch = vi.fn<HtmlFetch>(async () =>
      htmlResponse(loadFixture("public.html")),
    );
    const dump = await scrapeHtml(PAGE_URL, { fetch, lookup: publicLookup() });
    expect(dump.title).toBe("Profile Bits Public Fixture");
    expect(dump.headings[0]).toEqual({ level: 1, text: "Public heading" });
  });

  it("records one call event on a successful fixture GET", async () => {
    const events: RunLogEvent[] = [];
    const fetch = vi.fn<HtmlFetch>(async () =>
      htmlResponse(loadFixture("public.html")),
    );
    const client = createHtmlScrapeClient({
      fetch,
      lookup: publicLookup(),
      logger: (event) => {
        events.push(event);
      },
    });

    await client.scrape(PAGE_URL);
    await client.scrape(PAGE_URL);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      v: 1,
      src: "profile-bits",
      kind: "call",
      pkg: "integrations",
      op: "html.get",
      outcome: "ok",
      status: 200,
      host: "example.com",
      path: "/public",
    });
    expect(events[0]?.duration_ms).toEqual(expect.any(Number));
    expect(JSON.stringify(events)).not.toMatch(/Authorization|Bearer|token/i);
  });

  it("refuses a login-wall fixture", async () => {
    const fetch = vi.fn<HtmlFetch>(async () =>
      htmlResponse(loadFixture("login-wall.html")),
    );
    const client = createHtmlScrapeClient({ fetch, lookup: publicLookup() });
    await expect(client.scrape("https://example.com/login")).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof HtmlScrapeError &&
        error.message === "login wall" &&
        error.code === "login_wall" &&
        error.outcome === "fail_widget",
    );
  });

  it("refuses a Cloudflare challenge fixture", async () => {
    const fetch = vi.fn<HtmlFetch>(async () =>
      htmlResponse(loadFixture("challenge.html")),
    );
    const client = createHtmlScrapeClient({ fetch, lookup: publicLookup() });
    await expect(client.scrape(PAGE_URL)).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof HtmlScrapeError &&
        error.message === "tos-hostile target" &&
        error.code === "tos_hostile",
    );
  });

  it("fails github-owned hosts before fetch", async () => {
    const fetch = vi.fn<HtmlFetch>();
    const client = createHtmlScrapeClient({ fetch, lookup: publicLookup() });
    await expect(client.scrape("https://github.com/octocat")).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof HtmlScrapeError &&
        error.message === "github-owned host" &&
        error.code === "ssrf",
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fails when Content-Length exceeds 1 MiB before reading", async () => {
    const fetch = vi.fn<HtmlFetch>(async () => ({
      status: 200,
      headers: {
        get(name: string) {
          return name.toLowerCase() === "content-length"
            ? String(HTML_MAX_BYTES + 1)
            : "text/html";
        },
      },
      body: null,
    }));
    const client = createHtmlScrapeClient({ fetch, lookup: publicLookup() });
    await expect(client.scrape(PAGE_URL)).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof HtmlScrapeError &&
        error.message === "body exceeds 1 MiB" &&
        error.code === "body_too_large",
    );
  });

  it("does not import a browser runtime", () => {
    const dir = dirname(fileURLToPath(import.meta.url));
    const files = readdirSync(dir).filter(
      (name) => name.endsWith(".ts") && !name.endsWith(".test.ts"),
    );
    const banned = ["play", "wright"].join("");
    for (const name of files) {
      const source = readFileSync(join(dir, name), "utf8").toLowerCase();
      expect(source, name).not.toContain(banned);
    }
  });
});
