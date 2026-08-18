import type { Node } from "@takumi-rs/helpers";
import { CARD_HEIGHT, CARD_WIDTH, getRenderer } from "./fonts.js";

/** Baked still SVG at 480×160 (outlined glyphs/geometry, no CSS/SMIL runtime). */
export async function renderSvg(node: Node): Promise<string> {
  const renderer = await getRenderer();
  return renderer.renderSvg(node, {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    images: [],
  });
}
