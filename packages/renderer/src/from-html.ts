import type { Node } from "@takumi-rs/helpers";
import { fromHtml as takumiFromHtml } from "@takumi-rs/helpers/html";

/** Convert an HTML string to a Takumi node. No DOM document required. */
export function fromHtml(html: string): Node {
  return takumiFromHtml(html).node;
}
