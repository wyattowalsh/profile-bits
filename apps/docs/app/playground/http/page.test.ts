import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import HttpPlaygroundPage, {
  HTTP_PLAYGROUND_HREF,
  HTTP_PLAYGROUND_PLUGIN,
  HTTP_PLAYGROUND_SHELL,
  HTTP_PLAYGROUND_WIDGET_IDS,
  HTTP_WIDGET_IDS,
  PRIMARY_CTA,
} from "@/app/playground/http/page";
import { PlaygroundShell } from "@/src/codegen/shell";
import {
  PREVIEW_GITHUB_WIDGET_IDS,
  PREVIEW_HTTP_WIDGET_IDS,
  PREVIEW_PLUGIN_IDS,
  PREVIEW_TOKEN_QUERY_KEYS,
  PREVIEW_WIDGET_IDS,
} from "@/src/preview/types";

const PAGE_URL = new URL("./page.tsx", import.meta.url);
const VENDOR_FETCH_HOSTS = ["shieldcn.dev", "img.shields.io"] as const;

describe("/playground/http page (server)", () => {
  it("is a server page that folds http into PlaygroundShell", async () => {
    const source = await readFile(PAGE_URL, "utf8");

    expect(source).not.toContain("use client");
    expect(source).toContain("PlaygroundShell");
    expect(source).toContain("HTTP_PLAYGROUND_PLUGIN");
    expect(source).toContain("PREVIEW_HTTP_WIDGET_IDS");
    expect(source).toContain(PRIMARY_CTA);
    expect(source).toContain("json");
    expect(source).toContain("chips");
    expect(source).not.toContain("PREVIEW_WIDGET_IDS");
    expect(source).not.toContain("redirect(");
    expect(source).not.toContain("permanentRedirect");
    expect(source).not.toContain("generateStaticParams");
    expect(source).not.toContain("notFound");
    expect(source).not.toContain("chipFixture");
    expect(source).not.toContain("renderChipsFromPayloads");
    expect(source).not.toContain("renderChipsSvg");
    expect(source).not.toContain("expandChipsRequest");
    expect(source).not.toContain("playground-http-tuners");
    expect(source).not.toContain("playground-http-stage");
    expect(source).not.toContain("wakatime");
    expect(source).not.toContain("rss");
    expect(source).not.toContain("coding");
    expect(source).not.toContain("feed");
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source.toLowerCase()).not.toContain("download");
    expect(source.toLowerCase()).not.toContain("share");
    for (const host of VENDOR_FETCH_HOSTS) {
      expect(source).not.toContain(host);
    }
  });

  it("locks http widgets to json and chips and Copy as the primary CTA", () => {
    expect(HTTP_PLAYGROUND_PLUGIN).toBe("http");
    expect(HTTP_PLAYGROUND_HREF).toBe("/playground/http");
    expect(HTTP_PLAYGROUND_WIDGET_IDS).toEqual(["json", "chips"]);
    expect(HTTP_WIDGET_IDS).toEqual(PREVIEW_HTTP_WIDGET_IDS);
    expect(HTTP_WIDGET_IDS).not.toEqual(PREVIEW_WIDGET_IDS);
    expect(HTTP_WIDGET_IDS).not.toEqual(PREVIEW_GITHUB_WIDGET_IDS);
    expect(HTTP_WIDGET_IDS).not.toContain("demo");
    expect(HTTP_WIDGET_IDS).not.toContain("stats");
    expect(HTTP_WIDGET_IDS).not.toContain("languages");
    expect(HTTP_WIDGET_IDS).not.toContain("repo");
    expect(HTTP_WIDGET_IDS).not.toContain("coding");
    expect(HTTP_WIDGET_IDS).not.toContain("feed");
    expect(PREVIEW_PLUGIN_IDS).toEqual(["github", "wakatime", "rss", "http"]);
    expect(PREVIEW_GITHUB_WIDGET_IDS).not.toContain("json");
    expect(PREVIEW_GITHUB_WIDGET_IDS).not.toContain("chips");
    expect(PREVIEW_TOKEN_QUERY_KEYS).toEqual(
      expect.arrayContaining(["http_token_env", "http_token"]),
    );
    expect(PRIMARY_CTA).toBe("Copy");
    expect(HTTP_PLAYGROUND_SHELL).toBe(PlaygroundShell);
  });

  it("renders the http pack identity without a chips-only sidecar", () => {
    const html = renderToStaticMarkup(createElement(HttpPlaygroundPage));

    expect(html).toContain('data-slot="playground-http-page"');
    expect(html).toContain('data-plugin="http"');
    expect(html).toContain('data-href="/playground/http"');
    expect(html).toContain(`data-primary-cta="${PRIMARY_CTA}"`);
    expect(html).not.toContain('data-widget="chips"');
    expect(html).not.toContain('data-slot="playground-http-tuners"');
    expect(html).not.toContain('data-pane="layout"');
    expect(html).not.toContain('data-pane="readme"');
    expect(html).not.toContain('name="preset"');
    expect(html).not.toContain('name="types"');
    expect(html).toContain(PRIMARY_CTA);
    expect(html).toContain("<code>http</code>");
    expect(html).toContain("<code>json</code>");
    expect(html).toContain("<code>chips</code>");
    expect(html.toLowerCase()).not.toContain("download");
    expect(html.toLowerCase()).not.toContain("share");
    expect(html).not.toContain("wakatime");
    expect(html).not.toContain("rss");
    expect(html).not.toContain("coding");
    expect(html).not.toContain("feed");
    expect(html).not.toContain("shieldcn.dev");
    expect(html).not.toContain("img.shields.io");
    expect(html).not.toContain("data:image/svg+xml;base64,");
  });
});
