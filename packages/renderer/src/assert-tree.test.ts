import { describe, expect, it } from "vitest";
import { assertTakumiTree, TakumiTreeError } from "./assert-tree.js";

const EMPTY_COPY = [
  "No language data",
  "No data",
  "No coding data",
  "No feed items",
  "0",
] as const;

function card(copy: string) {
  return {
    type: "container" as const,
    children: [
      {
        type: "container" as const,
        children: [{ type: "text" as const, text: copy }],
      },
    ],
  };
}

describe("assertTakumiTree", () => {
  it.each(EMPTY_COPY)("accepts empty-state copy %j", (copy) => {
    expect(() => assertTakumiTree(card(copy))).not.toThrow();
  });

  it("accepts nested text under Theme/Frame-shaped containers", () => {
    expect(() =>
      assertTakumiTree({
        type: "container",
        children: [
          { type: "text", text: "hi" },
          { type: "image", src: "data:image/png;base64,xx" },
        ],
      }),
    ).not.toThrow();
  });

  it("accepts image bytes and RgbaImage src", () => {
    expect(() =>
      assertTakumiTree({
        type: "image",
        src: new Uint8Array([1, 2, 3, 4]),
      }),
    ).not.toThrow();
    expect(() =>
      assertTakumiTree({
        type: "image",
        src: {
          width: 1,
          height: 1,
          data: new Uint8Array(4),
        },
      }),
    ).not.toThrow();
  });

  it("rejects empty, whitespace-only, and geometry-only trees", () => {
    expect(() => assertTakumiTree({ type: "container", children: [] })).toThrow(
      TakumiTreeError,
    );
    expect(() => assertTakumiTree({ type: "text", text: "   " })).toThrow(
      /empty Takumi tree/,
    );
    expect(() =>
      assertTakumiTree({
        type: "container",
        children: [{ type: "container", children: [] }],
      }),
    ).toThrow(TakumiTreeError);
    expect(() => assertTakumiTree({ type: "image", src: "" })).toThrow(
      TakumiTreeError,
    );
  });
});
