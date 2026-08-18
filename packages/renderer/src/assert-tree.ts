import type { Node } from "@takumi-rs/helpers";

const FORBIDDEN_TAGS = new Set([
  "script",
  "iframe",
  "canvas",
  "foreignobject",
  "video",
  "input",
  "textarea",
  "select",
  "object",
  "embed",
]);

const NODE_TYPES = new Set(["container", "text", "image"]);

export class TakumiTreeError extends Error {
  override readonly name = "TakumiTreeError";
}

/** Fail the widget if the Takumi tree contains DOM-only or unknown nodes. */
export function assertTakumiTree(node: Node): void {
  walk(node);
}

function walk(node: Node): void {
  if (!NODE_TYPES.has(node.type)) {
    throw new TakumiTreeError(
      `unknown Node.type: ${(node as { type: string }).type}`,
    );
  }
  const tag = node.tagName?.toLowerCase();
  if (tag !== undefined && FORBIDDEN_TAGS.has(tag)) {
    throw new TakumiTreeError(`forbidden Takumi tag: ${tag}`);
  }
  if (node.type === "container") {
    for (const child of node.children ?? []) {
      walk(child);
    }
  }
}
