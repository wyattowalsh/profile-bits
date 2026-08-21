import remarkParse from "remark-parse";
import type { Plugin } from "unified";
import { unified } from "unified";
import { describe, expect, it } from "vitest";
import { remarkGfmPlugin } from "./gfm.js";

describe("remarkGfmPlugin", () => {
  it("names remark-gfm and uses a two-element tuple with singleTilde false", () => {
    expect(remarkGfmPlugin.name).toBe("remark-gfm");
    expect(remarkGfmPlugin.npm).toBe("remark-gfm");
    expect(Array.isArray(remarkGfmPlugin.use)).toBe(true);
    expect(remarkGfmPlugin.use).toHaveLength(2);
    const [, options] = remarkGfmPlugin.use as unknown[];
    expect(options).toEqual({ singleTilde: false });
  });

  it("does not throw on a local unified processor after remark-parse", () => {
    const [plugin, options] = remarkGfmPlugin.use as [
      Plugin,
      { singleTilde: boolean },
    ];
    expect(() => {
      unified().use(remarkParse).use(plugin, options).parse("ok");
    }).not.toThrow();
  });
});
