/**
 * Run-scoped WakaTime REST cache. No HTTP.
 * REST key: (method, url, params) — never POST /graphql.
 */

export type RestCacheParts = {
  method: string;
  url: string;
  params: Readonly<Record<string, string>>;
};

export function restCacheKey(parts: RestCacheParts): string {
  return JSON.stringify({
    method: parts.method,
    url: parts.url,
    params: canonicalize(parts.params),
  });
}

export class WakatimeRequestCache {
  private readonly restEntries = new Map<string, Promise<unknown>>();

  rest<T>(parts: RestCacheParts, load: () => Promise<T> | T): Promise<T> {
    return coalesce(this.restEntries, restCacheKey(parts), load);
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
