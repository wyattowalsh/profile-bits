import { DARK_THEME, fromJsx } from "@profile-bits/renderer";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { BIT_EXPORTS, Chip, Frame, Text, Theme } from "./index.js";

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

describe("bits", () => {
  it("exports the v0 index", () => {
    expect(BIT_EXPORTS).toEqual([
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
    ]);
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
      color: "#ffffff",
      backgroundColor: "#4c1",
    });
  });
});
