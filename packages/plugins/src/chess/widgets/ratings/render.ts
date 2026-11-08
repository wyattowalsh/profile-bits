import {
  assertTakumiTree,
  fromJsx,
  renderSvg,
  type WidgetTheme,
} from "@profile-bits/renderer";
import { createElement } from "react";
import { ratingsViewModel } from "./view-model.js";
import { RatingsWidget } from "./widget.js";

export async function renderRatingsSvg(input: {
  payload: unknown;
  theme?: WidgetTheme;
}): Promise<string> {
  const model = ratingsViewModel(input.payload);
  const node = await fromJsx(
    createElement(RatingsWidget, { ...model, theme: input.theme }),
  );
  assertTakumiTree(node);
  return renderSvg(node);
}
