import { readFile } from "node:fs/promises";
import {
  githubWidgetRegistry,
  HTTP_BITS_USED,
  RSS_BITS_USED,
  WAKATIME_BITS_USED,
} from "@profile-bits/plugins";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  isPreviewGithubWidgetId,
  PREVIEW_PLUGIN_IDS,
  PREVIEW_WIDGET_IDS,
} from "@/src/preview/types";
import GenerateWidgetsPage, {
  WIDGETS_HREF,
  WIDGETS_PLUGIN_IDS,
  widgetCatalogRows,
} from "./page";

const PAGE_URL = new URL("./page.tsx", import.meta.url);

const EIGHT_WIDGETS = [
  "demo",
  "stats",
  "languages",
  "repo",
  "coding",
  "feed",
  "json",
  "chips",
] as const;

describe("generate widgets catalog", () => {
  it("does not index githubWidgetRegistry for coding or other non-github widgets", async () => {
    const source = await readFile(PAGE_URL, "utf8");

    expect(source).not.toContain("use client");
    expect(source).not.toContain("githubWidgetRegistry[");
    expect(source).not.toContain("githubWidgetRegistry[id]");
    expect(source).toContain("bitsUsedForWidget");
    expect(source).toContain("isPreviewGithubWidgetId");
    expect(source).toContain("WAKATIME_BITS_USED");
    expect(source).toContain("RSS_BITS_USED");
    expect(source).toContain("HTTP_BITS_USED");
    expect(source).toContain("PREVIEW_WIDGETS_BY_PLUGIN");
    expect(source).not.toContain("/generate/github/coding");
    expect(source).not.toMatch(/\byaml\b/i);
    expect(githubWidgetRegistry).not.toHaveProperty("coding");
    expect(githubWidgetRegistry).not.toHaveProperty("feed");
    expect(githubWidgetRegistry).not.toHaveProperty("json");
    expect(githubWidgetRegistry).not.toHaveProperty("chips");
  });

  it("lists eight widgets with pack-scoped hrefs and pack bitsUsed", () => {
    const rows = widgetCatalogRows();

    expect(WIDGETS_PLUGIN_IDS).toEqual(["github", "wakatime", "rss", "http"]);
    expect(WIDGETS_PLUGIN_IDS).toEqual(PREVIEW_PLUGIN_IDS);
    expect(WIDGETS_HREF).toBe("/generate/widgets");
    expect(rows.map((row) => row.id)).toEqual([...EIGHT_WIDGETS]);
    expect(rows.map((row) => row.id)).toEqual([...PREVIEW_WIDGET_IDS]);

    const byId = Object.fromEntries(rows.map((row) => [row.id, row]));

    expect(byId.demo).toMatchObject({
      plugin: "github",
      href: "/generate/github/demo",
    });
    expect(byId.coding).toMatchObject({
      plugin: "wakatime",
      href: "/generate/wakatime/coding",
    });
    expect(byId.feed).toMatchObject({
      plugin: "rss",
      href: "/generate/rss/feed",
    });
    expect(byId.json).toMatchObject({
      plugin: "http",
      href: "/generate/http/json",
    });
    expect(byId.chips).toMatchObject({
      plugin: "http",
      href: "/generate/http/chips",
    });

    for (const row of rows) {
      if (isPreviewGithubWidgetId(row.id)) {
        expect(row.plugin).toBe("github");
        expect(row.href).toBe(`/generate/github/${row.id}`);
        expect(row.bitsUsed).toEqual([
          ...githubWidgetRegistry[row.id].bitsUsed,
        ]);
      }
    }

    expect(byId.coding.bitsUsed).toEqual([...WAKATIME_BITS_USED]);
    expect(byId.feed.bitsUsed).toEqual([...RSS_BITS_USED]);
    expect(byId.json.bitsUsed).toEqual([...HTTP_BITS_USED]);
    expect(byId.chips.bitsUsed).toEqual([...HTTP_BITS_USED]);
    expect(byId.coding.href).not.toBe("/generate/github/coding");
  });

  it("renders four packs and eight widget rows without github/coding hrefs", () => {
    const html = renderToStaticMarkup(createElement(GenerateWidgetsPage));

    expect(html).toContain('data-slot="generate-widgets"');
    expect(html).toContain('data-plugins="github wakatime rss http"');
    expect(html).toContain('data-href="/generate/widgets"');
    for (const plugin of WIDGETS_PLUGIN_IDS) {
      expect(html).toContain(`<code>${plugin}</code>`);
    }
    for (const widget of EIGHT_WIDGETS) {
      expect(html).toContain(`data-widget="${widget}"`);
    }
    expect(html).toContain('href="/generate/github/demo"');
    expect(html).toContain('href="/generate/github/repo"');
    expect(html).toContain('href="/generate/wakatime/coding"');
    expect(html).toContain('href="/generate/rss/feed"');
    expect(html).toContain('href="/generate/http/json"');
    expect(html).toContain('href="/generate/http/chips"');
    expect(html).not.toContain('href="/generate/github/coding"');
    expect(html).not.toContain('href="/generate/github/feed"');
    expect(html).not.toContain('href="/generate/github/json"');
    expect(html).not.toContain('href="/generate/github/chips"');
    expect(html).toContain('data-plugin="wakatime"');
    expect(html).toContain('data-plugin="rss"');
    expect(html).toContain('data-plugin="http"');
    expect(html).toContain("480×160");
    expect(html.toLowerCase()).not.toContain("yaml");
  });
});
