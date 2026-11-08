import type { WakatimeStatsData } from "@profile-bits/integrations";
import { toSliceViewModel } from "../../slice.js";

export function toOsViewModel(dump: WakatimeStatsData, limit?: number) {
  return toSliceViewModel(dump, "os", limit);
}
