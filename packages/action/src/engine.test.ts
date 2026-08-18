import {
  type ActionInputs,
  ActionInputsSchema,
  type Capabilities,
  parseConfig,
} from "@profile-bits/core";
import { describe, expect, it, vi } from "vitest";
import {
  AllGithubWidgetsSkippedError,
  EngineError,
  GistOutputError,
  type RenderWidget,
  type RunEngineInput,
  runEngine,
  themesFor,
} from "./engine.ts";
import { createNoopOutputPorts, type OutputPorts } from "./output.ts";

const TOKEN = "ghs_test_token";

const GITHUB_WIDGETS_YAML = `version: 1
format: svg
plugins:
  github:
    widgets:
      stats: {}
      languages: {}
`;

const RSS_FEED_YAML = `version: 1
format: svg
plugins:
  rss:
    widgets:
      feed:
        url: https://example.com/feed.xml
`;

const GITHUB_AND_RSS_YAML = `version: 1
format: svg
plugins:
  github:
    widgets:
      stats: {}
      languages: {}
  rss:
    widgets:
      feed:
        url: https://example.com/feed.xml
`;

const HTTP_JSON_YAML = `version: 1
format: svg
plugins:
  http:
    widgets:
      json:
        url: https://example.com/api.json
`;

const GITHUB_AND_HTTP_YAML = `version: 1
format: svg
plugins:
  github:
    widgets:
      stats: {}
      languages: {}
  http:
    widgets:
      json:
        url: https://example.com/api.json
`;

const HTTP_CHIPS_YAML = `version: 1
format: svg
plugins:
  http:
    widgets:
      chips:
        preset: shieldcn
        types: [npm]
        package: react
`;

const GITHUB_AND_HTTP_CHIPS_YAML = `version: 1
format: svg
plugins:
  github:
    widgets:
      stats: {}
      languages: {}
  http:
    widgets:
      chips:
        preset: shieldcn
        types: [npm]
        package: react
`;

const HTTP_JSON_AND_CHIPS_YAML = `version: 1
format: svg
plugins:
  http:
    widgets:
      json:
        url: https://example.com/api.json
      chips:
        preset: shieldcn
        types: [npm]
        package: react
`;

const PUBLIC_CAPABILITIES: Capabilities = {
  canPrivate: false,
  canContributions: false,
  canGist: false,
};

function inputs(overrides: Record<string, unknown> = {}): ActionInputs {
  return ActionInputsSchema.parse({
    github_token: TOKEN,
    output_action: "none",
    ...overrides,
  });
}

function loaded(overrides: Record<string, unknown> = {}): RunEngineInput {
  return {
    inputs: inputs(overrides),
    config: parseConfig({ yaml: GITHUB_WIDGETS_YAML }),
  };
}

const skipAll: RenderWidget = ({ id }) => ({ id, outcome: "skip_widget" });

function renderById(outcomes: Record<string, RenderWidget>): RenderWidget {
  return (request) => {
    const render = outcomes[request.id] ?? skipAll;
    return render(request);
  };
}

describe("runEngine skip policy", () => {
  it("fails the job when every github widget is skipped and allow_skipped is false", async () => {
    const writeFiles = vi.fn(async (files: { path: string }[]) =>
      files.map((file) => file.path),
    );

    await expect(
      runEngine(loaded({ allow_skipped: false }), {
        probeCapabilities: () => PUBLIC_CAPABILITIES,
        renderWidget: skipAll,
        writeFiles,
      }),
    ).rejects.toThrow(AllGithubWidgetsSkippedError);

    expect(writeFiles).not.toHaveBeenCalled();
  });

  it("does not write files for a skipped widget and does not count data-changed", async () => {
    const writeFiles = vi.fn(async (files: { path: string }[]) =>
      files.map((file) => file.path),
    );
    const commitWidgets = vi.fn(async () => ({ didCommit: true }));
    const gistWidgets = vi.fn(async () => ({ files: [] }));
    const output: OutputPorts = { commitWidgets, gistWidgets };

    const result = await runEngine(loaded({ allow_skipped: true }), {
      probeCapabilities: () => PUBLIC_CAPABILITIES,
      renderWidget: renderById({
        stats: ({ id }) => ({
          id,
          outcome: "skip_widget",
          files: [{ path: "stats.svg", contents: "<svg />" }],
        }),
        languages: ({ id }) => ({
          id,
          outcome: "render",
          files: [{ path: "languages.svg", contents: "<svg />" }],
        }),
      }),
      writeFiles,
      output,
    });

    expect(writeFiles).toHaveBeenCalledOnce();
    expect(writeFiles.mock.calls[0]?.[0]).toEqual([
      { path: "profile-bits/languages.svg", contents: "<svg />" },
    ]);
    expect(result.files).toEqual(["profile-bits/languages.svg"]);
    expect(result.skipped).toEqual(["stats"]);
    expect(result.did_commit).toBe(false);
    expect(commitWidgets).not.toHaveBeenCalled();
    expect(gistWidgets).not.toHaveBeenCalled();
  });

  it("completes without widget files when allow_skipped is true", async () => {
    const writeFiles = vi.fn(async (files: { path: string }[]) =>
      files.map((file) => file.path),
    );

    const result = await runEngine(loaded({ allow_skipped: true }), {
      probeCapabilities: () => PUBLIC_CAPABILITIES,
      renderWidget: skipAll,
      writeFiles,
    });

    expect(result).toEqual({
      files: [],
      did_commit: false,
      skipped: ["stats", "languages"],
    });
    expect(writeFiles).not.toHaveBeenCalled();
  });
});

