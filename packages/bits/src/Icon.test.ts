import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DARK_THEME, fromJsx, LIGHT_THEME } from "@profile-bits/renderer";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { Icon } from "./Icon.js";
import { Theme } from "./Theme.js";

type TakumiNode = {
  type: string;
  text?: string;
  src?: string;
  width?: number;
  height?: number;
  style?: Record<string, unknown>;
  children?: TakumiNode[];
};

const SOURCE = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "Icon.tsx"),
  "utf8",
);

const ICON_SRC = "data:image/png;base64,xx";
const ICON_MARK = "\u25A0";

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

async function renderIcon(
  props: {
    src?: string;
    alt?: string;
    size?: number;
    color?: string;
  } = {},
  theme: "dark" | "light" = "dark",
): Promise<TakumiNode> {
  return (await fromJsx(
    createElement(Theme, { theme }, createElement(Icon, props)),
  )) as TakumiNode;
}

describe("Icon", () => {
  it("is a compact Takumi-safe mark via img or geometric span, not a DOM icon library", () => {
    expect(SOURCE).toContain("export function Icon");
    expect(SOURCE).toContain("<img");
    expect(SOURCE).toContain("<span");
    expect(SOURCE).not.toContain("react-dom");
    expect(SOURCE).not.toContain("useEffect");
    expect(SOURCE).not.toContain("document");
    expect(SOURCE).not.toContain("react-icons");
    expect(SOURCE).not.toContain("lucide");
    expect(SOURCE).not.toContain("@heroicons");
    expect(SOURCE).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(SOURCE).not.toContain("objectFit");
    expect(SOURCE).not.toContain("size / 2");
  });

  it("fromJsx of img Icon is square and compact, not Avatar circle crop", async () => {
    expect(globalThis.document).toBeUndefined();
    const node = await renderIcon({ src: ICON_SRC, alt: "lang" });

    expect(node.type === "container" || node.type === "image").toBe(true);
    const image = findNode(node, (candidate) => candidate.type === "image");
    expect(image).toBeDefined();
    expect(image?.src).toBe(ICON_SRC);
    expect(image?.width).toBe(16);
    expect(image?.height).toBe(16);
    expect(image?.style).toMatchObject({
      width: 16,
      height: 16,
      borderRadius: 3,
    });
    expect(image?.style?.borderRadius).not.toBe(8);
    expect(image?.style?.objectFit).toBeUndefined();
  });

  it("fromJsx of geometric Icon fills a compact square from theme accent", async () => {
    expect(globalThis.document).toBeUndefined();
    const node = await renderIcon();

    expect(collectTexts(node)).toContain(ICON_MARK);
    const mark = findNode(node, (candidate) => candidate.text === ICON_MARK);
    expect(mark).toBeDefined();
    expect(mark?.style).toMatchObject({
      display: "flex",
      width: 16,
      height: 16,
      backgroundColor: DARK_THEME.accent,
      borderRadius: 3,
      color: DARK_THEME.accent,
      fontFamily: DARK_THEME.font,
      fontSize: 16,
      lineHeight: 1,
    });
    expect(mark?.style?.borderRadius).not.toBe(8);
    expect(mark?.style?.boxShadow).toBeUndefined();
  });

  it("reads geometric fill from light theme context", async () => {
    expect(globalThis.document).toBeUndefined();
    const node = await renderIcon({}, "light");
    const mark = findNode(node, (candidate) => candidate.text === ICON_MARK);
    expect(mark?.style?.backgroundColor).toBe(LIGHT_THEME.accent);
    expect(mark?.style?.color).toBe(LIGHT_THEME.accent);
  });

  it("honors color override and size on the geometric mark", async () => {
    const node = await renderIcon({ color: LIGHT_THEME.accent, size: 24 });
    const mark = findNode(node, (candidate) => candidate.text === ICON_MARK);
    expect(mark?.style).toMatchObject({
      width: 24,
      height: 24,
      backgroundColor: LIGHT_THEME.accent,
      color: LIGHT_THEME.accent,
      fontSize: 24,
      borderRadius: 3,
    });
    expect(mark?.style?.borderRadius).not.toBe(12);
  });

  it("treats empty src as geometric, not an empty img", async () => {
    const node = await renderIcon({ src: "" });
    expect(
      findNode(node, (candidate) => candidate.type === "image"),
    ).toBeUndefined();
    expect(collectTexts(node)).toContain(ICON_MARK);
  });
});
