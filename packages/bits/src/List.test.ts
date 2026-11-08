import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DARK_THEME, fromJsx, LIGHT_THEME } from "@profile-bits/renderer";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { List } from "./List.js";
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

const SOURCE = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "List.tsx"),
  "utf8",
);

describe("List", () => {
  it("is Takumi-safe item rows (title plus meta), not Stack children", () => {
    expect(SOURCE).toContain("export function List");
    expect(SOURCE).toContain("title");
    expect(SOURCE).toContain("meta");
    expect(SOURCE).not.toMatch(/children\?:/);
    expect(SOURCE).not.toContain("react-dom");
    expect(SOURCE).not.toContain("useEffect");
    expect(SOURCE).not.toContain("document");
    expect(SOURCE).not.toContain("react-icons");
    expect(SOURCE).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });

  it("fromJsx stacks title plus meta rows without document", async () => {
    expect(globalThis.document).toBeUndefined();
    const node = (await fromJsx(
      createElement(
        Theme,
        { theme: "dark" },
        createElement(List, {
          items: [
            { title: "Track One", meta: "Artist" },
            { title: "Track Two", meta: "2:14" },
          ],
        }),
      ),
    )) as TakumiNode;

    expect(node.type === "container" || node.type === "text").toBe(true);
    expect(collectTexts(node)).toEqual(
      expect.arrayContaining(["Track One", "Artist", "Track Two", "2:14"]),
    );

    const column = findNode(
      node,
      (candidate) =>
        candidate.style?.flexDirection === "column" &&
        candidate.style?.gap === 6,
    );
    expect(column).toBeDefined();

    const row = findNode(
      node,
      (candidate) =>
        candidate.style?.flexDirection === "row" &&
        candidate.style?.justifyContent === "space-between" &&
        collectTexts(candidate).includes("Track One") &&
        collectTexts(candidate).includes("Artist"),
    );
    expect(row).toBeDefined();
    expect(row?.style).toMatchObject({
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    });

    const title = findNode(node, (candidate) => candidate.text === "Track One");
    const meta = findNode(node, (candidate) => candidate.text === "Artist");
    expect(title?.style).toMatchObject({
      color: DARK_THEME.text,
      fontFamily: DARK_THEME.font,
      fontSize: 14,
      fontWeight: 600,
    });
    expect(meta?.style).toMatchObject({
      color: DARK_THEME.muted,
      fontFamily: DARK_THEME.font,
      fontSize: 12,
      fontWeight: 400,
    });
  });

  it("reads title and meta colors from light theme context", async () => {
    expect(globalThis.document).toBeUndefined();
    const node = (await fromJsx(
      createElement(
        Theme,
        { theme: "light" },
        createElement(List, {
          items: [{ title: "Repo", meta: "12 stars" }],
        }),
      ),
    )) as TakumiNode;

    const title = findNode(node, (candidate) => candidate.text === "Repo");
    const meta = findNode(node, (candidate) => candidate.text === "12 stars");
    expect(title?.style?.color).toBe(LIGHT_THEME.text);
    expect(meta?.style?.color).toBe(LIGHT_THEME.muted);
  });

  it("omits blank meta and honors a custom column gap", async () => {
    const node = (await fromJsx(
      createElement(
        Theme,
        { theme: "dark" },
        createElement(List, {
          gap: 10,
          items: [{ title: "Solo title", meta: "" }],
        }),
      ),
    )) as TakumiNode;

    expect(collectTexts(node)).toEqual(["Solo title"]);
    const column = findNode(
      node,
      (candidate) =>
        candidate.style?.flexDirection === "column" &&
        candidate.style?.gap === 10,
    );
    expect(column).toBeDefined();
  });
});