describe("runEngine output_action none", () => {
  it("renders without committing, opening a pull request, or updating a gist", async () => {
    const ports = createNoopOutputPorts();
    const commitWidgets = vi.spyOn(ports, "commitWidgets");
    const gistWidgets = vi.spyOn(ports, "gistWidgets");

    const result = await runEngine(loaded({ output_action: "none" }), {
      probeCapabilities: () => PUBLIC_CAPABILITIES,
      renderWidget: ({ id }) => ({
        id,
        outcome: "render",
        files: [{ path: `${id}.svg`, contents: "<svg />" }],
      }),
      output: ports,
    });

    expect(result.files).toEqual([
      "profile-bits/stats.svg",
      "profile-bits/languages.svg",
    ]);
    expect(result.did_commit).toBe(false);
    expect(result.skipped).toEqual([]);
    expect(commitWidgets).not.toHaveBeenCalled();
    expect(gistWidgets).not.toHaveBeenCalled();
  });

  it("parses yaml when config is not preloaded", async () => {
    const result = await runEngine(
      {
        inputs: inputs({ allow_skipped: true }),
        yaml: GITHUB_WIDGETS_YAML,
      },
      {
        probeCapabilities: () => PUBLIC_CAPABILITIES,
        renderWidget: skipAll,
      },
    );
    expect(result.skipped).toEqual(["stats", "languages"]);
    expect(result.did_commit).toBe(false);
  });
});

describe("runEngine gist", () => {
  it("fails the run when output_action is gist without canGist", async () => {
    await expect(
      runEngine(loaded({ output_action: "gist" }), {
        probeCapabilities: () => PUBLIC_CAPABILITIES,
        renderWidget: skipAll,
      }),
    ).rejects.toThrow(GistOutputError);
  });

  it("fails the run when gist format is not svg", async () => {
    await expect(
      runEngine(
        {
          inputs: inputs({ output_action: "gist" }),
          config: parseConfig({
            yaml: GITHUB_WIDGETS_YAML,
            format: "png",
          }),
        },
        {
          probeCapabilities: () => ({
            ...PUBLIC_CAPABILITIES,
            canGist: true,
          }),
          renderWidget: skipAll,
        },
      ),
    ).rejects.toMatchObject({
      name: "GistOutputError",
      message: expect.stringContaining("svg"),
    });
  });
});

describe("runEngine dry_run", () => {
  it("leaves did_commit false and does not publish", async () => {
    const commitWidgets = vi.fn(async () => ({ didCommit: true }));
    const gistWidgets = vi.fn(async () => ({ files: [] }));

    const result = await runEngine(
      loaded({ output_action: "commit", dry_run: true }),
      {
        probeCapabilities: () => PUBLIC_CAPABILITIES,
        renderWidget: ({ id }) => ({
          id,
          outcome: "render",
          files: [{ path: `${id}.svg`, contents: "<svg />" }],
        }),
        output: { commitWidgets, gistWidgets },
      },
    );

    expect(result.did_commit).toBe(false);
    expect(result.files).toEqual([
      "profile-bits/stats.svg",
      "profile-bits/languages.svg",
    ]);
    expect(commitWidgets).not.toHaveBeenCalled();
    expect(gistWidgets).not.toHaveBeenCalled();
  });
});

