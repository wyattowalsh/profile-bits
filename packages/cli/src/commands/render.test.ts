import { spinner as createSpinner } from "@clack/prompts";
import type { ActionRunResult } from "@profile-bits/action";
import { afterEach, describe, expect, it, vi } from "vitest";
import { throwCliExit } from "../errors.ts";
import { shouldStartPromptPath } from "../io.ts";
import { parseCli } from "../program.ts";
import {
  handleRender,
  type RenderCommandOptions,
  resolvePresentation,
} from "./render.ts";

const { actionRunMain } = vi.hoisted(() => ({
  actionRunMain:
    vi.fn<
      (options: {
        inputs: Record<string, unknown>;
        env: NodeJS.ProcessEnv;
        cwd: string;
      }) => Promise<ActionRunResult>
    >(),
}));

vi.mock("@profile-bits/action", () => ({
  runMain: actionRunMain,
}));

vi.mock("@clack/prompts", () => ({
  spinner: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    cancel: vi.fn(),
    error: vi.fn(),
  })),
}));

const TOKEN = "ghs_cli_test_token_value";

const RESULT: ActionRunResult = {
  files: ["profile-bits/stats.svg"],
  skipped: ["github/stats:contributions"],
  did_commit: false,
};

afterEach(() => {
  actionRunMain.mockReset();
  vi.mocked(createSpinner).mockClear();
});

async function parseRender(
  args: readonly string[] = ["render"],
  env: NodeJS.ProcessEnv = {},
) {
  return parseCli({
    args,
    env,
    stdout: () => {},
    stderr: () => {},
    onExit: throwCliExit,
    colors: false,
  });
}

async function invokeHandle(
  args: readonly string[],
  options: {
    env?: NodeJS.ProcessEnv;
    stdinIsTTY?: boolean;
    stderrIsTTY?: boolean;
    runMain?: NonNullable<RenderCommandOptions["runMain"]>;
  } = {},
) {
  const parsed = await parseRender(args, options.env);
  const stdout: string[] = [];
  const stderr: string[] = [];
  const runMain = vi.fn<NonNullable<RenderCommandOptions["runMain"]>>(
    options.runMain ?? (async () => RESULT),
  );
  const code = await handleRender({
    parsed,
    env: options.env ?? {},
    cwd: "/repo",
    io: {
      stdout: (text) => stdout.push(text),
      stderr: (text) => stderr.push(text),
    },
    stdinIsTTY: options.stdinIsTTY ?? false,
    stderrIsTTY: options.stderrIsTTY ?? false,
    installSignals: false,
    runMain,
  });
  return {
    code,
    stdout: stdout.join("\n"),
    stderr: stderr.join("\n"),
    runMain,
  };
}

describe("resolvePresentation", () => {
  it("sets noInput when stdin is not a TTY even without the flag", async () => {
    const parsed = await parseRender(["render"]);
    expect(parsed.noInput).toBe(false);
    const presentation = resolvePresentation(parsed, false);
    expect(presentation.noInput).toBe(true);
    expect(shouldStartPromptPath(presentation)).toBe(false);
  });

  it("sets noInput when --no-input is passed on a TTY", async () => {
    const parsed = await parseRender(["render", "--no-input"]);
    expect(resolvePresentation(parsed, true).noInput).toBe(true);
  });

  it("leaves noInput false on a TTY without the flag", async () => {
    const parsed = await parseRender(["render"]);
    const presentation = resolvePresentation(parsed, true);
    expect(presentation.noInput).toBe(false);
    expect(shouldStartPromptPath(presentation)).toBe(true);
  });
});

