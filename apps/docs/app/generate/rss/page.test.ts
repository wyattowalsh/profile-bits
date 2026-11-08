import { readFile } from "node:fs/promises";
import { RSS_BITS_USED } from "@profile-bits/plugins";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DEFAULT_GENERATE_REQUEST } from "@/src/generate/constants";
import {
  PREVIEW_RSS_WIDGET_IDS,
  PREVIEW_WIDGET_IDS,
} from "@/src/preview/types";
import GenerateRssPage, {
  RSS_GENERATE_BITS_USED,
  RSS_GENERATE_HREF,
  RSS_GENERATE_WIDGET_IDS,
  RSS_PLUGIN_ID,
  rssPackRequest,
  rssWidgetHref,
} from "./page";

const PAGE_URL = new URL("./page.tsx", import.meta.url);

describe("GET /generate/rss", () => {
  it("is a server page that does not remount GenerateShell", async () => {
    const source = await readFile(PAGE_URL, "utf8");

    expect(source).not.toContain("use client");
    expect(source).not.toContain("GenerateShell");
    expect(source).toContain("rssPackRequest");
    expect(source).toContain('data-slot="generate-rss"');
    expect(source).toContain("RSS_BITS_USED");
    expect(source).toContain("PREVIEW_RSS_WIDGET_IDS");
    expect(source).not.toContain("PREVIEW_WIDGET_IDS");
    expect(source).not.toContain("PREVIEW_GITHUB_WIDGET_IDS");
    expect(source).not.toContain("githubWidgetRegistry");
    expect(source).not.toContain("source-drop");
    expect(source).not.toContain("code-rail");
    expect(source).not.toContain("export-workflow");
    expect(source).not.toMatch(/\byaml\b/i);
    expect(source).not.toContain("/generate/github/feed");
    expect(source).not.toContain("plugin_rss");
  });

  it("locks the pack request to rss feed and pack bitsUsed", () => {
    expect(RSS_PLUGIN_ID).toBe("rss");
    expect(RSS_GENERATE_HREF).toBe("/generate/rss");
    expect(RSS_GENERATE_WIDGET_IDS).toEqual(["feed"]);
    expect(RSS_GENERATE_WIDGET_IDS).toEqual(PREVIEW_RSS_WIDGET_IDS);
    expect(PREVIEW_WIDGET_IDS).not.toEqual(PREVIEW_RSS_WIDGET_IDS);
    expect(RSS_GENERATE_BITS_USED).toEqual([...RSS_BITS_USED]);
    expect(rssWidgetHref("feed")).toBe("/generate/rss/feed");
    expect(rssPackRequest()).toEqual({
      ...DEFAULT_GENERATE_REQUEST,
      scope: "plugin",
      plugin: RSS_PLUGIN_ID,
    });
  });

  it("renders bitsUsed and the feed widget without dumping github ids", () => {
    const html = renderToStaticMarkup(createElement(GenerateRssPage));

    expect(html).not.toContain('data-slot="generate-shell"');
    expect(html).toContain('data-slot="generate-rss"');
    expect(html).toContain('data-plugin="rss"');
    expect(html).toContain('data-href="/generate/rss"');
    expect(html).toContain(`data-bits-used="${RSS_BITS_USED.join(" ")}"`);
    expect(html).toContain("<h2>rss</h2>");
    expect(html).toContain("<code>rss</code>");
    expect(html).toContain("<code>feed</code>");
    expect(html).toContain("<code>bitsUsed</code>");
    expect(html).toContain('href="/generate/rss/feed"');
    expect(html).not.toContain('href="/generate/github/feed"');
    expect(html).not.toContain("<code>demo</code>");
    expect(html).not.toContain("<code>coding</code>");
    expect(html).not.toContain("<code>chips</code>");
    expect(html).toContain("Download");
    expect(html).toContain("Share");
    expect(html).toContain("480×160");
    expect(html.toLowerCase()).not.toContain("yaml");
    expect(html).not.toContain("source-drop");
    for (const bit of RSS_BITS_USED) {
      expect(html).toContain(`<li data-slot="generate-pack-bit">${bit}</li>`);
    }
  });
});
