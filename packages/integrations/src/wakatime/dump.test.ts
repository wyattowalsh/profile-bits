import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decideWakatimeToken } from "@profile-bits/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createWakatimeClient,
  encodeBasicAuthorization,
  WakatimeClientError,
} from "./client.js";

const TOKEN = "waka_dump_token";
const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
const last7Days = JSON.parse(
  readFileSync(join(fixturesDir, "last_7_days.json"), "utf8"),
) as unknown;

const publicLookup = (async () => [
  { address: "1.1.1.1", family: 4 as const },
]) as typeof import("node:dns/promises").lookup;

const CLOUD_STATS =
  "https://wakatime.com/api/v1/users/current/stats/last_7_days";

const allTimeBody = {
  data: {
    total_seconds: 3600,
    text: "1 hr",
    digital: "1:00",
    is_up_to_date: true,
  },
};

const summariesBody = {
  data: [
    {
      grand_total: { total_seconds: 100, text: "1 min 40 secs" },
      languages: [{ name: "TypeScript", total_seconds: 100, percent: 100 }],
    },
  ],
  start: "2026-08-20",
  end: "2026-08-26",
};

const statusbarBody = {
  data: {
    grand_total: { total_seconds: 50, text: "50 secs" },
    languages: [{ name: "Go", total_seconds: 50, percent: 100 }],
  },
};

const goalsBody = {
  data: [
    {
      id: "goal-1",
      title: "Code 1h/day",
      email: "user@example.com",
      subscribers: [{ email: "other@example.com" }],
    },
  ],
};

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

function extraRouter(): ReturnType<typeof vi.fn> {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(requestUrl(input));
    const path = url.pathname;
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
    throw new Error(`unmocked dump path ${url.href}`);
  });
}

describe("wakatime dump cache", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps unrequested slices when fetchStats include is languages-only", async () => {
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
      limit: 1,
    });

    expect(requestUrl(fetchImpl.mock.calls[0]?.[0] as RequestInfo | URL)).toBe(
      CLOUD_STATS,
    );
    expect(dump.languages).toHaveLength(3);
    expect(dump.languages?.map((row) => row.name)).toEqual([
      "TypeScript",
      "Python",
      "Go",
    ]);
    expect(dump.languages?.[0]).toMatchObject({
      percent: 64.8,
      text: "2 hrs 13 mins",
      digital: "2:13:20",
    });
    expect(dump.editors?.map((row) => row.name)).toEqual(["VS Code", "Neovim"]);
    expect(dump.projects?.map((row) => row.name)).toEqual([
      "profile-bits",
      "other",
    ]);
    expect(dump.operating_systems?.map((row) => row.name)).toEqual([
      "Mac",
      "Linux",
    ]);
    expect(dump.best_day).toEqual({
      date: "2026-08-20",
      text: "2 hrs 10 mins",
      total_seconds: 7800,
    });
    expect(dump.categories?.[0]?.name).toBe("Coding");
    expect(dump.machines?.[0]?.name).toBe("studio");
    expect(dump.dependencies?.[0]?.name).toBe("zod");
    expect(dump).not.toHaveProperty("os");
    expect(dump.all_time_since_today?.text).toBe("1 hr");
    expect(dump.summaries?.end).toBe("2026-08-26");
    expect(dump.statusbar_today?.grand_total.text).toBe("50 secs");
    expect(dump.goals?.[0]?.title).toBe("Code 1h/day");
    expect(JSON.stringify(dump)).not.toContain("@");
    expect(JSON.stringify(dump)).not.toContain(TOKEN);
    expect(dump).not.toHaveProperty("email");
    expect(dump.goals?.[0]).not.toHaveProperty("email");
    expect(dump.goals?.[0]).not.toHaveProperty("subscribers");

    for (const call of fetchImpl.mock.calls) {
      const href = requestUrl(call[0] as RequestInfo | URL);
      expect(href).not.toContain("include");
      expect(href).not.toMatch(/[?&]limit=/);
      expect(href).not.toContain("api_key");
      expect(href).not.toContain("heartbeats");
      expect(href).not.toContain("durations");
      expect(call[1]).toMatchObject({
        headers: {
          Authorization: encodeBasicAuthorization(TOKEN),
        },
      });
    }
  });

  it("does not slice the cached dump when include and limit differ across calls", async () => {
    const fetchImpl = extraRouter();
    const client = createWakatimeClient({
      token: TOKEN,
      apiDomain: "wakatime.com",
      fetch: fetchImpl,
      lookup: publicLookup,
    });
    const languagesOnly = await client.fetchStats({
      range: "last_7_days",
      include: ["languages"],
      limit: 1,
    });
    const defaultInclude = await client.fetchStats({
      range: "last_7_days",
      include: ["languages", "editors"],
      limit: 8,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(5);
    expect(languagesOnly).toEqual(defaultInclude);
    expect(languagesOnly.editors).toHaveLength(2);
    expect(languagesOnly.languages).toHaveLength(3);
  });
});

describe("wakatime dump empty token fail_job when pack is on", () => {
  it.each([undefined, "", "   ", "\t\n"] as const)(
    "fails the job when the pack is on and the token is missing (%j)",
    (token) => {
      expect(decideWakatimeToken({ token, packEnabled: true })).toBe(
        "fail_job",
      );
    },
  );

  it("does not require a token when the pack is absent", () => {
    expect(decideWakatimeToken({ token: undefined, packEnabled: false })).toBe(
      "render",
    );
    expect(decideWakatimeToken({ token: "", packEnabled: false })).toBe(
      "render",
    );
  });

  it.each(["", "   ", "\t\n"] as const)(
    "refuses to construct a client or send HTTP when the token is missing (%j)",
    (token) => {
      const fetchImpl = vi.fn();
      expect(() =>
        createWakatimeClient({
          token,
          apiDomain: "wakatime.com",
          fetch: fetchImpl,
          lookup: publicLookup,
        }),
      ).toThrow(
        expect.objectContaining({
          name: "WakatimeClientError",
          outcome: "fail_job",
          code: "missing_token",
        }),
      );
      expect(fetchImpl).not.toHaveBeenCalled();
    },
  );

  it("does not send unauthenticated requests when construction fail_jobs", () => {
    const fetchImpl = vi.fn();
    expect(() =>
      createWakatimeClient({
        token: "  ",
        apiDomain: "wakatime.com",
        fetch: fetchImpl,
        lookup: publicLookup,
      }),
    ).toThrow(WakatimeClientError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
