import { describe, expect, it, vi } from "vitest";
import { restCacheKey, WakatimeRequestCache } from "./cache.js";

const STATS_URL = "https://wakatime.com/api/v1/users/current/stats/last_7_days";

describe("WakatimeRequestCache", () => {
  it("coalesces two REST calls that share (method, url, params)", async () => {
    const cache = new WakatimeRequestCache();
    const load = vi.fn(async () => ({ ok: true }));
    const parts = {
      method: "GET",
      url: STATS_URL,
      params: {},
    };

    const [first, second] = await Promise.all([
      cache.rest(parts, load),
      cache.rest({ ...parts }, load),
    ]);
    const third = await cache.rest({ ...parts }, load);

    expect(load).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
    expect(third).toBe(first);
    expect(restCacheKey(parts)).not.toBe("POST /graphql");
  });

  it("misses when the url differs", async () => {
    const cache = new WakatimeRequestCache();
    const loadA = vi.fn(async () => "a");
    const loadB = vi.fn(async () => "b");

    const a = await cache.rest(
      { method: "GET", url: STATS_URL, params: {} },
      loadA,
    );
    const b = await cache.rest(
      {
        method: "GET",
        url: "https://wakapi.dev/api/compat/wakatime/v1/users/current/stats/last_7_days",
        params: {},
      },
      loadB,
    );

    expect(loadA).toHaveBeenCalledTimes(1);
    expect(loadB).toHaveBeenCalledTimes(1);
    expect(a).toBe("a");
    expect(b).toBe("b");
  });
});
