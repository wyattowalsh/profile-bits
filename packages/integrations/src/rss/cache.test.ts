import { describe, expect, it, vi } from "vitest";
import { RssRequestCache, rssCacheKey } from "./cache.js";

const FEED_URL = "https://example.com/feed.xml";
const FEED_PARAMS = {
  format: "atom",
  page: "1",
} as const;

describe("RssRequestCache", () => {
  it("keys cache entries by (method, url, params)", () => {
    const parts = {
      method: "GET",
      url: FEED_URL,
      params: { ...FEED_PARAMS },
    };
    expect(rssCacheKey(parts)).toBe(
      rssCacheKey({
        method: "GET",
        url: FEED_URL,
        params: { page: "1", format: "atom" },
      }),
    );
    expect(rssCacheKey(parts)).not.toBe(
      rssCacheKey({
        method: "GET",
        url: FEED_URL,
        params: { ...FEED_PARAMS, page: "2" },
      }),
    );
  });

  it("coalesces in-flight loads that share (method, url, params)", async () => {
    const cache = new RssRequestCache();
    let resolveLoad: ((value: string) => void) | undefined;
    const load = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveLoad = resolve;
        }),
    );
    const parts = {
      method: "GET",
      url: FEED_URL,
      params: { ...FEED_PARAMS },
    };

    const first = cache.get(parts, load);
    const second = cache.get({ ...parts }, load);
    expect(load).toHaveBeenCalledTimes(1);

    resolveLoad?.("feed-body");
    expect(await first).toBe("feed-body");
    expect(await second).toBe("feed-body");
    expect(await cache.get(parts, load)).toBe("feed-body");
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("keeps a run-scoped Map (instances do not share entries)", async () => {
    const firstCache = new RssRequestCache();
    const secondCache = new RssRequestCache();
    const loadA = vi.fn(async () => "a");
    const loadB = vi.fn(async () => "b");
    const parts = {
      method: "GET",
      url: FEED_URL,
      params: { ...FEED_PARAMS },
    };

    expect(await firstCache.get(parts, loadA)).toBe("a");
    expect(await secondCache.get(parts, loadB)).toBe("b");
    expect(loadA).toHaveBeenCalledTimes(1);
    expect(loadB).toHaveBeenCalledTimes(1);
  });
});
