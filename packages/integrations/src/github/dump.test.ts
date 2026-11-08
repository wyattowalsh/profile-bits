/**
 * W2-G-06 dump tests. Cached payload keeps GET /users/{login} and owner-repo
 * dump fields. Crawl locks: Authorization, empty token fail_job, never REST
 * /languages, filter-then-cap 500. Extra dump keys stay on the cache.
 */

import { existsSync, globSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decideActionToken } from "@profile-bits/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GithubRequestCache } from "./cache.js";
import { createGithubClient, GithubClientError } from "./client.js";
import { PINNED_ITEMS_QUERY } from "./extra.js";
import { CONTRIBUTIONS_QUERY, LANGUAGES_NODES_QUERY } from "./graphql.js";
import { loadFixture } from "./loadFixture.js";
import {
  crawlGithubRest,
  fetchGithubRepo,
  GITHUB_API_ORIGIN,
  GITHUB_REST_DEPENDENT_WIDGETS,
  GITHUB_REST_REPO_CAP,
  type GithubRestFetch,
} from "./rest.js";

const OCTOCAT = "octocat";
const PAT = "ghp_test_token_not_a_secret";
const INSTALLATION = "ghs_test_token_not_a_secret";
const REPO_FULL_NAME = `${OCTOCAT}/Hello-World`;
const USER_URL = `${GITHUB_API_ORIGIN}/users/${OCTOCAT}`;
const REPOS_URL = `${GITHUB_API_ORIGIN}/users/${OCTOCAT}/repos`;
const REPO_URL = `${GITHUB_API_ORIGIN}/repos/${OCTOCAT}/Hello-World`;
const EVENTS_PATH = `/users/${OCTOCAT}/events/public`;
const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "../../../..");
const CLIENT_SOURCE = readFileSync(join(HERE, "client.ts"), "utf8");
const REST_SOURCE = readFileSync(join(HERE, "rest.ts"), "utf8");
const GRAPHQL_SOURCE = readFileSync(join(HERE, "graphql.ts"), "utf8");
const EXTRA_SOURCE = readFileSync(join(HERE, "extra.ts"), "utf8");

const CRAWL_SOURCES = [
  CLIENT_SOURCE,
  REST_SOURCE,
  GRAPHQL_SOURCE,
  EXTRA_SOURCE,
];

