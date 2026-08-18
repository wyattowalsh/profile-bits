/**
 * Run-scoped REST cache with single-flight. No HTTP.
 * Key: (method, url, params, auth, headers) where auth is "none" | "bearer"
 * (never the secret). Yaml headers are canonicalized; do not put secrets in them.
 * Do not add GraphQL keys here (github T111a later).
 */

export type RestCacheAuth = "none" | "bearer";

export type RestCacheParts = {
  method: string;
  url: string;
  params: Readonly<Record<string, string>>;
  auth: RestCacheAuth;
  headers?: Readonly<Record<string, string>>;
};

export function restCacheKey(parts: RestCacheParts): string {
  return JSON.stringify({
    method: parts.method,
    url: parts.url,
    params: canonicalizeParams(parts.params),
    auth: parts.auth,
    headers: canonicalizeHeaders(parts.headers),
  });
}

export function paramsFromUrl(url: string): Record<string, string> {
  const parsed = new URL(url);
  const params: Record<string, string> = {};
  const keys = [...parsed.searchParams.keys()].sort();
  for (const key of keys) {
    params[key] = parsed.searchParams.get(key) ?? "";
  }
  return params;
}

export class RequestCache {
  private readonly entries = new Map<string, Promise<unknown>>();

  get<T>(parts: RestCacheParts, load: () => Promise<T> | T): Promise<T> {
    return coalesce(this.entries, restCacheKey(parts), load);
  }
}

function coalesce<T>(
  store: Map<string, Promise<unknown>>,
  key: string,
  load: () => Promise<T> | T,
): Promise<T> {
  const hit = store.get(key);
  if (hit !== undefined) {
    return hit as Promise<T>;
  }
  const pending = Promise.resolve()
    .then(load)
    .catch((error: unknown) => {
      store.delete(key);
      throw error;
    });
  store.set(key, pending);
  return pending;
}

function canonicalizeParams(
  params: Readonly<Record<string, string>>,
): Record<string, string> {
  const sorted: Record<string, string> = {};
  for (const key of Object.keys(params).sort()) {
    sorted[key] = params[key] ?? "";
  }
  return sorted;
}

function canonicalizeHeaders(
  headers: Readonly<Record<string, string>> | undefined,
): Record<string, string> {
  if (headers == null) {
    return {};
  }
  const sorted: Record<string, string> = {};
  const names = Object.keys(headers).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase()),
  );
  for (const name of names) {
    sorted[name.toLowerCase()] = headers[name] ?? "";
  }
  return sorted;
}