describe("runEngine rss feed", () => {
  it("enables feed after github widgets when rss yaml is present", async () => {
    const seen: string[] = [];

    const result = await runEngine(
      {
        inputs: inputs(),
        yaml: GITHUB_AND_RSS_YAML,
      },
      {
        probeCapabilities: () => PUBLIC_CAPABILITIES,
        renderWidget: (request) => {
          seen.push(request.id);
          return {
            id: request.id,
            outcome: "render",
            files: [{ path: `${request.id}.svg`, contents: "<svg />" }],
          };
        },
      },
    );

    expect(seen).toEqual(["stats", "languages", "feed"]);
    expect(result.files).toEqual([
      "profile-bits/stats.svg",
      "profile-bits/languages.svg",
      "profile-bits/feed.svg",
    ]);
  });

  it("does not throw when rss fail_widget and github widgets render", async () => {
    const writeFiles = vi.fn(async (files: { path: string }[]) =>
      files.map((file) => file.path),
    );

    const result = await runEngine(
      {
        inputs: inputs(),
        yaml: GITHUB_AND_RSS_YAML,
      },
      {
        probeCapabilities: () => PUBLIC_CAPABILITIES,
        renderWidget: renderById({
          stats: ({ id }) => ({
            id,
            outcome: "render",
            files: [{ path: "stats.svg", contents: "<svg />" }],
          }),
          languages: ({ id }) => ({
            id,
            outcome: "render",
            files: [{ path: "languages.svg", contents: "<svg />" }],
          }),
          feed: ({ id }) => ({
            id,
            outcome: "fail_widget",
            files: [{ path: "feed.svg", contents: "<svg />" }],
          }),
        }),
        writeFiles,
      },
    );

    expect(result.files).toEqual([
      "profile-bits/stats.svg",
      "profile-bits/languages.svg",
    ]);
    expect(result.did_commit).toBe(false);
    expect(writeFiles).toHaveBeenCalledOnce();
    expect(writeFiles.mock.calls[0]?.[0]).toEqual([
      { path: "profile-bits/stats.svg", contents: "<svg />" },
      { path: "profile-bits/languages.svg", contents: "<svg />" },
    ]);
  });

  it("does not read include_private during feed preflight", async () => {
    const config = parseConfig({ yaml: RSS_FEED_YAML });
    const feed = config.plugins.rss?.widgets.feed;
    expect(feed).toBeDefined();
    const trappedFeed = new Proxy(feed!, {
      get(target, prop, receiver) {
        if (prop === "include_private") {
          throw new Error("include_private must not be read on feed");
        }
        return Reflect.get(target, prop, receiver);
      },
    });
    const renderWidget = vi.fn<RenderWidget>((request) => ({
      id: request.id,
      outcome: "render",
      files: [{ path: `${request.id}.svg`, contents: "<svg />" }],
    }));

    await runEngine(
      {
        inputs: inputs(),
        config: {
          ...config,
          plugins: {
            ...config.plugins,
            rss: { widgets: { feed: trappedFeed } },
          },
        },
      },
      {
        probeCapabilities: () => PUBLIC_CAPABILITIES,
        renderWidget,
      },
    );

    expect(renderWidget).toHaveBeenCalledOnce();
    const request = renderWidget.mock.calls[0]?.[0];
    expect(request?.id).toBe("feed");
    expect(Object.hasOwn(request?.options ?? {}, "include_private")).toBe(
      false,
    );
  });

  it("enables feed when rss-only yaml is present", async () => {
    const seen: string[] = [];

    const result = await runEngine(
      {
        inputs: inputs({ allow_skipped: false }),
        yaml: RSS_FEED_YAML,
      },
      {
        probeCapabilities: () => PUBLIC_CAPABILITIES,
        renderWidget: (request) => {
          seen.push(request.id);
          return {
            id: request.id,
            outcome: "render",
            files: [{ path: `${request.id}.svg`, contents: "<svg />" }],
          };
        },
      },
    );

    expect(seen).toEqual(["feed"]);
    expect(result.files).toEqual(["profile-bits/feed.svg"]);
  });

  it("succeeds with no files when rss-only feed is fail_widget", async () => {
    const writeFiles = vi.fn(async (files: { path: string }[]) =>
      files.map((file) => file.path),
    );
    const renderWidget = vi.fn<RenderWidget>(({ id }) => ({
      id,
      outcome: "fail_widget",
    }));

    const result = await runEngine(
      {
        inputs: inputs({ allow_skipped: false }),
        yaml: RSS_FEED_YAML,
      },
      {
        probeCapabilities: () => PUBLIC_CAPABILITIES,
        renderWidget,
        writeFiles,
      },
    );

    expect(renderWidget).toHaveBeenCalledOnce();
    expect(renderWidget.mock.calls[0]?.[0].id).toBe("feed");
    expect(result).toEqual({
      files: [],
      did_commit: false,
      skipped: [],
    });
    expect(writeFiles).not.toHaveBeenCalled();
  });
});

