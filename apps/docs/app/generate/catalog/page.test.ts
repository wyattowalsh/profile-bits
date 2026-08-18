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
  CATALOG_WIDGET_IDS,
  catalogEntries,
  GITHUB_HREF,
  WIDGETS_HREF,
} from "./page";

const PAGE_URL = new URL("./page.tsx", import.meta.url);

describe("/generate/catalog page (server)", () => {
  it("is a server page with no yaml rail and no extra plugins", async () => {
    const source = await readFile(PAGE_URL, "utf8");

    expect(source).not.toContain("use client");
    expect(source).not.toContain("redirect(");
    expect(source).not.toContain("permanentRedirect");
    expect(source).not.toContain("source-drop");
    expect(source).not.toContain("code-rail");
    expect(source).not.toContain("export-workflow");
    expect(source).not.toMatch(/\byaml\b/i);
    expect(source).not.toContain("wakatime");
    expect(source).not.toContain("rss");
    expect(source).not.toContain("coding");
    expect(source).not.toContain("feed");
    expect(source).not.toContain("/playground");
  });

  it("locks v0 catalog to the github pack plus demo/stats/languages", () => {
    expect(CATALOG_PLUGIN_ID).toBe("github");
    expect(PREVIEW_PLUGIN_IDS).toEqual(["github", "http"]);
    expect(CATALOG_WIDGET_IDS).toEqual(["demo", "stats", "languages"]);
    expect(CATALOG_WIDGET_IDS).toEqual(PREVIEW_WIDGET_IDS);
    expect(CATALOG_HREF).toBe("/generate/catalog");
    expect(GITHUB_HREF).toBe("/generate/github");
    expect(WIDGETS_HREF).toBe("/generate/widgets");
    expect(BITS_HREF).toBe("/generate/bits");
    expect(CATALOG_INDEX_HREFS).toEqual([
      "/generate/github",
      "/generate/widgets",
      "/generate/bits",
    ]);
  });

  it("lists github pack plus widget entries and index links", () => {
    const entries = catalogEntries();
    const html = renderToStaticMarkup(createElement(GenerateCatalogPage));

    expect(entries).toEqual([
      {
        id: "github",
        kind: "plugin",
        href: "/generate/github",
        label: "github pack",
      },
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
    ]);

    expect(html).toContain('data-slot="generate-catalog"');
    expect(html).toContain('data-plugin="github"');
    expect(html).toContain('data-href="/generate/catalog"');
    expect(html).toContain('href="/generate/github"');
    expect(html).toContain('href="/generate/widgets"');
    expect(html).toContain('href="/generate/bits"');
    expect(html).toContain('href="/generate/github/demo"');
    expect(html).toContain('href="/generate/github/stats"');
    expect(html).toContain('href="/generate/github/languages"');
    expect(html).toContain("<code>github</code>");
    for (const widget of CATALOG_WIDGET_IDS) {
      expect(html).toContain(`<code>${widget}</code>`);
    }
    expect(html).toContain("480×160");
    expect(html).not.toContain("wakatime");
    expect(html).not.toContain("rss");
    expect(html.toLowerCase()).not.toContain("yaml");
    expect(html).not.toContain("source-drop");
  });
});
