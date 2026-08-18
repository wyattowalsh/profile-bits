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
import { afterEach, describe, expect, it, vi } from "vitest";
import type { WidgetRenderRequest } from "./engine.ts";
import {
  createGithubRenderWidget,
  UnhandledGithubWidgetError,
} from "./render-github.ts";

const TOKEN = "ghs_test_token";

const GITHUB_YAML = `version: 1
format: svg
plugins:
  github:
    widgets:
      demo: {}
      stats: {}
      languages: {}
`;

const PUBLIC_CAPABILITIES: Capabilities = {
  canPrivate: false,
  canContributions: false,
  canGist: false,
};

function githubRequest(
  id: "demo" | "stats" | "languages",
): WidgetRenderRequest {
  const config = parseConfig({ yaml: GITHUB_YAML });
  const widgets = config.plugins.github?.widgets;
  const options =
    id === "demo"
      ? widgets?.demo
      : id === "stats"
        ? widgets?.stats
        : widgets?.languages;
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

describe("createGithubRenderWidget", () => {
  afterEach(() => {
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
});
