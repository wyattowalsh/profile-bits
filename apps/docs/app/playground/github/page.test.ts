import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import GitHubPlaygroundPage, {
  GITHUB_PLAYGROUND_HREF,
  GITHUB_PLAYGROUND_SHELL,
  GITHUB_WIDGET_IDS,
  PRIMARY_CTA,
} from "@/app/playground/github/page";
import { PLAYGROUND_PLUGIN, PlaygroundShell } from "@/src/codegen/shell";
import { PREVIEW_WIDGET_IDS } from "@/src/preview/types";

const PAGE_URL = new URL("./page.tsx", import.meta.url);

describe("/playground/github page (server)", () => {
  it("is a server page that wires PlaygroundShell for the github pack", async () => {
    const source = await readFile(PAGE_URL, "utf8");

    expect(source).not.toContain("use client");
    expect(source).toContain("PlaygroundShell");
    expect(source).toContain("PLAYGROUND_PLUGIN");
    expect(source).toContain(PRIMARY_CTA);
    expect(source).not.toContain("redirect(");
    expect(source).not.toContain("permanentRedirect");
    expect(source).not.toContain("generateStaticParams");
    expect(source).not.toContain("notFound");
    expect(source).not.toContain("wakatime");
    expect(source).not.toContain("rss");
    expect(source.toLowerCase()).not.toContain("download");
    expect(source.toLowerCase()).not.toContain("share");
  });

  it("locks v0 github widgets and Copy as the primary CTA", () => {
    expect(PLAYGROUND_PLUGIN).toBe("github");
    expect(GITHUB_PLAYGROUND_HREF).toBe("/playground/github");
    expect(GITHUB_WIDGET_IDS).toEqual(["demo", "stats", "languages"]);
    expect(GITHUB_WIDGET_IDS).toEqual(PREVIEW_WIDGET_IDS);
    expect(PRIMARY_CTA).toBe("Copy");
    expect(GITHUB_PLAYGROUND_SHELL).toBe(PlaygroundShell);
  });

  it("renders the github pack identity without a Download or Share primary", () => {
    const html = renderToStaticMarkup(createElement(GitHubPlaygroundPage));

    expect(html).toContain('data-slot="playground-github-page"');
    expect(html).toContain('data-plugin="github"');
    expect(html).toContain('data-href="/playground/github"');
    expect(html).toContain(`data-primary-cta="${PRIMARY_CTA}"`);
    expect(html).toContain(PRIMARY_CTA);
    expect(html).toContain("<code>github</code>");
    for (const widget of GITHUB_WIDGET_IDS) {
      expect(html).toContain(`<code>${widget}</code>`);
    }
    expect(html.toLowerCase()).not.toContain("download");
    expect(html.toLowerCase()).not.toContain("share");
    expect(html).not.toContain("wakatime");
    expect(html).not.toContain("rss");
  });
});
