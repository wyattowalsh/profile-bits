import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fromJsx } from "@profile-bits/renderer";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { githubDumpFromFixtures } from "../github-dump.fixture.js";
import { renderContributionsSvg } from "./render.js";
import { contributionsViewModel } from "./view-model.js";
import { ContributionsWidget, NO_CONTRIBUTION_DATA } from "./widget.js";

const dir = dirname(fileURLToPath(import.meta.url));

const SOURCE_FILES = ["widget.tsx", "view-model.ts", "render.ts"] as const;

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

describe("contributions widget", () => {
  it("empty payload is an empty card, not a crash or invented 0", () => {
    expect(contributionsViewModel({}).empty).toBe(true);
    expect(NO_CONTRIBUTION_DATA).toBe("No contribution data");
  });

  it("renders svg without HTTP", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const model = contributionsViewModel(githubDumpFromFixtures());
    const node = (await fromJsx(
      createElement(ContributionsWidget, model),
    )) as TakumiNode;
    const svg = await renderContributionsSvg({
      payload: githubDumpFromFixtures(),
    });
    expect(svg).toMatch(/<svg\b/);
    expect(svg).toMatch(/width="480"/);
    expect(svg).toMatch(/height="160"/);
    expect(collectTexts(node)).toContain("octocat");
    expect(collectTexts(node)).toContain("1.6k");
    expect(svg).not.toMatch(/<style\b|@keyframes|<animate\b|foreignObject/i);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("renders empty copy without HTTP and does not invent 0", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const model = contributionsViewModel({});
    const node = (await fromJsx(
      createElement(ContributionsWidget, model),
    )) as TakumiNode;
    const svg = await renderContributionsSvg({ payload: {} });
    expect(svg).toMatch(/<svg\b/);
    expect(collectTexts(node)).toContain(NO_CONTRIBUTION_DATA);
    expect(svg).not.toContain(">0</");
    expect(collectTexts(node)).not.toContain("0");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("renders a dump with extra keys without HTTP", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const svg = await renderContributionsSvg({
      payload: githubDumpFromFixtures({ extraCard: { unused: true } }),
    });
    expect(svg).toMatch(/<svg\b/);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("uses Heatmap and the github dump, never HTTP or REST /languages", () => {
    for (const relative of SOURCE_FILES) {
      const text = readFileSync(join(dir, relative), "utf8");
      expect(text, relative).not.toMatch(/\bfetch\s*\(/);
      expect(text, relative).not.toContain("/repos/{owner}/{repo}/languages");
      expect(text, relative).not.toMatch(/https?:\/\/api\.github\.com/);
    }
    const widget = readFileSync(join(dir, "widget.tsx"), "utf8");
    expect(widget).toContain("Heatmap");
    expect(widget).not.toContain('from "@profile-bits/integrations"');
  });
});
