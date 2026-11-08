import { existsSync, readFileSync } from "node:fs";
import { decideActionToken } from "@profile-bits/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GithubRequestCache } from "./cache.js";
import {
  GITHUB_FIXTURE_NAMES,
  type GithubFixtureName,
  githubFixturePath,
  loadFixture,
} from "./loadFixture.js";
import {
  type GithubLanguageAccumulator,
  languageBytesFromTotals,
  mergeGithubLanguageBytes,
  parseGithubContributionCalendar,
  parseGithubOwnerRepository,
  parseGithubRepository,
  parseGithubUser,
} from "./payload.js";
import {
  crawlGithubRest,
  fetchGithubRepo,
  GITHUB_API_ORIGIN,
  GITHUB_REST_DEPENDENT_WIDGETS,
  type GithubRestFetch,
} from "./rest.js";

const OCTOCAT = "octocat";
const TOKEN = "ghs_test_token_not_a_secret";
const USER_URL = `${GITHUB_API_ORIGIN}/users/${OCTOCAT}`;
const REPOS_URL = `${GITHUB_API_ORIGIN}/users/${OCTOCAT}/repos`;
const REPO_FULL_NAME = `${OCTOCAT}/Hello-World`;
const REPO_URL = `${GITHUB_API_ORIGIN}/repos/${OCTOCAT}/Hello-World`;

const USER_DUMP_FIELDS = [
  "login",
  "id",
  "node_id",
  "followers",
  "following",
  "public_repos",
  "public_gists",
  "name",
  "bio",
  "avatar_url",
  "created_at",
] as const;

const OWNER_REPO_DUMP_FIELDS = [
  "id",
  "node_id",
  "name",
  "full_name",
  "fork",
  "archived",
  "private",
  "stargazers_count",
  "forks_count",
  "html_url",
  "description",
  "language",
  "topics",
] as const;

const REPO_GET_DUMP_FIELDS = [
  "full_name",
  "name",
  "description",
  "html_url",
  "stargazers_count",
  "forks_count",
  "subscribers_count",
  "open_issues_count",
  "language",
  "license",
  "topics",
] as const;

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

function asRecord(value: unknown): Record<string, unknown> {
  expect(value).toEqual(expect.any(Object));
  expect(Array.isArray(value)).toBe(false);
  return value as Record<string, unknown>;
}

function expectKeys(
  value: unknown,
  keys: readonly string[],
): Record<string, unknown> {
  const record = asRecord(value);
  for (const key of keys) {
    expect(record).toHaveProperty(key);
  }
  return record;
}

