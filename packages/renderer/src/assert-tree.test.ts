import { describe, expect, it } from "vitest";
import { assertTakumiTree, TakumiTreeError } from "./assert-tree.js";

describe("assertTakumiTree", () => {
  it("accepts container/text/image trees", () => {
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

  it("rejects forbidden tags and unknown types", () => {
    expect(() =>
      assertTakumiTree({
        type: "container",
        tagName: "script",
        children: [],
      }),
    ).toThrow(TakumiTreeError);
    expect(() =>
      assertTakumiTree({
        type: "foreignObject",
        children: [],
      } as never),
    ).toThrow(/unknown Node.type/);
  });
});
