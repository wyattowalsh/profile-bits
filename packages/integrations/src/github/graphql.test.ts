import { afterEach, describe, expect, it, vi } from "vitest";
import { GithubRequestCache } from "./cache.js";
import {
  CONTRIBUTIONS_QUERY,
  fetchContributionTotal,
  fetchRepositoryLanguages,
  GITHUB_GRAPHQL_NODE_BATCH,
  GITHUB_GRAPHQL_URL,
  GithubGraphqlError,
  LANGUAGES_NODES_QUERY,
} from "./graphql.js";
import type { RateLimitLogger } from "./rate-limit.js";

const TOKEN = "ghs_test_token_not_a_secret";

afterEach(() => {
  vi.restoreAllMocks();
});

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function recordingLogger(): {
  logger: RateLimitLogger;
  messages: {
    message: string;
    fields?: { cost: number; operation?: string };
  }[];
} {
  const messages: {
    message: string;
    fields?: { cost: number; operation?: string };
  }[] = [];
  return {
    messages,
    logger: {
      info(message, fields) {
        messages.push({ message, fields });
      },
    },
  };
}

function authorization(init?: RequestInit): string | undefined {
  const headers = init?.headers;
  if (headers instanceof Headers) {
    return headers.get("Authorization") ?? undefined;
  }
  if (headers == null || Array.isArray(headers)) {
    return undefined;
  }
  return headers.Authorization ?? headers.authorization;
}

describe("fetchRepositoryLanguages", () => {
  it("does not fetch without a token", async () => {
    const fetchImpl = vi.fn();
    await expect(
      fetchRepositoryLanguages({
        repositoryIds: ["R_1"],
        token: "",
        cache: new GithubRequestCache(),
        fetchImpl,
      }),
    ).rejects.toBeInstanceOf(GithubGraphqlError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("batches nodes(ids:) of 100 with Authorization", async () => {
    const ids = Array.from({ length: 101 }, (_, i) => `R_${i}`);
    const fetchImpl = vi.fn(async (_input: URL, init?: RequestInit) => {
      expect(authorization(init)).toBe(`Bearer ${TOKEN}`);
      const parsed = JSON.parse(String(init?.body)) as {
        query: string;
        variables: { ids: string[] };
      };
      expect(parsed.query).toBe(LANGUAGES_NODES_QUERY);
      expect(parsed.query).toContain("nodes(ids:");
      expect(parsed.variables.ids.length).toBeLessThanOrEqual(
        GITHUB_GRAPHQL_NODE_BATCH,
      );
      return jsonResponse(200, {
        data: {
          nodes: parsed.variables.ids.map((id) => ({
            id,
            languages: {
              edges: [{ size: 10, node: { name: "TypeScript" } }],
            },
          })),
          rateLimit: { cost: 1, remaining: 5000 },
        },
      });
    });

    const languages = await fetchRepositoryLanguages({
      repositoryIds: ids,
      token: TOKEN,
      cache: new GithubRequestCache(),
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(languages).toEqual([{ name: "TypeScript", bytes: 1010 }]);
    expect(new URL(String(fetchImpl.mock.calls[0]?.[0])).href).toBe(
      GITHUB_GRAPHQL_URL,
    );
  });

  it("treats GraphQL 200 + errors[] as fail-after-backoff", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(200, {
        data: null,
        errors: [{ message: "rate limited" }],
        rateLimit: { cost: 1, remaining: 0 },
      }),
    );
    const { logger, messages } = recordingLogger();
    await expect(
      fetchRepositoryLanguages({
        repositoryIds: ["R_1"],
        token: TOKEN,
        cache: new GithubRequestCache(),
        fetchImpl,
        logger,
      }),
    ).rejects.toMatchObject({ outcome: "fail_after_backoff" });
    expect(messages).toEqual([
      {
        message: "github.graphql.rateLimit.cost",
        fields: { cost: 1, operation: "languages" },
      },
    ]);
    expect(JSON.stringify(messages)).not.toContain(TOKEN);
  });

  it("returns [] and issues zero HTTP when repositoryIds is empty", async () => {
    const fetchImpl = vi.fn();
    await expect(
      fetchRepositoryLanguages({
        repositoryIds: [],
        token: TOKEN,
        cache: new GithubRequestCache(),
        fetchImpl,
      }),
    ).resolves.toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("logs rateLimit.cost on successful nodes batches", async () => {
    const { logger, messages } = recordingLogger();
    const fetchImpl = vi.fn(async () =>
      jsonResponse(200, {
        data: {
          nodes: [
            {
              id: "R_1",
              languages: { edges: [{ size: 10, node: { name: "Go" } }] },
            },
          ],
          rateLimit: { cost: 5, remaining: 4999 },
        },
      }),
    );
    await expect(
      fetchRepositoryLanguages({
        repositoryIds: ["R_1"],
        token: TOKEN,
        cache: new GithubRequestCache(),
        fetchImpl,
        logger,
      }),
    ).resolves.toEqual([{ name: "Go", bytes: 10 }]);
    expect(messages).toEqual([
      {
        message: "github.graphql.rateLimit.cost",
        fields: { cost: 5, operation: "languages" },
      },
    ]);
    expect(JSON.stringify(messages)).not.toContain(TOKEN);
  });

  it("fails after backoff on remaining 0 without errors[] and still logs cost", async () => {
    const { logger, messages } = recordingLogger();
    const fetchImpl = vi.fn(async () =>
      jsonResponse(200, {
        data: { nodes: [] },
        rateLimit: { cost: 1, remaining: 0 },
      }),
    );
    await expect(
      fetchRepositoryLanguages({
        repositoryIds: ["R_1"],
        token: TOKEN,
        cache: new GithubRequestCache(),
        fetchImpl,
        logger,
      }),
    ).rejects.toMatchObject({ outcome: "fail_after_backoff" });
    expect(messages).toEqual([
      {
        message: "github.graphql.rateLimit.cost",
        fields: { cost: 1, operation: "languages" },
      },
    ]);
  });
});

describe("fetchContributionTotal", () => {
  it("skips HTTP when canContributions is false", async () => {
    const fetchImpl = vi.fn();
    await expect(
      fetchContributionTotal({
        login: "octocat",
        token: TOKEN,
        cache: new GithubRequestCache(),
        canContributions: false,
        fetchImpl,
      }),
    ).resolves.toBeUndefined();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("returns totalContributions when capable and logs cost", async () => {
    const { logger, messages } = recordingLogger();
    const fetchImpl = vi.fn(async (_input: URL, init?: RequestInit) => {
      const parsed = JSON.parse(String(init?.body)) as {
        query: string;
        variables: { login: string };
      };
      expect(parsed.query).toBe(CONTRIBUTIONS_QUERY);
      expect(parsed.variables.login).toBe("octocat");
      return jsonResponse(200, {
        data: {
          user: {
            contributionsCollection: {
              contributionCalendar: { totalContributions: 42 },
            },
          },
          rateLimit: { cost: 1, remaining: 5000 },
        },
      });
    });
    await expect(
      fetchContributionTotal({
        login: "octocat",
        token: TOKEN,
        cache: new GithubRequestCache(),
        canContributions: true,
        fetchImpl,
        logger,
      }),
    ).resolves.toBe(42);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(messages).toEqual([
      {
        message: "github.graphql.rateLimit.cost",
        fields: { cost: 1, operation: "contributions" },
      },
    ]);
    expect(JSON.stringify(messages)).not.toContain(TOKEN);
  });
});