afterEach(() => {
  vi.restoreAllMocks();
});

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function requestUrl(input: URL): string {
  return input.href;
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

function graphqlQueries(
  fetchImpl: ReturnType<typeof mockFetch>,
): readonly string[] {
  return fetchImpl.mock.calls
    .filter(([input]) => pathnameOf(input) === "/graphql")
    .map(([, init]) => parseGraphqlBody(init).query);
}

function probeIdentity() {
  return { login: OCTOCAT, id: 1, type: "User" };
}

function publicEventJson() {
  return {
    id: "1",
    type: "PushEvent",
    actor: { login: OCTOCAT },
    repo: { name: REPO_FULL_NAME },
    public: true,
    created_at: "2026-01-15T00:00:00Z",
  };
}

function pinnedGraphqlBody(): unknown {
  return {
    data: {
      user: {
        pinnedItems: {
          nodes: [
            {
              __typename: "Repository",
              name: "Hello-World",
              nameWithOwner: REPO_FULL_NAME,
              description: "pinned extra",
              url: `https://github.com/${REPO_FULL_NAME}`,
              stargazerCount: 2000,
            },
          ],
        },
      },
      rateLimit: { cost: 1, remaining: 5000 },
    },
  };
}

function dumpFetch(token: string) {
  return mockFetch(async (input, init) => {
    expect(authorization(init)).toBe(`Bearer ${token}`);
    const url = requestUrl(input);
    expect(isRestLanguagesEndpoint(url)).toBe(false);
    const path = pathnameOf(input);
    if (path === "/user") {
      return jsonResponse(200, probeIdentity());
    }
    if (path === `/users/${OCTOCAT}`) {
      return jsonResponse(200, loadFixture("user.json"));
    }
    if (path === `/users/${OCTOCAT}/repos`) {
      return jsonResponse(200, loadFixture("repos.json"));
    }
    if (path === `/repos/${OCTOCAT}/Hello-World`) {
      return jsonResponse(200, loadFixture("repo.json"));
    }
    if (path === EVENTS_PATH) {
      return jsonResponse(200, [publicEventJson()]);
    }
    if (path === "/graphql") {
      const { query } = parseGraphqlBody(init);
      if (query === LANGUAGES_NODES_QUERY) {
        return jsonResponse(200, loadFixture("languages-nodes.json"));
      }
      if (query === CONTRIBUTIONS_QUERY) {
        return jsonResponse(200, loadFixture("contributions.json"));
      }
      if (query === PINNED_ITEMS_QUERY) {
        return jsonResponse(200, pinnedGraphqlBody());
      }
      throw new Error(`unexpected GraphQL ${query.slice(0, 80)}`);
    }
    throw new Error(`unexpected ${url}`);
  });
}

function payloadInput(
  overrides: Partial<{ widget: string; repo: string }> = {},
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

function calledUrls(fetchImpl: ReturnType<typeof mockFetch>): string[] {
  return fetchImpl.mock.calls.map(([input]) => requestUrl(input));
}

function expectNoRestLanguages(fetchImpl: ReturnType<typeof mockFetch>): void {
  expect(
    calledUrls(fetchImpl).some((url) => isRestLanguagesEndpoint(url)),
  ).toBe(false);
}

describe("W2-G-06 github dump", () => {
  it("fails the job on empty/whitespace token and never fetches (never unauth)", () => {
    const fetchImpl = mockFetch(async () => {
      throw new Error("fetch must not run for a missing token");
    });
    for (const token of ["", "   ", "\t\n"] as const) {
      fetchImpl.mockClear();
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

  it("crawlGithubRest fail_job on empty token and never REST /languages", async () => {
    const fetchImpl = mockFetch(async () => {
      throw new Error("unauth crawl must not run");
    });
    for (const token of ["", "   ", "\t\n", undefined, null] as const) {
      fetchImpl.mockClear();
      await expect(
        crawlGithubRest({
          login: OCTOCAT,
          token,
          cache: new GithubRequestCache(),
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

  it("dumps GET /users/{login} fields from fixtures, not the identity probe", async () => {
    const fetchImpl = dumpFetch(PAT);
    const client = createGithubClient({
      token: PAT,
      configuredUser: OCTOCAT,
      fetch: fetchImpl,
      cache: new GithubRequestCache(),
    });
    const payload = await client.loadPayload(payloadInput());

    expect(payload.user).toMatchObject({
      login: OCTOCAT,
      id: 583231,
      nodeId: "MDQ6VXNlcjU4MzIzMQ==",
      followers: 4000,
      following: 9,
      publicRepos: 8,
      publicGists: 8,
      name: "The Octocat",
      bio: "GitHub's mascot",
      avatarUrl: "https://avatars.githubusercontent.com/u/583231?v=4",
      createdAt: "2011-01-25T18:44:36Z",
    });
    expect(payload.user).toHaveProperty("name");
    expect(payload.user).toHaveProperty("bio");
    expect(payload.user).toHaveProperty("avatarUrl");
    expect(payload.user).toHaveProperty("createdAt");

    const urls = calledUrls(fetchImpl);
    expect(urls.some((url) => pathnameOf(new URL(url)) === "/user")).toBe(true);
    expect(urls.some((url) => url === USER_URL)).toBe(true);
    expectNoRestLanguages(fetchImpl);
    expect(JSON.stringify(payload)).not.toContain(PAT);
    expect(JSON.stringify(payload)).not.toContain("Bearer");
  });

  it("dumps owner-repo html_url, description, language, and topics after filter-then-cap", async () => {
    const fetchImpl = dumpFetch(PAT);
    const client = createGithubClient({
      token: PAT,
      configuredUser: OCTOCAT,
      fetch: fetchImpl,
      cache: new GithubRequestCache(),
    });
    const payload = await client.loadPayload(payloadInput());

    expect(GITHUB_REST_REPO_CAP).toBe(500);
    expect(payload.repositories.map((repo) => repo.name)).toEqual([
      "Hello-World",
      "boysenberry-repo-1",
    ]);
    expect(payload.repositories[0]).toMatchObject({
      htmlUrl: `https://github.com/${REPO_FULL_NAME}`,
      description: "My first repository on GitHub!",
      language: null,
      topics: ["octocat", "atom", "electron"],
    });
    expect(payload.repositories[1]).toMatchObject({
      htmlUrl: "https://github.com/octocat/boysenberry-repo-1",
      description: "Testing",
      language: "HTML",
      topics: ["html"],
    });
    expect(payload.repositoryIds).toEqual([
      "MDEwOlJlcG9zaXRvcnkxMjk2MjY5",
      "MDEwOlJlcG9zaXRvcnkxMzI5MzU2NDg=",
    ]);
    expect(
      payload.repositories.every((repo) => !repo.fork && !repo.archived),
    ).toBe(true);

    const urls = calledUrls(fetchImpl);
    expect(urls.some((url) => url.startsWith(`${REPOS_URL}?`))).toBe(true);
    expectNoRestLanguages(fetchImpl);
    for (const [, init] of fetchImpl.mock.calls) {
      expect(authorization(init)).toBe(`Bearer ${PAT}`);
    }
  });

  it("keeps language color/id from GraphQL nodes(ids:) and never REST /languages", async () => {
    const fetchImpl = dumpFetch(PAT);
    const client = createGithubClient({
      token: PAT,
      configuredUser: OCTOCAT,
      fetch: fetchImpl,
      cache: new GithubRequestCache(),
    });
    const payload = await client.loadPayload(
      payloadInput({ widget: "languages" }),
    );

    expect(payload.languages).toEqual([
      {
        name: "TypeScript",
        bytes: 1000,
        color: "#3178c6",
        id: "MDg6TGFuZ3VhZ2Ux",
      },
      {
        name: "Python",
        bytes: 400,
        color: "#3572A5",
        id: "MDg6TGFuZ3VhZ2Uy",
      },
    ]);
    expect(LANGUAGES_NODES_QUERY).toContain("node { name color id }");
    expect(LANGUAGES_NODES_QUERY).toContain("languages(first: 10");
    expect(LANGUAGES_NODES_QUERY).toContain(
      "pageInfo { hasNextPage endCursor }",
    );
    expect(graphqlQueries(fetchImpl)).toContain(LANGUAGES_NODES_QUERY);
    expectNoRestLanguages(fetchImpl);
  });

  it("dumps calendar weeks when capable and omits them without inventing 0", async () => {
    const capableFetch = dumpFetch(PAT);
    const capable = createGithubClient({
      token: PAT,
      configuredUser: OCTOCAT,
      fetch: capableFetch,
      cache: new GithubRequestCache(),
    });
    const dump = await capable.loadPayload(payloadInput());
    expect(dump.contributions).toBe(1600);
    expect(dump.calendar).toEqual({
      totalContributions: 1600,
      weeks: [
        {
          contributionDays: [
            { date: "2026-01-04", contributionCount: 3, weekday: 0 },
            { date: "2026-01-05", contributionCount: 1, weekday: 1 },
          ],
        },
        {
          contributionDays: [
            { date: "2026-01-11", contributionCount: 0, weekday: 0 },
          ],
        },
      ],
    });
    expect(capable.capabilities.canContributions).toBe(true);
    expect(graphqlQueries(capableFetch)).toContain(CONTRIBUTIONS_QUERY);
    expect(dump.pinnedItems?.[0]?.nameWithOwner).toBe(REPO_FULL_NAME);
    expect(dump.publicEvents?.[0]?.type).toBe("PushEvent");

    const installationFetch = dumpFetch(INSTALLATION);
    const installation = createGithubClient({
      token: INSTALLATION,
      configuredUser: OCTOCAT,
      fetch: installationFetch,
      cache: new GithubRequestCache(),
    });
    const omitted = await installation.loadPayload(payloadInput());
    expect(installation.capabilities.canContributions).toBe(false);
    expect(omitted).not.toHaveProperty("contributions");
    expect(omitted).not.toHaveProperty("calendar");
    expect(graphqlQueries(installationFetch)).not.toContain(
      CONTRIBUTIONS_QUERY,
    );
    expectNoRestLanguages(installationFetch);
  });

  it("dumps GET /repos/{owner}/{repo} fields and never REST /languages", async () => {
    const fetchImpl = dumpFetch(PAT);
    const client = createGithubClient({
      token: PAT,
      configuredUser: OCTOCAT,
      fetch: fetchImpl,
      cache: new GithubRequestCache(),
    });
    const payload = await client.loadPayload(
      payloadInput({ widget: "repo", repo: REPO_FULL_NAME }),
    );

    expect(payload.repository).toMatchObject({
      fullName: REPO_FULL_NAME,
      name: "Hello-World",
      description: "My first repository on GitHub!",
      htmlUrl: `https://github.com/${REPO_FULL_NAME}`,
      language: "TypeScript",
      topics: ["octocat", "atom", "electron"],
      license: "MIT",
      ownerLogin: OCTOCAT,
    });
    expect(payload.languages).toEqual([]);
    const paths = fetchImpl.mock.calls.map(([input]) => pathnameOf(input));
    expect(paths).toEqual(["/user", `/repos/${OCTOCAT}/Hello-World`]);
    expectNoRestLanguages(fetchImpl);
  });

  it("promotes dump fields through crawlGithubRest and fetchGithubRepo from fixtures", async () => {
    const fetchImpl = dumpFetch(PAT);
    const crawl = await crawlGithubRest({
      login: OCTOCAT,
      token: PAT,
      cache: new GithubRequestCache(),
      fetchImpl,
    });
    expect(crawl.user).toMatchObject({
      name: "The Octocat",
      bio: "GitHub's mascot",
      avatarUrl: "https://avatars.githubusercontent.com/u/583231?v=4",
      createdAt: "2011-01-25T18:44:36Z",
    });
    expect(crawl.repositories[0]).toMatchObject({
      htmlUrl: `https://github.com/${REPO_FULL_NAME}`,
      description: "My first repository on GitHub!",
      language: null,
      topics: ["octocat", "atom", "electron"],
    });
    expectNoRestLanguages(fetchImpl);
    expect(
      calledUrls(fetchImpl).some((url) =>
        /\/user(?:\?|$)/.test(new URL(url).pathname),
      ),
    ).toBe(false);

    const repoFetch = dumpFetch(PAT);
    const repository = await fetchGithubRepo({
      repo: REPO_FULL_NAME,
      token: PAT,
      cache: new GithubRequestCache(),
      fetchImpl: repoFetch,
    });
    expect(repository.topics).toEqual(["octocat", "atom", "electron"]);
    expect(repository.language).toBe("TypeScript");
    expect(requestUrl(repoFetch.mock.calls[0]?.[0] as URL)).toBe(REPO_URL);
    expectNoRestLanguages(repoFetch);
  });

  it("extends live client.ts and never REST /languages, flatten, or Playwright", () => {
    expect(existsSync(join(HERE, "client.ts"))).toBe(true);
    expect(GITHUB_REST_REPO_CAP).toBe(500);
    expect(REST_SOURCE).toContain("REST /languages is forbidden");
    expect(GRAPHQL_SOURCE).toContain("nodes(ids:");
    expect(GRAPHQL_SOURCE).toContain("Never REST /languages");
    for (const source of CRAWL_SOURCES) {
      expect(source).not.toMatch(/\/repos\/\$\{[^}]+}\/\$\{[^}]+}\/languages/);
      expect(source).toMatch(/fail_job/);
      expect(source).not.toMatch(/\bplaywright\b/i);
      expect(source).not.toMatch(/plugin_[a-z]+_[a-z]+_/);
      expect(source).not.toContain("author-integration add");
    }
    expect(() =>
      createGithubClient({ token: "", configuredUser: OCTOCAT }),
    ).toThrow(GithubClientError);
  });

  it("keeps Playwright out of the Action and flattened plugin_*_*_* inputs out of action.yml", () => {
    const actionYml = readFileSync(join(REPO_ROOT, "action.yml"), "utf8");
    const actionPackage = readFileSync(
      join(REPO_ROOT, "packages/action/package.json"),
      "utf8",
    );
    const actionSources = globSync("packages/action/src/**/*.{ts,js}", {
      cwd: REPO_ROOT,
    }).map((relative: string) =>
      readFileSync(join(REPO_ROOT, relative), "utf8"),
    );

    expect(actionSources.length).toBeGreaterThan(0);
    expect(actionYml).not.toMatch(/plugin_[a-z]+_[a-z]+_[a-z]+/);
    expect(actionYml).not.toMatch(/\bplaywright\b/i);
    expect(actionPackage).not.toMatch(/\bplaywright\b/i);
    for (const source of actionSources) {
      expect(source).not.toMatch(/\bplaywright\b/i);
    }
  });
});
