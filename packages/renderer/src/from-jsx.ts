import type { Node, ReactElementLike } from "@takumi-rs/helpers";
import {
  type FromJsxResult,
  fromJsx as takumiFromJsx,
} from "@takumi-rs/helpers/jsx";

export type { FromJsxResult };

/** Convert JSX to a Takumi node plus extracted stylesheets. Server-hook semantics; no DOM. */
export async function fromJsxResult(
  element: ReactElementLike,
): Promise<FromJsxResult> {
  return takumiFromJsx(element);
}

/** Convert a React element / JSX tree to a Takumi node. Server-hook semantics; no DOM. */
export async function fromJsx(element: ReactElementLike): Promise<Node> {
  const { node } = await fromJsxResult(element);
  return node;
}
