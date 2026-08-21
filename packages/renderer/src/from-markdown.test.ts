import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { fromMarkdown } from "./from-markdown.js";
import { ACTION_MD_PLUGINS } from "./md/catalog.js";
import { MarkdownParseFailError } from "./md/parse-fail.js";
import { markdownToHtml } from "./md/processor.js";

const GFM_FIXTURE = "# Title\n\n- one\n- two\n";
const GFM_TABLE = "| a | b |\n| - | - |\n| 1 | 2 |\n";
const GFM_STRIKE = "~~gone~~ and ~keep~\n";

const FROM_MARKDOWN_SOURCE = readFileSync(
  fileURLToPath(new URL("./from-markdown.ts", import.meta.url)),
  "utf8",
);

const INDEX_SOURCE = readFileSync(
  fileURLToPath(new URL("./index.ts", import.meta.url)),
  "utf8",
);

describe("fromMarkdown", () => {
  it("renders a GFM heading and list as SVG without foreignObject", async () => {
    const svg = await fromMarkdown(GFM_FIXTURE);
    expect(svg).toContain("<svg");
    expect(svg).not.toMatch(/<foreignObject[\s>]/i);
  });

  it("renders a GFM table", async () => {
    const html = await markdownToHtml(GFM_TABLE);
    expect(html).toContain("<table>");
    expect(html).toContain("<th>a</th>");
    expect(html).toContain("<td>1</td>");
    const svg = await fromMarkdown(GFM_TABLE);
    expect(svg).toContain("<svg");
    expect(svg).not.toMatch(/<foreignObject[\s>]/i);
  });

  it("strikethrough uses two tildes only (singleTilde false)", async () => {
    const html = await markdownToHtml(GFM_STRIKE);
    expect(html).toContain("<del>gone</del>");
    expect(html).not.toContain("<del>keep</del>");
    expect(html).toContain("~keep~");
    const svg = await fromMarkdown(GFM_STRIKE);
    expect(svg).toContain("<svg");
  });

  it("rejects mermaid fences with MarkdownParseFailError", async () => {
    await expect(
      fromMarkdown("```mermaid\ngraph TD\nA-->B\n```\n"),
    ).rejects.toThrow(MarkdownParseFailError);
    await expect(
      fromMarkdown("```mermaidjs\nflowchart LR\nA-->B\n```\n"),
    ).rejects.toThrow(MarkdownParseFailError);
  });

  it("renders the word mermaid outside fences", async () => {
    const svg = await fromMarkdown("A paragraph with the word mermaid.\n");
    expect(svg).toContain("<svg");
  });

  it("does not include a mermaid plugin in the graph", () => {
    expect(FROM_MARKDOWN_SOURCE).toContain('from "./md/processor.js"');
    expect(FROM_MARKDOWN_SOURCE).toContain("markdownToHtml");
    expect(FROM_MARKDOWN_SOURCE).toContain("fromHtml");
    expect(FROM_MARKDOWN_SOURCE).not.toMatch(/mermaid/i);
    const serialized = JSON.stringify(
      ACTION_MD_PLUGINS.map(({ name, npm }) => ({ name, npm })),
    );
    expect(serialized).not.toContain("mermaid");
    expect(serialized).not.toContain("shiki");
    expect(serialized).not.toContain("katex");
    expect(serialized).not.toContain("@mdx-js");
  });

  it("is not exported from index.ts", () => {
    expect(INDEX_SOURCE).not.toContain("from-markdown");
  });
});
