import { CODING_LIMIT_DEFAULT } from "@profile-bits/core";
import type {
  WakatimeSliceItem,
  WakatimeStatsData,
} from "@profile-bits/integrations";

export const WAKATIME_SLICE_WIDGET_IDS = [
  "editors",
  "projects",
  "os",
  "langs",
] as const;

export type WakatimeSliceWidgetId = (typeof WAKATIME_SLICE_WIDGET_IDS)[number];

const SLICE_SOURCE = {
  editors: "editors",
  projects: "projects",
  os: "operating_systems",
  langs: "languages",
} as const satisfies Record<WakatimeSliceWidgetId, keyof WakatimeStatsData>;

export const SLICE_TITLE = {
  editors: "Editors",
  projects: "Projects",
  os: "OS",
  langs: "Languages",
} as const satisfies Record<WakatimeSliceWidgetId, string>;

export const SLICE_EMPTY_TEXT = {
  editors: "No editor data",
  projects: "No project data",
  os: "No OS data",
  langs: "No language data",
} as const satisfies Record<WakatimeSliceWidgetId, string>;

export type SliceViewRow = {
  name: string;
  totalSeconds: number;
  percent: number;
  text?: string;
};

export type SliceViewModel = {
  id: WakatimeSliceWidgetId;
  title: string;
  empty: boolean;
  emptyText: string;
  rows: SliceViewRow[];
};

function rowPercent(item: WakatimeSliceItem, sliceTotal: number): number {
  if (item.percent !== undefined) {
    return item.percent;
  }
  if (sliceTotal <= 0) {
    return 0;
  }
  return Math.round((item.total_seconds / sliceTotal) * 1000) / 10;
}

function toRow(item: WakatimeSliceItem, sliceTotal: number): SliceViewRow {
  const row: SliceViewRow = {
    name: item.name,
    totalSeconds: item.total_seconds,
    percent: rowPercent(item, sliceTotal),
  };
  if (item.text !== undefined) {
    row.text = item.text;
  }
  return row;
}

export function sliceLimit(limit: number | undefined): number {
  return limit ?? CODING_LIMIT_DEFAULT;
}

export function toSliceViewModel(
  dump: WakatimeStatsData,
  id: WakatimeSliceWidgetId,
  limit?: number,
): SliceViewModel {
  const cap = sliceLimit(limit);
  const source = dump[SLICE_SOURCE[id]];
  const title = SLICE_TITLE[id];
  const emptyText = SLICE_EMPTY_TEXT[id];
  if (source === undefined) {
    return { id, title, empty: true, emptyText, rows: [] };
  }
  const sliceTotal = source.reduce((sum, item) => sum + item.total_seconds, 0);
  const rows = [...source]
    .sort((left, right) => right.total_seconds - left.total_seconds)
    .slice(0, cap)
    .map((item) => toRow(item, sliceTotal));
  const empty = rows.length === 0;
  return {
    id,
    title,
    empty,
    emptyText,
    rows: empty ? [] : rows,
  };
}
