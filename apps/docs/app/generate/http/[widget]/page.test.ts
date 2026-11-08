import { readFile } from "node:fs/promises";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PREVIEW_HTTP_WIDGET_IDS } from "@/src/preview/types";

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
}));

import GenerateHttpWidgetPage, {
  generateMetadata,
  generateStaticParams,
  HTTP_PLUGIN_ID,
  httpWidgetRequest,
} from "./page";

const PAGE_URL = new URL("./page.tsx", import.meta.url);

describe("GET /generate/http/[widget]", () => {
  beforeEach(() => {
    mocks.notFound.mockClear();
  });

  it("is a server page that prerenders json and chips", async () => {
    const source = await readFile(PAGE_URL, "utf8");

    expect(source).not.toContain("use client");
    expect(source).toContain("generateStaticParams");
    expect(source).toContain("notFound");
    expect(source).not.toContain("GenerateShell");
    expect(source).toContain("httpWidgetRequest");
    expect(source).toContain('scope: "widget"');
    expect(source).toContain('data-slot="generate-widget"');
    expect(source).toContain("isPreviewHttpWidgetId");
    expect(source).toContain("PREVIEW_HTTP_WIDGET_IDS");
    expect(source).not.toContain("isPreviewWidgetId");
    expect(source).not.toContain("PREVIEW_WIDGET_IDS");
    expect(source).not.toContain("PREVIEW_GITHUB_WIDGET_IDS");
    expect(source).not.toContain("githubWidgetRegistry");
    expect(source).not.toContain("source-drop");
    expect(source).not.toContain("code-rail");
    expect(source).not.toContain("export-workflow");
    expect(source).not.toMatch(/yaml/i);
    expect(source).not.toContain("/generate/github/json");
    expect(source).not.toContain("/generate/github/chips");
  });

  it("generateStaticParams lists only http widgets", () => {
    expect(generateStaticParams()).toEqual([
      { widget: "json" },
      { widget: "chips" },
    ]);
    expect(generateStaticParams().map((row) => row.widget)).toEqual([
      ...PREVIEW_HTTP_WIDGET_IDS,
    ]);
    expect(PREVIEW_HTTP_WIDGET_IDS).not.toContain("coding");
  });

  it.each(PREVIEW_HTTP_WIDGET_IDS)(
    "renders a labeled %s widget section without nested shell chrome",
    async (widget) => {
      const page = await GenerateHttpWidgetPage({
        params: Promise.resolve({ widget }),
      });
      const html = renderToStaticMarkup(page);

      expect(httpWidgetRequest(widget)).toEqual({
        scope: "widget",
        plugin: HTTP_PLUGIN_ID,
        widget,
        options: {},
        format: "svg",
        theme: "dark",
        output_pair: false,
        user: "octocat",
      });
      expect(html).not.toContain('data-slot="generate-shell"');
      expect(html).toContain('data-slot="generate-widget"');
      expect(html).toContain('data-plugin="http"');
      expect(html).toContain(`data-widget="${widget}"`);
      expect(html).toContain(`<h2>${widget}</h2>`);
      expect(html).not.toContain("source-drop");
      expect(html).not.toMatch(/Thin workflow YAML/);
      expect(mocks.notFound).not.toHaveBeenCalled();
    },
  );

  it.each(["demo", "coding", "feed", "github", "wakatime", "rss"])(
    "calls notFound() for unknown widget id %s",
    async (widget) => {
      mocks.notFound.mockClear();
      await expect(
        GenerateHttpWidgetPage({
          params: Promise.resolve({ widget }),
        }),
      ).rejects.toThrow("NEXT_NOT_FOUND");
      expect(mocks.notFound).toHaveBeenCalledOnce();
    },
  );

  it("titles the known widgets in generateMetadata", async () => {
    const jsonMeta = await generateMetadata({
      params: Promise.resolve({ widget: "json" }),
    });
    const chipsMeta = await generateMetadata({
      params: Promise.resolve({ widget: "chips" }),
    });
    expect(jsonMeta.title).toBe("Generate · http · json");
    expect(chipsMeta.title).toBe("Generate · http · chips");
  });
});
