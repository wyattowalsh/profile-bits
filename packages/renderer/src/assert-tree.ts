import type { Node, RgbaImage } from "@takumi-rs/helpers";

export class TakumiTreeError extends Error {
  override readonly name = "TakumiTreeError";
}

/**
 * Fail if the tree has no drawable: trimmed text or an image `src`
 * (URL string, bytes, or `RgbaImage`). Walks containers recursively.
 * No tag denylist — wrap-and-fail at convert/render instead.
 */
export function assertTakumiTree(node: Node): void {
  if (!isDrawable(node)) {
    throw new TakumiTreeError("empty Takumi tree");
  }
}

function isDrawable(node: Node): boolean {
  if (node.type === "text") {
    return node.text.trim() !== "";
  }
  if (node.type === "image") {
    return imageHasSrc(node.src);
  }
  return (node.children ?? []).some(isDrawable);
}

function imageHasSrc(
  src: string | Uint8Array | ArrayBuffer | RgbaImage,
): boolean {
  if (typeof src === "string") {
    return src.trim() !== "";
  }
  if (src instanceof Uint8Array) {
    return src.byteLength > 0;
  }
  if (src instanceof ArrayBuffer) {
    return src.byteLength > 0;
  }
  return (
    typeof src.width === "number" &&
    src.width > 0 &&
    typeof src.height === "number" &&
    src.height > 0 &&
    byteLength(src.data) > 0
  );
}

function byteLength(data: Uint8Array | ArrayBuffer): number {
  return data.byteLength;
}
