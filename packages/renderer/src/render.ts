import type { Node } from "@takumi-rs/helpers";
import { CARD_HEIGHT, CARD_WIDTH, getRenderer } from "./fonts.js";

export { CARD_HEIGHT, CARD_WIDTH };

export const STILL_FORMATS = ["png", "jpeg", "webp", "ico"] as const;
export type StillFormat = (typeof STILL_FORMATS)[number];

const STILL_FORMAT_SET = new Set<string>(STILL_FORMATS);

export function isStillFormat(format: string): format is StillFormat {
  return STILL_FORMAT_SET.has(format);
}

/** Raster still: png | jpeg | webp | ico at 480×160. */
export async function render(
  node: Node,
  format: StillFormat,
): Promise<Uint8Array> {
  if (!isStillFormat(format)) {
    throw new TypeError(
      `unsupported still format: ${format} (expected ${STILL_FORMATS.join(" | ")})`,
    );
  }

  const renderer = await getRenderer();
  const bytes = await renderer.render(node, {
    // ICO directory entries are u8; Takumi rejects width/height outside 1..=256.
    // 240×80 is half of 480×160 and keeps the card's 3:1 aspect.
    width: format === "ico" ? 240 : CARD_WIDTH,
    height: format === "ico" ? 80 : CARD_HEIGHT,
    format,
  });

  return bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
}
