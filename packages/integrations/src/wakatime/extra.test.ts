import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { createWakatimeClient, encodeBasicAuthorization } from "./client.js";
import type { ExtraGetResult } from "./extra.js";
import {
  classifyWakatimeExtraHttp,
  extraUrlIsForbidden,
  isWakatimeCloud,
  loadCloudExtras,
  mergeWakatimeDump,
  resolveCloudExtraUrl,
  summariesWindow,
  WAKATIME_CLOUD_CURRENT,
  WAKATIME_CLOUD_EXTRA_PATHS,
} from "./extra.js";
import { WakatimeStatsEnvelopeSchema } from "./payload.js";

const TOKEN = "waka_test_token";
const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
const last7Days = JSON.parse(
  readFileSync(join(fixturesDir, "last_7_days.json"), "utf8"),
) as unknown;

const publicLookup = (async () => [
  { address: "1.1.1.1", family: 4 as const },
]) as typeof import("node:dns/promises").lookup;

const CLOUD_STATS =
  "https://wakatime.com/api/v1/users/current/stats/last_7_days";
const WAKAPI_STATS =
  "https://wakapi.dev/api/compat/wakatime/v1/users/current/stats/last_7_days";
const ALL_TIME = `${WAKATIME_CLOUD_CURRENT}/all_time_since_today`;
const STATUSBAR = `${WAKATIME_CLOUD_CURRENT}/statusbar/today`;
const GOALS = `${WAKATIME_CLOUD_CURRENT}/goals`;
const SUMMARIES = `${WAKATIME_CLOUD_CURRENT}/summaries`;

function jsonResponse(status: number, body: unknown = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof URL) {
    return input.href;
  }
  return input.url;
}

function requestHeaders(init: RequestInit | undefined): Record<string, string> {
  const headers = init?.headers;
  if (headers == null) {
    return {};
  }
  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }
  const record: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === "string") {
      record[key] = value;
    }
  }
  return record;
}

const allTimeBody = {
  data: {
    total_seconds: 3600,
    text: "1 hr",
    digital: "1:00",
    is_up_to_date: true,
    range: {
      start: "2013-01-01T00:00:00Z",
      start_date: "2013-01-01",
      end: "2026-08-27T23:59:59Z",
      end_date: "2026-08-27",
      timezone: "UTC",
    },
  },
};

const summariesBody = {
  data: [
    {
      grand_total: {
        total_seconds: 100,
        text: "1 min 40 secs",
        digital: "0:01:40",
      },
      languages: [
        {
          name: "TypeScript",
          total_seconds: 100,
          percent: 100,
          text: "1 min 40 secs",
        },
      ],
      range: { date: "2026-08-20", timezone: "UTC" },
    },
  ],
  start: "2026-08-20",
  end: "2026-08-26",
  cumulative_total: { total_seconds: 100, text: "1 min 40 secs" },
};

const statusbarBody = {
  data: {
    grand_total: { total_seconds: 50, text: "50 secs", digital: "0:00:50" },
    languages: [
      { name: "Go", total_seconds: 50, percent: 100, text: "50 secs" },
    ],
    range: { date: "2026-08-27", text: "Today", timezone: "UTC" },
  },
};

const goalsBody = {
  data: [
    {
      id: "goal-1",
      title: "Code 1h/day",
      status: "success",
      seconds: 3600,
      email: "user@example.com",
      owner: { display_name: "Ada", email: "ada@example.com" },
      subscribers: [{ email: "other@example.com" }],
    },
  ],
};

function extraRouter(
  overrides: Record<string, (url: URL) => Response> = {},
): ReturnType<typeof vi.fn> {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(requestUrl(input));
    const path = url.pathname;
    if (overrides[path] != null) {
      return overrides[path](url);
    }
    if (path.endsWith("/stats/last_7_days")) {
      return jsonResponse(200, last7Days);
    }
    if (path.endsWith("/all_time_since_today")) {
      return jsonResponse(200, allTimeBody);
    }
    if (path.endsWith("/summaries")) {
      return jsonResponse(200, summariesBody);
    }
    if (path.endsWith("/statusbar/today")) {
      return jsonResponse(200, statusbarBody);
    }
    if (path.endsWith("/goals")) {
      return jsonResponse(200, goalsBody);
    }
    throw new Error(`unmocked extra path ${url.href} ${init?.method ?? ""}`);
  });
}

describe("isWakatimeCloud", () => {
  it("is true only for exact lowercase wakatime.com", () => {
    expect(isWakatimeCloud("wakatime.com")).toBe(true);
    expect(isWakatimeCloud("WakaTime.COM")).toBe(true);
    expect(isWakatimeCloud("wakapi.dev")).toBe(false);
    expect(isWakatimeCloud("api.wakatime.com")).toBe(false);
  });
});

