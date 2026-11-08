import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DARK_THEME, fromJsx, LIGHT_THEME } from "@profile-bits/renderer";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { BOARD_SIZE, Board, type BoardSquare, STARTING_FEN } from "./Board.js";
import { Theme } from "./Theme.js";

type TakumiNode = {
  type: string;
  text?: string;
  style?: Record<string, unknown>;
  children?: TakumiNode[];
};

const SOURCE = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "Board.tsx"),
  "utf8",
);

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

function collectNodes(
  node: TakumiNode,
  predicate: (candidate: TakumiNode) => boolean,
): TakumiNode[] {
  const found: TakumiNode[] = [];
  if (predicate(node)) {
    found.push(node);
  }
  for (const child of node.children ?? []) {
    found.push(...collectNodes(child, predicate));
  }
  return found;
}

function cellsOf(node: TakumiNode, cellSize: number): TakumiNode[] {
  return collectNodes(
    node,
    (candidate) =>
      candidate.style?.width === cellSize &&
      candidate.style?.height === cellSize &&
      (candidate.style?.backgroundColor === DARK_THEME.border ||
        candidate.style?.backgroundColor === DARK_THEME.card ||
        candidate.style?.backgroundColor === LIGHT_THEME.border ||
        candidate.style?.backgroundColor === LIGHT_THEME.card),
  );
}

function rankRowsOf(node: TakumiNode, cellSize: number): TakumiNode[] {
  return collectNodes(
    node,
    (candidate) =>
      candidate.style?.flexDirection === "row" &&
      cellsOf(candidate, cellSize).length === BOARD_SIZE,
  );
}

function emptySquares(): BoardSquare[] {
  return Array.from({ length: BOARD_SIZE * BOARD_SIZE }, () => null);
}

async function renderBoard(
  props: {
    fen?: string;
    squares?: readonly BoardSquare[];
    size?: number;
    showLabels?: boolean;
    theme?: "dark" | "light";
  } = {},
): Promise<TakumiNode> {
  const { theme = "dark", ...boardProps } = props;
  return (await fromJsx(
    createElement(Theme, { theme }, createElement(Board, boardProps)),
  )) as TakumiNode;
}

describe("Board", () => {
  it("is a Takumi-safe 8x8 chess grid, not Heatmap or generic Grid", () => {
    expect(SOURCE).toContain("export function Board");
    expect(SOURCE).toContain("BOARD_SIZE = 8");
    expect(SOURCE).toContain("STARTING_FEN");
    expect(SOURCE).toContain("<div");
    expect(SOURCE).not.toMatch(/children\?:/);
    expect(SOURCE).not.toContain("Heatmap");
    expect(SOURCE).not.toContain("react-dom");
    expect(SOURCE).not.toContain("useEffect");
    expect(SOURCE).not.toContain("document");
    expect(SOURCE).not.toContain("react-icons");
    expect(SOURCE).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(BOARD_SIZE).toBe(8);
    expect(
      STARTING_FEN.startsWith("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR"),
    ).toBe(true);
  });

  it("fromJsx presents eight columns and eight rows without document", async () => {
    expect(globalThis.document).toBeUndefined();
    const node = await renderBoard();
    expect(node.type === "container" || node.type === "text").toBe(true);

    const cells = cellsOf(node, 16);
    expect(cells).toHaveLength(64);

    expect(rankRowsOf(node, 16)).toHaveLength(8);

    const texts = collectTexts(node);
    expect(texts.filter((text) => text === "♟")).toHaveLength(8);
    expect(texts.filter((text) => text === "♙")).toHaveLength(8);
    expect(texts).toEqual(
      expect.arrayContaining(["a", "h", "1", "8", "♔", "♚", "♕", "♛"]),
    );
  });

  it("colors a1 dark and a8 light from theme context, with no boxShadow", async () => {
    const node = await renderBoard({ theme: "dark" });
    const rankRows = rankRowsOf(node, 16);
    expect(rankRows).toHaveLength(8);
    const topRow = rankRows[0];
    const bottomRow = rankRows[7];
    expect(topRow).toBeDefined();
    expect(bottomRow).toBeDefined();
    const top = topRow === undefined ? [] : cellsOf(topRow, 16);
    const bottom = bottomRow === undefined ? [] : cellsOf(bottomRow, 16);
    expect(top[0]?.style?.backgroundColor).toBe(DARK_THEME.card);
    expect(bottom[0]?.style?.backgroundColor).toBe(DARK_THEME.border);
    expect(top[0]?.style?.color).toBe(DARK_THEME.text);
    expect(top[0]?.style?.boxShadow).toBeUndefined();
    expect(bottom[7]?.style?.backgroundColor).toBe(DARK_THEME.card);
  });

  it("reads square fills from light theme context", async () => {
    const node = await renderBoard({ theme: "light" });
    const rankRows = rankRowsOf(node, 16);
    const topRow = rankRows[0];
    const bottomRow = rankRows[7];
    expect(topRow).toBeDefined();
    expect(bottomRow).toBeDefined();
    const top = topRow === undefined ? [] : cellsOf(topRow, 16);
    const bottom = bottomRow === undefined ? [] : cellsOf(bottomRow, 16);
    expect(top[0]?.style?.backgroundColor).toBe(LIGHT_THEME.card);
    expect(bottom[0]?.style?.backgroundColor).toBe(LIGHT_THEME.border);
    expect(bottom[0]?.style?.color).toBe(LIGHT_THEME.text);
  });

  it("places squares[] glyphs and keeps 64 cells when size is not a multiple of 8", async () => {
    const squares = emptySquares();
    squares[36] = "Q";
    const node = await renderBoard({ squares, size: 160, showLabels: false });
    const cells = cellsOf(node, 20);
    expect(cells).toHaveLength(64);
    expect(collectTexts(node)).toContain("♕");
    expect(collectTexts(node)).not.toContain("♟");
  });

  it("prefers squares over fen and still renders 8x8 for invalid fen", async () => {
    const squares = emptySquares();
    squares[0] = "K";
    const preferred = await renderBoard({
      fen: STARTING_FEN,
      squares,
      showLabels: false,
    });
    expect(collectTexts(preferred)).toContain("♔");
    expect(collectTexts(preferred).filter((text) => text === "♟")).toHaveLength(
      0,
    );

    const invalid = await renderBoard({ fen: "not-a-fen" });
    expect(cellsOf(invalid, 16)).toHaveLength(64);
    expect(collectTexts(invalid)).toEqual(
      expect.arrayContaining(["a", "h", "1", "8"]),
    );
    expect(collectTexts(invalid)).not.toContain("♔");
  });

  it("hides file/rank labels when occupied and showLabels is false", async () => {
    const node = await renderBoard({ showLabels: false });
    const texts = collectTexts(node);
    expect(texts).not.toContain("a");
    expect(texts).not.toContain("8");
    expect(cellsOf(node, 16)).toHaveLength(64);
  });
});
