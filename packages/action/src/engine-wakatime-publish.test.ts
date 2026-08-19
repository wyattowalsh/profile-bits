import {
  type ActionInputs,
  ActionInputsSchema,
  type Capabilities,
  parseConfig,
} from "@profile-bits/core";
import { describe, expect, it, vi } from "vitest";
import {
  EngineError,
  GistOutputError,
  type RenderWidget,
  type RunEngineInput,
  runEngine,
} from "./engine.ts";
import {
  INSTALLATION_COMMIT_MESSAGE,
  type OutputPorts,
  USER_PAT_COMMIT_MESSAGE,
} from "./output.ts";

const TOKEN = "ghs_test_token";
const WAKATIME_TOKEN = "waka_secret_do_not_leak";

const WAKATIME_ONLY_YAML = `version: 1
format: svg
plugins:
  wakatime: {}
`;

const PUBLIC_CAPABILITIES: Capabilities = {
  canPrivate: false,
  canContributions: false,
  canGist: false,
};

const GIST_CAPABILITIES: Capabilities = {
  canPrivate: false,
  canContributions: false,
  canGist: true,
};

function inputs(overrides: Record<string, unknown> = {}): ActionInputs {
  return ActionInputsSchema.parse({
    github_token: TOKEN,
    output_action: "none",
    wakatime_token: WAKATIME_TOKEN,
    ...overrides,
  });
}

function loaded(overrides: Record<string, unknown> = {}): RunEngineInput {
  return {
    inputs: inputs(overrides),
    config: parseConfig({ yaml: WAKATIME_ONLY_YAML }),
  };
}

const renderCoding: RenderWidget = ({ id }) => ({
  id,
  outcome: "render",
  files: [{ path: "wakatime.svg", contents: "<svg />" }],
});

describe("runEngine wakatime publish probe", () => {
  it("renders WakaTime-only gist when the injected probe reports canGist", async () => {
    const writeFiles = vi.fn(async (files: { path: string }[]) =>
      files.map((file) => file.path),
    );
    const commitWidgets = vi.fn(async () => ({ didCommit: true }));
    const gistWidgets = vi.fn(async () => ({
      files: ["profile-bits/wakatime.svg"],
    }));
    const output: OutputPorts = { commitWidgets, gistWidgets };

    const result = await runEngine(loaded({ output_action: "gist" }), {
      probeCapabilities: () => GIST_CAPABILITIES,
      renderWidget: renderCoding,
      writeFiles,
      output,
    });

    expect(result.files).toEqual(["profile-bits/wakatime.svg"]);
    expect(result.did_commit).toBe(false);
    expect(writeFiles).toHaveBeenCalledOnce();
    expect(gistWidgets).toHaveBeenCalledOnce();
    expect(gistWidgets.mock.calls[0]?.[0]).toMatchObject({
      canGist: true,
      format: "svg",
    });
    expect(commitWidgets).not.toHaveBeenCalled();
  });

  it("fails WakaTime-only gist with GistOutputError when the probe is omitted", async () => {
    const writeFiles = vi.fn(async (files: { path: string }[]) =>
      files.map((file) => file.path),
    );
    const renderWidget = vi.fn<RenderWidget>(renderCoding);

    await expect(
      runEngine(loaded({ output_action: "gist" }), {
        renderWidget,
        writeFiles,
      }),
    ).rejects.toBeInstanceOf(GistOutputError);

    expect(renderWidget).not.toHaveBeenCalled();
    expect(writeFiles).not.toHaveBeenCalled();
  });

  it("omits [skip ci] from the WakaTime-only commit message when tokenClass is user_pat", async () => {
    const commitWidgets = vi.fn(async () => ({ didCommit: true }));
    const gistWidgets = vi.fn(async () => ({ files: [] }));

    const result = await runEngine(loaded({ output_action: "commit" }), {
      probeCapabilities: () => PUBLIC_CAPABILITIES,
      renderWidget: renderCoding,
      tokenClass: "user_pat",
      output: { commitWidgets, gistWidgets },
    });

    expect(result.did_commit).toBe(true);
    expect(commitWidgets).toHaveBeenCalledOnce();
    expect(commitWidgets.mock.calls[0]?.[0]).toMatchObject({
      tokenClass: "user_pat",
      message: USER_PAT_COMMIT_MESSAGE,
    });
    expect(commitWidgets.mock.calls[0]?.[0]?.message).not.toContain(
      "[skip ci]",
    );
    expect(gistWidgets).not.toHaveBeenCalled();
  });

  it("includes [skip ci] in the WakaTime-only commit message when tokenClass is omitted", async () => {
    const commitWidgets = vi.fn(async () => ({ didCommit: true }));
    const gistWidgets = vi.fn(async () => ({ files: [] }));

    const result = await runEngine(loaded({ output_action: "commit" }), {
      probeCapabilities: () => PUBLIC_CAPABILITIES,
      renderWidget: renderCoding,
      output: { commitWidgets, gistWidgets },
    });

    expect(result.did_commit).toBe(true);
    expect(commitWidgets).toHaveBeenCalledOnce();
    expect(commitWidgets.mock.calls[0]?.[0]).toMatchObject({
      tokenClass: "actions_installation",
      message: INSTALLATION_COMMIT_MESSAGE,
    });
    expect(commitWidgets.mock.calls[0]?.[0]?.message).toContain("[skip ci]");
    expect(gistWidgets).not.toHaveBeenCalled();
  });

  it("throws EngineError without writing when coding returns fail_run", async () => {
    const writeFiles = vi.fn(async (files: { path: string }[]) =>
      files.map((file) => file.path),
    );
    const commitWidgets = vi.fn(async () => ({ didCommit: true }));
    const gistWidgets = vi.fn(async () => ({ files: [] }));

    await expect(
      runEngine(loaded({ output_action: "commit" }), {
        probeCapabilities: () => PUBLIC_CAPABILITIES,
        renderWidget: ({ id }) => ({ id, outcome: "fail_run" }),
        writeFiles,
        output: { commitWidgets, gistWidgets },
      }),
    ).rejects.toSatisfy((error: unknown) => {
      if (!(error instanceof EngineError) || error.decision !== "fail_run") {
        return false;
      }
      expect(error.message).toContain("coding");
      expect(error.message).not.toContain(TOKEN);
      expect(error.message).not.toContain(WAKATIME_TOKEN);
      return true;
    });

    expect(writeFiles).not.toHaveBeenCalled();
    expect(commitWidgets).not.toHaveBeenCalled();
    expect(gistWidgets).not.toHaveBeenCalled();
  });
});
