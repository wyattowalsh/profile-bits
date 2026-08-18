/**
 * HTTPS SSRF guards for the http integration.
 * ssrfcheck (names, userinfo, decimal/octal IPs) then ipaddr.js allow-only-unicast
 * after IPv4-mapped unwrap. Mixed A/AAAA fails closed.
 */

import ipaddr from "ipaddr.js";
import { isSSRFSafeURL } from "ssrfcheck";

export const HTTP_MAX_BYTES = 1_048_576;
export const HTTP_MAX_REDIRECTS = 5;
export const HTTP_METADATA_HOSTS = [
  "metadata.google.internal",
  "metadata.internal",
  "169.254.169.254",
] as const;

export class HttpSsrfError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "HttpSsrfError";
  }
}

export type HttpLookupAddress = {
  address: string;
  family: number;
};

export type HttpLookup = (
  hostname: string,
  options: { all: true },
) => Promise<readonly HttpLookupAddress[]>;

function normalizeHostname(hostname: string): string {
  return hostname.replace(/\.$/, "").toLowerCase();
}

function stripIpv6Brackets(hostname: string): string {
  if (hostname.startsWith("[") && hostname.endsWith("]")) {
    return hostname.slice(1, -1);
  }
  return hostname;
}

function isMetadataHost(hostname: string): boolean {
  const normalized = normalizeHostname(stripIpv6Brackets(hostname));
  return (HTTP_METADATA_HOSTS as readonly string[]).includes(normalized);
}

export function assertSafeHttpUrl(urlString: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch (cause: unknown) {
    throw new HttpSsrfError("invalid url", { cause });
  }
  if (parsed.protocol !== "https:") {
    throw new HttpSsrfError("https only");
  }
  if (isMetadataHost(parsed.hostname)) {
    throw new HttpSsrfError("metadata host");
  }
  const safe = isSSRFSafeURL(parsed.href, {
    allowedProtocols: ["https"],
    allowUsername: false,
    autoPrependProtocol: false,
  });
  if (!safe) {
    throw new HttpSsrfError("ssrf-unsafe url");
  }
  return parsed;
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

export function parseIpLiteral(hostname: string): HttpLookupAddress | null {
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

export function assertSafeResolvedAddresses(
  addresses: readonly HttpLookupAddress[],
): readonly HttpLookupAddress[] {
  if (addresses.length === 0) {
    throw new HttpSsrfError("dns returned no addresses");
  }
  for (const record of addresses) {
    if (!isPublicUnicast(record.address)) {
      throw new HttpSsrfError(`blocked address ${record.address}`);
    }
  }
  return addresses;
}

export async function resolveValidatedAddresses(
  url: URL,
  lookup: HttpLookup,
): Promise<readonly HttpLookupAddress[]> {
  assertSafeHttpUrl(url.href);
  const literal = parseIpLiteral(url.hostname);
  const resolved =
    literal != null ? [literal] : await lookup(url.hostname, { all: true });
  return assertSafeResolvedAddresses(resolved);
}
