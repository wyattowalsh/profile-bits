import type { CodingIncludeToken } from "@profile-bits/core";
import type { CodingPayload } from "@profile-bits/integrations";
import { renderSvg } from "@profile-bits/renderer";
import type { ThemePalette } from "@profile-bits/themes";
import { codingTemplate } from "./template.js";
import { toCodingViewModel } from "./view-model.js";

export async function renderCodingSvg(input: {
  payload: CodingPayload;
  include: readonly CodingIncludeToken[];
  limit: number;
  theme?: ThemePalette;
}): Promise<string> {
  const model = toCodingViewModel(input.payload, input.include, input.limit);
  return renderSvg(codingTemplate(model, input.theme));
}
