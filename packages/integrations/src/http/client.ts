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
import { assertSafeYamlHeaders, buildHttpRequestHeaders } from "./headers.js";
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

export type HttpClientErrorCode =
  | "timeout"
  | "ssrf"
  | "missing_token"
  | "http_status"
  | "invalid_json"
  | "forbidden_header"
  | "body_too_large"
  | "network";

export class HttpClientError extends Error {
  override readonly name = "HttpClientError";
  readonly outcome: SkipFailOutcome;
  readonly status?: number;
  readonly code?: HttpClientErrorCode;
  readonly host?: string;
  readonly attempt?: number;

  constructor(
    outcome: SkipFailOutcome,
    message: string,
    status?: number,
    options?: {
      cause?: unknown;
      code?: HttpClientErrorCode;
      host?: string;
      attempt?: number;
    },
  ) {
    super(redactSecrets(message), { cause: options?.cause });
    this.outcome = outcome;
    this.status = status;
    this.code = options?.code;
    this.host = options?.host;
    this.attempt = options?.attempt;
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
  auth?: "none";
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
        let requestAuth = auth;
        let requestAuthorization = authorizationHeaderValue(authorization);
        if (request.auth === "none") {
          requestAuth = "none";
          requestAuthorization = undefined;
        } else if (authorization.kind === "missing") {
          throw new HttpClientError(
            "fail_widget",
            "missing http token",
            undefined,
            { code: "missing_token" },
          );
        }
        assertSafeYamlHeaders(request.headers);
        const url = assertSafeHttpUrl(request.url);
        const timeoutMs = request.timeout_ms ?? HTTP_TIMEOUT_MS_DEFAULT;
        return await cache.get(
          {
            method: "GET",
            url: url.href,
            params: paramsFromUrl(url.href),
            auth: requestAuth,
            headers: request.headers,
          },
          () =>
            loadJson(url.href, {
              fetch: fetchImpl,
              lookup,
              sleep,
              authorization: requestAuthorization,
              timeoutMs,
              extraHeaders: request.headers,
            }),
        );
      } catch (error: unknown) {
        throw wrapFailWidget(error, authorizationHeaderValue(authorization), {
          host: hostnameOnly(request.url),
        });
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
  const host = hostnameOnly(url);
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
      throw wrapFailWidget(error, deps.authorization, {
        host,
        attempt,
        timeoutMs: deps.timeoutMs,
      });
    }

    const classified = classifyHttp({ status: result.status });
    if (classified === "render") {
      try {
        return parseJsonBody(result.body);
      } catch (error: unknown) {
        throw wrapFailWidget(error, deps.authorization, {
          host,
          attempt,
          timeoutMs: deps.timeoutMs,
        });
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
      httpStatusFailMessage(result.status, host),
      result.status,
      { code: "http_status", host, attempt },
    );
  }

  throw new HttpClientError(
    "fail_widget",
    httpStatusFailMessage(lastStatus, host),
    lastStatus,
    { code: "http_status", host, attempt: HTTP_MAX_ATTEMPTS },
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
  const headers = buildHttpRequestHeaders(
    deps.authorization,
    deps.extraHeaders,
    { accept: HTTP_ACCEPT, userAgent: HTTP_USER_AGENT },
  );
  const signal = AbortSignal.timeout(deps.timeoutMs);

  try {
    for (;;) {
      const addresses = await raceAbort(
        signal,
        resolveValidatedAddresses(current, deps.lookup),
      );
      const response = await performGet(current, {
        fetch: deps.fetch,
        addresses,
        signal,
        headers,
      });

      if (REDIRECT_STATUSES.has(response.status)) {
        await cancelRedirectBody(response);
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
        body: await readCappedBody(response, signal),
      };
    }
  } catch (error: unknown) {
    throw hopLayerError(error);
  }
}

async function raceAbort<T>(signal: AbortSignal, work: Promise<T>): Promise<T> {
  let onAbort: (() => void) | undefined;
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => {
      reject(
        signal.reason instanceof Error
          ? signal.reason
          : new HttpSsrfError("timeout"),
      );
    };
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener("abort", onAbort, { once: true });
  });
  try {
    return await Promise.race([work, aborted]);
  } finally {
    if (onAbort != null) {
      signal.removeEventListener("abort", onAbort);
    }
    void work.then(undefined, () => undefined);
    void aborted.then(undefined, () => undefined);
  }
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

async function cancelRedirectBody(response: HttpFetchResponse): Promise<void> {
  const body = response.body;
  if (body == null) {
    return;
  }
  const nodeDestroy = (body as { destroy?: (error?: Error) => void }).destroy;
  if (typeof body.cancel === "function") {
    await body.cancel();
    return;
  }
  if (typeof nodeDestroy === "function") {
    nodeDestroy.call(body);
  }
}

