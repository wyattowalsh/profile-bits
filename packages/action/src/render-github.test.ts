import {
  type ActionInputs,
  ActionInputsSchema,
  type Capabilities,
  parseConfig,
} from "@profile-bits/core";
import {
  type GithubClient,
  GithubClientError,
} from "@profile-bits/integrations";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WidgetRenderRequest } from "./engine.ts";
import {
  createGithubRenderWidget,
  UnhandledGithubWidgetError,
} from "./render-github.ts";

const TOKEN = "ghs_test_token";
const STATS_FAIL_LINE = "github stats fail_widget";

const GITHUB_YAML = `version: 1
format: svg
plugins:
  github:
    widgets:
      demo: {}
      stats: {}
      languages: {}
      repo:
        repo: octocat/hello-world
`;

const REPO_FULL_NAME = "octocat/hello-world";

const PUBLIC_CAPABILITIES: Capabilities = {
  canPrivate: false,
  canContributions: false,
  canGist: false,
};

function githubRequest(
  id: "demo" | "stats" | "languages" | "repo",
): WidgetRenderRequest {
  const config = parseConfig({ yaml: GITHUB_YAML });
  const widgets = config.plugins.github?.widgets;
  const options = widgets?.[id];
  if (options === undefined) {
    throw new Error(`expected ${id} widget options`);
  }
  const inputs: ActionInputs = ActionInputsSchema.parse({
    github_token: TOKEN,
    output_action: "none",
    user: "octocat",
  });
  return {
    id,
    options,
    config,
    inputs,
    capabilities: PUBLIC_CAPABILITIES,
  };
}

function mockClient(loadPayload: GithubClient["loadPayload"]): GithubClient {
  return {
    tokenClass: "actions_installation",
    capabilities: PUBLIC_CAPABILITIES,
    loadPayload,
    fetchPayload: loadPayload,
  };
}

function loadPayloadMock(payload: unknown): GithubClient["loadPayload"] {
  return vi.fn(
    async () => payload as Awaited<ReturnType<GithubClient["loadPayload"]>>,
  );
}

function assertCardSvg(svg: string): void {
  expect(svg).toMatch(/<svg\b/);
  expect(svg).toMatch(/width="480"/);
  expect(svg).toMatch(/height="160"/);
}

function capturedWrites(spy: {
  mock: { calls: readonly unknown[][] };
}): string {
  return spy.mock.calls.map((args) => String(args[0] ?? "")).join("");
}

function expectNoSecrets(haystack: string): void {
  expect(haystack).not.toContain(TOKEN);
}

function repoPayload(): unknown {
  return {
    user: { login: "octocat" },
    repositories: [],
    repositoryIds: [],
    languages: [],
    repository: {
      fullName: REPO_FULL_NAME,
      name: "hello-world",
      stargazersCount: 10,
      forksCount: 2,
      openIssuesCount: 1,
      license: "MIT",
    },
  };
}

function assertNeverLanguagesRest(fetchSpy: {
  mock: { calls: readonly unknown[][] };
}): void {
  expect(fetchSpy.mock.calls).toHaveLength(0);
  const haystack = fetchSpy.mock.calls
    .map((args) => String(args[0] ?? ""))
    .join("");
  expect(haystack).not.toMatch(/\/languages/);
}

