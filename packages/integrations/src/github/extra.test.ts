import { decideActionToken } from "@profile-bits/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GithubRequestCache } from "./cache.js";
import { createGithubClient } from "./client.js";
import {
  fetchGithubExtraEndpoints,
  fetchGithubPinnedItems,
  GITHUB_PUBLIC_EVENTS_PER_PAGE,
  PINNED_ITEMS_QUERY,
  parseGithubPinnedItems,
  parseGithubPublicEvents,
} from "./extra.js";
import { CONTRIBUTIONS_QUERY, LANGUAGES_NODES_QUERY } from "./graphql.js";
import type { GithubRestFetch } from "./rest.js";

const OCTOCAT = "octocat";
const PAT = "ghp_test_token_not_a_secret";
const INSTALLATION = "ghs_test_token_not_a_secret";
const EVENTS_PATH = `/users/${OCTOCAT}/events/public`;

afterEach(() => {
  vi.restoreAllMocks();
});

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function pathnameOf(input: URL): string {
  return new URL(input.href).pathname;
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

function mockFetch(handler: GithubRestFetch) {
  return vi.fn(handler);
}

function parseGraphqlBody(init?: RequestInit): {
  query: string;
  variables: Record<string, unknown>;
} {
  const parsed = JSON.parse(String(init?.body)) as {
    query: string;
    variables?: Record<string, unknown>;
  };
  return { query: parsed.query, variables: parsed.variables ?? {} };
}

function pinnedGraphqlBody(
  nodes: unknown[] = [pinnedRepositoryNode()],
): unknown {
  return {
    data: {
      user: {
        pinnedItems: { nodes },
      },
    },
    rateLimit: { cost: 1, remaining: 5000 },
  };
}

function pinnedRepositoryNode() {
  return {
    __typename: "Repository",
    name: "Hello-World",
    nameWithOwner: `${OCTOCAT}/Hello-World`,
    description: "My first repository",
    url: `https://github.com/${OCTOCAT}/Hello-World`,
    stargazerCount: 80,
    forkCount: 9,
    isPrivate: false,
    primaryLanguage: { name: "TypeScript", color: "#3178c6" },
  };
}

function publicEventJson() {
  return {
    id: "123",
    type: "PushEvent",
    actor: { login: OCTOCAT },
    repo: { name: `${OCTOCAT}/Hello-World` },
    public: true,
    created_at: "2011-01-25T18:44:36Z",
  };
}

function extraFetch(handler?: {
  pinnedStatus?: number;
  pinnedBody?: unknown;
  eventsStatus?: number;
  eventsBody?: unknown;
}) {
  return mockFetch(async (input, init) => {
    expect(authorization(init)).toBe(`Bearer ${PAT}`);
    const path = pathnameOf(input);
    if (path === "/graphql") {
      const { query, variables } = parseGraphqlBody(init);
      expect(query).toBe(PINNED_ITEMS_QUERY);
      expect(variables.login).toBe(OCTOCAT);
      return jsonResponse(
        handler?.pinnedStatus ?? 200,
        handler?.pinnedBody ?? pinnedGraphqlBody(),
      );
    }
    if (path === EVENTS_PATH) {
      return jsonResponse(
        handler?.eventsStatus ?? 200,
        handler?.eventsBody ?? [publicEventJson()],
      );
    }
    throw new Error(`unexpected extra ${input.href}`);
  });
}

describe("parseGithubPinnedItems", () => {
  it("parses repository and gist nodes without inventing missing counts as 0", () => {
    const parsed = parseGithubPinnedItems(
      pinnedGraphqlBody([
        pinnedRepositoryNode(),
        {
          __typename: "Repository",
          name: "Spoon-Knife",
          nameWithOwner: `${OCTOCAT}/Spoon-Knife`,
          url: `https://github.com/${OCTOCAT}/Spoon-Knife`,
        },
        {
          __typename: "Gist",
          name: "gistid",
          description: "notes",
          url: "https://gist.github.com/gistid",
        },
        null,
      ]),
    );
    expect(parsed).toEqual([
      {
        kind: "repository",
        name: "Hello-World",
        nameWithOwner: `${OCTOCAT}/Hello-World`,
        description: "My first repository",
        url: `https://github.com/${OCTOCAT}/Hello-World`,
        stargazerCount: 80,
        forkCount: 9,
        isPrivate: false,
        primaryLanguage: { name: "TypeScript", color: "#3178c6" },
      },
      {
        kind: "repository",
        name: "Spoon-Knife",
        nameWithOwner: `${OCTOCAT}/Spoon-Knife`,
        description: null,
        url: `https://github.com/${OCTOCAT}/Spoon-Knife`,
      },
      {
        kind: "gist",
        name: "gistid",
        description: "notes",
        url: "https://gist.github.com/gistid",
      },
    ]);
    expect(parsed?.[1]).not.toHaveProperty("stargazerCount");
    expect(parsed?.[1]).not.toHaveProperty("forkCount");
  });

  it("omits when user or pinnedItems is missing rather than inventing 0", () => {
    expect(parseGithubPinnedItems({ data: { user: null } })).toBeUndefined();
    expect(parseGithubPinnedItems({ data: { user: {} } })).toBeUndefined();
    expect(parseGithubPinnedItems(pinnedGraphqlBody([]))).toEqual([]);
  });
});

describe("parseGithubPublicEvents", () => {
  it("parses public event envelopes and skips entries without id/type", () => {
    expect(parseGithubPublicEvents([publicEventJson(), { id: "x" }])).toEqual([
      {
        id: "123",
        type: "PushEvent",
        actorLogin: OCTOCAT,
        repoName: `${OCTOCAT}/Hello-World`,
        public: true,
        createdAt: "2011-01-25T18:44:36Z",
      },
    ]);
  });

  it("omits a non-array body and keeps an empty fetched list", () => {
    expect(parseGithubPublicEvents({ message: "nope" })).toBeUndefined();
    expect(parseGithubPublicEvents([])).toEqual([]);
  });
});

describe("fetchGithubExtraEndpoints", () => {
  it("fails the job on empty/whitespace token and never fetches (never unauth)", async () => {
    const fetchImpl = mockFetch(async () => {
      throw new Error("fetch must not run for a missing token");
    });
    for (const token of ["", "   ", "\t\n", undefined, null] as const) {
      fetchImpl.mockClear();
      await expect(
        fetchGithubExtraEndpoints({
          login: OCTOCAT,
          token,
          cache: new GithubRequestCache(),
          fetchImpl,
        }),
      ).rejects.toMatchObject({
        name: "GithubRestError",
        outcome: "fail_job",
      });
      expect(decideActionToken(token)).toBe("fail_job");
      expect(fetchImpl).not.toHaveBeenCalled();
    }
  });

  it("sends Authorization on pinned GraphQL and public events REST", async () => {
    const fetchImpl = extraFetch();
    const dump = await fetchGithubExtraEndpoints({
      login: OCTOCAT,
      token: PAT,
      cache: new GithubRequestCache(),
      fetchImpl,
    });

    expect(dump.pinnedItems).toEqual([
      {
        kind: "repository",
        name: "Hello-World",
        nameWithOwner: `${OCTOCAT}/Hello-World`,
        description: "My first repository",
        url: `https://github.com/${OCTOCAT}/Hello-World`,
        stargazerCount: 80,
        forkCount: 9,
        isPrivate: false,
        primaryLanguage: { name: "TypeScript", color: "#3178c6" },
      },
    ]);
    expect(dump.publicEvents).toEqual([
      {
        id: "123",
        type: "PushEvent",
        actorLogin: OCTOCAT,
        repoName: `${OCTOCAT}/Hello-World`,
        public: true,
        createdAt: "2011-01-25T18:44:36Z",
      },
    ]);
    const paths = fetchImpl.mock.calls.map(([input]) => pathnameOf(input));
    expect(paths).toContain("/graphql");
    expect(paths).toContain(EVENTS_PATH);
    expect(paths.some((path) => path.includes("/languages"))).toBe(false);
    expect(paths.some((path) => path === "/user")).toBe(false);
    for (const [, init] of fetchImpl.mock.calls) {
      expect(authorization(init)).toBe(`Bearer ${PAT}`);
    }
    const eventsUrl = fetchImpl.mock.calls.find(
      ([input]) => pathnameOf(input) === EVENTS_PATH,
    )?.[0];
    expect(new URL(eventsUrl ?? "").searchParams.get("per_page")).toBe(
      String(GITHUB_PUBLIC_EVENTS_PER_PAGE),
    );
  });

  it("omits extra fields on 403/404 and MUST NOT invent 0", async () => {
    const fetchImpl = extraFetch({
      pinnedStatus: 403,
      pinnedBody: { message: "Resource not accessible by integration" },
      eventsStatus: 404,
      eventsBody: { message: "Not Found" },
    });
    const dump = await fetchGithubExtraEndpoints({
      login: OCTOCAT,
      token: PAT,
      cache: new GithubRequestCache(),
      fetchImpl,
    });
    expect(dump).toEqual({});
    expect(dump).not.toHaveProperty("pinnedItems");
    expect(dump).not.toHaveProperty("publicEvents");
    expect(dump).not.toHaveProperty("stargazerCount");
    expect(JSON.stringify(dump)).not.toContain(":0");
  });

  it("omits pinned items when GraphQL returns INSUFFICIENT_SCOPES errors", async () => {
    const fetchImpl = extraFetch({
      pinnedBody: {
        data: { user: null },
        errors: [
          {
            type: "INSUFFICIENT_SCOPES",
            message: "Your token has not been granted the required scopes",
          },
        ],
        rateLimit: { cost: 1, remaining: 5000 },
      },
    });
    const dump = await fetchGithubExtraEndpoints({
      login: OCTOCAT,
      token: PAT,
      cache: new GithubRequestCache(),
      fetchImpl,
    });
    expect(dump).not.toHaveProperty("pinnedItems");
    expect(dump.publicEvents).toHaveLength(1);
  });

  it("does not treat the identity probe as the extra dump source", async () => {
    const fetchImpl = extraFetch();
    const dump = await fetchGithubPinnedItems({
      login: OCTOCAT,
      token: PAT,
      cache: new GithubRequestCache(),
      fetchImpl,
    });
    expect(dump?.[0]?.name).toBe("Hello-World");
    expect(dump).not.toEqual({ login: OCTOCAT });
    const graphql = fetchImpl.mock.calls.find(
      ([input]) => pathnameOf(input) === "/graphql",
    );
    expect(parseGraphqlBody(graphql?.[1]).variables.login).toBe(OCTOCAT);
  });

  it("allows a user named languages and never calls REST /languages", async () => {
    const login = "languages";
    const fetchImpl = mockFetch(async (input, init) => {
      expect(authorization(init)).toBe(`Bearer ${PAT}`);
      const path = pathnameOf(input);
      expect(path.includes("/repos/") && path.endsWith("/languages")).toBe(
        false,
      );
      if (path === "/graphql") {
        return jsonResponse(200, pinnedGraphqlBody([]));
      }
      if (path === `/users/${login}/events/public`) {
        return jsonResponse(200, []);
      }
      throw new Error(`unexpected ${input.href}`);
    });
    const dump = await fetchGithubExtraEndpoints({
      login,
      token: PAT,
      cache: new GithubRequestCache(),
      fetchImpl,
    });
    expect(dump.pinnedItems).toEqual([]);
    expect(dump.publicEvents).toEqual([]);
    expect(
      fetchImpl.mock.calls.some(([input]) =>
        pathnameOf(input).includes("/repos/"),
      ),
    ).toBe(false);
  });

  it("coalesces extra GraphQL by (query, variables) and REST by (method, url, params)", async () => {
    const fetchImpl = extraFetch();
    const cache = new GithubRequestCache();
    const first = await fetchGithubExtraEndpoints({
      login: OCTOCAT,
      token: PAT,
      cache,
      fetchImpl,
    });
    const second = await fetchGithubExtraEndpoints({
      login: OCTOCAT,
      token: PAT,
      cache,
      fetchImpl,
    });
    expect(second).toEqual(first);
    expect(
      fetchImpl.mock.calls.filter(
        ([input]) => pathnameOf(input) === "/graphql",
      ),
    ).toHaveLength(1);
    expect(
      fetchImpl.mock.calls.filter(
        ([input]) => pathnameOf(input) === EVENTS_PATH,
      ),
    ).toHaveLength(1);
  });

  it("omits public events when REST is 401 and still returns pinned items", async () => {
    const fetchImpl = extraFetch({
      eventsStatus: 401,
      eventsBody: { message: "Bad credentials" },
    });
    const dump = await fetchGithubExtraEndpoints({
      login: OCTOCAT,
      token: PAT,
      cache: new GithubRequestCache(),
      fetchImpl,
    });
    expect(dump.pinnedItems).toHaveLength(1);
    expect(dump).not.toHaveProperty("publicEvents");
  });
});

describe("createGithubClient extra endpoints", () => {
  function octocatUser() {
    return {
      login: OCTOCAT,
      id: 1,
      node_id: "U_octocat",
      type: "User",
      followers: 10,
      following: 2,
      public_repos: 3,
      public_gists: 1,
    };
  }

  function repo() {
    return {
      id: 1,
      node_id: "R_1",
      name: "Hello-World",
      full_name: `${OCTOCAT}/Hello-World`,
      fork: false,
      archived: false,
      private: false,
      stargazers_count: 80,
      forks_count: 9,
    };
  }

  function languagesGraphqlBody(ids: readonly string[]): unknown {
    return {
      data: {
        nodes: ids.map((id) => ({
          id,
          languages: {
            edges: [{ size: 1, node: { name: "TypeScript" } }],
          },
        })),
        rateLimit: { cost: 1, remaining: 5000 },
      },
    };
  }

  it("dumps pinned items and public events on the stats crawl and never REST /languages", async () => {
    const fetchImpl = mockFetch(async (input, init) => {
      expect(authorization(init)).toBe(`Bearer ${PAT}`);
      const path = pathnameOf(input);
      if (path === "/user" || path === `/users/${OCTOCAT}`) {
        return jsonResponse(200, octocatUser());
      }
      if (path === `/users/${OCTOCAT}/repos`) {
        return jsonResponse(200, [repo()]);
      }
      if (path === EVENTS_PATH) {
        return jsonResponse(200, [publicEventJson()]);
      }
      if (path === "/graphql") {
        const { query, variables } = parseGraphqlBody(init);
        if (query === PINNED_ITEMS_QUERY) {
          expect(variables.login).toBe(OCTOCAT);
          return jsonResponse(200, pinnedGraphqlBody());
        }
        if (query === LANGUAGES_NODES_QUERY) {
          const ids = Array.isArray(variables.ids)
            ? variables.ids.filter((id): id is string => typeof id === "string")
            : [];
          return jsonResponse(200, languagesGraphqlBody(ids));
        }
        if (query === CONTRIBUTIONS_QUERY) {
          return jsonResponse(200, {
            data: {
              user: {
                contributionsCollection: {
                  contributionCalendar: {
                    totalContributions: 42,
                    weeks: [],
                  },
                },
              },
              rateLimit: { cost: 1, remaining: 5000 },
            },
          });
        }
        throw new Error(`unexpected GraphQL ${query.slice(0, 40)}`);
      }
      throw new Error(`unexpected ${input.href}`);
    });
    const client = createGithubClient({
      token: PAT,
      configuredUser: OCTOCAT,
      fetch: fetchImpl,
      cache: new GithubRequestCache(),
    });
    const payload = await client.loadPayload({
      user: OCTOCAT,
      widget: "stats",
      includePrivate: false,
      includeForks: false,
      includeArchived: false,
    });
    expect(payload.pinnedItems?.[0]?.nameWithOwner).toBe(
      `${OCTOCAT}/Hello-World`,
    );
    expect(payload.publicEvents?.[0]?.type).toBe("PushEvent");
    expect(payload.languages).toEqual([{ name: "TypeScript", bytes: 1 }]);
    expect(
      fetchImpl.mock.calls.some(([input]) =>
        pathnameOf(input).includes("/languages"),
      ),
    ).toBe(false);
    for (const [, init] of fetchImpl.mock.calls) {
      expect(authorization(init)).toBeDefined();
    }
  });

  it("omits extra fields without capability and still returns the crawl dump", async () => {
    const fetchImpl = mockFetch(async (input, init) => {
      expect(authorization(init)).toBe(`Bearer ${INSTALLATION}`);
      const path = pathnameOf(input);
      if (path === "/user" || path === `/users/${OCTOCAT}`) {
        return jsonResponse(200, octocatUser());
      }
      if (path === `/users/${OCTOCAT}/repos`) {
        return jsonResponse(200, [repo()]);
      }
      if (path === EVENTS_PATH) {
        return jsonResponse(403, {
          message: "Resource not accessible by integration",
        });
      }
      if (path === "/graphql") {
        const { query, variables } = parseGraphqlBody(init);
        if (query === PINNED_ITEMS_QUERY) {
          return jsonResponse(200, {
            data: { user: null },
            errors: [{ type: "FORBIDDEN", message: "not allowed" }],
          });
        }
        if (query === LANGUAGES_NODES_QUERY) {
          const ids = Array.isArray(variables.ids)
            ? variables.ids.filter((id): id is string => typeof id === "string")
            : [];
          return jsonResponse(200, languagesGraphqlBody(ids));
        }
        throw new Error(`unexpected GraphQL ${query.slice(0, 40)}`);
      }
      throw new Error(`unexpected ${input.href}`);
    });
    const client = createGithubClient({
      token: INSTALLATION,
      configuredUser: OCTOCAT,
      fetch: fetchImpl,
      cache: new GithubRequestCache(),
    });
    const payload = await client.loadPayload({
      user: OCTOCAT,
      widget: "stats",
      includePrivate: false,
      includeForks: false,
      includeArchived: false,
    });
    expect(payload.repositoryIds).toEqual(["R_1"]);
    expect(payload.languages).toEqual([{ name: "TypeScript", bytes: 1 }]);
    expect(payload).not.toHaveProperty("pinnedItems");
    expect(payload).not.toHaveProperty("publicEvents");
    expect(payload).not.toHaveProperty("contributions");
    expect(client.capabilities.canContributions).toBe(false);
  });

  it("skips extra endpoints for demo and repo widgets", async () => {
    const fetchImpl = mockFetch(async (input, init) => {
      expect(authorization(init)).toBe(`Bearer ${PAT}`);
      const path = pathnameOf(input);
      if (path === "/user") {
        return jsonResponse(200, octocatUser());
      }
      if (path === `/repos/${OCTOCAT}/Hello-World`) {
        return jsonResponse(200, {
          full_name: `${OCTOCAT}/Hello-World`,
          name: "Hello-World",
          description: "My first repository",
          html_url: `https://github.com/${OCTOCAT}/Hello-World`,
          stargazers_count: 80,
          forks_count: 9,
          subscribers_count: 42,
          open_issues_count: 3,
          language: "TypeScript",
          license: { spdx_id: "MIT" },
          owner: { login: OCTOCAT, avatar_url: "https://example.test/a.png" },
        });
      }
      if (path === EVENTS_PATH || path === "/graphql") {
        throw new Error(`demo/repo must not call extra ${path}`);
      }
      throw new Error(`unexpected ${input.href}`);
    });
    const client = createGithubClient({
      token: PAT,
      configuredUser: OCTOCAT,
      fetch: fetchImpl,
      cache: new GithubRequestCache(),
    });
    const demo = await client.loadPayload({
      user: OCTOCAT,
      widget: "demo",
      includePrivate: false,
      includeForks: false,
      includeArchived: false,
    });
    expect(demo).not.toHaveProperty("pinnedItems");
    expect(demo).not.toHaveProperty("publicEvents");
    const repoPayload = await client.loadPayload({
      user: OCTOCAT,
      widget: "repo",
      repo: `${OCTOCAT}/Hello-World`,
      includePrivate: false,
      includeForks: false,
      includeArchived: false,
    });
    expect(repoPayload).not.toHaveProperty("pinnedItems");
    expect(repoPayload.repository?.name).toBe("Hello-World");
  });

  it("still fail_job at the client when the token is empty", () => {
    const fetchImpl = mockFetch(async () => {
      throw new Error("unauth extra must not run");
    });
    expect(() =>
      createGithubClient({
        token: "",
        configuredUser: OCTOCAT,
        fetch: fetchImpl,
      }),
    ).toThrow(
      expect.objectContaining({
        name: "GithubClientError",
        outcome: "fail_job",
      }),
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
