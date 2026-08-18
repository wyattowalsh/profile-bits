import { parseFeed } from "@rowanmanning/feed-parser";

export class RssParseError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "RssParseError";
  }
}

export type RssFeedItem = {
  readonly title: string;
  readonly url: string;
  readonly published_at: string | null;
};

/**
 * Parse an already-fetched XML string. Never fetches.
 * `limit` / `maxItems` slicing is caller-side.
 */
export function parseRssXml(xml: string): readonly RssFeedItem[] {
  let feed: ReturnType<typeof parseFeed>;
  try {
    feed = parseFeed(xml);
  } catch (cause: unknown) {
    throw new RssParseError("invalid feed", { cause });
  }
  const items = feed.items.map((item) =>
    Object.freeze({
      title: sanitizeTitle(item.title),
      url: item.url ?? "",
      published_at: toIso(item.published ?? item.updated),
    }),
  );
  return Object.freeze(items);
}

function sanitizeTitle(value: string | null): string {
  if (value == null || value === "") {
    return "";
  }
  return value
    .replace(/<[^>]*>/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

function toIso(value: Date | null): string | null {
  if (value == null || Number.isNaN(value.getTime())) {
    return null;
  }
  return value.toISOString();
}
