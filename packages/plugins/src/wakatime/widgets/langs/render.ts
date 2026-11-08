import type { LangsOptions } from "@profile-bits/core";
import type { WakatimeStatsData } from "@profile-bits/integrations";
import type { WidgetTheme } from "@profile-bits/renderer";
import { renderSliceSvg } from "../../slice-render.js";

export async function renderLangsSvg(input: {
  payload: WakatimeStatsData;
  options?: Partial<LangsOptions>;
  theme?: WidgetTheme;
}): Promise<string> {
  return renderSliceSvg({
    id: "langs",
    payload: input.payload,
    ...(input.options?.limit === undefined
      ? {}
      : { limit: input.options.limit }),
    ...(input.theme === undefined ? {} : { theme: input.theme }),
  });
}
