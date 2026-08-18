import {
  type ActionInputs,
  ActionInputsSchema,
  type Capabilities,
  parseConfig,
  type WidgetId,
} from "@profile-bits/core";
import type { GithubClient, WakatimeClient } from "@profile-bits/integrations";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  EngineError,
  type RenderWidget,
  type WidgetRenderRequest,
} from "./engine.ts";
import {
  createRenderWidget,
  createRenderWidgetFromClients,
  UnhandledActionWidgetError,
} from "./render.ts";
import { createGithubRenderWidget } from "./render-github.ts";
import { createWakatimeRenderWidget } from "./render-wakatime.ts";

vi.mock("./render-wakatime.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./render-wakatime.ts")>();
  return {
    ...actual,
    createWakatimeRenderWidget: vi.fn(actual.createWakatimeRenderWidget),
  };
});

vi.mock("./render-github.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./render-github.ts")>();
  return {
    ...actual,
    createGithubRenderWidget: vi.fn(actual.createGithubRenderWidget),
  };
});

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

const WAKATIME_YAML = `version: 1
format: svg
plugins:
  wakatime: {}
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
  return {
    id,
    options,
    config,
    inputs: actionInputs(),
    capabilities: PUBLIC_CAPABILITIES,
  };
}

function codingRequest(): WidgetRenderRequest {
  const config = parseConfig({ yaml: WAKATIME_YAML });
  const options = config.plugins.wakatime?.widgets?.coding;
  if (options === undefined) {
    throw new Error("expected coding widget options");
  }
  return {
    id: "coding",
    options,
    config,
    inputs: actionInputs(),
    capabilities: PUBLIC_CAPABILITIES,
  };
}

function actionInputs(): ActionInputs {
  return ActionInputsSchema.parse({
    github_token: TOKEN,
    output_action: "none",
    user: "octocat",
  });
}

function stubWidget(): ReturnType<typeof vi.fn<RenderWidget>> {
  return vi.fn<RenderWidget>((request) => ({
    id: request.id,
    outcome: "render",
  }));
}

function fakeGithubClient(): GithubClient {
  return {
    tokenClass: "actions_installation",
    capabilities: PUBLIC_CAPABILITIES,
    loadPayload: vi.fn(),
    fetchPayload: vi.fn(),
  };
}

function fakeWakatimeClient(): WakatimeClient {
  return {
    fetchStats: vi.fn(),
  };
}

describe("createRenderWidget", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("routes coding to the coding adapter only", async () => {
    const coding = stubWidget();
    const github = stubWidget();
    const render = createRenderWidget({ coding, github });

    const result = await render(codingRequest());

    expect(result).toEqual({ id: "coding", outcome: "render" });
    expect(coding).toHaveBeenCalledOnce();
    expect(github).not.toHaveBeenCalled();
  });

  it.each(["demo", "stats", "languages"] as const)(
    "routes %s to the github adapter only",
    async (id) => {
      const coding = stubWidget();
      const github = stubWidget();
      const render = createRenderWidget({ coding, github });

      const result = await render(githubRequest(id));

      expect(result).toEqual({ id, outcome: "render" });
      expect(github).toHaveBeenCalledOnce();
      expect(github.mock.calls[0]?.[0].id).toBe(id);
      expect(coding).not.toHaveBeenCalled();
    },
  );

  it("throws UnhandledActionWidgetError for an unknown widget id", () => {
    const coding = stubWidget();
    const github = stubWidget();
    const render = createRenderWidget({ coding, github });
    const request = {
      ...githubRequest("stats"),
      id: "unknown-widget" as WidgetId,
    };

    expect(() => render(request)).toThrow(UnhandledActionWidgetError);
    expect(() => render(request)).toThrow(/unknown-widget/);
    expect(coding).not.toHaveBeenCalled();
    expect(github).not.toHaveBeenCalled();
  });

  it("throws EngineError when the github adapter is missing for stats", () => {
    const coding = stubWidget();
    const render = createRenderWidget({ coding });

    expect(() => render(githubRequest("stats"))).toThrow(EngineError);
    expect(() => render(githubRequest("stats"))).toThrow(
      /renderWidget is not injected/,
    );
    expect(coding).not.toHaveBeenCalled();
  });

  it("throws EngineError when the coding adapter is missing for coding", () => {
    const github = stubWidget();
    const render = createRenderWidget({ github });

    expect(() => render(codingRequest())).toThrow(EngineError);
    expect(() => render(codingRequest())).toThrow(
      /coding render adapter is not injected/,
    );
    expect(github).not.toHaveBeenCalled();
  });
});

describe("createRenderWidgetFromClients", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("does not call the wakatime factory for github-only clients", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const githubClient = fakeGithubClient();
    const render = createRenderWidgetFromClients({ github: githubClient });

    expect(createWakatimeRenderWidget).not.toHaveBeenCalled();
    expect(createGithubRenderWidget).toHaveBeenCalledOnce();
    expect(createGithubRenderWidget).toHaveBeenCalledWith({
      client: githubClient,
    });
    expect(() => render(codingRequest())).toThrow(EngineError);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(githubClient.loadPayload).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("calls the wakatime factory when clients.wakatime is defined", () => {
    const wakatime = fakeWakatimeClient();
    createRenderWidgetFromClients({
      github: fakeGithubClient(),
      wakatime,
    });

    expect(createWakatimeRenderWidget).toHaveBeenCalledOnce();
    expect(createWakatimeRenderWidget).toHaveBeenCalledWith({
      client: wakatime,
    });
    expect(wakatime.fetchStats).not.toHaveBeenCalled();
  });
});
