import { readFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_GENERATE_REQUEST,
  GENERATE_PLUGIN_ID,
} from "@/src/generate/shell";
import { PREVIEW_WIDGET_IDS } from "@/src/preview/types";
import GenerateGitHubPage, {
  GITHUB_GENERATE_HREF,
  githubPackRequest,
} from "./page";

const PAGE_URL = new URL("./page.tsx", import.meta.url);

describe("GET /generate/github", () => {
  it("is a server page that does not remount GenerateShell", async () => {
    const source = await readFile(PAGE_URL, "utf8");

    expect(source).not.toContain("use client");
    expect(source).not.toContain("GenerateShell");
    expect(source).toContain("githubPackRequest");
    expect(source).toContain('data-slot="generate-github"');
    expect(source).not.toContain("source-drop");
    expect(source).not.toContain("code-rail");
    expect(source).not.toContain("export-workflow");
    expect(source).not.toMatch(/\byaml\b/i);
    expect(source).not.toMatch(/\bwakatime\b/i);
    expect(source).not.toMatch(/\brss\b/i);
  });

  it("locks the pack request to v0 github", () => {
    expect(GENERATE_PLUGIN_ID).toBe("github");
    expect(GITHUB_GENERATE_HREF).toBe("/generate/github");
    expect(PREVIEW_WIDGET_IDS).toEqual(["demo", "stats", "languages"]);
    expect(githubPackRequest()).toEqual({
      ...DEFAULT_GENERATE_REQUEST,
      scope: "plugin",
      plugin: GENERATE_PLUGIN_ID,
    });
  });

  it("renders a labeled github pack section without nested shell chrome", () => {
    const html = renderToStaticMarkup(createElement(GenerateGitHubPage));

    expect(html).not.toContain('data-slot="generate-shell"');
    expect(html).toContain('data-slot="generate-github"');
    expect(html).toContain('data-plugin="github"');
    expect(html).toContain('data-href="/generate/github"');
    expect(html).toContain("<h2>github</h2>");
    expect(html).toContain("<code>github</code>");
    for (const widget of PREVIEW_WIDGET_IDS) {
      expect(html).toContain(`<code>${widget}</code>`);
    }
    expect(html).toContain("Download");
    expect(html).toContain("Share");
    expect(html).not.toContain("wakatime");
    expect(html).not.toContain("rss");
    expect(html.toLowerCase()).not.toContain("yaml");
    expect(html).not.toContain("source-drop");
  });
});
