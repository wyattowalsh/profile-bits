import type { RecentOptions } from "@profile-bits/core";
import {
  assertTakumiTree,
  fromJsx,
  renderSvg,
  type WidgetTheme,
} from "@profile-bits/renderer";
import { createElement } from "react";
import { recentViewModel } from "./view-model.js";
import { RecentWidget } from "./widget.js";

export async function renderRecentSvg(input: {
  payload: unknown;
  options?: Partial<RecentOptions>;
  theme?: WidgetTheme;
}): Promise<string> {
  const model = recentViewModel(input.payload, input.options);
  const node = await fromJsx(
    createElement(RecentWidget, { ...model, theme: input.theme }),
  );
  assertTakumiTree(node);
  return renderSvg(node);
}
