import type { OsOptions } from "@profile-bits/core";
import type { WakatimeStatsData } from "@profile-bits/integrations";
import type { WidgetTheme } from "@profile-bits/renderer";
import { renderSliceSvg } from "../../slice-render.js";

export async function renderOsSvg(input: {
  payload: WakatimeStatsData;
  options?: Partial<OsOptions>;
  theme?: WidgetTheme;
}): Promise<string> {
  return renderSliceSvg({
    id: "os",
    payload: input.payload,
    ...(input.options?.limit === undefined
      ? {}
      : { limit: input.options.limit }),
    ...(input.theme === undefined ? {} : { theme: input.theme }),
  });
}
