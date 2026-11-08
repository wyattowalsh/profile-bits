import type { TopOptions } from "@profile-bits/core";
import {
  assertTakumiTree,
  fromJsx,
  renderSvg,
  type WidgetTheme,
} from "@profile-bits/renderer";
import { createElement } from "react";
import { topViewModel } from "./view-model.js";
import { TopWidget } from "./widget.js";

export async function renderTopSvg(input: {
  payload: unknown;
  options?: Partial<TopOptions>;
  theme?: WidgetTheme;
}): Promise<string> {
  const model = topViewModel(input.payload, input.options);
  const node = await fromJsx(
    createElement(TopWidget, { ...model, theme: input.theme }),
  );
  assertTakumiTree(node);
  return renderSvg(node);
}
