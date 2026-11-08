import { readFile } from "node:fs/promises";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PREVIEW_HTTP_WIDGET_IDS } from "@/src/preview/types";

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
  }),
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
}));

import HttpWidgetPlaygroundPage, {
  generateStaticParams,
  PRIMARY_CTA,
} from "./page";

const PAGE_URL = new URL("./page.tsx", import.meta.url);
const VENDOR_FETCH_HOSTS = ["shieldcn.dev", "img.shields.io"] as const;

describe("GET /playground/http/[widget]", () => {
  beforeEach(() => {
    mocks.notFound.mockClear();
  });

  it("is a server page that prerenders json and chips only", async () => {
    const source = await readFile(PAGE_URL, "utf8");

    expect(source).not.toContain("use client");
    expect(source).toContain("generateStaticParams");
    expect(source).toContain("dynamicParams");
    expect(source).toContain("notFound");
    expect(source).toContain("isPreviewHttpWidgetId");
    expect(source).toContain("PREVIEW_HTTP_WIDGET_IDS");
    expect(source).not.toContain("isPreviewWidgetId");
    expect(source).not.toContain("PREVIEW_WIDGET_IDS");
    expect(source).not.toContain("isPreviewGithubWidgetId");
    expect(source).not.toContain("<PlaygroundShell");
    expect(source).not.toContain("chipFixture");
    expect(source).not.toContain("expandChipsRequest");
    expect(source).not.toContain("wakatime");
    expect(source).not.toContain("rss");
    expect(source).not.toContain("/playground/wakatime");
    expect(source).not.toContain("/playground/rss");
    expect(source).not.toContain("/generate/");
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source.toLowerCase()).not.toContain("download");
    expect(source.toLowerCase()).not.toContain("share");
    for (const host of VENDOR_FETCH_HOSTS) {
      expect(source).not.toContain(host);
    }
  });

  it("prerenders json and chips", () => {
    expect(generateStaticParams()).toEqual([
      { widget: "json" },
      { widget: "chips" },
    ]);
    expect(generateStaticParams().map((row) => row.widget)).toEqual([
      ...PREVIEW_HTTP_WIDGET_IDS,
    ]);
    expect(generateStaticParams().map((row) => row.widget)).not.toContain(
      "repo",
    );
    expect(generateStaticParams().map((row) => row.widget)).not.toContain(
      "demo",
    );
  });

  it("renders a widget section as layout children without a nested shell", async () => {
    expect(PRIMARY_CTA).toBe("Copy");

    for (const widget of PREVIEW_HTTP_WIDGET_IDS) {
      const element = await HttpWidgetPlaygroundPage({
        params: Promise.resolve({ widget }),
      });
      const html = renderToStaticMarkup(element);

      expect(mocks.notFound).not.toHaveBeenCalled();
      expect(html).toContain('data-slot="playground-http-widget"');
      expect(html).toContain('data-plugin="http"');
      expect(html).toContain(`data-widget="${widget}"`);
      expect(html).toContain(`data-href="/playground/http/${widget}"`);
      expect(html).toContain(`data-primary-cta="${PRIMARY_CTA}"`);
      expect(html).toContain(`<h2>${widget}</h2>`);
      expect(html).toContain(PRIMARY_CTA);
      expect(html).not.toContain('data-slot="playground-shell"');
      expect(html).not.toContain('data-slot="playground-http-tuners"');
      expect(html.toLowerCase()).not.toContain("download");
      expect(html.toLowerCase()).not.toContain("share");
    }
  });

  it("calls notFound for unknown widget ids", async () => {
    for (const widget of [
      "nope",
      "demo",
      "stats",
      "languages",
      "repo",
      "coding",
      "feed",
      "github",
    ]) {
      mocks.notFound.mockClear();
      await expect(
        HttpWidgetPlaygroundPage({
          params: Promise.resolve({ widget }),
        }),
      ).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
      expect(mocks.notFound).toHaveBeenCalledOnce();
    }
  });
});
