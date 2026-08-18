/**
 * Docs preview wraps rss integration XML fixtures (Atom/RSS 2.0, empty).
 * parseRssXml(loadFixture(...)) + renderFeedSvg. Zero live feeds.
 * Never the rss HTTP client or fetch. Playground routes stay github-only.
 */

import {
  loadFixture,
  parseRssXml,
  type RssFeedItem,
  type RssFixtureName,
} from "@profile-bits/integrations";
import {
  feedLines,
  NO_FEED_ITEMS,
  renderFeedSvg,
  sliceFeedItems,
} from "@profile-bits/plugins";

export { NO_FEED_ITEMS };

/** Default yaml `plugins.rss.widgets.feed.limit`. */
export const RSS_PREVIEW_LIMIT = 5;

export function loadRssPreviewItems(
  name: RssFixtureName = "atom.xml",
): readonly RssFeedItem[] {
  return parseRssXml(loadFixture(name));
}

export function rssPreviewLines(
  name: RssFixtureName = "atom.xml",
  limit: number = RSS_PREVIEW_LIMIT,
): readonly string[] {
  return feedLines(sliceFeedItems(loadRssPreviewItems(name), limit));
}

export async function renderRssPreviewSvg(input?: {
  fixture?: RssFixtureName;
  limit?: number;
}): Promise<string> {
  const fixture = input?.fixture ?? "atom.xml";
  const limit = input?.limit ?? RSS_PREVIEW_LIMIT;
  return renderFeedSvg({
    items: loadRssPreviewItems(fixture),
    limit,
  });
}
