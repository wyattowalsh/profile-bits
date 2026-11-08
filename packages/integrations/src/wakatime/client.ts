import type { LookupAddress } from "node:dns";
import { lookup as dnsLookup } from "node:dns/promises";
import { request as httpsRequest } from "node:https";
import { Readable } from "node:stream";
import {
  type CodingIncludeToken,
  type CodingRange,
  isMissingToken,
  publicUrlParts,
  type RunLogEvent,
  type RunLogSink,
  redactLogMessage,
  redactSecrets,
  type SkipFailOutcome,
} from "@profile-bits/core";
import {
  assertSafeResolvedAddresses,
  HTTP_MAX_BYTES,
  type HttpLookupAddress,
  HttpSsrfError,
  isPublicUnicast,
  parseIpLiteral,
} from "../http/ssrf.js";
import { resolveStatsUrl, UnsafeApiDomainError } from "./api-domain.js";
import { WakatimeRequestCache } from "./cache.js";
import type { ExtraGetResult } from "./extra.js";
import {
  classifyWakatimeExtraHttp,
  isWakatimeCloud,
  loadCloudExtras,
  mergeWakatimeDump,
} from "./extra.js";
import type { WakatimeDump } from "./extra-payload.js";
import {
  classifyWakatimeHttp,
  sleep as defaultSleep,
  isRedirectFetchError,
  WAKATIME_BACKOFF_MS,
  WAKATIME_MAX_ATTEMPTS,
} from "./http.js";
import {
  type WakatimeStatsEnvelope,
  WakatimeStatsEnvelopeSchema,
} from "./payload.js";

export type DnsLookup = typeof dnsLookup;

export const WAKATIME_MAX_BYTES = HTTP_MAX_BYTES;
export const WAKATIME_TIMEOUT_MS = 10_000;

export type WakatimeClientErrorCode =
  | "missing_token"
  | "dns_no_addresses"
  | "dns_blocked"
  | "body_too_large"
  | "invalid_response"
  | "transport"
  | "http_unauthorized"
  | "http_not_found"
  | "http_bad_request"
  | "http_forbidden"
  | "http_rate_limited"
  | "http_redirect"
  | "http_accepted"
  | "http_server"
  | "stale"
  | "http_unclassified"
  | "unsafe_api_domain";

export class WakatimeClientError extends Error {
  override readonly name = "WakatimeClientError";
  readonly outcome: SkipFailOutcome;
  readonly status?: number;
  readonly code: WakatimeClientErrorCode;

  constructor(outcome: SkipFailOutcome, message: string, status?: number) {
    super(redactSecrets(message));
    this.outcome = outcome;
    this.status = status;
    this.code = defaultWakatimeClientErrorCode(outcome, status, message);
  }
}

function defaultWakatimeClientErrorCode(
  outcome: SkipFailOutcome,
  status: number | undefined,
  message: string,
): WakatimeClientErrorCode {
  if (status === 401) {
    return "http_unauthorized";
  }
  if (status === 404) {
    return "http_not_found";
  }
  if (status === 400) {
    return "http_bad_request";
  }
  if (status === 403) {
    return "http_forbidden";
  }
  if (status === 429) {
    return "http_rate_limited";
  }
  if (status === 302) {
    return "http_redirect";
  }
  if (status === 202) {
    return "http_accepted";
  }
  if (status != null && status >= 500 && status <= 599) {
    return "http_server";
  }
  if (status === 200 && outcome === "fail_after_backoff") {
    return "stale";
  }
  if (status === 200) {
    return "invalid_response";
  }
  if (outcome === "fail_job") {
    return "missing_token";
  }
  if (message === "api_domain resolved to no addresses") {
    return "dns_no_addresses";
  }
  if (message === "api_domain resolved to a blocked address") {
    return "dns_blocked";
  }
  if (message === "body exceeds 1 MiB") {
    return "body_too_large";
  }
  if (message === "api_domain is not allowed") {
    return "unsafe_api_domain";
  }
  if (outcome === "fail_widget") {
    return "transport";
  }
  return "http_unclassified";
}

export function isBlockedAddress(address: string): boolean {
  return !isPublicUnicast(address);
}

export function encodeBasicAuthorization(token: string): string {
  return `Basic ${Buffer.from(`${token}:`, "utf8").toString("base64")}`;
}

export type CreateWakatimeClientInput = {
  token: string;
  apiDomain: string;
  fetch?: typeof fetch;
  lookup?: DnsLookup;
  cache?: WakatimeRequestCache;
  sleep?: (ms: number) => Promise<void>;
  logger?: RunLogSink;
};

