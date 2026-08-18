import {
  classifyGithubHttp,
  decideActionToken,
  decideIncludePrivate,
} from "@profile-bits/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GithubRequestCache } from "./cache.js";
import {
  createGithubClient,
  GITHUB_PROBE_URL,
  GithubClientError,
  inferGithubTokenClass,
} from "./client.js";
import { classifyGithubRateLimit } from "./rate-limit.js";
import {
  GITHUB_API_ORIGIN,
  GithubRestError,
  type GithubRestFetch,
} from "./rest.js";

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
    expect(second.repositoryIds).toEqual(first.repositoryIds);
    const paths = fetchImpl.mock.calls.map(([input]) => pathnameOf(input));
    expect(paths.filter((path) => path === "/user")).toHaveLength(1);
    expect(paths.some((path) => path === `/users/${OCTOCAT}`)).toBe(true);
    expect(paths.some((path) => path.includes("/languages"))).toBe(false);
    expect(paths.some((path) => path === "/graphql")).toBe(false);
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
      return jsonResponse(404, { message: "Not Found" });
    });
    const client = createGithubClient({
      token: INSTALLATION,
      configuredUser: OCTOCAT,
      fetch: fetchImpl,
    });

    const payload = await client.loadPayload(payloadInput());
    expect(payload.repositoryIds).toEqual(["R_1"]);
    expect(client.tokenClass).toBe("actions_installation");
    expect(client.capabilities.canPrivate).toBe(false);
    const paths = fetchImpl.mock.calls.map(([input]) => pathnameOf(input));
    expect(paths).toContain("/user");
    expect(paths.some((path) => path === "/user/repos")).toBe(false);
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
    expect(client.capabilities.canPrivate).toBe(true);
    const paths = fetchImpl.mock.calls.map(([input]) => pathnameOf(input));
    expect(paths).toContain("/user");
    expect(paths).not.toContain("/graphql");
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
      GithubRestError,
    );
    await expect(client.loadPayload(payloadInput())).rejects.toMatchObject({
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
});
