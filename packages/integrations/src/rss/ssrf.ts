/**
 * DNS-pinned https GET for RSS. Injectable lookup + fetch.
 * ssrfcheck (names, userinfo, decimal/octal IPs) then ipaddr.js allow-only-unicast
 * after IPv4-mapped conversion. Mixed A/AAAA fails closed.
 */

import type { LookupAddress } from "node:dns";
import { promises as dnsPromises } from "node:dns";
import { request as httpsRequest } from "node:https";
import { Readable } from "node:stream";
import ipaddr from "ipaddr.js";
import { isSSRFSafeURL } from "ssrfcheck";
import { isGithubOwnedHost } from "./hosts.js";

export const RSS_MAX_BYTES = 1_048_576;
export const RSS_TIMEOUT_MS = 10_000;
export const RSS_MAX_REDIRECTS = 5;
export const RSS_USER_AGENT = "profile-bits-rss/0";
export const RSS_ACCEPT =
  "application/atom+xml, application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.1";

const RSS_REQUEST_HEADERS: Readonly<Record<string, string>> = {
  Accept: RSS_ACCEPT,
  "User-Agent": RSS_USER_AGENT,
};

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

const SSRFCHECK_OPTIONS = {
  allowedProtocols: ["https"],
  allowUsername: false,
  autoPrependProtocol: false,
} as const;

export class RssSsrfError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "RssSsrfError";
  }
}

export type RssLookupAddress = {
  address: string;
  family: number;
};

export type RssLookup = (
  hostname: string,
  options: { all: true },
) => Promise<readonly RssLookupAddress[]>;