describe("createGithubRenderWidget", () => {
  beforeEach(() => {
    vi.stubEnv("GITHUB_ACTIONS", "");
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("renders demo from a mocked payload as demo.svg", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const loadPayload = loadPayloadMock({
      user: { login: "octocat" },
      demo: { text: "hello" },
    });
    const render = createGithubRenderWidget({
      client: mockClient(loadPayload),
    });

    const result = await render(githubRequest("demo"));

    expect(result.id).toBe("demo");
    expect(result.outcome).toBe("render");
    expect(result.files).toHaveLength(1);
    expect(result.files?.[0]?.path).toBe("demo.svg");
    expect(typeof result.files?.[0]?.contents).toBe("string");
    assertCardSvg(String(result.files?.[0]?.contents));
    expect(loadPayload).toHaveBeenCalledWith({
      user: "octocat",
      widget: "demo",
      includePrivate: false,
      includeForks: false,
      includeArchived: false,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("renders stats from a mocked crawl-shaped payload as stats.svg", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const loadPayload = loadPayloadMock({
      user: { login: "octocat", followers: 4 },
      repositories: [
        { stargazersCount: 10, forksCount: 1 },
        { stargazersCount: 5, forksCount: 2 },
      ],
    });
    const render = createGithubRenderWidget({
      client: mockClient(loadPayload),
    });

    const result = await render(githubRequest("stats"));

    expect(result.id).toBe("stats");
    expect(result.outcome).toBe("render");
    expect(result.files).toHaveLength(1);
    expect(result.files?.[0]?.path).toBe("stats.svg");
    expect(typeof result.files?.[0]?.contents).toBe("string");
    assertCardSvg(String(result.files?.[0]?.contents));
    expect(loadPayload).toHaveBeenCalledWith({
      user: "octocat",
      widget: "stats",
      includePrivate: false,
      includeForks: false,
      includeArchived: false,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("renders languages from a test-only languages payload as languages.svg", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const loadPayload = loadPayloadMock({
      languages: [
        { name: "TypeScript", bytes: 80 },
        { name: "HTML", bytes: 20 },
      ],
    });
    const render = createGithubRenderWidget({
      client: mockClient(loadPayload),
    });

    const result = await render(githubRequest("languages"));

    expect(result.id).toBe("languages");
    expect(result.outcome).toBe("render");
    expect(result.files).toHaveLength(1);
    expect(result.files?.[0]?.path).toBe("languages.svg");
    expect(typeof result.files?.[0]?.contents).toBe("string");
    assertCardSvg(String(result.files?.[0]?.contents));
    expect(loadPayload).toHaveBeenCalledWith({
      user: "octocat",
      widget: "languages",
      includePrivate: false,
      includeForks: false,
      includeArchived: false,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("renders repo from a mocked payload as repo.svg", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const loadPayload = loadPayloadMock(repoPayload());
    const render = createGithubRenderWidget({
      client: mockClient(loadPayload),
    });

    const result = await render(githubRequest("repo"));

    expect(result.id).toBe("repo");
    expect(result.outcome).toBe("render");
    expect(result.files).toHaveLength(1);
    expect(result.files?.[0]?.path).toBe("repo.svg");
    expect(typeof result.files?.[0]?.contents).toBe("string");
    assertCardSvg(String(result.files?.[0]?.contents));
    expect(loadPayload).toHaveBeenCalledWith({
      user: "octocat",
      widget: "repo",
      repo: REPO_FULL_NAME,
      includePrivate: false,
      includeForks: false,
      includeArchived: false,
    });
    expect(loadPayload).toHaveBeenCalledOnce();
    assertNeverLanguagesRest(fetchSpy);
  });

  it("maps repo GithubClientError 404 fail_widget to no files", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const loadPayload = vi.fn(async () => {
      throw new GithubClientError(
        "fail_widget",
        "GitHub repository not found",
        {
          status: 404,
        },
      );
    });
    const render = createGithubRenderWidget({
      client: mockClient(loadPayload),
    });

    const result = await render(githubRequest("repo"));

    expect(result).toEqual({ id: "repo", outcome: "fail_widget" });
    expect(result.files).toBeUndefined();
    expect(loadPayload).toHaveBeenCalledWith({
      user: "octocat",
      widget: "repo",
      repo: REPO_FULL_NAME,
      includePrivate: false,
      includeForks: false,
      includeArchived: false,
    });
    assertNeverLanguagesRest(fetchSpy);
  });

  it("rethrows repo GithubClientError fail_run for 401", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const error = new GithubClientError("fail_run", "GitHub unauthorized", {
      status: 401,
    });
    const loadPayload = vi.fn(async () => {
      throw error;
    });
    const render = createGithubRenderWidget({
      client: mockClient(loadPayload),
    });

    await expect(render(githubRequest("repo"))).rejects.toBe(error);
    expect(loadPayload).toHaveBeenCalledWith({
      user: "octocat",
      widget: "repo",
      repo: REPO_FULL_NAME,
      includePrivate: false,
      includeForks: false,
      includeArchived: false,
    });
    assertNeverLanguagesRest(fetchSpy);
  });

  it("maps GithubClientError fail_widget to no files", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const loadPayload = vi.fn(async () => {
      throw new GithubClientError(
        "fail_widget",
        "include_private requires canPrivate; refusing a silent public crawl",
      );
    });
    const render = createGithubRenderWidget({
      client: mockClient(loadPayload),
    });

    const result = await render(githubRequest("stats"));

    expect(result).toEqual({ id: "stats", outcome: "fail_widget" });
    expect(result.files).toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("maps stats GithubClientError fail_widget without ::warning:: when GITHUB_ACTIONS is unset", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const loadPayload = vi.fn(async () => {
      throw new GithubClientError(
        "fail_widget",
        `include_private requires canPrivate ${TOKEN}`,
      );
    });
    const render = createGithubRenderWidget({
      client: mockClient(loadPayload),
    });

    const result = await render(githubRequest("stats"));
    const stdout = capturedWrites(vi.mocked(process.stdout.write));
    const stderr = capturedWrites(vi.mocked(process.stderr.write));
    const haystack = `${stdout}${stderr}`;

    expect(result).toEqual({ id: "stats", outcome: "fail_widget" });
    expect(result.files).toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(stderr).toContain(STATS_FAIL_LINE);
    expect(stdout).not.toContain("::warning::");
    expectNoSecrets(haystack);
  });

  it("emits ::warning:: and ::group::github stats for fail_widget when GITHUB_ACTIONS is true", async () => {
    vi.stubEnv("GITHUB_ACTIONS", "true");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const loadPayload = vi.fn(async () => {
      throw new GithubClientError(
        "fail_widget",
        `include_private requires canPrivate ${TOKEN}`,
      );
    });
    const render = createGithubRenderWidget({
      client: mockClient(loadPayload),
    });

    const result = await render(githubRequest("stats"));
    const stdout = capturedWrites(vi.mocked(process.stdout.write));
    const stderr = capturedWrites(vi.mocked(process.stderr.write));
    const haystack = `${stdout}${stderr}`;

    expect(result).toEqual({ id: "stats", outcome: "fail_widget" });
    expect(result.files).toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(stdout).toContain(`::warning::${STATS_FAIL_LINE}`);
    expect(stdout).toContain("::group::github stats");
    expect(stdout).toContain(`${STATS_FAIL_LINE}\n`);
    expect(stdout).toContain("::endgroup::\n");
    expect(stdout.match(/::warning::/g)).toHaveLength(1);
    expect(stdout.match(/::group::/g)).toHaveLength(1);
    expect(stdout).not.toContain("::error::");
    expect(stderr).toContain(`${STATS_FAIL_LINE}\n`);
    expectNoSecrets(haystack);
  });

  it("throws UnhandledGithubWidgetError for non-github ids", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const loadPayload = vi.fn();
    const render = createGithubRenderWidget({
      client: mockClient(loadPayload),
    });
    const request = githubRequest("demo");

    await expect(render({ ...request, id: "coding" })).rejects.toBeInstanceOf(
      UnhandledGithubWidgetError,
    );
    expect(loadPayload).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("does not throw UnhandledGithubWidgetError for repo", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const loadPayload = loadPayloadMock(repoPayload());
    const render = createGithubRenderWidget({
      client: mockClient(loadPayload),
    });

    await expect(render(githubRequest("repo"))).resolves.toMatchObject({
      id: "repo",
      outcome: "render",
    });
    expect(loadPayload).toHaveBeenCalledWith(
      expect.objectContaining({ widget: "repo", repo: REPO_FULL_NAME }),
    );
    assertNeverLanguagesRest(fetchSpy);
  });

  it.each(["fail_run", "fail_job", "fail_after_backoff"] as const)(
    "rethrows GithubClientError %s",
    async (outcome) => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      const error = new GithubClientError(outcome, `github ${outcome}`);
      const loadPayload = vi.fn(async () => {
        throw error;
      });
      const render = createGithubRenderWidget({
        client: mockClient(loadPayload),
      });

      await expect(render(githubRequest("stats"))).rejects.toBe(error);
      expect(fetchSpy).not.toHaveBeenCalled();
    },
  );

  it("does not emit ::warning:: when GithubClientError fail_run is rethrown", async () => {
    vi.stubEnv("GITHUB_ACTIONS", "true");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const error = new GithubClientError("fail_run", `github fail_run ${TOKEN}`);
    const loadPayload = vi.fn(async () => {
      throw error;
    });
    const render = createGithubRenderWidget({
      client: mockClient(loadPayload),
    });

    await expect(render(githubRequest("stats"))).rejects.toBe(error);
    const stdout = capturedWrites(vi.mocked(process.stdout.write));
    const stderr = capturedWrites(vi.mocked(process.stderr.write));
    const haystack = `${stdout}${stderr}`;

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(stdout).not.toContain("::warning::");
    expect(stdout).not.toContain("::group::github stats");
    expect(stderr).not.toContain(STATS_FAIL_LINE);
    expectNoSecrets(haystack);
  });
});
