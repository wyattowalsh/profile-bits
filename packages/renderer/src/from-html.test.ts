import { describe, expect, it } from "vitest";
import { fromHtml } from "./from-html.ts";

function collectText(node: unknown): string[] {
  if (!node || typeof node !== "object") {
    return [];
  }

  const record = node as Record<string, unknown>;
  const texts: string[] = [];

  if (typeof record.text === "string") {
    texts.push(record.text);
  }

  if (Array.isArray(record.children)) {
    for (const child of record.children) {
      texts.push(...collectText(child));
    }
  }

  return texts;
}

describe("fromHtml", () => {
  it("converts simple HTML to a Takumi node", () => {
    const node = fromHtml("<p>hello</p>");

    expect(node).toMatchObject({
      type: "text",
      text: "hello",
      tagName: "p",
    });
  });

  it("accepts a leading doctype and html document", () => {
    const node = fromHtml(
      "<!DOCTYPE html><html><body><p>hello</p></body></html>",
    );

    expect(node).toMatchObject({ type: "container", tagName: "html" });
    expect(collectText(node)).toContain("hello");
  });

  it("does not require a DOM document", () => {
    expect(globalThis.document).toBeUndefined();

    const node = fromHtml("<span>ok</span>");

    expect(node).toMatchObject({
      type: "text",
      text: "ok",
      tagName: "span",
    });
  });
});
