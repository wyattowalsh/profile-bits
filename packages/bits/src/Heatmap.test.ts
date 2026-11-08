import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DARK_THEME, fromJsx, LIGHT_THEME } from "@profile-bits/renderer";
import { parseHex } from "@profile-bits/themes";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { DAYS_PER_WEEK, Heatmap, type HeatmapWeek } from "./Heatmap.js";
import { Theme } from "./Theme.js";

type TakumiNode = {
  type: string;
  text?: string;
  style?: Record<string, unknown>;
  children?: TakumiNode[];
};

const SOURCE = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "Heatmap.tsx"),
  "utf8",
);

const HEATMAP_LEVELS = 4;
const DEFAULT_CELL_SIZE = 10;
const CELL_MARK = "\u2588";

function toHexByte(value: number): string {
  return value.toString(16).padStart(2, "0");
}

function mixHex(from: string, to: string, t: number): string {
  const a = parseHex(from);
  const b = parseHex(to);
  const u = Math.max(0, Math.min(1, t));
  const mix = (x: number, y: number) => Math.round(x + (y - x) * u);
  return `#${toHexByte(mix(a.r, b.r))}${toHexByte(mix(a.g, b.g))}${toHexByte(mix(a.b, b.b))}`;
}

function expectedFill(
  count: number,
  maxCount: number,
  empty: string,
  fill: string,
): string {
  if (count <= 0 || maxCount <= 0) {
    return mixHex(empty, fill, 0);
  }
  const ratio = count / maxCount;
  const level = ratio <= 0.25 ? 1 : ratio <= 0.5 ? 2 : ratio <= 0.75 ? 3 : 4;
  return mixHex(empty, fill, level / HEATMAP_LEVELS);
}

function collect(
  node: TakumiNode,
  predicate: (candidate: TakumiNode) => boolean,
): TakumiNode[] {
  const matches: TakumiNode[] = [];
  if (predicate(node)) {
    matches.push(node);
  }
  for (const child of node.children ?? []) {
    matches.push(...collect(child, predicate));
  }
  return matches;
}

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

function isCell(node: TakumiNode, size: number): boolean {
  return (
    node.style?.width === size &&
    node.style?.height === size &&
    typeof node.style?.backgroundColor === "string"
  );
}

async function renderHeatmap(
  weeks: readonly HeatmapWeek[],
  theme: "dark" | "light" = "dark",
  extra?: { cellSize?: number; gap?: number; maxCount?: number },
): Promise<TakumiNode> {
  return (await fromJsx(
    createElement(
      Theme,
      { theme },
      createElement(Heatmap, { weeks, ...extra }),
    ),
  )) as TakumiNode;
}

