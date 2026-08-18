import { describe, expect, it, vi } from "vitest";
import { paramsFromUrl, RequestCache, restCacheKey } from "./cache.js";

const JSON_URL = "https://example.com/api.json";

describe("RequestCache", () => {
  it("coalesces two GETs that share (method, url, params, auth)", async () => {
    const cache = new RequestCache();
    const load = vi.fn(async () => ({ ok: true }));
    const parts = {
      method: "GET",
      url: JSON_URL,
      params: { q: "1" },
      auth: "none" as const,
    };

    const [first, second] = await Promise.all([
      cache.get(parts, load),
      cache.get({ ...parts }, load),
    ]);
    const third = await cache.get({ ...parts }, load);

    expect(load).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
    expect(third).toBe(first);
    expect(restCacheKey(parts)).toBe(
      restCacheKey({
        method: "GET",
        url: JSON_URL,
        params: { q: "1" },
        auth: "none",
      }),
    );
  });

  it("misses when auth none vs bearer (never the secret)", async () => {
    const cache = new RequestCache();
    const loadNone = vi.fn(async () => ({ auth: "none" }));
    const loadBearer = vi.fn(async () => ({ auth: "bearer" }));
    const base = { method: "GET", url: JSON_URL, params: {} };

    const none = await cache.get({ ...base, auth: "none" }, loadNone);
    const bearer = await cache.get({ ...base, auth: "bearer" }, loadBearer);

    expect(loadNone).toHaveBeenCalledTimes(1);
    expect(loadBearer).toHaveBeenCalledTimes(1);
    expect(none).toEqual({ auth: "none" });
    expect(bearer).toEqual({ auth: "bearer" });
    expect(restCacheKey({ ...base, auth: "none" })).not.toBe(
      restCacheKey({ ...base, auth: "bearer" }),
    );
  });

  it("misses when yaml headers differ and canonicalizes names", async () => {
    const cache = new RequestCache();
    const loadA = vi.fn(async () => ({ h: "a" }));
    const loadB = vi.fn(async () => ({ h: "b" }));
    const base = {
      method: "GET",
      url: JSON_URL,
      params: {},
      auth: "none" as const,
    };

    expect(restCacheKey({ ...base, headers: { "X-Foo": "1" } })).toBe(
      restCacheKey({ ...base, headers: { "x-foo": "1" } }),
    );
    expect(restCacheKey({ ...base, headers: { Accept: "a" } })).not.toBe(
      restCacheKey({ ...base, headers: { Accept: "b" } }),
    );

    const [first, second] = await Promise.all([
      cache.get({ ...base, headers: { "X-Custom": "a" } }, loadA),
      cache.get({ ...base, headers: { "X-Custom": "b" } }, loadB),
    ]);
    expect(loadA).toHaveBeenCalledTimes(1);
    expect(loadB).toHaveBeenCalledTimes(1);
    expect(first).toEqual({ h: "a" });
    expect(second).toEqual({ h: "b" });
  });

  it("sorts URL search params into the cache key", () => {
    expect(paramsFromUrl("https://example.com/api.json?b=2&a=1")).toEqual({
      a: "1",
      b: "2",
    });
    expect(
      restCacheKey({
        method: "GET",
        url: JSON_URL,
        params: { b: "2", a: "1" },
        auth: "none",
      }),
    ).toBe(
      restCacheKey({
        method: "GET",
        url: JSON_URL,
        params: { a: "1", b: "2" },
        auth: "none",
      }),
    );
  });
});
