import type { LookupAddress } from "node:dns";
import { lookup as dnsLookup } from "node:dns/promises";
import { request as httpsRequest } from "node:https";
import { Readable } from "node:stream";
import {
  type CodingIncludeToken,
  type CodingRange,
  isMissingToken,
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
import {
  classifyWakatimeHttp,
  sleep as defaultSleep,
  isRedirectFetchError,
  WAKATIME_BACKOFF_MS,
  WAKATIME_MAX_ATTEMPTS,
} from "./http.js";
import {
  type CodingPayload,
  selectCodingPayload,
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
};

export type WakatimeClient = {
  fetchStats: (input: {
    range: CodingRange;
    include: readonly CodingIncludeToken[];
    limit: number;
  }) => Promise<CodingPayload>;
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
  const auth = encodeBasicAuthorization(token);

  return {
    async fetchStats({ range, include, limit }) {
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
          const addresses = await assertPublicResolvedAddresses(
            url.hostname,
            lookup,
          );
          return fetchStatsUncached({
            url,
            addresses,
            token,
            auth,
            fetchImpl,
            sleep,
          });
        },
      );
      return selectCodingPayload(envelope.data, include, limit);
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
}): Promise<WakatimeStatsEnvelope> {
  let lastOutcome: SkipFailOutcome = "fail_run";
  let lastStatus: number | undefined;
  for (let attempt = 1; attempt <= WAKATIME_MAX_ATTEMPTS; attempt += 1) {
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
      if (error instanceof WakatimeClientError) {
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
        throw new WakatimeClientError(
          "fail_widget",
          redactSecrets(raw, [input.token, input.auth]),
        );
      }
    }
    const outcome = classifyWakatimeHttp({ status, body });
    lastOutcome = outcome;
    lastStatus = status;
    if (outcome === "render") {
      const parsed = WakatimeStatsEnvelopeSchema.safeParse(body);
      if (!parsed.success) {
        throw new WakatimeClientError(
          "fail_widget",
          "WakaTime stats response is invalid",
          status,
        );
      }
      return parsed.data;
    }
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
