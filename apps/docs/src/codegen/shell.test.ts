import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { COPY_BUTTON_LABEL } from "../preview/copy-button";
import {
  PREVIEW_GITHUB_WIDGET_IDS,
  PREVIEW_HTTP_WIDGET_IDS,
  PREVIEW_OUTPUT_FORMATS,
  PREVIEW_PLUGIN_IDS,
  PREVIEW_RSS_WIDGET_IDS,
  PREVIEW_WAKATIME_WIDGET_IDS,
  type PreviewPluginId,
} from "../preview/types";

const navigation = vi.hoisted(() => ({
  pathname: "/playground/github",
  push: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children?: import("react").ReactNode;
  }) => createElement("a", { href, ...rest }, children),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: navigation.push }),
}));

import {
  GENERATE_BUTTON_LABEL,
  PLAYGROUND_PLUGIN,
  PlaygroundShell,
  playgroundHref,
  pluginFromPathname,
  widgetFromPathname,
} from "./shell";

const LAYOUT_URL = new URL("../../app/playground/layout.tsx", import.meta.url);
const SHELL_URL = new URL("./shell.tsx", import.meta.url);

describe("playground layout (server)", () => {
  it("is a server layout with no client directive", async () => {
    const source = await readFile(LAYOUT_URL, "utf8");

    expect(source).not.toContain("use client");
    expect(source).toContain("PlaygroundShell");
    expect(source).toContain("HomeLayout");
    expect(source).toContain("baseOptions");
    expect(source).toContain('title: "Playground"');
    expect(source).not.toContain("app/generate");
    expect(source).not.toContain("/playground/generate");
    expect(source).not.toContain("source-drop");
  });
});

describe("pluginFromPathname", () => {
  it("honors the route pack and falls back to github", () => {
    expect(pluginFromPathname("/playground")).toBe("github");
    expect(pluginFromPathname("/playground/github")).toBe("github");
    expect(pluginFromPathname("/playground/wakatime")).toBe("wakatime");
    expect(pluginFromPathname("/playground/rss")).toBe("rss");
    expect(pluginFromPathname("/playground/http")).toBe("http");
    expect(pluginFromPathname("/playground/github/stats")).toBe("github");
    expect(pluginFromPathname("/playground/wakatime/coding")).toBe("wakatime");
    expect(pluginFromPathname("/playground/chess")).toBe("github");
    expect(PLAYGROUND_PLUGIN).toBe("github");
  });
});

describe("playgroundHref", () => {
  it("builds pack and widget playground paths", () => {
    expect(playgroundHref("github")).toBe("/playground/github");
    expect(playgroundHref("wakatime")).toBe("/playground/wakatime");
    expect(playgroundHref("rss", "feed")).toBe("/playground/rss/feed");
    expect(playgroundHref("http", "chips")).toBe("/playground/http/chips");
    expect(playgroundHref("github", "coding")).toBe("/playground/github");
  });
});

describe("widgetFromPathname", () => {
  it("reads pack-local widget ids from the playground path", () => {
    expect(widgetFromPathname("/playground/github")).toBeUndefined();
    expect(widgetFromPathname("/playground/github/demo")).toBe("demo");
    expect(widgetFromPathname("/playground/github/stats")).toBe("stats");
    expect(widgetFromPathname("/playground/github/languages")).toBe(
      "languages",
    );
    expect(widgetFromPathname("/playground/github/repo")).toBe("repo");
    expect(widgetFromPathname("/playground/github/coding")).toBeUndefined();
    expect(widgetFromPathname("/playground/wakatime/coding")).toBe("coding");
    expect(widgetFromPathname("/playground/rss/feed")).toBe("feed");
    expect(widgetFromPathname("/playground/http/json")).toBe("json");
    expect(widgetFromPathname("/playground/http/chips")).toBe("chips");
    expect(widgetFromPathname("/playground/http/repo")).toBeUndefined();
  });
});