describe("classifyWakatimeExtraHttp", () => {
  it("includes 200 and omits 404 plus insights paywall 402/403", () => {
    expect(classifyWakatimeExtraHttp(200)).toBe("include");
    expect(classifyWakatimeExtraHttp(404)).toBe("omit");
    expect(classifyWakatimeExtraHttp(400)).toBe("omit");
    expect(classifyWakatimeExtraHttp(402)).toBe("omit");
    expect(classifyWakatimeExtraHttp(403)).toBe("omit");
    expect(classifyWakatimeExtraHttp(401)).toBe("fail_run");
    expect(classifyWakatimeExtraHttp(429)).toBe("retry");
    expect(classifyWakatimeExtraHttp(500)).toBe("retry");
  });
});

describe("resolveCloudExtraUrl", () => {
  it("builds Cloud extra URLs under users/current and never query keys", () => {
    expect(WAKATIME_CLOUD_EXTRA_PATHS).toEqual([
      "all_time_since_today",
      "summaries",
      "statusbar/today",
      "goals",
    ]);
    expect(resolveCloudExtraUrl("all_time_since_today").href).toBe(ALL_TIME);
    expect(resolveCloudExtraUrl("statusbar/today").href).toBe(STATUSBAR);
    expect(resolveCloudExtraUrl("goals").href).toBe(GOALS);
    const summaries = resolveCloudExtraUrl("summaries", {
      start: "2026-08-20",
      end: "2026-08-26",
      api_key: "waka_secret",
      key: "waka_secret",
    });
    expect(summaries.href.startsWith(`${SUMMARIES}?`)).toBe(true);
    expect(summaries.searchParams.get("start")).toBe("2026-08-20");
    expect(summaries.searchParams.get("end")).toBe("2026-08-26");
    expect(summaries.searchParams.has("api_key")).toBe(false);
    expect(summaries.searchParams.has("key")).toBe(false);
    expect(summaries.href).not.toContain("heartbeats");
    expect(summaries.href).not.toContain("durations");
    expect(summaries.href).not.toContain("insights");
  });

  it("flags heartbeats, durations, and insights as forbidden extra paths", () => {
    expect(
      extraUrlIsForbidden(
        new URL(`${WAKATIME_CLOUD_CURRENT}/heartbeats?date=2026-08-20`),
      ),
    ).toBe(true);
    expect(
      extraUrlIsForbidden(new URL(`${WAKATIME_CLOUD_CURRENT}/durations`)),
    ).toBe(true);
    expect(
      extraUrlIsForbidden(
        new URL(`${WAKATIME_CLOUD_CURRENT}/insights/stats/last_7_days`),
      ),
    ).toBe(true);
    expect(extraUrlIsForbidden(new URL(STATUSBAR))).toBe(false);
  });
});

describe("summariesWindow", () => {
  it("bounds last_7_days to the stats dump start/end dates", () => {
    const stats = WakatimeStatsEnvelopeSchema.parse(last7Days).data;
    expect(summariesWindow("last_7_days", stats)).toEqual({
      start: "2026-08-20",
      end: "2026-08-26",
    });
  });

  it("computes a bounded window when stats omit start/end", () => {
    const now = new Date("2026-08-27T12:00:00Z");
    expect(summariesWindow("last_7_days", {}, now)).toEqual({
      start: "2026-08-21",
      end: "2026-08-27",
    });
    expect(summariesWindow("last_30_days", {}, now)).toEqual({
      start: "2026-07-29",
      end: "2026-08-27",
    });
    const year = summariesWindow("last_year", {}, now);
    expect(year.end).toBe("2026-08-27");
    expect(year.start).toBe("2025-08-27");
    expect(year.start <= year.end).toBe(true);
  });
});

