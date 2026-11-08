import {
  classifyGithubHttp,
  decideActionToken,
  publicUrlParts,
  type RunLogEvent,
  type RunLogSink,
} from "@profile-bits/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GithubRequestCache } from "./cache.js";
import { classifyGithubRateLimit } from "./rate-limit.js";
import {
  crawlGithubRest,
  fetchGithubRepo,
  GITHUB_API_ORIGIN,
  GITHUB_REST_DEPENDENT_WIDGETS,
  GITHUB_REST_PER_PAGE,
  GITHUB_REST_REPO_CAP,
  GithubRestError,
  type GithubRestFetch,
} from "./rest.js";

const OCTOCAT = "octocat";
const TOKEN = "ghs_test_token_not_a_secret";

const USER_URL = `${GITHUB_API_ORIGIN}/users/${OCTOCAT}`;
const REPOS_URL = `${GITHUB_API_ORIGIN}/users/${OCTOCAT}/repos`;
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

function octocatUser() {
  return {
    login: OCTOCAT,
    id: 1,
    node_id: "U_octocat",
    followers: 10,
    following: 2,
    public_repos: 3,
    public_gists: 1,
  };
}

function repo(
  index: number,
  flags?: {
    fork?: boolean;
    archived?: boolean;
    private?: boolean;
  },
) {
  return {
    id: index,
    node_id: `R_${index}`,
    name: `repo-${index}`,
    full_name: `${OCTOCAT}/repo-${index}`,
    fork: flags?.fork === true,
    archived: flags?.archived === true,
    private: flags?.private === true,
    stargazers_count: index,
    forks_count: 0,
  };
}

function requestUrl(input: URL): string {
  return input.href;
}

function authorization(init?: RequestInit): string | undefined {
  const headers = init?.headers;
  if (headers == null || Array.isArray(headers) || headers instanceof Headers) {
    if (headers instanceof Headers) {
      return headers.get("Authorization") ?? undefined;
    }
    return undefined;
  }
  return headers.Authorization ?? headers.authorization;
}

function pageFrom(url: string): number {
  return Number(new URL(url).searchParams.get("page") ?? "1");
}

function mockFetch(handler: GithubRestFetch) {
  return vi.fn(handler);
}

function collectingSink(): {
  events: RunLogEvent[];
  logger: RunLogSink;
} {
  const events: RunLogEvent[] = [];
  return {
    events,
    logger: (event) => {
      events.push(event);
    },
  };
}

function serializedLogs(events: readonly RunLogEvent[]): string {
  return JSON.stringify(events);
}