describe("runEngine http json", () => {
  it("writes json.svg for http-only yaml when json renders", async () => {
    const writeFiles = vi.fn(async (files: { path: string }[]) =>
      files.map((file) => file.path),
    );

    const result = await runEngine(
      {
        inputs: inputs(),
        yaml: HTTP_JSON_YAML,
      },
      {
        probeCapabilities: () => PUBLIC_CAPABILITIES,
        renderWidget: ({ id }) => ({
          id,
          outcome: "render",
          files: [{ path: `${id}.svg`, contents: "<svg />" }],
        }),
        writeFiles,
      },
    );

    expect(result.files).toEqual(["profile-bits/json.svg"]);
    expect(result.did_commit).toBe(false);
    expect(result.skipped).toEqual([]);
    expect(writeFiles).toHaveBeenCalledOnce();
  });

  it("fails the job when http-only json is fail_widget and allow_skipped is false", async () => {
    const writeFiles = vi.fn(async (files: { path: string }[]) =>
      files.map((file) => file.path),
    );

    await expect(
      runEngine(
        {
          inputs: inputs({ allow_skipped: false }),
          yaml: HTTP_JSON_YAML,
        },
        {
          probeCapabilities: () => PUBLIC_CAPABILITIES,
          renderWidget: ({ id }) => ({ id, outcome: "fail_widget" }),
          writeFiles,
        },
      ),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof EngineError &&
        !(error instanceof AllGithubWidgetsSkippedError) &&
        error.decision === "fail_job",
    );
    expect(writeFiles).not.toHaveBeenCalled();
  });

  it("completes without json files when http-only allow_skipped is true", async () => {
    const writeFiles = vi.fn(async (files: { path: string }[]) =>
      files.map((file) => file.path),
    );

    const result = await runEngine(
      {
        inputs: inputs({ allow_skipped: true }),
        yaml: HTTP_JSON_YAML,
      },
      {
        probeCapabilities: () => PUBLIC_CAPABILITIES,
        renderWidget: ({ id }) => ({ id, outcome: "fail_widget" }),
        writeFiles,
      },
    );

    expect(result).toEqual({
      files: [],
      did_commit: false,
      skipped: [],
    });
    expect(writeFiles).not.toHaveBeenCalled();
  });

  it("writes github files when json is fail_widget in a mixed run", async () => {
    const writeFiles = vi.fn(async (files: { path: string }[]) =>
      files.map((file) => file.path),
    );

    const result = await runEngine(
      {
        inputs: inputs(),
        yaml: GITHUB_AND_HTTP_YAML,
      },
      {
        probeCapabilities: () => PUBLIC_CAPABILITIES,
        renderWidget: renderById({
          stats: ({ id }) => ({
            id,
            outcome: "render",
            files: [{ path: "stats.svg", contents: "<svg />" }],
          }),
          languages: ({ id }) => ({
            id,
            outcome: "render",
            files: [{ path: "languages.svg", contents: "<svg />" }],
          }),
          json: ({ id }) => ({
            id,
            outcome: "fail_widget",
            files: [{ path: "json.svg", contents: "<svg />" }],
          }),
        }),
        writeFiles,
      },
    );

    expect(result.files).toEqual([
      "profile-bits/stats.svg",
      "profile-bits/languages.svg",
    ]);
    expect(result.did_commit).toBe(false);
    expect(writeFiles).toHaveBeenCalledOnce();
    expect(writeFiles.mock.calls[0]?.[0]).toEqual([
      { path: "profile-bits/stats.svg", contents: "<svg />" },
      { path: "profile-bits/languages.svg", contents: "<svg />" },
    ]);
  });

  it("still fails all-github-skipped when json is also enabled", async () => {
    const writeFiles = vi.fn(async (files: { path: string }[]) =>
      files.map((file) => file.path),
    );

    await expect(
      runEngine(
        {
          inputs: inputs({ allow_skipped: false }),
          yaml: GITHUB_AND_HTTP_YAML,
        },
        {
          probeCapabilities: () => PUBLIC_CAPABILITIES,
          renderWidget: renderById({
            stats: ({ id }) => ({ id, outcome: "skip_widget" }),
            languages: ({ id }) => ({ id, outcome: "skip_widget" }),
            json: ({ id }) => ({
              id,
              outcome: "render",
              files: [{ path: "json.svg", contents: "<svg />" }],
            }),
          }),
          writeFiles,
        },
      ),
    ).rejects.toThrow(AllGithubWidgetsSkippedError);
    expect(writeFiles).not.toHaveBeenCalled();
  });

  it("does not treat json-only failure as AllGithubWidgetsSkippedError", async () => {
    await expect(
      runEngine(
        {
          inputs: inputs({ allow_skipped: false }),
          yaml: HTTP_JSON_YAML,
        },
        {
          probeCapabilities: () => PUBLIC_CAPABILITIES,
          renderWidget: ({ id }) => ({ id, outcome: "skip_widget" }),
        },
      ),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof EngineError &&
        !(error instanceof AllGithubWidgetsSkippedError) &&
        error.decision === "fail_job",
    );
  });

  it("does not read include_private during json preflight", async () => {
    const config = parseConfig({ yaml: HTTP_JSON_YAML });
    const json = config.plugins.http?.widgets?.json;
    expect(json).toBeDefined();
    const trappedJson = new Proxy(json!, {
      get(target, prop, receiver) {
        if (prop === "include_private") {
          throw new Error("include_private must not be read on json");
        }
        return Reflect.get(target, prop, receiver);
      },
    });
    const renderWidget = vi.fn<RenderWidget>((request) => ({
      id: request.id,
      outcome: "render",
      files: [{ path: `${request.id}.svg`, contents: "<svg />" }],
    }));

    await runEngine(
      {
        inputs: inputs(),
        config: {
          ...config,
          plugins: {
            ...config.plugins,
            http: { widgets: { json: trappedJson } },
          },
        },
      },
      {
        probeCapabilities: () => PUBLIC_CAPABILITIES,
        renderWidget,
      },
    );

    expect(renderWidget).toHaveBeenCalledOnce();
    const request = renderWidget.mock.calls[0]?.[0];
    expect(request?.id).toBe("json");
    expect(Object.hasOwn(request?.options ?? {}, "include_private")).toBe(
      false,
    );
  });
});