describe("PlaygroundShell (client island)", () => {
  beforeEach(() => {
    navigation.pathname = "/playground/github";
    navigation.push.mockReset();
  });

  it("declares a client module that statically imports sibling chrome", async () => {
    const source = await readFile(SHELL_URL, "utf8");
    const firstLine = source.split("\n").find((line) => line.trim() !== "");

    expect(firstLine).toBe('"use client";');
    expect(source).toContain('data-slot="playground-tuners"');
    expect(source).toContain('data-slot="playground-stage"');
    expect(source).toContain('data-slot="playground-emit"');
    expect(source).toContain("SchemaForm");
    expect(source).toContain("GlobalBar");
    expect(source).toContain("PreviewStage");
    expect(source).toContain("CodeRail");
    expect(source).toContain("PackEmitter");
    expect(source).toContain("packEmitterState");
    expect(source).toContain("exportReadmeMarkdown");
    expect(source).toContain("FixturePill");
    expect(source).toContain("CrossLink");
    expect(source).toContain("usePreview");
    expect(source).toContain("PREVIEW_PLUGIN_IDS");
    expect(source).toContain("pluginFromPathname");
    expect(source).toContain("widgetsForPlugin");
    expect(source).toContain("defaultWidgetsForPlugin");
    expect(source).toContain(GENERATE_BUTTON_LABEL);
    expect(source).toContain("source-drop");
    expect(source).not.toContain("plugin_github_stats_include");
    expect(source).not.toMatch(/\bDownload\b/);
    expect(source).not.toMatch(/\bShare\b/);
  });

  it("renders three-column github codegen chrome with Copy as primary CTA", () => {
    const html = renderToStaticMarkup(createElement(PlaygroundShell));

    expect(html).toContain('data-slot="playground-shell"');
    expect(html).toContain('data-plugin="github"');
    expect(html).toContain('data-slot="playground-tuners"');
    expect(html).toContain('data-slot="playground-stage"');
    expect(html).toContain('data-slot="playground-emit"');
    expect(html).toContain('data-slot="plugin-selector"');
    expect(html).toContain('data-slot="widget-checkboxes"');
    expect(html).toContain('data-slot="schema-form"');
    expect(html).toContain('data-slot="preview-stage"');
    expect(html).toContain('data-slot="code-rail"');
    expect(html).toContain('data-slot="pack-emitter"');
    expect(html).toContain('data-slot="global-bar"');
    expect(html).toContain('data-slot="fixture-pill"');
    expect(html).toContain('data-slot="cross-link"');
    expect(html).toContain('data-slot="copy-button"');
    expect(html).toContain('data-slot="playground-page"');
    expect(html).toContain(COPY_BUTTON_LABEL);
    expect(html).toContain('value="github"');
    expect(html).toContain("/generate/github");
    expect(html.toLowerCase()).not.toContain("download");
    expect(html.toLowerCase()).not.toContain("share");
    expect(html).toContain("source-drop");
    expect(html).toContain("plugins:");
    expect(html).toContain("github:");

    for (const pack of PREVIEW_PLUGIN_IDS) {
      expect(html).toContain(`value="${pack}"`);
    }
    expect((html.match(/<option /g) ?? []).length).toBe(4);

    for (const widget of PREVIEW_GITHUB_WIDGET_IDS) {
      expect(html).toContain(`value="${widget}"`);
    }
    expect(html).not.toContain('value="coding"');
    expect(html).not.toContain('value="feed"');
    expect(html).not.toContain('data-group="coding"');
    expect(html).not.toContain('data-group="feed"');
    expect(html).not.toContain('data-group="json"');
    expect(html).not.toContain('data-group="chips"');
    expect(html).not.toContain("plugin_github_stats_include");
    for (const format of PREVIEW_OUTPUT_FORMATS) {
      expect(html).toContain(`value="${format}"`);
    }
    expect(PREVIEW_OUTPUT_FORMATS).toEqual(
      expect.arrayContaining(["gif", "apng", "webp"]),
    );
    expect(PLAYGROUND_PLUGIN).toBe("github");
  });

  it.each([
    ["wakatime", PREVIEW_WAKATIME_WIDGET_IDS, "coding", "wakatime:"] as const,
    ["rss", PREVIEW_RSS_WIDGET_IDS, "feed", "rss:"] as const,
    ["http", PREVIEW_HTTP_WIDGET_IDS, "chips", "http:"] as const,
  ])(
    "honors /playground/%s with pack-local widgets and plugins.%s yaml",
    (plugin: PreviewPluginId, widgets, defaultWidget, rail) => {
      navigation.pathname = `/playground/${plugin}`;
      const html = renderToStaticMarkup(createElement(PlaygroundShell));

      expect(html).toContain(`data-plugin="${plugin}"`);
      expect(html).toContain(`Playground · ${plugin}`);
      expect(html).toContain(`/generate/${plugin}`);
      expect(html).toContain(rail);
      expect(html).toContain(`${defaultWidget}:`);
      for (const pack of PREVIEW_PLUGIN_IDS) {
        expect(html).toContain(`value="${pack}"`);
      }
      for (const widget of widgets) {
        expect(html).toContain(`value="${widget}"`);
      }
      expect(html).not.toContain('value="demo"');
      expect(html).not.toContain('data-group="demo"');
      expect(html).not.toContain("plugin_wakatime");
      expect(html).not.toContain("plugin_rss");
      expect(html).not.toContain("plugin_http");
    },
  );

  it("renders children into the shell", () => {
    const html = renderToStaticMarkup(
      createElement(
        PlaygroundShell,
        null,
        createElement("p", null, "injected"),
      ),
    );
    expect(html).toContain("injected");
    expect(html).toContain('data-slot="playground-page"');
  });
});
