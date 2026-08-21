import { type Plugin, unified } from "unified";
import { describe, expect, it } from "vitest";
import { remarkParsePlugin } from "./parse.js";

describe("remarkParsePlugin", () => {
  it("exposes name and npm", () => {
    expect(remarkParsePlugin.name).toBe("remark-parse");
    expect(remarkParsePlugin.npm).toBe("remark-parse");
  });

  it("parses a heading through local unified().use", () => {
    const tree = unified()
      .use(remarkParsePlugin.use as Plugin)
      .parse("# hi");

    expect(tree).toMatchObject({
      type: "root",
      children: [
        {
          type: "heading",
          depth: 1,
          children: [{ type: "text", value: "hi" }],
        },
      ],
    });
  });
});
