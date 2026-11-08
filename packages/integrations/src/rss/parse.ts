import { parseFeed } from "@rowanmanning/feed-parser";

export class RssParseError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "RssParseError";
  }
}

export type RssPerson = {
  readonly name: string | null;
  readonly email: string | null;
  readonly url: string | null;
};

export type RssCategory = {
  readonly term: string;
  readonly label: string | null;
  readonly url: string | null;
};

export type RssEnclosure = {
  readonly url: string;
  readonly type: string | null;
  readonly length: number | null;
};

export type RssFeedImage = {
  readonly title: string | null;
  readonly url: string;
};

/** Channel metadata on the cached dump. */
export type RssFeed = {
  readonly title: string;
  readonly link: string;
  readonly description: string;
  readonly updated: string | null;
  readonly authors: readonly RssPerson[];
  readonly categories: readonly RssCategory[];
  readonly image: RssFeedImage | null;
};

/**
 * Dump item. Leftover `{ title, url, published_at }` is the feed widget
 * reader; extra fields stay in cache.
 */
export type RssFeedItem = {
  readonly id: string;
  readonly title: string;
  readonly url: string;
  readonly published_at: string | null;
  readonly updated: string | null;
  readonly content: string | null;
  readonly summary: string | null;
  readonly authors: readonly RssPerson[];
  readonly categories: readonly RssCategory[];
  readonly enclosures: readonly RssEnclosure[];
};

/** Frozen feed+item dump. Widget slices `items` to `limit`. */
export type RssFeedDump = {
  readonly feed: RssFeed;
  readonly items: readonly RssFeedItem[];
};

/**
 * Parse an already-fetched XML string. Never fetches.
 * `limit` / `maxItems` slicing is caller-side.
 * MUST NOT call a parser HTTP helper.
 */
export function parseRssXml(xml: string): RssFeedDump {
  let parsed: ReturnType<typeof parseFeed>;
  try {
    parsed = parseFeed(xml);
  } catch (cause: unknown) {
    throw new RssParseError("invalid feed", { cause });
  }
  const items = parsed.items.map((item) =>
    Object.freeze({
      id: item.id ?? "",
      title: sanitizeTitle(item.title),
      url: item.url ?? "",
      published_at: toIso(item.published ?? item.updated),
      updated: toIso(item.updated),
      content: optionalText(item.content),
      summary: optionalText(item.description),
      authors: freezePersons(item.authors),
      categories: freezeCategories(item.categories),
      enclosures: freezeEnclosures(item.media),
    }),
  );
  return Object.freeze({
    feed: Object.freeze({
      title: sanitizeTitle(parsed.title),
      link: parsed.url ?? "",
      description: parsed.description ?? "",
      updated: toIso(parsed.updated),
      authors: freezePersons(parsed.authors),
      categories: freezeCategories(parsed.categories),
      image: freezeImage(parsed.image),
    }),
    items: Object.freeze(items),
  });
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

function optionalText(value: string | null): string | null {
  if (value == null || value === "") {
    return null;
  }
  return value;
}

function toIso(value: Date | null): string | null {
  if (value == null || Number.isNaN(value.getTime())) {
    return null;
  }
  return value.toISOString();
}

function freezePersons(
  authors: readonly {
    name: string | null;
    email: string | null;
    url: string | null;
  }[],
): readonly RssPerson[] {
  return Object.freeze(
    authors.map((author) =>
      Object.freeze({
        name: author.name,
        email: author.email,
        url: author.url,
      }),
    ),
  );
}

function freezeCategories(
  categories: readonly {
    term: string;
    label: string | null;
    url: string | null;
  }[],
): readonly RssCategory[] {
  return Object.freeze(
    categories.map((category) =>
      Object.freeze({
        term: category.term,
        label: category.label,
        url: category.url,
      }),
    ),
  );
}

function freezeEnclosures(
  media: readonly {
    url: string;
    type: string | null;
    mimeType: string | null;
    length: number | null;
  }[],
): readonly RssEnclosure[] {
  return Object.freeze(
    media.map((entry) =>
      Object.freeze({
        url: entry.url,
        type: entry.mimeType ?? entry.type,
        length: entry.length,
      }),
    ),
  );
}

function freezeImage(
  image: { title: string | null; url: string } | null,
): RssFeedImage | null {
  if (image == null) {
    return null;
  }
  return Object.freeze({
    title: image.title,
    url: image.url,
  });
}
