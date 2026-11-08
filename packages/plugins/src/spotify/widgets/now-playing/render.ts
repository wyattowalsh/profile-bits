import {
  assertTakumiTree,
  fromJsx,
  renderSvg,
  type WidgetTheme,
} from "@profile-bits/renderer";
import { createElement } from "react";
import { nowPlayingViewModel } from "./view-model.js";
import { NowPlayingWidget } from "./widget.js";

export async function renderNowPlayingSvg(input: {
  payload: unknown;
  theme?: WidgetTheme;
}): Promise<string> {
  const model = nowPlayingViewModel(input.payload);
  const node = await fromJsx(
    createElement(NowPlayingWidget, { ...model, theme: input.theme }),
  );
  assertTakumiTree(node);
  return renderSvg(node);
}
