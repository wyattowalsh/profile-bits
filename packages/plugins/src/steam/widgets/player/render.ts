import {
  assertTakumiTree,
  fromJsx,
  renderSvg,
  type WidgetTheme,
} from "@profile-bits/renderer";
import { createElement } from "react";
import { playerViewModel } from "./view-model.js";
import { PlayerWidget } from "./widget.js";

export async function renderPlayerSvg(input: {
  payload: unknown;
  theme?: WidgetTheme;
}): Promise<string> {
  const model = playerViewModel(input.payload);
  const node = await fromJsx(
    createElement(PlayerWidget, { ...model, theme: input.theme }),
  );
  assertTakumiTree(node);
  return renderSvg(node);
}
