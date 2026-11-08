import { describe, expect, it, vi } from "vitest";
import type { HtmlScrapeDump } from "../html-scrape/parse.js";
import {
  createLeetcodeClient,
  LEETCODE_GRAPHQL_URL,
  LEETCODE_QUERY,
  leetcodeCacheKey,
} from "./client.js";

const DUMP = {
  data: {
    matchedUser: {
      username: "octo",
      submitStatsGlobal: {
        acSubmissionNum: [{ difficulty: "All", count: 12, submissions: 20 }],
      },
    },
    allQuestionsCount: [{ difficulty: "All", count: 3000 }],
    userCalendar: {
      activeYears: [2026],
      streak: 2,
      totalActiveDays: 4,
      submissionCalendar: '{"1700000000":1}',
      extra: true,
    },
    recentAcSubmissionList: [
      { id: "1", title: "Two Sum", titleSlug: "two-sum", timestamp: "1" },
    ],
    unexpected: { keep: true },
  },
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function emptyScrape(): HtmlScrapeDump {
  return {
    url: "https://leetcode.com/octo",
    status: 200,
    contentType: "text/html",
    title: "Octo",
    description: "solver",
    canonical: null,
    lang: null,
    meta: {},
    openGraph: { "og:image": "https://img.example/a.png" },
    twitter: {},
    jsonLd: [],
    headings: [],
  };
}

describe("leetcode client", () => {
  it("POSTs GraphQL with variables and no Authorization", async () => {
    const fetchImpl = vi.fn(
      async (_input: string | URL | Request, init?: RequestInit) => {
        expect(String(_input)).toBe(LEETCODE_GRAPHQL_URL);
        expect(init?.method).toBe("POST");
        const headers = new Headers(init?.headers);
        expect(headers.get("Authorization")).toBeNull();
        const body = JSON.parse(String(init?.body)) as {
          query: string;
          variables: { username: string };
        };
        expect(body.query).toBe(LEETCODE_QUERY);
        expect(body.variables).toEqual({ username: "octo" });
        expect(LEETCODE_GRAPHQL_URL).not.toContain("octo");
        return jsonResponse(200, DUMP);
      },
    );
    const client = createLeetcodeClient({
      fetch: fetchImpl,
      scrape: vi.fn(),
    });
    const dump = await client.fetchDump(" octo ");
    expect(dump.matchedUser).toMatchObject({ username: "octo" });
    expect(dump.unexpected).toEqual({ keep: true });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("caches on (query, variables), not POST /graphql", async () => {
    const key = leetcodeCacheKey(LEETCODE_QUERY, { username: "octo" });
    expect(key).not.toBe("POST /graphql");
    expect(key).toContain("octo");
    expect(key).toContain("publicProfile");
    const fetchImpl = vi.fn(async () => jsonResponse(200, DUMP));
    const client = createLeetcodeClient({ fetch: fetchImpl });
    await client.fetchDump("octo");
    await client.fetchDump("octo");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("maps HTTP 403 to fail_widget after the HTML fallback fails", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response("cf-challenge", {
          status: 403,
          headers: { "content-type": "text/html" },
        }),
    );
    const client = createLeetcodeClient({
      fetch: fetchImpl,
      scrape: vi.fn(async () => {
        throw new Error("ssrf");
      }),
    });
    await expect(client.fetchDump("octo")).rejects.toMatchObject({
      outcome: "fail_widget",
    });
    await expect(client.fetchDump("octo")).rejects.not.toMatchObject({
      outcome: "fail_job",
    });
  });

  it("maps a successful scrape into the same dump and skips scrape on GraphQL 200", async () => {
    const scrape = vi.fn(async () => emptyScrape());
    const blocked = createLeetcodeClient({
      fetch: vi.fn(
        async () =>
          new Response("Just a moment", {
            status: 403,
            headers: { "content-type": "text/html" },
          }),
      ),
      scrape,
    });
    const dumped = await blocked.fetchDump("octo");
    expect(scrape).toHaveBeenCalledWith("https://leetcode.com/octo");
    expect(dumped.matchedUser).toMatchObject({
      username: "octo",
      profile: { realName: "Octo", userAvatar: "https://img.example/a.png" },
    });

    const scrapeAgain = vi.fn();
    const ok = createLeetcodeClient({
      fetch: vi.fn(async () => jsonResponse(200, DUMP)),
      scrape: scrapeAgain,
    });
    await ok.fetchDump("octo");
    expect(scrapeAgain).not.toHaveBeenCalled();
  });

  it("fails the widget on an empty username without sending", async () => {
    const fetchImpl = vi.fn();
    const client = createLeetcodeClient({ fetch: fetchImpl });
    await expect(client.fetchDump("  ")).rejects.toMatchObject({
      outcome: "fail_widget",
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("fails the widget when matchedUser is null", async () => {
    const client = createLeetcodeClient({
      fetch: vi.fn(async () =>
        jsonResponse(200, { data: { matchedUser: null, extra: 1 } }),
      ),
    });
    await expect(client.fetchDump("octo")).rejects.toMatchObject({
      outcome: "fail_widget",
    });
  });
});
