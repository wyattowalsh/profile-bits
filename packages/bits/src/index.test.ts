import { DARK_THEME, fromJsx, LIGHT_THEME } from "@profile-bits/renderer";
import { readableInk } from "@profile-bits/themes";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import * as bits from "./index.js";
import {
  BIT_EXPORTS,
  Board,
  Chip,
  Frame,
  Grid,
  Heatmap,
  Icon,
  Image,
  List,
  Text,
  Theme,
  Time,
} from "./index.js";

type TakumiNode = {
  type: string;
  text?: string;
  style?: Record<string, unknown>;
  children?: TakumiNode[];
};

const FROZEN_11 = [
  "Theme",
  "Frame",
  "Stack",
  "Row",
  "Text",
  "Muted",
  "Stat",
  "Bar",
  "Chip",
  "Avatar",
  "Divider",
] as const;

const README_CARD_BITS = [
  "Image",
  "Heatmap",
  "Board",
  "Icon",
  "Grid",
  "List",
  "Time",
] as const;

const REFUSED = [
  "Cover",
  "Dialog",
  "Toast",
  "Popover",
  "Dropdown",
  "Command",
] as const;

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

describe("bits", () => {
  it("exports Frozen 11 plus approved README-card bits", () => {
    expect(BIT_EXPORTS).toEqual([...FROZEN_11, ...README_CARD_BITS]);
    expect(Image).toEqual(expect.any(Function));
    expect(Heatmap).toEqual(expect.any(Function));
    expect(Board).toEqual(expect.any(Function));
    expect(Icon).toEqual(expect.any(Function));
    expect(Grid).toEqual(expect.any(Function));
    expect(List).toEqual(expect.any(Function));
    expect(Time).toEqual(expect.any(Function));
  });

  it("does not export Cover or overlay primitives", () => {
    for (const name of REFUSED) {
      expect(BIT_EXPORTS).not.toContain(name);
      expect(name in bits).toBe(false);
    }
  });

  it("fromJsx of Theme/Frame/Text does not need react-dom or document", async () => {
    expect(globalThis.document).toBeUndefined();
    const node = await fromJsx(
      createElement(
        Theme,
        { theme: "dark" },
        createElement(Frame, null, createElement(Text, null, "profile-bits")),
      ),
    );
    expect(node.type === "container" || node.type === "text").toBe(true);
  });

  it("fromJsx of barrel README-card bits does not need react-dom or document", async () => {
    expect(globalThis.document).toBeUndefined();
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const image = await fromJsx(
      createElement(
        Theme,
        { theme: "dark" },
        createElement(Image, { src: "https://example.com/album.png" }),
      ),
    );
    expect(image.type === "container" || image.type === "image").toBe(true);

    const heatmap = (await fromJsx(
      createElement(
        Theme,
        { theme: "dark" },
        createElement(Heatmap, {
          weeks: [{ days: [{ count: 1 }, { count: 0 }] }],
        }),
      ),
    )) as TakumiNode;
    expect(heatmap.type === "container" || heatmap.type === "text").toBe(true);

    const board = (await fromJsx(
      createElement(Theme, { theme: "dark" }, createElement(Board, null)),
    )) as TakumiNode;
    expect(board.type === "container" || board.type === "text").toBe(true);

    const icon = (await fromJsx(
      createElement(Theme, { theme: "dark" }, createElement(Icon, null)),
    )) as TakumiNode;
    expect(icon.type === "container" || icon.type === "text").toBe(true);
    expect(collectTexts(icon)).toContain("\u25A0");

    const grid = (await fromJsx(
      createElement(
        Theme,
        { theme: "dark" },
        createElement(
          Grid,
          { columns: 2 },
          createElement(Text, null, "cell-a"),
          createElement(Text, null, "cell-b"),
        ),
      ),
    )) as TakumiNode;
    expect(collectTexts(grid)).toEqual(
      expect.arrayContaining(["cell-a", "cell-b"]),
    );

    const list = (await fromJsx(
      createElement(
        Theme,
        { theme: "dark" },
        createElement(List, {
          items: [{ title: "Track", meta: "Artist" }],
        }),
      ),
    )) as TakumiNode;
    expect(collectTexts(list)).toEqual(
      expect.arrayContaining(["Track", "Artist"]),
    );

    const time = (await fromJsx(
      createElement(
        Theme,
        { theme: "dark" },
        createElement(Time, { value: "2026-08-16T11:00:00.000Z" }),
      ),
    )) as TakumiNode;
    expect(collectTexts(time)).toContain("2026-08-16 11:00");

    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("fromJsx of Theme wrapping children Chip still works", async () => {
    expect(globalThis.document).toBeUndefined();
    const node = (await fromJsx(
      createElement(
        Theme,
        { theme: "dark" },
        createElement(Chip, null, "chip-child"),
      ),
    )) as TakumiNode;
    expect(node.type === "container" || node.type === "text").toBe(true);
    expect(collectTexts(node)).toContain("chip-child");
    const chip = findNode(
      node,
      (candidate) => candidate.style?.borderRadius === 999,
    );
    expect(chip).toBeDefined();
    expect(chip?.style).toMatchObject({
      color: DARK_THEME.text,
      backgroundColor: DARK_THEME.card,
      borderColor: DARK_THEME.border,
      borderWidth: 1,
      borderRadius: 999,
      fontFamily: DARK_THEME.font,
      fontSize: 11,
      paddingLeft: 8,
      paddingRight: 8,
      paddingTop: 2,
      paddingBottom: 2,
    });
    expect(chip?.style?.overflow).not.toBe("hidden");
  });

  it("fromJsx of split Chip with label/message/messageColor works", async () => {
    expect(globalThis.document).toBeUndefined();
    const node = (await fromJsx(
      createElement(
        Theme,
        { theme: "dark" },
        createElement(Chip, {
          label: "npm",
          message: "1.2.3",
          messageColor: "#4c1",
        }),
      ),
    )) as TakumiNode;
    expect(node.type === "container" || node.type === "text").toBe(true);
    expect(collectTexts(node)).toEqual(
      expect.arrayContaining(["npm", "1.2.3"]),
    );
    const pill = findNode(
      node,
      (candidate) =>
        candidate.style?.borderRadius === 999 &&
        candidate.style?.overflow === "hidden",
    );
    expect(pill).toBeDefined();
    expect(pill?.type).toBe("container");
    const labelHalf = findNode(node, (candidate) => candidate.text === "npm");
    const messageHalf = findNode(
      node,
      (candidate) => candidate.text === "1.2.3",
    );
    expect(labelHalf?.style).toMatchObject({
      color: DARK_THEME.muted,
      backgroundColor: DARK_THEME.card,
    });
    expect(messageHalf?.style).toMatchObject({
      color: readableInk("#4c1"),
      backgroundColor: "#4c1",
    });
  });

  it("does not force white ink on Primer dark accent", async () => {
    expect(globalThis.document).toBeUndefined();
    const node = (await fromJsx(
      createElement(
        Theme,
        { theme: "dark" },
        createElement(Chip, {
          label: "npm",
          message: "ok",
        }),
      ),
    )) as TakumiNode;
    const messageHalf = findNode(node, (candidate) => candidate.text === "ok");
    const fill = DARK_THEME.accent;
    expect(messageHalf?.style).toMatchObject({
      color: readableInk(fill),
      backgroundColor: fill,
    });
    expect(messageHalf?.style?.color).not.toBe("#ffffff");
  });

  it("keeps the more readable ink on a light message fill", async () => {
    expect(globalThis.document).toBeUndefined();
    const fill = "#ffff00";
    const node = (await fromJsx(
      createElement(
        Theme,
        { theme: "dark" },
        createElement(Chip, {
          label: "ci",
          message: "passing",
          messageColor: fill,
        }),
      ),
    )) as TakumiNode;
    const messageHalf = findNode(
      node,
      (candidate) => candidate.text === "passing",
    );
    expect(messageHalf?.style).toMatchObject({
      color: readableInk(fill),
      backgroundColor: fill,
    });
    expect(messageHalf?.style?.color).toBe("#000000");
  });

  it("keeps white ink on Primer light accent when white is more readable", async () => {
    expect(globalThis.document).toBeUndefined();
    const node = (await fromJsx(
      createElement(
        Theme,
        { theme: "light" },
        createElement(Chip, {
          label: "npm",
          message: "ok",
        }),
      ),
    )) as TakumiNode;
    const messageHalf = findNode(node, (candidate) => candidate.text === "ok");
    const fill = LIGHT_THEME.accent;
    expect(messageHalf?.style).toMatchObject({
      color: readableInk(fill),
      backgroundColor: fill,
    });
    expect(messageHalf?.style?.color).toBe("#ffffff");
  });
});
