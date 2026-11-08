import {
  assertTakumiTree,
  fromJsx,
  renderSvg,
  type WidgetTheme,
} from "@profile-bits/renderer";
import { createElement } from "react";
import { heatmapViewModel } from "./view-model.js";
import { HeatmapWidget } from "./widget.js";

export async function renderHeatmapSvg(input: {
  payload: unknown;
  theme?: WidgetTheme;
}): Promise<string> {
  const model = heatmapViewModel(input.payload);
  const node = await fromJsx(
    createElement(HeatmapWidget, { ...model, theme: input.theme }),
  );
  assertTakumiTree(node);
  return renderSvg(node);
}
