export class MarkdownParseFailError extends Error {
  override readonly name = "MarkdownParseFailError";

  constructor(message: string) {
    super(message);
  }
}

const MERMAID_FENCE = /^( {0,3})```(?:mermaid|mermaidjs)(?:\s|$)/m;

export function assertNoMermaidFence(source: string): void {
  if (MERMAID_FENCE.test(source)) {
    throw new MarkdownParseFailError(
      "Action markdown is GFM-only; mermaid fences fail parse",
    );
  }
}
