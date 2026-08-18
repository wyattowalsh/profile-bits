import type { CodingIncludeToken } from "@profile-bits/core";
import type {
  CodingPayload,
  WakatimeSliceItem,
} from "@profile-bits/integrations";

export const NO_CODING_DATA = "No coding data";

export type CodingViewRow = {
  name: string;
  totalSeconds: number;
};

export type CodingViewSlice = {
  key: CodingIncludeToken;
  rows: CodingViewRow[];
};

export type CodingViewModel = {
  empty: boolean;
  totalText: string;
  slices: CodingViewSlice[];
};

function toRows(
  items: readonly WakatimeSliceItem[],
  limit: number,
): CodingViewRow[] {
  return items.slice(0, limit).map((item) => ({
    name: item.name,
    totalSeconds: item.total_seconds,
  }));
}

export function toCodingViewModel(
  payload: CodingPayload,
  include: readonly CodingIncludeToken[],
  limit: number,
): CodingViewModel {
  const slices: CodingViewSlice[] = [];
  for (const key of include) {
    const source = payload[key];
    if (source === undefined) {
      continue;
    }
    slices.push({ key, rows: toRows(source, limit) });
  }
  const empty = slices.every((slice) => slice.rows.length === 0);
  return {
    empty,
    totalText: empty ? NO_CODING_DATA : payload.human_readable_total,
    slices: empty ? [] : slices,
  };
}
