/**
 * HTTPS GET for HTML scrape. SSRF policy is reused from http (ssrfcheck +
 * ipaddr unicast + metadata hosts) and rss (GitHub-owned hosts, DNS pin,
 * manual redirects, 1 MiB). Transport Accept is text/html, not the rss XML
 * Accept header.
 */

import type { LookupAddress } from "node:dns";
import { promises as dnsPromises } from "node:dns";
import { request as httpsRequest } from "node:https";
import { Readable } from "node:stream";
import {
  assertSafeHttpUrl,
  HTTP_MAX_BYTES,
  HTTP_MAX_REDIRECTS,
  type HttpLookup,
  HttpSsrfError,
  resolveValidatedAddresses,
} from "../http/ssrf.js";
import { isGithubOwnedHost } from "../rss/hosts.js";
import {
  type RssFetch,
  type RssFetchInit,
  type RssFetchResponse,
  type RssLookup,
  RssSsrfError,
  ssrfGet as rssSsrfGet,
} from "../rss/ssrf.js";

export const HTML_MAX_BYTES = HTTP_MAX_BYTES;
export const HTML_MAX_REDIRECTS = HTTP_MAX_REDIRECTS;
export const HTML_TIMEOUT_MS = 10_000;
export const HTML_USER_AGENT = "profile-bits-html/0";
export const HTML_ACCEPT = "text/html, application/xhtml+xml;q=0.9, */*;q=0.1";

const HTML_REQUEST_HEADERS: Readonly<Record<string, string>> = {
  Accept: HTML_ACCEPT,
  "User-Agent": HTML_USER_AGENT,
};

export class HtmlScrapeSsrfError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "HtmlScrapeSsrfError";
  }
}

export type HtmlLookupAddress = {
  address: string;
  family: number;
};

export type HtmlLookup = HttpLookup;

export type HtmlFetchInit = RssFetchInit;
export type HtmlFetchResponse = RssFetchResponse;
export type HtmlFetch = RssFetch;

export type SsrfDeps = {
  fetch?: HtmlFetch;
  lookup?: HtmlLookup;
};

export type SsrfGetResult = {
  status: number;
  headers: HtmlFetchResponse["headers"];
  body: string;
  url: string;
};

export async function defaultHtmlLookup(
  hostname: string,
): Promise<LookupAddress[]> {
  return dnsPromises.lookup(hostname, { all: true });
}

export async function ssrfGet(
  urlString: string,
  deps: SsrfDeps = {},
): Promise<SsrfGetResult> {
  try {
    const parsed = assertSafeHttpUrl(urlString);
    assertNotGithubHost(parsed.hostname);
  } catch (error: unknown) {
    throw wrapSsrf(error);
  }

  const lookup = deps.lookup ?? defaultHtmlLookup;
  try {
    return await rssSsrfGet(urlString, {
      lookup: lookup as RssLookup,
      fetch: async (input, init) =>
        performHtmlGet(input, init, { fetch: deps.fetch, lookup }),
    });
  } catch (error: unknown) {
    throw wrapSsrf(error);
  }
}

async function performHtmlGet(
  input: string,
  init: HtmlFetchInit | undefined,
  deps: { fetch?: HtmlFetch; lookup: HtmlLookup },
): Promise<HtmlFetchResponse> {
  const signal = init?.signal;
  if (deps.fetch != null) {
    return deps.fetch(input, {
      method: "GET",
      redirect: "manual",
      headers: { ...HTML_REQUEST_HEADERS },
      signal,
    });
  }
  const url = assertSafeHttpUrl(input);
  assertNotGithubHost(url.hostname);
  const addresses = await resolveValidatedAddresses(url, deps.lookup);
  return pinnedHttpsGet(
    url,
    addresses,
    signal ?? AbortSignal.timeout(HTML_TIMEOUT_MS),
  );
}

function assertNotGithubHost(hostname: string): void {
  if (isGithubOwnedHost(hostname)) {
    throw new HtmlScrapeSsrfError("github-owned host");
  }
}

function wrapSsrf(error: unknown): HtmlScrapeSsrfError {
  if (error instanceof HtmlScrapeSsrfError) {
    return error;
  }
  if (error instanceof HttpSsrfError || error instanceof RssSsrfError) {
    return new HtmlScrapeSsrfError(error.message, { cause: error });
  }
  if (error instanceof Error) {
    return new HtmlScrapeSsrfError(error.message, { cause: error });
  }
  return new HtmlScrapeSsrfError("ssrf-unsafe url");
}

function stripIpv6Brackets(hostname: string): string {
  if (hostname.startsWith("[") && hostname.endsWith("]")) {
    return hostname.slice(1, -1);
  }
  return hostname;
}

function pinnedHttpsGet(
  url: URL,
  addresses: readonly HtmlLookupAddress[],
  signal: AbortSignal,
): Promise<HtmlFetchResponse> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason ?? new HtmlScrapeSsrfError("timeout"));
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
          : new HtmlScrapeSsrfError("timeout"),
      );
    };
    const stopAbort = (): void => {
      signal.removeEventListener("abort", onAbort);
    };
    const succeed = (response: HtmlFetchResponse): void => {
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
        headers: { ...HTML_REQUEST_HEADERS },
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
