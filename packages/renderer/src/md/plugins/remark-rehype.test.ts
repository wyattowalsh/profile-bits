import remarkRehype from "remark-rehype";
import { describe, expect, it } from "vitest";
import { remarkRehypePlugin } from "./remark-rehype.js";

describe("remarkRehypePlugin", () => {
  it("names the remark-rehype package", () => {
    expect(remarkRehypePlugin.name).toBe("remark-rehype");
    expect(remarkRehypePlugin.npm).toBe("remark-rehype");
  });

  it("uses an array with allowDangerousHtml true", () => {
    expect(remarkRehypePlugin.use).toEqual([
      remarkRehype,
      { allowDangerousHtml: true },
    ]);
  });
});