describe("loadCloudExtras", () => {
  it("parses the four extras and skips heartbeats", async () => {
    const urls: string[] = [];
    const extras = await loadCloudExtras({
      range: "last_7_days",
      stats: WakatimeStatsEnvelopeSchema.parse(last7Days).data,
      get: async (url) => {
        urls.push(url.href);
        const path = url.pathname;
        if (path.endsWith("/all_time_since_today")) {
          return { kind: "ok", body: allTimeBody };
        }
        if (path.endsWith("/summaries")) {
          return { kind: "ok", body: summariesBody };
        }
        if (path.endsWith("/statusbar/today")) {
          return { kind: "ok", body: statusbarBody };
        }
        if (path.endsWith("/goals")) {
          return { kind: "ok", body: goalsBody };
        }
        return { kind: "omit" };
      },
    });

    expect(urls).toHaveLength(4);
    expect(urls.some((href) => href.includes("heartbeats"))).toBe(false);
    expect(urls.some((href) => href.includes("durations"))).toBe(false);
    expect(urls.some((href) => href.includes("insights"))).toBe(false);
    expect(urls.find((href) => href.startsWith(`${SUMMARIES}?`))).toContain(
      "start=2026-08-20",
    );
    expect(urls.find((href) => href.startsWith(`${SUMMARIES}?`))).toContain(
      "end=2026-08-26",
    );
    expect(extras.all_time_since_today?.total_seconds).toBe(3600);
    expect(extras.summaries?.start).toBe("2026-08-20");
    expect(extras.statusbar_today?.grand_total.total_seconds).toBe(50);
    expect(extras.goals?.[0]?.title).toBe("Code 1h/day");
    expect(JSON.stringify(extras)).not.toContain("@");
  });

  it("omits an extra when get returns omit", async () => {
    const extras = await loadCloudExtras({
      range: "last_7_days",
      stats: WakatimeStatsEnvelopeSchema.parse(last7Days).data,
      get: async (url): Promise<ExtraGetResult> => {
        if (url.pathname.endsWith("/goals")) {
          return { kind: "omit" };
        }
        if (url.pathname.endsWith("/all_time_since_today")) {
          return { kind: "ok", body: allTimeBody };
        }
        return { kind: "omit" };
      },
    });
    expect(extras.all_time_since_today?.text).toBe("1 hr");
    expect(extras).not.toHaveProperty("goals");
    expect(extras).not.toHaveProperty("summaries");
  });
});

describe("mergeWakatimeDump", () => {
  it("adds extras without inventing omitted keys", () => {
    const stats = WakatimeStatsEnvelopeSchema.parse(last7Days).data;
    const dump = mergeWakatimeDump(stats, {
      all_time_since_today: {
        total_seconds: 1,
        text: "1 sec",
      },
    });
    expect(dump.total_seconds).toBe(stats.total_seconds);
    expect(dump.all_time_since_today?.text).toBe("1 sec");
    expect(dump).not.toHaveProperty("summaries");
    expect(dump).not.toHaveProperty("statusbar_today");
    expect(dump).not.toHaveProperty("goals");
    expect(dump).not.toHaveProperty("email");
  });
});

