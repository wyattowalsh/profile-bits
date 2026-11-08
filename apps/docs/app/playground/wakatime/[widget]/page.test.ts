import { readFile } from "node:fs/promises";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PREVIEW_WAKATIME_WIDGET_IDS } from "@/src/preview/types";

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
  }),
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
}));

import WakatimeWidgetPlaygroundPage, {
  generateStaticParams,
  PRIMARY_CTA,
} from "./page";

const PAGE_URL = new URL("./page.tsx", import.meta.url);
const LANDING_URL = new URL("../../page.tsx", import.meta.url);

describe("GET /playground/wakatime/[widget]", () => {
  beforeEach(() => {
    mocks.notFound.mockClear();
  });

  it("is a server page that prerenders wakatime widgets only", async () => {
    const source = await readFile(PAGE_URL, "utf8");

    expect(source).not.toContain("use client");
    expect(source).toContain("generateStaticParams");
    expect(source).toContain("dynamicParams");
    expect(source).toContain("notFound");
    expect(source).toContain("isPreviewWakatimeWidgetId");
    expect(source).toContain("PREVIEW_WAKATIME_WIDGET_IDS");
    expect(source).not.toContain("isPreviewWidgetId");
    expect(source).not.toContain("PREVIEW_WIDGET_IDS");
    expect(source).not.toContain("PREVIEW_GITHUB_WIDGET_IDS");
    expect(source).not.toContain("<PlaygroundShell");
    expect(source).not.toContain("/playground/github");
    expect(source).not.toContain("/playground/rss");
    expect(source).not.toContain("/playground/http");
    expect(source).not.toContain("/generate/");
  });

  it("prerenders coding only", () => {
    expect(generateStaticParams()).toEqual([{ widget: "coding" }]);
    expect(generateStaticParams().map((row) => row.widget)).toEqual([
      ...PREVIEW_WAKATIME_WIDGET_IDS,
    ]);
    expect(generateStaticParams().map((row) => row.widget)).not.toContain(
      "feed",
    );
    expect(generateStaticParams().map((row) => row.widget)).not.toContain(
      "chips",
    );
  });

  it("renders a widget section as layout children without a nested shell", async () => {
    expect(PRIMARY_CTA).toBe("Copy");

    for (const widget of PREVIEW_WAKATIME_WIDGET_IDS) {
      const element = await WakatimeWidgetPlaygroundPage({
        params: Promise.resolve({ widget }),
      });
      const html = renderToStaticMarkup(element);

      expect(mocks.notFound).not.toHaveBeenCalled();
      expect(html).toContain('data-slot="playground-wakatime-widget"');
      expect(html).toContain('data-plugin="wakatime"');
      expect(html).toContain(`data-widget="${widget}"`);
      expect(html).toContain(`data-href="/playground/wakatime/${widget}"`);
      expect(html).toContain(`data-primary-cta="${PRIMARY_CTA}"`);
      expect(html).toContain(`<h2>${widget}</h2>`);
      expect(html).toContain(PRIMARY_CTA);
      expect(html).not.toContain('data-slot="playground-shell"');
      expect(html).not.toContain("/playground/github");
      expect(html).not.toContain("/playground/rss");
      expect(html).not.toContain("/playground/http");
    }
  });

  it("calls notFound for unknown widget ids", async () => {
    for (const widget of [
      "nope",
      "demo",
      "stats",
      "languages",
      "repo",
      "feed",
      "json",
      "chips",
      "http",
    ]) {
      mocks.notFound.mockClear();
      await expect(
        WakatimeWidgetPlaygroundPage({
          params: Promise.resolve({ widget }),
        }),
      ).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
      expect(mocks.notFound).toHaveBeenCalledOnce();
    }
  });

  it("does not add pack paths to the /playground landing source", async () => {
    const source = await readFile(LANDING_URL, "utf8");

    expect(source).toMatch(/redirect\(\s*"\/playground\/github"\s*\)/);
    expect(source).not.toContain("/playground/wakatime");
    expect(source).not.toContain("/playground/rss");
    expect(source).not.toContain("/playground/http");
  });
});