describe("runEngine http chips", () => {
  it("writes chips.svg for http-only yaml when chips renders", async () => {
    const writeFiles = vi.fn(async (files: { path: string }[]) =>
      files.map((file) => file.path),
    );

    const result = await runEngine(
      {
        inputs: inputs(),
        yaml: HTTP_CHIPS_YAML,
      },
      {
        probeCapabilities: () => PUBLIC_CAPABILITIES,
        renderWidget: ({ id }) => ({
          id,
          outcome: "render",
          files: [{ path: `${id}.svg`, contents: "<svg />" }],
        }),
        writeFiles,
      },
    );

    expect(result.files).toEqual(["profile-bits/chips.svg"]);
    expect(result.did_commit).toBe(false);
    expect(result.skipped).toEqual([]);
    expect(writeFiles).toHaveBeenCalledOnce();
  });

  it("fails the job when http-only chips is fail_widget and allow_skipped is false", async () => {
    const writeFiles = vi.fn(async (files: { path: string }[]) =>
      files.map((file) => file.path),
    );

    await expect(
      runEngine(
        {
          inputs: inputs({ allow_skipped: false }),
          yaml: HTTP_CHIPS_YAML,
        },
        {
          probeCapabilities: () => PUBLIC_CAPABILITIES,
          renderWidget: ({ id }) => ({ id, outcome: "fail_widget" }),
          writeFiles,
        },
      ),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof EngineError &&
        !(error instanceof AllGithubWidgetsSkippedError) &&
        error.decision === "fail_job",
    );
    expect(writeFiles).not.toHaveBeenCalled();
  });

  it("completes without chips files when http-only allow_skipped is true", async () => {
    const writeFiles = vi.fn(async (files: { path: string }[]) =>
      files.map((file) => file.path),
    );

    const result = await runEngine(
      {
        inputs: inputs({ allow_skipped: true }),
        yaml: HTTP_CHIPS_YAML,
      },
      {
        probeCapabilities: () => PUBLIC_CAPABILITIES,
        renderWidget: ({ id }) => ({ id, outcome: "fail_widget" }),
        writeFiles,
      },
    );

    expect(result).toEqual({
      files: [],
      did_commit: false,
      skipped: [],
    });
    expect(writeFiles).not.toHaveBeenCalled();
  });

  it("writes github files when chips is fail_widget in a mixed run", async () => {
    const writeFiles = vi.fn(async (files: { path: string }[]) =>
      files.map((file) => file.path),
    );

    const result = await runEngine(
      {
        inputs: inputs(),
        yaml: GITHUB_AND_HTTP_CHIPS_YAML,
      },
      {
        probeCapabilities: () => PUBLIC_CAPABILITIES,
        renderWidget: renderById({
          stats: ({ id }) => ({
            id,
            outcome: "render",
            files: [{ path: "stats.svg", contents: "<svg />" }],
          }),
          languages: ({ id }) => ({
            id,
            outcome: "render",
            files: [{ path: "languages.svg", contents: "<svg />" }],
          }),
          chips: ({ id }) => ({
            id,
            outcome: "fail_widget",
            files: [{ path: "chips.svg", contents: "<svg />" }],
          }),
        }),
        writeFiles,
      },
    );

    expect(result.files).toEqual([
      "profile-bits/stats.svg",
      "profile-bits/languages.svg",
    ]);
    expect(result.did_commit).toBe(false);
    expect(writeFiles).toHaveBeenCalledOnce();
    expect(writeFiles.mock.calls[0]?.[0]).toEqual([
      { path: "profile-bits/stats.svg", contents: "<svg />" },
      { path: "profile-bits/languages.svg", contents: "<svg />" },
    ]);
  });

  it("calls renderWidget with json and chips when both http widgets are enabled", async () => {
    const seen: string[] = [];

    const result = await runEngine(
      {
        inputs: inputs(),
        yaml: HTTP_JSON_AND_CHIPS_YAML,
      },
      {
        probeCapabilities: () => PUBLIC_CAPABILITIES,
        renderWidget: (request) => {
          seen.push(request.id);
          return {
            id: request.id,
            outcome: "render",
            files: [{ path: `${request.id}.svg`, contents: "<svg />" }],
          };
        },
      },
    );

    expect(seen).toEqual(["json", "chips"]);
    expect(result.files).toEqual([
      "profile-bits/json.svg",
      "profile-bits/chips.svg",
    ]);
  });

  it("does not treat chips-only failure as AllGithubWidgetsSkippedError", async () => {
    await expect(
      runEngine(
        {
          inputs: inputs({ allow_skipped: false }),
          yaml: HTTP_CHIPS_YAML,
        },
        {
          probeCapabilities: () => PUBLIC_CAPABILITIES,
          renderWidget: ({ id }) => ({ id, outcome: "skip_widget" }),
        },
      ),
    ).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof EngineError &&
        !(error instanceof AllGithubWidgetsSkippedError) &&
        error.decision === "fail_job",
    );
  });

  it("does not read include_private during chips preflight", async () => {
    const config = parseConfig({ yaml: HTTP_CHIPS_YAML });
    const chips = config.plugins.http?.widgets?.chips;
    expect(chips).toBeDefined();
    const trappedChips = new Proxy(chips!, {
      get(target, prop, receiver) {
        if (prop === "include_private") {
          throw new Error("include_private must not be read on chips");
        }
        return Reflect.get(target, prop, receiver);
      },
    });
    const renderWidget = vi.fn<RenderWidget>((request) => ({
      id: request.id,
      outcome: "render",
      files: [{ path: `${request.id}.svg`, contents: "<svg />" }],
    }));

    await runEngine(
      {
        inputs: inputs(),
        config: {
          ...config,
          plugins: {
            ...config.plugins,
            http: { widgets: { chips: trappedChips } },
          },
        },
      },
      {
        probeCapabilities: () => PUBLIC_CAPABILITIES,
        renderWidget,
      },
    );

    expect(renderWidget).toHaveBeenCalledOnce();
    const request = renderWidget.mock.calls[0]?.[0];
    expect(request?.id).toBe("chips");
    expect(Object.hasOwn(request?.options ?? {}, "include_private")).toBe(
      false,
    );
  });

  it("does not throw when github widgets render and chips is fail_widget", async () => {
    await expect(
      runEngine(
        {
          inputs: inputs(),
          yaml: GITHUB_AND_HTTP_CHIPS_YAML,
        },
        {
          probeCapabilities: () => PUBLIC_CAPABILITIES,
          renderWidget: renderById({
            stats: ({ id }) => ({
              id,
              outcome: "render",
              files: [{ path: "stats.svg", contents: "<svg />" }],
            }),
            languages: ({ id }) => ({
              id,
              outcome: "render",
              files: [{ path: "languages.svg", contents: "<svg />" }],
            }),
            chips: ({ id }) => ({ id, outcome: "fail_widget" }),
          }),
        },
      ),
    ).resolves.toMatchObject({
      files: ["profile-bits/stats.svg", "profile-bits/languages.svg"],
      did_commit: false,
    });
  });
});

