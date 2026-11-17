import type { CodingIncludeToken } from "@profile-bits/core";
import type { CodingPayload } from "@profile-bits/integrations";
import {
  assertTakumiTree,
  fromJsx,
  renderSvg,
  type WidgetTheme,
} from "@profile-bits/renderer";
import { createElement } from "react";
import { toCodingViewModel } from "./view-model.js";
import { CodingWidget } from "./widget.js";

export async function renderCodingSvg(input: {
  payload: CodingPayload;
  include: readonly CodingIncludeToken[];
  limit: number;
  theme?: WidgetTheme;
}): Promise<string> {
  const model = toCodingViewModel(input.payload, input.include, input.limit);
  const node = await fromJsx(
    createElement(CodingWidget, {
      model,
      ...(input.theme === undefined ? {} : { theme: input.theme }),
    }),
  );
  assertTakumiTree(node);
  return renderSvg(node);
}
