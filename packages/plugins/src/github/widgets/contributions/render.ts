import type { ContributionsOptions } from "@profile-bits/core";
import {
  assertTakumiTree,
  fromJsx,
  renderSvg,
  type WidgetTheme,
} from "@profile-bits/renderer";
import { createElement } from "react";
import { contributionsViewModel } from "./view-model.js";
import { ContributionsWidget } from "./widget.js";

export async function renderContributionsSvg(input: {
  payload: unknown;
  options?: Partial<ContributionsOptions>;
  theme?: WidgetTheme;
}): Promise<string> {
  const model = contributionsViewModel(input.payload);
  const node = await fromJsx(
    createElement(ContributionsWidget, { ...model, theme: input.theme }),
  );
  assertTakumiTree(node);
  return renderSvg(node);
}
