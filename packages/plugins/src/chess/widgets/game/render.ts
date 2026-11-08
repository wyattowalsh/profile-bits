import {
  assertTakumiTree,
  fromJsx,
  renderSvg,
  type WidgetTheme,
} from "@profile-bits/renderer";
import { createElement } from "react";
import { gameViewModel } from "./view-model.js";
import { GameWidget } from "./widget.js";

export async function renderGameSvg(input: {
  payload: unknown;
  theme?: WidgetTheme;
}): Promise<string> {
  const model = gameViewModel(input.payload);
  const node = await fromJsx(
    createElement(GameWidget, { ...model, theme: input.theme }),
  );
  assertTakumiTree(node);
  return renderSvg(node);
}
