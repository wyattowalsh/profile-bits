import type { Node } from "@takumi-rs/helpers";
import { assertTakumiTree } from "./assert-tree.js";
import { CARD_HEIGHT, CARD_WIDTH, getRenderer } from "./fonts.js";
import { assertTakumiSvg, withTakumi } from "./takumi-wrap.js";

/** Baked still SVG at 480×160 (outlined glyphs/geometry, no CSS/SMIL runtime). */
export async function renderSvg(node: Node): Promise<string> {
  return withTakumi(async () => {
    assertTakumiTree(node);
    const renderer = await getRenderer();
    const svg = await renderer.renderSvg(node, {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      images: [],
    });
    assertTakumiSvg(svg);
    return svg;
  });
}
