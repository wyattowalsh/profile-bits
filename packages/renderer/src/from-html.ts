import type { Node } from "@takumi-rs/helpers";
import { fromHtml as takumiFromHtml } from "@takumi-rs/helpers/html";
import { assertTakumiTree } from "./assert-tree.js";
import { withTakumi } from "./takumi-wrap.js";

/** Convert an HTML string to a Takumi node. No DOM document required. */
export function fromHtml(html: string): Node {
  return withTakumi(() => {
    const node = takumiFromHtml(html).node;
    assertTakumiTree(node);
    return node;
  });
}
