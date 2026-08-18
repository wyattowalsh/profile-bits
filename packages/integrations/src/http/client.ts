/**
 * Injectable HTTPS JSON client. One instance per run.
 * Order: token → cache/single-flight → ssrf → GET (manual redirect) → hops →
 * size cap → BOM-strip JSON.parse → classifyHttp → backoff.
 * MUST NOT import octokit.
 */

import type { LookupAddress } from "node:dns";
import { promises as dnsPromises } from "node:dns";
import { request as httpsRequest } from "node:https";
import { Readable } from "node:stream";
import {
  classifyHttp,
  HTTP_RESPONSE_MAX_BYTES,
  redactSecrets,
  type SkipFailOutcome,
} from "@profile-bits/core";
import { paramsFromUrl, RequestCache, type RestCacheAuth } from "../cache.js";
import { authorizationFromToken, authorizationHeaderValue } from "./auth.js";
import { assertSafeYamlHeaders } from "./headers.js";
import {
  assertSafeHttpUrl,
  HTTP_MAX_REDIRECTS,
  type HttpLookup,
  type HttpLookupAddress,
  HttpSsrfError,
  resolveValidatedAddresses,
} from "./ssrf.js";

export type { HttpLookup, HttpLookupAddress } from "./ssrf.js";

export const HTTP_USER_AGENT = "profile-bits-http/0";
export const HTTP_ACCEPT = "application/json";
export const HTTP_MAX_ATTEMPTS = 3;
export const HTTP_RETRY_BACKOFF_MS = [200, 400, 800] as const;
export const HTTP_RETRY_AFTER_CAP_MS = 10_000;
export const HTTP_TIMEOUT_MS_DEFAULT = 10_000;

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export class HttpClientError extends Error {
  override readonly name = "HttpClientError";
  readonly outcome: SkipFailOutcome;
  readonly status?: number;

  constructor(
    outcome: SkipFailOutcome,
    message: string,
    status?: number,
    options?: { cause?: unknown },
  ) {
    super(redactSecrets(message), options);
    this.outcome = outcome;
    this.status = status;
  }
}

