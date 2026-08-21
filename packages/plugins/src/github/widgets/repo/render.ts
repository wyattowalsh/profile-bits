import type { RepoOptions } from "@profile-bits/core";
import {
  assertTakumiTree,
  fromJsx,
  renderSvg,
  type WidgetTheme,
} from "@profile-bits/renderer";
import { createElement } from "react";
import { repoViewModel } from "./view-model.js";
import { RepoWidget } from "./widget.js";

export async function renderRepoSvg(input: {
  payload: unknown;
  options?: Partial<RepoOptions>;
  theme?: WidgetTheme;
}): Promise<string> {
  const model = repoViewModel(input.payload, input.options ?? {});
  const node = await fromJsx(
    createElement(RepoWidget, { ...model, theme: input.theme }),
  );
  assertTakumiTree(node);
  return renderSvg(node);
}
