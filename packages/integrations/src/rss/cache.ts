/**
 * Run-scoped RSS request cache. No HTTP.
 * Key: (method, url, params) plus in-flight single-flight.
 */

export type RssCacheParts = {
  method: string;
  url: string;
  params: Readonly<Record<string, string>>;
};

export function rssCacheKey(parts: RssCacheParts): string {
  return JSON.stringify({
    method: parts.method,
    url: parts.url,
    params: canonicalize(parts.params),
  });
}

export class RssRequestCache {
  private readonly entries = new Map<string, Promise<unknown>>();

  get<T>(parts: RssCacheParts, load: () => Promise<T> | T): Promise<T> {
    return coalesce(this.entries, rssCacheKey(parts), load);
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
  let pending: Promise<T>;
  try {
    pending = Promise.resolve(load());
  } catch (error: unknown) {
    pending = Promise.reject(error);
  }
  pending = pending.catch((error: unknown) => {
    store.delete(key);
    throw error;
  });
  store.set(key, pending);
  return pending;
}

function canonicalize(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  const record = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(record).sort()) {
    sorted[key] = canonicalize(record[key]);
  }
  return sorted;
}
