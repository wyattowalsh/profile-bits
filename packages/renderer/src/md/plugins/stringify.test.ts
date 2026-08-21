import type rehypeStringify from "rehype-stringify";
import { unified } from "unified";
import { describe, expect, it } from "vitest";
import { rehypeStringifyPlugin } from "./stringify.js";

describe("rehypeStringifyPlugin", () => {
  it("declares name and npm", () => {
    expect(rehypeStringifyPlugin.name).toBe("rehype-stringify");
    expect(rehypeStringifyPlugin.npm).toBe("rehype-stringify");
  });

  it("lets a local unified processor stringify HTML", () => {
    const html = unified()
      .use(rehypeStringifyPlugin.use as typeof rehypeStringify)
      .stringify({
        type: "root",
        children: [
          {
            type: "element",
            tagName: "p",
            properties: {},
            children: [{ type: "text", value: "hi" }],
          },
        ],
      });

    expect(html).toBe("<p>hi</p>");
  });
});
