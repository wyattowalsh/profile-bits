import type { Node } from "../../packages/renderer/src/index.ts";
import {
  assertTakumiTree,
  getRenderer,
} from "../../packages/renderer/src/index.ts";

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;

export function pngSize(bytes: Uint8Array): { width: number; height: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    width: view.getUint32(16),
    height: view.getUint32(20),
  };
}

export function assertPng(
  bytes: Uint8Array,
  width: number,
  height: number,
): void {
  if (bytes.byteLength < 1024) {
    throw new Error(`png too small: ${bytes.byteLength} bytes`);
  }
  const magicOk = PNG_MAGIC.every((value, index) => bytes[index] === value);
  if (!magicOk) {
    throw new Error("not a PNG");
  }
  const size = pngSize(bytes);
  if (size.width !== width || size.height !== height) {
    throw new Error(
      `png ${size.width}×${size.height}, expected ${width}×${height}`,
    );
  }
}

export function dataPng(bytes: Uint8Array): string {
  const base64 = globalThis.btoa(
    Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""),
  );
  return `data:image/png;base64,${base64}`;
}

/** Custom-size PNG via the shared Geist Renderer. Product `render()` stays 480×160. */
export async function rasterPng(
  node: Node,
  width: number,
  height: number,
): Promise<Uint8Array> {
  assertTakumiTree(node);
  const renderer = await getRenderer();
  const bytes = await renderer.render(node, {
    width,
    height,
    format: "png",
  });
  const out = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  assertPng(out, width, height);
  return out;
}