describe("Heatmap", () => {
  it("is a Takumi-safe day grid of intensity cells, not Board or Grid", () => {
    expect(SOURCE).toContain("export function Heatmap");
    expect(SOURCE).toContain("useBitTheme");
    expect(SOURCE).toContain("theme.border");
    expect(SOURCE).toContain("theme.accent");
    expect(SOURCE).toContain('flexDirection: "column"');
    expect(SOURCE).toContain('flexDirection: "row"');
    expect(SOURCE).not.toMatch(/children\?:/);
    expect(SOURCE).not.toContain("react-dom");
    expect(SOURCE).not.toContain("useEffect");
    expect(SOURCE).not.toContain("document");
    expect(SOURCE).not.toContain("react-icons");
    expect(SOURCE).not.toContain("Board");
    expect(SOURCE).not.toContain("Grid");
    expect(SOURCE).not.toContain("GITHUB_FLAVORS");
    expect(SOURCE).not.toContain("NAMED_THEME_IDS");
    expect(SOURCE).not.toContain("families/");
    expect(SOURCE).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(DAYS_PER_WEEK).toBe(7);
    expect(DAYS_PER_WEEK).not.toBe(8);
  });

  it("fromJsx renders week columns of seven day cells without document", async () => {
    expect(globalThis.document).toBeUndefined();
    const node = await renderHeatmap([
      {
        days: [
          { date: "2026-01-04", count: 0, weekday: 0 },
          { date: "2026-01-05", count: 1, weekday: 1 },
          { date: "2026-01-06", count: 2, weekday: 2 },
          { date: "2026-01-07", count: 3, weekday: 3 },
          { date: "2026-01-08", count: 4, weekday: 4 },
          { date: "2026-01-09", count: 0, weekday: 5 },
          { date: "2026-01-10", count: 0, weekday: 6 },
        ],
      },
      {
        days: [{ date: "2026-01-11", count: 0, weekday: 0 }],
      },
    ]);

    expect(node.type === "container" || node.type === "text").toBe(true);
    const row = collect(
      node,
      (candidate) =>
        candidate.style?.flexDirection === "row" && candidate.style?.gap === 2,
    )[0];
    expect(row?.style).toMatchObject({
      display: "flex",
      flexDirection: "row",
      gap: 2,
    });

    const columns = collect(
      node,
      (candidate) => candidate.style?.flexDirection === "column",
    );
    expect(columns).toHaveLength(2);
    expect(columns[0]?.style).toMatchObject({
      display: "flex",
      flexDirection: "column",
      gap: 2,
    });

    const cells = collect(node, (candidate) =>
      isCell(candidate, DEFAULT_CELL_SIZE),
    );
    expect(cells).toHaveLength(2 * DAYS_PER_WEEK);
    expect(cells).not.toHaveLength(64);
    expect(cells[0]?.style).toMatchObject({
      width: DEFAULT_CELL_SIZE,
      height: DEFAULT_CELL_SIZE,
      borderRadius: 2,
    });
    expect(cells[0]?.style?.boxShadow).toBeUndefined();
    expect(
      collectTexts(node).filter((text) => text === CELL_MARK),
    ).toHaveLength(2 * DAYS_PER_WEEK);
    for (const cell of cells) {
      expect(cell.style?.width).toBe(DEFAULT_CELL_SIZE);
      expect(cell.style?.height).toBe(DEFAULT_CELL_SIZE);
    }
  });

  it("fills cells from theme border to accent, not catalog flavor hex", async () => {
    expect(globalThis.document).toBeUndefined();
    const maxCount = 4;
    const node = await renderHeatmap([
      {
        days: [0, 1, 2, 3, 4, 0, 0].map((count, weekday) => ({
          count,
          weekday,
        })),
      },
    ]);

    const cells = collect(node, (candidate) =>
      isCell(candidate, DEFAULT_CELL_SIZE),
    );
    expect(cells).toHaveLength(DAYS_PER_WEEK);

    const empty = DARK_THEME.border;
    const fill = DARK_THEME.accent;
    expect(cells[0]?.style?.backgroundColor).toBe(
      expectedFill(0, maxCount, empty, fill),
    );
    expect(cells[1]?.style?.backgroundColor).toBe(
      expectedFill(1, maxCount, empty, fill),
    );
    expect(cells[2]?.style?.backgroundColor).toBe(
      expectedFill(2, maxCount, empty, fill),
    );
    expect(cells[3]?.style?.backgroundColor).toBe(
      expectedFill(3, maxCount, empty, fill),
    );
    expect(cells[4]?.style?.backgroundColor).toBe(
      expectedFill(4, maxCount, empty, fill),
    );
    expect(cells[0]?.style?.backgroundColor).toBe(empty);
    expect(cells[4]?.style?.backgroundColor).toBe(fill);
    expect(cells[2]?.style?.backgroundColor).not.toBe(empty);
    expect(cells[2]?.style?.backgroundColor).not.toBe(fill);
    expect(cells[0]?.style?.color).toBe(empty);
    expect(cells[4]?.style?.color).toBe(fill);

    const fills = cells.map((cell) => cell.style?.backgroundColor);
    expect(fills).not.toContain("#9be9a8");
    expect(fills).not.toContain("#40c463");
    expect(fills).not.toContain("#216e39");
  });

  it("reads empty and hot fills from light theme context", async () => {
    expect(globalThis.document).toBeUndefined();
    const node = await renderHeatmap(
      [
        {
          days: [
            { count: 0, weekday: 0 },
            { count: 4, weekday: 1 },
          ],
        },
      ],
      "light",
    );

    const cells = collect(node, (candidate) =>
      isCell(candidate, DEFAULT_CELL_SIZE),
    );
    expect(cells[0]?.style?.backgroundColor).toBe(LIGHT_THEME.border);
    expect(cells[1]?.style?.backgroundColor).toBe(LIGHT_THEME.accent);
    expect(cells[0]?.style?.color).toBe(LIGHT_THEME.border);
    expect(cells[1]?.style?.color).toBe(LIGHT_THEME.accent);
    expect(cells[0]?.style?.backgroundColor).not.toBe(DARK_THEME.border);
    expect(cells[1]?.style?.backgroundColor).not.toBe(DARK_THEME.accent);
  });

  it("pads a partial week to seven day slots so columns align", async () => {
    const node = await renderHeatmap([
      {
        days: [{ date: "2026-01-07", count: 8, weekday: 3 }],
      },
    ]);

    const cells = collect(node, (candidate) =>
      isCell(candidate, DEFAULT_CELL_SIZE),
    );
    expect(cells).toHaveLength(DAYS_PER_WEEK);
    expect(cells[3]?.style?.backgroundColor).toBe(DARK_THEME.accent);
    expect(cells[0]?.style?.backgroundColor).toBe(DARK_THEME.border);
    expect(cells[6]?.style?.backgroundColor).toBe(DARK_THEME.border);
  });

  it("honors cellSize, gap, and an explicit maxCount scale", async () => {
    const node = await renderHeatmap(
      [{ days: [{ count: 1, weekday: 0 }] }],
      "dark",
      { cellSize: 8, gap: 3, maxCount: 4 },
    );

    const row = collect(
      node,
      (candidate) =>
        candidate.style?.flexDirection === "row" && candidate.style?.gap === 3,
    )[0];
    expect(row?.style?.gap).toBe(3);

    const cells = collect(node, (candidate) => isCell(candidate, 8));
    expect(cells).toHaveLength(DAYS_PER_WEEK);
    expect(cells[0]?.style?.backgroundColor).toBe(
      expectedFill(1, 4, DARK_THEME.border, DARK_THEME.accent),
    );
    expect(cells[0]?.style?.backgroundColor).not.toBe(DARK_THEME.accent);
  });
});
