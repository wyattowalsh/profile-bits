import type { WakatimeStatsData } from "@profile-bits/integrations";
import { toSliceViewModel } from "../../slice.js";

export function toLangsViewModel(dump: WakatimeStatsData, limit?: number) {
  return toSliceViewModel(dump, "langs", limit);
}
