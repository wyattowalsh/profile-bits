import type { WakatimeStatsData } from "@profile-bits/integrations";
import { toSliceViewModel } from "../../slice.js";

export function toEditorsViewModel(dump: WakatimeStatsData, limit?: number) {
  return toSliceViewModel(dump, "editors", limit);
}