const WAKATIME_TOKEN = "waka_secret_do_not_leak";

const WAKATIME_ONLY_YAML = `version: 1
format: svg
plugins:
  wakatime: {}
`;

const GITHUB_AND_WAKATIME_YAML = `version: 1
format: svg
plugins:
  github:
    widgets:
      stats: {}
      languages: {}
  wakatime: {}
`;

describe("runEngine wakatime coding", () => {
  it("renders github widgets when the wakatime pack is off and no token is set", async () => {
    const renderWidget = vi.fn<RenderWidget>(({ id }) => ({
      id,
      outcome: "render",
      files: [{ path: `${id}.svg`, contents: "<svg />" }],
    }));

    const result = await runEngine(loaded(), {
      probeCapabilities: () => PUBLIC_CAPABILITIES,
      renderWidget,
    });

    expect(renderWidget.mock.calls.map((call) => call[0].id)).toEqual([
      "stats",
      "languages",
    ]);
    expect(result.files).toEqual([
      "profile-bits/stats.svg",
      "profile-bits/languages.svg",
    ]);
    expect(result.did_commit).toBe(false);
  });

  it.each([undefined, "", "   ", "\t\n"] as const)(
    "fails the job before renderWidget when the pack is on and the token is missing (%j)",
    async (wakatimeToken) => {
      const renderWidget = vi.fn<RenderWidget>(({ id }) => ({
        id,
        outcome: "render",
      }));

      await expect(
        runEngine(
          {
            inputs: inputs(
              wakatimeToken === undefined
                ? {}
                : { wakatime_token: wakatimeToken },
            ),
            yaml: WAKATIME_ONLY_YAML,
          },
          {
            probeCapabilities: () => PUBLIC_CAPABILITIES,
            renderWidget,
          },
        ),
      ).rejects.toSatisfy((error: unknown) => {
        if (!(error instanceof EngineError) || error.decision !== "fail_job") {
          return false;
        }
        expect(error.message).not.toContain(WAKATIME_TOKEN);
        expect(error.message).toContain("wakatime_token");
        return true;
      });
      expect(renderWidget).not.toHaveBeenCalled();
    },
  );

  it("writes the coding blob under output_dir using the default wakatime.svg filename", async () => {
    const result = await runEngine(
      {
        inputs: inputs({ wakatime_token: WAKATIME_TOKEN }),
        yaml: WAKATIME_ONLY_YAML,
      },
      {
        probeCapabilities: () => PUBLIC_CAPABILITIES,
        renderWidget: (request) => {
          expect(request.id).toBe("coding");
          const filename =
            "filename" in request.options ? request.options.filename : "coding";
          return {
            id: request.id,
            outcome: "render",
            files: [{ path: `${filename}.svg`, contents: "<svg />" }],
          };
        },
      },
    );

    expect(result.files).toEqual(["profile-bits/wakatime.svg"]);
    expect(result.did_commit).toBe(false);
    expect(result.skipped).toEqual([]);
  });

  it("does not throw AllGithubWidgetsSkippedError when coding is fail_widget and github rendered", async () => {
    const writeFiles = vi.fn(async (files: { path: string }[]) =>
      files.map((file) => file.path),
    );

    const result = await runEngine(
      {
        inputs: inputs({ wakatime_token: WAKATIME_TOKEN }),
        yaml: GITHUB_AND_WAKATIME_YAML,
      },
      {
        probeCapabilities: () => PUBLIC_CAPABILITIES,
        renderWidget: renderById({
          stats: ({ id }) => ({
            id,
            outcome: "render",
            files: [{ path: "stats.svg", contents: "<svg />" }],
          }),
          languages: ({ id }) => ({
            id,
            outcome: "render",
            files: [{ path: "languages.svg", contents: "<svg />" }],
          }),
          coding: ({ id }) => ({
            id,
            outcome: "fail_widget",
            files: [{ path: "wakatime.svg", contents: "<svg />" }],
          }),
        }),
        writeFiles,
      },
    );

    expect(result.files).toEqual([
      "profile-bits/stats.svg",
      "profile-bits/languages.svg",
    ]);
    expect(result.did_commit).toBe(false);
    expect(writeFiles).toHaveBeenCalledOnce();
  });

  it("does not treat wakatime-only yaml as every github widget skipped", async () => {
    await expect(
      runEngine(
        {
          inputs: inputs({
            allow_skipped: false,
            wakatime_token: WAKATIME_TOKEN,
          }),
          yaml: WAKATIME_ONLY_YAML,
        },
        {
          probeCapabilities: () => PUBLIC_CAPABILITIES,
          renderWidget: ({ id }) => ({
            id,
            outcome: "fail_widget",
          }),
        },
      ),
    ).resolves.toEqual({
      files: [],
      did_commit: false,
      skipped: [],
    });
  });

  it("lists coding files on dry_run without committing or publishing", async () => {
    const commitWidgets = vi.fn(async () => ({ didCommit: true }));
    const gistWidgets = vi.fn(async () => ({ files: [] }));

    const result = await runEngine(
      {
        inputs: inputs({
          output_action: "commit",
          dry_run: true,
          wakatime_token: WAKATIME_TOKEN,
        }),
        yaml: WAKATIME_ONLY_YAML,
      },
      {
        probeCapabilities: () => PUBLIC_CAPABILITIES,
        renderWidget: ({ id }) => ({
          id,
          outcome: "render",
          files: [{ path: "wakatime.svg", contents: "<svg />" }],
        }),
        output: { commitWidgets, gistWidgets },
      },
    );

    expect(result.files).toEqual(["profile-bits/wakatime.svg"]);
    expect(result.did_commit).toBe(false);
    expect(commitWidgets).not.toHaveBeenCalled();
    expect(gistWidgets).not.toHaveBeenCalled();
  });

  it("does not read include_private during coding preflight", async () => {
    const config = parseConfig({ yaml: WAKATIME_ONLY_YAML });
    const coding = config.plugins.wakatime?.widgets?.coding;
    expect(coding).toBeDefined();
    const trappedCoding = new Proxy(coding!, {
      get(target, prop, receiver) {
        if (prop === "include_private") {
          throw new Error("include_private must not be read on coding");
        }
        return Reflect.get(target, prop, receiver);
      },
    });
    const renderWidget = vi.fn<RenderWidget>((request) => ({
      id: request.id,
      outcome: "render",
      files: [{ path: `${request.id}.svg`, contents: "<svg />" }],
    }));

    await runEngine(
      {
        inputs: inputs({ wakatime_token: WAKATIME_TOKEN }),
        config: {
          ...config,
          plugins: {
            ...config.plugins,
            wakatime: { widgets: { coding: trappedCoding } },
          },
        },
      },
      {
        probeCapabilities: () => PUBLIC_CAPABILITIES,
        renderWidget,
      },
    );

    expect(renderWidget).toHaveBeenCalledOnce();
    const request = renderWidget.mock.calls[0]?.[0];
    expect(request?.id).toBe("coding");
    expect(Object.hasOwn(request?.options ?? {}, "include_private")).toBe(
      false,
    );
  });
});