describe("crawlGithubRest", () => {
  it("fails the job on empty/whitespace token and never fetches (never unauth)", async () => {
    const fetchImpl = mockFetch(async () => {
      throw new Error("fetch must not run for a missing token");
    });
    for (const token of ["", "   ", "\t\n", undefined, null] as const) {
      fetchImpl.mockClear();
      const cache = new GithubRequestCache();
      await expect(
        crawlGithubRest({
          login: OCTOCAT,
          token,
          cache,
          fetchImpl,
        }),
      ).rejects.toMatchObject({
        name: "GithubRestError",
        outcome: "fail_job",
        widgets: GITHUB_REST_DEPENDENT_WIDGETS,
      });
      expect(decideActionToken(token)).toBe("fail_job");
      expect(fetchImpl).not.toHaveBeenCalled();
    }
  });

  it("sends Authorization on every request and never calls REST /languages or GET /user", async () => {
    const fetchImpl = mockFetch(async (input) => {
      const url = requestUrl(input);
      if (url === USER_URL) {
        return jsonResponse(200, octocatUser());
      }
      if (url.startsWith(`${REPOS_URL}?`)) {
        return jsonResponse(200, [repo(1), repo(2, { fork: true })]);
      }
      return jsonResponse(404, { message: "Not Found" });
    });

    const result = await crawlGithubRest({
      login: OCTOCAT,
      token: TOKEN,
      cache: new GithubRequestCache(),
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalled();
    const urls = fetchImpl.mock.calls.map(([input]) => requestUrl(input));
    expect(urls.some((url) => url.includes("/languages"))).toBe(false);
    expect(
      urls.some((url) => /\/user(?:\?|$)/.test(new URL(url).pathname)),
    ).toBe(false);
    for (const [, init] of fetchImpl.mock.calls) {
      expect(authorization(init)).toBe(`Bearer ${TOKEN}`);
    }
    expect(result.repositoryIds).toEqual(["R_1"]);
    expect(result.repositories.map((item) => item.nodeId)).toEqual(
      result.repositoryIds,
    );
  });

  it("filters forks and archived first, then caps 500 (cap-before-filter forbidden)", async () => {
    const fetchImpl = mockFetch(async (input) => {
      const url = requestUrl(input);
      if (url === USER_URL) {
        return jsonResponse(200, octocatUser());
      }
      const page = pageFrom(url);
      const start = (page - 1) * GITHUB_REST_PER_PAGE + 1;
      const items = Array.from(
        { length: GITHUB_REST_PER_PAGE },
        (_, offset) => {
          const index = start + offset;
          return repo(index, { fork: index <= 200 });
        },
      );
      return jsonResponse(200, items);
    });

    const result = await crawlGithubRest({
      login: OCTOCAT,
      token: TOKEN,
      cache: new GithubRequestCache(),
      fetchImpl,
    });

    const urls = fetchImpl.mock.calls.map(([input]) => requestUrl(input));
    expect(urls.some((url) => url.includes("/languages"))).toBe(false);
    expect(result.repositories).toHaveLength(GITHUB_REST_REPO_CAP);
    expect(result.repositoryIds).toHaveLength(GITHUB_REST_REPO_CAP);
    expect(
      result.repositories.every((item) => !item.fork && !item.archived),
    ).toBe(true);
    expect(result.repositoryIds[0]).toBe("R_201");
    expect(result.repositoryIds[GITHUB_REST_REPO_CAP - 1]).toBe("R_700");
    expect(result.repositoryIds).not.toContain("R_1");
    expect(result.repositoryIds).not.toContain("R_200");
    expect(result.repositoryIds).toContain("R_501");
    expect(result.repositoryIds).not.toContain("R_701");
    expect(result.repositories.map((item) => item.nodeId)).toEqual(
      result.repositoryIds,
    );

    const pages = urls
      .filter((url) => url.startsWith(`${REPOS_URL}?`))
      .map((url) => pageFrom(url));
    expect(Math.max(...pages)).toBe(7);
    expect(pages).not.toContain(8);
  });

  it("fails stats and languages together when a mid-pagination /repos page fails", async () => {
    const fetchImpl = mockFetch(async (input) => {
      const url = requestUrl(input);
      if (url === USER_URL) {
        return jsonResponse(200, octocatUser());
      }
      const page = pageFrom(url);
      if (page === 1) {
        return jsonResponse(
          200,
          Array.from({ length: GITHUB_REST_PER_PAGE }, (_, offset) =>
            repo(offset + 1),
          ),
        );
      }
      return jsonResponse(500, { message: "server error" });
    });

    const error = await crawlGithubRest({
      login: OCTOCAT,
      token: TOKEN,
      cache: new GithubRequestCache(),
      fetchImpl,
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(GithubRestError);
    const restError = error as GithubRestError;
    expect(restError.outcome).toBe("fail_run");
    expect(restError.outcome).toBe(classifyGithubRateLimit({ status: 500 }));
    expect(restError.outcome).toBe(classifyGithubHttp({ status: 500 }));
    expect(restError.status).toBe(500);
    expect(restError.widgets).toEqual(["stats", "languages"]);
    expect(restError.widgets).toEqual(GITHUB_REST_DEPENDENT_WIDGETS);

    const urls = fetchImpl.mock.calls.map(([input]) => requestUrl(input));
    expect(urls.some((url) => url.includes("/languages"))).toBe(false);
    expect(urls.some((url) => url === USER_URL)).toBe(true);
    expect(urls.some((url) => url.includes("page=1"))).toBe(true);
    expect(urls.some((url) => url.includes("page=2"))).toBe(true);
  });

  it("classifies a mid-pagination 429 as fail_after_backoff for stats and languages", async () => {
    const fetchImpl = mockFetch(async (input) => {
      const url = requestUrl(input);
      if (url === USER_URL) {
        return jsonResponse(200, octocatUser());
      }
      if (pageFrom(url) === 1) {
        return jsonResponse(
          200,
          Array.from({ length: GITHUB_REST_PER_PAGE }, (_, offset) =>
            repo(offset + 1),
          ),
        );
      }
      return jsonResponse(429, { message: "rate limited" });
    });

    await expect(
      crawlGithubRest({
        login: OCTOCAT,
        token: TOKEN,
        cache: new GithubRequestCache(),
        fetchImpl,
      }),
    ).rejects.toMatchObject({
      outcome: "fail_after_backoff",
      status: 429,
      widgets: ["stats", "languages"],
    });
    expect(classifyGithubRateLimit({ status: 429 })).toBe("fail_after_backoff");
  });

  it("coalesces identical user and repo pages through GithubRequestCache", async () => {
    const fetchImpl = mockFetch(async (input) => {
      const url = requestUrl(input);
      if (url === USER_URL) {
        return jsonResponse(200, octocatUser());
      }
      return jsonResponse(200, [repo(1)]);
    });
    const cache = new GithubRequestCache();
    const input = {
      login: OCTOCAT,
      token: TOKEN,
      cache,
      fetchImpl,
    };

    const [first, second] = await Promise.all([
      crawlGithubRest(input),
      crawlGithubRest(input),
    ]);
    const third = await crawlGithubRest(input);

    expect(first.repositoryIds).toEqual(["R_1"]);
    expect(second.repositoryIds).toEqual(first.repositoryIds);
    expect(third.repositoryIds).toEqual(first.repositoryIds);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const urls = fetchImpl.mock.calls.map(([inputArg]) => requestUrl(inputArg));
    expect(urls.filter((url) => url === USER_URL)).toHaveLength(1);
    expect(urls.filter((url) => url.startsWith(`${REPOS_URL}?`))).toHaveLength(
      1,
    );
  });

  it("lists private-capable owner repos via GET /user/repos when include_private and canPrivate", async () => {
    const fetchImpl = mockFetch(async (input) => {
      const url = requestUrl(input);
      if (url === USER_URL) {
        return jsonResponse(200, octocatUser());
      }
      if (url.startsWith(`${AUTH_REPOS_URL}?`)) {
        return jsonResponse(200, [
          repo(1),
          repo(2, { private: true }),
          repo(3, { fork: true }),
        ]);
      }
      return jsonResponse(500, { message: "unexpected public listing" });
    });

    const result = await crawlGithubRest({
      login: OCTOCAT,
      token: TOKEN,
      cache: new GithubRequestCache(),
      includePrivate: true,
      canPrivate: true,
      fetchImpl,
    });

    const urls = fetchImpl.mock.calls.map(([inputArg]) => requestUrl(inputArg));
    expect(urls.some((url) => url.startsWith(`${AUTH_REPOS_URL}?`))).toBe(true);
    expect(urls.some((url) => url.startsWith(`${REPOS_URL}?`))).toBe(false);
    expect(urls.some((url) => new URL(url).pathname === "/user")).toBe(false);
    expect(result.repositoryIds).toEqual(["R_1", "R_2"]);
  });

  it("uses public GET /users/{login}/repos when include_private is false", async () => {
    const fetchImpl = mockFetch(async (input) => {
      const url = requestUrl(input);
      if (url === USER_URL) {
        return jsonResponse(200, octocatUser());
      }
      if (url.startsWith(`${REPOS_URL}?`)) {
        return jsonResponse(200, [repo(1)]);
      }
      return jsonResponse(500, { message: "unexpected" });
    });

    const result = await crawlGithubRest({
      login: OCTOCAT,
      token: TOKEN,
      cache: new GithubRequestCache(),
      includePrivate: false,
      fetchImpl,
    });

    const urls = fetchImpl.mock.calls.map(([inputArg]) => requestUrl(inputArg));
    expect(urls.some((url) => url.startsWith(`${REPOS_URL}?`))).toBe(true);
    expect(urls.some((url) => url.includes("/user/repos"))).toBe(false);
    expect(result.repositoryIds).toEqual(["R_1"]);
  });

  it("fails the widget without fetching when include_private lacks canPrivate", async () => {
    const fetchImpl = mockFetch(async () => {
      throw new Error("fetch must not run without canPrivate");
    });
    await expect(
      crawlGithubRest({
        login: OCTOCAT,
        token: TOKEN,
        cache: new GithubRequestCache(),
        includePrivate: true,
        canPrivate: false,
        fetchImpl,
      }),
    ).rejects.toMatchObject({
      outcome: "fail_widget",
      widgets: ["stats", "languages"],
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("maps 404 user to fail_widget via the rate-limit classifier", async () => {
    const fetchImpl = mockFetch(async () =>
      jsonResponse(404, { message: "Not Found" }),
    );
    await expect(
      crawlGithubRest({
        login: OCTOCAT,
        token: TOKEN,
        cache: new GithubRequestCache(),
        fetchImpl,
      }),
    ).rejects.toMatchObject({
      outcome: "fail_widget",
      status: 404,
    });
    expect(classifyGithubRateLimit({ status: 404 })).toBe("fail_widget");
  });

  it("keeps forks when include_forks is true, then still caps 500", async () => {
    const fetchImpl = mockFetch(async (input) => {
      const url = requestUrl(input);
      if (url === USER_URL) {
        return jsonResponse(200, octocatUser());
      }
      const page = pageFrom(url);
      const start = (page - 1) * GITHUB_REST_PER_PAGE + 1;
      return jsonResponse(
        200,
        Array.from({ length: GITHUB_REST_PER_PAGE }, (_, offset) =>
          repo(start + offset, { fork: true }),
        ),
      );
    });

    const result = await crawlGithubRest({
      login: OCTOCAT,
      token: TOKEN,
      cache: new GithubRequestCache(),
      includeForks: true,
      fetchImpl,
    });

    expect(result.repositoryIds).toHaveLength(GITHUB_REST_REPO_CAP);
    expect(result.repositories.every((item) => item.fork)).toBe(true);
    expect(result.repositoryIds[0]).toBe("R_1");
    expect(result.repositoryIds[GITHUB_REST_REPO_CAP - 1]).toBe("R_500");
  });

  it("logs a call event for each uncached REST GET without tokens or Bearer", async () => {
    const fetchImpl = mockFetch(async (input) => {
      const url = requestUrl(input);
      if (url === USER_URL) {
        return jsonResponse(200, octocatUser());
      }
      if (url.startsWith(`${REPOS_URL}?`)) {
        return jsonResponse(200, [repo(1)]);
      }
      return jsonResponse(404, { message: "Not Found" });
    });
    const { events, logger } = collectingSink();
    const cache = new GithubRequestCache();
    const input = {
      login: OCTOCAT,
      token: TOKEN,
      cache,
      fetchImpl,
      logger,
    };

    await crawlGithubRest(input);

    const urls = fetchImpl.mock.calls.map(([inputArg]) => requestUrl(inputArg));
    expect(urls.some((url) => url.includes("/languages"))).toBe(false);
    expect(events).toHaveLength(fetchImpl.mock.calls.length);
    expect(events.length).toBeGreaterThan(0);

    const first = events[0];
    expect(first).toMatchObject({
      v: 1,
      src: "profile-bits",
      kind: "call",
      pkg: "integrations",
      integration: "github",
      op: "rest.get",
      outcome: "ok",
      status: 200,
      host: "api.github.com",
      path: "/users/octocat",
    });
    expect(typeof first?.duration_ms).toBe("number");
    expect(Number.isFinite(first?.duration_ms)).toBe(true);

    const userParts = publicUrlParts(USER_URL);
    const repoParts = publicUrlParts(REPOS_URL);
    expect(events[0]).toMatchObject(userParts);
    expect(events[1]).toMatchObject({
      kind: "call",
      status: 200,
      ...repoParts,
    });
    expect(typeof events[1]?.duration_ms).toBe("number");

    const serialized = serializedLogs(events);
    expect(serialized).not.toContain(TOKEN);
    expect(serialized).not.toContain("Bearer");
    expect(serialized).not.toContain("Authorization");
    expect(serialized).not.toContain("per_page");
    expect(serialized).not.toContain("/languages");

    await crawlGithubRest(input);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(events).toHaveLength(2);
  });

  it("logs a mapped skip/fail call event when REST GET throws GithubRestError", async () => {
    const fetchImpl = mockFetch(async () =>
      jsonResponse(404, { message: "Not Found" }),
    );
    const { events, logger } = collectingSink();

    await expect(
      crawlGithubRest({
        login: OCTOCAT,
        token: TOKEN,
        cache: new GithubRequestCache(),
        fetchImpl,
        logger,
      }),
    ).rejects.toMatchObject({
      outcome: "fail_widget",
      status: 404,
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      kind: "call",
      pkg: "integrations",
      integration: "github",
      op: "rest.get",
      outcome: "fail_widget",
      status: 404,
      host: "api.github.com",
      path: "/users/octocat",
    });
    expect(typeof events[0]?.duration_ms).toBe("number");

    const serialized = serializedLogs(events);
    expect(serialized).not.toContain(TOKEN);
    expect(serialized).not.toContain("Bearer");
    expect(
      fetchImpl.mock.calls.some(([input]) =>
        requestUrl(input).includes("/languages"),
      ),
    ).toBe(false);
  });
});

const HELLO_WORLD = "Hello-World";
const REPO_FULL_NAME = `${OCTOCAT}/${HELLO_WORLD}`;
const REPO_URL = `${GITHUB_API_ORIGIN}/repos/${OCTOCAT}/${HELLO_WORLD}`;
const LANGUAGES_REPO_URL = `${GITHUB_API_ORIGIN}/repos/${OCTOCAT}/languages`;

function githubRepositoryJson(overrides?: {
  fullName?: string;
  name?: string;
  language?: string | null;
  license?: { spdx_id?: string; name?: string } | null;
}) {
  const fullName = overrides?.fullName ?? REPO_FULL_NAME;
  const name = overrides?.name ?? HELLO_WORLD;
  return {
    full_name: fullName,
    name,
    description: "My first repository",
    html_url: `https://github.com/${fullName}`,
    stargazers_count: 80,
    forks_count: 9,
    subscribers_count: 42,
    open_issues_count: 3,
    language:
      overrides?.language === undefined ? "TypeScript" : overrides.language,
    license:
      overrides?.license === undefined
        ? { spdx_id: "MIT", name: "MIT License" }
        : overrides.license,
    owner: {
      login: OCTOCAT,
      avatar_url: "https://avatars.githubusercontent.com/u/1?v=4",
    },
  };
}

function isRestLanguagesEndpoint(url: string): boolean {
  const segments = new URL(url).pathname
    .split("/")
    .filter((segment) => segment !== "");
  return (
    segments.length >= 4 &&
    segments[0] === "repos" &&
    segments[segments.length - 1] === "languages"
  );
}

describe("fetchGithubRepo", () => {
  it("maps 200 snake_case fields, sends Authorization, and never calls REST /languages", async () => {
    const fetchImpl = mockFetch(async (input, init) => {
      expect(authorization(init)).toBe(`Bearer ${TOKEN}`);
      if (requestUrl(input) === REPO_URL) {
        return jsonResponse(200, githubRepositoryJson());
      }
      throw new Error(`unexpected ${requestUrl(input)}`);
    });

    const result = await fetchGithubRepo({
      repo: REPO_FULL_NAME,
      token: TOKEN,
      cache: new GithubRequestCache(),
      fetchImpl,
    });

    expect(result).toEqual({
      fullName: REPO_FULL_NAME,
      name: HELLO_WORLD,
      description: "My first repository",
      htmlUrl: `https://github.com/${REPO_FULL_NAME}`,
      stargazersCount: 80,
      forksCount: 9,
      subscribersCount: 42,
      openIssuesCount: 3,
      language: "TypeScript",
      license: "MIT",
      ownerLogin: OCTOCAT,
      ownerAvatarUrl: "https://avatars.githubusercontent.com/u/1?v=4",
      topics: [],
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(authorization(fetchImpl.mock.calls[0]?.[1])).toBe(`Bearer ${TOKEN}`);
    expect(
      fetchImpl.mock.calls.some(([input]) =>
        isRestLanguagesEndpoint(requestUrl(input)),
      ),
    ).toBe(false);
  });

  it("maps 401 to fail_run via the rate-limit classifier", async () => {
    const fetchImpl = mockFetch(async () =>
      jsonResponse(401, { message: "Bad credentials" }),
    );
    await expect(
      fetchGithubRepo({
        repo: REPO_FULL_NAME,
        token: TOKEN,
        cache: new GithubRequestCache(),
        fetchImpl,
      }),
    ).rejects.toMatchObject({
      name: "GithubRestError",
      outcome: "fail_run",
      status: 401,
    });
    expect(classifyGithubRateLimit({ status: 401 })).toBe("fail_run");
    expect(classifyGithubHttp({ status: 401 })).toBe("fail_run");
  });

  it("maps 404 to fail_widget via the rate-limit classifier", async () => {
    const fetchImpl = mockFetch(async () =>
      jsonResponse(404, { message: "Not Found" }),
    );
    await expect(
      fetchGithubRepo({
        repo: REPO_FULL_NAME,
        token: TOKEN,
        cache: new GithubRequestCache(),
        fetchImpl,
      }),
    ).rejects.toMatchObject({
      name: "GithubRestError",
      outcome: "fail_widget",
      status: 404,
    });
    expect(classifyGithubRateLimit({ status: 404 })).toBe("fail_widget");
    expect(classifyGithubHttp({ status: 404 })).toBe("fail_widget");
  });

  it("allows a repository named languages and never calls REST /languages", async () => {
    const fetchImpl = mockFetch(async (input, init) => {
      expect(authorization(init)).toBe(`Bearer ${TOKEN}`);
      const url = requestUrl(input);
      if (url === LANGUAGES_REPO_URL) {
        return jsonResponse(
          200,
          githubRepositoryJson({
            fullName: `${OCTOCAT}/languages`,
            name: "languages",
            language: "Go",
          }),
        );
      }
      throw new Error(`unexpected ${url}`);
    });

    const result = await fetchGithubRepo({
      repo: `${OCTOCAT}/languages`,
      token: TOKEN,
      cache: new GithubRequestCache(),
      fetchImpl,
    });

    expect(result.fullName).toBe(`${OCTOCAT}/languages`);
    expect(result.name).toBe("languages");
    expect(result.language).toBe("Go");
    expect(fetchImpl.mock.calls.map(([input]) => requestUrl(input))).toEqual([
      LANGUAGES_REPO_URL,
    ]);
    expect(
      fetchImpl.mock.calls.some(([input]) =>
        isRestLanguagesEndpoint(requestUrl(input)),
      ),
    ).toBe(false);
  });

  it("fails the job on empty/whitespace token and never fetches (never unauth)", async () => {
    const fetchImpl = mockFetch(async () => {
      throw new Error("fetch must not run for a missing token");
    });
    for (const token of ["", "   ", "\t\n", undefined, null] as const) {
      fetchImpl.mockClear();
      await expect(
        fetchGithubRepo({
          repo: REPO_FULL_NAME,
          token,
          cache: new GithubRequestCache(),
          fetchImpl,
        }),
      ).rejects.toMatchObject({
        name: "GithubRestError",
        outcome: "fail_job",
      });
      expect(fetchImpl).not.toHaveBeenCalled();
    }
  });

  it("fails the widget on invalid owner/name without fetching", async () => {
    const fetchImpl = mockFetch(async () => {
      throw new Error("fetch must not run for invalid owner/name");
    });
    for (const repo of [
      "octocat",
      "octocat/hello/world",
      "octocat/",
      "/hello",
    ]) {
      fetchImpl.mockClear();
      await expect(
        fetchGithubRepo({
          repo,
          token: TOKEN,
          cache: new GithubRequestCache(),
          fetchImpl,
        }),
      ).rejects.toMatchObject({
        name: "GithubRestError",
        outcome: "fail_widget",
      });
      expect(fetchImpl).not.toHaveBeenCalled();
    }
  });
});
