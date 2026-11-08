/**
 * One HTML scrape client per Action / playground / generate preview run.
 * Order: GitHub-host fail → cache/single-flight → SSRF GET → parse → refuse
 * login walls and ToS-hostile/challenge pages → freeze dump.
 */

import {
  publicUrlParts,
  type RunLogEvent,
  type RunLogSink,
  type SkipFailOutcome,
} from "@profile-bits/core";
import { paramsFromUrl, RequestCache } from "../cache.js";
import { isGithubOwnedHost } from "../rss/hosts.js";
import {
  type HtmlParseResult,
  type HtmlScrapeDump,
  parseHtml,
} from "./parse.js";
import { refuseReason } from "./refuse.js";
import {
  type HtmlFetch,
  type HtmlLookup,
  HtmlScrapeSsrfError,
  ssrfGet,
} from "./ssrf.js";

export type { HtmlScrapeDump };

const HTML_MAX_ATTEMPTS = 3;
const HTML_RETRY_BACKOFF_MS = [200, 400, 800] as const;

export type HtmlScrapeErrorCode =
  | "ssrf"
  | "login_wall"
  | "tos_hostile"
  | "http_status"
  | "not_html"
  | "body_too_large"
  | "timeout";

export class HtmlScrapeError extends Error {
  override readonly name = "HtmlScrapeError";
  readonly outcome: SkipFailOutcome;
  readonly status?: number;
  readonly code?: HtmlScrapeErrorCode;

  constructor(
    outcome: SkipFailOutcome,
    message: string,
    status?: number,
    options?: { cause?: unknown; code?: HtmlScrapeErrorCode },
  ) {
    super(message, options);
    this.outcome = outcome;
    this.status = status;
    this.code = options?.code;
  }
}

export type CreateHtmlScrapeClientInput = {
  fetch?: HtmlFetch;
  lookup?: HtmlLookup;
  sleep?: (ms: number) => Promise<void>;
  logger?: RunLogSink;
};

export type HtmlScrapeClient = {
  scrape: (url: string) => Promise<HtmlScrapeDump>;
};

/**
 * Fetch https HTML through SSRF, parse it with the Node HTML parser, and
 * return a frozen typed dump. Widgets and docs call this (or `client.scrape`).
 */
export async function scrapeHtml(
  url: string,
  deps: CreateHtmlScrapeClientInput = {},
): Promise<HtmlScrapeDump> {
  return createHtmlScrapeClient(deps).scrape(url);
}

export function createHtmlScrapeClient(
  input: CreateHtmlScrapeClientInput = {},
): HtmlScrapeClient {
  const fetchImpl = input.fetch;
  const lookup = input.lookup;
  const sleep = input.sleep ?? defaultSleep;
  const logger = input.logger;
  const cache = new RequestCache();

  return {
    async scrape(urlString) {
      const url = parsePageUrl(urlString);
      if (isGithubOwnedHost(url.hostname)) {
        throw new HtmlScrapeError(
          "fail_widget",
          "github-owned host",
          undefined,
          {
            code: "ssrf",
          },
        );
      }
      return cache.get(
        {
          method: "GET",
          url: url.href,
          params: paramsFromUrl(url.href),
          auth: "none",
        },
        () =>
          loadHtml(url.href, {
            fetch: fetchImpl,
            lookup,
            sleep,
            logger,
          }),
      );
    },
  };
}

function parsePageUrl(urlString: string): URL {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch (cause: unknown) {
    throw new HtmlScrapeError("fail_widget", "invalid url", undefined, {
      cause,
      code: "ssrf",
    });
  }
  if (url.username !== "" || url.password !== "") {
    throw new HtmlScrapeError("fail_widget", "url userinfo", undefined, {
      code: "ssrf",
    });
  }
  return url;
}

