import type { StatsOptions } from "@profile-bits/core";
import {
  assertTakumiTree,
  fromJsx,
  renderSvg,
  type WidgetTheme,
} from "@profile-bits/renderer";
import { createElement } from "react";
import { statsViewModel } from "./view-model.js";
import { StatsWidget } from "./widget.js";

export async function renderStatsSvg(input: {
  payload: unknown;
  options?: Partial<StatsOptions>;
  theme?: WidgetTheme;
  canContributions?: boolean;
}): Promise<string> {
  const model = statsViewModel(
    input.payload,
    input.options ?? {},
    input.canContributions === true,
  );
  const node = await fromJsx(
    createElement(StatsWidget, { ...model, theme: input.theme }),
  );
  assertTakumiTree(node);
  return renderSvg(node);
}
