import type { RssClient, RssFeedDump } from "@profile-bits/integrations";
import { renderSvg } from "@profile-bits/renderer";
import type { ThemePalette } from "@profile-bits/themes";
import { type FeedItem, feedTemplate, readFeedItem } from "./template.js";

export type RssFeedClient = RssClient;

/** Cached dump or leftover-triple items. Limit is widget-side. */
export type FeedReaderSource = RssFeedDump | readonly FeedItem[];

function isFeedDump(source: FeedReaderSource): source is RssFeedDump {
  return !Array.isArray(source);
}

export function sliceFeedItems(
  dumpOrItems: FeedReaderSource,
  limit: number,
): readonly FeedItem[] {
  const items = isFeedDump(dumpOrItems) ? dumpOrItems.items : dumpOrItems;
  return items.slice(0, limit).map(readFeedItem);
}

export async function renderFeedSvg(input: {
  items: FeedReaderSource;
  limit: number;
  theme?: ThemePalette;
}): Promise<string> {
  return renderSvg(
    feedTemplate(sliceFeedItems(input.items, input.limit), input.theme),
  );
}

/** Consume a cached rss dump. The widget performs no HTTP. */
export async function renderFeedFromClient(
  client: RssClient,
  input: { url: string; limit: number; theme?: ThemePalette },
): Promise<string> {
  const dump = await client.fetchFeed(input.url);
  return renderFeedSvg({
    items: dump,
    limit: input.limit,
    ...(input.theme !== undefined ? { theme: input.theme } : {}),
  });
}

export {
  type FeedItem,
  feedLines,
  feedTemplate,
  NO_FEED_ITEMS,
  readFeedItem,
} from "./template.js";
