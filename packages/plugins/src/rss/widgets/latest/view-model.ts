import type { RssFeedDump } from "@profile-bits/integrations";

/** Leftover triple plus optional dump `updated` for Time. */
export type LatestReaderItem = {
  readonly title: string;
  readonly url: string;
  readonly published_at: string | null;
  readonly updated?: string | null;
};

export type LatestReaderSource = RssFeedDump | readonly LatestReaderItem[];

export type LatestItem = {
  readonly title: string;
  readonly url: string;
  readonly at: string | null;
};

function isFeedDump(source: LatestReaderSource): source is RssFeedDump {
  return !Array.isArray(source);
}

function nonEmpty(value: string | null | undefined): string | null {
  if (value == null || value === "") {
    return null;
  }
  return value;
}

/** Time value: dump `updated` when present, otherwise leftover `published_at`. */
export function latestAt(item: LatestReaderItem): string | null {
  return nonEmpty(item.updated) ?? nonEmpty(item.published_at);
}

function latestInstant(item: LatestReaderItem): number {
  const raw = latestAt(item);
  if (raw == null) {
    return Number.NEGATIVE_INFINITY;
  }
  const time = Date.parse(raw);
  return Number.isNaN(time) ? Number.NEGATIVE_INFINITY : time;
}

export function readLatestItem(item: LatestReaderItem): LatestItem {
  return Object.freeze({
    title: item.title,
    url: item.url,
    at: latestAt(item),
  });
}

function compareLatest(
  left: LatestReaderItem,
  right: LatestReaderItem,
): number {
  return latestInstant(right) - latestInstant(left);
}

/** Recency order then `limit`. Does not mutate the dump. */
export function sliceLatestItems(
  dumpOrItems: LatestReaderSource,
  limit: number,
): readonly LatestItem[] {
  const items: readonly LatestReaderItem[] = isFeedDump(dumpOrItems)
    ? dumpOrItems.items
    : dumpOrItems;
  return items.toSorted(compareLatest).slice(0, limit).map(readLatestItem);
}
