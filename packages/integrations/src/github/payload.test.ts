import { afterEach, describe, expect, it, vi } from "vitest";
import { GithubRequestCache } from "./cache.js";
import {
  CONTRIBUTIONS_QUERY,
  fetchContributionCalendar,
  fetchRepositoryLanguages,
  LANGUAGES_NODES_QUERY,
} from "./graphql.js";
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
  type GithubRestFetch,
} from "./rest.js";

const OCTOCAT = "octocat";
const TOKEN = "ghs_test_token_not_a_secret";
const USER_URL = `${GITHUB_API_ORIGIN}/users/${OCTOCAT}`;
const REPOS_URL = `${GITHUB_API_ORIGIN}/users/${OCTOCAT}/repos`;
const REPO_FULL_NAME = `${OCTOCAT}/Hello-World`;
const REPO_URL = `${GITHUB_API_ORIGIN}/repos/${OCTOCAT}/Hello-World`;

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

function dumpUser() {
  return {
    login: OCTOCAT,
    id: 1,
    node_id: "U_octocat",
    followers: 10,
    following: 2,
    public_repos: 3,
    public_gists: 1,
    name: "The Octocat",
    bio: "GitHub mascot",
    avatar_url: "https://avatars.githubusercontent.com/u/1?v=4",
    created_at: "2011-01-25T18:44:36Z",
  };
}

function dumpOwnerRepo() {
  return {
    id: 1,
    node_id: "R_1",
    name: "Hello-World",
    full_name: REPO_FULL_NAME,
    fork: false,
    archived: false,
    private: false,
    stargazers_count: 80,
    forks_count: 9,
    html_url: `https://github.com/${REPO_FULL_NAME}`,
    description: "My first repository",
    language: "TypeScript",
    topics: ["octocat", "atom", "electron"],
  };
}

describe("parseGithubUser", () => {
  it("keeps name, bio, avatar_url, and created_at from GET /users/{login}", () => {
    const user = parseGithubUser(dumpUser());
    expect(user).toEqual({
      login: OCTOCAT,
      id: 1,
      nodeId: "U_octocat",
      followers: 10,
      following: 2,
      publicRepos: 3,
      publicGists: 1,
      name: "The Octocat",
      bio: "GitHub mascot",
      avatarUrl: "https://avatars.githubusercontent.com/u/1?v=4",
      createdAt: "2011-01-25T18:44:36Z",
    });
    expect(JSON.stringify(user)).not.toContain(TOKEN);
  });

  it("keeps null name/bio instead of dropping the keys", () => {
    const user = parseGithubUser({
      ...dumpUser(),
      name: null,
      bio: null,
    });
    expect(user?.name).toBeNull();
    expect(user?.bio).toBeNull();
    expect(user).toHaveProperty("avatarUrl");
    expect(user).toHaveProperty("createdAt");
  });
});

describe("parseGithubOwnerRepository", () => {
  it("keeps html_url, description, language, and topics", () => {
    expect(parseGithubOwnerRepository(dumpOwnerRepo())).toEqual({
      id: 1,
      nodeId: "R_1",
      name: "Hello-World",
      fullName: REPO_FULL_NAME,
      fork: false,
      archived: false,
      private: false,
      stargazersCount: 80,
      forksCount: 9,
      htmlUrl: `https://github.com/${REPO_FULL_NAME}`,
      description: "My first repository",
      language: "TypeScript",
      topics: ["octocat", "atom", "electron"],
    });
  });
});

describe("parseGithubRepository", () => {
  it("keeps topics on GET /repos/{owner}/{repo}", () => {
    const repository = parseGithubRepository({
      full_name: REPO_FULL_NAME,
      name: "Hello-World",
      description: "My first repository",
      html_url: `https://github.com/${REPO_FULL_NAME}`,
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
      topics: ["octocat", "atom"],
    });
    expect(repository?.topics).toEqual(["octocat", "atom"]);
    expect(repository?.language).toBe("TypeScript");
  });
});

