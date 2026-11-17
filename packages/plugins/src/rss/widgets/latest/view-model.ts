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

/**
 * Sliced items. `now` stays null unless a caller injects a real clock.
 * The newest item is not "now": that would label an old post "just now".
 */
export type LatestViewModel = {
  readonly items: readonly LatestItem[];
  readonly now: string | null;
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

function parsedInstant(value: string | null | undefined): number | null {
  if (value == null || value === "") {
    return null;
  }
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : time;
}

function latestInstant(item: LatestReaderItem): number {
  return parsedInstant(latestAt(item)) ?? Number.NEGATIVE_INFINITY;
}

/**
 * Newest parseable `at` in this card.
 * Relative age is versus that item. No wall clock.
 */
export function latestNow(items: readonly LatestItem[]): string | null {
  let bestAt: string | null = null;
  let bestTime = Number.NEGATIVE_INFINITY;
  for (const item of items) {
    const time = parsedInstant(item.at);
    if (time == null || time <= bestTime) {
      continue;
    }
    bestAt = item.at;
    bestTime = time;
  }
  return bestAt;
}

/** Injected Relative clock when both stamps parse. Raw strings stay on Time. */
export function latestRelativeNow(
  at: string | null,
  now: string | null,
): string | null {
  if (now == null || parsedInstant(at) == null || parsedInstant(now) == null) {
    return null;
  }
  return now;
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

/** Recency slice. Relative stays off until a caller passes a real `now`. */
export function latestViewModel(
  dumpOrItems: LatestReaderSource,
  limit: number,
): LatestViewModel {
  const items = sliceLatestItems(dumpOrItems, limit);
  return Object.freeze({
    items,
    now: null,
  });
}