export type HttpFetchInit = {
  method?: string;
  redirect?: "error" | "follow" | "manual";
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

export type HttpFetchResponse = {
  status: number;
  headers: { get(name: string): string | null };
  body: ReadableStream<Uint8Array> | null;
};

export type HttpFetch = (
  input: string,
  init?: HttpFetchInit,
) => Promise<HttpFetchResponse>;

export type CreateHttpClientInput = {
  fetch?: HttpFetch;
  lookup?: HttpLookup;
  token?: string | null;
  sleep?: (ms: number) => Promise<void>;
};

export type HttpJsonRequest = {
  url: string;
  timeout_ms?: number;
  headers?: Readonly<Record<string, string>>;
};

export type HttpClient = {
  fetchJson: (request: HttpJsonRequest) => Promise<unknown>;
};

export function createHttpClient(
  input: CreateHttpClientInput = {},
): HttpClient {
  const fetchImpl = input.fetch;
  const lookup = input.lookup ?? defaultHttpLookup;
  const sleep = input.sleep ?? defaultSleep;
  const token = input.token;
  const cache = new RequestCache();
  const authorization = authorizationFromToken(token);
  const auth: RestCacheAuth =
    authorization.kind === "header" ? "bearer" : "none";

  return {
    async fetchJson(request) {
      try {
        if (authorization.kind === "missing") {
          throw new HttpClientError("fail_widget", "missing http token");
        }
        assertSafeYamlHeaders(request.headers);
        const url = assertSafeHttpUrl(request.url);
        const timeoutMs = request.timeout_ms ?? HTTP_TIMEOUT_MS_DEFAULT;
        return await cache.get(
          {
            method: "GET",
            url: url.href,
            params: paramsFromUrl(url.href),
            auth,
            headers: request.headers,
          },
          () =>
            loadJson(url.href, {
              fetch: fetchImpl,
              lookup,
              sleep,
              authorization: authorizationHeaderValue(authorization),
              timeoutMs,
              extraHeaders: request.headers,
            }),
        );
      } catch (error: unknown) {
        throw wrapFailWidget(error, authorizationHeaderValue(authorization));
      }
    },
  };
}

export async function defaultHttpLookup(
  hostname: string,
): Promise<LookupAddress[]> {
  return dnsPromises.lookup(hostname, { all: true });
}

async function loadJson(
  url: string,
  deps: {
    fetch?: HttpFetch;
    lookup: HttpLookup;
    sleep: (ms: number) => Promise<void>;
    authorization: string | undefined;
    timeoutMs: number;
    extraHeaders?: Readonly<Record<string, string>>;
  },
): Promise<unknown> {
  let lastStatus: number | undefined;
  for (let attempt = 1; attempt <= HTTP_MAX_ATTEMPTS; attempt += 1) {
    let result: {
      status: number;
      headers: HttpFetchResponse["headers"];
      body: string;
    };
    try {
      result = await httpGet(url, deps);
    } catch (error: unknown) {
      throw wrapFailWidget(error, deps.authorization);
    }

    const classified = classifyHttp({ status: result.status });
    if (classified === "render") {
      try {
        return parseJsonBody(result.body);
      } catch (error: unknown) {
        throw wrapFailWidget(error, deps.authorization);
      }
    }

    lastStatus = result.status;
    if (classified === "fail_after_backoff" && attempt < HTTP_MAX_ATTEMPTS) {
      await deps.sleep(
        httpRetryDelayMs(attempt - 1, result.headers.get("retry-after")),
      );
      continue;
    }

    throw new HttpClientError(
      "fail_widget",
      `HTTP JSON request failed (${result.status})`,
      result.status,
    );
  }

  throw new HttpClientError(
    "fail_widget",
    `HTTP JSON request failed (${lastStatus ?? "unknown"})`,
    lastStatus,
  );
}

async function httpGet(
  urlString: string,
  deps: {
    fetch?: HttpFetch;
    lookup: HttpLookup;
    authorization: string | undefined;
    timeoutMs: number;
    extraHeaders?: Readonly<Record<string, string>>;
  },
): Promise<{
  status: number;
  headers: HttpFetchResponse["headers"];
  body: string;
}> {
  let current = assertSafeHttpUrl(urlString);
  let redirects = 0;
  const headers = requestHeaders(deps.authorization, deps.extraHeaders);

  for (;;) {
    const addresses = await resolveValidatedAddresses(current, deps.lookup);
    const signal = AbortSignal.timeout(deps.timeoutMs);
    const response = await performGet(current, {
      fetch: deps.fetch,
      addresses,
      signal,
      headers,
    });

    if (REDIRECT_STATUSES.has(response.status)) {
      redirects += 1;
      if (redirects > HTTP_MAX_REDIRECTS) {
        throw new HttpSsrfError("too many redirects");
      }
      current = nextRedirectUrl(current, response.headers.get("location"));
      continue;
    }

    return {
      status: response.status,
      headers: response.headers,
      body: await readCappedBody(response),
    };
  }
}

function requestHeaders(
  authorization: string | undefined,
  extra: Readonly<Record<string, string>> | undefined,
): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: HTTP_ACCEPT,
    "User-Agent": HTTP_USER_AGENT,
  };
  if (extra != null) {
    for (const [name, value] of Object.entries(extra)) {
      headers[name] = value;
    }
  }
  if (authorization != null) {
    headers.Authorization = authorization;
  }
  return headers;
}

async function performGet(
  url: URL,
  options: {
    fetch?: HttpFetch;
    addresses: readonly HttpLookupAddress[];
    signal: AbortSignal;
    headers: Record<string, string>;
  },
): Promise<HttpFetchResponse> {
  if (options.fetch != null) {
    return options.fetch(url.href, {
      method: "GET",
      redirect: "manual",
      headers: { ...options.headers },
      signal: options.signal,
    });
  }
  return pinnedHttpsGet(
    url,
    options.addresses,
    options.signal,
    options.headers,
  );
}

function nextRedirectUrl(current: URL, location: string | null): URL {
  if (location == null || location.trim() === "") {
    throw new HttpSsrfError("redirect missing location");
  }
  let next: URL;
  try {
    next = new URL(location, current);
  } catch (cause: unknown) {
    throw new HttpSsrfError("invalid redirect location", { cause });
  }
  if (next.protocol !== "https:") {
    throw new HttpSsrfError("https only");
  }
  return assertSafeHttpUrl(next.href);
}

