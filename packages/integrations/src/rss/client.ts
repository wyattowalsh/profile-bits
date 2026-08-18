import type { SkipFailOutcome } from "@profile-bits/core";
import { RssRequestCache } from "./cache.js";
import { isGithubOwnedHost } from "./hosts.js";
import {
  classifyRssHttp,
  RSS_MAX_ATTEMPTS,
  rssRetryDelayMs,
} from "./outcomes.js";
import { parseRssXml, type RssFeedItem, RssParseError } from "./parse.js";
import {
  type RssFetch,
  type RssLookup,
  RssSsrfError,
  ssrfGet,
} from "./ssrf.js";

export type { RssFeedItem, RssFetch, RssLookup };

export class RssClientError extends Error {
  override readonly name = "RssClientError";
  readonly outcome: SkipFailOutcome;
  readonly status?: number;

  constructor(
    outcome: SkipFailOutcome,
    message: string,
    status?: number,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.outcome = outcome;
    this.status = status;
  }
}

export type CreateRssClientInput = {
  fetch?: RssFetch;
  lookup?: RssLookup;
  sleep?: (ms: number) => Promise<void>;
};

export type RssClient = {
  fetchFeed: (url: string) => Promise<readonly RssFeedItem[]>;
};

/**
 * One rss client per Action / playground / generate preview run.
 * GitHub-host fail → cache/single-flight → ssrf GET → parse → freeze.
 * Returns the full frozen list; the widget slices to `limit`.
 */
export function createRssClient(input: CreateRssClientInput = {}): RssClient {
  const fetchImpl = input.fetch;
  const lookup = input.lookup;
  const sleep = input.sleep ?? defaultSleep;
  const cache = new RssRequestCache();

  return {
    async fetchFeed(urlString) {
      const url = parseFeedUrl(urlString);
      if (isGithubOwnedHost(url.hostname)) {
        throw new RssClientError("fail_widget", "github-owned host");
      }
      return cache.get({ method: "GET", url: url.href, params: {} }, () =>
        loadFeed(url.href, { fetch: fetchImpl, lookup, sleep }),
      );
    },
  };
}

function parseFeedUrl(urlString: string): URL {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch (cause: unknown) {
    throw new RssClientError("fail_widget", "invalid url", undefined, {
      cause,
    });
  }
  if (url.username !== "" || url.password !== "") {
    throw new RssClientError("fail_widget", "url userinfo");
  }
  return url;
}

async function loadFeed(
  url: string,
  deps: {
    fetch?: RssFetch;
    lookup?: RssLookup;
    sleep: (ms: number) => Promise<void>;
  },
): Promise<readonly RssFeedItem[]> {
  let lastStatus: number | undefined;
  for (let attempt = 1; attempt <= RSS_MAX_ATTEMPTS; attempt += 1) {
    let result: Awaited<ReturnType<typeof ssrfGet>>;
    try {
      result = await ssrfGet(url, { fetch: deps.fetch, lookup: deps.lookup });
    } catch (error: unknown) {
      throw wrapFailWidget(error);
    }

    if (result.status >= 200 && result.status < 300) {
      try {
        return parseRssXml(result.body);
      } catch (error: unknown) {
        throw wrapFailWidget(error);
      }
    }

    lastStatus = result.status;
    if (classifyRssHttp(result.status, attempt) === "retry") {
      await deps.sleep(
        rssRetryDelayMs(attempt - 1, result.headers.get("retry-after")),
      );
      continue;
    }

    throw new RssClientError(
      "fail_widget",
      `RSS feed request failed (${result.status})`,
      result.status,
    );
  }

  throw new RssClientError(
    "fail_widget",
    `RSS feed request failed (${lastStatus ?? "unknown"})`,
    lastStatus,
  );
}

function wrapFailWidget(error: unknown): RssClientError {
  if (error instanceof RssClientError) {
    return error;
  }
  if (error instanceof RssSsrfError || error instanceof RssParseError) {
    return new RssClientError("fail_widget", error.message, undefined, {
      cause: error,
    });
  }
  const message =
    error instanceof Error ? error.message : "RSS feed request failed";
  return new RssClientError("fail_widget", message, undefined, {
    cause: error,
  });
}

async function defaultSleep(ms: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
