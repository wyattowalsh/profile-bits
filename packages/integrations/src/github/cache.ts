/**
 * Run-scoped GitHub request cache. No HTTP.
 * REST key: (method, url, params). GraphQL key: (query, variables) —
 * never POST /graphql alone.
 */

export type RestCacheParts = {
  method: string;
  url: string;
  params: Readonly<Record<string, string>>;
};

export type GraphqlCacheParts = {
  query: string;
  variables?: unknown;
};

export function restCacheKey(parts: RestCacheParts): string {
  return JSON.stringify({
    method: parts.method,
    url: parts.url,
    params: canonicalize(parts.params),
  });
}

export function graphqlCacheKey(parts: GraphqlCacheParts): string {
  return JSON.stringify({
    query: parts.query,
    variables: canonicalize(parts.variables ?? {}),
  });
}

export class GithubRequestCache {
  private readonly restEntries = new Map<string, Promise<unknown>>();
  private readonly graphqlEntries = new Map<string, Promise<unknown>>();

  rest<T>(parts: RestCacheParts, load: () => Promise<T> | T): Promise<T> {
    return coalesce(this.restEntries, restCacheKey(parts), load);
  }

  graphql<T>(parts: GraphqlCacheParts, load: () => Promise<T> | T): Promise<T> {
    return coalesce(this.graphqlEntries, graphqlCacheKey(parts), load);
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