export type WakatimeClient = {
  fetchStats: (input: {
    range: CodingRange;
    include: readonly CodingIncludeToken[];
    limit: number;
  }) => Promise<WakatimeDump>;
};

type WakatimeResponse = {
  status: number;
  headers: { get(name: string): string | null };
  body: ReadableStream<Uint8Array> | null;
};

export function createWakatimeClient(
  input: CreateWakatimeClientInput,
): WakatimeClient {
  if (isMissingToken(input.token)) {
    throw new WakatimeClientError(
      "fail_job",
      "wakatime_token is required when the wakatime pack is enabled",
    );
  }
  const token = input.token.trim();
  const fetchImpl = input.fetch;
  const lookup = input.lookup ?? dnsLookup;
  const cache = input.cache ?? new WakatimeRequestCache();
  const sleep = input.sleep ?? defaultSleep;
  const logger = input.logger;
  const auth = encodeBasicAuthorization(token);
  let resolved:
    | {
        hostname: string;
        addresses: readonly HttpLookupAddress[];
      }
    | undefined;

  async function addressesFor(
    hostname: string,
  ): Promise<readonly HttpLookupAddress[]> {
    if (resolved?.hostname === hostname) {
      return resolved.addresses;
    }
    const addresses = await assertPublicResolvedAddresses(hostname, lookup);
    resolved = { hostname, addresses };
    return addresses;
  }

  async function extraGet(
    url: URL,
    params: Readonly<Record<string, string>>,
  ): Promise<ExtraGetResult> {
    return cache.rest({ method: "GET", url: url.href, params }, async () => {
      const addresses = await addressesFor(url.hostname);
      return fetchExtraUncached({
        url,
        addresses,
        token,
        auth,
        fetchImpl,
        sleep,
        logger,
      });
    });
  }

  return {
    async fetchStats({ range }) {
      let url: URL;
      try {
        url = resolveStatsUrl(input.apiDomain, range);
      } catch (error) {
        if (error instanceof UnsafeApiDomainError) {
          throw new WakatimeClientError(
            "fail_widget",
            "api_domain is not allowed",
          );
        }
        throw error;
      }
      const envelope = await cache.rest(
        { method: "GET", url: url.href, params: {} },
        async () => {
          const addresses = await addressesFor(url.hostname);
          return fetchStatsUncached({
            url,
            addresses,
            token,
            auth,
            fetchImpl,
            sleep,
            logger,
          });
        },
      );
      if (!isWakatimeCloud(input.apiDomain)) {
        return envelope.data;
      }
      const extras = await loadCloudExtras({
        stats: envelope.data,
        range,
        get: extraGet,
      });
      return mergeWakatimeDump(envelope.data, extras);
    },
  };
}

async function assertPublicResolvedAddresses(
  hostname: string,
  lookup: DnsLookup,
): Promise<readonly HttpLookupAddress[]> {
  const literal = parseIpLiteral(hostname);
  const resolved =
    literal != null
      ? [literal]
      : asLookupAddresses(await lookup(hostname, { all: true }));
  try {
    return assertSafeResolvedAddresses(resolved);
  } catch (error) {
    if (error instanceof HttpSsrfError) {
      if (error.message === "dns returned no addresses") {
        throw new WakatimeClientError(
          "fail_widget",
          "api_domain resolved to no addresses",
        );
      }
      throw new WakatimeClientError(
        "fail_widget",
        "api_domain resolved to a blocked address",
      );
    }
    throw error;
  }
}

function asLookupAddresses(
  records: Awaited<ReturnType<DnsLookup>>,
): HttpLookupAddress[] {
  const list = Array.isArray(records) ? records : [records];
  const addresses: HttpLookupAddress[] = [];
  for (const record of list) {
    if (typeof record === "string") {
      addresses.push({
        address: record,
        family: record.includes(":") ? 6 : 4,
      });
      continue;
    }
    addresses.push({ address: record.address, family: record.family });
  }
  return addresses;
}

