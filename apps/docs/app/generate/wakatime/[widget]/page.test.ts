import { readFile } from "node:fs/promises";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PREVIEW_WAKATIME_WIDGET_IDS } from "@/src/preview/types";

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
}));

import GenerateWakatimeWidgetPage, {
  generateMetadata,
  generateStaticParams,
  WAKATIME_PLUGIN_ID,
  wakatimeWidgetRequest,
} from "./page";

const PAGE_URL = new URL("./page.tsx", import.meta.url);

describe("GET /generate/wakatime/[widget]", () => {
  beforeEach(() => {
    mocks.notFound.mockClear();
  });

  it("is a server page that prerenders coding only", async () => {
    const source = await readFile(PAGE_URL, "utf8");

    expect(source).not.toContain("use client");
    expect(source).toContain("generateStaticParams");
    expect(source).toContain("notFound");
    expect(source).not.toContain("GenerateShell");
    expect(source).toContain("wakatimeWidgetRequest");
    expect(source).toContain('scope: "widget"');
    expect(source).toContain('data-slot="generate-widget"');
    expect(source).toContain("isPreviewWakatimeWidgetId");
    expect(source).toContain("PREVIEW_WAKATIME_WIDGET_IDS");
    expect(source).not.toContain("isPreviewWidgetId");
    expect(source).not.toContain("PREVIEW_WIDGET_IDS");
    expect(source).not.toContain("PREVIEW_GITHUB_WIDGET_IDS");
    expect(source).not.toContain("githubWidgetRegistry");
    expect(source).not.toContain("source-drop");
    expect(source).not.toContain("code-rail");
    expect(source).not.toContain("export-workflow");
    expect(source).not.toMatch(/yaml/i);
    expect(source).not.toContain("/generate/github/coding");
  });

  it("generateStaticParams lists only wakatime widgets", () => {
    expect(generateStaticParams()).toEqual([{ widget: "coding" }]);
    expect(generateStaticParams().map((row) => row.widget)).toEqual([
      ...PREVIEW_WAKATIME_WIDGET_IDS,
    ]);
    expect(PREVIEW_WAKATIME_WIDGET_IDS).not.toContain("chips");
  });

  it.each(PREVIEW_WAKATIME_WIDGET_IDS)(
    "renders a labeled %s widget section without nested shell chrome",
    async (widget) => {
      const page = await GenerateWakatimeWidgetPage({
        params: Promise.resolve({ widget }),
      });
      const html = renderToStaticMarkup(page);

      expect(wakatimeWidgetRequest(widget)).toEqual({
        scope: "widget",
        plugin: WAKATIME_PLUGIN_ID,
        widget,
        options: {},
        format: "svg",
        theme: "dark",
        output_pair: false,
        user: "octocat",
      });
      expect(html).not.toContain('data-slot="generate-shell"');
      expect(html).toContain('data-slot="generate-widget"');
      expect(html).toContain('data-plugin="wakatime"');
      expect(html).toContain(`data-widget="${widget}"`);
      expect(html).toContain(`<h2>${widget}</h2>`);
      expect(html).not.toContain("source-drop");
      expect(html).not.toMatch(/Thin workflow YAML/);
      expect(mocks.notFound).not.toHaveBeenCalled();
    },
  );

  it.each(["demo", "stats", "feed", "json", "chips", "github", "rss"])(
    "calls notFound() for unknown widget id %s",
    async (widget) => {
      mocks.notFound.mockClear();
      await expect(
        GenerateWakatimeWidgetPage({
          params: Promise.resolve({ widget }),
        }),
      ).rejects.toThrow("NEXT_NOT_FOUND");
      expect(mocks.notFound).toHaveBeenCalledOnce();
    },
  );

  it("titles the known widget in generateMetadata", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ widget: "coding" }),
    });
    expect(metadata.title).toBe("Generate · wakatime · coding");
  });
});
