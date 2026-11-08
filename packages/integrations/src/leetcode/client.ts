/**
 * LeetCode public GraphQL. Auth none. Cache key is (query, variables).
 * HTTP 403 / Cloudflare is fail_widget, then HTML scrape through html-scrape.
 * Never a community proxy. Never Playwright. Never fail_job for a blocked card.
 */
import type { HtmlScrapeDump } from "../html-scrape/client.js";
import { scrapeHtml } from "../html-scrape/client.js";
import { leetcodeAuthorizationHeader } from "./auth.js";
import {
  dumpFromHtml,
  type LeetcodeDump,
  parseLeetcodeDump,
} from "./payload.js";

export const LEETCODE_GRAPHQL_URL = "https://leetcode.com/graphql";

export const LEETCODE_QUERY = `query publicProfile($username: String!) {
  matchedUser(username: $username) {
    username
    submitStatsGlobal {
      acSubmissionNum { difficulty count submissions }
    }
    profile {
      ranking
      userAvatar
      realName
      aboutMe
      school
      websites
      countryName
      company
      jobTitle
      skillTags
      reputation
      solutionCount
    }
  }
  allQuestionsCount { difficulty count }
  userContestRanking(username: $username) {
    attendedContestsCount
    rating
    globalRanking
    totalParticipants
    topPercentage
    badge { name }
  }
  userContestRankingHistory(username: $username) {
    attended
    problemsSolved
    rating
    ranking
    contest { title startTime }
  }
  userCalendar(username: $username) {
    activeYears
    streak
    totalActiveDays
    submissionCalendar
  }
  recentAcSubmissionList(username: $username) {
    id
    title
    titleSlug
    timestamp
  }
}`;

export class LeetcodeClientError extends Error {
  override readonly name = "LeetcodeClientError";
  readonly outcome = "fail_widget" as const;
  readonly status?: number;

  constructor(message: string, status?: number, options?: { cause?: unknown }) {
    super(message, options);
    if (status !== undefined) {
      this.status = status;
    }
  }
}

export type LeetcodeFetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export type CreateLeetcodeClientInput = {
  fetch?: LeetcodeFetch;
  scrape?: (url: string) => Promise<HtmlScrapeDump>;
};

export function leetcodeCacheKey(
  query: string,
  variables: Readonly<Record<string, string>>,
): string {
  return JSON.stringify({ query, variables });
}

export function leetcodeProfileUrl(username: string): string {
  return `https://leetcode.com/${encodeURIComponent(username)}`;
}

function isChallenge(
  status: number,
  contentType: string,
  body: string,
): boolean {
  if (status === 403) {
    return true;
  }
  return (
    contentType.includes("text/html") &&
    /just a moment|cf-challenge|cloudflare/i.test(body)
  );
}

function assertLeetcodeHost(url: string): void {
  const parsed = new URL(url);
  if (parsed.hostname !== "leetcode.com" || parsed.protocol !== "https:") {
    throw new LeetcodeClientError("leetcode host must be https://leetcode.com");
  }
}

export function createLeetcodeClient(input: CreateLeetcodeClientInput = {}) {
  const fetchImpl = input.fetch ?? fetch;
  const scrapeImpl = input.scrape ?? scrapeHtml;
  const cache = new Map<string, Promise<LeetcodeDump>>();

  async function load(username: string): Promise<LeetcodeDump> {
    const variables = { username };
    assertLeetcodeHost(LEETCODE_GRAPHQL_URL);
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...leetcodeAuthorizationHeader(undefined),
    };
    if ("Authorization" in headers) {
      throw new LeetcodeClientError("leetcode must not send Authorization");
    }
    const response = await fetchImpl(LEETCODE_GRAPHQL_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ query: LEETCODE_QUERY, variables }),
    });
    const body = await response.text();
    const contentType = response.headers.get("content-type") ?? "";
    if (isChallenge(response.status, contentType, body)) {
      return loadHtml(username);
    }
    if (response.status !== 200) {
      throw new LeetcodeClientError(
        `leetcode HTTP ${response.status} — fail_widget`,
        response.status,
      );
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(body) as unknown;
    } catch (cause: unknown) {
      throw new LeetcodeClientError(
        "leetcode invalid json — fail_widget",
        200,
        {
          cause,
        },
      );
    }
    const root = parsed != null && typeof parsed === "object" ? parsed : null;
    const data =
      root != null && "data" in root
        ? (root as { data: unknown }).data
        : undefined;
    const dump = parseLeetcodeDump(data);
    if (dump == null) {
      throw new LeetcodeClientError(
        "leetcode missing matchedUser — fail_widget",
        200,
      );
    }
    return dump;
  }

  async function loadHtml(username: string): Promise<LeetcodeDump> {
    const url = leetcodeProfileUrl(username);
    assertLeetcodeHost(url);
    let scrape: HtmlScrapeDump;
    try {
      scrape = await scrapeImpl(url);
    } catch (cause: unknown) {
      throw new LeetcodeClientError(
        "leetcode HTML scrape failed — fail_widget",
        403,
        { cause },
      );
    }
    const title = scrape.title ?? "";
    if (/just a moment|cloudflare/i.test(title)) {
      throw new LeetcodeClientError(
        "leetcode HTML challenge — fail_widget",
        scrape.status,
      );
    }
    return dumpFromHtml(username, scrape);
  }

  return {
    async fetchDump(user: string): Promise<LeetcodeDump> {
      const username = user.trim();
      if (username === "") {
        throw new LeetcodeClientError(
          "leetcode missing username — fail_widget",
        );
      }
      const key = leetcodeCacheKey(LEETCODE_QUERY, { username });
      const parsed: unknown = JSON.parse(key);
      const query =
        parsed != null &&
        typeof parsed === "object" &&
        "query" in parsed &&
        typeof parsed.query === "string"
          ? parsed.query
          : "";
      if (key === "POST /graphql" || query !== LEETCODE_QUERY) {
        throw new LeetcodeClientError("leetcode cache key must include query");
      }
      const hit = cache.get(key);
      if (hit !== undefined) {
        return hit;
      }
      const pending = load(username).catch((error: unknown) => {
        cache.delete(key);
        throw error;
      });
      cache.set(key, pending);
      return pending;
    },
  };
}
