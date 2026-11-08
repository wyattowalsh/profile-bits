import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fromJsx } from "@profile-bits/renderer";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { Grid } from "./Grid.js";
import { Text } from "./Text.js";
import { Theme } from "./Theme.js";

type TakumiNode = {
  type: string;
  text?: string;
  style?: Record<string, unknown>;
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

function findNode(
  node: TakumiNode,
  predicate: (candidate: TakumiNode) => boolean,
): TakumiNode | undefined {
  if (predicate(node)) {
    return node;
  }
  for (const child of node.children ?? []) {
    const found = findNode(child, predicate);
    if (found !== undefined) {
      return found;
    }
  }
  return undefined;
}

function findAll(
  node: TakumiNode,
  predicate: (candidate: TakumiNode) => boolean,
): TakumiNode[] {
  const matches: TakumiNode[] = [];
  if (predicate(node)) {
    matches.push(node);
  }
  for (const child of node.children ?? []) {
    matches.push(...findAll(child, predicate));
  }
  return matches;
}

const SOURCE = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "Grid.tsx"),
  "utf8",
);

describe("Grid", () => {
  it("fromJsx lays out children in two-dimensional cells without document", async () => {
    expect(globalThis.document).toBeUndefined();
    const node = (await fromJsx(
      createElement(
        Theme,
        { theme: "dark" },
        createElement(
          Grid,
          { columns: 2, gap: 8 },
          createElement(Text, null, "alpha"),
          createElement(Text, null, "beta"),
          createElement(Text, null, "gamma"),
          createElement(Text, null, "delta"),
        ),
      ),
    )) as TakumiNode;
    expect(node.type === "container" || node.type === "text").toBe(true);
    expect(collectTexts(node)).toEqual(
      expect.arrayContaining(["alpha", "beta", "gamma", "delta"]),
    );
    const grid = findNode(
      node,
      (candidate) => candidate.style?.display === "grid",
    );
    expect(grid).toBeDefined();
    expect(grid?.style).toMatchObject({
      display: "grid",
      width: "100%",
      gridTemplateColumns: "repeat(2, 1fr)",
      gap: 8,
    });
  });

  it("defaults to two columns and Row-like gap 8", async () => {
    expect(globalThis.document).toBeUndefined();
    const node = (await fromJsx(
      createElement(
        Theme,
        { theme: "dark" },
        createElement(
          Grid,
          null,
          createElement(Text, null, "one"),
          createElement(Text, null, "two"),
        ),
      ),
    )) as TakumiNode;
    const grid = findNode(
      node,
      (candidate) => candidate.style?.display === "grid",
    );
    expect(grid?.style).toMatchObject({
      display: "grid",
      gridTemplateColumns: "repeat(2, 1fr)",
      gap: 8,
    });
  });

  it("accepts a custom column count that is not an 8x8 board", async () => {
    expect(globalThis.document).toBeUndefined();
    const node = (await fromJsx(
      createElement(
        Theme,
        { theme: "dark" },
        createElement(
          Grid,
          { columns: 3, gap: 6 },
          createElement(Text, null, "a"),
          createElement(Text, null, "b"),
          createElement(Text, null, "c"),
        ),
      ),
    )) as TakumiNode;
    const grid = findNode(
      node,
      (candidate) => candidate.style?.display === "grid",
    );
    expect(grid?.style).toMatchObject({
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 6,
    });
    expect(grid?.style?.gridTemplateColumns).not.toBe("repeat(8, 1fr)");
    expect(
      findAll(grid ?? node, (candidate) => candidate.type === "container")
        .length,
    ).toBeLessThan(64);
  });

  it("is generic layout, not Heatmap intensity cells or Board squares", () => {
    expect(SOURCE).toContain('display: "grid"');
    expect(SOURCE).toContain("gridTemplateColumns");
    expect(SOURCE).not.toMatch(/Heatmap|Board|intensity|chess/i);
    expect(SOURCE).not.toContain("repeat(8");
    expect(SOURCE).not.toContain("borderRadius: size / 2");
  });

  it("stays Takumi-safe: div plus tw/style, no react-dom, document, or HTTP", () => {
    expect(SOURCE).toContain("<div");
    expect(SOURCE).toContain("tw=");
    expect(SOURCE).toContain("style={{");
    expect(SOURCE).not.toContain("react-dom");
    expect(SOURCE).not.toContain("useEffect");
    expect(SOURCE).not.toContain("createPortal");
    expect(SOURCE).not.toContain("document");
    expect(SOURCE).not.toMatch(/\bfetch\b/);
    expect(SOURCE).not.toMatch(/<canvas|<svg|<table/i);
  });
});