describe("loadFixture", () => {
  it("loads every named GitHub dump fixture from disk without network", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    for (const name of GITHUB_FIXTURE_NAMES) {
      expect(existsSync(githubFixturePath(name))).toBe(true);
      expect(loadFixture(name)).not.toBeUndefined();
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("throws on an unknown fixture name", () => {
    expect(() => loadFixture("missing.json" as GithubFixtureName)).toThrow(
      /unknown github fixture/,
    );
  });
});

describe("GET /users/{login} dump fixture", () => {
  it("keeps name, bio, avatar_url, and created_at", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const raw = expectKeys(loadFixture("user.json"), USER_DUMP_FIELDS);

    expect(raw.login).toBe(OCTOCAT);
    expect(raw.name).toBe("The Octocat");
    expect(raw.bio).toBe("GitHub's mascot");
    expect(raw.avatar_url).toBe(
      "https://avatars.githubusercontent.com/u/583231?v=4",
    );
    expect(raw.created_at).toBe("2011-01-25T18:44:36Z");
    expect(raw).toHaveProperty("company");
    expect(raw).toHaveProperty("updated_at");

    const user = parseGithubUser(raw);
    expect(user).toMatchObject({
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
    expect(JSON.stringify(user)).not.toContain(TOKEN);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("owner-repo dump fixture", () => {
  it("keeps html_url, description, language, and topics on each page item", () => {
    const raw = loadFixture("repos.json");
    expect(Array.isArray(raw)).toBe(true);
    const repos = raw as unknown[];
    expect(repos.length).toBeGreaterThan(0);

    for (const entry of repos) {
      const record = expectKeys(entry, OWNER_REPO_DUMP_FIELDS);
      expect(Array.isArray(record.topics)).toBe(true);
      expect(parseGithubOwnerRepository(record)).not.toBeNull();
    }

    const helloWorld = asRecord(
      repos.find((entry) => asRecord(entry).name === "Hello-World"),
    );
    expect(helloWorld.html_url).toBe(`https://github.com/${REPO_FULL_NAME}`);
    expect(helloWorld.description).toBe("My first repository on GitHub!");
    expect(helloWorld).toHaveProperty("language");
    expect(helloWorld.topics).toEqual(["octocat", "atom", "electron"]);
    expect(helloWorld).toHaveProperty("languages_url");

    const parsed = parseGithubOwnerRepository(helloWorld);
    expect(parsed).toMatchObject({
      htmlUrl: `https://github.com/${REPO_FULL_NAME}`,
      description: "My first repository on GitHub!",
      language: null,
      topics: ["octocat", "atom", "electron"],
    });
  });
});

describe("GET /repos/{owner}/{repo} dump fixture", () => {
  it("keeps topics plus leftover repository object fields", () => {
    const raw = expectKeys(loadFixture("repo.json"), REPO_GET_DUMP_FIELDS);
    expect(raw.topics).toEqual(["octocat", "atom", "electron"]);
    expect(asRecord(raw.owner).login).toBe(OCTOCAT);
    expect(asRecord(raw.owner).avatar_url).toBe(
      "https://avatars.githubusercontent.com/u/583231?v=4",
    );

    const repository = parseGithubRepository(raw);
    expect(repository).toMatchObject({
      fullName: REPO_FULL_NAME,
      name: "Hello-World",
      description: "My first repository on GitHub!",
      htmlUrl: `https://github.com/${REPO_FULL_NAME}`,
      stargazersCount: 2000,
      forksCount: 1400,
      subscribersCount: 42,
      openIssuesCount: 3,
      language: "TypeScript",
      license: "MIT",
      ownerLogin: OCTOCAT,
      ownerAvatarUrl: "https://avatars.githubusercontent.com/u/583231?v=4",
      topics: ["octocat", "atom", "electron"],
    });
  });
});

describe("GraphQL language node dump fixture", () => {
  it("keeps color and id alongside name and size (not REST /languages)", () => {
    const body = loadFixture("languages-nodes.json");
    const data = asRecord(asRecord(body).data);
    expect(Array.isArray(data.nodes)).toBe(true);
    expect(Object.hasOwn(asRecord(body), "TypeScript")).toBe(false);

    const totals = new Map<string, GithubLanguageAccumulator>();
    mergeGithubLanguageBytes(totals, body);
    expect(languageBytesFromTotals(totals)).toEqual([
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
  });
});

describe("GraphQL contribution calendar dump fixture", () => {
  it("dumps totalContributions and calendar weeks", () => {
    expect(
      parseGithubContributionCalendar(loadFixture("contributions.json")),
    ).toEqual({
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
  });
});

describe("crawlGithubRest from dump fixtures", () => {
  it("fails the job on empty/whitespace token and never fetches (never unauth)", async () => {
    const fetchImpl = vi.fn<GithubRestFetch>(async () => {
      throw new Error("fetch must not run for a missing token");
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

  it("promotes dump fields with Authorization and never REST /languages or GET /user", async () => {
    const fetchImpl = vi.fn<GithubRestFetch>(async (input, init) => {
      expect(authorization(init)).toBe(`Bearer ${TOKEN}`);
      const url = requestUrl(input);
      if (url === USER_URL) {
        return jsonResponse(200, loadFixture("user.json"));
      }
      if (url.startsWith(`${REPOS_URL}?`)) {
        return jsonResponse(200, loadFixture("repos.json"));
      }
      throw new Error(`unexpected ${url}`);
    });

    const result = await crawlGithubRest({
      login: OCTOCAT,
      token: TOKEN,
      cache: new GithubRequestCache(),
      fetchImpl,
    });

    expect(result.user).toMatchObject({
      name: "The Octocat",
      bio: "GitHub's mascot",
      avatarUrl: "https://avatars.githubusercontent.com/u/583231?v=4",
      createdAt: "2011-01-25T18:44:36Z",
    });
    expect(result.repositories.map((repo) => repo.name)).toEqual([
      "Hello-World",
      "boysenberry-repo-1",
    ]);
    expect(result.repositories[0]).toMatchObject({
      htmlUrl: `https://github.com/${REPO_FULL_NAME}`,
      description: "My first repository on GitHub!",
      language: null,
      topics: ["octocat", "atom", "electron"],
    });
    expect(result.repositories[1]).toMatchObject({
      htmlUrl: "https://github.com/octocat/boysenberry-repo-1",
      description: "Testing",
      language: "HTML",
      topics: ["html"],
    });
    expect(result.repositoryIds).toEqual([
      "MDEwOlJlcG9zaXRvcnkxMjk2MjY5",
      "MDEwOlJlcG9zaXRvcnkxMzI5MzU2NDg=",
    ]);

    const urls = fetchImpl.mock.calls.map(([input]) => requestUrl(input));
    expect(urls.some((url) => isRestLanguagesEndpoint(url))).toBe(false);
    expect(
      urls.some((url) => /\/user(?:\?|$)/.test(new URL(url).pathname)),
    ).toBe(false);
    expect(JSON.stringify(result)).not.toContain(TOKEN);
    expect(JSON.stringify(result)).not.toContain("Bearer");
  });

  it("promotes repo GET dump fields and never calls REST /languages", async () => {
    const fetchImpl = vi.fn<GithubRestFetch>(async (input, init) => {
      expect(authorization(init)).toBe(`Bearer ${TOKEN}`);
      expect(requestUrl(input)).toBe(REPO_URL);
      return jsonResponse(200, loadFixture("repo.json"));
    });

    const repository = await fetchGithubRepo({
      repo: REPO_FULL_NAME,
      token: TOKEN,
      cache: new GithubRequestCache(),
      fetchImpl,
    });
    expect(repository.topics).toEqual(["octocat", "atom", "electron"]);
    expect(repository.language).toBe("TypeScript");
    expect(repository.license).toBe("MIT");
    expect(
      fetchImpl.mock.calls.some(([input]) =>
        isRestLanguagesEndpoint(requestUrl(input)),
      ),
    ).toBe(false);
  });
});

describe("github dump fixtures stay secret-free", () => {
  it("does not persist tokens in fixture files", () => {
    for (const name of GITHUB_FIXTURE_NAMES) {
      const text = readFileSync(githubFixturePath(name), "utf8");
      expect(text).not.toContain(TOKEN);
      expect(text).not.toMatch(/\b(ghs_|ghp_|github_pat_|Bearer )\b/);
    }
  });
});