describe("language node dump", () => {
  it("keeps color and id alongside name and size", () => {
    const totals = new Map<string, GithubLanguageAccumulator>();
    mergeGithubLanguageBytes(totals, {
      data: {
        nodes: [
          {
            id: "R_1",
            languages: {
              edges: [
                {
                  size: 10,
                  node: {
                    name: "TypeScript",
                    color: "#3178c6",
                    id: "MDg6TGFuZ3VhZ2Ux",
                  },
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: "cursor" },
            },
          },
        ],
      },
    });
    expect(languageBytesFromTotals(totals)).toEqual([
      {
        name: "TypeScript",
        bytes: 10,
        color: "#3178c6",
        id: "MDg6TGFuZ3VhZ2Ux",
      },
    ]);
  });

  it("does not add color/id when the GraphQL node omitted them", () => {
    const totals = new Map<string, GithubLanguageAccumulator>();
    mergeGithubLanguageBytes(totals, {
      data: {
        nodes: [
          {
            id: "R_1",
            languages: {
              edges: [{ size: 10, node: { name: "Go" } }],
            },
          },
        ],
      },
    });
    expect(languageBytesFromTotals(totals)).toEqual([
      { name: "Go", bytes: 10 },
    ]);
  });
});

describe("parseGithubContributionCalendar", () => {
  it("dumps totalContributions and calendar weeks", () => {
    expect(
      parseGithubContributionCalendar({
        data: {
          user: {
            contributionsCollection: {
              contributionCalendar: {
                totalContributions: 42,
                weeks: [
                  {
                    contributionDays: [
                      {
                        date: "2026-01-04",
                        contributionCount: 3,
                        weekday: 0,
                      },
                    ],
                  },
                ],
              },
            },
          },
        },
      }),
    ).toEqual({
      totalContributions: 42,
      weeks: [
        {
          contributionDays: [
            { date: "2026-01-04", contributionCount: 3, weekday: 0 },
          ],
        },
      ],
    });
  });

  it("omits the calendar instead of inventing 0 when total is missing", () => {
    expect(
      parseGithubContributionCalendar({
        data: {
          user: { contributionsCollection: { contributionCalendar: {} } },
        },
      }),
    ).toBeUndefined();
  });
});

describe("dump queries", () => {
  it("requests language color, id, and pageInfo and never REST /languages", () => {
    expect(LANGUAGES_NODES_QUERY).toContain("node { name color id }");
    expect(LANGUAGES_NODES_QUERY).toContain(
      "pageInfo { hasNextPage endCursor }",
    );
    expect(LANGUAGES_NODES_QUERY).toContain("languages(first: 10");
    expect(LANGUAGES_NODES_QUERY).not.toContain("/languages");
    expect(LANGUAGES_NODES_QUERY).not.toContain("/repos/");
  });

  it("requests contribution calendar weeks when capable", () => {
    expect(CONTRIBUTIONS_QUERY).toContain("totalContributions");
    expect(CONTRIBUTIONS_QUERY).toContain("weeks");
    expect(CONTRIBUTIONS_QUERY).toContain(
      "contributionDays { date contributionCount weekday }",
    );
  });
});

describe("parsed cache promotion", () => {
  it("promotes user and owner-repo dump fields through crawlGithubRest", async () => {
    const fetchImpl = vi.fn<GithubRestFetch>(async (input) => {
      const url = requestUrl(input);
      if (url === USER_URL) {
        return jsonResponse(200, dumpUser());
      }
      if (url.startsWith(`${REPOS_URL}?`)) {
        return jsonResponse(200, [dumpOwnerRepo()]);
      }
      return jsonResponse(404, { message: "Not Found" });
    });

    const result = await crawlGithubRest({
      login: OCTOCAT,
      token: TOKEN,
      cache: new GithubRequestCache(),
      fetchImpl,
    });

    expect(result.user).toMatchObject({
      name: "The Octocat",
      bio: "GitHub mascot",
      avatarUrl: "https://avatars.githubusercontent.com/u/1?v=4",
      createdAt: "2011-01-25T18:44:36Z",
    });
    expect(result.repositories[0]).toMatchObject({
      htmlUrl: `https://github.com/${REPO_FULL_NAME}`,
      description: "My first repository",
      language: "TypeScript",
      topics: ["octocat", "atom", "electron"],
    });
    const urls = fetchImpl.mock.calls.map(([input]) => requestUrl(input));
    expect(urls.some((url) => url.includes("/languages"))).toBe(false);
    expect(JSON.stringify(result)).not.toContain(TOKEN);
  });

  it("promotes repo GET topics through fetchGithubRepo", async () => {
    const fetchImpl = vi.fn<GithubRestFetch>(async (input) => {
      expect(requestUrl(input)).toBe(REPO_URL);
      return jsonResponse(200, {
        ...dumpOwnerRepo(),
        subscribers_count: 42,
        open_issues_count: 3,
        license: { spdx_id: "MIT" },
        owner: {
          login: OCTOCAT,
          avatar_url: "https://avatars.githubusercontent.com/u/1?v=4",
        },
      });
    });

    const repository = await fetchGithubRepo({
      repo: REPO_FULL_NAME,
      token: TOKEN,
      cache: new GithubRequestCache(),
      fetchImpl,
    });
    expect(repository.topics).toEqual(["octocat", "atom", "electron"]);
    expect(repository.language).toBe("TypeScript");
    expect(
      fetchImpl.mock.calls.some(([input]) =>
        requestUrl(input).includes("/languages"),
      ),
    ).toBe(false);
  });

  it("keeps language color/id from GraphQL nodes(ids:)", async () => {
    const fetchImpl = vi.fn(async (_input: URL, init?: RequestInit) => {
      const parsed = JSON.parse(String(init?.body)) as { query: string };
      expect(parsed.query).toBe(LANGUAGES_NODES_QUERY);
      return jsonResponse(200, {
        data: {
          nodes: [
            {
              id: "R_1",
              languages: {
                edges: [
                  {
                    size: 10,
                    node: {
                      name: "TypeScript",
                      color: "#3178c6",
                      id: "MDg6TGFuZ3VhZ2Ux",
                    },
                  },
                ],
                pageInfo: { hasNextPage: false, endCursor: null },
              },
            },
          ],
          rateLimit: { cost: 1, remaining: 5000 },
        },
      });
    });

    await expect(
      fetchRepositoryLanguages({
        repositoryIds: ["R_1"],
        token: TOKEN,
        cache: new GithubRequestCache(),
        fetchImpl,
      }),
    ).resolves.toEqual([
      {
        name: "TypeScript",
        bytes: 10,
        color: "#3178c6",
        id: "MDg6TGFuZ3VhZ2Ux",
      },
    ]);
  });

  it("dumps calendar weeks through fetchContributionCalendar and omits when incapable", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(200, {
        data: {
          user: {
            contributionsCollection: {
              contributionCalendar: {
                totalContributions: 42,
                weeks: [
                  {
                    contributionDays: [
                      {
                        date: "2026-01-04",
                        contributionCount: 3,
                        weekday: 0,
                      },
                    ],
                  },
                ],
              },
            },
          },
          rateLimit: { cost: 1, remaining: 5000 },
        },
      }),
    );

    await expect(
      fetchContributionCalendar({
        login: OCTOCAT,
        token: TOKEN,
        cache: new GithubRequestCache(),
        canContributions: true,
        fetchImpl,
      }),
    ).resolves.toEqual({
      totalContributions: 42,
      weeks: [
        {
          contributionDays: [
            { date: "2026-01-04", contributionCount: 3, weekday: 0 },
          ],
        },
      ],
    });

    const skipped = vi.fn();
    await expect(
      fetchContributionCalendar({
        login: OCTOCAT,
        token: TOKEN,
        cache: new GithubRequestCache(),
        canContributions: false,
        fetchImpl: skipped,
      }),
    ).resolves.toBeUndefined();
    expect(skipped).not.toHaveBeenCalled();
  });
});
