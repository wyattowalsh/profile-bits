import type { RssClient } from "@profile-bits/integrations";
import { renderSvg } from "@profile-bits/renderer";
import type { ThemePalette } from "@profile-bits/themes";
import { type FeedItem, feedTemplate } from "./template.js";

export type RssFeedClient = RssClient;

export function sliceFeedItems(
  items: readonly FeedItem[],
  limit: number,
): readonly FeedItem[] {
  return items.slice(0, limit);
}

export async function renderFeedSvg(input: {
  items: readonly FeedItem[];
  limit: number;
  theme?: ThemePalette;
}): Promise<string> {
  return renderSvg(
    feedTemplate(sliceFeedItems(input.items, input.limit), input.theme),
  );
}

/** Consume a cached rss client payload. The widget performs no HTTP. */
export async function renderFeedFromClient(
  client: RssClient,
  input: { url: string; limit: number; theme?: ThemePalette },
): Promise<string> {
  const items = await client.fetchFeed(input.url);
  return renderFeedSvg({ items, limit: input.limit, theme: input.theme });
}

export {
  type FeedItem,
  feedLines,
  feedTemplate,
  NO_FEED_ITEMS,
} from "./template.js";
