import {
  classifyGithubHttp,
  decideActionToken,
  decideIncludePrivate,
  type RunLogEvent,
} from "@profile-bits/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GithubRequestCache } from "./cache.js";
import {
  createGithubClient,
  GITHUB_PROBE_URL,
  GithubClientError,
  inferGithubTokenClass,
} from "./client.js";
import {
  CONTRIBUTIONS_QUERY,
  GITHUB_GRAPHQL_NODE_BATCH,
  LANGUAGES_NODES_QUERY,
} from "./graphql.js";
import { classifyGithubRateLimit } from "./rate-limit.js";
import { GITHUB_API_ORIGIN, type GithubRestFetch } from "./rest.js";

const OCTOCAT = "octocat";
const HUBOT = "hubot";
const PAT = "ghp_test_token_not_a_secret";
const INSTALLATION = "ghs_test_token_not_a_secret";

const AUTH_REPOS_URL = `${GITHUB_API_ORIGIN}/user/repos`;

afterEach(() => {
  vi.restoreAllMocks();
});

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function octocatUser(type = "User") {
  return {
    login: OCTOCAT,
    id: 1,
    node_id: "U_octocat",
    type,
    followers: 10,
    following: 2,
    public_repos: 3,
    public_gists: 1,
  };
}

function repo(index: number) {
  return {
    id: index,
    node_id: `R_${index}`,
    name: `repo-${index}`,
    full_name: `${OCTOCAT}/repo-${index}`,
    fork: false,
    archived: false,
    private: false,
    stargazers_count: index,
    forks_count: 0,
  };
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

function payloadInput(
  overrides: Partial<{
    user: string;
    widget: string;
    repo: string;
    includePrivate: boolean;
    includeForks: boolean;
    includeArchived: boolean;
  }> = {},
) {
  return {
    user: OCTOCAT,
    widget: "stats",
    includePrivate: false,
    includeForks: false,
    includeArchived: false,
    ...overrides,
  };
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

function graphqlLanguageIds(variables: Record<string, unknown>): string[] {
  const ids = variables.ids;
  if (!Array.isArray(ids)) {
    return [];
  }
  return ids.filter((id): id is string => typeof id === "string");
}

function languagesGraphqlBody(ids: readonly string[], bytes = 1): unknown {
  return {
    data: {
      nodes: ids.map((id) => ({
        id,
        languages: {
          edges: [{ size: bytes, node: { name: "TypeScript" } }],
        },
      })),
      rateLimit: { cost: 1, remaining: 5000 },
    },
  };
}

function githubRepositoryJson() {
  return {
    full_name: `${OCTOCAT}/Hello-World`,
    name: "Hello-World",
    description: "My first repository",
    html_url: `https://github.com/${OCTOCAT}/Hello-World`,
    stargazers_count: 80,
    forks_count: 9,
    subscribers_count: 42,
    open_issues_count: 3,
    language: "TypeScript",
    license: { spdx_id: "MIT", name: "MIT License" },
    owner: {
      login: OCTOCAT,
      avatar_url: "https://avatars.githubusercontent.com/u/1?v=4",
    },
  };
}

function contributionsGraphqlBody(total = 42): unknown {
  return {
    data: {
      user: {
        contributionsCollection: {
          contributionCalendar: { totalContributions: total },
        },
      },
      rateLimit: { cost: 1, remaining: 5000 },
    },
  };
}

function mockGraphqlOk(init?: RequestInit): Response {
  const { query, variables } = parseGraphqlBody(init);
  if (query === LANGUAGES_NODES_QUERY) {
    return jsonResponse(
      200,
      languagesGraphqlBody(graphqlLanguageIds(variables)),
    );
  }
  if (query === CONTRIBUTIONS_QUERY) {
    return jsonResponse(200, contributionsGraphqlBody());
  }
  throw new Error(`unexpected GraphQL query: ${query.slice(0, 80)}`);
}

function graphqlCalls(
  calls: readonly [URL, RequestInit | undefined][],
): [URL, RequestInit | undefined][] {
  return calls.filter(([input]) => pathnameOf(input) === "/graphql");
}

function publicFetch(token: string) {
  return mockFetch(async (input, init) => {
    expect(authorization(init)).toBe(`Bearer ${token}`);
    const path = pathnameOf(input);
    if (path === "/user") {
      return jsonResponse(200, octocatUser());
    }
    if (path === `/users/${OCTOCAT}`) {
      return jsonResponse(200, octocatUser());
    }
    if (path === `/users/${OCTOCAT}/repos`) {
      return jsonResponse(200, [repo(1)]);
    }
    if (path === "/graphql") {
      return mockGraphqlOk(init);
    }
    return jsonResponse(404, { message: "Not Found" });
  });
}

describe("inferGithubTokenClass", () => {
  it("maps PAT prefixes to user_pat", () => {
    expect(inferGithubTokenClass("ghp_abc")).toBe("user_pat");
    expect(inferGithubTokenClass("github_pat_abc")).toBe("user_pat");
    expect(inferGithubTokenClass("gho_abc")).toBe("user_pat");
  });

  it("maps ghu_ to github_app_install and ghs_ to actions_installation", () => {
    expect(inferGithubTokenClass("ghu_app")).toBe("github_app_install");
    expect(inferGithubTokenClass(INSTALLATION)).toBe("actions_installation");
    expect(
      inferGithubTokenClass(INSTALLATION, {
        login: "profile-bits[bot]",
        type: "Bot",
      }),
    ).toBe("github_app_install");
  });
});

describe("createGithubClient", () => {
  it("fails like isMissingToken on empty/whitespace token and never fetches", () => {
    const fetchImpl = mockFetch(async () => {
      throw new Error("fetch must not run for a missing token");
    });
    for (const token of ["", "   ", "\t\n"] as const) {
      expect(decideActionToken(token)).toBe("fail_job");
      expect(() =>
        createGithubClient({
          token,
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
    }
  });

  it("issues one GET /user probe and Authorization on every request", async () => {
    const fetchImpl = publicFetch(PAT);
    const client = createGithubClient({
      token: PAT,
      configuredUser: OCTOCAT,
      fetch: fetchImpl,
      cache: new GithubRequestCache(),
    });
    expect(fetchImpl).not.toHaveBeenCalled();

    const first = await client.loadPayload(payloadInput());
    const second = await client.fetchPayload(
      payloadInput({ widget: "languages" }),
    );

    expect(first.repositoryIds).toEqual(["R_1"]);
    expect(first.languages).toEqual([{ name: "TypeScript", bytes: 1 }]);
    expect(first.contributions).toBe(42);
    expect(second.repositoryIds).toEqual(first.repositoryIds);
    expect(second.languages).toEqual(first.languages);
    const paths = fetchImpl.mock.calls.map(([input]) => pathnameOf(input));
    expect(paths.filter((path) => path === "/user")).toHaveLength(1);
    expect(paths.some((path) => path === `/users/${OCTOCAT}`)).toBe(true);
    expect(paths.some((path) => path.includes("/languages"))).toBe(false);
    expect(graphqlCalls(fetchImpl.mock.calls)).toHaveLength(2);
    expect(new URL(GITHUB_PROBE_URL).pathname).toBe("/user");
    for (const [, init] of fetchImpl.mock.calls) {
      expect(authorization(init)).toBe(`Bearer ${PAT}`);
      expect(authorization(init)).toBeDefined();
    }
    expect(client.tokenClass).toBe("user_pat");
    expect(client.capabilities.canPrivate).toBe(true);
  });

  it("does not treat the identity probe as the stats payload", async () => {
    const fetchImpl = publicFetch(PAT);
    const client = createGithubClient({
      token: PAT,
      configuredUser: OCTOCAT,
      fetch: fetchImpl,
    });
    const payload = await client.loadPayload(payloadInput());
    expect(payload.user.login).toBe(OCTOCAT);
    expect(payload.repositoryIds).toEqual(["R_1"]);
    expect(payload.languages).toEqual([{ name: "TypeScript", bytes: 1 }]);
    expect(payload).not.toEqual(octocatUser());
  });

  it("maps probe 401 to fail_run via rate-limit/core and does not crawl", async () => {
    const fetchImpl = mockFetch(async (input, init) => {
      expect(authorization(init)).toBe(`Bearer ${PAT}`);
      if (pathnameOf(input) === "/user") {
        return jsonResponse(401, { message: "Bad credentials" });
      }
      throw new Error("crawl must not run after probe 401");
    });
    const client = createGithubClient({
      token: PAT,
      configuredUser: OCTOCAT,
      fetch: fetchImpl,
    });

    await expect(client.loadPayload(payloadInput())).rejects.toMatchObject({
      name: "GithubClientError",
      outcome: "fail_run",
      status: 401,
    });
    expect(classifyGithubRateLimit({ status: 401 })).toBe("fail_run");
    expect(classifyGithubHttp({ status: 401 })).toBe("fail_run");
    expect(fetchImpl.mock.calls.map(([input]) => pathnameOf(input))).toEqual([
      "/user",
    ]);
  });

  it("maps probe 404 to fail_widget via rate-limit/core", async () => {
    const fetchImpl = mockFetch(async (_input, init) => {
      expect(authorization(init)).toBe(`Bearer ${PAT}`);
      return jsonResponse(404, { message: "Not Found" });
    });
    const client = createGithubClient({
      token: PAT,
      configuredUser: OCTOCAT,
      fetch: fetchImpl,
    });

    await expect(client.loadPayload(payloadInput())).rejects.toMatchObject({
      name: "GithubClientError",
      outcome: "fail_widget",
      status: 404,
    });
    expect(classifyGithubRateLimit({ status: 404 })).toBe("fail_widget");
    expect(classifyGithubHttp({ status: 404 })).toBe("fail_widget");
  });

  it("maps probe 403 to the existing classifier (fail_run unless secondary)", async () => {
    const fetchImpl = mockFetch(async (_input, init) => {
      expect(authorization(init)).toBe(`Bearer ${INSTALLATION}`);
      return jsonResponse(403, {
        message: "Resource not accessible by integration",
      });
    });
    const client = createGithubClient({
      token: INSTALLATION,
      configuredUser: OCTOCAT,
      fetch: fetchImpl,
    });

    await expect(client.loadPayload(payloadInput())).rejects.toMatchObject({
      name: "GithubClientError",
      outcome: "fail_run",
      status: 403,
    });
    expect(classifyGithubRateLimit({ status: 403 })).toBe("fail_run");
    expect(classifyGithubHttp({ status: 403 })).toBe("fail_run");
  });

  it("maps secondary 403 on the probe to fail_after_backoff", async () => {
    const fetchImpl = mockFetch(async () =>
      jsonResponse(403, {
        message: "You have exceeded a secondary rate limit. Please wait.",
      }),
    );
    const client = createGithubClient({
      token: PAT,
      configuredUser: OCTOCAT,
      fetch: fetchImpl,
    });

    await expect(client.loadPayload(payloadInput())).rejects.toMatchObject({
      outcome: "fail_after_backoff",
      status: 403,
    });
    expect(
      classifyGithubRateLimit({
        status: 403,
        body: {
          message: "You have exceeded a secondary rate limit. Please wait.",
        },
      }),
    ).toBe("fail_after_backoff");
  });

  it("fails the widget when include_private is set without canPrivate (installation)", async () => {
    const fetchImpl = mockFetch(async (input, init) => {
      expect(authorization(init)).toBe(`Bearer ${INSTALLATION}`);
      const path = pathnameOf(input);
      if (path === "/user") {
        return jsonResponse(200, octocatUser());
      }
      throw new Error(
        "crawl must not run when include_private lacks canPrivate",
      );
    });
    const client = createGithubClient({
      token: INSTALLATION,
      configuredUser: OCTOCAT,
      fetch: fetchImpl,
    });

    await expect(
      client.loadPayload(payloadInput({ includePrivate: true })),
    ).rejects.toMatchObject({
      name: "GithubClientError",
      outcome: "fail_widget",
    });
    expect(client.capabilities.canPrivate).toBe(false);
    expect(
      decideIncludePrivate({
        includePrivate: true,
        canPrivate: client.capabilities.canPrivate,
      }),
    ).toBe("fail_widget");
    expect(fetchImpl.mock.calls.map(([input]) => pathnameOf(input))).toEqual([
      "/user",
    ]);
  });

  it("fails include_private when probe login ≠ configured user (no invented 0)", async () => {
    const fetchImpl = mockFetch(async (input, init) => {
      expect(authorization(init)).toBe(`Bearer ${PAT}`);
      if (pathnameOf(input) === "/user") {
        return jsonResponse(200, octocatUser());
      }
      throw new Error("private crawl must not run on probe mismatch");
    });
    const client = createGithubClient({
      token: PAT,
      configuredUser: HUBOT,
      fetch: fetchImpl,
    });

    await expect(
      client.loadPayload(payloadInput({ user: HUBOT, includePrivate: true })),
    ).rejects.toMatchObject({
      outcome: "fail_widget",
    });
    expect(client.capabilities.canPrivate).toBe(false);
    expect(client.capabilities.canContributions).toBe(false);
    expect(client.capabilities.canGist).toBe(true);
  });

  it("uses public REST after a matching installation probe (canPrivate false)", async () => {
    const fetchImpl = mockFetch(async (input, init) => {
      expect(authorization(init)).toBe(`Bearer ${INSTALLATION}`);
      const path = pathnameOf(input);
      if (path === "/user") {
        return jsonResponse(200, octocatUser());
      }
      if (path === `/users/${OCTOCAT}`) {
        return jsonResponse(200, octocatUser());
      }
      if (path === `/users/${OCTOCAT}/repos`) {
        return jsonResponse(200, [repo(1)]);
      }
      if (path === "/user/repos") {
        throw new Error("must not list /user/repos without canPrivate");
      }
      if (path === "/graphql") {
        return mockGraphqlOk(init);
      }
      return jsonResponse(404, { message: "Not Found" });
    });
    const client = createGithubClient({
      token: INSTALLATION,
      configuredUser: OCTOCAT,
      fetch: fetchImpl,
    });

    const payload = await client.loadPayload(payloadInput());
    expect(payload.repositoryIds).toEqual(["R_1"]);
    expect(payload.languages).toEqual([{ name: "TypeScript", bytes: 1 }]);
    expect(payload).not.toHaveProperty("contributions");
    expect(client.tokenClass).toBe("actions_installation");
    expect(client.capabilities.canPrivate).toBe(false);
    expect(client.capabilities.canContributions).toBe(false);
    const paths = fetchImpl.mock.calls.map(([input]) => pathnameOf(input));
    expect(paths).toContain("/user");
    expect(paths.some((path) => path === "/user/repos")).toBe(false);
    expect(graphqlCalls(fetchImpl.mock.calls)).toHaveLength(1);
    expect(
      graphqlCalls(fetchImpl.mock.calls).map(
        ([, init]) => parseGraphqlBody(init).query,
      ),
    ).toEqual([LANGUAGES_NODES_QUERY]);
  });

  it("lists private-capable owner repos for a matching user PAT", async () => {
    const fetchImpl = mockFetch(async (input, init) => {
      expect(authorization(init)).toBe(`Bearer ${PAT}`);
      const url = input.href;
      const path = pathnameOf(input);
      if (path === "/user") {
        return jsonResponse(200, octocatUser());
      }
      if (path === `/users/${OCTOCAT}`) {
        return jsonResponse(200, octocatUser());
      }
      if (url.startsWith(`${AUTH_REPOS_URL}?`)) {
        return jsonResponse(200, [repo(1), repo(2)]);
      }
      if (path === "/graphql") {
        return mockGraphqlOk(init);
      }
      throw new Error(`unexpected ${url}`);
    });
    const client = createGithubClient({
      token: PAT,
      configuredUser: OCTOCAT,
      fetch: fetchImpl,
    });

    const payload = await client.loadPayload(
      payloadInput({ includePrivate: true }),
    );
    expect(payload.repositoryIds).toEqual(["R_1", "R_2"]);
    expect(payload.languages).toEqual([{ name: "TypeScript", bytes: 2 }]);
    expect(payload.contributions).toBe(42);
    expect(client.capabilities.canPrivate).toBe(true);
    expect(client.capabilities.canContributions).toBe(true);
    const paths = fetchImpl.mock.calls.map(([input]) => pathnameOf(input));
    expect(paths).toContain("/user");
    expect(paths).toContain("/graphql");
    expect(paths.some((path) => path.includes("/languages"))).toBe(false);
  });

  it("maps crawl 404 to fail_widget from rest/rate-limit", async () => {
    const fetchImpl = mockFetch(async (input, init) => {
      expect(authorization(init)).toBe(`Bearer ${PAT}`);
      const path = pathnameOf(input);
      if (path === "/user") {
        return jsonResponse(200, octocatUser());
      }
      return jsonResponse(404, { message: "Not Found" });
    });
    const client = createGithubClient({
      token: PAT,
      configuredUser: OCTOCAT,
      fetch: fetchImpl,
    });

    await expect(client.loadPayload(payloadInput())).rejects.toBeInstanceOf(
      GithubClientError,
    );
    await expect(client.loadPayload(payloadInput())).rejects.toMatchObject({
      name: "GithubClientError",
      outcome: "fail_widget",
      status: 404,
    });
    expect(classifyGithubRateLimit({ status: 404 })).toBe("fail_widget");
  });

  it("does not log or echo the token on failure", async () => {
    const fetchImpl = mockFetch(async () =>
      jsonResponse(401, { message: "Bad credentials" }),
    );
    const client = createGithubClient({
      token: PAT,
      configuredUser: OCTOCAT,
      fetch: fetchImpl,
    });
    const error = await client
      .loadPayload(payloadInput())
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(GithubClientError);
    expect(String(error)).not.toContain(PAT);
    expect(String(error)).not.toContain("ghp_");
  });

  it("does not snapshot canPrivate from empty configuredUser before probe", () => {
    const client = createGithubClient(PAT);
    expect(client.tokenClass).toBe("user_pat");
    expect(client.capabilities.canPrivate).toBe(false);
    expect(client.capabilities.canContributions).toBe(false);
    expect(typeof client.loadPayload).toBe("function");
    expect(typeof client.fetchPayload).toBe("function");
  });

  it("include_private with a PAT and payload user ≠ probe login fails the widget", async () => {
    const fetchImpl = mockFetch(async (input, init) => {
      expect(authorization(init)).toBe(`Bearer ${PAT}`);
      if (pathnameOf(input) === "/user") {
        return jsonResponse(200, octocatUser());
      }
      throw new Error("private crawl must not run on payload user mismatch");
    });
    const client = createGithubClient({
      token: PAT,
      configuredUser: "",
      fetch: fetchImpl,
    });

    expect(client.capabilities.canPrivate).toBe(false);
    await expect(
      client.loadPayload(payloadInput({ user: HUBOT, includePrivate: true })),
    ).rejects.toMatchObject({
      name: "GithubClientError",
      outcome: "fail_widget",
    });
    expect(client.capabilities.canPrivate).toBe(false);
    expect(client.capabilities.canContributions).toBe(false);
  });

  it("POSTs GraphQL nodes(ids:) for languages and never REST /languages", async () => {
    const fetchImpl = publicFetch(PAT);
    const client = createGithubClient({
      token: PAT,
      configuredUser: OCTOCAT,
      fetch: fetchImpl,
      cache: new GithubRequestCache(),
    });

    const payload = await client.loadPayload(
      payloadInput({ widget: "languages" }),
    );

    expect(payload.languages).toEqual([{ name: "TypeScript", bytes: 1 }]);
    const paths = fetchImpl.mock.calls.map(([input]) => pathnameOf(input));
    expect(paths).toContain("/graphql");
    expect(paths.some((path) => path.includes("/languages"))).toBe(false);
    expect(
      graphqlCalls(fetchImpl.mock.calls).some(
        ([, init]) => parseGraphqlBody(init).query === LANGUAGES_NODES_QUERY,
      ),
    ).toBe(true);
  });

  it("batches GraphQL nodes(ids:) of 100 for 101 repository ids", async () => {
    const fetchImpl = mockFetch(async (input, init) => {
      expect(authorization(init)).toBe(`Bearer ${INSTALLATION}`);
      const path = pathnameOf(input);
      if (path === "/user" || path === `/users/${OCTOCAT}`) {
        return jsonResponse(200, octocatUser());
      }
      if (path === `/users/${OCTOCAT}/repos`) {
        const page = Number(
          new URL(input.href).searchParams.get("page") ?? "1",
        );
        if (page === 1) {
          return jsonResponse(
            200,
            Array.from({ length: 100 }, (_, index) => repo(index + 1)),
          );
        }
        if (page === 2) {
          return jsonResponse(200, [repo(101)]);
        }
        return jsonResponse(200, []);
      }
      if (path === "/graphql") {
        return mockGraphqlOk(init);
      }
      throw new Error(`unexpected ${input.href}`);
    });
    const client = createGithubClient({
      token: INSTALLATION,
      configuredUser: OCTOCAT,
      fetch: fetchImpl,
      cache: new GithubRequestCache(),
    });

    const payload = await client.loadPayload(
      payloadInput({ widget: "languages" }),
    );

    expect(payload.repositoryIds).toHaveLength(101);
    expect(payload.languages).toEqual([{ name: "TypeScript", bytes: 101 }]);
    expect(payload).not.toHaveProperty("contributions");
    const languageBatches = graphqlCalls(fetchImpl.mock.calls)
      .map(([, init]) => parseGraphqlBody(init))
      .filter((body) => body.query === LANGUAGES_NODES_QUERY)
      .map((body) => graphqlLanguageIds(body.variables));
    expect(languageBatches).toHaveLength(2);
    expect(languageBatches[0]).toHaveLength(GITHUB_GRAPHQL_NODE_BATCH);
    expect(languageBatches[1]).toHaveLength(1);
    expect(
      graphqlCalls(fetchImpl.mock.calls).some(
        ([, init]) => parseGraphqlBody(init).query === CONTRIBUTIONS_QUERY,
      ),
    ).toBe(false);
    expect(
      fetchImpl.mock.calls.some(([input]) =>
        pathnameOf(input).includes("/languages"),
      ),
    ).toBe(false);
  });

  it("skips crawl and GraphQL for demo and only probes GET /user", async () => {
    const fetchImpl = mockFetch(async (input, init) => {
      expect(authorization(init)).toBe(`Bearer ${PAT}`);
      const path = pathnameOf(input);
      if (path === "/user") {
        return jsonResponse(200, octocatUser());
      }
      if (path === `/users/${OCTOCAT}/repos` || path === "/graphql") {
        throw new Error(`demo must not call ${path}`);
      }
      throw new Error(`unexpected ${input.href}`);
    });
    const client = createGithubClient({
      token: PAT,
      configuredUser: OCTOCAT,
      fetch: fetchImpl,
      cache: new GithubRequestCache(),
    });

    const payload = await client.loadPayload(payloadInput({ widget: "demo" }));

    expect(payload.user.login).toBe(OCTOCAT);
    expect(payload.repositories).toEqual([]);
    expect(payload.repositoryIds).toEqual([]);
    expect(payload.languages).toEqual([]);
    expect(payload).not.toHaveProperty("contributions");
    expect(payload).not.toHaveProperty("repository");
    expect(fetchImpl.mock.calls.map(([input]) => pathnameOf(input))).toEqual([
      "/user",
    ]);
    expect(graphqlCalls(fetchImpl.mock.calls)).toHaveLength(0);
  });

  it("fetches GET /repos/{owner}/{repo} for widget repo and skips crawl and GraphQL", async () => {
    const fetchImpl = mockFetch(async (input, init) => {
      expect(authorization(init)).toBe(`Bearer ${PAT}`);
      const path = pathnameOf(input);
      if (path === "/user") {
        return jsonResponse(200, octocatUser());
      }
      if (path === `/repos/${OCTOCAT}/Hello-World`) {
        return jsonResponse(200, githubRepositoryJson());
      }
      if (path === `/users/${OCTOCAT}/repos` || path === "/graphql") {
        throw new Error(`repo widget must not call ${path}`);
      }
      throw new Error(`unexpected ${input.href}`);
    });
    const client = createGithubClient({
      token: PAT,
      configuredUser: OCTOCAT,
      fetch: fetchImpl,
      cache: new GithubRequestCache(),
    });

    const payload = await client.loadPayload(
      payloadInput({ widget: "repo", repo: `${OCTOCAT}/Hello-World` }),
    );

    expect(payload.user.login).toBe(OCTOCAT);
    expect(payload.repositories).toEqual([]);
    expect(payload.repositoryIds).toEqual([]);
    expect(payload.languages).toEqual([]);
    expect(payload).not.toHaveProperty("contributions");
    expect(payload.repository).toEqual({
      fullName: `${OCTOCAT}/Hello-World`,
      name: "Hello-World",
      description: "My first repository",
      htmlUrl: `https://github.com/${OCTOCAT}/Hello-World`,
      stargazersCount: 80,
      forksCount: 9,
      subscribersCount: 42,
      openIssuesCount: 3,
      language: "TypeScript",
      license: "MIT",
      ownerLogin: OCTOCAT,
      ownerAvatarUrl: "https://avatars.githubusercontent.com/u/1?v=4",
    });
    const paths = fetchImpl.mock.calls.map(([input]) => pathnameOf(input));
    expect(paths).toEqual(["/user", `/repos/${OCTOCAT}/Hello-World`]);
    expect(paths.some((path) => path === `/users/${OCTOCAT}/repos`)).toBe(
      false,
    );
    expect(graphqlCalls(fetchImpl.mock.calls)).toHaveLength(0);
    expect(paths.some((path) => path.includes("/languages"))).toBe(false);
  });

  it("returns empty languages and zero GraphQL when repository ids are empty", async () => {
    const fetchImpl = mockFetch(async (input, init) => {
      expect(authorization(init)).toBe(`Bearer ${INSTALLATION}`);
      const path = pathnameOf(input);
      if (path === "/user" || path === `/users/${OCTOCAT}`) {
        return jsonResponse(200, octocatUser());
      }
      if (path === `/users/${OCTOCAT}/repos`) {
        return jsonResponse(200, []);
      }
      if (path === "/graphql") {
        throw new Error("GraphQL must not run for empty repositoryIds");
      }
      throw new Error(`unexpected ${input.href}`);
    });
    const client = createGithubClient({
      token: INSTALLATION,
      configuredUser: OCTOCAT,
      fetch: fetchImpl,
      cache: new GithubRequestCache(),
    });

    const payload = await client.loadPayload(
      payloadInput({ widget: "languages" }),
    );

    expect(payload.repositoryIds).toEqual([]);
    expect(payload.languages).toEqual([]);
    expect(payload).not.toHaveProperty("contributions");
    expect(graphqlCalls(fetchImpl.mock.calls)).toHaveLength(0);
  });

  it("maps GraphQL 200 + errors[] to GithubClientError fail_after_backoff", async () => {
    const fetchImpl = mockFetch(async (input, init) => {
      expect(authorization(init)).toBe(`Bearer ${PAT}`);
      const path = pathnameOf(input);
      if (path === "/user" || path === `/users/${OCTOCAT}`) {
        return jsonResponse(200, octocatUser());
      }
      if (path === `/users/${OCTOCAT}/repos`) {
        return jsonResponse(200, [repo(1)]);
      }
      if (path === "/graphql") {
        return jsonResponse(200, {
          data: null,
          errors: [{ message: "Something went wrong" }],
          rateLimit: { cost: 1, remaining: 5000 },
        });
      }
      throw new Error(`unexpected ${input.href}`);
    });
    const client = createGithubClient({
      token: PAT,
      configuredUser: OCTOCAT,
      fetch: fetchImpl,
      cache: new GithubRequestCache(),
    });

    await expect(client.loadPayload(payloadInput())).rejects.toMatchObject({
      name: "GithubClientError",
      outcome: "fail_after_backoff",
      status: 200,
    });
  });

  it("records REST crawl call events on runLog without tokens or Authorization", async () => {
    const events: RunLogEvent[] = [];
    const fetchImpl = publicFetch(PAT);
    const client = createGithubClient({
      token: PAT,
      configuredUser: OCTOCAT,
      fetch: fetchImpl,
      cache: new GithubRequestCache(),
      runLog: (event) => {
        events.push(event);
      },
    });

    const stats = await client.loadPayload(payloadInput({ widget: "stats" }));
    const languages = await client.fetchPayload(
      payloadInput({ widget: "languages" }),
    );

    expect(stats.repositoryIds).toEqual(["R_1"]);
    expect(languages.languages).toEqual([{ name: "TypeScript", bytes: 1 }]);
    expect(events.length).toBeGreaterThanOrEqual(1);
    for (const event of events) {
      expect(event).toMatchObject({
        kind: "call",
        integration: "github",
        host: "api.github.com",
      });
      expect(event.path).toMatch(/^\//);
      expect(event.path).not.toContain("?");
      expect(event.path).not.toContain("@");
      expect(event.path).not.toBe("/user");
      expect(event.path).not.toBe("/graphql");
    }
    expect(events.some((event) => event.path === `/users/${OCTOCAT}`)).toBe(
      true,
    );
    const serialized = JSON.stringify(events);
    expect(serialized).not.toContain(PAT);
    expect(serialized).not.toContain("TOKEN");
    expect(serialized).not.toContain("Bearer");
    expect(serialized).not.toContain("Authorization");
    expect(
      fetchImpl.mock.calls.some(([input]) =>
        pathnameOf(input).includes("/languages"),
      ),
    ).toBe(false);
  });

  it("forwards runLog on an installation languages crawl and never REST /languages", async () => {
    const events: RunLogEvent[] = [];
    const fetchImpl = mockFetch(async (input, init) => {
      expect(authorization(init)).toBe(`Bearer ${INSTALLATION}`);
      const path = pathnameOf(input);
      if (path === "/user") {
        return jsonResponse(200, octocatUser());
      }
      if (path === `/users/${OCTOCAT}`) {
        return jsonResponse(200, octocatUser());
      }
      if (path === `/users/${OCTOCAT}/repos`) {
        return jsonResponse(200, [repo(1)]);
      }
      if (path === "/user/repos") {
        throw new Error("must not list /user/repos without canPrivate");
      }
      if (path === "/graphql") {
        return mockGraphqlOk(init);
      }
      throw new Error(`unexpected ${input.href}`);
    });
    const client = createGithubClient({
      token: INSTALLATION,
      configuredUser: OCTOCAT,
      fetch: fetchImpl,
      cache: new GithubRequestCache(),
      runLog: (event) => {
        events.push(event);
      },
    });

    const payload = await client.loadPayload(
      payloadInput({ widget: "languages" }),
    );

    expect(payload.languages).toEqual([{ name: "TypeScript", bytes: 1 }]);
    expect(payload).not.toHaveProperty("contributions");
    expect(graphqlCalls(fetchImpl.mock.calls)).toHaveLength(1);
    expect(
      graphqlCalls(fetchImpl.mock.calls).map(
        ([, init]) => parseGraphqlBody(init).query,
      ),
    ).toEqual([LANGUAGES_NODES_QUERY]);
    expect(
      fetchImpl.mock.calls.some(([input]) =>
        pathnameOf(input).includes("/languages"),
      ),
    ).toBe(false);
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0]).toMatchObject({
      kind: "call",
      integration: "github",
      host: "api.github.com",
    });
    expect(typeof events[0]?.path).toBe("string");
    const serialized = JSON.stringify(events);
    expect(serialized).not.toContain(INSTALLATION);
    expect(serialized).not.toContain("TOKEN");
    expect(serialized).not.toContain("Bearer");
    expect(serialized).not.toContain("Authorization");
  });
});