describe("createWakatimeClient extra endpoints", () => {
  it("GETs Cloud extras with RFC Basic and no email in the dump", async () => {
    const fetchImpl = extraRouter();
    const client = createWakatimeClient({
      token: TOKEN,
      apiDomain: "wakatime.com",
      fetch: fetchImpl,
      lookup: publicLookup,
    });
    const dump = await client.fetchStats({
      range: "last_7_days",
      include: ["languages"],
      limit: 8,
    });

    const urls = fetchImpl.mock.calls.map((call) =>
      requestUrl(call[0] as RequestInfo | URL),
    );
    expect(urls[0]).toBe(CLOUD_STATS);
    expect(urls).toEqual(
      expect.arrayContaining([
        ALL_TIME,
        STATUSBAR,
        GOALS,
        expect.stringMatching(
          /^https:\/\/wakatime\.com\/api\/v1\/users\/current\/summaries\?/,
        ),
      ]),
    );
    expect(urls).toHaveLength(5);
    expect(urls.some((href) => href.includes("heartbeats"))).toBe(false);
    expect(urls.some((href) => href.includes("durations"))).toBe(false);
    expect(urls.some((href) => href.includes("insights"))).toBe(false);
    expect(urls.some((href) => href.includes("api_key"))).toBe(false);
    expect(urls.some((href) => /[?&]key=/.test(href))).toBe(false);

    const summariesUrl = urls.find((href) => href.includes("/summaries?"));
    expect(summariesUrl).toContain("start=2026-08-20");
    expect(summariesUrl).toContain("end=2026-08-26");

    for (const call of fetchImpl.mock.calls) {
      const headers = requestHeaders(call[1]);
      expect(headers.Authorization).toBe(encodeBasicAuthorization(TOKEN));
      expect(headers.Authorization.startsWith("Basic ")).toBe(true);
      expect(headers.Authorization).not.toMatch(/^Bearer /i);
      expect(headers.Accept).toBe("application/json");
    }

    expect(encodeBasicAuthorization(TOKEN)).toBe(
      `Basic ${Buffer.from(`${TOKEN}:`, "utf8").toString("base64")}`,
    );
    expect(encodeBasicAuthorization(TOKEN)).not.toContain("@");
    expect(dump.all_time_since_today?.total_seconds).toBe(3600);
    expect(dump.summaries?.end).toBe("2026-08-26");
    expect(dump.statusbar_today?.grand_total.text).toBe("50 secs");
    expect(dump.goals?.[0]?.title).toBe("Code 1h/day");
    expect(dump.languages?.[0]?.percent).toBe(64.8);
    expect(JSON.stringify(dump)).not.toContain("@");
    expect(JSON.stringify(dump)).not.toContain(TOKEN);
    expect(dump).not.toHaveProperty("email");
  });

  it("omits Wakapi extras without fail_job and keeps the compat stats path", async () => {
    const fetchImpl = extraRouter();
    const client = createWakatimeClient({
      token: TOKEN,
      apiDomain: "wakapi.dev",
      fetch: fetchImpl,
      lookup: publicLookup,
    });
    const dump = await client.fetchStats({
      range: "last_7_days",
      include: ["languages"],
      limit: 8,
    });
    const urls = fetchImpl.mock.calls.map((call) =>
      requestUrl(call[0] as RequestInfo | URL),
    );
    expect(urls).toEqual([WAKAPI_STATS]);
    expect(dump).not.toHaveProperty("all_time_since_today");
    expect(dump).not.toHaveProperty("summaries");
    expect(dump).not.toHaveProperty("statusbar_today");
    expect(dump).not.toHaveProperty("goals");
    expect(dump.languages).toBeDefined();
  });

  it("omits extra 404 and insights 402 without failing stats", async () => {
    const fetchImpl = extraRouter({
      "/api/v1/users/current/all_time_since_today": () => jsonResponse(404),
      "/api/v1/users/current/summaries": () => jsonResponse(404),
      "/api/v1/users/current/statusbar/today": () => jsonResponse(403),
      "/api/v1/users/current/goals": () => jsonResponse(402),
    });
    const client = createWakatimeClient({
      token: TOKEN,
      apiDomain: "wakatime.com",
      fetch: fetchImpl,
      lookup: publicLookup,
    });
    const dump = await client.fetchStats({
      range: "last_7_days",
      include: ["languages"],
      limit: 1,
    });
    expect(dump.human_readable_total).toBeDefined();
    expect(dump).not.toHaveProperty("all_time_since_today");
    expect(dump).not.toHaveProperty("summaries");
    expect(dump).not.toHaveProperty("statusbar_today");
    expect(dump).not.toHaveProperty("goals");
  });

  it("fails the run when an extra endpoint returns 401", async () => {
    const fetchImpl = extraRouter({
      "/api/v1/users/current/goals": () => jsonResponse(401),
    });
    const client = createWakatimeClient({
      token: TOKEN,
      apiDomain: "wakatime.com",
      fetch: fetchImpl,
      lookup: publicLookup,
    });
    await expect(
      client.fetchStats({
        range: "last_7_days",
        include: ["languages"],
        limit: 8,
      }),
    ).rejects.toMatchObject({
      outcome: "fail_run",
      status: 401,
      code: "http_unauthorized",
    });
  });

  it("retries extra 429 then omits that field", async () => {
    const fetchImpl = extraRouter({
      "/api/v1/users/current/goals": () => jsonResponse(429),
    });
    const client = createWakatimeClient({
      token: TOKEN,
      apiDomain: "wakatime.com",
      fetch: fetchImpl,
      lookup: publicLookup,
      sleep: async () => {},
    });
    const dump = await client.fetchStats({
      range: "last_7_days",
      include: ["languages"],
      limit: 8,
    });
    const goalCalls = fetchImpl.mock.calls.filter((call) =>
      requestUrl(call[0] as RequestInfo | URL).endsWith("/goals"),
    );
    expect(goalCalls).toHaveLength(3);
    expect(dump).not.toHaveProperty("goals");
    expect(dump.all_time_since_today?.text).toBe("1 hr");
  });

  it("caches extra GETs on a same-run hit", async () => {
    const fetchImpl = extraRouter();
    const lookup = vi.fn(publicLookup);
    const client = createWakatimeClient({
      token: TOKEN,
      apiDomain: "wakatime.com",
      fetch: fetchImpl,
      lookup,
    });
    const first = await client.fetchStats({
      range: "last_7_days",
      include: ["languages"],
      limit: 8,
    });
    const second = await client.fetchStats({
      range: "last_7_days",
      include: ["editors"],
      limit: 1,
    });
    expect(second).toEqual(first);
    expect(fetchImpl).toHaveBeenCalledTimes(5);
    expect(lookup).toHaveBeenCalledTimes(1);
  });
});
