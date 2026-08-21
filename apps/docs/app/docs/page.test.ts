import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("fumadocs-ui/page", () => ({
  DocsPage: ({ children }: { children?: import("react").ReactNode }) =>
    createElement("div", { "data-slot": "docs-page" }, children),
  DocsTitle: ({ children }: { children?: import("react").ReactNode }) =>
    createElement("h1", null, children),
  DocsDescription: ({ children }: { children?: import("react").ReactNode }) =>
    createElement("p", null, children),
  DocsBody: ({ children }: { children?: import("react").ReactNode }) =>
    createElement("div", null, children),
}));

import GitHubPackDocsPage, { metadata } from "./page";

const PAGE_URL = new URL("./page.tsx", import.meta.url);

describe("/docs page (server)", () => {
  it("is a TSX stub, not a Fumadocs MDX tree", async () => {
    const source = await readFile(PAGE_URL, "utf8");

    expect(source).not.toContain("use client");
    expect(source).toContain('from "fumadocs-ui/page"');
    expect(source).not.toContain("content/docs");
    expect(source).not.toContain("fumadocs-mdx");
    expect(source).not.toContain("getMDXComponents");
    expect(source).not.toContain("@/.source");
    expect(source).not.toContain("generateStaticParams");
    expect(source).not.toContain("redirect(");
  });

  it("locks layout preview, relative embeds, gist output_action, 480×160, and Takumi", async () => {
    const source = await readFile(PAGE_URL, "utf8");
    const html = renderToStaticMarkup(createElement(GitHubPackDocsPage));

    expect(metadata.title).toBe("GitHub pack");
    expect(metadata.description).toContain("480×160");

    for (const copy of [
      "layout preview only",
      "not a public embed API",
      "![](./profile-bits/…)",
      "Gist is an optional",
      "output_action",
      "not a CDN",
      "480×160",
      "Takumi",
      "Docs chrome",
    ] as const) {
      expect(source).toContain(copy);
      expect(html).toContain(copy);
    }

    expect(html).toContain("not as a docs-chrome React tree");
    expect(html).toContain("renderSvg");
    expect(html).toContain("renderAnimation");
    expect(html).toContain('href="/playground"');
  });

  it("notes named catalog yaml theme, generate picker, named-id Action, and preview is not an embed API", async () => {
    const source = await readFile(PAGE_URL, "utf8");
    const html = renderToStaticMarkup(createElement(GitHubPackDocsPage));

    for (const copy of [
      "named catalog id or custom mix",
      "picker applies it",
      "named-id only",
      "POST /api/preview",
      "not an embed API",
    ] as const) {
      expect(source).toContain(copy);
      expect(html).toContain(copy);
    }

    expect(html).toContain('href="/generate"');
    expect(html).toContain("demo");
    expect(html).toContain("stats");
    expect(html).toContain("languages");
  });
});