describe("themesFor and output_pair polarity files", () => {
  it("returns the selected flavor only when output_pair is false", () => {
    expect(themesFor({ theme: "catppuccin-mocha", output_pair: false })).toEqual(
      ["catppuccin-mocha"],
    );
  });

  it("returns light then dark members when output_pair is true", () => {
    expect(themesFor({ theme: "catppuccin-mocha", output_pair: true })).toEqual([
      "catppuccin-latte",
      "catppuccin-mocha",
    ]);
  });

  it("writes filename and filename-dark when output_pair is true", async () => {
    const renderWidget = vi.fn<RenderWidget>((request) => ({
      id: request.id,
      outcome: "render",
      files: [{ path: `${request.id}.svg`, contents: String(request.theme) }],
    }));
    const config = parseConfig({
      yaml: `version: 1
theme: catppuccin-mocha
output_pair: true
plugins:
  github:
    widgets:
      stats: {}
`,
    });

    const result = await runEngine(
      { inputs: inputs(), config },
      {
        probeCapabilities: () => PUBLIC_CAPABILITIES,
        renderWidget,
      },
    );

    expect(renderWidget).toHaveBeenCalledTimes(2);
    expect(renderWidget.mock.calls.map((call) => call[0].theme)).toEqual([
      "catppuccin-latte",
      "catppuccin-mocha",
    ]);
    expect(result.files).toEqual([
      "profile-bits/stats.svg",
      "profile-bits/stats-dark.svg",
    ]);
  });

  it("writes filename only in the selected dark flavor when output_pair is false", async () => {
    const renderWidget = vi.fn<RenderWidget>((request) => ({
      id: request.id,
      outcome: "render",
      files: [{ path: `${request.id}.svg`, contents: String(request.theme) }],
    }));
    const config = parseConfig({
      yaml: `version: 1
theme: catppuccin-mocha
output_pair: false
plugins:
  github:
    widgets:
      stats: {}
`,
    });

    const result = await runEngine(
      { inputs: inputs(), config },
      {
        probeCapabilities: () => PUBLIC_CAPABILITIES,
        renderWidget,
      },
    );

    expect(renderWidget).toHaveBeenCalledOnce();
    expect(renderWidget.mock.calls[0]?.[0].theme).toBe("catppuccin-mocha");
    expect(result.files).toEqual(["profile-bits/stats.svg"]);
  });
});
