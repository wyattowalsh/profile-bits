import {
  publicUrlParts,
  type RunLogEvent,
  type RunLogSink,
  type SkipFailOutcome,
} from "@profile-bits/core";
import { RssRequestCache } from "./cache.js";
import { isGithubOwnedHost } from "./hosts.js";
import {
  classifyRssHttp,
  RSS_MAX_ATTEMPTS,
  rssRetryDelayMs,
} from "./outcomes.js";
import { parseRssXml, type RssFeedDump, RssParseError } from "./parse.js";
import {
  type RssFetch,
  type RssLookup,
  RssSsrfError,
  ssrfGet,
} from "./ssrf.js";

export type {
  RssCategory,
  RssEnclosure,
  RssFeed,
  RssFeedDump,
  RssFeedImage,
  RssFeedItem,
  RssPerson,
} from "./parse.js";
export type { RssFetch, RssLookup };

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
  logger?: RunLogSink;
};

export type RssClient = {
  fetchFeed: (url: string) => Promise<RssFeedDump>;
};

/**
 * One rss client per Action / playground / generate preview run.
 * GitHub-host fail → cache/single-flight → ssrf GET → parse → freeze.
 * Returns the full frozen `{ feed, items }` dump; the widget slices
 * `items` to `limit`.
 */
export function createRssClient(input: CreateRssClientInput = {}): RssClient {
  const fetchImpl = input.fetch;
  const lookup = input.lookup;
  const sleep = input.sleep ?? defaultSleep;
  const logger = input.logger;
  const cache = new RssRequestCache();

  return {
    async fetchFeed(urlString) {
      const url = parseFeedUrl(urlString);
      if (isGithubOwnedHost(url.hostname)) {
        throw new RssClientError("fail_widget", "github-owned host");
      }
      return cache.get({ method: "GET", url: url.href, params: {} }, () =>
        loadFeed(url.href, { fetch: fetchImpl, lookup, sleep, logger }),
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
    logger?: RunLogSink;
  },
): Promise<RssFeedDump> {
  let lastStatus: number | undefined;
  for (let attempt = 1; attempt <= RSS_MAX_ATTEMPTS; attempt += 1) {
    const started = Date.now();
    let result: Awaited<ReturnType<typeof ssrfGet>>;
    try {
      result = await ssrfGet(url, { fetch: deps.fetch, lookup: deps.lookup });
    } catch (error: unknown) {
      emitRssCall(deps.logger, url, started, { outcome: "fail_widget" });
      throw wrapFailWidget(error);
    }

    lastStatus = result.status;
    if (result.status >= 200 && result.status < 300) {
      try {
        const dump = parseRssXml(result.body);
        emitRssCall(deps.logger, url, started, {
          outcome: "ok",
          status: result.status,
        });
        return dump;
      } catch (error: unknown) {
        emitRssCall(deps.logger, url, started, {
          outcome: "fail_widget",
          status: result.status,
        });
        throw wrapFailWidget(error);
      }
    }

    if (classifyRssHttp(result.status, attempt) === "retry") {
      emitRssCall(deps.logger, url, started, {
        outcome: "fail_widget",
        status: result.status,
      });
      await deps.sleep(
        rssRetryDelayMs(attempt - 1, result.headers.get("retry-after")),
      );
      continue;
    }

    emitRssCall(deps.logger, url, started, {
      outcome: "fail_widget",
      status: result.status,
    });
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

function emitRssCall(
  logger: RunLogSink | undefined,
  url: string,
  started: number,
  fields: Pick<RunLogEvent, "outcome" | "status">,
): void {
  if (logger === undefined) {
    return;
  }
  const { host, path } = publicUrlParts(url);
  logger({
    v: 1,
    src: "profile-bits",
    kind: "call",
    pkg: "integrations",
    integration: "rss",
    op: "rest.get",
    host,
    path,
    duration_ms: Date.now() - started,
    ...fields,
  });
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
