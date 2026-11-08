/**
 * Run-scoped Spotify REST cache. No HTTP.
 * Key: (method, url, params, auth) where auth is "bearer" (never the secret).
 */

import { SPOTIFY_CACHE_AUTH } from "./auth.js";

export type SpotifyRestCacheParts = {
  method: string;
  url: string;
  params: Readonly<Record<string, string>>;
};

export function spotifyRestCacheKey(parts: SpotifyRestCacheParts): string {
  return JSON.stringify({
    method: parts.method,
    url: parts.url,
    params: canonicalize(parts.params),
    auth: SPOTIFY_CACHE_AUTH,
  });
}

export class SpotifyRequestCache {
  private readonly restEntries = new Map<string, Promise<unknown>>();

  rest<T>(
    parts: SpotifyRestCacheParts,
    load: () => Promise<T> | T,
  ): Promise<T> {
    return coalesce(this.restEntries, spotifyRestCacheKey(parts), load);
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

function canonicalize(
  params: Readonly<Record<string, string>>,
): Record<string, string> {
  const sorted: Record<string, string> = {};
  for (const key of Object.keys(params).sort()) {
    sorted[key] = params[key] ?? "";
  }
  return sorted;
}
