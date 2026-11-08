import type { HeatmapWeek } from "@profile-bits/bits";
import { submissionWeeks } from "../select-dump.js";

export const NO_CALENDAR = "No submissions";

export type HeatmapViewModel = {
  empty: boolean;
  title: string;
  weeks: readonly HeatmapWeek[];
};

export function heatmapViewModel(payload: unknown): HeatmapViewModel {
  const weeks = submissionWeeks(payload);
  if (weeks.length === 0) {
    return { empty: true, title: NO_CALENDAR, weeks: [] };
  }
  return { empty: false, title: "", weeks };
}
