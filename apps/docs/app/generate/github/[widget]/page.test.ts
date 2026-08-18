import { readFile } from "node:fs/promises";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PREVIEW_WIDGET_IDS } from "@/src/preview/types";

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
}));

import { GENERATE_PLUGIN_ID } from "@/src/generate/shell";
import GenerateGithubWidgetPage, {
  generateMetadata,
  generateStaticParams,
  githubWidgetRequest,
} from "./page";

const PAGE_URL = new URL("./page.tsx", import.meta.url);

describe("GET /generate/github/[widget]", () => {
  beforeEach(() => {
    mocks.notFound.mockClear();
  });

  it("is a server page that prerenders demo, stats, and languages", async () => {
    const source = await readFile(PAGE_URL, "utf8");

    expect(source).not.toContain("use client");
    expect(source).toContain("generateStaticParams");
    expect(source).toContain("notFound");
    expect(source).not.toContain("GenerateShell");
    expect(source).toContain("githubWidgetRequest");
    expect(source).toContain('scope: "widget"');
    expect(source).toContain('data-slot="generate-widget"');
    expect(source).not.toContain("source-drop");
    expect(source).not.toContain("code-rail");
    expect(source).not.toContain("export-workflow");
    expect(source).not.toMatch(/yaml/i);
    expect(source).not.toMatch(/\bwakatime\b/i);
    expect(source).not.toMatch(/\brss\b/i);
  });

  it("generateStaticParams lists only v0 github widgets", () => {
    expect(generateStaticParams()).toEqual([
      { widget: "demo" },
      { widget: "stats" },
      { widget: "languages" },
    ]);
    expect(PREVIEW_WIDGET_IDS).toEqual(["demo", "stats", "languages"]);
  });

  it.each(PREVIEW_WIDGET_IDS)(
    "renders a labeled %s widget section without nested shell chrome",
    async (widget) => {
      const page = await GenerateGithubWidgetPage({
        params: Promise.resolve({ widget }),
      });
      const html = renderToStaticMarkup(page);

      expect(githubWidgetRequest(widget)).toEqual({
        scope: "widget",
        plugin: GENERATE_PLUGIN_ID,
        widget,
        options: {},
        format: "svg",
        theme: "dark",
        output_pair: false,
        user: "octocat",
      });
      expect(html).not.toContain('data-slot="generate-shell"');
      expect(html).toContain('data-slot="generate-widget"');
      expect(html).toContain('data-plugin="github"');
      expect(html).toContain(`data-widget="${widget}"`);
      expect(html).toContain(`<h2>${widget}</h2>`);
      expect(html).not.toContain("source-drop");
      expect(html).not.toMatch(/Thin workflow YAML/);
      expect(mocks.notFound).not.toHaveBeenCalled();
    },
  );

  it.each(["wakatime", "rss", "coding", "feed"])(
    "calls notFound() for unknown widget id %s",
    async (widget) => {
      mocks.notFound.mockClear();
      await expect(
        GenerateGithubWidgetPage({
          params: Promise.resolve({ widget }),
        }),
      ).rejects.toThrow("NEXT_NOT_FOUND");
      expect(mocks.notFound).toHaveBeenCalledOnce();
    },
  );

  it("titles the known widget in generateMetadata", async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ widget: "stats" }),
    });
    expect(metadata.title).toBe("Generate · github · stats");
  });
});