describe("handleRender", () => {
  it("passes output_action none by default and does not use commit", async () => {
    const { code, runMain } = await invokeHandle(["render"]);
    expect(code).toBe(0);
    expect(runMain).toHaveBeenCalledTimes(1);
    expect(runMain).toHaveBeenCalledWith({
      inputs: { output_action: "none" },
      env: {},
      cwd: "/repo",
    });
    expect(runMain.mock.calls[0]?.[0].inputs.output_action).not.toBe("commit");
  });

  it("forwards an explicit --output-action commit to the engine", async () => {
    const { code, runMain } = await invokeHandle([
      "render",
      "--output-action",
      "commit",
    ]);
    expect(code).toBe(0);
    expect(runMain.mock.calls[0]?.[0].inputs.output_action).toBe("commit");
  });

  it("still runs the engine when noInput is set", async () => {
    const { code, stdout, runMain } = await invokeHandle(
      ["render", "--no-input"],
      { stdinIsTTY: true },
    );
    expect(code).toBe(0);
    expect(runMain).toHaveBeenCalledTimes(1);
    expect(stdout).toBe("profile-bits/stats.svg");
    expect(stdout).not.toContain("?");
  });

  it("still runs the engine when stdin is not a TTY without --no-input", async () => {
    const parsed = await parseRender(["render"]);
    expect(parsed.noInput).toBe(false);
    const { code, stdout, runMain } = await invokeHandle(["render"], {
      stdinIsTTY: false,
    });
    expect(code).toBe(0);
    expect(runMain).toHaveBeenCalledTimes(1);
    expect(stdout).not.toContain("?");
  });

  it("still runs the engine on a TTY without prompting", async () => {
    const { code, stdout } = await invokeHandle(["render"], {
      stdinIsTTY: true,
    });
    expect(code).toBe(0);
    expect(stdout).toBe("profile-bits/stats.svg");
    expect(stdout).not.toContain("?");
  });

  it("writes json stdout with files, skipped, and did_commit", async () => {
    const { code, stdout, stderr } = await invokeHandle(["render", "--json"]);
    expect(code).toBe(0);
    expect(JSON.parse(stdout)).toEqual({
      files: ["profile-bits/stats.svg"],
      skipped: ["github/stats:contributions"],
      did_commit: false,
    });
    expect(stdout).not.toMatch(/spinner|Rendering widgets/i);
    expect(stderr).not.toMatch(/spinner/i);
  });

  it("writes skipped and did_commit to stderr when verbose", async () => {
    const { code, stdout, stderr } = await invokeHandle([
      "render",
      "--verbose",
    ]);
    expect(code).toBe(0);
    expect(stdout).toBe("profile-bits/stats.svg");
    expect(stderr).toContain("Rendering widgets");
    expect(stderr).toContain("skipped: github/stats:contributions");
    expect(stderr).toContain("did_commit: false");
  });

  it("does not write progress when quiet even if verbose is set", async () => {
    const { stdout, stderr } = await invokeHandle([
      "render",
      "--quiet",
      "--verbose",
    ]);
    expect(stdout).toBe("profile-bits/stats.svg");
    expect(stderr).not.toContain("Rendering widgets");
    expect(stderr).not.toContain("skipped:");
  });

  it("passes true boolean flags through to the engine", async () => {
    const { runMain } = await invokeHandle([
      "render",
      "--plugin-github",
      "--dry-run",
      "--output-pair",
      "--animated",
      "--allow-skipped",
    ]);
    expect(runMain.mock.calls[0]?.[0].inputs).toEqual({
      output_action: "none",
      plugin_github: true,
      dry_run: true,
      output_pair: true,
      animated: true,
      allow_skipped: true,
    });
  });

  it("passes optional thin overrides through to the engine", async () => {
    const { runMain } = await invokeHandle([
      "render",
      "--http-token-env",
      "HTTP_TOKEN",
      "--format",
      "svg",
      "--theme",
      "dark",
      "--output-action",
      "gist",
      "--timezone",
      "UTC",
    ]);
    expect(runMain.mock.calls[0]?.[0].inputs).toEqual({
      http_token_env: "HTTP_TOKEN",
      format: "svg",
      theme: "dark",
      output_action: "gist",
      timezone: "UTC",
    });
  });

  it("keeps token values out of stdout and stderr", async () => {
    const { code, stdout, stderr } = await invokeHandle(
      ["render", "--json", "--github-token", TOKEN, "--verbose"],
      { env: { WAKATIME_TOKEN: "waka_cli_secret" } },
    );
    expect(code).toBe(0);
    expect(stdout).not.toContain(TOKEN);
    expect(stderr).not.toContain(TOKEN);
    expect(stdout).not.toContain("waka_cli_secret");
    expect(stderr).not.toContain("waka_cli_secret");
  });

  it("redacts tokens when the engine throws", async () => {
    const { code, stdout, stderr } = await invokeHandle(
      ["render", "--github-token", TOKEN],
      {
        runMain: async () => {
          throw new Error(`engine failed for ${TOKEN}`);
        },
      },
    );
    expect(code).toBe(1);
    expect(stdout).not.toContain(TOKEN);
    expect(stderr).not.toContain(TOKEN);
    expect(stderr).toContain("[redacted]");
  });

  it("exits 1 for a MissingGithubToken-style error without prompting", async () => {
    const { code, stdout, stderr } = await invokeHandle(
      ["render", "--no-input"],
      {
        stdinIsTTY: false,
        runMain: async () => {
          throw new Error(
            'github_token is missing: empty, "", or whitespace fails the job (unauthenticated GitHub is not allowed)',
          );
        },
      },
    );
    expect(code).toBe(1);
    expect(stdout).not.toContain("?");
    expect(stderr).toMatch(/github_token is missing/i);
  });

  it("starts a stderr spinner on TTY and stops it on success", async () => {
    const { code } = await invokeHandle(["render"], { stderrIsTTY: true });
    expect(code).toBe(0);
    expect(createSpinner).toHaveBeenCalledWith(
      expect.objectContaining({ output: process.stderr }),
    );
    const spinner = vi.mocked(createSpinner).mock.results[0]?.value;
    expect(spinner.start).toHaveBeenCalledWith("Rendering widgets");
    expect(spinner.stop).toHaveBeenCalledWith("Rendered widgets");
  });

  it("passes styleFrame when --no-color is set on a TTY", async () => {
    const { code } = await invokeHandle(["render", "--no-color"], {
      stderrIsTTY: true,
    });
    expect(code).toBe(0);
    const spinnerOptions = vi.mocked(createSpinner).mock.calls[0]?.[0];
    expect(spinnerOptions?.styleFrame?.("◐")).toBe("◐");
  });

  it("passes styleFrame when NO_COLOR is set on a TTY", async () => {
    const { code } = await invokeHandle(["render"], {
      env: { NO_COLOR: "1" },
      stderrIsTTY: true,
    });
    expect(code).toBe(0);
    const spinnerOptions = vi.mocked(createSpinner).mock.calls[0]?.[0];
    expect(spinnerOptions?.styleFrame?.("x")).toBe("x");
  });

  it("does not start a spinner when json is set", async () => {
    await invokeHandle(["render", "--json"], { stderrIsTTY: true });
    expect(createSpinner).not.toHaveBeenCalled();
  });

  it("marks the spinner as failed when the engine throws", async () => {
    const { code } = await invokeHandle(["render"], {
      stderrIsTTY: true,
      runMain: async () => {
        throw new Error("boom");
      },
    });
    expect(code).toBe(1);
    const spinner = vi.mocked(createSpinner).mock.results[0]?.value;
    expect(spinner.error).toHaveBeenCalledWith("Render failed");
  });

  it("wraps Action runMain when no engine is injected", async () => {
    actionRunMain.mockResolvedValue(RESULT);
    const parsed = await parseRender(["render"]);
    const stdout: string[] = [];
    const code = await handleRender({
      parsed,
      env: {},
      cwd: "/repo",
      io: {
        stdout: (text) => stdout.push(text),
        stderr: () => {},
      },
      stdinIsTTY: false,
      stderrIsTTY: false,
      installSignals: false,
    });
    expect(code).toBe(0);
    expect(actionRunMain).toHaveBeenCalledTimes(1);
    expect(actionRunMain.mock.calls[0]?.[0].inputs.output_action).toBe("none");
    expect(actionRunMain.mock.calls[0]?.[0].cwd).toBe("/repo");
    expect(stdout.join("\n")).toBe("profile-bits/stats.svg");
  });
});
