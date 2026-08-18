import type { LanguagesOptions } from "@profile-bits/core";
import {
  assertTakumiTree,
  fromJsx,
  renderSvg,
  type WidgetTheme,
} from "@profile-bits/renderer";
import { createElement } from "react";
import { languagesViewModel } from "./view-model.js";
import { LanguagesWidget } from "./widget.js";

export async function renderLanguagesSvg(input: {
  payload: unknown;
  options?: Partial<LanguagesOptions>;
  theme?: WidgetTheme;
}): Promise<string> {
  const model = languagesViewModel(input.payload, input.options ?? {});
  const node = await fromJsx(
    createElement(LanguagesWidget, { ...model, theme: input.theme }),
  );
  assertTakumiTree(node);
  return renderSvg(node);
}
