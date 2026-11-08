import type { TopReposOptions } from "@profile-bits/core";
import {
  assertTakumiTree,
  fromJsx,
  renderSvg,
  type WidgetTheme,
} from "@profile-bits/renderer";
import { createElement } from "react";
import { topReposViewModel } from "./view-model.js";
import { TopReposWidget } from "./widget.js";

export async function renderTopReposSvg(input: {
  payload: unknown;
  options?: Partial<TopReposOptions>;
  theme?: WidgetTheme;
}): Promise<string> {
  const model = topReposViewModel(input.payload, input.options ?? {});
  const node = await fromJsx(
    createElement(TopReposWidget, {
      items: model.items,
      empty: model.empty,
      ...(input.theme === undefined ? {} : { theme: input.theme }),
    }),
  );
  assertTakumiTree(node);
  return renderSvg(node);
}
