import { describe, expect, it } from "vitest";
import { MarkdownParseFailError } from "./parse-fail.js";
import { markdownToHtml } from "./processor.js";

describe("markdownToHtml", () => {
  it("renders a GFM table", async () => {
    const html = await markdownToHtml("| a | b |\n| - | - |\n| 1 | 2 |\n");
    expect(html).toContain("<table>");
    expect(html).toContain("<th>a</th>");
    expect(html).toContain("<td>1</td>");
  });

  it("strikethrough uses two tildes only (singleTilde false)", async () => {
    const html = await markdownToHtml("~~gone~~ and ~keep~\n");
    expect(html).toContain("<del>gone</del>");
    expect(html).not.toContain("<del>keep</del>");
    expect(html).toContain("~keep~");
  });

  it("renders GFM markdown as HTML tags", async () => {
    const html = await markdownToHtml(
      "# Title\n\n- [x] done\n- [ ] todo\n\nhttps://example.com\n",
    );
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain('<ul class="contains-task-list">');
    expect(html).toContain('<input type="checkbox" checked disabled>');
    expect(html).toContain(
      '<a href="https://example.com">https://example.com</a>',
    );
  });

  it("allows the word mermaid outside fences", async () => {
    const html = await markdownToHtml("A paragraph with the word mermaid.\n");
    expect(html).toContain("mermaid");
  });

  it("fails mermaid fences", async () => {
    await expect(
      markdownToHtml("```mermaid\ngraph TD\nA-->B\n```\n"),
    ).rejects.toThrow(MarkdownParseFailError);
    await expect(
      markdownToHtml("```mermaidjs\nflowchart LR\nA-->B\n```\n"),
    ).rejects.toThrow(MarkdownParseFailError);
  });
});
