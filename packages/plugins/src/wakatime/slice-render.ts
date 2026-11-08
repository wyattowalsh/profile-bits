import type { WakatimeStatsData } from "@profile-bits/integrations";
import {
  assertTakumiTree,
  fromJsx,
  renderSvg,
  type WidgetTheme,
} from "@profile-bits/renderer";
import { createElement } from "react";
import { toSliceViewModel, type WakatimeSliceWidgetId } from "./slice.js";
import { SliceWidget } from "./slice-widget.js";

export async function renderSliceSvg(input: {
  id: WakatimeSliceWidgetId;
  payload: WakatimeStatsData;
  limit?: number;
  theme?: WidgetTheme;
}): Promise<string> {
  const model = toSliceViewModel(input.payload, input.id, input.limit);
  const props = {
    title: model.title,
    empty: model.empty,
    emptyText: model.emptyText,
    rows: model.rows,
    ...(input.theme === undefined ? {} : { theme: input.theme }),
  };
  const node = await fromJsx(createElement(SliceWidget, props));
  assertTakumiTree(node);
  return renderSvg(node);
}
