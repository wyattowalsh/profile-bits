import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createRssClient,
  loadFixture,
  parseRssXml,
  type RssFetch,
  type RssLookup,
} from "@profile-bits/integrations";
import { fromJsx } from "@profile-bits/renderer";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderFeedFromClient } from "../feed/index.js";
import { renderLatestFromClient, renderLatestSvg } from "./render.js";
import { sliceLatestItems } from "./view-model.js";
import { LatestWidget, NO_LATEST_ITEM } from "./widget.js";

const PUBLIC_V4 = "93.184.216.34";
const FEED_URL = "https://example.com/feed.xml";

const WIDGET_SOURCE = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "widget.tsx"),
  "utf8",
);
const RENDER_SOURCE = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "render.ts"),
  "utf8",
);
const VIEW_SOURCE = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "view-model.ts"),
  "utf8",
);

type TakumiNode = {
  type: string;
  text?: string;
  style?: Record<string, unknown>;
  children?: TakumiNode[];
};

function collectTexts(node: TakumiNode): string[] {
  const texts: string[] = [];
  if (typeof node.text === "string" && node.text.length > 0) {
    texts.push(node.text);
  }
  for (const child of node.children ?? []) {
    texts.push(...collectTexts(child));
  }
  return texts;
}

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

function publicLookup(): RssLookup {
  return async () => [{ address: PUBLIC_V4, family: 4 }];
}

describe("latest widget", () => {
  it("composes Time for updated timestamps without HTTP", async () => {
    expect(globalThis.document).toBeUndefined();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const dump = parseRssXml(loadFixture("atom.xml"));
    const items = sliceLatestItems(dump, 1);
    const node = (await fromJsx(
      createElement(LatestWidget, { items }),
    )) as TakumiNode;
    const texts = collectTexts(node);
    expect(texts).toContain("Atom Item 1");
    expect(texts).toContain("2026-08-16 11:00");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("falls back to published_at and honors timezone on Time", async () => {
    const node = (await fromJsx(
      createElement(LatestWidget, {
        items: [
          {
            title: "Solo",
            url: "https://example.com/solo",
            at: "2026-08-16T11:00:00.000Z",
          },
        ],
        timezone: "America/New_York",
      }),
    )) as TakumiNode;
    expect(collectTexts(node)).toContain("2026-08-16 07:00");
  });

  it("renders No latest item for an empty dump items list", async () => {
    const dump = parseRssXml(loadFixture("empty.xml"));
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    expect(sliceLatestItems(dump, 1)).toEqual([]);
    const node = (await fromJsx(
      createElement(LatestWidget, { items: sliceLatestItems(dump, 1) }),
    )) as TakumiNode;
    expect(collectTexts(node)).toContain(NO_LATEST_ITEM);
    const svg = await renderLatestSvg({ items: dump, limit: 1 });
    assertBakedStillSvg(svg);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("emits a 480×160 baked-still svg for limit 1 and 8", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const atomDump = parseRssXml(loadFixture("atom.xml"));
    const rssDump = parseRssXml(loadFixture("rss2.xml"));
    const limit1 = await renderLatestSvg({ items: atomDump, limit: 1 });
    const limit8 = await renderLatestSvg({ items: rssDump, limit: 8 });
    assertBakedStillSvg(limit1);
    assertBakedStillSvg(limit8);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("bakes mocha bg hex instead of Primer dark", async () => {
    const dump = parseRssXml(loadFixture("atom.xml"));
    const svg = await renderLatestSvg({
      items: dump,
      limit: 1,
      theme: "catppuccin-mocha",
    });
    assertBakedStillSvg(svg);
    expect(svg).toContain("#1e1e2e");
    expect(svg).not.toContain("#0d1117");
  });

  it("consumes a stub rss dump with no HTTP", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const dump = parseRssXml(loadFixture("atom.xml"));
    const svg = await renderLatestFromClient(
      { fetchFeed: async () => dump },
      { url: FEED_URL, limit: 1 },
    );
    assertBakedStillSvg(svg);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("shares one run-scoped rss client with feed for the same URL", async () => {
    const fetch = vi.fn<RssFetch>(
      async () =>
        new Response(loadFixture("atom.xml"), {
          status: 200,
        }),
    );
    const client = createRssClient({ fetch, lookup: publicLookup() });
    const latest = await renderLatestFromClient(client, {
      url: FEED_URL,
      limit: 1,
    });
    const feed = await renderFeedFromClient(client, {
      url: FEED_URL,
      limit: 5,
    });
    assertBakedStillSvg(latest);
    assertBakedStillSvg(feed);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("stays Takumi-safe: Time bit, no fetch in widget modules", () => {
    expect(WIDGET_SOURCE).toContain('from "@profile-bits/bits"');
    expect(WIDGET_SOURCE).toContain("<Time");
    expect(WIDGET_SOURCE).toContain("NO_LATEST_ITEM");
    expect(WIDGET_SOURCE).not.toContain("react-dom");
    expect(WIDGET_SOURCE).not.toContain("useEffect");
    expect(RENDER_SOURCE).toContain("client.fetchFeed");
    for (const source of [WIDGET_SOURCE, RENDER_SOURCE, VIEW_SOURCE]) {
      expect(source).not.toMatch(/\bfetch\s*\(/);
      expect(source).not.toContain("plugin_rss_latest");
    }
  });
});