async function readCappedBody(response: HttpFetchResponse): Promise<string> {
  const lengthRaw = response.headers.get("content-length");
  if (lengthRaw != null && lengthRaw !== "") {
    const length = Number(lengthRaw);
    if (Number.isFinite(length) && length > HTTP_RESPONSE_MAX_BYTES) {
      throw new HttpSsrfError("body exceeds 1 MiB");
    }
  }
  const body = response.body;
  if (body == null) {
    return "";
  }
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (value == null || value.byteLength === 0) {
        continue;
      }
      total += value.byteLength;
      if (total > HTTP_RESPONSE_MAX_BYTES) {
        await reader.cancel();
        throw new HttpSsrfError("body exceeds 1 MiB");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8").decode(bytes);
}

export function parseJsonBody(body: string): unknown {
  const stripped = body.replace(/^\uFEFF/, "");
  try {
    return JSON.parse(stripped) as unknown;
  } catch (cause: unknown) {
    throw new HttpClientError("fail_widget", "invalid json", undefined, {
      cause,
    });
  }
}

export function httpRetryDelayMs(
  attemptIndex: number,
  retryAfterHeader?: string | null,
): number {
  const fromHeader = parseRetryAfterMs(retryAfterHeader);
  if (fromHeader !== undefined) {
    return Math.min(Math.max(0, fromHeader), HTTP_RETRY_AFTER_CAP_MS);
  }
  const cappedIndex = Math.min(
    Math.max(0, attemptIndex),
    HTTP_RETRY_BACKOFF_MS.length - 1,
  );
  return HTTP_RETRY_BACKOFF_MS[cappedIndex] ?? 800;
}

function parseRetryAfterMs(value?: string | null): number | undefined {
  if (value == null) {
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed === "") {
    return undefined;
  }
  if (/^\d+$/u.test(trimmed)) {
    return Number(trimmed) * 1000;
  }
  const timestamp = Date.parse(trimmed);
  if (Number.isNaN(timestamp)) {
    return undefined;
  }
  return timestamp - Date.now();
}

function wrapFailWidget(error: unknown, secret?: string): HttpClientError {
  if (error instanceof HttpClientError) {
    return error;
  }
  const message =
    error instanceof Error ? error.message : "HTTP JSON request failed";
  return new HttpClientError(
    "fail_widget",
    redactSecrets(message, secret == null ? [] : [secret]),
    undefined,
    { cause: error },
  );
}

function pinnedHttpsGet(
  url: URL,
  addresses: readonly HttpLookupAddress[],
  signal: AbortSignal,
  headers: Record<string, string>,
): Promise<HttpFetchResponse> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason ?? new HttpSsrfError("timeout"));
      return;
    }
    const req = httpsRequest(
      url,
      {
        method: "GET",
        servername: url.hostname,
        headers,
        lookup(hostname, options, callback) {
          const all = typeof options === "object" && options.all === true;
          if (all) {
            callback(null, [...addresses] as LookupAddress[]);
            return;
          }
          const family =
            typeof options === "object" ? options.family : undefined;
          const match =
            family === 4 || family === 6
              ? addresses.find((entry) => entry.family === family)
              : addresses[0];
          if (match == null) {
            const error = new Error(`ENOTFOUND ${hostname}`);
            callback(error, "", 4);
            return;
          }
          callback(null, match.address, match.family);
        },
      },
      (res) => {
        resolve({
          status: res.statusCode ?? 0,
          headers: {
            get(name) {
              const raw = res.headers[name.toLowerCase()];
              if (raw == null) {
                return null;
              }
              return Array.isArray(raw) ? raw.join(", ") : raw;
            },
          },
          body: Readable.toWeb(res) as ReadableStream<Uint8Array>,
        });
      },
    );
    const onAbort = (): void => {
      req.destroy(
        signal.reason instanceof Error
          ? signal.reason
          : new HttpSsrfError("timeout"),
      );
    };
    signal.addEventListener("abort", onAbort, { once: true });
    req.on("error", reject);
    req.end();
  });
}

async function defaultSleep(ms: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
