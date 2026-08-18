import { readFile } from "node:fs/promises";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PREVIEW_PLUGIN_IDS, PREVIEW_WIDGET_IDS } from "@/src/preview/types";
import HttpPlaygroundPage, {
  HTTP_PLAYGROUND_HREF,
  HTTP_PLAYGROUND_PLUGIN,
  HTTP_PLAYGROUND_WIDGET,
  HTTP_PLAYGROUND_WIDGET_IDS,
  PRIMARY_CTA,
} from "@/app/playground/http/page";
import {
  emitChipsConfigYaml,
  emitChipsReadmeMarkdown,
  HTTP_PLAYGROUND_DEFAULTS,
  HTTP_PLAYGROUND_README,
  parseHttpPlaygroundSearch,
} from "@/app/playground/http/state";

const PAGE_URL = new URL("./page.tsx", import.meta.url);
const STATE_URL = new URL("./state.ts", import.meta.url);

const VENDOR_FETCH_HOSTS = ["shieldcn.dev", "img.shields.io"] as const;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("/playground/http page (server)", () => {
  it("is a server page that renders chips from chipFixture", async () => {
    const source = await readFile(PAGE_URL, "utf8");

    expect(source).not.toContain("use client");
    expect(source).toContain("chipFixture");
    expect(source).toContain("renderChipsFromPayloads");
    expect(source).toContain("renderChipsSvg");
    expect(source).toContain("HTTP_PLAYGROUND_WIDGET_IDS");
    expect(source).toContain(PRIMARY_CTA);
    expect(source).not.toContain("redirect(");
    expect(source).not.toContain("permanentRedirect");
    expect(source).not.toContain("expandChipsRequest");
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source.toLowerCase()).not.toContain("download");
    expect(source.toLowerCase()).not.toContain("share");
    for (const host of VENDOR_FETCH_HOSTS) {
      expect(source).not.toContain(host);
    }
  });

  it("state helpers stay fixtures-only and emit chips yaml", async () => {
    const source = await readFile(STATE_URL, "utf8");
    const parsed = parseHttpPlaygroundSearch({
      preset: "shields",
      types: ["stars", "npm", "stars"],
      package: "react",
      repo: "vercel/next.js",
      workflow: "ci.yml",
    });
    const yaml = emitChipsConfigYaml(parsed);

    expect(HTTP_PLAYGROUND_HREF).toBe("/playground/http");
    expect(HTTP_PLAYGROUND_PLUGIN).toBe("http");
    expect(HTTP_PLAYGROUND_WIDGET).toBe("chips");
    expect(HTTP_PLAYGROUND_WIDGET_IDS).toEqual(["json", "chips"]);
    expect(PRIMARY_CTA).toBe("Copy");
    expect(PREVIEW_PLUGIN_IDS).toEqual(["github", "http"]);
    expect(PREVIEW_WIDGET_IDS).not.toContain("chips");
    expect(PREVIEW_WIDGET_IDS).not.toContain("json");
    expect(parsed.preset).toBe("shields");
    expect(parsed.types).toEqual(["stars", "npm"]);
    expect(yaml).toContain("plugins:");
    expect(yaml).toContain("http:");
    expect(yaml).toContain("widgets:");
    expect(yaml).toContain("chips:");
    expect(yaml).toContain("preset: shields");
    expect(yaml).toContain("types: [stars, npm]");
    expect(emitChipsReadmeMarkdown()).toBe(HTTP_PLAYGROUND_README);
    expect(emitChipsReadmeMarkdown()).toBe("![](./profile-bits/chips.svg)");
    expect(parseHttpPlaygroundSearch({}).preset).toBe(
      HTTP_PLAYGROUND_DEFAULTS.preset,
    );
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source).not.toContain("expandChipsRequest");
    for (const host of VENDOR_FETCH_HOSTS) {
      expect(source).not.toContain(host);
    }
  });

  it("renders fixture SVG dual pane and copy rail without fetch", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const page = await HttpPlaygroundPage({
      searchParams: {
        preset: "shieldcn",
        types: ["npm"],
        package: "react",
        repo: "vercel/next.js",
        workflow: "ci.yml",
      },
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain('data-slot="playground-http-page"');
    expect(html).toContain('data-plugin="http"');
    expect(html).toContain('data-widget="chips"');
    expect(html).toContain('data-href="/playground/http"');
    expect(html).toContain(`data-primary-cta="${PRIMARY_CTA}"`);
    expect(html).toContain('data-preset="shieldcn"');
    expect(html).toContain('data-provenance="fixture"');
    expect(html).toContain('data-pane="layout"');
    expect(html).toContain('data-pane="readme"');
    expect(html).toContain('data-rail="config"');
    expect(html).toContain('data-rail="readme"');
    expect(html).toContain("<code>http</code>");
    expect(html).toContain("<code>chips</code>");
    expect(html).toContain("<code>json</code>");
    expect(html).toContain("plugins:");
    expect(html).toContain("widgets:");
    expect(html).toContain("chips:");
    expect(html).toContain("preset: shieldcn");
    expect(html).toContain("types: [npm]");
    expect(html).toContain("![](./profile-bits/chips.svg)");
    expect(html).toContain("data:image/svg+xml;base64,");
    expect(html).toContain('name="preset"');
    expect(html).toContain('value="shieldcn"');
    expect(html).toContain('value="shields"');
    expect(html).toContain('name="types"');
    expect(html).toContain('name="package"');
    expect(html).toContain('name="repo"');
    expect(html).toContain('name="workflow"');
    expect(html).toContain(PRIMARY_CTA);
    expect(html).not.toContain("shieldcn.dev");
    expect(html).not.toContain("img.shields.io");
    expect(html.toLowerCase()).not.toContain("download");
    expect(html.toLowerCase()).not.toContain("share");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("defaults empty search to shieldcn npm fixtures", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const html = renderToStaticMarkup(await HttpPlaygroundPage({}));

    expect(html).toContain('data-preset="shieldcn"');
    expect(html).toContain("types: [npm]");
    expect(html).toContain("package: react");
    expect(html).toContain("repo: vercel/next.js");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
