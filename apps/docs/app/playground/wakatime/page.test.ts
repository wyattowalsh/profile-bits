import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import WakatimePlaygroundPage, {
  PRIMARY_CTA,
  WAKATIME_PLAYGROUND_HREF,
  WAKATIME_PLAYGROUND_PLUGIN,
  WAKATIME_PLAYGROUND_SHELL,
  WAKATIME_WIDGET_IDS,
} from "@/app/playground/wakatime/page";
import { PlaygroundShell } from "@/src/codegen/shell";
import {
  PREVIEW_WAKATIME_WIDGET_IDS,
  PREVIEW_WIDGET_IDS,
} from "@/src/preview/types";

const PAGE_URL = new URL("./page.tsx", import.meta.url);
const LANDING_URL = new URL("../page.tsx", import.meta.url);

describe("/playground/wakatime page (server)", () => {
  it("is a server page that wires PlaygroundShell for the wakatime pack", async () => {
    const source = await readFile(PAGE_URL, "utf8");

    expect(source).not.toContain("use client");
    expect(source).toContain("PlaygroundShell");
    expect(source).toContain("WAKATIME_PLAYGROUND_PLUGIN");
    expect(source).toContain("PREVIEW_WAKATIME_WIDGET_IDS");
    expect(source).toContain(PRIMARY_CTA);
    expect(source).not.toContain("redirect(");
    expect(source).not.toContain("permanentRedirect");
    expect(source).not.toContain("generateStaticParams");
    expect(source).not.toContain("notFound");
    expect(source).not.toContain("PREVIEW_WIDGET_IDS");
    expect(source).not.toContain("PREVIEW_GITHUB_WIDGET_IDS");
    expect(source).not.toContain("/playground/github");
    expect(source).not.toContain("/playground/rss");
    expect(source).not.toContain("/playground/http");
    expect(source).not.toContain("/generate/");
    expect(source).not.toContain("chips");
    expect(source).not.toContain("json");
    expect(source).not.toContain("feed");
    expect(source.toLowerCase()).not.toContain("download");
    expect(source.toLowerCase()).not.toContain("share");
  });

  it("locks wakatime widgets to PREVIEW_WAKATIME_WIDGET_IDS and Copy as the primary CTA", () => {
    expect(WAKATIME_PLAYGROUND_PLUGIN).toBe("wakatime");
    expect(WAKATIME_PLAYGROUND_HREF).toBe("/playground/wakatime");
    expect(WAKATIME_WIDGET_IDS).toEqual(["coding"]);
    expect(WAKATIME_WIDGET_IDS).toEqual(PREVIEW_WAKATIME_WIDGET_IDS);
    expect(WAKATIME_WIDGET_IDS).not.toEqual(PREVIEW_WIDGET_IDS);
    expect(WAKATIME_WIDGET_IDS).not.toContain("chips");
    expect(WAKATIME_WIDGET_IDS).not.toContain("json");
    expect(WAKATIME_WIDGET_IDS).not.toContain("feed");
    expect(WAKATIME_WIDGET_IDS).not.toContain("demo");
    expect(WAKATIME_WIDGET_IDS).not.toContain("stats");
    expect(PRIMARY_CTA).toBe("Copy");
    expect(WAKATIME_PLAYGROUND_SHELL).toBe(PlaygroundShell);
  });

  it("renders the wakatime pack identity without a Download or Share primary", () => {
    const html = renderToStaticMarkup(createElement(WakatimePlaygroundPage));

    expect(html).toContain('data-slot="playground-wakatime-page"');
    expect(html).toContain('data-plugin="wakatime"');
    expect(html).toContain('data-href="/playground/wakatime"');
    expect(html).toContain(`data-primary-cta="${PRIMARY_CTA}"`);
    expect(html).toContain(PRIMARY_CTA);
    expect(html).toContain("<code>wakatime</code>");
    for (const widget of WAKATIME_WIDGET_IDS) {
      expect(html).toContain(`<code>${widget}</code>`);
    }
    expect(html.toLowerCase()).not.toContain("download");
    expect(html.toLowerCase()).not.toContain("share");
    expect(html).not.toContain("/playground/github");
    expect(html).not.toContain("/playground/rss");
    expect(html).not.toContain("/playground/http");
    expect(html).not.toContain("chips");
    expect(html).not.toContain("json");
    expect(html).not.toContain("feed");
  });

  it("does not add pack paths to the /playground landing source", async () => {
    const source = await readFile(LANDING_URL, "utf8");

    expect(source).toMatch(/redirect\(\s*"\/playground\/github"\s*\)/);
    expect(source).not.toContain("/playground/wakatime");
    expect(source).not.toContain("/playground/rss");
    expect(source).not.toContain("/playground/http");
  });
});