async function loadHtml(
  url: string,
  deps: {
    fetch?: HtmlFetch;
    lookup?: HtmlLookup;
    sleep: (ms: number) => Promise<void>;
    logger?: RunLogSink;
  },
): Promise<HtmlScrapeDump> {
  let lastStatus: number | undefined;
  for (let attempt = 1; attempt <= HTML_MAX_ATTEMPTS; attempt += 1) {
    const started = Date.now();
    let result: Awaited<ReturnType<typeof ssrfGet>>;
    try {
      result = await ssrfGet(url, { fetch: deps.fetch, lookup: deps.lookup });
    } catch (error: unknown) {
      emitHtmlCall(deps.logger, url, started, { outcome: "fail_widget" });
      throw wrapFailWidget(error);
    }

    lastStatus = result.status;
    if (result.status >= 200 && result.status < 300) {
      try {
        const dump = dumpFromResponse(result);
        emitHtmlCall(deps.logger, url, started, {
          outcome: "ok",
          status: result.status,
        });
        return dump;
      } catch (error: unknown) {
        emitHtmlCall(deps.logger, url, started, {
          outcome: "fail_widget",
          status: result.status,
        });
        throw wrapFailWidget(error, result.status);
      }
    }

    if (result.status === 401 || result.status === 403) {
      const parsed = parseBody(result);
      const reason = refuseReason({
        status: result.status,
        title: parsed.dump.title,
        flags: parsed.flags,
      });
      emitHtmlCall(deps.logger, url, started, {
        outcome: "fail_widget",
        status: result.status,
      });
      throw refuseError(reason ?? "login wall", result.status);
    }

    if (classifyRetry(result.status, attempt)) {
      emitHtmlCall(deps.logger, url, started, {
        outcome: "fail_widget",
        status: result.status,
      });
      await deps.sleep(HTML_RETRY_BACKOFF_MS[attempt - 1] ?? 800);
      continue;
    }

    emitHtmlCall(deps.logger, url, started, {
      outcome: "fail_widget",
      status: result.status,
    });
    throw new HtmlScrapeError(
      "fail_widget",
      `HTML scrape request failed (${result.status})`,
      result.status,
      { code: "http_status" },
    );
  }

  throw new HtmlScrapeError(
    "fail_widget",
    `HTML scrape request failed (${lastStatus ?? "unknown"})`,
    lastStatus,
    { code: "http_status" },
  );
}

function dumpFromResponse(
  result: Awaited<ReturnType<typeof ssrfGet>>,
): HtmlScrapeDump {
  if (!isHtmlBody(result.headers.get("content-type"), result.body)) {
    throw new HtmlScrapeError("fail_widget", "not html", result.status, {
      code: "not_html",
    });
  }
  const parsed = parseBody(result);
  const reason = refuseReason({
    status: result.status,
    title: parsed.dump.title,
    flags: parsed.flags,
  });
  if (reason != null) {
    throw refuseError(reason, result.status);
  }
  return parsed.dump;
}

function parseBody(
  result: Awaited<ReturnType<typeof ssrfGet>>,
): HtmlParseResult {
  return parseHtml({
    html: result.body,
    url: result.url,
    status: result.status,
    contentType: result.headers.get("content-type"),
  });
}

function isHtmlBody(contentType: string | null, body: string): boolean {
  if (contentType == null || contentType.trim() === "") {
    return looksLikeHtml(body);
  }
  const mime = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (mime === "text/html" || mime === "application/xhtml+xml") {
    return true;
  }
  if (mime === "text/plain") {
    return looksLikeHtml(body);
  }
  return false;
}

function looksLikeHtml(body: string): boolean {
  const slice = body.slice(0, 512).trimStart().toLowerCase();
  return (
    slice.startsWith("<!doctype html") ||
    slice.startsWith("<html") ||
    slice.includes("<title")
  );
}

function classifyRetry(status: number, attempt: number): boolean {
  const retryable = status === 429 || (status >= 500 && status <= 599);
  return retryable && attempt < HTML_MAX_ATTEMPTS;
}

function refuseError(reason: string, status?: number): HtmlScrapeError {
  const code: HtmlScrapeErrorCode =
    reason === "tos-hostile target" ? "tos_hostile" : "login_wall";
  return new HtmlScrapeError("fail_widget", reason, status, { code });
}

function emitHtmlCall(
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
    op: "html.get",
    host,
    path,
    duration_ms: Date.now() - started,
    ...fields,
  });
}

function wrapFailWidget(error: unknown, status?: number): HtmlScrapeError {
  if (error instanceof HtmlScrapeError) {
    return error;
  }
  if (error instanceof HtmlScrapeSsrfError) {
    const code: HtmlScrapeErrorCode =
      error.message === "body exceeds 1 MiB"
        ? "body_too_large"
        : error.message === "timeout"
          ? "timeout"
          : "ssrf";
    return new HtmlScrapeError("fail_widget", error.message, status, {
      cause: error,
      code,
    });
  }
  const message =
    error instanceof Error ? error.message : "HTML scrape request failed";
  return new HtmlScrapeError("fail_widget", message, status, { cause: error });
}

async function defaultSleep(ms: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
