import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PREVIEW_PLUGIN_IDS, PREVIEW_WIDGET_IDS } from "@/src/preview/types";
import GenerateCatalogPage, {
  BITS_HREF,
  CATALOG_HREF,
  CATALOG_INDEX_HREFS,
  CATALOG_PLUGIN_ID,
  CATALOG_PLUGIN_IDS,
  CATALOG_WIDGET_IDS,
  catalogEntries,
  catalogWidgetHref,
  GITHUB_HREF,
  HTTP_HREF,
  packHref,
  RSS_HREF,
  WAKATIME_HREF,
  WIDGETS_HREF,
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

describe("/generate/catalog page (server)", () => {
  it("is a server page with no yaml rail and no githubWidgetRegistry", async () => {
    const source = await readFile(PAGE_URL, "utf8");

    expect(source).not.toContain("use client");
    expect(source).not.toContain("redirect(");
    expect(source).not.toContain("permanentRedirect");
    expect(source).not.toContain("source-drop");
    expect(source).not.toContain("code-rail");
    expect(source).not.toContain("export-workflow");
    expect(source).not.toMatch(/\byaml\b/i);
    expect(source).not.toContain("/playground");
    expect(source).not.toContain("githubWidgetRegistry");
    expect(source).not.toContain("/generate/github/coding");
    expect(source).toContain("wakatime");
    expect(source).toContain("rss");
    expect(source).toContain("coding");
    expect(source).toContain("feed");
    expect(source).toContain("PREVIEW_WIDGETS_BY_PLUGIN");
  });

  it("lists four packs and eight widgets without dumping them onto github", () => {
    expect(CATALOG_PLUGIN_ID).toBe("github");
    expect(CATALOG_PLUGIN_IDS).toEqual(["github", "wakatime", "rss", "http"]);
    expect(CATALOG_PLUGIN_IDS).toEqual(PREVIEW_PLUGIN_IDS);
    expect(CATALOG_WIDGET_IDS).toEqual([...EIGHT_WIDGETS]);
    expect(CATALOG_WIDGET_IDS).toEqual(PREVIEW_WIDGET_IDS);
    expect(CATALOG_HREF).toBe("/generate/catalog");
    expect(GITHUB_HREF).toBe("/generate/github");
    expect(WAKATIME_HREF).toBe("/generate/wakatime");
    expect(RSS_HREF).toBe("/generate/rss");
    expect(HTTP_HREF).toBe("/generate/http");
    expect(WIDGETS_HREF).toBe("/generate/widgets");
    expect(BITS_HREF).toBe("/generate/bits");
    expect(CATALOG_INDEX_HREFS).toEqual([
      "/generate/github",
      "/generate/wakatime",
      "/generate/rss",
      "/generate/http",
      "/generate/widgets",
      "/generate/bits",
    ]);
    expect(packHref("wakatime")).toBe("/generate/wakatime");
    expect(catalogWidgetHref("github", "demo")).toBe("/generate/github/demo");
    expect(catalogWidgetHref("wakatime", "coding")).toBe(
      "/generate/wakatime/coding",
    );
    expect(catalogWidgetHref("rss", "feed")).toBe("/generate/rss/feed");
    expect(catalogWidgetHref("http", "chips")).toBe("/generate/http/chips");
  });

  it("lists pack plus widget entries and index links for all four packs", () => {
    const entries = catalogEntries();
    const html = renderToStaticMarkup(createElement(GenerateCatalogPage));
    const pluginEntries = entries.filter((entry) => entry.kind === "plugin");
    const widgetEntries = entries.filter((entry) => entry.kind === "widget");

    expect(pluginEntries).toEqual([
      {
        id: "github",
        kind: "plugin",
        href: "/generate/github",
        label: "github pack",
      },
      {
        id: "wakatime",
        kind: "plugin",
        href: "/generate/wakatime",
        label: "wakatime pack",
      },
      {
        id: "rss",
        kind: "plugin",
        href: "/generate/rss",
        label: "rss pack",
      },
      {
        id: "http",
        kind: "plugin",
        href: "/generate/http",
        label: "http pack",
      },
    ]);
    expect(widgetEntries).toEqual([
      {
        id: "demo",
        kind: "widget",
        href: "/generate/github/demo",
        label: "demo",
      },
      {
        id: "stats",
        kind: "widget",
        href: "/generate/github/stats",
        label: "stats",
      },
      {
        id: "languages",
        kind: "widget",
        href: "/generate/github/languages",
        label: "languages",
      },
      {
        id: "repo",
        kind: "widget",
        href: "/generate/github/repo",
        label: "repo",
      },
      {
        id: "coding",
        kind: "widget",
        href: "/generate/wakatime/coding",
        label: "coding",
      },
      {
        id: "feed",
        kind: "widget",
        href: "/generate/rss/feed",
        label: "feed",
      },
      {
        id: "json",
        kind: "widget",
        href: "/generate/http/json",
        label: "json",
      },
      {
        id: "chips",
        kind: "widget",
        href: "/generate/http/chips",
        label: "chips",
      },
    ]);
    expect(widgetEntries.map((entry) => entry.id)).toEqual([...EIGHT_WIDGETS]);
    expect(
      widgetEntries.some((entry) => entry.href.includes("/github/coding")),
    ).toBe(false);

    expect(html).toContain('data-slot="generate-catalog"');
    expect(html).toContain('data-plugins="github wakatime rss http"');
    expect(html).toContain('data-href="/generate/catalog"');
    expect(html).toContain('href="/generate/github"');
    expect(html).toContain('href="/generate/wakatime"');
    expect(html).toContain('href="/generate/rss"');
    expect(html).toContain('href="/generate/http"');
    expect(html).toContain('href="/generate/widgets"');
    expect(html).toContain('href="/generate/bits"');
    expect(html).toContain('href="/generate/github/demo"');
    expect(html).toContain('href="/generate/github/stats"');
    expect(html).toContain('href="/generate/github/languages"');
    expect(html).toContain('href="/generate/github/repo"');
    expect(html).toContain('href="/generate/wakatime/coding"');
    expect(html).toContain('href="/generate/rss/feed"');
    expect(html).toContain('href="/generate/http/json"');
    expect(html).toContain('href="/generate/http/chips"');
    expect(html).not.toContain('href="/generate/github/coding"');
    expect(html).not.toContain('href="/generate/github/feed"');
    expect(html).not.toContain('href="/generate/github/json"');
    expect(html).not.toContain('href="/generate/github/chips"');
    for (const plugin of CATALOG_PLUGIN_IDS) {
      expect(html).toContain(`<code>${plugin}</code>`);
    }
    for (const widget of CATALOG_WIDGET_IDS) {
      expect(html).toContain(`<code>${widget}</code>`);
    }
    expect(html).toContain("First-party visual gallery");
    expect(html).toContain("not a plugin marketplace");
    expect(html).toContain("480×160");
    expect(html.toLowerCase()).not.toContain("yaml");
    expect(html).not.toContain("source-drop");
  });
});
