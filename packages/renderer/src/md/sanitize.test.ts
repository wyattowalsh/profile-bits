import type rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";
import { describe, expect, it } from "vitest";
import { rehypeSanitizePlugin } from "./sanitize.js";

describe("rehypeSanitizePlugin", () => {
  it("declares name and npm", () => {
    expect(rehypeSanitizePlugin.name).toBe("rehype-sanitize");
    expect(rehypeSanitizePlugin.npm).toBe("rehype-sanitize");
  });

  it("strips script before stringify", () => {
    const processor = unified()
      .use(rehypeSanitizePlugin.use as typeof rehypeSanitize)
      .use(rehypeStringify);
    const html = processor.stringify(
      processor.runSync({
        type: "root",
        children: [
          {
            type: "element",
            tagName: "script",
            properties: {},
            children: [{ type: "text", value: "alert(1)" }],
          },
          {
            type: "element",
            tagName: "p",
            properties: {},
            children: [{ type: "text", value: "ok" }],
          },
        ],
      }),
    );

    expect(html).not.toMatch(/<script\b/i);
    expect(html).not.toContain("alert(1)");
    expect(html).toBe("<p>ok</p>");
  });
});