async function fetchStatsUncached(input: {
  url: URL;
  addresses: readonly HttpLookupAddress[];
  token: string;
  auth: string;
  fetchImpl: typeof fetch | undefined;
  sleep: (ms: number) => Promise<void>;
  logger: RunLogSink | undefined;
}): Promise<WakatimeStatsEnvelope> {
  const secrets = [input.token, input.auth] as const;
  let lastOutcome: SkipFailOutcome = "fail_run";
  let lastStatus: number | undefined;
  for (let attempt = 1; attempt <= WAKATIME_MAX_ATTEMPTS; attempt += 1) {
    const started = performance.now();
    let status = 0;
    let body: unknown;
    try {
      const signal = AbortSignal.timeout(WAKATIME_TIMEOUT_MS);
      const response = await performGet(input.url, {
        fetch: input.fetchImpl,
        addresses: input.addresses,
        signal,
        auth: input.auth,
      });
      status = response.status;
      body = parseJsonText(await readCappedBody(response));
    } catch (error) {
      const durationMs = elapsedMs(started);
      if (error instanceof WakatimeClientError) {
        emitWakatimeCall(input.logger, {
          url: input.url,
          durationMs,
          status: error.status ?? (status === 0 ? undefined : status),
          outcome: error.outcome,
          message: error.message,
          secrets,
        });
        throw error;
      }
      if (isRedirectFetchError(error)) {
        status = 302;
        body = undefined;
      } else {
        const raw =
          error instanceof Error
            ? error.message
            : "WakaTime stats request failed";
        const message = redactSecrets(raw, secrets);
        emitWakatimeCall(input.logger, {
          url: input.url,
          durationMs,
          outcome: "fail_widget",
          message,
          secrets,
        });
        throw new WakatimeClientError("fail_widget", message);
      }
    }
    const durationMs = elapsedMs(started);
    const outcome = classifyWakatimeHttp({ status, body });
    lastOutcome = outcome;
    lastStatus = status;
    if (outcome === "render") {
      const parsed = WakatimeStatsEnvelopeSchema.safeParse(body);
      if (!parsed.success) {
        emitWakatimeCall(input.logger, {
          url: input.url,
          durationMs,
          status,
          outcome: "fail_widget",
          message: "WakaTime stats response is invalid",
          secrets,
        });
        throw new WakatimeClientError(
          "fail_widget",
          "WakaTime stats response is invalid",
          status,
        );
      }
      emitWakatimeCall(input.logger, {
        url: input.url,
        durationMs,
        status,
        outcome: "ok",
        secrets,
      });
      return parsed.data;
    }
    emitWakatimeCall(input.logger, {
      url: input.url,
      durationMs,
      status,
      outcome,
      message: `WakaTime stats request failed (${status})`,
      secrets,
    });
    if (outcome !== "fail_after_backoff" || attempt === WAKATIME_MAX_ATTEMPTS) {
      throw new WakatimeClientError(
        outcome,
        `WakaTime stats request failed (${status})`,
        status,
      );
    }
    const delay = WAKATIME_BACKOFF_MS[attempt - 1] ?? 800;
    await input.sleep(delay);
  }
  throw new WakatimeClientError(
    lastOutcome,
    `WakaTime stats request failed (${lastStatus ?? "unknown"})`,
    lastStatus,
  );
}

async function fetchExtraUncached(input: {
  url: URL;
  addresses: readonly HttpLookupAddress[];
  token: string;
  auth: string;
  fetchImpl: typeof fetch | undefined;
  sleep: (ms: number) => Promise<void>;
  logger: RunLogSink | undefined;
}): Promise<ExtraGetResult> {
  const secrets = [input.token, input.auth] as const;
  for (let attempt = 1; attempt <= WAKATIME_MAX_ATTEMPTS; attempt += 1) {
    const started = performance.now();
    let status = 0;
    let body: unknown;
    try {
      const signal = AbortSignal.timeout(WAKATIME_TIMEOUT_MS);
      const response = await performGet(input.url, {
        fetch: input.fetchImpl,
        addresses: input.addresses,
        signal,
        auth: input.auth,
      });
      status = response.status;
      body = parseJsonText(await readCappedBody(response));
    } catch (error) {
      const durationMs = elapsedMs(started);
      if (error instanceof WakatimeClientError) {
        if (error.outcome === "fail_run" || error.status === 401) {
          emitWakatimeCall(input.logger, {
            url: input.url,
            durationMs,
            status: error.status ?? (status === 0 ? undefined : status),
            outcome: error.outcome,
            message: error.message,
            secrets,
          });
          throw error;
        }
        emitWakatimeCall(input.logger, {
          url: input.url,
          durationMs,
          status: error.status ?? (status === 0 ? undefined : status),
          outcome: "fail_widget",
          message: error.message,
          secrets,
        });
        return { kind: "omit" };
      }
      if (isRedirectFetchError(error)) {
        status = 302;
        body = undefined;
      } else {
        const raw =
          error instanceof Error
            ? error.message
            : "WakaTime extra request failed";
        const message = redactSecrets(raw, secrets);
        emitWakatimeCall(input.logger, {
          url: input.url,
          durationMs,
          outcome: "fail_widget",
          message,
          secrets,
        });
        return { kind: "omit" };
      }
    }
    const durationMs = elapsedMs(started);
    const outcome = classifyWakatimeExtraHttp(status);
    if (outcome === "include") {
      emitWakatimeCall(input.logger, {
        url: input.url,
        durationMs,
        status,
        outcome: "ok",
        secrets,
      });
      return { kind: "ok", body };
    }
    if (outcome === "fail_run") {
      emitWakatimeCall(input.logger, {
        url: input.url,
        durationMs,
        status,
        outcome: "fail_run",
        message: `WakaTime extra request failed (${status})`,
        secrets,
      });
      throw new WakatimeClientError(
        "fail_run",
        `WakaTime extra request failed (${status})`,
        status,
      );
    }
    if (outcome === "omit") {
      emitWakatimeCall(input.logger, {
        url: input.url,
        durationMs,
        status,
        secrets,
      });
      return { kind: "omit" };
    }
    emitWakatimeCall(input.logger, {
      url: input.url,
      durationMs,
      status,
      outcome: "fail_after_backoff",
      message: `WakaTime extra request failed (${status})`,
      secrets,
    });
    if (attempt === WAKATIME_MAX_ATTEMPTS) {
      return { kind: "omit" };
    }
    const delay = WAKATIME_BACKOFF_MS[attempt - 1] ?? 800;
    await input.sleep(delay);
  }
  return { kind: "omit" };
}

