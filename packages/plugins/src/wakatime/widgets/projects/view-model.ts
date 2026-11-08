import type { WakatimeStatsData } from "@profile-bits/integrations";
import { toSliceViewModel } from "../../slice.js";

export function toProjectsViewModel(dump: WakatimeStatsData, limit?: number) {
  return toSliceViewModel(dump, "projects", limit);
}
