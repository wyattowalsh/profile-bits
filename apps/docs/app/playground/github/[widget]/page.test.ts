import { readFile } from "node:fs/promises";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PREVIEW_WIDGET_IDS } from "@/src/preview/types";

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
  }),
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
}));

import GithubWidgetPlaygroundPage, {
  generateStaticParams,
  PRIMARY_CTA,
} from "./page";

const PAGE_URL = new URL("./page.tsx", import.meta.url);

describe("GET /playground/github/[widget]", () => {
  beforeEach(() => {
    mocks.notFound.mockClear();
  });

  it("is a server page that prerenders v0 github widgets only", async () => {
    const source = await readFile(PAGE_URL, "utf8");

    expect(source).not.toContain("use client");
    expect(source).toContain("generateStaticParams");
    expect(source).toContain("dynamicParams");
    expect(source).toContain("notFound");
    expect(source).toContain("isPreviewWidgetId");
    expect(source).toContain("PREVIEW_WIDGET_IDS");
    expect(source).not.toContain("<PlaygroundShell");
    expect(source).not.toContain("wakatime");
    expect(source).not.toContain("rss");
    expect(source).not.toContain("/playground/wakatime");
    expect(source).not.toContain("/playground/rss");
    expect(source).not.toContain("/generate/");
  });

  it("prerenders demo, stats, and languages only", () => {
    expect(generateStaticParams()).toEqual([
      { widget: "demo" },
      { widget: "stats" },
      { widget: "languages" },
    ]);
    expect(generateStaticParams().map((row) => row.widget)).toEqual([
      ...PREVIEW_WIDGET_IDS,
    ]);
  });

  it("renders a widget section as layout children without a nested shell", async () => {
    expect(PRIMARY_CTA).toBe("Copy");

    for (const widget of PREVIEW_WIDGET_IDS) {
      const element = await GithubWidgetPlaygroundPage({
        params: Promise.resolve({ widget }),
      });
      const html = renderToStaticMarkup(element);

      expect(mocks.notFound).not.toHaveBeenCalled();
      expect(html).toContain('data-slot="playground-github-widget"');
      expect(html).toContain('data-plugin="github"');
      expect(html).toContain(`data-widget="${widget}"`);
      expect(html).toContain(`data-href="/playground/github/${widget}"`);
      expect(html).toContain(`data-primary-cta="${PRIMARY_CTA}"`);
      expect(html).toContain(`<h2>${widget}</h2>`);
      expect(html).toContain(PRIMARY_CTA);
      expect(html).not.toContain('data-slot="playground-shell"');
    }
  });

  it("calls notFound for unknown widget ids", async () => {
    for (const widget of ["nope", "coding", "feed", "http"]) {
      mocks.notFound.mockClear();
      await expect(
        GithubWidgetPlaygroundPage({
          params: Promise.resolve({ widget }),
        }),
      ).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
      expect(mocks.notFound).toHaveBeenCalledOnce();
    }
  });
});
