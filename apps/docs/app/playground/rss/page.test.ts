import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import RssPlaygroundPage, {
  PRIMARY_CTA,
  RSS_PLAYGROUND_HREF,
  RSS_PLAYGROUND_PLUGIN,
  RSS_PLAYGROUND_SHELL,
  RSS_WIDGET_IDS,
} from "@/app/playground/rss/page";
import { PlaygroundShell } from "@/src/codegen/shell";
import {
  PREVIEW_RSS_WIDGET_IDS,
  PREVIEW_WIDGET_IDS,
} from "@/src/preview/types";

const PAGE_URL = new URL("./page.tsx", import.meta.url);
const LANDING_URL = new URL("../page.tsx", import.meta.url);

describe("/playground/rss page (server)", () => {
  it("is a server page that wires PlaygroundShell for the rss pack", async () => {
    const source = await readFile(PAGE_URL, "utf8");

    expect(source).not.toContain("use client");
    expect(source).toContain("PlaygroundShell");
    expect(source).toContain("RSS_PLAYGROUND_PLUGIN");
    expect(source).toContain("PREVIEW_RSS_WIDGET_IDS");
    expect(source).toContain(PRIMARY_CTA);
    expect(source).not.toContain("redirect(");
    expect(source).not.toContain("permanentRedirect");
    expect(source).not.toContain("generateStaticParams");
    expect(source).not.toContain("notFound");
    expect(source).not.toContain("PREVIEW_WIDGET_IDS");
    expect(source).not.toContain("PREVIEW_GITHUB_WIDGET_IDS");
    expect(source).not.toContain("/playground/github");
    expect(source).not.toContain("/playground/wakatime");
    expect(source).not.toContain("/playground/http");
    expect(source).not.toContain("/generate/");
    expect(source).not.toContain("chips");
    expect(source).not.toContain("json");
    expect(source).not.toContain("coding");
    expect(source).not.toContain("wakatime");
    expect(source.toLowerCase()).not.toContain("download");
    expect(source.toLowerCase()).not.toContain("share");
  });

  it("locks rss widgets to PREVIEW_RSS_WIDGET_IDS and Copy as the primary CTA", () => {
    expect(RSS_PLAYGROUND_PLUGIN).toBe("rss");
    expect(RSS_PLAYGROUND_HREF).toBe("/playground/rss");
    expect(RSS_WIDGET_IDS).toEqual(["feed"]);
    expect(RSS_WIDGET_IDS).toEqual(PREVIEW_RSS_WIDGET_IDS);
    expect(RSS_WIDGET_IDS).not.toEqual(PREVIEW_WIDGET_IDS);
    expect(RSS_WIDGET_IDS).not.toContain("chips");
    expect(RSS_WIDGET_IDS).not.toContain("json");
    expect(RSS_WIDGET_IDS).not.toContain("coding");
    expect(RSS_WIDGET_IDS).not.toContain("demo");
    expect(RSS_WIDGET_IDS).not.toContain("stats");
    expect(PRIMARY_CTA).toBe("Copy");
    expect(RSS_PLAYGROUND_SHELL).toBe(PlaygroundShell);
  });

  it("renders the rss pack identity without a Download or Share primary", () => {
    const html = renderToStaticMarkup(createElement(RssPlaygroundPage));

    expect(html).toContain('data-slot="playground-rss-page"');
    expect(html).toContain('data-plugin="rss"');
    expect(html).toContain('data-href="/playground/rss"');
    expect(html).toContain(`data-primary-cta="${PRIMARY_CTA}"`);
    expect(html).toContain(PRIMARY_CTA);
    expect(html).toContain("<code>rss</code>");
    for (const widget of RSS_WIDGET_IDS) {
      expect(html).toContain(`<code>${widget}</code>`);
    }
    expect(html.toLowerCase()).not.toContain("download");
    expect(html.toLowerCase()).not.toContain("share");
    expect(html).not.toContain("/playground/github");
    expect(html).not.toContain("/playground/wakatime");
    expect(html).not.toContain("/playground/http");
    expect(html).not.toContain("chips");
    expect(html).not.toContain("json");
    expect(html).not.toContain("coding");
    expect(html).not.toContain("wakatime");
  });

  it("does not add pack paths to the /playground landing source", async () => {
    const source = await readFile(LANDING_URL, "utf8");

    expect(source).toMatch(/redirect\(\s*"\/playground\/github"\s*\)/);
    expect(source).not.toContain("/playground/wakatime");
    expect(source).not.toContain("/playground/rss");
    expect(source).not.toContain("/playground/http");
  });
});
