import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fromJsx } from "@profile-bits/renderer";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { githubPreviewElement } from "../../preview.js";
import { githubDumpFromFixtures } from "../github-dump.fixture.js";
import { renderTopReposSvg } from "./render.js";
import { topReposViewModel } from "./view-model.js";
import { NO_REPOSITORIES, TopReposWidget } from "./widget.js";

const widgetDir = dirname(fileURLToPath(import.meta.url));

type TakumiNode = {
  type: string;
  text?: string;
  children?: TakumiNode[];
};

function collectTexts(node: TakumiNode): string[] {
  const texts: string[] = [];
  if (typeof node.text === "string" && node.text.length > 0) {
    texts.push(node.text);
  }
  for (const child of node.children ?? []) {
    texts.push(...collectTexts(child));
  }
  return texts;
}

async function cardTexts(payload: unknown): Promise<string[]> {
  const model = topReposViewModel(payload);
  const node = (await fromJsx(
    createElement(TopReposWidget, {
      items: model.items,
      empty: model.empty,
    }),
  )) as TakumiNode;
  return collectTexts(node);
}

const READER_FILES = ["view-model.ts", "render.ts", "widget.tsx"] as const;

describe("top-repos widget", () => {
  it("renders svg without HTTP", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const svg = await renderTopReposSvg({
      payload: {
        repositories: [{ name: "alpha", stargazersCount: 1500, forksCount: 2 }],
      },
    });
    expect(svg).toMatch(/<svg\b/);
    expect(svg).toMatch(/width="480"/);
    expect(svg).toMatch(/height="160"/);
    const texts = await cardTexts({
      repositories: [{ name: "alpha", stargazersCount: 1500, forksCount: 2 }],
    });
    expect(texts).toContain("alpha");
    expect(texts).toContain("1.5k stars");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("renders empty card text without HTTP", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const svg = await renderTopReposSvg({ payload: {} });
    expect(svg).toMatch(/<svg\b/);
    expect(NO_REPOSITORIES).toBe("No repositories");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("renders a dump with extra keys without HTTP", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const svg = await renderTopReposSvg({
      payload: githubDumpFromFixtures({ heatmap: { weeks: 52 } }),
    });
    expect(svg).toMatch(/<svg\b/);
    expect(
      await cardTexts(githubDumpFromFixtures({ heatmap: { weeks: 52 } })),
    ).toContain("Hello-World");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("bakes mocha bg hex instead of Primer dark", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const svg = await renderTopReposSvg({
      payload: {
        repositories: [{ name: "alpha", stargazersCount: 1, forksCount: 0 }],
      },
      theme: "catppuccin-mocha",
    });
    expect(svg).toContain("#1e1e2e");
    expect(svg).not.toContain("#0d1117");
    expect(svg).not.toMatch(/<style\b|@keyframes|<animate\b|foreignObject/i);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("preview element selects the dump without HTTP", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const model = topReposViewModel(githubDumpFromFixtures(), { limit: 1 });
    const element = githubPreviewElement({
      widget: "top-repos",
      payload: githubDumpFromFixtures(),
      options: { "top-repos": { limit: 1 } },
    });
    expect(element.props.items).toEqual(model.items);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("github top-repos readers contain no HTTP and never REST /languages", () => {
    for (const relative of READER_FILES) {
      const text = readFileSync(join(widgetDir, relative), "utf8");
      expect(text, relative).not.toMatch(/\bfetch\s*\(/);
      expect(text, relative).not.toContain("/repos/{owner}/{repo}/languages");
      expect(text, relative).not.toMatch(/https?:\/\/api\.github\.com/);
    }
  });
});