async function readCappedBody(
  response: HttpFetchResponse,
  signal: AbortSignal,
): Promise<string> {
  const lengthRaw = response.headers.get("content-length");
  if (lengthRaw != null && lengthRaw !== "") {
    const length = Number(lengthRaw);
    if (Number.isFinite(length) && length > HTTP_RESPONSE_MAX_BYTES) {
      throw new HttpSsrfError("body exceeds 1 MiB");
    }
  }
  if (signal.aborted) {
    await cancelRedirectBody(response);
    throw new HttpSsrfError("timeout");
  }
  const body = response.body;
  if (body == null) {
    return "";
  }
  const reader = body.getReader();
  const onAbort = (): void => {
    void reader.cancel().then(undefined, () => undefined);
  };
  signal.addEventListener("abort", onAbort, { once: true });
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    if (signal.aborted) {
      await reader.cancel();
      throw new HttpSsrfError("timeout");
    }
    for (;;) {
      const { done, value } = await reader.read();
      if (signal.aborted) {
        throw new HttpSsrfError("timeout");
      }
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
  } catch (error: unknown) {
    if (error instanceof HttpSsrfError && error.message === "timeout") {
      throw error;
    }
    if (signal.aborted) {
      throw new HttpSsrfError("timeout", { cause: error });
    }
    throw error;
  } finally {
    signal.removeEventListener("abort", onAbort);
    try {
      reader.releaseLock();
    } catch {
      void 0;
    }
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
      code: "invalid_json",
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

function wrapFailWidget(
  error: unknown,
  secret?: string,
  context: {
    host?: string;
    attempt?: number;
    timeoutMs?: number;
  } = {},
): HttpClientError {
  if (error instanceof HttpClientError) {
    if (
      (error.host == null && context.host != null) ||
      (error.attempt == null && context.attempt != null)
    ) {
      return new HttpClientError(error.outcome, error.message, error.status, {
        cause: error.cause ?? error,
        code: error.code,
        host: error.host ?? context.host,
        attempt: error.attempt ?? context.attempt,
      });
    }
    return error;
  }
  const code = clientErrorCode(error);
  const host = context.host;
  const message = failWidgetMessage(error, code, host, context.timeoutMs);
  return new HttpClientError(
    "fail_widget",
    redactSecrets(message, secret == null ? [] : [secret]),
    undefined,
    {
      cause: error,
      code,
      host,
      attempt: context.attempt,
    },
  );
}

function clientErrorCode(error: unknown): HttpClientErrorCode {
  if (error instanceof HttpSsrfError) {
    if (error.message === "timeout") {
      return "timeout";
    }
    if (error.message.includes("body exceeds")) {
      return "body_too_large";
    }
    return "ssrf";
  }
  if (isAbortTimeout(error)) {
    return "timeout";
  }
  if (error instanceof Error && error.message === "forbidden header") {
    return "forbidden_header";
  }
  return "network";
}

function failWidgetMessage(
  error: unknown,
  code: HttpClientErrorCode,
  host: string | undefined,
  timeoutMs: number | undefined,
): string {
  if (code === "timeout") {
    let message = "timeout";
    if (host != null && host !== "") {
      message += ` for ${host}`;
    }
    if (timeoutMs != null) {
      message += ` (${timeoutMs}ms)`;
    }
    return message;
  }
  return error instanceof Error ? error.message : "HTTP JSON request failed";
}

function httpStatusFailMessage(
  status: number | undefined,
  host: string | undefined,
): string {
  const statusPart = status ?? "unknown";
  if (host == null || host === "") {
    return `HTTP JSON request failed (${statusPart})`;
  }
  return `HTTP JSON request failed (${statusPart}) for ${host}`;
}

function hostnameOnly(urlString: string): string | undefined {
  try {
    const hostname = new URL(urlString).hostname;
    return hostname === "" ? undefined : hostname;
  } catch {
    return undefined;
  }
}

function isAbortTimeout(error: unknown): boolean {
  if (error instanceof HttpSsrfError) {
    return error.message === "timeout";
  }
  if (!(error instanceof Error)) {
    return false;
  }
  return (
    error.name === "TimeoutError" ||
    error.name === "AbortError" ||
    error.message === "The operation was aborted due to timeout"
  );
}

function hopLayerError(error: unknown): never {
  if (error instanceof HttpSsrfError) {
    throw error;
  }
  if (isAbortTimeout(error)) {
    throw new HttpSsrfError("timeout", { cause: error });
  }
  throw error;
}

function pinnedHttpsGet(
  url: URL,
  addresses: readonly HttpLookupAddress[],
  signal: AbortSignal,
  headers: Record<string, string>,
): Promise<HttpFetchResponse> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(
        signal.reason instanceof Error
          ? signal.reason
          : new HttpSsrfError("timeout"),
      );
      return;
    }

    let settled = false;
    let req: ReturnType<typeof httpsRequest>;

    const onAbort = (): void => {
      req.destroy(
        signal.reason instanceof Error
          ? signal.reason
          : new HttpSsrfError("timeout"),
      );
    };
    const stopAbort = (): void => {
      signal.removeEventListener("abort", onAbort);
    };
    const succeed = (response: HttpFetchResponse): void => {
      if (settled) {
        return;
      }
      settled = true;
      stopAbort();
      resolve(response);
    };
    const fail = (error: unknown): void => {
      if (settled) {
        return;
      }
      settled = true;
      stopAbort();
      reject(error);
    };

    req = httpsRequest(
      url,
      {
        method: "GET",
        servername: url.hostname,
        headers,
        signal,
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
        succeed({
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
    signal.addEventListener("abort", onAbort, { once: true });
    req.on("error", fail);
    req.on("close", stopAbort);
    req.end();
  });
}

async function defaultSleep(ms: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
