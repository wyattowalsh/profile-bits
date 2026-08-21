import { describe, expect, it } from "vitest";
import { assertNoMermaidFence, MarkdownParseFailError } from "./parse-fail.js";

describe("assertNoMermaidFence", () => {
  it("allows GFM including fenced text and indented code", () => {
    expect(() =>
      assertNoMermaidFence("# Title\n\n- item\n\n```text\nok\n```\n"),
    ).not.toThrow();
    expect(() =>
      assertNoMermaidFence("A paragraph with the word mermaid.\n"),
    ).not.toThrow();
  });

  it("fails mermaid and mermaidjs fences", () => {
    expect(() =>
      assertNoMermaidFence("```mermaid\ngraph TD\nA-->B\n```\n"),
    ).toThrow(MarkdownParseFailError);
    expect(() =>
      assertNoMermaidFence("```mermaidjs\nflowchart LR\nA-->B\n```\n"),
    ).toThrow(MarkdownParseFailError);
    expect(() =>
      assertNoMermaidFence("   ```mermaid\ngraph TD\n```\n"),
    ).toThrow(MarkdownParseFailError);
  });
});
