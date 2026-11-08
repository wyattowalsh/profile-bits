import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fromJsx } from "@profile-bits/renderer";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { Frame } from "./Frame.js";
import { Image } from "./Image.js";
import { Theme } from "./Theme.js";

type TakumiNode = {
  type: string;
  src?: string;
  width?: number;
  height?: number;
  text?: string;
  style?: Record<string, unknown>;
  children?: TakumiNode[];
};

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

const BITS_SRC = dirname(fileURLToPath(import.meta.url));
const SOURCE = readFileSync(join(BITS_SRC, "Image.tsx"), "utf8");
const COVER_SRC = "https://example.com/album.png";

describe("Image", () => {
  it("fromJsx renders rectangular cover art via img without document", async () => {
    expect(globalThis.document).toBeUndefined();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const node = (await fromJsx(
      createElement(
        Theme,
        { theme: "dark" },
        createElement(
          Frame,
          null,
          createElement(Image, { src: COVER_SRC, alt: "album" }),
        ),
      ),
    )) as TakumiNode;

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(node.type === "container" || node.type === "image").toBe(true);
    const image = findNode(node, (candidate) => candidate.type === "image");
    expect(image).toBeDefined();
    expect(image?.src).toBe(COVER_SRC);
    expect(image?.width).toBe(64);
    expect(image?.height).toBe(64);
    expect(image?.style).toMatchObject({
      width: 64,
      height: 64,
      borderRadius: 0,
      objectFit: "cover",
    });
    expect(image?.style?.borderRadius).not.toBe(64 / 2);
    fetchSpy.mockRestore();
  });

  it("accepts independent width and height without Avatar circle crop", async () => {
    expect(globalThis.document).toBeUndefined();
    const node = (await fromJsx(
      createElement(Image, {
        src: COVER_SRC,
        width: 120,
        height: 48,
      }),
    )) as TakumiNode;
    expect(node.type).toBe("image");
    expect(node.src).toBe(COVER_SRC);
    expect(node.width).toBe(120);
    expect(node.height).toBe(48);
    expect(node.style).toMatchObject({
      width: 120,
      height: 48,
      borderRadius: 0,
      objectFit: "cover",
    });
    expect(node.style?.borderRadius).not.toBe(120 / 2);
    expect(node.style?.borderRadius).not.toBe(48 / 2);
  });

  it("is rectangular cover art, not Avatar and not Cover", () => {
    expect(SOURCE).toContain("export function Image");
    expect(SOURCE).toContain("<img");
    expect(SOURCE).toContain("borderRadius: 0");
    expect(SOURCE).toContain('objectFit: "cover"');
    expect(SOURCE).not.toContain("Avatar");
    expect(SOURCE).not.toMatch(/borderRadius:\s*size\s*\/\s*2/);
    expect(SOURCE).not.toContain("Cover");
    expect(existsSync(join(BITS_SRC, "Cover.tsx"))).toBe(false);
  });

  it("stays Takumi-safe: img plus tw/style, no react-dom, document, or HTTP", () => {
    expect(SOURCE).toContain("<img");
    expect(SOURCE).toContain("style={{");
    expect(SOURCE).not.toContain("react-dom");
    expect(SOURCE).not.toContain("next/image");
    expect(SOURCE).not.toContain("useEffect");
    expect(SOURCE).not.toContain("createPortal");
    expect(SOURCE).not.toContain("document");
    expect(SOURCE).not.toMatch(/\bfetch\b/);
    expect(SOURCE).not.toMatch(/<canvas|<svg|<table/i);
  });
});