function elapsedMs(started: number): number {
  return Math.max(0, Math.round(performance.now() - started));
}

function emitWakatimeCall(
  logger: RunLogSink | undefined,
  input: {
    url: URL;
    durationMs: number;
    status?: number;
    outcome?: RunLogEvent["outcome"];
    message?: string;
    secrets: readonly (string | undefined | null)[];
  },
): void {
  if (logger == null) {
    return;
  }
  const { host, path } = publicUrlParts(input.url.href);
  logger({
    v: 1,
    src: "profile-bits",
    kind: "call",
    pkg: "integrations",
    integration: "wakatime",
    op: "GET",
    duration_ms: input.durationMs,
    host,
    path,
    ...(input.status != null && input.status !== 0
      ? { status: input.status }
      : {}),
    ...(input.outcome != null ? { outcome: input.outcome } : {}),
    ...(input.message != null && input.message !== ""
      ? { message: redactLogMessage(input.message, input.secrets) }
      : {}),
  });
}

async function performGet(
  url: URL,
  options: {
    fetch?: typeof fetch;
    addresses: readonly HttpLookupAddress[];
    signal: AbortSignal;
    auth: string;
  },
): Promise<WakatimeResponse> {
  const headers = {
    Authorization: options.auth,
    Accept: "application/json",
  };
  if (options.fetch != null) {
    // Injected fetch re-resolves the hostname (residual DNS rebinding).
    return options.fetch(url, {
      method: "GET",
      redirect: "error",
      cache: "no-store",
      headers,
      signal: options.signal,
    });
  }
  return pinnedHttpsGet(url, options.addresses, options.signal, headers);
}

function pinnedHttpsGet(
  url: URL,
  addresses: readonly HttpLookupAddress[],
  signal: AbortSignal,
  headers: Record<string, string>,
): Promise<WakatimeResponse> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason ?? new Error("timeout"));
      return;
    }
    const req = httpsRequest(
      url,
      {
        method: "GET",
        servername: url.hostname,
        headers,
        lookup(hostname, lookupOptions, callback) {
          const all =
            typeof lookupOptions === "object" && lookupOptions.all === true;
          if (all) {
            callback(null, [...addresses] as LookupAddress[]);
            return;
          }
          const family =
            typeof lookupOptions === "object"
              ? lookupOptions.family
              : undefined;
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
        signal.reason instanceof Error ? signal.reason : new Error("timeout"),
      );
    };
    signal.addEventListener("abort", onAbort, { once: true });
    req.on("error", reject);
    req.end();
  });
}

async function readCappedBody(response: WakatimeResponse): Promise<string> {
  const lengthRaw = response.headers.get("content-length");
  if (lengthRaw != null && lengthRaw !== "") {
    const length = Number(lengthRaw);
    if (Number.isFinite(length) && length > WAKATIME_MAX_BYTES) {
      throw new WakatimeClientError("fail_widget", "body exceeds 1 MiB");
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
      if (total > WAKATIME_MAX_BYTES) {
        await reader.cancel();
        throw new WakatimeClientError("fail_widget", "body exceeds 1 MiB");
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

function parseJsonText(text: string): unknown {
  if (text.trim() === "") {
    return undefined;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { raw: text };
  }
}