export type RssFetchInit = {
  method?: string;
  redirect?: "error" | "follow" | "manual";
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

export type RssFetchResponse = {
  status: number;
  headers: { get(name: string): string | null };
  body: ReadableStream<Uint8Array> | null;
};

export type RssFetch = (
  input: string,
  init?: RssFetchInit,
) => Promise<RssFetchResponse>;

export type SsrfDeps = {
  fetch?: RssFetch;
  lookup?: RssLookup;
};

export type SsrfGetResult = {
  status: number;
  headers: RssFetchResponse["headers"];
  body: string;
  url: string;
};

export async function defaultRssLookup(
  hostname: string,
): Promise<LookupAddress[]> {
  return dnsPromises.lookup(hostname, { all: true });
}

export async function ssrfGet(
  urlString: string,
  deps: SsrfDeps = {},
): Promise<SsrfGetResult> {
  const lookup = deps.lookup ?? defaultRssLookup;
  const signal = AbortSignal.timeout(RSS_TIMEOUT_MS);
  let current = parseHttpsUrl(urlString);
  let redirects = 0;

  for (;;) {
    const addresses = await assertSafeHop(current, lookup);
    const response = await performGet(current, {
      fetch: deps.fetch,
      addresses,
      signal,
    });

    if (REDIRECT_STATUSES.has(response.status)) {
      await cancelRedirectBody(response);
      redirects += 1;
      if (redirects > RSS_MAX_REDIRECTS) {
        throw new RssSsrfError("too many redirects");
      }
      current = nextRedirectUrl(current, response.headers.get("location"));
      continue;
    }

    return {
      status: response.status,
      headers: response.headers,
      body: await readCappedBody(response),
      url: current.href,
    };
  }
}

async function performGet(
  url: URL,
  options: {
    fetch?: RssFetch;
    addresses: readonly RssLookupAddress[];
    signal: AbortSignal;
  },
): Promise<RssFetchResponse> {
  if (options.fetch != null) {
    return options.fetch(url.href, {
      method: "GET",
      redirect: "manual",
      headers: { ...RSS_REQUEST_HEADERS },
      signal: options.signal,
    });
  }
  return pinnedHttpsGet(url, options.addresses, options.signal);
}

function parseHttpsUrl(urlString: string): URL {
  return assertSafeRssUrl(urlString);
}

function assertSafeRssUrl(urlString: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch (cause: unknown) {
    throw new RssSsrfError("invalid url", { cause });
  }
  if (parsed.protocol !== "https:") {
    throw new RssSsrfError("https only");
  }
  const safe = isSSRFSafeURL(parsed.href, SSRFCHECK_OPTIONS);
  if (!safe) {
    throw new RssSsrfError("ssrf-unsafe url");
  }
  return parsed;
}

async function assertSafeHop(
  url: URL,
  lookup: RssLookup,
): Promise<readonly RssLookupAddress[]> {
  assertSafeRssUrl(url.href);
  if (isGithubOwnedHost(url.hostname)) {
    throw new RssSsrfError("github-owned host");
  }
  return resolveValidatedAddresses(url, lookup);
}

async function resolveValidatedAddresses(
  url: URL,
  lookup: RssLookup,
): Promise<readonly RssLookupAddress[]> {
  const hostname = url.hostname;
  const literal = parseIpLiteral(hostname);
  const resolved =
    literal != null ? [literal] : await lookup(hostname, { all: true });
  if (resolved.length === 0) {
    throw new RssSsrfError("dns returned no addresses");
  }
  for (const record of resolved) {
    if (!isPublicUnicast(record.address)) {
      throw new RssSsrfError(`blocked address ${record.address}`);
    }
  }
  return resolved;
}

function stripIpv6Brackets(hostname: string): string {
  if (hostname.startsWith("[") && hostname.endsWith("]")) {
    return hostname.slice(1, -1);
  }
  return hostname;
}

function parseIpLiteral(hostname: string): RssLookupAddress | null {
  const candidate = stripIpv6Brackets(hostname);
  try {
    const parsed = ipaddr.parse(candidate);
    return {
      address: candidate,
      family: parsed.kind() === "ipv6" ? 6 : 4,
    };
  } catch {
    return null;
  }
}

export function isPublicUnicast(address: string): boolean {
  let parsed: ipaddr.IPv4 | ipaddr.IPv6;
  try {
    parsed = ipaddr.parse(address);
  } catch {
    return false;
  }
  if (parsed.kind() === "ipv6") {
    const v6 = parsed as ipaddr.IPv6;
    if (v6.isIPv4MappedAddress()) {
      parsed = v6.toIPv4Address();
    }
  }
  return parsed.range() === "unicast";
}

function nextRedirectUrl(current: URL, location: string | null): URL {
  if (location == null || location.trim() === "") {
    throw new RssSsrfError("redirect missing location");
  }
  let next: URL;
  try {
    next = new URL(location, current);
  } catch (cause: unknown) {
    throw new RssSsrfError("invalid redirect location", { cause });
  }
  if (next.protocol !== "https:") {
    throw new RssSsrfError("https only");
  }
  return assertSafeRssUrl(next.href);
}

async function cancelRedirectBody(response: RssFetchResponse): Promise<void> {
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

async function readCappedBody(response: RssFetchResponse): Promise<string> {
  const lengthRaw = response.headers.get("content-length");
  if (lengthRaw != null && lengthRaw !== "") {
    const length = Number(lengthRaw);
    if (Number.isFinite(length) && length > RSS_MAX_BYTES) {
      throw new RssSsrfError("body exceeds 1 MiB");
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
      if (total > RSS_MAX_BYTES) {
        await reader.cancel();
        throw new RssSsrfError("body exceeds 1 MiB");
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

function pinnedHttpsGet(
  url: URL,
  addresses: readonly RssLookupAddress[],
  signal: AbortSignal,
): Promise<RssFetchResponse> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason ?? new RssSsrfError("timeout"));
      return;
    }

    const hostname = stripIpv6Brackets(url.hostname);
    const port = url.port === "" ? 443 : Number(url.port);
    const path = `${url.pathname}${url.search}`;

    let settled = false;
    let req: ReturnType<typeof httpsRequest>;

    const onAbort = (): void => {
      req.destroy(
        signal.reason instanceof Error
          ? signal.reason
          : new RssSsrfError("timeout"),
      );
    };
    const stopAbort = (): void => {
      signal.removeEventListener("abort", onAbort);
    };
    const succeed = (response: RssFetchResponse): void => {
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

    signal.addEventListener("abort", onAbort, { once: true });
    req = httpsRequest(
      {
        hostname,
        port,
        path,
        servername: hostname,
        headers: { ...RSS_REQUEST_HEADERS },
        lookup(lookupHostname, options, callback) {
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
            const error = new Error(`ENOTFOUND ${lookupHostname}`);
            callback(error, "", 4);
            return;
          }
          callback(null, match.address, match.family);
        },
        signal,
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const headers = {
          get(name: string) {
            const raw = res.headers[name.toLowerCase()];
            if (raw == null) {
              return null;
            }
            return Array.isArray(raw) ? raw.join(", ") : raw;
          },
        };
        if (REDIRECT_STATUSES.has(status)) {
          succeed({ status, headers, body: null });
          res.destroy();
          return;
        }
        succeed({
          status,
          headers,
          body: Readable.toWeb(res) as ReadableStream<Uint8Array>,
        });
      },
    );

    req.on("error", fail);
    req.on("close", stopAbort);
    req.end();
  });
}
