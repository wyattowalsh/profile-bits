import type { ProjectsOptions } from "@profile-bits/core";
import type { WakatimeStatsData } from "@profile-bits/integrations";
import type { WidgetTheme } from "@profile-bits/renderer";
import { renderSliceSvg } from "../../slice-render.js";

export async function renderProjectsSvg(input: {
  payload: WakatimeStatsData;
  options?: Partial<ProjectsOptions>;
  theme?: WidgetTheme;
}): Promise<string> {
  return renderSliceSvg({
    id: "projects",
    payload: input.payload,
    ...(input.options?.limit === undefined
      ? {}
      : { limit: input.options.limit }),
    ...(input.theme === undefined ? {} : { theme: input.theme }),
  });
}
