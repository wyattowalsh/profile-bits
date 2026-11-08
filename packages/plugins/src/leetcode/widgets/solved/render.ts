import {
  assertTakumiTree,
  fromJsx,
  renderSvg,
  type WidgetTheme,
} from "@profile-bits/renderer";
import { createElement } from "react";
import { solvedViewModel } from "./view-model.js";
import { SolvedWidget } from "./widget.js";

export async function renderSolvedSvg(input: {
  payload: unknown;
  theme?: WidgetTheme;
}): Promise<string> {
  const model = solvedViewModel(input.payload);
  const node = await fromJsx(
    createElement(SolvedWidget, { ...model, theme: input.theme }),
  );
  assertTakumiTree(node);
  return renderSvg(node);
}
